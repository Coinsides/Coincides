import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import contentGroupMemberMigration from '../db/migrations/033_v2_content_group_members.js';
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

test('migration 047 removes the retired ContentGroup Petal support tables', async () => {
  await withDb((db) => {
    const tableNames = new Set(db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name));

    assert.equal(tableNames.has('content_group_fragments'), false);
    assert.equal(tableNames.has('content_group_petals'), false);
    assert.equal(tableNames.has('content_group_petal_fragments'), false);
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
