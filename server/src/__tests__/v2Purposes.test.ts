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
  getPurposeCompiledScope,
  listNotePurposes,
  replaceNotePurposes,
  searchPurposeItems,
} from '../services/purposes.js';
import {
  createItem,
  retireItem,
} from '../services/items.js';
import { replaceNotePurposesSchema } from '../validators/index.js';

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

test('V2.BN.11.4 Package A validates and roundtrips direct Item members without washing their kind', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const first = createItem(db, userId, {
      plain_text: 'The radius of convergence bounds the interval of convergence.',
      item_type: 'definition',
      topic: 'Power series',
      origin_course_id: courseId,
      origin_note_id: noteId,
    });
    const second = createItem(db, userId, {
      plain_text: 'Check both endpoints after applying the ratio test.',
      item_type: 'procedure',
      topic: 'Endpoint checks',
      origin_course_id: courseId,
      origin_note_id: noteId,
    });

    const payload = replaceNotePurposesSchema.parse({
      purposes: [{
        id: 'purpose-package-a',
        title: 'Exam review',
        is_note_default: true,
        members: [{
          id: 'purpose-item-first',
          member_kind: 'item',
          member_id: first.id,
          role: 'core_definition',
          fitness: 'high',
          order_index: 4,
        }, {
          id: 'purpose-item-second',
          member_kind: 'item',
          member_id: second.id,
          role: 'checklist',
          fitness: 'medium',
          order_index: 8,
        }],
      }],
    });
    const replaced = replaceNotePurposes(db, userId, noteId, payload.purposes);

    assert.deepEqual(
      replaced[0]?.members.map((member: any) => [member.member_kind, member.member_id, member.role, member.fitness]),
      [
        ['item', first.id, 'core_definition', 'high'],
        ['item', second.id, 'checklist', 'medium'],
      ],
    );

    const reordered = replaceNotePurposes(db, userId, noteId, [{
      ...replaced[0],
      members: [{
        ...replaced[0]!.members[1],
        role: 'exam_action',
        fitness: 'essential',
        order_index: 0,
      }],
    }]);
    assert.deepEqual(
      reordered[0]?.members.map((member: any) => [member.member_id, member.role, member.fitness, member.order_index]),
      [[second.id, 'exam_action', 'essential', 0]],
    );
    const rawFirst = db.prepare('SELECT COUNT(*) AS count FROM purpose_members WHERE member_id = ?')
      .get(first.id) as { count: number };
    assert.equal(rawFirst.count, 0, 'omitting an active direct Item intentionally removes its edge');
  });
});

test('V2.BN.11.4 full replacement preserves filtered retired and missing Item edges', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const retired = createItem(db, userId, {
      plain_text: 'A historical Item that should remain recoverable.',
      origin_course_id: courseId,
      origin_note_id: noteId,
    });
    replaceNotePurposes(db, userId, noteId, [{
      id: 'purpose-hidden-items',
      title: 'Hidden Item recovery',
      is_note_default: true,
      members: [{
        id: 'purpose-member-retired-item',
        member_kind: 'item',
        member_id: retired.id,
        role: 'historical_evidence',
        fitness: 'medium',
        order_index: 7,
      }],
    }]);
    retireItem(db, userId, retired.id, {});
    db.prepare(`
      INSERT INTO purpose_members (
        id, user_id, purpose_id, member_kind, member_id,
        role, fitness, order_index, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, 'item', ?, ?, ?, ?, '{}', datetime('now'), datetime('now'))
    `).run(
      'purpose-member-missing-item',
      userId,
      'purpose-hidden-items',
      'item-that-no-longer-exists',
      'lost_evidence',
      'unknown',
      11,
    );

    const filtered = listNotePurposes(db, userId, noteId);
    assert.equal(filtered[0]?.members.length, 0);
    replaceNotePurposes(db, userId, noteId, filtered);

    const recovered = db.prepare(`
      SELECT id, member_id, role, fitness, order_index
      FROM purpose_members
      WHERE purpose_id = ? AND member_kind = 'item'
      ORDER BY order_index ASC
    `).all('purpose-hidden-items') as Array<Record<string, unknown>>;
    assert.deepEqual(recovered, [{
      id: 'purpose-member-retired-item',
      member_id: retired.id,
      role: 'historical_evidence',
      fitness: 'medium',
      order_index: 7,
    }, {
      id: 'purpose-member-missing-item',
      member_id: 'item-that-no-longer-exists',
      role: 'lost_evidence',
      fitness: 'unknown',
      order_index: 11,
    }]);
  });
});

test('V2.BN.11.4 stale pre-retirement payload cannot kill or rewrite a newly hidden Item edge', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const item = createItem(db, userId, {
      plain_text: 'This Item is about to become historical.',
      origin_course_id: courseId,
      origin_note_id: noteId,
    });
    const stalePayload = replaceNotePurposes(db, userId, noteId, [{
      id: 'purpose-stale-client',
      title: 'Stale client contract',
      is_note_default: true,
      members: [{
        id: 'purpose-stale-item-edge',
        member_kind: 'item',
        member_id: item.id,
        role: 'original_role',
        fitness: 'high',
        order_index: 3,
      }],
    }]);
    retireItem(db, userId, item.id, {});

    stalePayload[0]!.members[0]!.role = 'stale_client_rewrite';
    stalePayload[0]!.members[0]!.fitness = 'low';
    replaceNotePurposes(db, userId, noteId, stalePayload);

    const raw = db.prepare(`
      SELECT id, role, fitness, order_index
      FROM purpose_members
      WHERE purpose_id = ? AND member_kind = 'item' AND member_id = ?
    `).get('purpose-stale-client', item.id) as Record<string, unknown>;
    assert.deepEqual(raw, {
      id: 'purpose-stale-item-edge',
      role: 'original_role',
      fitness: 'high',
      order_index: 3,
    });
  });
});

test('V2.BN.11.4 rejects new retired and cross-user direct Item memberships', async () => {
  await withDb((db) => {
    const firstOwner = seedUserCourseNote(db);
    const secondOwner = seedUserCourseNote(db);
    const retired = createItem(db, firstOwner.userId, {
      plain_text: 'Retired before Purpose membership.',
      origin_course_id: firstOwner.courseId,
      origin_note_id: firstOwner.noteId,
    });
    const foreign = createItem(db, secondOwner.userId, {
      plain_text: 'Owned by a different user.',
      origin_course_id: secondOwner.courseId,
      origin_note_id: secondOwner.noteId,
    });
    retireItem(db, firstOwner.userId, retired.id, {});

    for (const itemId of [retired.id, foreign.id]) {
      assert.throws(() => replaceNotePurposes(db, firstOwner.userId, firstOwner.noteId, [{
        id: `purpose-reject-${itemId}`,
        title: 'Rejected Item edge',
        is_note_default: true,
        members: [{ member_kind: 'item', member_id: itemId }],
      }]));
    }
  });
});

test('V2.BN.11.4 compiled scope de-dupes direct and derived Items, explains paths, and never persists derivation', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const shared = createItem(db, userId, {
      plain_text: 'A power series is centered at a chosen expansion point.',
      item_type: 'definition',
      topic: 'Power series',
      origin_course_id: courseId,
      origin_note_id: noteId,
    });
    const derivedOnly = createItem(db, userId, {
      plain_text: 'The ratio test yields the radius before endpoint checks.',
      item_type: 'procedure',
      topic: 'Convergence',
      origin_course_id: courseId,
      origin_note_id: noteId,
    });
    const firstGroup = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Definitions', {
      id: 'purpose-compiled-group-a',
      members: [{ id: 'group-a-shared', kind: 'item', item_id: shared.id }],
    }));
    const secondGroup = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Procedures', {
      id: 'purpose-compiled-group-b',
      members: [
        { id: 'group-b-shared', kind: 'item', item_id: shared.id },
        { id: 'group-b-derived', kind: 'item', item_id: derivedOnly.id },
      ],
    }));
    replaceNotePurposes(db, userId, noteId, [{
      id: 'purpose-compiled-scope',
      title: 'Final review',
      is_note_default: true,
      members: [{
        id: 'purpose-direct-shared',
        member_kind: 'item',
        member_id: shared.id,
        role: 'anchor',
        fitness: 'high',
      }, {
        id: 'purpose-group-a',
        member_kind: 'content_group',
        member_id: firstGroup.id,
        role: 'definitions',
        fitness: 'high',
      }, {
        id: 'purpose-group-b',
        member_kind: 'content_group',
        member_id: secondGroup.id,
        role: 'procedures',
        fitness: 'medium',
      }],
    }]);
    const persistedBefore = db.prepare('SELECT COUNT(*) AS count FROM purpose_members WHERE purpose_id = ?')
      .get('purpose-compiled-scope') as { count: number };

    const scope = getPurposeCompiledScope(db, userId, 'purpose-compiled-scope');
    assert.equal(scope.items.length, 2);
    const sharedProjection = scope.items.find((entry: any) => entry.item.id === shared.id);
    const derivedProjection = scope.items.find((entry: any) => entry.item.id === derivedOnly.id);
    assert.equal(sharedProjection?.membership_kind, 'direct_and_derived');
    assert.equal(sharedProjection?.direct, true);
    assert.equal(sharedProjection?.derived, true);
    assert.deepEqual(
      sharedProjection?.paths.map((path: any) => [path.kind, path.content_group_id || null]),
      [['direct', null], ['content_group', firstGroup.id], ['content_group', secondGroup.id]],
    );
    assert.equal(derivedProjection?.membership_kind, 'derived');
    assert.deepEqual(derivedProjection?.paths.map((path: any) => path.content_group_id), [secondGroup.id]);

    const search = searchPurposeItems(db, userId, 'purpose-compiled-scope', {
      query: 'ratio convergence',
      limit: 10,
    });
    assert.deepEqual(search.items.map((entry: any) => entry.item.id), [derivedOnly.id]);
    const persistedAfterRead = db.prepare('SELECT COUNT(*) AS count FROM purpose_members WHERE purpose_id = ?')
      .get('purpose-compiled-scope') as { count: number };
    assert.equal(persistedAfterRead.count, persistedBefore.count);
    assert.equal(persistedAfterRead.count, 3, 'derived Item paths never become purpose_members rows');

    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Procedures', {
      id: secondGroup.id,
      members: [{ id: 'group-b-shared', kind: 'item', item_id: shared.id }],
    }));
    const afterGroupChange = getPurposeCompiledScope(db, userId, 'purpose-compiled-scope');
    assert.deepEqual(afterGroupChange.items.map((entry: any) => entry.item.id), [shared.id]);

    retireItem(db, userId, shared.id, {});
    const afterRetire = getPurposeCompiledScope(db, userId, 'purpose-compiled-scope');
    assert.equal(afterRetire.items.length, 0);
    const rawDirectEdge = db.prepare(`
      SELECT COUNT(*) AS count
      FROM purpose_members
      WHERE purpose_id = ? AND member_kind = 'item' AND member_id = ?
    `).get('purpose-compiled-scope', shared.id) as { count: number };
    assert.equal(rawDirectEdge.count, 1);
  });
});
