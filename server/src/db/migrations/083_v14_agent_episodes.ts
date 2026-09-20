import type { Migration } from '../migrate.js';

const migration: Migration = {
  id: '083_v14_agent_episodes',
  description: 'Add conversation episode projections and their summary FTS index without changing messages',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_episodes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id TEXT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL CHECK(seq > 0),
        summary_text TEXT NOT NULL,
        message_range TEXT NOT NULL CHECK(json_valid(message_range) AND json_type(message_range) = 'object'),
        anchor_manifest TEXT NOT NULL CHECK(json_valid(anchor_manifest) AND json_type(anchor_manifest) = 'object'),
        token_estimate INTEGER NOT NULL CHECK(token_estimate >= 0),
        created_at TEXT NOT NULL,
        UNIQUE(conversation_id, seq)
      );
      CREATE INDEX idx_agent_episodes_user_conversation ON agent_episodes(user_id, conversation_id, seq);
      CREATE UNIQUE INDEX idx_agent_episodes_message_range ON agent_episodes(
        conversation_id, json_extract(message_range, '$.first_message_id'), json_extract(message_range, '$.last_message_id')
      );
      CREATE VIRTUAL TABLE agent_episodes_fts USING fts5(
        summary_text, content='agent_episodes', content_rowid='rowid'
      );
      CREATE TRIGGER agent_episodes_ai AFTER INSERT ON agent_episodes BEGIN
        INSERT INTO agent_episodes_fts(rowid, summary_text) VALUES(new.rowid, new.summary_text);
      END;
      CREATE TRIGGER agent_episodes_ad AFTER DELETE ON agent_episodes BEGIN
        INSERT INTO agent_episodes_fts(agent_episodes_fts, rowid, summary_text) VALUES('delete', old.rowid, old.summary_text);
      END;
      CREATE TRIGGER agent_episodes_au AFTER UPDATE ON agent_episodes BEGIN
        INSERT INTO agent_episodes_fts(agent_episodes_fts, rowid, summary_text) VALUES('delete', old.rowid, old.summary_text);
        INSERT INTO agent_episodes_fts(rowid, summary_text) VALUES(new.rowid, new.summary_text);
      END;
    `);
  },
};

export default migration;
