import type Database from 'better-sqlite3';

export default {
  id: '063_v13_atomic_text_save_revision',
  description: 'Add an optimistic-concurrency revision for atomic note-block text saves',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(note_blocks)') as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'text_save_revision')) {
      db.exec(`ALTER TABLE note_blocks ADD COLUMN text_save_revision INTEGER NOT NULL DEFAULT 0
        CHECK (text_save_revision >= 0)`);
    }
  },
};
