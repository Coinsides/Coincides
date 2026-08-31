import type Database from 'better-sqlite3';

function dropAndAssert(
  db: Database.Database,
  sql: string,
  tableName: string,
): void {
  db.exec(sql);
  const remaining = db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName);
  if (remaining) {
    throw new Error(`Migration 053 failed to drop ${tableName}`);
  }
}

export default {
  id: '053_v2_template_studio_decommission',
  description: 'Retire the legacy Template Studio table family',
  up(db: Database.Database): void {
    // 12.10-b / 裁 5: migration history stays immutable; retirement is forward-only.
    // See handoffs/2026-08-31-v12-10-b-template-studio-table-decommission.md.
    dropAndAssert(db, 'DROP TABLE IF EXISTS template_migration_record_items', 'template_migration_record_items');
    dropAndAssert(db, 'DROP TABLE IF EXISTS package_import_record_items', 'package_import_record_items');
    dropAndAssert(db, 'DROP TABLE IF EXISTS domain_refinement_record_items', 'domain_refinement_record_items');
    dropAndAssert(db, 'DROP TABLE IF EXISTS domain_object_classifications', 'domain_object_classifications');
    dropAndAssert(db, 'DROP TABLE IF EXISTS composition_instance_slots', 'composition_instance_slots');
    dropAndAssert(db, 'DROP TABLE IF EXISTS domain_block_set_templates', 'domain_block_set_templates');
    dropAndAssert(db, 'DROP TABLE IF EXISTS domain_block_set_compositions', 'domain_block_set_compositions');
    dropAndAssert(db, 'DROP TABLE IF EXISTS template_migration_records', 'template_migration_records');
    dropAndAssert(db, 'DROP TABLE IF EXISTS package_import_records', 'package_import_records');
    dropAndAssert(db, 'DROP TABLE IF EXISTS domain_refinement_records', 'domain_refinement_records');
    dropAndAssert(db, 'DROP TABLE IF EXISTS composition_instances', 'composition_instances');
    dropAndAssert(db, 'DROP TABLE IF EXISTS package_exports', 'package_exports');
    dropAndAssert(db, 'DROP TABLE IF EXISTS domain_refinement_mappings', 'domain_refinement_mappings');
    dropAndAssert(db, 'DROP TABLE IF EXISTS template_migration_mappings', 'template_migration_mappings');
    dropAndAssert(db, 'DROP TABLE IF EXISTS package_import_previews', 'package_import_previews');
    dropAndAssert(db, 'DROP TABLE IF EXISTS domain_block_sets', 'domain_block_sets');
    dropAndAssert(db, 'DROP TABLE IF EXISTS package_manifests', 'package_manifests');
    dropAndAssert(db, 'DROP TABLE IF EXISTS composition_templates', 'composition_templates');
  },
};
