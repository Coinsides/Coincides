import type Database from 'better-sqlite3';

export default {
  id: '029_v2_package_import_export',
  description: 'Add v2 package export and import preview/runtime records',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS package_exports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_manifest_id TEXT REFERENCES package_manifests(id) ON DELETE SET NULL,
        package_key TEXT NOT NULL,
        package_version TEXT NOT NULL DEFAULT '0.1.0',
        package_level TEXT NOT NULL DEFAULT 'light',
        source_inclusion TEXT NOT NULL DEFAULT 'omit',
        status TEXT NOT NULL DEFAULT 'exported',
        bundle_hash TEXT NOT NULL,
        bundle_json TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '{}',
        warnings TEXT NOT NULL DEFAULT '[]',
        blockers TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        exported_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_package_exports_user_status ON package_exports(user_id, status, created_at);
      CREATE INDEX IF NOT EXISTS idx_package_exports_manifest ON package_exports(package_manifest_id, created_at);

      CREATE TABLE IF NOT EXISTS package_import_previews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_key TEXT NOT NULL,
        package_version TEXT NOT NULL DEFAULT '0.1.0',
        package_level TEXT NOT NULL DEFAULT 'light',
        source_inclusion TEXT NOT NULL DEFAULT 'omit',
        status TEXT NOT NULL DEFAULT 'preview',
        bundle_hash TEXT NOT NULL,
        bundle_json TEXT NOT NULL,
        validation_status TEXT NOT NULL DEFAULT 'valid',
        conflict_report TEXT NOT NULL DEFAULT '{}',
        recovery_report TEXT NOT NULL DEFAULT '{}',
        summary TEXT NOT NULL DEFAULT '{}',
        warnings TEXT NOT NULL DEFAULT '[]',
        blockers TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        discarded_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_package_import_previews_user_status ON package_import_previews(user_id, status, created_at);
      CREATE INDEX IF NOT EXISTS idx_package_import_previews_key ON package_import_previews(user_id, package_key, package_version);

      CREATE TABLE IF NOT EXISTS package_import_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_preview_id TEXT NOT NULL REFERENCES package_import_previews(id) ON DELETE CASCADE,
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        package_key TEXT NOT NULL,
        package_version TEXT NOT NULL DEFAULT '0.1.0',
        package_level TEXT NOT NULL DEFAULT 'light',
        imported_count INTEGER NOT NULL DEFAULT 0,
        resolved_existing_count INTEGER NOT NULL DEFAULT 0,
        skipped_count INTEGER NOT NULL DEFAULT 0,
        blocked_count INTEGER NOT NULL DEFAULT 0,
        recovery_status TEXT NOT NULL DEFAULT 'complete',
        status TEXT NOT NULL DEFAULT 'applied',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        applied_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_package_import_records_user_status ON package_import_records(user_id, status, applied_at);
      CREATE INDEX IF NOT EXISTS idx_package_import_records_preview ON package_import_records(source_preview_id);

      CREATE TABLE IF NOT EXISTS package_import_record_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_import_record_id TEXT NOT NULL REFERENCES package_import_records(id) ON DELETE CASCADE,
        object_type TEXT NOT NULL,
        object_key TEXT NOT NULL,
        object_version TEXT NOT NULL DEFAULT '',
        target_id TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'applied',
        warnings TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_package_import_items_record ON package_import_record_items(package_import_record_id);
      CREATE INDEX IF NOT EXISTS idx_package_import_items_object ON package_import_record_items(user_id, object_type, object_key, object_version);
    `);
  },
};
