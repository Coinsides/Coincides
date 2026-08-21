import api from '@/services/api';
import {
  normalizeAnnotationHierarchy,
} from './annotationEditorService';
import {
  NOTE_ANNOTATIONS_METADATA_KEY,
} from './contentGroupMetadataService';
import type {
  AnnotationTruthV1,
  Note,
} from './runtimeDataTypes';

export function stripLegacyAnnotationMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  const next = { ...(metadata || {}) };
  delete next[NOTE_ANNOTATIONS_METADATA_KEY];
  return next;
}

export function annotationTruthsFromMetadata(
  metadata: Record<string, unknown> | undefined,
): AnnotationTruthV1[] {
  const annotations = metadata?.[NOTE_ANNOTATIONS_METADATA_KEY];
  if (!Array.isArray(annotations)) return [];
  const parsed = annotations.filter((item): item is AnnotationTruthV1 => (
    Boolean(item)
    && typeof item === 'object'
    && typeof (item as AnnotationTruthV1).id === 'string'
    && typeof (item as AnnotationTruthV1).raw_label === 'string'
    && Array.isArray((item as AnnotationTruthV1).ranges)
  )).map((annotation) => ({
    ...annotation,
    parent_annotation_id: annotation.parent_annotation_id || null,
    child_annotation_ids: Array.isArray(annotation.child_annotation_ids)
      ? annotation.child_annotation_ids
      : [],
  }));
  return normalizeAnnotationHierarchy({ annotations: parsed }).annotations;
}

function normalizeAnnotations(annotations: AnnotationTruthV1[]): AnnotationTruthV1[] {
  return normalizeAnnotationHierarchy({ annotations }).annotations;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => [key, canonicalizeJson(entryValue)]),
  );
}

function annotationForDurableComparison(annotation: AnnotationTruthV1): AnnotationTruthV1 {
  return {
    ...annotation,
    metadata: annotation.metadata || {},
    ranges: annotation.ranges.map((range) => {
      const metadata = { ...(range.metadata || {}) };
      // These fields are computed on read from the current block state. They
      // are deliberately stripped before storage and are not part of the PUT
      // receipt we are trying to confirm after a client-observed failure.
      delete metadata.anchor_status;
      delete metadata.anchor_reason;
      return {
        ...range,
        metadata,
      };
    }),
  };
}

export function annotationTruthsDurablyEqual(
  left: AnnotationTruthV1[],
  right: AnnotationTruthV1[],
): boolean {
  const durableProjection = (annotations: AnnotationTruthV1[]) => annotations
    .map(annotationForDurableComparison)
    .sort((leftAnnotation, rightAnnotation) => leftAnnotation.id.localeCompare(rightAnnotation.id));
  return JSON.stringify(canonicalizeJson(durableProjection(left)))
    === JSON.stringify(canonicalizeJson(durableProjection(right)));
}

export async function loadAnnotationTruthsForNote(input: {
  note: Note;
  importLegacy?: boolean;
}): Promise<AnnotationTruthV1[]> {
  const response = await api.get<AnnotationTruthV1[]>(`/annotation-truths/by-note/${input.note.id}`);
  const entityAnnotations = normalizeAnnotations(Array.isArray(response.data) ? response.data : []);
  const legacyAnnotations = annotationTruthsFromMetadata(input.note.metadata);

  if (input.importLegacy === false) return entityAnnotations;

  if (entityAnnotations.length === 0 && legacyAnnotations.length > 0) {
    const saved = await saveAnnotationTruthsForNote({
      noteId: input.note.id,
      annotations: legacyAnnotations,
    });
    return saved;
  }

  return entityAnnotations.length > 0 ? entityAnnotations : legacyAnnotations;
}

export async function saveAnnotationTruthsForNote(input: {
  noteId: string;
  annotations: AnnotationTruthV1[];
}): Promise<AnnotationTruthV1[]> {
  const normalized = normalizeAnnotations(input.annotations);
  const response = await api.put<AnnotationTruthV1[]>(`/annotation-truths/by-note/${input.noteId}`, {
    annotations: normalized,
  });
  return normalizeAnnotations(Array.isArray(response.data) ? response.data : normalized);
}
