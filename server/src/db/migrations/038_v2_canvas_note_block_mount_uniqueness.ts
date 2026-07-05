import type Database from 'better-sqlite3';

export default {
  id: '038_v2_canvas_note_block_mount_uniqueness',
  description: 'Enforce one note_block content mount per CanvasObject',
  up(db: Database.Database): void {
    db.exec(`
      DELETE FROM content_mounts
      WHERE target_kind = 'note_block'
        AND id NOT IN (
          SELECT MIN(id)
          FROM content_mounts
          WHERE target_kind = 'note_block'
          GROUP BY object_id, target_kind
        );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_content_mounts_one_note_block_per_object
        ON content_mounts(object_id, target_kind)
        WHERE target_kind = 'note_block';
    `);
  },
};
