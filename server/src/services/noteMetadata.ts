import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';

export function requireMetadataNote(db: Database.Database, userId: string, noteId: string): void {
  if (!db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId)) {
    throw new AppError(404, 'Note not found');
  }
}

// Item birth receipts and anchors are existing edges, not a cover-level cache.
// UNION collapses a birth receipt and multiple anchors reaching the same note.
const provenanceCte = `WITH
  paper_blocks AS (
    SELECT nb.* FROM note_blocks nb JOIN note_block_placements p ON p.block_id = nb.id
    WHERE p.note_id = @noteId AND nb.user_id = @userId AND nb.status = 'active'
  ),
  item_note_edges AS (
    SELECT i.id AS item_id, i.origin_note_id AS note_id FROM items i
    WHERE i.user_id = @userId AND i.origin_note_id IS NOT NULL
    UNION
    SELECT a.item_id, p.note_id FROM item_anchors a
    JOIN items i ON i.id = a.item_id AND i.user_id = @userId
    JOIN note_blocks nb ON nb.id = CASE WHEN a.target_kind = 'block' THEN a.target_id
      WHEN a.target_kind = 'content_range' AND json_valid(a.range_json) THEN json_extract(a.range_json, '$.block_id') END
      AND nb.user_id = @userId AND nb.status = 'active'
    JOIN note_block_placements p ON p.block_id = nb.id
    WHERE a.user_id = @userId
    UNION
    SELECT a.item_id, co.note_id FROM item_anchors a
    JOIN items i ON i.id = a.item_id AND i.user_id = @userId
    JOIN canvas_objects co ON co.id = COALESCE(
      CASE WHEN json_valid(a.range_json) THEN json_extract(a.range_json, '$.canvas_object_id') END, a.target_id)
      AND co.user_id = @userId AND co.status = 'active'
    WHERE a.user_id = @userId AND a.target_kind IN ('canvas_object', 'table_region', 'image_region')
  ),
  paper_items AS (SELECT item_id FROM item_note_edges WHERE note_id = @noteId),
  paper_group_items AS (
    SELECT DISTINCT cg.id AS group_id, i.item_id FROM content_groups cg
    JOIN content_group_members m ON m.content_group_id = cg.id AND m.user_id = @userId AND m.kind = 'item'
    JOIN paper_items i ON i.item_id = m.item_id
    WHERE cg.user_id = @userId AND cg.status = 'active'
  )`;

interface SourceRow {
  document_id: string | null;
  source_record_id: string | null;
  projection_note_id: string | null;
  title: string;
  course_id: string | null;
  block_id: string;
  reference_id: string;
}
interface ReferencedNote { note_id: string; title: string; course_id: string; count: number }
interface ReferencingBoard { board_id: string; title: string; count: number }
interface ReferencingGroup { content_group_id: string; note_id: string | null; course_id: string; title: string; count: number }

/** All cover relationships are derived on each read; this service performs no writes. */
export function getNoteMetadata(db: Database.Database, userId: string, noteId: string) {
  requireMetadataNote(db, userId, noteId);
  const params = { userId, noteId };
  const sourceRows = db.prepare(`${provenanceCte}
    SELECT d.id AS document_id, sr.id AS source_record_id, sm.projection_note_id,
      COALESCE(sr.display_name, d.filename) AS title,
      COALESCE(d.course_id, sr.origin_course_id) AS course_id,
      p.id AS block_id, s.id AS reference_id
    FROM paper_blocks p JOIN note_block_sources s ON s.block_id = p.id
    LEFT JOIN document_chunks dc ON dc.id = s.document_chunk_id
    LEFT JOIN documents d ON d.id = COALESCE(s.document_id, dc.document_id) AND d.user_id = @userId
    LEFT JOIN source_records sr ON sr.id = s.source_record_id AND sr.user_id = @userId
    LEFT JOIN source_materializations sm ON sm.source_record_id = sr.id AND sm.user_id = @userId
    WHERE sr.id IS NOT NULL OR d.id IS NOT NULL
    ORDER BY s.created_at, s.id`).all(params) as SourceRow[];
  // A receipt carrying both IDs is an existing identity bridge. Only use an
  // unambiguous bridge; matching filenames alone is never source identity.
  const documentSources = new Map<string, Map<string, SourceRow>>();
  for (const row of sourceRows) {
    if (!row.document_id || !row.source_record_id) continue;
    const matches = documentSources.get(row.document_id) ?? new Map<string, SourceRow>();
    matches.set(row.source_record_id, row);
    documentSources.set(row.document_id, matches);
  }
  const groupedSources = new Map<string, SourceRow & { count: number }>();
  for (const sourceRow of sourceRows) {
    const matches = sourceRow.document_id ? documentSources.get(sourceRow.document_id) : undefined;
    const bridge = !sourceRow.source_record_id && matches?.size === 1 ? [...matches.values()][0] : null;
    const row = bridge ? { ...bridge, block_id: sourceRow.block_id, reference_id: sourceRow.reference_id } : sourceRow;
    const key = row.source_record_id ? `source:${row.source_record_id}` : `document:${row.document_id}`;
    const existing = groupedSources.get(key);
    if (existing) existing.count += 1;
    else groupedSources.set(key, { ...row, count: 1 });
  }
  const sources = [...groupedSources.values()].sort((a, b) => a.title.localeCompare(b.title));
  const notes = db.prepare(`${provenanceCte}
    SELECT n.id AS note_id, n.title, n.course_id, COUNT(DISTINCT p.id) AS count
    FROM paper_blocks p
    JOIN item_note_edges e ON e.item_id = CASE WHEN p.block_type = 'item_ref' AND json_valid(p.content_json)
      THEN json_extract(p.content_json, '$.item_id') END
    JOIN notes n ON n.id = e.note_id AND n.user_id = @userId AND n.status = 'active'
    WHERE n.id != @noteId AND n.note_class != 'system'
    GROUP BY n.id ORDER BY n.title, n.id`).all(params) as ReferencedNote[];
  // A board card is counted once even when an Item has multiple matching anchors.
  // Staged cards and retained ranges still belong to the board until unmounted.
  const boards = db.prepare(`${provenanceCte}
    SELECT b.id AS board_id, b.title, COUNT(DISTINCT m.id) AS count
    FROM boards b JOIN board_members m ON m.board_id = b.id
    WHERE b.user_id = @userId AND (
      (m.member_kind = 'note' AND m.member_id = @noteId)
      OR (m.member_kind = 'text_range' AND EXISTS (
        SELECT 1 FROM board_text_ranges r WHERE r.id = m.member_id AND r.board_id = b.id
          AND r.user_id = @userId AND (r.note_id = @noteId OR r.block_id IN (SELECT id FROM paper_blocks))))
      OR (m.member_kind = 'item' AND m.member_id IN (SELECT item_id FROM paper_items))
      OR (m.member_kind = 'content_group' AND m.member_id IN (SELECT group_id FROM paper_group_items))
    ) GROUP BY b.id ORDER BY b.title, b.id`).all(params) as ReferencingBoard[];
  const contentGroups = db.prepare(`${provenanceCte}
    SELECT cg.id AS content_group_id, cg.note_id, cg.course_id, cg.title, COUNT(DISTINCT p.item_id) AS count
    FROM paper_group_items p JOIN content_groups cg ON cg.id = p.group_id
    GROUP BY cg.id ORDER BY cg.title, cg.id`).all(params) as ReferencingGroup[];
  return {
    upstream: { sources, notes, count: sources.length + notes.length },
    downstream: { boards, content_groups: contentGroups, count: boards.length + contentGroups.length },
  };
}
