import type Database from 'better-sqlite3';

export default {
  id: '072_v14_skin_suite_material',
  description: 'Retain the factory material lineage of user appearance suites',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(skin_suites)') as Array<{ name: string }>;
    if (columns.some(({ name }) => name === 'material_preset')) return;
    // Existing 071 rows intentionally remain null: their missing lineage cannot be inferred from colors.
    db.exec(`ALTER TABLE skin_suites ADD COLUMN material_preset TEXT
      CHECK (material_preset IS NULL OR material_preset IN ('default', 'quiet-ink', 'warm-paper', 'workbench'))`);
  },
};
