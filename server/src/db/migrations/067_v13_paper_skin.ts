import type Database from 'better-sqlite3';

export default {
  id: '067_v13_paper_skin',
  description: 'Add an inheritable project paper skin; global and note skins use existing JSON storage',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(courses)') as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'skin')) {
      db.exec('ALTER TABLE courses ADD COLUMN skin TEXT');
    }
  },
};
