import type Database from 'better-sqlite3';

export default {
  id: '027_v2_domain_packages',
  description: 'Add v2 domain block set and package manifest runtime tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS package_manifests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_key TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '0.1.0',
        manifest_version TEXT NOT NULL DEFAULT 'v2.5.3',
        package_kind TEXT NOT NULL DEFAULT 'domain_block_set',
        origin TEXT NOT NULL DEFAULT 'system_seed',
        scope_type TEXT NOT NULL DEFAULT 'global',
        scope_id TEXT NOT NULL DEFAULT '',
        package_name TEXT NOT NULL,
        description TEXT,
        author TEXT NOT NULL DEFAULT '{}',
        compatibility TEXT NOT NULL DEFAULT '{}',
        contents TEXT NOT NULL DEFAULT '{}',
        trust TEXT NOT NULL DEFAULT '{}',
        license TEXT NOT NULL DEFAULT '{}',
        import_policy TEXT NOT NULL DEFAULT '{}',
        export_policy TEXT NOT NULL DEFAULT '{}',
        graph_migration_hints TEXT NOT NULL DEFAULT '{}',
        validation_status TEXT NOT NULL DEFAULT 'valid',
        status TEXT NOT NULL DEFAULT 'active',
        is_system INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, package_key, version, scope_type, scope_id)
      );
      CREATE INDEX IF NOT EXISTS idx_package_manifests_user_status ON package_manifests(user_id, status, package_key);
      CREATE INDEX IF NOT EXISTS idx_package_manifests_lookup ON package_manifests(user_id, package_key, version, scope_type, scope_id);

      CREATE TABLE IF NOT EXISTS domain_block_sets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_manifest_id TEXT REFERENCES package_manifests(id) ON DELETE SET NULL,
        domain_key TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '0.1.0',
        origin TEXT NOT NULL DEFAULT 'system_seed',
        scope_type TEXT NOT NULL DEFAULT 'global',
        scope_id TEXT NOT NULL DEFAULT '',
        label TEXT NOT NULL,
        description TEXT,
        domain_kind TEXT NOT NULL DEFAULT 'learning',
        aliases TEXT NOT NULL DEFAULT '[]',
        facets TEXT NOT NULL DEFAULT '{}',
        source_behavior TEXT NOT NULL DEFAULT '{}',
        relation_behavior TEXT NOT NULL DEFAULT '{}',
        proposal_behavior TEXT NOT NULL DEFAULT '{}',
        summary_for_agent TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        is_system INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, domain_key, version, scope_type, scope_id)
      );
      CREATE INDEX IF NOT EXISTS idx_domain_block_sets_user_status ON domain_block_sets(user_id, status, domain_key);
      CREATE INDEX IF NOT EXISTS idx_domain_block_sets_package ON domain_block_sets(package_manifest_id, status);
      CREATE INDEX IF NOT EXISTS idx_domain_block_sets_lookup ON domain_block_sets(user_id, domain_key, version, scope_type, scope_id);

      CREATE TABLE IF NOT EXISTS domain_block_set_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        domain_block_set_id TEXT NOT NULL REFERENCES domain_block_sets(id) ON DELETE CASCADE,
        template_definition_id TEXT REFERENCES template_definitions(id) ON DELETE SET NULL,
        template_key TEXT NOT NULL,
        template_version TEXT NOT NULL DEFAULT '1.0.0',
        member_role TEXT NOT NULL DEFAULT 'member',
        required INTEGER NOT NULL DEFAULT 1,
        order_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(domain_block_set_id, template_key, template_version, member_role)
      );
      CREATE INDEX IF NOT EXISTS idx_domain_set_templates_set ON domain_block_set_templates(domain_block_set_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_domain_set_templates_template ON domain_block_set_templates(template_definition_id);

      CREATE TABLE IF NOT EXISTS domain_block_set_compositions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        domain_block_set_id TEXT NOT NULL REFERENCES domain_block_sets(id) ON DELETE CASCADE,
        composition_template_id TEXT REFERENCES composition_templates(id) ON DELETE SET NULL,
        composition_key TEXT NOT NULL,
        composition_version TEXT NOT NULL DEFAULT '1.0.0',
        member_role TEXT NOT NULL DEFAULT 'member',
        required INTEGER NOT NULL DEFAULT 1,
        order_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(domain_block_set_id, composition_key, composition_version, member_role)
      );
      CREATE INDEX IF NOT EXISTS idx_domain_set_compositions_set ON domain_block_set_compositions(domain_block_set_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_domain_set_compositions_composition ON domain_block_set_compositions(composition_template_id);
    `);
  },
};
