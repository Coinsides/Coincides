import type Database from 'better-sqlite3';

export default {
  id: '030_v2_domain_refinement_proposals',
  description: 'Add v2 domain refinement proposal governance tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS domain_refinement_mappings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_domain_block_set_id TEXT REFERENCES domain_block_sets(id) ON DELETE SET NULL,
        target_domain_block_set_id TEXT REFERENCES domain_block_sets(id) ON DELETE SET NULL,
        source_domain_key TEXT NOT NULL,
        source_domain_version TEXT NOT NULL DEFAULT '0.1.0',
        target_domain_key TEXT,
        target_domain_version TEXT,
        refinement_action TEXT NOT NULL,
        migration_mode TEXT NOT NULL,
        mapping_kind TEXT NOT NULL DEFAULT 'successor',
        status TEXT NOT NULL DEFAULT 'active',
        source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        source_record_id TEXT,
        reason TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_mappings_source
        ON domain_refinement_mappings(user_id, source_domain_key, source_domain_version, status);
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_mappings_target
        ON domain_refinement_mappings(user_id, target_domain_key, target_domain_version, status);
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_mappings_proposal
        ON domain_refinement_mappings(source_proposal_id);

      CREATE TABLE IF NOT EXISTS domain_refinement_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        source_domain_block_set_id TEXT REFERENCES domain_block_sets(id) ON DELETE SET NULL,
        target_domain_block_set_ids TEXT NOT NULL DEFAULT '[]',
        refinement_action TEXT NOT NULL,
        migration_mode TEXT NOT NULL,
        affected_domain_count INTEGER NOT NULL DEFAULT 0,
        affected_template_count INTEGER NOT NULL DEFAULT 0,
        affected_composition_count INTEGER NOT NULL DEFAULT 0,
        affected_note_block_count INTEGER NOT NULL DEFAULT 0,
        affected_package_count INTEGER NOT NULL DEFAULT 0,
        mapping_count INTEGER NOT NULL DEFAULT 0,
        classification_count INTEGER NOT NULL DEFAULT 0,
        source_snapshot TEXT NOT NULL DEFAULT '{}',
        target_snapshot TEXT NOT NULL DEFAULT '{}',
        recovery_metadata TEXT NOT NULL DEFAULT '{}',
        metadata TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'applied',
        applied_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_records_user_course
        ON domain_refinement_records(user_id, course_id, applied_at);
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_records_proposal
        ON domain_refinement_records(source_proposal_id);
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_records_source
        ON domain_refinement_records(source_domain_block_set_id);

      CREATE TABLE IF NOT EXISTS domain_refinement_record_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        domain_refinement_record_id TEXT NOT NULL REFERENCES domain_refinement_records(id) ON DELETE CASCADE,
        object_type TEXT NOT NULL,
        object_id TEXT,
        object_key TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'applied',
        before_snapshot TEXT NOT NULL DEFAULT '{}',
        after_snapshot TEXT NOT NULL DEFAULT '{}',
        warnings TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_items_record
        ON domain_refinement_record_items(domain_refinement_record_id);
      CREATE INDEX IF NOT EXISTS idx_domain_refinement_items_object
        ON domain_refinement_record_items(user_id, object_type, object_id);

      CREATE TABLE IF NOT EXISTS domain_object_classifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        domain_block_set_id TEXT REFERENCES domain_block_sets(id) ON DELETE SET NULL,
        domain_key TEXT NOT NULL,
        domain_version TEXT NOT NULL DEFAULT '0.1.0',
        classification_role TEXT NOT NULL DEFAULT 'current',
        status TEXT NOT NULL DEFAULT 'active',
        created_with_domain_block_set_id TEXT REFERENCES domain_block_sets(id) ON DELETE SET NULL,
        created_with_domain_key TEXT,
        created_with_domain_version TEXT,
        current_domain_block_set_id TEXT REFERENCES domain_block_sets(id) ON DELETE SET NULL,
        current_domain_key TEXT,
        current_domain_version TEXT,
        source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        source_record_id TEXT REFERENCES domain_refinement_records(id) ON DELETE SET NULL,
        confidence REAL,
        history TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_domain_object_classifications_target
        ON domain_object_classifications(user_id, target_type, target_id, status);
      CREATE INDEX IF NOT EXISTS idx_domain_object_classifications_domain
        ON domain_object_classifications(user_id, domain_key, domain_version, status);
      CREATE INDEX IF NOT EXISTS idx_domain_object_classifications_course
        ON domain_object_classifications(course_id, status);
    `);
  },
};
