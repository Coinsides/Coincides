import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { deleteProjectWithSourcePolicy } from '../services/courseLifecycle.js';
import { getContentGroup, upsertContentGroup } from '../services/contentGroups.js';
import {
  castItem,
  collectItemAnchor,
  createItem,
  getItem,
  retireItem,
} from '../services/items.js';
import { listNotePurposes, replaceNotePurposes } from '../services/purposes.js';
import {
  createRelation,
  getRelation,
  reaffirmRelation,
  revokeRelation,
} from '../services/relations.js';

type Db = Awaited<ReturnType<typeof initDb>>;

async function withDb(run: (db: Db) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-relation-lifecycle-'));
  try {
    const db = await initDb(join(dir, 'test.db'));
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUser(db: Db, label: string) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, 'hash', ?, datetime('now'))
  `).run(id, `${id}@example.com`, label);
  return id;
}

function seedWorkspace(db: Db, userId: string, label: string) {
  const courseId = uuidv4();
  const noteId = uuidv4();
  const blockId = uuidv4();
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, label);
  db.prepare(`
    INSERT INTO notes (id, user_id, course_id, title, metadata)
    VALUES (?, ?, ?, ?, '{}')
  `).run(noteId, userId, courseId, `${label} note`);
  db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, content_json, plain_text, source_kind, metadata
    ) VALUES (?, ?, ?, 'paragraph', ?, ?, 'manual', '{}')
  `).run(blockId, userId, courseId, JSON.stringify({ body: `${label} evidence` }), `${label} evidence`);
  db.prepare(`
    INSERT INTO note_block_placements (id, note_id, block_id, order_index)
    VALUES (?, ?, ?, 0)
  `).run(uuidv4(), noteId, blockId);
  return { courseId, noteId, blockId };
}

function groupInput(
  workspace: ReturnType<typeof seedWorkspace>,
  id: string,
  title: string,
  members: Record<string, unknown>[] = [],
) {
  return {
    id,
    project_id: workspace.courseId,
    note_id: workspace.noteId,
    canvas_id: workspace.noteId,
    title,
    status: 'active',
    created_by: 'human',
    members,
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
      updated_at: '2026-07-14T00:00:00.000Z',
      accepted_at: null,
      metadata: {},
    },
    view_state: {},
    metadata: {},
  };
}

test('V2.BN.11.7 independent Note deletion preserves Item, Snapshot, Anchor, and Relation truth', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Independent Note lifecycle user');
    const workspace = seedWorkspace(db, userId, 'Independent Note lifecycle');
    const groupId = uuidv4();
    upsertContentGroup(db, userId, groupInput(workspace, groupId, 'Anchor pool'));
    const anchor = collectItemAnchor(db, userId, {
      pool_scope_kind: 'content_group',
      pool_scope_id: groupId,
      target_kind: 'block',
      target_id: workspace.blockId,
      excerpt: 'Independent Note receipt',
      collected_for: 'V2.BN.11.7 lifecycle closure',
      created_by: 'human',
    });
    const first = castItem(db, userId, {
      anchor_ids: [anchor.id],
      plain_text: 'Knowledge survives its origin Note',
      origin_course_id: workspace.courseId,
      origin_note_id: workspace.noteId,
      claimed_by: 'human',
    });
    const second = createItem(db, userId, {
      plain_text: 'Independent peer Item',
      origin_course_id: workspace.courseId,
      origin_note_id: workspace.noteId,
    });
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'supports',
    });

    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(workspace.noteId, userId);

    const survived = getItem(db, userId, first.id);
    assert.equal(survived.origin_note_id, null);
    assert.equal(survived.origin_course_id, workspace.courseId);
    assert.equal(survived.anchors[0]?.target_id, workspace.blockId);
    assert.equal(survived.anchors[0]?.excerpt, 'Independent Note receipt');
    assert.equal(getRelation(db, userId, relation.id).id, relation.id);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM item_snapshots WHERE item_id IN (?, ?)')
        .get(first.id, second.id) as { count: number }).count,
      2,
    );
  });
});

test('V2.BN.11.7 Project deletion degrades origins while cross-Project organization remains readable', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Project lifecycle user');
    const origin = seedWorkspace(db, userId, 'Origin Project');
    const organizer = seedWorkspace(db, userId, 'Organizer Project');
    const first = createItem(db, userId, {
      plain_text: 'Cross-Project first Item',
      origin_course_id: origin.courseId,
      origin_note_id: origin.noteId,
    });
    const second = createItem(db, userId, {
      plain_text: 'Cross-Project second Item',
      origin_course_id: origin.courseId,
      origin_note_id: origin.noteId,
    });
    const originPurposeId = 'purpose-origin-project-receipt';
    replaceNotePurposes(db, userId, origin.noteId, [{
      id: originPurposeId,
      title: 'Origin Project purpose',
      is_note_default: true,
      members: [],
    }]);
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'supports',
      origin_purpose_id: originPurposeId,
    });

    const organizerGroupId = uuidv4();
    upsertContentGroup(db, userId, groupInput(
      organizer,
      organizerGroupId,
      'Cross-Project organizer group',
      [
        { id: uuidv4(), kind: 'item', item_id: first.id },
        { id: uuidv4(), kind: 'item', item_id: second.id },
      ],
    ));
    replaceNotePurposes(db, userId, organizer.noteId, [{
      id: 'purpose-cross-project-organizer',
      title: 'Cross-Project organizer purpose',
      is_note_default: true,
      members: [
        { id: uuidv4(), member_kind: 'item', member_id: first.id },
        { id: uuidv4(), member_kind: 'item', member_id: second.id },
      ],
    }]);

    deleteProjectWithSourcePolicy(db, userId, origin.courseId, 'delete_projection');

    const survivedFirst = getItem(db, userId, first.id);
    assert.equal(survivedFirst.origin_course_id, null);
    assert.equal(survivedFirst.origin_note_id, null);
    assert.equal(getRelation(db, userId, relation.id).origin_purpose_id, null);
    assert.equal(db.prepare('SELECT id FROM courses WHERE id = ?').get(origin.courseId), undefined);
    assert.deepEqual(
      getContentGroup(db, userId, organizerGroupId).members.map((member: any) => member.item_id),
      [first.id, second.id],
    );
    assert.deepEqual(
      listNotePurposes(db, userId, organizer.noteId)[0]?.members.map((member: any) => member.member_id),
      [first.id, second.id],
    );
  });
});

test('V2.BN.11.7 deleting a ContentGroup root removes only its organization edges', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'ContentGroup lifecycle user');
    const workspace = seedWorkspace(db, userId, 'ContentGroup lifecycle');
    const first = createItem(db, userId, { plain_text: 'Grouped first Item' });
    const second = createItem(db, userId, { plain_text: 'Grouped second Item' });
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'supports',
    });
    const groupId = uuidv4();
    upsertContentGroup(db, userId, groupInput(workspace, groupId, 'Disposable organization root', [
      { id: uuidv4(), kind: 'item', item_id: first.id },
      { id: uuidv4(), kind: 'item', item_id: second.id },
    ]));

    db.prepare('DELETE FROM content_groups WHERE id = ? AND user_id = ?').run(groupId, userId);

    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM content_group_members WHERE content_group_id = ?')
        .get(groupId) as { count: number }).count,
      0,
    );
    assert.equal(getItem(db, userId, first.id).id, first.id);
    assert.equal(getItem(db, userId, second.id).id, second.id);
    assert.equal(getRelation(db, userId, relation.id).id, relation.id);
  });
});

test('V2.BN.11.7 active Relation remains readable across retirement but cannot be reaffirmed', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Retired endpoint lifecycle user');
    const first = createItem(db, userId, { plain_text: 'Retiring endpoint' });
    const second = createItem(db, userId, { plain_text: 'Active endpoint' });
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'supports',
    });

    retireItem(db, userId, first.id, {});

    const readable = getRelation(db, userId, relation.id);
    assert.equal(readable.status, 'active');
    assert.equal(readable.from_item.status, 'retired');
    assert.throws(() => reaffirmRelation(db, userId, relation.id), /require active Item endpoints/i);
    assert.equal(revokeRelation(db, userId, relation.id).status, 'revoked');
    assert.equal(getRelation(db, userId, relation.id).from_item.status, 'retired');
  });
});
