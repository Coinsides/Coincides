import type Database from 'better-sqlite3';

export default {
  id: '026_v2_composition_templates',
  description: 'Add v2 composition template runtime tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS composition_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        composition_key TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        origin TEXT NOT NULL DEFAULT 'system_seed',
        scope_type TEXT NOT NULL DEFAULT 'global',
        scope_id TEXT NOT NULL DEFAULT '',
        label TEXT NOT NULL,
        description TEXT,
        composition_kind TEXT NOT NULL DEFAULT 'section',
        slot_schema TEXT NOT NULL DEFAULT '[]',
        layout_behavior TEXT NOT NULL DEFAULT '{}',
        source_behavior TEXT NOT NULL DEFAULT '{}',
        relation_blueprint TEXT NOT NULL DEFAULT '[]',
        proposal_behavior TEXT NOT NULL DEFAULT '{}',
        summary_for_agent TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        is_system INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, composition_key, version, scope_type, scope_id)
      );
      CREATE INDEX IF NOT EXISTS idx_composition_templates_user_status ON composition_templates(user_id, status, composition_key);
      CREATE INDEX IF NOT EXISTS idx_composition_templates_lookup ON composition_templates(user_id, composition_key, version, scope_type, scope_id);

      CREATE TABLE IF NOT EXISTS composition_instances (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        canvas_id TEXT REFERENCES learning_canvases(id) ON DELETE SET NULL,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        composition_template_id TEXT REFERENCES composition_templates(id) ON DELETE SET NULL,
        composition_key TEXT NOT NULL,
        composition_version TEXT NOT NULL DEFAULT '1.0.0',
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_composition_instances_course_status ON composition_instances(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_composition_instances_template ON composition_instances(composition_template_id);
      CREATE INDEX IF NOT EXISTS idx_composition_instances_canvas ON composition_instances(canvas_id);

      CREATE TABLE IF NOT EXISTS composition_instance_slots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        composition_instance_id TEXT NOT NULL REFERENCES composition_instances(id) ON DELETE CASCADE,
        slot_key TEXT NOT NULL,
        slot_index INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'filled',
        note_block_id TEXT REFERENCES note_blocks(id) ON DELETE SET NULL,
        canvas_node_id TEXT REFERENCES canvas_nodes(id) ON DELETE SET NULL,
        canvas_frame_id TEXT REFERENCES canvas_frames(id) ON DELETE SET NULL,
        title TEXT,
        warnings TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_composition_slots_instance ON composition_instance_slots(composition_instance_id, slot_index);
      CREATE INDEX IF NOT EXISTS idx_composition_slots_block ON composition_instance_slots(note_block_id);
      CREATE INDEX IF NOT EXISTS idx_composition_slots_node ON composition_instance_slots(canvas_node_id);
    `);
  },
};
