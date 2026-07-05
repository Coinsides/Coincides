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

export async function loadAnnotationTruthsForNote(input: {
  note: Note;
  importLegacy?: boolean;
}): Promise<AnnotationTruthV1[]> {
  const response = await api.get<AnnotationTruthV1[]>(`/annotation-truths/by-note/${input.note.id}`);
  const entityAnnotations = normalizeAnnotations(Array.isArray(response.data) ? response.data : []);
  const legacyAnnotations = annotationTruthsFromMetadata(input.note.metadata);

  if (input.importLegacy !== false && entityAnnotations.length === 0 && legacyAnnotations.length > 0) {
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
