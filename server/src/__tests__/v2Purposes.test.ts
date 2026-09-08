import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import type { Router } from 'express';
import purposesMigration from '../db/migrations/044_v2_purposes.js';
import eventsMigration from '../db/migrations/054_v13_events_ledger.js';
import boardsMigration from '../db/migrations/057_v13_boards.js';
import { createPurposeRouter } from '../routes/purposes.js';
import { AppError } from '../middleware/errorHandler.js';
import { createPurposeInputSchema } from '../validators/purposes.js';
import {
  createPurpose,
  ensureNoteDefaultPurpose,
  getPurpose,
  getPurposeCompiledScope,
  listNotePurposes,
  listPurposes,
  replaceNotePurposes,
  searchPurposeItems,
} from '../services/purposes.js';
import { COURSE_LIFECYCLE_POLICIES } from '../services/courseLifecyclePolicies.js';

function withMemoryDb(run: (db: Database.Database) => void): void {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY);
      CREATE TABLE courses (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE notes (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        course_id TEXT NOT NULL REFERENCES courses(id)
      );
      CREATE TABLE content_groups (id TEXT PRIMARY KEY, identity_role TEXT);
      INSERT INTO users VALUES ('purpose-test-user');
      INSERT INTO courses VALUES ('purpose-test-project', 'purpose-test-user');
      INSERT INTO notes VALUES ('purpose-test-note', 'purpose-test-user', 'purpose-test-project');
    `);
    purposesMigration.up(db);
    db.exec(`
      INSERT INTO purposes (
        id, user_id, course_id, note_id, title, is_note_default, created_by, created_at, updated_at
      ) VALUES (
        'legacy-soul', 'purpose-test-user', 'purpose-test-project', 'purpose-test-note',
        'Existing default soul', 1, 'system', '2026-09-01', '2026-09-01'
      );
      INSERT INTO purpose_members (
        id, user_id, purpose_id, member_kind, member_id, created_at, updated_at
      ) VALUES (
        'legacy-membership', 'purpose-test-user', 'legacy-soul', 'item',
        'historical-item', '2026-09-01', '2026-09-01'
      );
    `);
    eventsMigration.up(db);
    boardsMigration.up(db);
    run(db);
  } finally {
    db.close();
  }
}

const userId = 'purpose-test-user';
const noteId = 'purpose-test-note';

function createSoul(db: Database.Database, input: Parameters<typeof createPurpose>[2]) {
  return db.transaction(() => createPurpose(db, userId, input))();
}

function hasError(status: number, message: string) {
  return (err: unknown) => err instanceof AppError
    && err.statusCode === status && err.message === message;
}

// Invoke the registered handler with an already-authenticated synthetic request.
// No HTTP listener, application init, default database, or network is involved.
function invoke(router: Router, method: string, path: string, input: Record<string, unknown> = {}) {
  const layer = (router as any).stack.find((entry: any) => (
    entry.route?.path === path && entry.route.methods[method]
  ));
  assert.ok(layer, `Route ${method} ${path} is registered`);
  const response = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  layer.route.stack[0].handle({ userId, params: {}, query: {}, body: {}, ...input }, response);
  return response;
}

test('V13.3 legacy note reads preserve history and never bootstrap or rewrite memberships', () => {
  withMemoryDb((db) => {
    const before = db.prepare('SELECT * FROM purposes').all();
    const membersBefore = db.prepare('SELECT * FROM purpose_members').all();
    const noteBefore = db.prepare('SELECT * FROM notes').all();
    const existing = listNotePurposes(db, userId, noteId);
    assert.equal(existing.length, 1);
    assert.equal(existing[0].id, 'legacy-soul');
    assert.equal(existing[0].status, 'active');
    assert.equal(existing[0].is_note_default, true);
    assert.equal(existing[0].members[0].id, 'legacy-membership');
    db.prepare('INSERT INTO notes VALUES (?, ?, ?)').run('empty-note', userId, 'purpose-test-project');
    assert.deepEqual(listNotePurposes(db, userId, 'empty-note'), []);
    assert.deepEqual(listNotePurposes(db, userId, 'empty-note'), []);
    assert.deepEqual(db.prepare('SELECT * FROM purposes').all(), before);
    assert.deepEqual(db.prepare('SELECT * FROM purpose_members').all(), membersBefore);
    assert.deepEqual(db.prepare('SELECT * FROM notes WHERE id = ?').all(noteId), noteBefore);
  });
});

test('V13.3 old note writer and compiled-scope consumers fail closed without touching history', () => {
  withMemoryDb((db) => {
    const before = db.prepare('SELECT * FROM purposes').all();
    const membersBefore = db.prepare('SELECT * FROM purpose_members').all();
    assert.throws(() => ensureNoteDefaultPurpose(db, userId, noteId), hasError(410, 'note_purpose_writer_retired'));
    assert.throws(() => replaceNotePurposes(db, userId, noteId, []), hasError(410, 'note_purpose_writer_retired'));
    assert.throws(() => getPurposeCompiledScope(db, userId, 'legacy-soul'), hasError(410, 'purpose_compiled_scope_deferred'));
    assert.throws(() => searchPurposeItems(db, userId, 'legacy-soul', { query: 'old' }), hasError(410, 'purpose_compiled_scope_deferred'));
    const router = createPurposeRouter(() => db);
    assert.throws(() => invoke(router, 'put', '/by-note/:noteId', {
      params: { noteId }, body: { malformed: true },
    }), hasError(410, 'note_purpose_writer_retired'));
    assert.throws(() => invoke(router, 'get', '/:purposeId/compiled-scope', {
      params: { purposeId: 'legacy-soul' },
    }), hasError(410, 'purpose_compiled_scope_deferred'));
    assert.deepEqual(db.prepare('SELECT * FROM purposes').all(), before);
    assert.deepEqual(db.prepare('SELECT * FROM purpose_members').all(), membersBefore);
  });
});

test('V13.3 library soul create/list/get preserve nullable labels, all stored states and birth signatures', () => {
  withMemoryDb((db) => {
    assert.throws(() => createPurpose(db, userId, { title: 'Missing transaction' }), /purpose_transaction_required/);
    const created = createSoul(db, { title: 'A question without a notebook', project_id: null });
    assert.equal(created.project_id, null);
    assert.equal(created.course_id, null);
    assert.equal(created.note_id, null);
    assert.equal(created.is_note_default, false);
    assert.equal(created.status, 'active');
    assert.deepEqual(created.members, []);
    assert.deepEqual(listPurposes(db, userId, { project_id: null }), [created]);
    for (const status of ['active', 'sealed', 'archived'] as const) {
      db.prepare('UPDATE purposes SET status = ? WHERE id = ?').run(status, created.id);
      assert.equal(getPurpose(db, userId, created.id).status, status);
      assert.equal(listPurposes(db, userId, { status }).some((row) => row.id === created.id), true);
    }
    for (const created_by of ['human', 'ai', 'system', 'ai_proposal', 'importer'] as const) {
      const soul = createSoul(db, {
        title: 'Library birth', project_id: 'purpose-test-project', created_by,
      });
      assert.equal(soul.created_by, created_by);
      assert.equal(soul.project_id, 'purpose-test-project');
    }
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM purpose_members').get() as { n: number }).n, 1);
  });
});

test('V13.3 creation contract has no note/default/member writer or status-changing side door', () => {
  const forbidden = [
    { note_id: null }, { is_note_default: false }, { members: [] },
    { parent_id: 'parent' }, { status: 'sealed' }, { course_id: null },
  ];
  for (const fields of forbidden) {
    assert.equal(createPurposeInputSchema.safeParse({ title: 'Library soul', ...fields }).success, false);
  }
  assert.equal(createPurposeInputSchema.safeParse({ title: '   ' }).success, false);
});

test('V13.3 purpose route commits its event with original summary and rolls business back when ledger fails', () => {
  withMemoryDb((db) => {
    const router = createPurposeRouter(() => db);
    const summary = '  My original handoff.\n';
    const response = invoke(router, 'post', '/', { body: { title: 'Why does this work?', summary } });
    assert.equal(response.statusCode, 201);
    const purposeId = response.body.purpose.id;
    const event = db.prepare('SELECT * FROM events').get() as Record<string, any>;
    assert.equal(event.user_id, userId);
    assert.equal(event.actor_kind, 'human');
    assert.equal(event.channel, 'POST /api/purposes');
    assert.equal(event.verb, 'purpose_created');
    assert.equal(event.summary, summary);
    assert.deepEqual(JSON.parse(event.objects), [{ kind: 'purpose', id: purposeId }]);
    assert.equal(invoke(router, 'get', '/:purposeId', { params: { purposeId } }).body.purpose.id, purposeId);
    assert.equal(invoke(router, 'get', '/').body.purposes.length, 2);
    const before = db.prepare('SELECT * FROM purposes ORDER BY id').all();
    db.exec(`CREATE TRIGGER synthetic_event_failure BEFORE INSERT ON events
      BEGIN SELECT RAISE(ABORT, 'synthetic_event_failure'); END;`);
    assert.throws(() => invoke(router, 'post', '/', { body: { title: 'Must roll back' } }), /synthetic_event_failure/);
    assert.deepEqual(db.prepare('SELECT * FROM purposes ORDER BY id').all(), before);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n, 1);
  });
});

test('V13.3 library Project labels are registered as preserving weak references', () => {
  for (const [table, column] of [['purposes', 'course_id'], ['boards', 'project_id']]) {
    const entry = COURSE_LIFECYCLE_POLICIES.find((row) => row.table === table && row.column === column);
    assert.equal(entry?.policy, 'preserve');
    assert.equal(entry?.onDelete, 'SET NULL');
  }
});
