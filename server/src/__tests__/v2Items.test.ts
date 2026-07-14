import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import itemRoutes from '../routes/items.js';
import {
  castItem,
  collectItemAnchor,
  createItem,
  discardPoolItemAnchor,
  getItem,
  listPoolItemAnchors,
  retireItem,
  updateItem,
} from '../services/items.js';
import { deleteContentGroupMember, upsertContentGroup } from '../services/contentGroups.js';
import { createItemSchema, updateItemSchema } from '../validators/index.js';

type Db = Awaited<ReturnType<typeof initDb>>;

async function withDb(run: (db: Db) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-items-'));
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
  const groupId = uuidv4();
  const sourceRecordId = uuidv4();
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
  db.prepare(`
    INSERT INTO content_groups (
      id, user_id, course_id, note_id, title, status, created_by
    ) VALUES (?, ?, ?, ?, ?, 'active', 'human')
  `).run(groupId, userId, courseId, noteId, `${label} group`);
  db.prepare(`
    INSERT INTO source_records (
      id, user_id, display_name, origin_course_id, origin_entry_kind, metadata
    ) VALUES (?, ?, ?, ?, 'project_upload', '{}')
  `).run(sourceRecordId, userId, `${label} source`, courseId);
  db.prepare(`
    INSERT INTO note_block_sources (
      id, block_id, source_excerpt, reference_type, metadata, source_record_id
    ) VALUES (?, ?, ?, 'page', '{}', ?)
  `).run(uuidv4(), blockId, `${label} evidence`, sourceRecordId);
  return { courseId, noteId, blockId, groupId, sourceRecordId };
}

function collectBlock(
  db: Db,
  userId: string,
  workspace: ReturnType<typeof seedWorkspace>,
  excerpt = 'Collected evidence',
) {
  return collectItemAnchor(db, userId, {
    pool_scope_kind: 'content_group',
    pool_scope_id: workspace.groupId,
    target_kind: 'block',
    target_id: workspace.blockId,
    excerpt,
    collected_for: 'V2.BN.11.3 test',
    created_by: 'human',
  });
}

test('fresh startup creates the Item membership index after migration 047 final-shape guards', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-items-fresh-'));
  const dbPath = join(dir, 'fresh.db');

  try {
    const db = await initDb(dbPath);
    const columns = db.prepare('PRAGMA table_info(content_group_members)').all() as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === 'item_id'), true);
    const indexes = db.prepare('PRAGMA index_list(content_group_members)').all() as Array<{ name: string }>;
    assert.equal(indexes.some((index) => index.name === 'idx_content_group_members_item'), true);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('startup lets migration 047 rebuild legacy ContentGroupMember rows before the Item index is created', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-items-legacy-'));
  const dbPath = join(dir, 'legacy.db');
  const legacyDb = new Database(dbPath);
  legacyDb.exec(`
    CREATE TABLE content_group_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content_group_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      note_id TEXT,
      kind TEXT NOT NULL,
      target_id TEXT,
      label TEXT,
      current_content TEXT,
      preview_text TEXT,
      content_range_json TEXT,
      source_ref_json TEXT,
      source_sync_status TEXT NOT NULL DEFAULT 'fresh',
      order_index INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  legacyDb.close();

  try {
    const db = await initDb(dbPath);
    const columns = db.prepare('PRAGMA table_info(content_group_members)').all() as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === 'item_id'), true);
    const indexes = db.prepare('PRAGMA index_list(content_group_members)').all() as Array<{ name: string }>;
    assert.equal(indexes.some((index) => index.name === 'idx_content_group_members_item'), true);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Item lifecycle keeps body/plain/hash together and rejects invalid successor states', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Lifecycle User');
    const workspace = seedWorkspace(db, userId, 'Lifecycle');
    const item = createItem(db, userId, {
      plain_text: 'Definition of convergence',
      item_type: 'definition',
      topic: 'Convergence',
      origin_course_id: workspace.courseId,
      origin_note_id: workspace.noteId,
      created_by: 'human',
    });

    assert.equal(item.status, 'active');
    assert.equal(item.body_json.body, item.plain_text);
    assert.match(item.current_snapshot.content_hash, /^sha256:[a-f0-9]{64}$/);

    const updated = updateItem(db, userId, item.id, {
      plain_text: 'Updated definition of convergence',
      topic: 'Series convergence',
    });
    assert.equal(updated.body_json.body, updated.plain_text);
    assert.notEqual(updated.current_snapshot.id, item.current_snapshot.id);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM item_snapshots WHERE item_id = ?').get(item.id) as { count: number }).count,
      2,
    );

    const sameContent = updateItem(db, userId, item.id, {
      plain_text: updated.plain_text,
      topic: updated.topic,
    });
    assert.equal(sameContent.current_snapshot.id, updated.current_snapshot.id);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM item_snapshots WHERE item_id = ?').get(item.id) as { count: number }).count,
      2,
    );

    const successor = createItem(db, userId, { plain_text: 'Successor item' });
    const retired = retireItem(db, userId, item.id, { successor_item_id: successor.id });
    assert.equal(retired.status, 'retired');
    assert.equal(retired.retired_into_item_id, successor.id);
    assert.throws(() => updateItem(db, userId, item.id, { topic: 'Too late' }), /retired Item/i);
    assert.throws(
      () => retireItem(db, userId, successor.id, { successor_item_id: successor.id }),
      /itself/i,
    );

    const inactiveSuccessor = createItem(db, userId, { plain_text: 'Inactive successor' });
    retireItem(db, userId, inactiveSuccessor.id, {});
    const inactiveCandidate = createItem(db, userId, { plain_text: 'Cannot retire into inactive successor' });
    assert.throws(
      () => retireItem(db, userId, inactiveCandidate.id, { successor_item_id: inactiveSuccessor.id }),
      /successor must be an active Item/i,
    );
    assert.equal(getItem(db, userId, inactiveCandidate.id).status, 'active');

    const chainHead = createItem(db, userId, { plain_text: 'Corrupt active chain head' });
    const chainTail = createItem(db, userId, { plain_text: 'Chain tail' });
    db.prepare('UPDATE items SET retired_into_item_id = ? WHERE id = ?').run(chainTail.id, chainHead.id);
    assert.throws(
      () => retireItem(db, userId, chainTail.id, { successor_item_id: chainHead.id }),
      /cycle/i,
    );

    const corruptActive = createItem(db, userId, { plain_text: 'Corrupt active' });
    db.prepare('UPDATE items SET retired_into_item_id = ? WHERE id = ?').run(successor.id, corruptActive.id);
    assert.throws(() => getItem(db, userId, corruptActive.id), /active Item cannot have a successor/i);

    assert.throws(() => createItemSchema.parse({ plain_text: 'Bad create', status: 'retired' }));
    assert.throws(() => updateItemSchema.parse({ retired_into_item_id: successor.id }));
  });
});

test('pool Anchors support collect, discard, single cast, fusion cast, and same-source multi-use', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Pool User');
    const workspace = seedWorkspace(db, userId, 'Pool');
    const first = collectBlock(db, userId, workspace, 'First use of the source');
    const second = collectBlock(db, userId, workspace, 'Second use of the same source');
    assert.equal(first.source_record_id, workspace.sourceRecordId);
    assert.equal(second.source_record_id, workspace.sourceRecordId);
    assert.equal(listPoolItemAnchors(db, userId, 'content_group', workspace.groupId).length, 2);

    const firstItem = castItem(db, userId, {
      anchor_ids: [first.id],
      plain_text: first.excerpt,
      item_type: 'claim',
      origin_course_id: workspace.courseId,
      origin_note_id: workspace.noteId,
      claimed_by: 'human',
    });
    assert.equal(firstItem.anchors.length, 1);
    assert.equal(firstItem.anchors[0]?.pool_scope_id, null);
    assert.equal(firstItem.anchors[0]?.claimed_by, 'human');
    assert.ok(firstItem.anchors[0]?.claimed_at);

    const secondItem = castItem(db, userId, {
      anchor_ids: [second.id],
      plain_text: second.excerpt,
      item_type: 'example',
      claimed_by: 'human',
    });
    assert.notEqual(firstItem.id, secondItem.id);
    assert.equal(secondItem.anchors[0]?.source_record_id, firstItem.anchors[0]?.source_record_id);

    const third = collectBlock(db, userId, workspace, 'Fusion part A');
    const fourth = collectBlock(db, userId, workspace, 'Fusion part B');
    const fused = castItem(db, userId, {
      anchor_ids: [third.id, fourth.id],
      plain_text: 'Fusion part A\n\nFusion part B',
      topic: 'Fusion',
      claimed_by: 'human',
    });
    assert.equal(fused.anchors.length, 2);

    const disposable = collectBlock(db, userId, workspace, 'Discard me');
    discardPoolItemAnchor(db, userId, disposable.id);
    assert.equal(
      listPoolItemAnchors(db, userId, 'content_group', workspace.groupId)
        .some((anchor) => anchor.id === disposable.id),
      false,
    );
  });
});

test('cast fault injection rolls Item, Snapshot, and Anchor claim back together', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Atomic User');
    const workspace = seedWorkspace(db, userId, 'Atomic');

    for (const stage of ['after_item_insert', 'after_anchor_claim'] as const) {
      const anchor = collectBlock(db, userId, workspace, `Fail at ${stage}`);
      const beforeItems = (db.prepare('SELECT COUNT(*) AS count FROM items').get() as { count: number }).count;
      assert.throws(() => castItem(db, userId, {
        anchor_ids: [anchor.id],
        plain_text: `Atomic ${stage}`,
        claimed_by: 'human',
      }, {
        faultInjector(point) {
          if (point === stage) throw new Error(`injected:${stage}`);
        },
      }), new RegExp(`injected:${stage}`));

      assert.equal((db.prepare('SELECT COUNT(*) AS count FROM items').get() as { count: number }).count, beforeItems);
      assert.equal((db.prepare('SELECT COUNT(*) AS count FROM item_snapshots').get() as { count: number }).count, beforeItems);
      const row = db.prepare(`
        SELECT item_id, pool_scope_kind, pool_scope_id, claimed_at, claimed_by
        FROM item_anchors WHERE id = ?
      `).get(anchor.id) as any;
      assert.deepEqual(row, {
        item_id: null,
        pool_scope_kind: 'content_group',
        pool_scope_id: workspace.groupId,
        claimed_at: null,
        claimed_by: null,
      });
    }
  });
});

test('claimed receipt and Item survive target, Source, Note, and Project deletion with honest degradation', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Receipt User');
    const workspace = seedWorkspace(db, userId, 'Receipt');
    const anchor = collectBlock(db, userId, workspace, 'Receipt survives');
    const item = castItem(db, userId, {
      anchor_ids: [anchor.id],
      plain_text: 'Durable knowledge',
      origin_course_id: workspace.courseId,
      origin_note_id: workspace.noteId,
      claimed_by: 'human',
    });

    db.prepare('DELETE FROM note_blocks WHERE id = ?').run(workspace.blockId);
    let durable = getItem(db, userId, item.id);
    assert.equal(durable.anchors[0]?.target_id, workspace.blockId);
    assert.equal(durable.anchors[0]?.excerpt, 'Receipt survives');
    assert.equal(durable.anchors[0]?.source_record_id, workspace.sourceRecordId);

    db.prepare('DELETE FROM source_records WHERE id = ?').run(workspace.sourceRecordId);
    durable = getItem(db, userId, item.id);
    assert.equal(durable.anchors[0]?.source_record_id, null);
    assert.equal(durable.anchors[0]?.excerpt, 'Receipt survives');

    db.prepare('DELETE FROM courses WHERE id = ?').run(workspace.courseId);
    durable = getItem(db, userId, item.id);
    assert.equal(durable.origin_course_id, null);
    assert.equal(durable.origin_note_id, null);
    assert.equal(durable.anchors[0]?.target_id, workspace.blockId);
  });
});

test('Item APIs are user-scoped, Package B removal preserves Item, and no Item hard-delete route exists', async () => {
  await withDb((db) => {
    const ownerId = seedUser(db, 'Owner');
    const intruderId = seedUser(db, 'Intruder');
    const owner = seedWorkspace(db, ownerId, 'Owned');
    const intruder = seedWorkspace(db, intruderId, 'Foreign');
    const item = createItem(db, ownerId, { plain_text: 'Owner-only Item' });
    const anchor = collectBlock(db, ownerId, owner, 'Owner-only Anchor');

    assert.throws(() => getItem(db, intruderId, item.id), /Item not found/i);
    assert.throws(() => updateItem(db, intruderId, item.id, { topic: 'Trespass' }), /Item not found/i);
    assert.throws(() => retireItem(db, intruderId, item.id, {}), /Item not found/i);
    assert.throws(
      () => listPoolItemAnchors(db, intruderId, 'content_group', owner.groupId),
      /Content group not found/i,
    );
    assert.throws(() => castItem(db, intruderId, {
      anchor_ids: [anchor.id],
      plain_text: 'Stolen',
    }), /Anchor not found/i);
    assert.throws(() => collectItemAnchor(db, intruderId, {
      pool_scope_kind: 'content_group',
      pool_scope_id: intruder.groupId,
      target_kind: 'block',
      target_id: owner.blockId,
      excerpt: 'Foreign target',
    }), /Block not found/i);

    const group = upsertContentGroup(db, ownerId, {
      id: owner.groupId,
      project_id: owner.courseId,
      note_id: owner.noteId,
      title: 'Owned group',
      members: [{
        id: 'owned-item-member',
        kind: 'item',
        item_id: item.id,
        target_id: null,
      }],
    });
    assert.equal(group.members[0]?.item_id, item.id);
    deleteContentGroupMember(db, ownerId, owner.groupId, 'owned-item-member');
    assert.equal(getItem(db, ownerId, item.id).id, item.id);
  });

  const routes = (itemRoutes as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).filter((method) => layer.route.methods[method]),
    }));
  assert.equal(
    routes.some((route: any) => route.methods.includes('delete') && route.path === '/:itemId'),
    false,
  );
  assert.equal(
    routes.some((route: any) => route.methods.includes('delete') && route.path === '/anchors/:anchorId'),
    true,
  );
});
