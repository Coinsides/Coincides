import type Database from 'better-sqlite3';

export default {
  id: '077_v14_agent_message_turn_id',
  description: 'Register agent message turn ownership without inferring historical turns',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(agent_messages)') as Array<{ name: string }>;
    if (columns.some(({ name }) => name === 'turn_id')) return;
    // Old rows remain NULL: adjacent messages cannot establish run ownership.
    db.exec('ALTER TABLE agent_messages ADD COLUMN turn_id TEXT');
  },
};
