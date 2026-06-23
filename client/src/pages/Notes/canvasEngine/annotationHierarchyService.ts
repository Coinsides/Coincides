import type { AnnotationTruthV1 } from './runtimeDataTypes';

function nowIso(): string {
  return new Date().toISOString();
}

function parentIdOf(annotation: AnnotationTruthV1): string | null {
  return annotation.parent_annotation_id || null;
}

function isVisibleStatus(annotation: AnnotationTruthV1, includeHidden = false): boolean {
  if (annotation.status === 'deleted') return false;
  if (!includeHidden && annotation.status === 'hidden') return false;
  return true;
}

function createsCycle(input: {
  annotationId: string;
  parentId: string | null;
  parentByChildId: Map<string, string | null>;
}): boolean {
  if (!input.parentId) return false;
  const visited = new Set<string>([input.annotationId]);
  let cursor: string | null = input.parentId;
  while (cursor) {
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    cursor = input.parentByChildId.get(cursor) || null;
  }
  return false;
}

export function isRootAnnotation(annotation: AnnotationTruthV1): boolean {
  return parentIdOf(annotation) === null;
}

export function getParentAnnotation(input: {
  annotation: AnnotationTruthV1;
  annotations: AnnotationTruthV1[];
  includeHidden?: boolean;
}): AnnotationTruthV1 | null {
  const parentId = parentIdOf(input.annotation);
  if (parentId) {
    const parent = input.annotations.find((annotation) => annotation.id === parentId) || null;
    if (parent && isVisibleStatus(parent, input.includeHidden)) return parent;
    return null;
  }

  const legacyParent = input.annotations.find((annotation) => (
    annotation.child_annotation_ids.includes(input.annotation.id)
    && isVisibleStatus(annotation, input.includeHidden)
  ));
  return legacyParent || null;
}

export function getChildAnnotations(input: {
  parent: AnnotationTruthV1;
  annotations: AnnotationTruthV1[];
  includeHidden?: boolean;
}): AnnotationTruthV1[] {
  const childById = new Map(input.annotations.map((annotation) => [annotation.id, annotation]));
  const childIds = new Set<string>(input.parent.child_annotation_ids);
  input.annotations.forEach((annotation) => {
    if (parentIdOf(annotation) === input.parent.id) childIds.add(annotation.id);
  });

  return Array.from(childIds).flatMap((id) => {
    const annotation = childById.get(id);
    if (!annotation) return [];
    if (annotation.id === input.parent.id) return [];
    if (!isVisibleStatus(annotation, input.includeHidden)) return [];
    if (parentIdOf(annotation) !== input.parent.id && !input.parent.child_annotation_ids.includes(annotation.id)) {
      return [];
    }
    return [annotation];
  });
}

export function resolveAnnotationRootId(input: {
  annotationId: string;
  annotations: AnnotationTruthV1[];
}): string | null {
  const annotationById = new Map(input.annotations.map((annotation) => [annotation.id, annotation]));
  if (!annotationById.has(input.annotationId)) return null;

  const visited = new Set<string>();
  let currentId = input.annotationId;
  while (!visited.has(currentId)) {
    visited.add(currentId);
    const current = annotationById.get(currentId);
    if (!current || current.status === 'deleted') return null;
    const explicitParentId = parentIdOf(current);
    if (explicitParentId) {
      const explicitParent = annotationById.get(explicitParentId);
      if (!explicitParent) return currentId;
      if (explicitParent.status === 'deleted') return explicitParent.id;
      currentId = explicitParent.id;
      continue;
    }
    const parent = getParentAnnotation({
      annotation: current,
      annotations: input.annotations,
      includeHidden: true,
    });
    if (!parent) return currentId;
    currentId = parent.id;
  }
  return currentId;
}

export function resolveAnnotationInspectorRootIds(input: {
  annotations: AnnotationTruthV1[];
  selectedAnnotationIds: string[];
}): string[] {
  const roots: string[] = [];
  const seen = new Set<string>();
  input.selectedAnnotationIds.forEach((annotationId) => {
    const rootId = resolveAnnotationRootId({
      annotationId,
      annotations: input.annotations,
    });
    if (!rootId || seen.has(rootId)) return;
    const root = input.annotations.find((annotation) => annotation.id === rootId);
    if (!root || root.status === 'deleted') return;
    seen.add(rootId);
    roots.push(rootId);
  });
  return roots;
}

export function normalizeAnnotationHierarchy(input: {
  annotations: AnnotationTruthV1[];
}): {
  annotations: AnnotationTruthV1[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const annotationIds = new Set(input.annotations.map((annotation) => annotation.id));
  const legacyParentByChildId = new Map<string, string>();

  input.annotations.forEach((parent) => {
    parent.child_annotation_ids.forEach((childId) => {
      if (!annotationIds.has(childId)) {
        warnings.push(`Missing child annotation ${childId} referenced by ${parent.id}.`);
        return;
      }
      if (!legacyParentByChildId.has(childId)) {
        legacyParentByChildId.set(childId, parent.id);
      }
    });
  });

  const parentByChildId = new Map<string, string | null>();
  input.annotations.forEach((annotation) => {
    const parentId = parentIdOf(annotation) || legacyParentByChildId.get(annotation.id) || null;
    parentByChildId.set(annotation.id, parentId);
  });

  input.annotations.forEach((annotation) => {
    const parentId = parentByChildId.get(annotation.id) || null;
    if (!parentId) return;
    if (!annotationIds.has(parentId)) {
      warnings.push(`Annotation ${annotation.id} has missing parent ${parentId}; parent cleared.`);
      parentByChildId.set(annotation.id, null);
      return;
    }
    if (parentId === annotation.id || createsCycle({ annotationId: annotation.id, parentId, parentByChildId })) {
      warnings.push(`Annotation ${annotation.id} has cyclic parent ${parentId}; parent cleared.`);
      parentByChildId.set(annotation.id, null);
    }
  });

  const childIdsByParentId = new Map<string, string[]>();
  input.annotations.forEach((annotation) => {
    const parentId = parentByChildId.get(annotation.id) || null;
    if (!parentId) return;
    childIdsByParentId.set(parentId, [
      ...(childIdsByParentId.get(parentId) || []),
      annotation.id,
    ]);
  });

  return {
    annotations: input.annotations.map((annotation) => {
      const parentAnnotationId = parentByChildId.get(annotation.id) || null;
      const nextChildIds = Array.from(new Set(childIdsByParentId.get(annotation.id) || []));
      const changed = parentAnnotationId !== parentIdOf(annotation)
        || nextChildIds.join('|') !== annotation.child_annotation_ids.join('|');
      return {
        ...annotation,
        parent_annotation_id: parentAnnotationId,
        child_annotation_ids: nextChildIds,
        updated_at: changed ? nowIso() : annotation.updated_at,
      };
    }),
    warnings,
  };
}

export function attachChildAnnotation(input: {
  parent: AnnotationTruthV1;
  child: AnnotationTruthV1;
}): {
  parent: AnnotationTruthV1;
  child: AnnotationTruthV1;
} {
  const timestamp = nowIso();
  const childIds = input.parent.child_annotation_ids.includes(input.child.id)
    ? input.parent.child_annotation_ids
    : [...input.parent.child_annotation_ids, input.child.id];
  return {
    parent: {
      ...input.parent,
      child_annotation_ids: childIds,
      updated_at: timestamp,
    },
    child: {
      ...input.child,
      parent_annotation_id: input.parent.id,
      updated_at: timestamp,
    },
  };
}

export function detachChildAnnotation(input: {
  parent: AnnotationTruthV1;
  child: AnnotationTruthV1;
}): {
  parent: AnnotationTruthV1;
  child: AnnotationTruthV1;
} {
  const timestamp = nowIso();
  return {
    parent: {
      ...input.parent,
      child_annotation_ids: input.parent.child_annotation_ids.filter((id) => id !== input.child.id),
      updated_at: timestamp,
    },
    child: {
      ...input.child,
      parent_annotation_id: null,
      updated_at: timestamp,
    },
  };
}

export function annotationVisibleInHierarchy(input: {
  annotation: AnnotationTruthV1;
  annotations: AnnotationTruthV1[];
  includeHidden?: boolean;
}): boolean {
  if (!isVisibleStatus(input.annotation, input.includeHidden)) return false;
  const rootId = resolveAnnotationRootId({
    annotationId: input.annotation.id,
    annotations: input.annotations,
  });
  if (!rootId) return false;
  const root = input.annotations.find((annotation) => annotation.id === rootId);
  return Boolean(root && isVisibleStatus(root, input.includeHidden));
}
