import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import purposeMigration from '../db/migrations/044_v2_purposes.js';
import {
  replaceNoteContentGroups,
  upsertContentGroup,
} from '../services/contentGroups.js';
import {
  listNotePurposes,
  replaceNotePurposes,
} from '../services/purposes.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-purposes-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUserCourseNote(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  const courseId = uuidv4();
  const noteId = uuidv4();

  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', 'Purpose User');
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(courseId, userId, 'AMATH 231');
  db.prepare('INSERT INTO notes (id, user_id, course_id, title, metadata) VALUES (?, ?, ?, ?, ?)')
    .run(noteId, userId, courseId, 'Power Series note', '{}');

  return { userId, courseId, noteId };
}

function groupInput(courseId: string, noteId: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    project_id: courseId,
    note_id: noteId,
    canvas_id: 'canvas-a',
    title,
    status: 'active',
    created_by: 'human',
    members: [],
    fragments: [],
    petals: [],
    placements: [],
    identity: {
      status: 'none',
      type: null,
      role: null,
      topic: null,
      summary: null,
      created_by: 'human',
      reviewed_by: null,
      confidence: null,
      updated_at: '2026-07-05T00:00:00.000Z',
      accepted_at: null,
      metadata: {},
    },
    view_state: {},
    metadata: {},
    ...extra,
  };
}

test('V2.BN.9 migration creates purpose tables and backfills legacy identity_role into identity_type', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('purposes'), true);
    assert.equal(tableNames.includes('purpose_members'), true);

    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Legacy role group', {
      id: 'legacy-role-group',
    }));

    db.prepare('UPDATE content_groups SET identity_role = ?, identity_type = NULL WHERE id = ?')
      .run('definition', group.id);
    purposeMigration.up(db);

    const row = db.prepare('SELECT identity_type, identity_role FROM content_groups WHERE id = ?')
      .get(group.id) as { identity_type: string | null; identity_role: string | null };
    assert.equal(row.identity_type, 'definition');
    assert.equal(row.identity_role, 'definition');
  });
});

test('V2.BN.9 purpose migration rejects duplicate note defaults and default purposes without note scope', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    db.prepare(`
      INSERT INTO purposes (
        id, user_id, course_id, note_id, title, status,
        is_note_default, created_by, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'active', 1, 'human', '{}', datetime('now'), datetime('now'))
    `).run('purpose-db-default-a', userId, courseId, noteId, 'Default A');

    assert.throws(() => db.prepare(`
      INSERT INTO purposes (
        id, user_id, course_id, note_id, title, status,
        is_note_default, created_by, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'active', 1, 'human', '{}', datetime('now'), datetime('now'))
    `).run('purpose-db-default-b', userId, courseId, noteId, 'Default B'));

    assert.throws(() => db.prepare(`
      INSERT INTO purposes (
        id, user_id, course_id, note_id, title, status,
        is_note_default, created_by, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, ?, 'active', 1, 'human', '{}', datetime('now'), datetime('now'))
    `).run('purpose-db-floating-default', userId, courseId, 'Floating default'));
  });
});

test('listNotePurposes lazily creates one default purpose and bootstraps active groups only once', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Active group', {
      id: 'purpose-active-group',
    }));
    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Deleted group', {
      id: 'purpose-deleted-group',
      status: 'deleted',
    }));

    const first = listNotePurposes(db, userId, noteId);
    assert.equal(first.length, 1);
    assert.equal(first[0]?.is_note_default, true);
    assert.deepEqual(first[0]?.members.map((member: any) => member.member_id), ['purpose-active-group']);

    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Later group', {
      id: 'purpose-later-group',
    }));
    const second = listNotePurposes(db, userId, noteId);
    assert.equal(second.length, 1);
    assert.deepEqual(second[0]?.members.map((member: any) => member.member_id), ['purpose-active-group']);

    const rawDefaults = db.prepare('SELECT COUNT(*) AS count FROM purposes WHERE note_id = ? AND is_note_default = 1')
      .get(noteId) as { count: number };
    assert.equal(rawDefaults.count, 1);
  });
});

test('replaceNotePurposes roundtrips purpose members and de-dupes duplicate content groups', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Definition group', {
      id: 'purpose-definition-group',
    }));

    const replaced = replaceNotePurposes(db, userId, noteId, [{
      id: 'purpose-midterm-review',
      title: 'Midterm review',
      intent: 'Prepare for the first exam.',
      scope_note: 'Chapter 1 to 3',
      is_note_default: true,
      members: [{
        id: 'purpose-member-a',
        member_kind: 'content_group',
        member_id: 'purpose-definition-group',
        role: 'definition',
        fitness: 'high',
      }, {
        id: 'purpose-member-duplicate',
        member_kind: 'content_group',
        member_id: 'purpose-definition-group',
        role: 'duplicate',
      }],
      metadata: { source: 'test' },
    }]);

    assert.equal(replaced.length, 1);
    assert.equal(replaced[0]?.id, 'purpose-midterm-review');
    assert.equal(replaced[0]?.members.length, 1);
    assert.equal(replaced[0]?.members[0]?.role, 'definition');
    assert.equal(replaced[0]?.members[0]?.fitness, 'high');
    assert.deepEqual(replaced[0]?.metadata, { source: 'test' });
  });
});

test('ContentGroup soft delete hides purpose edge without deleting it, and restore revives the edge', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Group to restore', {
      id: 'purpose-restore-group',
    }));
    const first = listNotePurposes(db, userId, noteId);
    assert.equal(first[0]?.members.length, 1);

    replaceNoteContentGroups(db, userId, noteId, []);
    const afterDelete = listNotePurposes(db, userId, noteId);
    assert.equal(afterDelete[0]?.members.length, 0);
    const rawEdges = db.prepare('SELECT COUNT(*) AS count FROM purpose_members WHERE member_id = ?')
      .get('purpose-restore-group') as { count: number };
    assert.equal(rawEdges.count, 1);

    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Group restored', {
      id: 'purpose-restore-group',
      status: 'active',
    }));
    const afterRestore = listNotePurposes(db, userId, noteId);
    assert.deepEqual(afterRestore[0]?.members.map((member: any) => member.member_id), ['purpose-restore-group']);
  });
});

test('replaceNotePurposes preserves hidden soft-deleted ContentGroup edges during filtered view roundtrip', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const deletedLaterGroup = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Deleted later group', {
      id: 'purpose-hidden-edge-group-a',
    }));
    const visibleGroup = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Visible group', {
      id: 'purpose-hidden-edge-group-b',
    }));

    replaceNotePurposes(db, userId, noteId, [{
      id: 'purpose-hidden-edge-default',
      title: 'Default purpose',
      is_note_default: true,
      members: [{
        id: 'purpose-hidden-edge-member-a',
        member_kind: 'content_group',
        member_id: deletedLaterGroup.id,
        role: 'definition',
        fitness: 'high',
        order_index: 7,
      }, {
        id: 'purpose-hidden-edge-member-b',
        member_kind: 'content_group',
        member_id: visibleGroup.id,
        role: 'key_point',
        fitness: 'medium',
        order_index: 8,
      }],
    }]);

    replaceNoteContentGroups(db, userId, noteId, [visibleGroup]);
    const filteredPurposes = listNotePurposes(db, userId, noteId);
    assert.deepEqual(
      filteredPurposes[0]?.members.map((member: any) => member.member_id),
      [visibleGroup.id],
    );

    replaceNotePurposes(db, userId, noteId, filteredPurposes);

    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Restored hidden edge group', {
      id: deletedLaterGroup.id,
      status: 'active',
    }));
    const restoredPurposes = listNotePurposes(db, userId, noteId);
    const restoredEdge = restoredPurposes[0]?.members.find((member: any) => member.member_id === deletedLaterGroup.id);

    assert.equal(restoredEdge?.id, 'purpose-hidden-edge-member-a');
    assert.equal(restoredEdge?.role, 'definition');
    assert.equal(restoredEdge?.fitness, 'high');
    assert.equal(restoredEdge?.order_index, 7);
  });
});

test('deleting a purpose does not delete its ContentGroup, and note trash/restore keeps purposes', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Surviving group', {
      id: 'purpose-surviving-group',
    }));

    replaceNotePurposes(db, userId, noteId, [{
      id: 'purpose-temporary',
      title: 'Temporary purpose',
      is_note_default: true,
      members: [{
        member_kind: 'content_group',
        member_id: 'purpose-surviving-group',
      }],
    }]);
    replaceNotePurposes(db, userId, noteId, []);

    const group = db.prepare('SELECT id, status FROM content_groups WHERE id = ?')
      .get('purpose-surviving-group') as { id: string; status: string };
    assert.equal(group.id, 'purpose-surviving-group');
    assert.equal(group.status, 'active');

    db.prepare("UPDATE notes SET status = 'trashed' WHERE id = ?").run(noteId);
    assert.equal(listNotePurposes(db, userId, noteId).length, 1);
    db.prepare("UPDATE notes SET status = 'active' WHERE id = ?").run(noteId);
    assert.equal(listNotePurposes(db, userId, noteId).length, 1);
  });
});
