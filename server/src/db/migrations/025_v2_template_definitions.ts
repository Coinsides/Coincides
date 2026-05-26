import type Database from 'better-sqlite3';

export default {
  id: '025_v2_template_definitions',
  description: 'Add v2 template definition runtime table',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS template_definitions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_key TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        origin TEXT NOT NULL DEFAULT 'system_seed',
        scope_type TEXT NOT NULL DEFAULT 'global',
        scope_id TEXT NOT NULL DEFAULT '',
        label TEXT NOT NULL,
        description TEXT,
        system_type TEXT NOT NULL,
        learning_role TEXT NOT NULL,
        legacy_block_type TEXT NOT NULL,
        field_schema TEXT NOT NULL DEFAULT '[]',
        default_content TEXT NOT NULL DEFAULT '{}',
        render_hints TEXT NOT NULL DEFAULT '{}',
        source_behavior TEXT NOT NULL DEFAULT '{}',
        relation_behavior TEXT NOT NULL DEFAULT '{}',
        proposal_behavior TEXT NOT NULL DEFAULT '{}',
        summary_for_agent TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        is_system INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, template_key, version, scope_type, scope_id)
      );
      CREATE INDEX IF NOT EXISTS idx_template_definitions_user_status ON template_definitions(user_id, status, template_key);
      CREATE INDEX IF NOT EXISTS idx_template_definitions_lookup ON template_definitions(user_id, template_key, version, scope_type, scope_id);
      CREATE INDEX IF NOT EXISTS idx_template_definitions_taxonomy ON template_definitions(user_id, system_type, learning_role, status);
    `);
  },
};
