// Run from server/: node --import tsx ../docs/audits/2026-09-11-b3-builder/smoke.mjs
// Disposable databases only. The mounted production routers run after a synthetic owner middleware.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createV13BoardsFixture } from '../../../server/src/__tests__/helpers/v13BoardsFixture.ts';
import { createBoardRouter } from '../../../server/src/routes/boards.ts';
import { createItemRouter } from '../../../server/src/routes/items.ts';
import { AppError } from '../../../server/src/middleware/errorHandler.ts';
import { createRelation, getRelation } from '../../../server/src/services/relations.ts';
import { createClientNoteBlock } from '../../../server/src/services/noteBlockLifecycle.ts';
import migration065 from '../../../server/src/db/migrations/065_v13_board_item_identity.ts';

const require = createRequire(new URL('../../../server/package.json', import.meta.url));
const express = require('express');
const USER = 'synthetic-b3-smoke-owner';
const PROJECT = '72000000-0000-4000-8000-000000000001';
const NOTE = '72000000-0000-4000-8000-000000000002';
const OLD_TIME = '2020-02-03T04:05:06.000Z';
const evidence = {
  generated_at: new Date().toISOString(),
  isolation: { database: ':memory:', binding: '127.0.0.1', port: null, real_database_opened: false },
  boundaries: {
    board_and_item_lifecycle: 'Actual production HTTP routers with database injection and synthetic owner',
    relation_freshness: 'Production createRelation/getRelation service on the same disposable database',
    item_ref: 'Production createClientNoteBlock service on the same disposable database',
    backfill: 'Production migration 065 on a second actual pre-065 disposable fixture',
  },
  http: [],
  checks: {},
};

function seed(db) {
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, 'b3-smoke@example.invalid', 'synthetic', 'Synthetic')").run(USER);
  db.prepare("INSERT INTO courses (id, user_id, name) VALUES (?, ?, 'Synthetic project')").run(PROJECT, USER);
  db.prepare("INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, 'Synthetic note')").run(NOTE, USER, PROJECT);
}

const db = await createV13BoardsFixture();
let legacy;
let listener;
try {
  seed(db);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.userId = USER; next(); });
  app.use('/api/boards', createBoardRouter(() => db));
  app.use('/api/items', createItemRouter(() => db));
  app.use((error, _req, res, _next) => {
    res.status(error instanceof AppError ? error.statusCode : 500).json({ error: error.message, details: error.details });
  });
  listener = await new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  const { port } = listener.address();
  evidence.isolation.port = port;
  const baseUrl = `http://127.0.0.1:${port}`;
  async function request(method, path, body, expectedStatus = 200) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const text = await response.text();
    assert.match(response.headers.get('content-type') ?? '', /application\/json/,
      `${method} ${path}: HTTP ${response.status}: ${text.slice(0, 200)}`);
    const payload = JSON.parse(text);
    evidence.http.push({ method, path, status: response.status });
    assert.equal(response.status, expectedStatus, `${method} ${path}: ${JSON.stringify(payload)}`);
    return payload;
  }

  const { board } = await request('POST', '/api/boards', {
    title: 'Initial board name', project_id: PROJECT, purpose: { title: 'Synthetic identity question' },
  }, 201);
  assert.ok(board.identity_item_id);
  assert.notEqual(board.identity_item_id, board.id);
  const item = await request('GET', `/api/items/${board.identity_item_id}`);
  assert.equal(item.origin_board_id, null);
  assert.equal(item.current_snapshot.content, 'Board: Initial board name');
  evidence.checks.create_with_snapshot = {
    pass: true, board_id: board.id, identity_item_id: item.id, different_ids: true,
    identity_description: item.plain_text, origin_board_id: item.origin_board_id,
    current_snapshot: item.current_snapshot, metadata: item.metadata,
  };

  const ordinary = await request('POST', '/api/items', { plain_text: 'Ordinary premise before edit' }, 201);
  const relation = createRelation(db, USER, {
    from_item_id: item.id, to_item_id: ordinary.id, relation_type: 'supports',
  });
  assert.equal(relation.freshness, 'fresh');
  const rawIdentityBefore = db.prepare('SELECT * FROM items WHERE id = ?').get(item.id);
  const snapshotsBefore = db.prepare('SELECT * FROM item_snapshots ORDER BY id').all();
  await request('PATCH', `/api/boards/${board.id}`, { title: 'Renamed board: distinct label' });
  const renamed = await request('GET', `/api/boards/${board.id}`);
  const relationAfterRename = getRelation(db, USER, relation.id);
  assert.equal(renamed.board.title, 'Renamed board: distinct label');
  assert.equal(renamed.board.identity_description, item.plain_text);
  assert.deepEqual(db.prepare('SELECT * FROM items WHERE id = ?').get(item.id), rawIdentityBefore);
  assert.deepEqual(db.prepare('SELECT * FROM item_snapshots ORDER BY id').all(), snapshotsBefore);
  assert.equal(relationAfterRename.freshness, 'fresh');
  evidence.checks.rename_without_drift = {
    pass: true, relation_id: relation.id, before_freshness: relation.freshness,
    after_freshness: relationAfterRename.freshness, identity_row_byte_equal: true,
    snapshots_byte_equal: true, current_title: renamed.board.title,
    description: renamed.board.identity_description,
  };

  await request('PUT', `/api/items/${ordinary.id}`, { plain_text: 'Ordinary premise changed after judgment' });
  const positive = getRelation(db, USER, relation.id);
  assert.equal(positive.freshness, 'to_changed');
  assert.equal(positive.from_changed, false);
  assert.equal(positive.to_changed, true);
  assert.equal(positive.to_snapshot_id, relation.to_snapshot_id);
  evidence.checks.freshness_positive_control = {
    pass: true, relation_id: relation.id, ordinary_item_id: ordinary.id,
    before: 'fresh', after: positive.freshness, from_changed: positive.from_changed,
    to_changed: positive.to_changed, judgment_snapshot_id_unchanged: true,
    judgment_content: positive.to_snapshot.content, current_content: positive.to_item.plain_text,
  };

  const rejectedEdit = await request('PUT', `/api/items/${item.id}`, { plain_text: 'Ordinary edit is unavailable' }, 409);
  const rejectedRetire = await request('POST', `/api/items/${item.id}/retire`, {}, 409);
  for (const rejection of [rejectedEdit, rejectedRetire]) assert.match(rejection.error, /board entry/i);
  assert.deepEqual(db.prepare('SELECT * FROM items WHERE id = ?').get(item.id), rawIdentityBefore);
  evidence.checks.item_write_gate = { pass: true, update: rejectedEdit, retire: rejectedRetire, identity_unchanged: true };

  const { board: otherBoard } = await request('POST', '/api/boards', {
    title: 'Other board', purpose: { title: 'Another synthetic question' },
  }, 201);
  const ownMount = await request('POST', `/api/boards/${board.id}/members`, { member_kind: 'item', member_id: item.id }, 201);
  const otherMount = await request('POST', `/api/boards/${otherBoard.id}/members`, { member_kind: 'item', member_id: item.id }, 201);
  assert.equal(ownMount.member.reference.state, 'available');
  assert.equal(otherMount.member.reference.state, 'available');
  const referenceBlock = createClientNoteBlock(db, USER, NOTE, PROJECT, {
    client_create_key: 'b3-smoke-identity-ref', block_type: 'item_ref', content_json: { item_id: item.id },
  });
  assert.equal(referenceBlock.status, 'applied');
  assert.equal(referenceBlock.block.plain_text, null);
  assert.deepEqual(JSON.parse(referenceBlock.block.content_json), { item_id: item.id });
  evidence.checks.ordinary_read_citizenship = {
    pass: true, note_block_id: referenceBlock.block.id, note_block_type: referenceBlock.block.block_type,
    content_json: JSON.parse(referenceBlock.block.content_json), copied_plain_text: referenceBlock.block.plain_text,
    own_board_mount_state: ownMount.member.reference.state, other_board_mount_state: otherMount.member.reference.state,
  };

  await request('DELETE', `/api/boards/${board.id}`);
  const retired = await request('GET', `/api/items/${item.id}`);
  const otherReopened = await request('GET', `/api/boards/${otherBoard.id}`);
  assert.equal(retired.status, 'retired');
  assert.equal(retired.current_snapshot.id, item.current_snapshot.id);
  assert.equal(otherReopened.members[0].reference.item_status, 'retired');
  assert.ok(db.prepare('SELECT id FROM purposes WHERE id = ?').get(board.soul_id));
  assert.equal(getRelation(db, USER, relation.id).from_item.status, 'retired');
  evidence.checks.delete_retires_identity = {
    pass: true, item_status: retired.status, history_readable: true,
    snapshot_id_retained: retired.current_snapshot.id, other_board_projection_status: 'retired',
    purpose_retained: true, relation_retained: true,
  };

  legacy = await createV13BoardsFixture({ beforeIdentityMigration: true });
  seed(legacy);
  for (const [id, project] of [['legacy-board-a', PROJECT], ['legacy-board-b', null]]) {
    legacy.prepare(`INSERT INTO purposes (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, 'Historical purpose', ?, ?)`).run(`soul-${id}`, USER, OLD_TIME, OLD_TIME);
    legacy.prepare(`INSERT INTO boards (id, user_id, title, soul_id, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, USER, `Historical ${id}`, `soul-${id}`, project, OLD_TIME, OLD_TIME);
  }
  const legacyBefore = legacy.prepare('SELECT * FROM boards ORDER BY id').all();
  const migrationStarted = new Date().toISOString();
  migration065.up(legacy);
  const migrationFinished = new Date().toISOString();
  const ledger = legacy.prepare(`SELECT b.id AS board_id, b.created_at AS board_created_at,
    b.item_id, i.created_at AS identity_created_at, i.origin_board_id, i.metadata,
    s.id AS snapshot_id, s.created_at AS snapshot_created_at
    FROM boards b JOIN items i ON i.id = b.item_id JOIN item_snapshots s ON s.item_id = i.id ORDER BY b.id`).all()
    .map((row) => ({ ...row, metadata: JSON.parse(row.metadata) }));
  assert.equal(ledger.length, 2);
  assert.equal(new Set(ledger.map((row) => row.item_id)).size, 2);
  for (const row of ledger) {
    assert.notEqual(row.board_id, row.item_id);
    assert.equal(row.board_created_at, OLD_TIME);
    assert.ok(row.identity_created_at >= migrationStarted && row.identity_created_at <= migrationFinished);
    assert.equal(row.identity_created_at, row.snapshot_created_at);
    assert.equal(row.origin_board_id, null);
  }
  const afterBackfill = ['boards', 'items', 'item_snapshots'].map((table) => legacy.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
  assert.deepEqual(afterBackfill[0].map(({ item_id, ...row }) => row), legacyBefore);
  migration065.up(legacy);
  assert.deepEqual(['boards', 'items', 'item_snapshots'].map((table) => legacy.prepare(`SELECT * FROM ${table} ORDER BY id`).all()), afterBackfill);
  evidence.checks.backfill = {
    pass: true, migration_started: migrationStarted, migration_finished: migrationFinished,
    board_ids_retained: true, original_board_rows_unchanged: true, board_count: 2,
    identity_count: 2, snapshot_count: 2, rerun_additions: 0, ledger,
  };
  assert.deepEqual(db.pragma('foreign_key_check'), []);
  assert.deepEqual(legacy.pragma('foreign_key_check'), []);
  evidence.result = 'PASS';
  evidence.passed_checks = Object.keys(evidence.checks).length;
  writeFileSync(new URL('./smoke-results.json', import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`B3_IDENTITY_SMOKE_PASS checks=${evidence.passed_checks} http_requests=${evidence.http.length} db=:memory: rename=fresh ordinary_body=to_changed backfill=2 rerun_additions=0`);
} finally {
  if (listener) await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  db.close();
  legacy?.close();
}
