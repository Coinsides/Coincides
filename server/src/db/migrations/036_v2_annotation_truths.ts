import type Database from 'better-sqlite3';
import { normalizeAnnotationTruthsForNote } from '../../services/annotationTruths.js';

const NOTE_ANNOTATIONS_KEY = 'canvas_engine_annotations_v1';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stripDerivedAnchorMetadata(value: unknown): Record<string, unknown> {
  const metadata = isRecord(value) ? { ...value } : {};
  delete metadata.anchor_status;
  delete metadata.anchor_reason;
  return metadata;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS annotation_truths (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      canvas_id TEXT NOT NULL,
      raw_label TEXT NOT NULL,
      parent_annotation_id TEXT,
      child_annotation_ids_json TEXT NOT NULL DEFAULT '[]',
      visual_style_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT 'human',
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_annotation_truths_note
      ON annotation_truths(user_id, note_id, status);
    CREATE INDEX IF NOT EXISTS idx_annotation_truths_parent
      ON annotation_truths(user_id, parent_annotation_id);

    CREATE TABLE IF NOT EXISTS annotation_ranges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      annotation_id TEXT NOT NULL REFERENCES annotation_truths(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      target_kind TEXT NOT NULL,
      block_id TEXT,
      text_flow_id TEXT,
      text_unit_id TEXT,
      inline_structure_id TEXT,
      canvas_object_id TEXT,
      source_region_id TEXT,
      start_offset INTEGER,
      end_offset INTEGER,
      range_text_cache TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_annotation_ranges_annotation
      ON annotation_ranges(annotation_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_annotation_ranges_block
      ON annotation_ranges(user_id, note_id, block_id);
    CREATE INDEX IF NOT EXISTS idx_annotation_ranges_canvas_object
      ON annotation_ranges(user_id, note_id, canvas_object_id);
  `);
}

function normalizeTargetKind(value: unknown): string {
  if (
    value === 'text_unit'
    || value === 'text_span'
    || value === 'block'
    || value === 'inline_structure'
    || value === 'canvas_object'
    || value === 'source_region'
  ) {
    return value;
  }
  return 'text_span';
}

function normalizeStatus(value: unknown): string {
  if (value === 'hidden' || value === 'deleted') return value;
  return 'active';
}

function normalizeCreatedBy(value: unknown): string {
  if (value === 'ai_proposal' || value === 'importer') return value;
  return 'human';
}

function backfillAnnotationTruths(db: Database.Database): void {
  const notes = db.prepare(`
    SELECT id, user_id, course_id, metadata
    FROM notes
    WHERE metadata IS NOT NULL
  `).all() as Array<{ id: string; user_id: string; course_id: string; metadata: string | null }>;
  const legacyNotes = notes.flatMap((note) => {
    const metadata = parseJson<Record<string, unknown>>(note.metadata, {});
    const annotations = metadata[NOTE_ANNOTATIONS_KEY];
    if (!Array.isArray(annotations)) return [];
    return [{
      note,
      metadata,
      annotations: annotations.filter(isRecord),
    }];
  });
  const annotationOwners = new Map<string, string>();
  for (const legacyNote of legacyNotes) {
    for (const annotation of legacyNote.annotations) {
      const annotationId = optionalText(annotation.id);
      if (!annotationId) continue;
      const existingNoteId = annotationOwners.get(annotationId);
      if (existingNoteId) {
        throw new Error(
          `Duplicate legacy annotation id ${annotationId} found in notes ${existingNoteId} and ${legacyNote.note.id}`,
        );
      }
      annotationOwners.set(annotationId, legacyNote.note.id);
    }
  }

  const insertAnnotation = db.prepare(`
    INSERT INTO annotation_truths (
      id, user_id, course_id, note_id, canvas_id, raw_label, parent_annotation_id,
      child_annotation_ids_json, visual_style_json, created_by, status,
      metadata, created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @canvas_id, @raw_label, @parent_annotation_id,
      @child_annotation_ids_json, @visual_style_json, @created_by, @status,
      @metadata, @created_at, @updated_at
    )
  `);
  const insertRange = db.prepare(`
    INSERT INTO annotation_ranges (
      id, user_id, annotation_id, course_id, note_id, target_kind,
      block_id, text_flow_id, text_unit_id, inline_structure_id,
      canvas_object_id, source_region_id, start_offset, end_offset,
      range_text_cache, order_index, metadata, created_at, updated_at
    )
    VALUES (
      @id, @user_id, @annotation_id, @course_id, @note_id, @target_kind,
      @block_id, @text_flow_id, @text_unit_id, @inline_structure_id,
      @canvas_object_id, @source_region_id, @start_offset, @end_offset,
      @range_text_cache, @order_index, @metadata, datetime('now'), datetime('now')
    )
  `);
  const updateNoteMetadata = db.prepare('UPDATE notes SET metadata = ?, updated_at = datetime(\'now\') WHERE id = ?');

  for (const legacyNote of legacyNotes) {
    const note = legacyNote.note;
    const annotations = normalizeAnnotationTruthsForNote(legacyNote.annotations);
    annotations.forEach((annotation) => {
      if (!isRecord(annotation) || typeof annotation.id !== 'string') return;
      const annotationId = annotation.id;
      const now = new Date().toISOString();
      const ranges = Array.isArray(annotation.ranges) ? annotation.ranges : [];
      insertAnnotation.run({
        id: annotationId,
        user_id: note.user_id,
        course_id: note.course_id,
        note_id: note.id,
        canvas_id: cleanText(annotation.canvas_id, note.id),
        raw_label: cleanText(annotation.raw_label, 'Annotation'),
        parent_annotation_id: optionalText(annotation.parent_annotation_id),
        child_annotation_ids_json: stringifyJson(
          Array.isArray(annotation.child_annotation_ids) ? annotation.child_annotation_ids : [],
          [],
        ),
        visual_style_json: stringifyJson(annotation.visual_style, {}),
        created_by: normalizeCreatedBy(annotation.created_by),
        status: normalizeStatus(annotation.status),
        metadata: stringifyJson(annotation.metadata, {}),
        created_at: cleanText(annotation.created_at, now),
        updated_at: cleanText(annotation.updated_at, now),
      });

      ranges.forEach((range, index) => {
        if (!isRecord(range)) return;
        insertRange.run({
          id: cleanText(range.id, `${annotationId}:range:${index}`),
          user_id: note.user_id,
          annotation_id: annotationId,
          course_id: note.course_id,
          note_id: note.id,
          target_kind: normalizeTargetKind(range.target_kind),
          block_id: optionalText(range.block_id),
          text_flow_id: optionalText(range.text_flow_id),
          text_unit_id: optionalText(range.text_unit_id),
          inline_structure_id: optionalText(range.inline_structure_id),
          canvas_object_id: optionalText(range.canvas_object_id),
          source_region_id: optionalText(range.source_region_id),
          start_offset: typeof range.start_offset === 'number' ? Math.trunc(range.start_offset) : null,
          end_offset: typeof range.end_offset === 'number' ? Math.trunc(range.end_offset) : null,
          range_text_cache: optionalText(range.range_text_cache),
          order_index: index,
          metadata: stringifyJson(stripDerivedAnchorMetadata(range.metadata), {}),
        });
      });
    });
  }

  for (const legacyNote of legacyNotes) {
    const nextMetadata = { ...legacyNote.metadata };
    delete nextMetadata[NOTE_ANNOTATIONS_KEY];
    updateNoteMetadata.run(stringifyJson(nextMetadata, {}), legacyNote.note.id);
  }
}

export default {
  id: '036_v2_annotation_truths',
  description: 'Add durable AnnotationTruth and AnnotationRange tables',
  up(db: Database.Database): void {
    createTables(db);
    backfillAnnotationTruths(db);
  },
};
