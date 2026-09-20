import type Database from 'better-sqlite3';

export default {
  id: '079_v14_note_binding',
  description: 'Add nullable note-owned binding settings without backfilling existing notes',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(notes)') as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'binding_settings_json')) {
      db.exec('ALTER TABLE notes ADD COLUMN binding_settings_json TEXT DEFAULT NULL');
    }
  },
};
