import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import contentGroupMemberMigration from '../db/migrations/033_v2_content_group_members.js';
import contentGroupPetalMigration from '../db/migrations/034_v2_content_group_petals.js';
import {
  deleteContentGroupMember,
  getContentGroup,
  listContentGroups,
  replaceNoteContentGroups,
  upsertContentGroup,
} from '../services/contentGroups.js';
import {
  upsertContentGroupSchema,
} from '../validators/index.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-content-groups-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('v2 ContentGroup migration creates independent root table', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('content_groups'), true);
    assert.equal(tableNames.includes('notes'), true);
    assert.equal(tableNames.includes('note_blocks'), true);
  });
});

test('v2 ContentGroupMember migration creates member entity table', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('content_group_members'), true);
  });
});

test('v2 ContentGroupPetal migration creates fragment and petal entity tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('content_group_fragments'), true);
    assert.equal(tableNames.includes('content_group_petals'), true);
    assert.equal(tableNames.includes('content_group_petal_fragments'), true);
  });
});

function seedUserCourseNote(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  const courseId = uuidv4();
  const noteId = uuidv4();

  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', 'ContentGroup User');
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
    placements: [],
    identity: {
      status: 'none',
      role: null,
      topic: null,
      summary: null,
      created_by: 'human',
      reviewed_by: null,
      confidence: null,
      updated_at: '2026-06-22T00:00:00.000Z',
      accepted_at: null,
      metadata: {},
    },
    view_state: {},
    metadata: {},
    ...extra,
  };
}

test('ContentGroup freezes legacy Petal tables without hydrating or rewriting them', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Frozen legacy package', {
      id: 'content-group-frozen-petal-test',
      members: [{
        id: 'member-frozen-a',
        kind: 'content_range',
        current_content: 'Frozen member content',
        preview_text: 'Frozen member content',
        order_index: 0,
      }],
    }));

    db.prepare(`
      INSERT INTO content_group_fragments (
        id, user_id, content_group_id, course_id, note_id,
        source_member_id, content_range_json, label, preview_text,
        status, order_index, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'active', 0, '{}')
    `).run('frozen-fragment', userId, group.id, courseId, noteId, 'member-frozen-a', 'Frozen fragment', 'Frozen fragment');
    db.prepare(`
      INSERT INTO content_group_petals (
        id, user_id, content_group_id, course_id, note_id,
        label, role, summary, status, order_index, members_json, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'active', 0, '[]', '{}')
    `).run('frozen-petal', userId, group.id, courseId, noteId, 'Frozen petal');
    db.prepare(`
      INSERT INTO content_group_petal_fragments (
        id, user_id, content_group_id, petal_id, fragment_id, order_index
      ) VALUES (?, ?, ?, ?, ?, 0)
    `).run('frozen-assignment', userId, group.id, 'frozen-petal', 'frozen-fragment');
    db.prepare(`
      UPDATE content_groups
      SET fragments_json = ?, petals_json = ?
      WHERE id = ?
    `).run('[{"id":"embedded-fragment"}]', '[{"id":"embedded-petal"}]', group.id);

    const before = {
      fragments: db.prepare('SELECT * FROM content_group_fragments WHERE content_group_id = ? ORDER BY id').all(group.id),
      petals: db.prepare('SELECT * FROM content_group_petals WHERE content_group_id = ? ORDER BY id').all(group.id),
      assignments: db.prepare('SELECT * FROM content_group_petal_fragments WHERE content_group_id = ? ORDER BY id').all(group.id),
      embedded: db.prepare('SELECT fragments_json, petals_json FROM content_groups WHERE id = ?').get(group.id),
    };

    const hydrated = getContentGroup(db, userId, group.id) as Record<string, unknown>;
    assert.equal('fragments' in hydrated, false);
    assert.equal('petals' in hydrated, false);

    upsertContentGroup(db, userId, groupInput(courseId, noteId, group.title, {
      id: group.id,
      members: group.members,
      fragments: [{ id: 'must-not-write' }],
      petals: [{ id: 'must-not-write' }],
    }));

    assert.deepEqual(
      db.prepare('SELECT * FROM content_group_fragments WHERE content_group_id = ? ORDER BY id').all(group.id),
      before.fragments,
    );
    assert.deepEqual(
      db.prepare('SELECT * FROM content_group_petals WHERE content_group_id = ? ORDER BY id').all(group.id),
      before.petals,
    );
    assert.deepEqual(
      db.prepare('SELECT * FROM content_group_petal_fragments WHERE content_group_id = ? ORDER BY id').all(group.id),
      before.assignments,
    );
    assert.deepEqual(
      db.prepare('SELECT fragments_json, petals_json FROM content_groups WHERE id = ?').get(group.id),
      before.embedded,
    );
  });
});

test('ContentGroup member delete leaves unrelated frozen Petal rows untouched', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Frozen delete group', {
      id: 'content-group-frozen-delete-test',
      members: [
        { id: 'member-delete-a', kind: 'block', target_id: 'block-a', preview_text: 'A', order_index: 0 },
        { id: 'member-keep-b', kind: 'block', target_id: 'block-b', preview_text: 'B', order_index: 1 },
      ],
    }));

    db.prepare(`
      INSERT INTO content_group_petals (
        id, user_id, content_group_id, course_id, note_id,
        label, role, summary, status, order_index, members_json, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'active', 0, '[]', '{}')
    `).run('frozen-delete-petal', userId, group.id, courseId, noteId, 'Frozen row');
    db.prepare('UPDATE content_groups SET petals_json = ? WHERE id = ?')
      .run('[{"id":"frozen-embedded-petal"}]', group.id);

    const beforePetal = db.prepare('SELECT * FROM content_group_petals WHERE id = ?')
      .get('frozen-delete-petal');
    const beforeEmbedded = db.prepare('SELECT petals_json FROM content_groups WHERE id = ?')
      .get(group.id);

    const updated = deleteContentGroupMember(db, userId, group.id, 'member-delete-a');

    assert.deepEqual(updated.members.map((member: any) => member.id), ['member-keep-b']);
    assert.equal(db.prepare('SELECT id FROM content_group_members WHERE id = ?').get('member-delete-a'), undefined);
    assert.deepEqual(
      db.prepare('SELECT * FROM content_group_petals WHERE id = ?').get('frozen-delete-petal'),
      beforePetal,
    );
    assert.deepEqual(
      db.prepare('SELECT petals_json FROM content_groups WHERE id = ?').get(group.id),
      beforeEmbedded,
    );
  });
});

test('ContentGroup service upserts and lists groups without note metadata', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Definition of Power Series', {
      id: 'content-group-legacy-id',
      members: [{
        id: 'member-a',
        kind: 'content_range',
        target_id: 'range-a',
        current_content: 'A power series is an infinite series.',
        preview_text: 'A power series is an infinite series.',
        order_index: 0,
      }],
    }));

    assert.equal(group.id, 'content-group-legacy-id');
    assert.equal(group.title, 'Definition of Power Series');
    assert.equal(group.project_id, courseId);
    assert.equal(group.note_id, noteId);
    assert.equal(group.members.length, 1);

    const groups = listContentGroups(db, userId, { course_id: courseId, note_id: noteId });
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.id, group.id);

    const note = db.prepare('SELECT metadata FROM notes WHERE id = ?').get(noteId) as { metadata: string };
    assert.deepEqual(JSON.parse(note.metadata), {});

    const fetched = getContentGroup(db, userId, group.id);
    assert.equal(fetched.id, group.id);
  });
});

test('ContentGroup hydrates members from content_group_members before legacy members_json', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Definition package', {
      id: 'content-group-member-hydrate-test',
    }));

    db.prepare(`
      UPDATE content_groups
      SET members_json = ?
      WHERE id = ?
    `).run(JSON.stringify([{
        id: 'member-legacy',
        kind: 'content_range',
        current_content: 'Legacy member from members_json.',
        preview_text: 'Legacy member from members_json.',
        order_index: 0,
      }]), group.id);

    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, note_id,
        kind, target_id, label, current_content, preview_text,
        content_range_json, source_ref_json, source_sync_status,
        order_index, metadata
      )
      VALUES (
        @id, @user_id, @content_group_id, @course_id, @note_id,
        @kind, @target_id, @label, @current_content, @preview_text,
        @content_range_json, @source_ref_json, @source_sync_status,
        @order_index, @metadata
      )
    `).run({
      id: 'member-definition',
      user_id: userId,
      content_group_id: group.id,
      course_id: courseId,
      note_id: noteId,
      kind: 'content_range',
      target_id: 'range-definition',
      label: 'definition',
      current_content: 'A power series is an infinite polynomial.',
      preview_text: 'A power series is an infinite polynomial.',
      content_range_json: null,
      source_ref_json: JSON.stringify({
        note_id: noteId,
        block_id: 'block-definition',
        snapshot_text: 'A power series is an infinite polynomial.',
        status: 'fresh',
      }),
      source_sync_status: 'fresh',
      order_index: 0,
      metadata: '{}',
    });

    const fetched = getContentGroup(db, userId, group.id);
    assert.equal(fetched.members.length, 1);
    assert.equal(fetched.members[0]?.id, 'member-definition');
    assert.equal(fetched.members[0]?.current_content, 'A power series is an infinite polynomial.');
    assert.equal(fetched.members[0]?.source_ref.note_id, noteId);
  });
});

test('ContentGroup preserves stale source sync status through hydrate and save roundtrip', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Stale source group', {
      id: 'content-group-stale-roundtrip',
      members: [{
        id: 'content-group-stale-member',
        kind: 'canvas_object',
        target_id: null,
        current_content: 'Detached canvas object snapshot.',
        preview_text: 'Detached canvas object snapshot.',
        source_sync_status: 'stale',
      }],
    }));

    assert.equal(group.members[0]?.source_sync_status, 'stale');
    const saved = upsertContentGroup(db, userId, groupInput(courseId, noteId, group.title, {
      id: group.id,
      members: group.members,
    }));
    assert.equal(saved.members[0]?.source_sync_status, 'stale');

    const row = db.prepare('SELECT source_sync_status FROM content_group_members WHERE id = ?')
      .get('content-group-stale-member') as { source_sync_status: string };
    assert.equal(row.source_sync_status, 'stale');
  });
});

test('ContentGroupMember migration backfills legacy members_json and clears the legacy field', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Legacy package', {
      id: 'content-group-member-backfill-test',
    }));

    db.prepare(`
      DELETE FROM content_group_members
      WHERE content_group_id = ?
    `).run(group.id);
    db.prepare(`
      UPDATE content_groups
      SET members_json = ?
      WHERE id = ?
    `).run(JSON.stringify([{
        id: 'member-backfilled',
        kind: 'content_range',
        target_id: 'range-backfilled',
        current_content: 'Backfilled member content.',
        preview_text: 'Backfilled member content.',
        order_index: 0,
      }]), group.id);

    contentGroupMemberMigration.up(db);

    const memberRows = db.prepare(`
      SELECT id, content_group_id, current_content, order_index
      FROM content_group_members
      WHERE content_group_id = ?
      ORDER BY order_index ASC
    `).all(group.id) as Array<{
      id: string;
      content_group_id: string;
      current_content: string;
      order_index: number;
    }>;
    assert.deepEqual(memberRows, [{
      id: 'member-backfilled',
      content_group_id: group.id,
      current_content: 'Backfilled member content.',
      order_index: 0,
    }]);

    const raw = db.prepare('SELECT members_json FROM content_groups WHERE id = ?')
      .get(group.id) as { members_json: string };
    assert.equal(raw.members_json, '[]');
  });
});

test('ContentGroupPetal migration backfills legacy fragments and petals and clears legacy fields', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Legacy Petal package', {
      id: 'content-group-petal-backfill-test',
      members: [{
        id: 'member-backfill-a',
        kind: 'content_range',
        current_content: 'Backfilled member content.',
        preview_text: 'Backfilled member content.',
        order_index: 0,
      }],
    }));

    db.prepare('DELETE FROM content_group_petal_fragments WHERE content_group_id = ?').run(group.id);
    db.prepare('DELETE FROM content_group_petals WHERE content_group_id = ?').run(group.id);
    db.prepare('DELETE FROM content_group_fragments WHERE content_group_id = ?').run(group.id);
    db.prepare(`
      UPDATE content_groups
      SET fragments_json = ?, petals_json = ?
      WHERE id = ?
    `).run(
      JSON.stringify([{
        id: 'fragment-backfilled',
        source_member_id: 'member-backfill-a',
        content_range: null,
        label: 'Backfilled fragment',
        preview_text: 'Backfilled member content.',
        order_index: 0,
        status: 'active',
      }]),
      JSON.stringify([{
        id: 'petal-backfilled',
        label: 'Backfilled Petal',
        members: [],
        fragment_ids: ['fragment-backfilled'],
        order_index: 0,
        status: 'active',
        metadata: {
          role: 'definition',
          summary: 'Backfilled summary',
        },
      }]),
      group.id,
    );

    contentGroupPetalMigration.up(db);

    const fragmentRows = db.prepare(`
      SELECT id, source_member_id, label
      FROM content_group_fragments
      WHERE content_group_id = ?
    `).all(group.id);
    const petalRows = db.prepare(`
      SELECT id, label, role, summary
      FROM content_group_petals
      WHERE content_group_id = ?
    `).all(group.id);
    const assignmentRows = db.prepare(`
      SELECT petal_id, fragment_id
      FROM content_group_petal_fragments
      WHERE content_group_id = ?
    `).all(group.id);
    const raw = db.prepare('SELECT fragments_json, petals_json FROM content_groups WHERE id = ?')
      .get(group.id) as { fragments_json: string; petals_json: string };

    assert.deepEqual(fragmentRows, [{
      id: 'fragment-backfilled',
      source_member_id: 'member-backfill-a',
      label: 'Backfilled fragment',
    }]);
    assert.deepEqual(petalRows, [{
      id: 'petal-backfilled',
      label: 'Backfilled Petal',
      role: 'definition',
      summary: 'Backfilled summary',
    }]);
    assert.deepEqual(assignmentRows, [{
      petal_id: 'petal-backfilled',
      fragment_id: 'fragment-backfilled',
    }]);
    assert.equal(raw.fragments_json, '[]');
    assert.equal(raw.petals_json, '[]');
  });
});

test('ContentGroup upsert writes member rows, clears legacy members_json, and replaces order', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Reusable package', {
      id: 'content-group-member-replace-test',
      members: [
        {
          id: 'member-a',
          kind: 'block',
          current_content: 'A',
          preview_text: 'A',
          order_index: 0,
        },
        {
          id: 'member-b',
          kind: 'block',
          current_content: 'B',
          preview_text: 'B',
          order_index: 1,
        },
      ],
    }));

    const updated = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Reusable package', {
      id: 'content-group-member-replace-test',
      members: [
        {
          id: 'member-b',
          kind: 'block',
          current_content: 'B updated',
          preview_text: 'B updated',
          order_index: 99,
        },
        {
          id: 'member-c',
          kind: 'annotation',
          target_id: 'annotation-c',
          label: 'Example',
          current_content: 'C',
          preview_text: 'C',
          source_ref: {
            note_id: noteId,
            block_id: 'block-c',
            snapshot_text: 'C',
            status: 'fresh',
          },
          metadata: {
            role: 'practice',
          },
          order_index: 100,
        },
      ],
    }));

    assert.deepEqual(updated.members.map((member: any) => ({
      id: member.id,
      kind: member.kind,
      order_index: member.order_index,
      current_content: member.current_content,
      target_id: member.target_id,
      label: member.label,
      source_note_id: member.source_ref?.note_id ?? null,
      metadata_role: member.metadata?.role ?? null,
    })), [
      {
        id: 'member-b',
        kind: 'block',
        order_index: 0,
        current_content: 'B updated',
        target_id: null,
        label: null,
        source_note_id: null,
        metadata_role: null,
      },
      {
        id: 'member-c',
        kind: 'annotation',
        order_index: 1,
        current_content: 'C',
        target_id: 'annotation-c',
        label: 'Example',
        source_note_id: noteId,
        metadata_role: 'practice',
      },
    ]);

    const memberRows = db.prepare(`
      SELECT id, current_content, order_index
      FROM content_group_members
      WHERE content_group_id = ?
      ORDER BY order_index ASC
    `).all('content-group-member-replace-test') as Array<{
      id: string;
      current_content: string;
      order_index: number;
    }>;
    assert.deepEqual(memberRows, [
      { id: 'member-b', current_content: 'B updated', order_index: 0 },
      { id: 'member-c', current_content: 'C', order_index: 1 },
    ]);

    const raw = db.prepare('SELECT members_json FROM content_groups WHERE id = ?')
      .get('content-group-member-replace-test') as { members_json: string };
    assert.equal(raw.members_json, '[]');
  });
});

test('replaceNoteContentGroups writes hydrated members through member entity rows', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const [group] = replaceNoteContentGroups(db, userId, noteId, [
      groupInput(courseId, noteId, 'Batch saved package', {
        id: 'content-group-member-batch-test',
        members: [{
          id: 'member-batch',
          kind: 'content_range',
          current_content: 'Batch member content.',
          preview_text: 'Batch member content.',
          order_index: 42,
        }],
      }),
    ]);

    assert.equal(group?.members.length, 1);
    assert.equal(group?.members[0]?.id, 'member-batch');
    assert.equal(group?.members[0]?.order_index, 0);

    const row = db.prepare(`
      SELECT id, order_index
      FROM content_group_members
      WHERE content_group_id = ?
    `).get('content-group-member-batch-test') as { id: string; order_index: number } | undefined;
    assert.deepEqual(row, { id: 'member-batch', order_index: 0 });
  });
});

test('ContentGroup service derives project scope from note id when listing note groups', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Note scoped group', {
      id: 'content-group-note-scope',
    }));

    const groups = listContentGroups(db, userId, { note_id: noteId });

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.id, group.id);
    assert.equal(groups[0]?.project_id, courseId);
  });
});

test('replaceNoteContentGroups marks missing note groups deleted', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const first = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'First', {
      id: 'content-group-first',
    }));
    const second = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Second', {
      id: 'content-group-second',
    }));

    replaceNoteContentGroups(db, userId, noteId, [{ ...first, title: 'First renamed' }]);

    const active = listContentGroups(db, userId, { course_id: courseId, note_id: noteId, status: 'active' });
    assert.deepEqual(active.map((group) => group.title), ['First renamed']);

    const deleted = getContentGroup(db, userId, second.id);
    assert.equal(deleted.status, 'deleted');
  });
});

test('ContentGroup validator accepts runtime ids and note-derived course ownership', () => {
  const parsed = upsertContentGroupSchema.parse({
    id: 'content-group-legacy-id',
    note_id: uuidv4(),
    title: 'Runtime id group',
    members: [],
    placements: [],
    metadata: {},
  });

  assert.equal(parsed.id, 'content-group-legacy-id');
  assert.equal(parsed.title, 'Runtime id group');
});
