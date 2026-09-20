import type { Migration } from '../migrate.js';

const migration: Migration = {
  id: '082_v14_agent_message_meta',
  description: 'Keep C2 selection anchors and reviewable intent plans on conversation messages',
  up(db) {
    db.exec("ALTER TABLE agent_messages ADD COLUMN meta TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(meta) AND json_type(meta) = 'object')");
  },
};
export default migration;
