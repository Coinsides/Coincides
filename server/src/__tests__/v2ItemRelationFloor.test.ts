import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { runMigrations } from '../db/migrate.js';
import { getContentGroup, upsertContentGroup } from '../services/contentGroups.js';
import {
  COURSE_LIFECYCLE_POLICIES,
  assertCourseLifecyclePolicyCoverage,
} from '../services/courseLifecyclePolicies.js';
import { upsertContentGroupSchema } from '../validators/index.js';

type Db = Awaited<ReturnType<typeof initDb>>;

async function withDb(run: (db: Db) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-item-relation-floor-'));
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

function seedCourse(db: Db, userId: string, label: string) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, userId, label);
  return id;
}

function seedItem(db: Db, userId: string, plainText: string) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO items (
      id, user_id, body_json, plain_text, item_type, status, created_by, metadata
    ) VALUES (?, ?, '{}', ?, 'concept', 'active', 'user', '{}')
  `).run(id, userId, plainText);
  return id;
}

function seedSnapshot(db: Db, userId: string, itemId: string, content: string) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO item_snapshots (id, item_id, user_id, content, content_hash)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, itemId, userId, content, `hash:${content}`);
  return id;
}

function seedRelation(
  db: Db,
  userId: string,
  fromItemId: string,
  toItemId: string,
  fromSnapshotId: string,
  toSnapshotId: string,
) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO relations (
      id, user_id, from_item_id, to_item_id, relation_type, directionality,
      from_snapshot_id, to_snapshot_id, status, affirmed_at
    ) VALUES (?, ?, ?, ?, 'supports', 'directed', ?, ?, 'active', datetime('now'))
  `).run(id, userId, fromItemId, toItemId, fromSnapshotId, toSnapshotId);
  return id;
}

function restore046MemberAndLegacyTableShape(db: Db): void {
  db.exec(`
    DROP TABLE IF EXISTS relation_assessments;
    DROP TABLE IF EXISTS relations;
    DROP TABLE IF EXISTS item_anchors;
    DROP TABLE IF EXISTS item_snapshots;
    DROP TABLE IF EXISTS content_group_members;
    DROP TABLE IF EXISTS items;

    CREATE TABLE content_group_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
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

    CREATE TABLE content_group_fragments (id TEXT PRIMARY KEY);
    CREATE TABLE content_group_petals (id TEXT PRIMARY KEY);
    CREATE TABLE content_group_petal_fragments (id TEXT PRIMARY KEY);
    CREATE TABLE object_relations (id TEXT PRIMARY KEY);
    CREATE TABLE canvas_edges (id TEXT PRIMARY KEY);
    CREATE TABLE relation_layers (id TEXT PRIMARY KEY);
  `);
}

test('migration 047 installs the Item/Relation floor and removes exactly the retired support tables', async () => {
  await withDb((db) => {
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);

    const tables = new Set((db.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table'
    `).all() as Array<{ name: string }>).map((row) => row.name));
    for (const table of ['items', 'item_snapshots', 'item_anchors', 'relations', 'relation_assessments']) {
      assert.equal(tables.has(table), true, `${table} should exist`);
    }
    for (const table of [
      'content_group_fragments',
      'content_group_petals',
      'content_group_petal_fragments',
      'object_relations',
      'canvas_edges',
      'relation_layers',
    ]) {
      assert.equal(tables.has(table), false, `${table} should be removed`);
    }
    for (const table of ['learning_canvases', 'canvas_nodes', 'source_anchors']) {
      assert.equal(tables.has(table), true, `${table} should remain`);
    }

    const memberColumns = db.prepare('PRAGMA table_info(content_group_members)').all() as Array<{ name: string }>;
    assert.equal(memberColumns.some((column) => column.name === 'item_id'), true);
    const memberForeignKeys = db.prepare('PRAGMA foreign_key_list(content_group_members)').all() as Array<{
      from: string;
      table: string;
      on_delete: string;
    }>;
    assert.deepEqual(
      memberForeignKeys.find((foreignKey) => (
        foreignKey.from === 'item_id' && foreignKey.table === 'items'
      )),
      {
        id: 0,
        seq: 0,
        table: 'items',
        from: 'item_id',
        to: 'id',
        on_update: 'NO ACTION',
        on_delete: 'NO ACTION',
        match: 'NONE',
      },
    );
    const relationColumns = db.prepare('PRAGMA table_info(relations)').all() as Array<{ name: string; notnull: number }>;
    assert.equal(relationColumns.find((column) => column.name === 'affirmed_at')?.notnull, 1);
    assert.ok(db.prepare("SELECT id FROM db_migrations WHERE id = '047_v2_item_relation_floor'").get());
  });
});

test('migration runner upgrades a 046 member shape once and preserves every legacy member field', async () => {
  await withDb(async (db) => {
    const userId = seedUser(db, '046 Upgrade User');
    const courseId = seedCourse(db, userId, '046 Upgrade Course');
    const groupId = 'upgrade-046-group';
    db.prepare(`
      INSERT INTO content_groups (id, user_id, course_id, title, status, created_by)
      VALUES (?, ?, ?, '046 group', 'active', 'human')
    `).run(groupId, userId, courseId);

    restore046MemberAndLegacyTableShape(db);
    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, note_id,
        kind, target_id, label, current_content, preview_text,
        content_range_json, source_ref_json, source_sync_status,
        order_index, metadata, created_at, updated_at
      ) VALUES (
        'legacy-member', ?, ?, ?, NULL,
        'block', 'legacy-block', 'Legacy label', 'Legacy truth', 'Legacy preview',
        '{"start":1}', '{"receipt":true}', 'changed',
        7, '{"kept":true}', '2026-07-01T00:00:00Z', '2026-07-02T00:00:00Z'
      )
    `).run(userId, groupId, courseId);
    db.prepare("DELETE FROM db_migrations WHERE id = '047_v2_item_relation_floor'").run();

    assert.equal(await runMigrations(db), 1);
    assert.equal(await runMigrations(db), 0);

    const row = db.prepare(`
      SELECT id, kind, target_id, item_id, label, current_content, preview_text,
             content_range_json, source_ref_json, source_sync_status,
             order_index, metadata, created_at, updated_at
      FROM content_group_members WHERE id = 'legacy-member'
    `).get();
    assert.deepEqual(row, {
      id: 'legacy-member',
      kind: 'block',
      target_id: 'legacy-block',
      item_id: null,
      label: 'Legacy label',
      current_content: 'Legacy truth',
      preview_text: 'Legacy preview',
      content_range_json: '{"start":1}',
      source_ref_json: '{"receipt":true}',
      source_sync_status: 'changed',
      order_index: 7,
      metadata: '{"kept":true}',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-02T00:00:00Z',
    });
  });
});

test('migration runner rolls back the Item/Relation floor, retired-table drops, member rename, and 047 receipt', async () => {
  await withDb(async (db) => {
    const userId = seedUser(db, '047 Rollback User');
    const courseId = seedCourse(db, userId, '047 Rollback Course');
    const groupId = 'rollback-047-group';
    db.prepare(`
      INSERT INTO content_groups (id, user_id, course_id, title, status, created_by)
      VALUES (?, ?, ?, 'Rollback group', 'active', 'human')
    `).run(groupId, userId, courseId);

    restore046MemberAndLegacyTableShape(db);
    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, kind, target_id, metadata
      ) VALUES ('invalid-legacy-item', ?, ?, ?, 'item', NULL, '{}')
    `).run(userId, groupId, courseId);
    db.prepare("DELETE FROM db_migrations WHERE id = '047_v2_item_relation_floor'").run();

    await assert.rejects(
      () => runMigrations(db),
      /Migration 047_v2_item_relation_floor .* failed/,
    );

    for (const table of ['items', 'item_snapshots', 'item_anchors', 'relations', 'relation_assessments']) {
      assert.equal(
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table),
        undefined,
        `${table} should roll back`,
      );
    }
    assert.equal(
      db.prepare("SELECT id FROM db_migrations WHERE id = '047_v2_item_relation_floor'").get(),
      undefined,
    );
    const memberColumns = db.prepare('PRAGMA table_info(content_group_members)').all() as Array<{ name: string }>;
    assert.equal(memberColumns.some((column) => column.name === 'item_id'), false);
    assert.equal(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'content_group_members_v11_legacy'").get(),
      undefined,
    );
    assert.ok(db.prepare("SELECT id FROM content_group_members WHERE id = 'invalid-legacy-item'").get());
    for (const table of [
      'content_group_fragments',
      'content_group_petals',
      'content_group_petal_fragments',
      'object_relations',
      'canvas_edges',
      'relation_layers',
    ]) {
      assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
    }
  });
});

test('Relation composite foreign keys accept own snapshots and reject a borrowed snapshot', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Composite FK User');
    const firstItem = seedItem(db, userId, 'First item');
    const secondItem = seedItem(db, userId, 'Second item');
    const firstSnapshot = seedSnapshot(db, userId, firstItem, 'First item');
    const secondSnapshot = seedSnapshot(db, userId, secondItem, 'Second item');

    assert.doesNotThrow(() => seedRelation(
      db,
      userId,
      firstItem,
      secondItem,
      firstSnapshot,
      secondSnapshot,
    ));
    db.prepare("UPDATE relations SET status = 'revoked' WHERE from_item_id = ? AND to_item_id = ?")
      .run(firstItem, secondItem);

    assert.throws(
      () => seedRelation(db, userId, firstItem, secondItem, secondSnapshot, secondSnapshot),
      /FOREIGN KEY constraint failed/,
    );
  });
});

test('DELETE users cascades a same-user Item family and rejects a cross-user dangling Relation at statement end', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Cascade User');
    const courseId = seedCourse(db, userId, 'Cascade Course');
    const groupId = 'cascade-item-member-group';
    db.prepare(`
      INSERT INTO content_groups (id, user_id, course_id, title, status, created_by)
      VALUES (?, ?, ?, 'Cascade Item group', 'active', 'human')
    `).run(groupId, userId, courseId);
    const firstItem = seedItem(db, userId, 'Cascade first');
    const secondItem = seedItem(db, userId, 'Cascade second');
    const memberOnlyItem = seedItem(db, userId, 'Member-only delete guard');
    const firstSnapshot = seedSnapshot(db, userId, firstItem, 'Cascade first');
    const secondSnapshot = seedSnapshot(db, userId, secondItem, 'Cascade second');
    const relationId = seedRelation(db, userId, firstItem, secondItem, firstSnapshot, secondSnapshot);
    db.prepare(`
      INSERT INTO item_anchors (
        id, user_id, item_id, target_kind, target_id, excerpt, claimed_at, claimed_by, metadata
      ) VALUES (?, ?, ?, 'content_range', 'range-1', 'Evidence', datetime('now'), 'user', '{}')
    `).run(uuidv4(), userId, firstItem);
    db.prepare(`
      INSERT INTO relation_assessments (id, relation_id, user_id, verdict, model_key)
      VALUES (?, ?, ?, 'still_holds', 'test-model')
    `).run(uuidv4(), relationId, userId);
    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, kind, item_id, metadata
      ) VALUES ('cascade-item-member', ?, ?, ?, 'item', ?, '{}')
    `).run(userId, groupId, courseId, firstItem);
    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, kind, item_id, metadata
      ) VALUES ('direct-delete-guard-member', ?, ?, ?, 'item', ?, '{}')
    `).run(userId, groupId, courseId, memberOnlyItem);

    assert.throws(
      () => db.prepare('DELETE FROM items WHERE id = ?').run(memberOnlyItem),
      /FOREIGN KEY constraint failed/,
    );
    assert.ok(db.prepare('SELECT id FROM items WHERE id = ?').get(memberOnlyItem));

    assert.doesNotThrow(() => db.prepare('DELETE FROM users WHERE id = ?').run(userId));
    for (const table of [
      'content_group_members',
      'content_groups',
      'items',
      'item_snapshots',
      'item_anchors',
      'relations',
      'relation_assessments',
    ]) {
      assert.equal((db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count, 0);
    }

    const ownerId = seedUser(db, 'Endpoint Owner');
    const borrowerId = seedUser(db, 'Relation Borrower');
    const ownerItem = seedItem(db, ownerId, 'Owned endpoint');
    const borrowerItem = seedItem(db, borrowerId, 'Borrower endpoint');
    const ownerSnapshot = seedSnapshot(db, ownerId, ownerItem, 'Owned endpoint');
    const borrowerSnapshot = seedSnapshot(db, borrowerId, borrowerItem, 'Borrower endpoint');
    seedRelation(db, borrowerId, borrowerItem, ownerItem, borrowerSnapshot, ownerSnapshot);

    assert.throws(
      () => db.prepare('DELETE FROM users WHERE id = ?').run(ownerId),
      /FOREIGN KEY constraint failed/,
    );
    assert.ok(db.prepare('SELECT id FROM users WHERE id = ?').get(ownerId));
    assert.ok(db.prepare('SELECT id FROM items WHERE id = ?').get(ownerItem));
  });
});

test('Package B validates, stores, and hydrates ContentGroup Item membership without target coercion', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Package B User');
    const courseId = seedCourse(db, userId, 'Package B Course');
    const noteId = uuidv4();
    db.prepare(`
      INSERT INTO notes (id, user_id, course_id, title, metadata)
      VALUES (?, ?, ?, 'Package B Note', '{}')
    `).run(noteId, userId, courseId);
    const itemId = seedItem(db, userId, 'Durable member');
    const input = {
      id: 'package-b-group',
      project_id: courseId,
      note_id: noteId,
      canvas_id: 'package-b-canvas',
      title: 'Package B Group',
      members: [{
        id: 'package-b-member',
        kind: 'item',
        item_id: itemId,
        target_id: null,
        preview_text: 'Durable member',
        order_index: 0,
        metadata: { receipt: 'kept' },
      }],
    };

    const parsed = upsertContentGroupSchema.parse(input);
    const group = upsertContentGroup(db, userId, parsed) as any;
    assert.equal(group.members[0].kind, 'item');
    assert.equal(group.members[0].item_id, itemId);
    assert.equal(group.members[0].target_id, null);
    assert.equal(group.members[0].metadata.receipt, 'kept');

    const row = db.prepare(`
      SELECT kind, item_id, target_id FROM content_group_members WHERE id = 'package-b-member'
    `).get() as any;
    assert.deepEqual(row, { kind: 'item', item_id: itemId, target_id: null });
    assert.equal((getContentGroup(db, userId, group.id) as any).members[0].item_id, itemId);

    assert.throws(() => upsertContentGroupSchema.parse({
      ...input,
      id: 'invalid-package-b-group',
      members: [{ id: 'invalid-item-member', kind: 'item', item_id: itemId, target_id: 'legacy-target' }],
    }));
  });
});

test('a malformed missing Item edge hydrates as missing and is never coerced to content_range', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Missing Edge User');
    const courseId = seedCourse(db, userId, 'Missing Edge Course');
    const groupId = 'missing-edge-group';
    db.prepare(`
      INSERT INTO content_groups (id, user_id, course_id, title, status, created_by)
      VALUES (?, ?, ?, 'Missing edge', 'active', 'human')
    `).run(groupId, userId, courseId);

    db.pragma('ignore_check_constraints = ON');
    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, kind, item_id, target_id,
        source_sync_status, order_index, metadata
      ) VALUES ('missing-item-member', ?, ?, ?, 'item', NULL, NULL, 'fresh', 0, '{}')
    `).run(userId, groupId, courseId);
    db.pragma('ignore_check_constraints = OFF');

    const member = (getContentGroup(db, userId, groupId) as any).members[0];
    assert.equal(member.kind, 'item');
    assert.equal(member.item_id, null);
    assert.equal(member.source_sync_status, 'missing');
    assert.equal(member.metadata.integrity_status, 'orphaned');
  });
});

test('course lifecycle coverage registers Item origin as preserve with SET NULL', async () => {
  await withDb((db) => {
    assert.doesNotThrow(() => assertCourseLifecyclePolicyCoverage(db));
    const itemOrigin = COURSE_LIFECYCLE_POLICIES.find((entry) => (
      entry.table === 'items' && entry.column === 'origin_course_id'
    ));
    assert.equal(itemOrigin?.policy, 'preserve');
    assert.equal(itemOrigin?.onDelete, 'SET NULL');

    assert.throws(
      () => assertCourseLifecyclePolicyCoverage(
        db,
        COURSE_LIFECYCLE_POLICIES.filter((entry) => entry !== itemOrigin),
      ),
      /missing=\[items\.origin_course_id\]/,
    );
    assert.throws(
      () => assertCourseLifecyclePolicyCoverage(db, [
        ...COURSE_LIFECYCLE_POLICIES,
        { table: 'retired_table', column: 'course_id', policy: 'delete', reason: 'stale test entry' },
      ]),
      /stale=\[retired_table\.course_id\]/,
    );
    assert.throws(
      () => assertCourseLifecyclePolicyCoverage(
        db,
        COURSE_LIFECYCLE_POLICIES.map((entry) => (
          entry === itemOrigin ? { ...entry, onDelete: 'CASCADE' as const } : entry
        )),
      ),
      /onDeleteMismatch=\[items\.origin_course_id:expected=CASCADE,actual=SET NULL\]/,
    );
  });
});
