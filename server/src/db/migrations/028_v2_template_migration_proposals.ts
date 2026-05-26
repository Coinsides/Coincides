import type Database from 'better-sqlite3';

export default {
  id: '028_v2_template_migration_proposals',
  description: 'Add v2 template migration proposal governance tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS template_migration_mappings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_template_definition_id TEXT REFERENCES template_definitions(id) ON DELETE SET NULL,
        target_template_definition_id TEXT REFERENCES template_definitions(id) ON DELETE SET NULL,
        source_template_key TEXT NOT NULL,
        source_template_version TEXT NOT NULL DEFAULT '1.0.0',
        target_template_key TEXT NOT NULL,
        target_template_version TEXT NOT NULL DEFAULT '1.0.0',
        mapping_kind TEXT NOT NULL DEFAULT 'alias_mapping',
        status TEXT NOT NULL DEFAULT 'active',
        source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        reason TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, source_template_key, source_template_version, target_template_key, target_template_version, mapping_kind)
      );
      CREATE INDEX IF NOT EXISTS idx_template_migration_mappings_source ON template_migration_mappings(user_id, source_template_key, source_template_version, status);
      CREATE INDEX IF NOT EXISTS idx_template_migration_mappings_target ON template_migration_mappings(user_id, target_template_key, target_template_version, status);

      CREATE TABLE IF NOT EXISTS template_migration_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        source_proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        migration_mode TEXT NOT NULL,
        source_template_definition_id TEXT REFERENCES template_definitions(id) ON DELETE SET NULL,
        source_template_key TEXT NOT NULL,
        source_template_version TEXT NOT NULL DEFAULT '1.0.0',
        target_template_definition_id TEXT REFERENCES template_definitions(id) ON DELETE SET NULL,
        target_template_key TEXT,
        target_template_version TEXT,
        affected_count INTEGER NOT NULL DEFAULT 0,
        mutated_count INTEGER NOT NULL DEFAULT 0,
        mapping_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'applied',
        warnings TEXT NOT NULL DEFAULT '[]',
        blockers TEXT NOT NULL DEFAULT '[]',
        recovery_metadata TEXT NOT NULL DEFAULT '{}',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        applied_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_template_migration_records_user_course ON template_migration_records(user_id, course_id, applied_at);
      CREATE INDEX IF NOT EXISTS idx_template_migration_records_proposal ON template_migration_records(source_proposal_id);
      CREATE INDEX IF NOT EXISTS idx_template_migration_records_source ON template_migration_records(source_template_definition_id);

      CREATE TABLE IF NOT EXISTS template_migration_record_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        template_migration_record_id TEXT NOT NULL REFERENCES template_migration_records(id) ON DELETE CASCADE,
        note_block_id TEXT NOT NULL REFERENCES note_blocks(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'applied',
        before_block_type TEXT,
        after_block_type TEXT,
        before_metadata TEXT NOT NULL DEFAULT '{}',
        after_metadata TEXT NOT NULL DEFAULT '{}',
        before_content_json TEXT NOT NULL DEFAULT '{}',
        after_content_json TEXT NOT NULL DEFAULT '{}',
        warnings TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_template_migration_items_record ON template_migration_record_items(template_migration_record_id);
      CREATE INDEX IF NOT EXISTS idx_template_migration_items_block ON template_migration_record_items(note_block_id);
    `);
  },
};
