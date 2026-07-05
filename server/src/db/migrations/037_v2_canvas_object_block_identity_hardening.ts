import type Database from 'better-sqlite3';

function blockProjectionObjectId(noteId: string, placementId: string): string {
  return `canvas-object:${noteId}:block-placement:${placementId}`;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

export default {
  id: '037_v2_canvas_object_block_identity_hardening',
  description: 'Repair block-backed CanvasObject identity to be per placement',
  up(db: Database.Database): void {
    const rows = db.prepare(`
      SELECT
        cp.id AS placement_id,
        cp.user_id,
        cp.course_id,
        cp.note_id,
        cp.canvas_id,
        cp.object_id AS old_object_id,
        co.source_json,
        co.metadata AS object_metadata,
        cm.id AS mount_id,
        cm.target_id AS block_id
      FROM canvas_placements cp
      JOIN canvas_objects co ON co.id = cp.object_id
      LEFT JOIN content_mounts cm
        ON cm.id = 'content-mount:' || cp.id
        AND cm.target_kind = 'note_block'
      WHERE co.kind = 'paragraph_block_projection'
    `).all() as Array<{
      placement_id: string;
      user_id: string;
      course_id: string;
      note_id: string;
      canvas_id: string;
      old_object_id: string;
      source_json: string | null;
      object_metadata: string | null;
      mount_id: string | null;
      block_id: string | null;
    }>;

    const insertObject = db.prepare(`
      INSERT INTO canvas_objects (
        id, user_id, course_id, note_id, canvas_id, kind, backing, object_class,
        status, source_json, metadata, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @course_id, @note_id, @canvas_id, 'paragraph_block_projection',
        'note_block', 'block_backed', 'active', @source_json, @metadata,
        datetime('now'), datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        note_id = excluded.note_id,
        canvas_id = excluded.canvas_id,
        status = excluded.status,
        source_json = excluded.source_json,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `);
    const updatePlacement = db.prepare(`
      UPDATE canvas_placements
      SET object_id = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ? AND note_id = ?
    `);
    const updateMount = db.prepare(`
      UPDATE content_mounts
      SET object_id = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ? AND note_id = ?
    `);
    const deleteOrphanObjects = db.prepare(`
      DELETE FROM canvas_objects
      WHERE kind = 'paragraph_block_projection'
        AND id NOT IN (SELECT object_id FROM canvas_placements)
        AND id NOT IN (SELECT object_id FROM content_mounts)
    `);

    for (const row of rows) {
      const nextObjectId = blockProjectionObjectId(row.note_id, row.placement_id);
      const metadata = {
        ...parseJson<Record<string, unknown>>(row.object_metadata, {}),
        block_id: row.block_id || undefined,
        placement_id: row.placement_id,
        repaired_from_object_id: row.old_object_id === nextObjectId ? undefined : row.old_object_id,
      };
      insertObject.run({
        id: nextObjectId,
        user_id: row.user_id,
        course_id: row.course_id,
        note_id: row.note_id,
        canvas_id: row.canvas_id,
        source_json: row.source_json || stringifyJson({ source: 'block_identity_hardening' }, {}),
        metadata: stringifyJson(metadata, {}),
      });
      updatePlacement.run(nextObjectId, row.placement_id, row.user_id, row.note_id);
      if (row.mount_id) {
        updateMount.run(nextObjectId, row.mount_id, row.user_id, row.note_id);
      }
    }

    deleteOrphanObjects.run();
  },
};
