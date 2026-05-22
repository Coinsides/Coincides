import type Database from 'better-sqlite3';

export default {
  id: '017_v2_reconciliation_evidence',
  description: 'Add v2 material reconciliation evidence set tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS evidence_sets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        evidence_kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        confidence REAL,
        source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        source_group_id TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_sets_user_course_status ON evidence_sets(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_evidence_sets_source_proposal ON evidence_sets(source_proposal_id, source_group_id);

      CREATE TABLE IF NOT EXISTS evidence_items (
        id TEXT PRIMARY KEY,
        evidence_set_id TEXT NOT NULL REFERENCES evidence_sets(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
        source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
        material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
        document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
        document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
        page_start INTEGER,
        page_end INTEGER,
        excerpt TEXT,
        reason TEXT,
        confidence REAL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_items_set ON evidence_items(evidence_set_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_items_course ON evidence_items(user_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_items_fragment ON evidence_items(source_fragment_id);

      CREATE TABLE IF NOT EXISTS material_reconciliation_decisions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        group_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(proposal_id, group_id)
      );
      CREATE INDEX IF NOT EXISTS idx_material_reconciliation_decisions_course ON material_reconciliation_decisions(user_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_material_reconciliation_decisions_proposal ON material_reconciliation_decisions(proposal_id);
    `);
  },
};
