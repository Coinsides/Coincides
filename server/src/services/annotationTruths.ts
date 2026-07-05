import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';

interface OwnedNote {
  id: string;
  course_id: string;
}

interface AnnotationTruthRow {
  id: string;
  course_id: string;
  note_id: string;
  canvas_id: string;
  raw_label: string;
  parent_annotation_id: string | null;
  child_annotation_ids_json: string | null;
  visual_style_json: string | null;
  created_by: string;
  status: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

interface AnnotationRangeRow {
  id: string;
  annotation_id: string;
  target_kind: string;
  block_id: string | null;
  text_flow_id: string | null;
  text_unit_id: string | null;
  inline_structure_id: string | null;
  canvas_object_id: string | null;
  source_region_id: string | null;
  start_offset: number | null;
  end_offset: number | null;
  range_text_cache: string | null;
  order_index: number;
  metadata: string | null;
}

interface AnnotationBlockStateRow {
  id: string;
  status: string | null;
  plain_text: string | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stripDerivedAnchorMetadata(value: unknown): Record<string, unknown> {
  const metadata = isRecord(value) ? { ...value } : {};
  delete metadata.anchor_status;
  delete metadata.anchor_reason;
  return metadata;
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

function createsAnnotationCycle(
  parentByChildId: Map<string, string | null>,
  childId: string,
  parentId: string,
): boolean {
  const seen = new Set<string>([childId]);
  let cursor: string | null = parentId;
  while (cursor) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = parentByChildId.get(cursor) ?? null;
  }
  return false;
}

function normalizedAnnotationId(annotation: Record<string, unknown>, index: number): string {
  return cleanText(annotation.id, `annotation-${index + 1}`);
}

function normalizeRangeTarget(
  annotationId: string,
  range: Record<string, unknown>,
  rangeIndex: number,
): Record<string, unknown> {
  const targetKind = normalizeTargetKind(range.target_kind);
  const blockId = optionalText(range.block_id);
  const inlineStructureId = optionalText(range.inline_structure_id);
  const canvasObjectId = optionalText(range.canvas_object_id);
  const sourceRegionId = optionalText(range.source_region_id);
  const prefix = `Annotation range ${annotationId}:${rangeIndex}`;

  if (
    (targetKind === 'text_span' || targetKind === 'text_unit' || targetKind === 'block')
    && !blockId
  ) {
    throw new Error(`${prefix} target_kind ${targetKind} requires block_id`);
  }
  if (targetKind === 'inline_structure' && !inlineStructureId) {
    throw new Error(`${prefix} target_kind inline_structure requires inline_structure_id`);
  }
  if (targetKind === 'canvas_object' && !canvasObjectId) {
    throw new Error(`${prefix} target_kind canvas_object requires canvas_object_id`);
  }
  if (targetKind === 'source_region' && !sourceRegionId) {
    throw new Error(`${prefix} target_kind source_region requires source_region_id`);
  }

  return {
    ...range,
    target_kind: targetKind,
    ...(blockId ? { block_id: blockId } : {}),
    ...(inlineStructureId ? { inline_structure_id: inlineStructureId } : {}),
    ...(canvasObjectId ? { canvas_object_id: canvasObjectId } : {}),
    ...(sourceRegionId ? { source_region_id: sourceRegionId } : {}),
  };
}

export function normalizeAnnotationTruthsForNote(
  annotations: Record<string, unknown>[],
): Record<string, unknown>[] {
  const entries = annotations
    .filter(isRecord)
    .map((annotation, index) => ({
      raw: annotation,
      id: normalizedAnnotationId(annotation, index),
      index,
    }));
  const annotationIds = new Set<string>();
  for (const entry of entries) {
    if (annotationIds.has(entry.id)) {
      throw new Error(`Duplicate annotation id ${entry.id} in note annotation payload`);
    }
    annotationIds.add(entry.id);
  }

  const legacyParentByChildId = new Map<string, string>();
  for (const entry of entries) {
    const children = Array.isArray(entry.raw.child_annotation_ids)
      ? entry.raw.child_annotation_ids
      : [];
    for (const rawChildId of children) {
      const childId = optionalText(rawChildId);
      if (!childId || childId === entry.id || !annotationIds.has(childId)) continue;
      if (!legacyParentByChildId.has(childId)) {
        legacyParentByChildId.set(childId, entry.id);
      }
    }
  }

  const parentByChildId = new Map<string, string | null>();
  for (const entry of entries) {
    parentByChildId.set(
      entry.id,
      optionalText(entry.raw.parent_annotation_id) ?? legacyParentByChildId.get(entry.id) ?? null,
    );
  }

  for (const entry of entries) {
    const parentId = parentByChildId.get(entry.id);
    if (
      !parentId
      || !annotationIds.has(parentId)
      || parentId === entry.id
      || createsAnnotationCycle(parentByChildId, entry.id, parentId)
    ) {
      parentByChildId.set(entry.id, null);
    }
  }

  const childIdsByParentId = new Map<string, string[]>();
  for (const entry of entries) {
    const parentId = parentByChildId.get(entry.id);
    if (!parentId) continue;
    const childIds = childIdsByParentId.get(parentId) ?? [];
    childIds.push(entry.id);
    childIdsByParentId.set(parentId, childIds);
  }

  return entries.map((entry) => {
    const ranges = Array.isArray(entry.raw.ranges)
      ? entry.raw.ranges.filter(isRecord).map((range, rangeIndex) => (
        normalizeRangeTarget(entry.id, range, rangeIndex)
      ))
      : [];
    return {
      ...entry.raw,
      id: entry.id,
      parent_annotation_id: parentByChildId.get(entry.id) ?? null,
      child_annotation_ids: childIdsByParentId.get(entry.id) ?? [],
      ranges,
    };
  });
}

function getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNote {
  const note = db.prepare('SELECT id, course_id FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as OwnedNote | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

function deriveRangeMetadata(
  range: AnnotationRangeRow,
  blockStatesById?: Map<string, AnnotationBlockStateRow>,
): Record<string, unknown> {
  const metadata = stripDerivedAnchorMetadata(parseJson<unknown>(range.metadata, {}));
  const targetKind = normalizeTargetKind(range.target_kind);
  if (!range.block_id) return metadata;

  const blockState = blockStatesById?.get(range.block_id);
  if (!blockState || blockState.status !== 'active') {
    return {
      ...metadata,
      anchor_status: 'pending',
      anchor_reason: 'block_not_active',
    };
  }

  if (
    targetKind === 'text_span'
    && typeof range.start_offset === 'number'
    && typeof range.end_offset === 'number'
  ) {
    const textLength = blockState.plain_text?.length ?? 0;
    if (
      range.start_offset < 0
      || range.end_offset < range.start_offset
      || range.end_offset > textLength
    ) {
      return {
        ...metadata,
        anchor_status: 'pending',
        anchor_reason: 'offset_out_of_bounds',
      };
    }
  }

  return metadata;
}

function hydrateAnnotationTruth(
  row: AnnotationTruthRow,
  ranges: AnnotationRangeRow[],
  blockStatesById?: Map<string, AnnotationBlockStateRow>,
) {
  return {
    id: row.id,
    note_id: row.note_id,
    canvas_id: row.canvas_id,
    raw_label: row.raw_label,
    ranges: ranges.map((range) => ({
      id: range.id,
      target_kind: normalizeTargetKind(range.target_kind),
      ...(range.block_id ? { block_id: range.block_id } : {}),
      ...(range.text_flow_id ? { text_flow_id: range.text_flow_id } : {}),
      ...(range.text_unit_id ? { text_unit_id: range.text_unit_id } : {}),
      ...(range.inline_structure_id ? { inline_structure_id: range.inline_structure_id } : {}),
      ...(range.canvas_object_id ? { canvas_object_id: range.canvas_object_id } : {}),
      ...(range.source_region_id ? { source_region_id: range.source_region_id } : {}),
      ...(typeof range.start_offset === 'number' ? { start_offset: range.start_offset } : {}),
      ...(typeof range.end_offset === 'number' ? { end_offset: range.end_offset } : {}),
      ...(range.range_text_cache ? { range_text_cache: range.range_text_cache } : {}),
      metadata: deriveRangeMetadata(range, blockStatesById),
    })),
    parent_annotation_id: row.parent_annotation_id || null,
    child_annotation_ids: parseJson<string[]>(row.child_annotation_ids_json, []),
    visual_style: parseJson<Record<string, unknown>>(row.visual_style_json, {
      color_token: 'blue',
      marker_kind: 'highlight',
    }),
    created_by: normalizeCreatedBy(row.created_by),
    status: normalizeStatus(row.status),
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

export function listAnnotationTruths(
  db: Database.Database,
  userId: string,
  noteId: string,
) {
  getOwnedNote(db, userId, noteId);
  const annotations = db.prepare(`
    SELECT *
    FROM annotation_truths
    WHERE user_id = ? AND note_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(userId, noteId) as AnnotationTruthRow[];
  if (annotations.length === 0) return [];

  const ranges = db.prepare(`
    SELECT *
    FROM annotation_ranges
    WHERE user_id = ? AND note_id = ?
    ORDER BY order_index ASC, created_at ASC, id ASC
  `).all(userId, noteId) as AnnotationRangeRow[];
  const blockIds = Array.from(new Set(ranges
    .map((range) => range.block_id)
    .filter((blockId): blockId is string => Boolean(blockId))));
  const blockStates = new Map<string, AnnotationBlockStateRow>();
  if (blockIds.length > 0) {
    const placeholders = blockIds.map(() => '?').join(', ');
    const rows = db.prepare(`
      SELECT id, status, plain_text
      FROM note_blocks
      WHERE user_id = ? AND id IN (${placeholders})
    `).all(userId, ...blockIds) as AnnotationBlockStateRow[];
    for (const row of rows) {
      blockStates.set(row.id, row);
    }
  }
  const rangesByAnnotation = new Map<string, AnnotationRangeRow[]>();
  for (const range of ranges) {
    const group = rangesByAnnotation.get(range.annotation_id) ?? [];
    group.push(range);
    rangesByAnnotation.set(range.annotation_id, group);
  }

  return annotations.map((annotation) => hydrateAnnotationTruth(
    annotation,
    rangesByAnnotation.get(annotation.id) ?? [],
    blockStates,
  ));
}

export function replaceNoteAnnotationTruths(
  db: Database.Database,
  userId: string,
  noteId: string,
  annotations: Record<string, unknown>[],
) {
  const note = getOwnedNote(db, userId, noteId);
  const now = new Date().toISOString();
  let normalizedAnnotations: Record<string, unknown>[];
  try {
    normalizedAnnotations = normalizeAnnotationTruthsForNote(annotations);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid AnnotationTruth payload';
    throw new AppError(400, message);
  }

  return db.transaction(() => {
    db.prepare('DELETE FROM annotation_truths WHERE user_id = ? AND note_id = ?')
      .run(userId, note.id);

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

    normalizedAnnotations.forEach((annotation, annotationIndex) => {
      if (!isRecord(annotation)) return;
      const annotationId = cleanText(annotation.id, `annotation-${annotationIndex + 1}`);
      const ranges = Array.isArray(annotation.ranges) ? annotation.ranges.filter(isRecord) : [];
      insertAnnotation.run({
        id: annotationId,
        user_id: userId,
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

      ranges.forEach((range, rangeIndex) => {
        insertRange.run({
          id: cleanText(range.id, `${annotationId}:range:${rangeIndex}`),
          user_id: userId,
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
          order_index: rangeIndex,
          metadata: stringifyJson(stripDerivedAnchorMetadata(range.metadata), {}),
        });
      });
    });

    db.prepare('UPDATE notes SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
      .run(note.id, userId);

    return listAnnotationTruths(db, userId, note.id);
  })();
}
