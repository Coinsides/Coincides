import type Database from 'better-sqlite3';

const previousCheck = "CHECK (material_preset IS NULL OR material_preset IN ('default', 'quiet-ink', 'warm-paper', 'workbench'))";
const expandedCheck = "CHECK (material_preset IS NULL OR material_preset IN ('default', 'quiet-ink', 'warm-paper', 'workbench', 'silk'))";

export default {
  id: '080_v14_silk_skin_material',
  description: 'Allow the fifth factory material in existing appearance suites',
  up(db: Database.Database): void {
    const table = db.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'skin_suites'")
      .get() as { sql: string } | undefined;
    if (!table || table.sql.includes(expandedCheck)) return;
    if (!table.sql.includes(previousCheck)) throw new Error('Expected the existing skin suite material constraint');
    // SQLite cannot replace a CHECK in place. Preserve the existing declaration,
    // rows and schema objects; this temporary replacement adds no logical table.
    const replacement = table.sql.replace(/^CREATE TABLE (?:IF NOT EXISTS )?skin_suites\s*\(/i, 'CREATE TABLE skin_suites_next (')
      .replace(previousCheck, expandedCheck);
    if (replacement === table.sql || !replacement.startsWith('CREATE TABLE skin_suites_next (')) {
      throw new Error('Expected the existing skin suite table declaration');
    }
    const schemaObjects = db.prepare("SELECT sql FROM sqlite_schema WHERE tbl_name = 'skin_suites' AND type IN ('index', 'trigger') AND sql IS NOT NULL")
      .all() as Array<{ sql: string }>;
    db.transaction(() => {
      db.exec(replacement);
      db.exec(`INSERT INTO skin_suites_next (rowid, id, user_id, name, tokens_json, components_json, created_at, material_preset)
        SELECT rowid, id, user_id, name, tokens_json, components_json, created_at, material_preset FROM skin_suites;
        DROP TABLE skin_suites;
        ALTER TABLE skin_suites_next RENAME TO skin_suites;`);
      for (const object of schemaObjects) db.exec(object.sql);
    })();
  },
};
