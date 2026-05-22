import type Database from 'better-sqlite3';

export default {
  id: '018_v2_reconciliation_safety',
  description: 'Add v2 material reconciliation exclusion, conflict, and recovery tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS excluded_material_scopes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        scope_type TEXT NOT NULL,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
        source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
        material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
        evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
        proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        group_id TEXT,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        source_decision_id TEXT REFERENCES material_reconciliation_decisions(id) ON DELETE SET NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_excluded_material_scopes_course_status ON excluded_material_scopes(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_excluded_material_scopes_source ON excluded_material_scopes(source_proposal_id, group_id);

      CREATE TABLE IF NOT EXISTS conflict_review_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        group_id TEXT,
        evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
        conflict_kind TEXT NOT NULL DEFAULT 'other',
        status TEXT NOT NULL DEFAULT 'open',
        title TEXT NOT NULL,
        summary TEXT,
        severity TEXT NOT NULL DEFAULT 'medium',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_conflict_review_items_course_status ON conflict_review_items(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_conflict_review_items_source ON conflict_review_items(proposal_id, group_id);

      CREATE TABLE IF NOT EXISTS reconciliation_recovery_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        previous_status TEXT,
        next_status TEXT,
        reason TEXT,
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reconciliation_recovery_events_course ON reconciliation_recovery_events(user_id, course_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_recovery_events_target ON reconciliation_recovery_events(target_type, target_id);
    `);
  },
};
