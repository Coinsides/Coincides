import type Database from 'better-sqlite3';

function tableHasColumn(db: Database.Database, table: string, column: string): boolean {
  return (db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all() as Array<{ name: string }>)
    .some((entry) => entry.name === column);
}

function createItemRelationFloor(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body_json TEXT NOT NULL DEFAULT '{}',
      plain_text TEXT NOT NULL,
      item_type TEXT,
      topic TEXT,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'retired')),
      retired_into_item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
      origin_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
      origin_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
      created_by TEXT NOT NULL DEFAULT 'user',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_items_user_status_updated
      ON items(user_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_items_origin_course
      ON items(user_id, origin_course_id);
    CREATE INDEX IF NOT EXISTS idx_items_origin_note
      ON items(user_id, origin_note_id);
    CREATE INDEX IF NOT EXISTS idx_items_retired_into
      ON items(retired_into_item_id);

    CREATE TABLE IF NOT EXISTS item_snapshots (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, content_hash),
      UNIQUE(item_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_item_snapshots_user_item_created
      ON item_snapshots(user_id, item_id, created_at);

    CREATE TABLE IF NOT EXISTS item_anchors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
      pool_scope_kind TEXT,
      pool_scope_id TEXT,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      range_json TEXT,
      excerpt TEXT NOT NULL,
      reference_mode TEXT NOT NULL DEFAULT 'quote',
      source_record_id TEXT REFERENCES source_records(id) ON DELETE SET NULL,
      collected_for TEXT,
      claimed_at TEXT,
      claimed_by TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (
        (item_id IS NOT NULL AND pool_scope_kind IS NULL AND pool_scope_id IS NULL)
        OR
        (item_id IS NULL AND pool_scope_kind IS NOT NULL AND pool_scope_id IS NOT NULL)
      )
    );

    CREATE INDEX IF NOT EXISTS idx_item_anchors_user_item
      ON item_anchors(user_id, item_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_item_anchors_pool
      ON item_anchors(user_id, pool_scope_kind, pool_scope_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_item_anchors_target
      ON item_anchors(user_id, target_kind, target_id);
    CREATE INDEX IF NOT EXISTS idx_item_anchors_source_record
      ON item_anchors(source_record_id);

    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_item_id TEXT NOT NULL REFERENCES items(id),
      to_item_id TEXT NOT NULL REFERENCES items(id),
      relation_type TEXT NOT NULL,
      directionality TEXT NOT NULL DEFAULT 'directed'
        CHECK (directionality IN ('directed', 'undirected')),
      from_snapshot_id TEXT NOT NULL REFERENCES item_snapshots(id),
      to_snapshot_id TEXT NOT NULL REFERENCES item_snapshots(id),
      note TEXT,
      created_by TEXT NOT NULL DEFAULT 'user',
      origin_purpose_id TEXT REFERENCES purposes(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      affirmed_at TEXT NOT NULL,
      CHECK (from_item_id != to_item_id),
      CHECK (directionality = 'directed' OR from_item_id < to_item_id),
      FOREIGN KEY (from_item_id, from_snapshot_id)
        REFERENCES item_snapshots(item_id, id),
      FOREIGN KEY (to_item_id, to_snapshot_id)
        REFERENCES item_snapshots(item_id, id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_relations_active
      ON relations(from_item_id, to_item_id, relation_type)
      WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_relations_user_from_status
      ON relations(user_id, from_item_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_relations_user_to_status
      ON relations(user_id, to_item_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_relations_origin_purpose
      ON relations(origin_purpose_id);

    CREATE TABLE IF NOT EXISTS relation_assessments (
      id TEXT PRIMARY KEY,
      relation_id TEXT NOT NULL REFERENCES relations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      verdict TEXT NOT NULL
        CHECK (verdict IN ('still_holds', 'questionable')),
      model_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_relation_assessments_relation_created
      ON relation_assessments(relation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_relation_assessments_user_created
      ON relation_assessments(user_id, created_at);
  `);
}

function rebuildContentGroupMembers(db: Database.Database): void {
  if (tableHasColumn(db, 'content_group_members', 'item_id')) return;

  db.exec(`
    ALTER TABLE content_group_members RENAME TO content_group_members_v11_legacy;

    CREATE TABLE content_group_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,

      kind TEXT NOT NULL,
      target_id TEXT,
      item_id TEXT REFERENCES items(id),
      label TEXT,

      current_content TEXT,
      preview_text TEXT,

      content_range_json TEXT,
      source_ref_json TEXT,
      source_sync_status TEXT NOT NULL DEFAULT 'fresh',

      order_index INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (
        (kind = 'item' AND item_id IS NOT NULL AND target_id IS NULL)
        OR
        (kind != 'item' AND item_id IS NULL)
      )
    );

    INSERT INTO content_group_members (
      id, user_id, content_group_id, course_id, note_id,
      kind, target_id, item_id, label, current_content, preview_text,
      content_range_json, source_ref_json, source_sync_status,
      order_index, metadata, created_at, updated_at
    )
    SELECT
      id, user_id, content_group_id, course_id, note_id,
      kind, target_id, NULL, label, current_content, preview_text,
      content_range_json, source_ref_json, source_sync_status,
      order_index, metadata, created_at, updated_at
    FROM content_group_members_v11_legacy;

    DROP TABLE content_group_members_v11_legacy;

    CREATE INDEX idx_content_group_members_group_order
      ON content_group_members(user_id, content_group_id, order_index);
    CREATE INDEX idx_content_group_members_course_note
      ON content_group_members(user_id, course_id, note_id);
    CREATE INDEX idx_content_group_members_target
      ON content_group_members(user_id, kind, target_id);
    CREATE INDEX idx_content_group_members_item
      ON content_group_members(user_id, item_id);
    CREATE INDEX idx_content_group_members_source_status
      ON content_group_members(user_id, source_sync_status);
  `);
}

export default {
  id: '047_v2_item_relation_floor',
  description: 'Add Item and Relation truth floor and ContentGroup Item membership',
  up(db: Database.Database): void {
    createItemRelationFloor(db);

    db.exec(`
      DROP TABLE IF EXISTS content_group_petal_fragments;
      DROP TABLE IF EXISTS content_group_fragments;
      DROP TABLE IF EXISTS content_group_petals;
    `);

    rebuildContentGroupMembers(db);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_content_group_members_item
        ON content_group_members(user_id, item_id);
    `);

    db.exec(`
      DROP TABLE IF EXISTS canvas_edges;
      DROP TABLE IF EXISTS object_relations;
      DROP TABLE IF EXISTS relation_layers;
    `);
  },
};
