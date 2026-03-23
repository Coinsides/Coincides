/**
 * Migration 015: Fix missing columns in PostgreSQL schema
 * 
 * The initial PostgreSQL schema.sql was converted from an older SQLite state,
 * missing columns added by migrations 011-014. This adds them back.
 */
import pg from 'pg';

export default {
  id: '015_fix_missing_columns',
  description: 'Add missing columns: time_blocks (template_id, color, updated_at), task_cards (id, checklist_index), etc.',

  async up(client: pg.PoolClient): Promise<void> {
    // ── time_blocks: add template_id, color, updated_at ──
    await client.query(`ALTER TABLE time_blocks ADD COLUMN IF NOT EXISTS template_id TEXT`);
    await client.query(`ALTER TABLE time_blocks ADD COLUMN IF NOT EXISTS color TEXT`);
    await client.query(`ALTER TABLE time_blocks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

    // ── time_block_template_sets: add updated_at ──
    await client.query(`ALTER TABLE time_block_template_sets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

    // ── time_block_templates: rename set_id → template_set_id if needed, add color ──
    const hasSetId = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'time_block_templates' AND column_name = 'set_id'
    `);
    if (hasSetId.rows.length > 0) {
      await client.query(`ALTER TABLE time_block_templates RENAME COLUMN set_id TO template_set_id`);
    }
    await client.query(`ALTER TABLE time_block_templates ADD COLUMN IF NOT EXISTS color TEXT`);

    // ── task_cards: add id and checklist_index ──
    // Check if id column exists (it won't if created from old schema)
    const hasId = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'task_cards' AND column_name = 'id'
    `);

    if (hasId.rows.length === 0) {
      // Add id column
      await client.query(`ALTER TABLE task_cards ADD COLUMN id TEXT`);
      
      // Populate existing rows
      await client.query(`UPDATE task_cards SET id = gen_random_uuid()::text WHERE id IS NULL`);
      
      // Drop old composite PK
      const pkResult = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'task_cards' AND constraint_type = 'PRIMARY KEY'
      `);
      if (pkResult.rows.length > 0) {
        await client.query(`ALTER TABLE task_cards DROP CONSTRAINT ${pkResult.rows[0].constraint_name}`);
      }
      
      // Set id as new PK
      await client.query(`ALTER TABLE task_cards ALTER COLUMN id SET NOT NULL`);
      await client.query(`ALTER TABLE task_cards ADD PRIMARY KEY (id)`);
    }

    await client.query(`ALTER TABLE task_cards ADD COLUMN IF NOT EXISTS checklist_index INTEGER`);

    // Add indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_cards_task ON task_cards(task_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_cards_card ON task_cards(card_id)`);
  }
};
