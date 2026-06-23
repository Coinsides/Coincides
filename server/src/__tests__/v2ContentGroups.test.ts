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
    fragments: [],
    petals: [],
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

test('ContentGroup hydrates fragments and petals from entity tables before legacy JSON', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Petal hydrate group', {
      id: 'content-group-petal-hydrate',
      members: [{
        id: 'member-hydrate-a',
        kind: 'content_range',
        label: 'Member A',
        current_content: 'Current member text',
        preview_text: 'Current member text',
        order_index: 0,
      }],
    }));

    db.prepare(`
      UPDATE content_groups
      SET fragments_json = ?, petals_json = ?
      WHERE id = ?
    `).run(
      JSON.stringify([{
        id: 'legacy-fragment',
        source_member_id: 'member-hydrate-a',
        content_range: null,
        label: 'Legacy fragment',
        preview_text: 'Legacy fragment text',
        order_index: 0,
        status: 'active',
      }]),
      JSON.stringify([{
        id: 'legacy-petal',
        label: 'Legacy Petal',
        members: [],
        fragment_ids: ['legacy-fragment'],
        order_index: 0,
        status: 'active',
      }]),
      group.id,
    );

    db.prepare(`
      INSERT INTO content_group_fragments (
        id, user_id, content_group_id, course_id, note_id,
        source_member_id, content_range_json, label, preview_text,
        status, order_index, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'entity-fragment',
      userId,
      group.id,
      courseId,
      noteId,
      'member-hydrate-a',
      null,
      'Entity fragment',
      'Entity fragment text',
      'active',
      0,
      JSON.stringify({ marker: 'entity' }),
    );

    db.prepare(`
      INSERT INTO content_group_petals (
        id, user_id, content_group_id, course_id, note_id,
        label, role, summary, status, order_index, members_json, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'entity-petal',
      userId,
      group.id,
      courseId,
      noteId,
      'Entity Petal',
      'concept',
      'Entity summary',
      'active',
      0,
      '[]',
      '{}',
    );

    db.prepare(`
      INSERT INTO content_group_petal_fragments (
        id, user_id, content_group_id, petal_id, fragment_id, order_index
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'entity-petal::entity-fragment',
      userId,
      group.id,
      'entity-petal',
      'entity-fragment',
      0,
    );

    const hydrated = getContentGroup(db, userId, group.id);

    assert.equal(hydrated.fragments.length, 1);
    assert.equal(hydrated.fragments[0].id, 'entity-fragment');
    assert.equal(hydrated.petals.length, 1);
    assert.equal(hydrated.petals[0].id, 'entity-petal');
    assert.deepEqual(hydrated.petals[0].fragment_ids, ['entity-fragment']);
    assert.equal(hydrated.petals[0].metadata.role, 'concept');
    assert.equal(hydrated.petals[0].metadata.summary, 'Entity summary');
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

test('ContentGroup upsert writes fragments and petals to entity tables and clears legacy JSON', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Petal write package', {
      id: 'content-group-petal-write-test',
      members: [{
        id: 'member-write-a',
        kind: 'content_range',
        label: 'Member A',
        current_content: 'Alpha',
        preview_text: 'Alpha',
        order_index: 0,
      }],
      fragments: [{
        id: 'fragment-write-a',
        source_member_id: 'member-write-a',
        content_range: null,
        label: 'Fragment A',
        preview_text: 'Alpha',
        order_index: 0,
        status: 'active',
        metadata: { local: true },
      }],
      petals: [{
        id: 'petal-write-a',
        label: 'Definition',
        members: [],
        fragment_ids: ['fragment-write-a'],
        order_index: 0,
        status: 'active',
        metadata: { role: 'definition', summary: 'Definition piece' },
      }],
    }));

    assert.equal(group.fragments.length, 1);
    assert.equal(group.fragments[0].id, 'fragment-write-a');
    assert.equal(group.petals.length, 1);
    assert.deepEqual(group.petals[0].fragment_ids, ['fragment-write-a']);

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
      id: 'fragment-write-a',
      source_member_id: 'member-write-a',
      label: 'Fragment A',
    }]);
    assert.deepEqual(petalRows, [{
      id: 'petal-write-a',
      label: 'Definition',
      role: 'definition',
      summary: 'Definition piece',
    }]);
    assert.deepEqual(assignmentRows, [{
      petal_id: 'petal-write-a',
      fragment_id: 'fragment-write-a',
    }]);
    assert.equal(raw.fragments_json, '[]');
    assert.equal(raw.petals_json, '[]');
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

test('ContentGroup member hard delete prunes dependent fragments and petals', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Petal cascade package', {
      id: 'content-group-member-cascade-test',
      members: [
        { id: 'member-a', kind: 'block', current_content: 'A', preview_text: 'A', order_index: 0 },
        { id: 'member-b', kind: 'block', current_content: 'B', preview_text: 'B', order_index: 1 },
        { id: 'member-c', kind: 'block', current_content: 'C', preview_text: 'C', order_index: 2 },
      ],
      fragments: [{
        id: 'fragment-a',
        source_member_id: 'member-a',
        preview_text: 'A fragment',
        order_index: 0,
        status: 'active',
      }, {
        id: 'fragment-b',
        source_member_id: 'member-b',
        preview_text: 'B fragment',
        order_index: 1,
        status: 'active',
      }],
      petals: [{
        id: 'petal-a',
        label: 'Dependent by fragment',
        members: [],
        fragment_ids: ['fragment-a'],
        order_index: 0,
        status: 'active',
      }, {
        id: 'petal-b',
        label: 'Independent petal',
        members: [],
        fragment_ids: ['fragment-b'],
        order_index: 1,
        status: 'active',
      }, {
        id: 'petal-c',
        label: 'Dependent by embedded member',
        members: [{ id: 'member-a', kind: 'block', current_content: 'A', preview_text: 'A', order_index: 0 }],
        fragment_ids: [],
        order_index: 2,
        status: 'active',
      }],
    }));

    const updated = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Petal cascade package', {
      id: 'content-group-member-cascade-test',
      members: [
        { id: 'member-b', kind: 'block', current_content: 'B', preview_text: 'B', order_index: 0 },
        { id: 'member-c', kind: 'block', current_content: 'C', preview_text: 'C', order_index: 1 },
      ],
      fragments: [{
        id: 'fragment-a',
        source_member_id: 'member-a',
        preview_text: 'A fragment',
        order_index: 0,
        status: 'active',
      }, {
        id: 'fragment-b',
        source_member_id: 'member-b',
        preview_text: 'B fragment',
        order_index: 1,
        status: 'active',
      }],
      petals: [{
        id: 'petal-a',
        label: 'Dependent by fragment',
        members: [],
        fragment_ids: ['fragment-a'],
        order_index: 0,
        status: 'active',
      }, {
        id: 'petal-b',
        label: 'Independent petal',
        members: [],
        fragment_ids: ['fragment-b'],
        order_index: 1,
        status: 'active',
      }, {
        id: 'petal-c',
        label: 'Dependent by embedded member',
        members: [{ id: 'member-a', kind: 'block', current_content: 'A', preview_text: 'A', order_index: 0 }],
        fragment_ids: [],
        order_index: 2,
        status: 'active',
      }],
    }));

    assert.deepEqual(updated.members.map((member: any) => member.id), ['member-b', 'member-c']);
    assert.deepEqual(updated.fragments.map((fragment: any) => ({
      id: fragment.id,
      order_index: fragment.order_index,
    })), [{ id: 'fragment-b', order_index: 0 }]);
    assert.deepEqual(updated.petals.map((petal: any) => ({
      id: petal.id,
      fragment_ids: petal.fragment_ids,
      order_index: petal.order_index,
    })), [{ id: 'petal-b', fragment_ids: ['fragment-b'], order_index: 0 }]);
  });
});

test('ContentGroup member delete service hard deletes one member and prunes dependencies', async () => {
  const { deleteContentGroupMember } = await import('../services/contentGroups.js') as any;
  assert.equal(typeof deleteContentGroupMember, 'function');

  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Delete one member', {
      id: 'content-group-delete-member-route-test',
      members: [
        { id: 'member-a', kind: 'block', current_content: 'A', preview_text: 'A', order_index: 0 },
        { id: 'member-b', kind: 'block', current_content: 'B', preview_text: 'B', order_index: 1 },
      ],
      fragments: [{
        id: 'fragment-a',
        source_member_id: 'member-a',
        preview_text: 'A fragment',
        order_index: 0,
        status: 'active',
      }],
      petals: [{
        id: 'petal-a',
        label: 'Dependent petal',
        members: [],
        fragment_ids: ['fragment-a'],
        order_index: 0,
        status: 'active',
      }],
    }));

    const updated = deleteContentGroupMember(db, userId, group.id, 'member-a');

    assert.deepEqual(updated.members.map((member: any) => member.id), ['member-b']);
    assert.deepEqual(updated.fragments.map((fragment: any) => fragment.id), []);
    assert.deepEqual(updated.petals.map((petal: any) => petal.id), []);
    const deleted = db.prepare('SELECT id FROM content_group_members WHERE id = ?')
      .get('member-a');
    assert.equal(deleted, undefined);
  });
});

test('deleteContentGroupMember hard-prunes entity-backed fragments and dependent petals', async () => {
  const { deleteContentGroupMember } = await import('../services/contentGroups.js') as any;

  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Entity delete cascade', {
      id: 'content-group-petal-member-delete',
      members: [
        { id: 'member-delete-a', kind: 'content_range', current_content: 'Delete me', preview_text: 'Delete me', order_index: 0 },
        { id: 'member-keep-b', kind: 'content_range', current_content: 'Keep me', preview_text: 'Keep me', order_index: 1 },
      ],
      fragments: [{
        id: 'fragment-delete-a',
        source_member_id: 'member-delete-a',
        content_range: null,
        label: 'Delete fragment',
        preview_text: 'Delete me',
        order_index: 0,
        status: 'active',
      }, {
        id: 'fragment-keep-b',
        source_member_id: 'member-keep-b',
        content_range: null,
        label: 'Keep fragment',
        preview_text: 'Keep me',
        order_index: 1,
        status: 'active',
      }],
      petals: [{
        id: 'petal-delete-a',
        label: 'Delete Petal',
        members: [],
        fragment_ids: ['fragment-delete-a'],
        order_index: 0,
        status: 'active',
      }, {
        id: 'petal-keep-b',
        label: 'Keep Petal',
        members: [],
        fragment_ids: ['fragment-keep-b'],
        order_index: 1,
        status: 'active',
      }],
    }));

    const updated = deleteContentGroupMember(db, userId, group.id, 'member-delete-a');

    assert.deepEqual(updated.members.map((member: any) => member.id), ['member-keep-b']);
    assert.deepEqual(updated.fragments.map((fragment: any) => fragment.id), ['fragment-keep-b']);
    assert.deepEqual(updated.petals.map((petal: any) => petal.id), ['petal-keep-b']);

    const deletedFragments = db.prepare(`
      SELECT id
      FROM content_group_fragments
      WHERE id = 'fragment-delete-a'
    `).all();
    const deletedPetals = db.prepare(`
      SELECT id
      FROM content_group_petals
      WHERE id = 'petal-delete-a'
    `).all();
    const keptAssignments = db.prepare(`
      SELECT petal_id, fragment_id
      FROM content_group_petal_fragments
      WHERE content_group_id = ?
    `).all(group.id);

    assert.equal(deletedFragments.length, 0);
    assert.equal(deletedPetals.length, 0);
    assert.deepEqual(keptAssignments, [{
      petal_id: 'petal-keep-b',
      fragment_id: 'fragment-keep-b',
    }]);
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
    fragments: [],
    petals: [],
    placements: [],
    metadata: {},
  });

  assert.equal(parsed.id, 'content-group-legacy-id');
  assert.equal(parsed.title, 'Runtime id group');
});
