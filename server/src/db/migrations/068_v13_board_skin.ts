import type Database from 'better-sqlite3';

export default {
  id: '068_v13_board_skin',
  description: 'Add an inheritable board skin using the shared skin selection shape',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(boards)') as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'skin')) db.exec('ALTER TABLE boards ADD COLUMN skin TEXT');
  },
};
