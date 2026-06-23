import {
  annotationVisibleInHierarchy,
} from './annotationHierarchyService';
import type {
  AnnotationTruthV1,
} from './runtimeDataTypes';

export interface AnnotationDisplayStateV1 {
  labelsVisible: boolean;
}

export interface AnnotationBadgeClusterV1 {
  anchor_kind: 'text_unit' | 'block';
  block_id: string;
  text_unit_id?: string;
  annotation_ids: string[];
  labels: string[];
  primary_label: string;
  extra_count: number;
  selected: boolean;
}

export const DEFAULT_ANNOTATION_DISPLAY_STATE: AnnotationDisplayStateV1 = {
  labelsVisible: true,
};

export function visibleAnnotationsForDisplay(input: {
  annotations: AnnotationTruthV1[];
  displayState?: AnnotationDisplayStateV1;
}): AnnotationTruthV1[] {
  const displayState = input.displayState || DEFAULT_ANNOTATION_DISPLAY_STATE;
  if (!displayState.labelsVisible) return [];
  return input.annotations.filter((annotation) => annotationVisibleInHierarchy({
    annotation,
    annotations: input.annotations,
  }));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function selectedFirst(input: {
  annotations: AnnotationTruthV1[];
  selectedAnnotationIds: string[];
}): AnnotationTruthV1[] {
  const selected = new Set(input.selectedAnnotationIds);
  return [...input.annotations].sort((a, b) => {
    const aSelected = selected.has(a.id) ? 1 : 0;
    const bSelected = selected.has(b.id) ? 1 : 0;
    if (aSelected !== bSelected) return bSelected - aSelected;
    return input.annotations.indexOf(a) - input.annotations.indexOf(b);
  });
}

function isChildAnnotation(annotation: AnnotationTruthV1, annotations: AnnotationTruthV1[]): boolean {
  if (annotation.parent_annotation_id) return true;
  return annotations.some((candidate) => candidate.child_annotation_ids.includes(annotation.id));
}

function clusterFromAnnotations(input: {
  anchorKind: 'text_unit' | 'block';
  blockId: string;
  textUnitId?: string;
  annotations: AnnotationTruthV1[];
  selectedAnnotationIds: string[];
}): AnnotationBadgeClusterV1 | null {
  if (input.annotations.length === 0) return null;
  const ordered = selectedFirst({
    annotations: input.annotations,
    selectedAnnotationIds: input.selectedAnnotationIds,
  });
  const selected = ordered.some((annotation) => input.selectedAnnotationIds.includes(annotation.id));
  return {
    anchor_kind: input.anchorKind,
    block_id: input.blockId,
    text_unit_id: input.textUnitId,
    annotation_ids: ordered.map((annotation) => annotation.id),
    labels: unique(ordered.map((annotation) => annotation.raw_label)),
    primary_label: ordered[0]?.raw_label || 'annotation',
    extra_count: Math.max(0, ordered.length - 1),
    selected,
  };
}

export function buildTextUnitAnnotationCluster(input: {
  annotations: AnnotationTruthV1[];
  displayState?: AnnotationDisplayStateV1;
  blockId: string;
  textUnitId: string;
  selectedAnnotationIds?: string[];
}): AnnotationBadgeClusterV1 | null {
  const visibleAnnotations = visibleAnnotationsForDisplay({
    annotations: input.annotations,
    displayState: input.displayState,
  });
  const annotations = visibleAnnotations.filter((annotation) => (
    !isChildAnnotation(annotation, visibleAnnotations)
    && annotation.ranges.some((range) => (
      range.block_id === input.blockId
      && range.text_unit_id === input.textUnitId
      && (range.target_kind === 'text_span' || range.target_kind === 'text_unit')
    ))
  ));
  return clusterFromAnnotations({
    anchorKind: 'text_unit',
    blockId: input.blockId,
    textUnitId: input.textUnitId,
    annotations,
    selectedAnnotationIds: input.selectedAnnotationIds || [],
  });
}

export function buildBlockAnnotationCluster(input: {
  annotations: AnnotationTruthV1[];
  displayState?: AnnotationDisplayStateV1;
  blockId: string;
  selectedAnnotationIds?: string[];
}): AnnotationBadgeClusterV1 | null {
  const annotations = visibleAnnotationsForDisplay({
    annotations: input.annotations,
    displayState: input.displayState,
  }).filter((annotation) => annotation.ranges.some((range) => (
    range.block_id === input.blockId
    && range.target_kind === 'block'
  )));
  return clusterFromAnnotations({
    anchorKind: 'block',
    blockId: input.blockId,
    annotations,
    selectedAnnotationIds: input.selectedAnnotationIds || [],
  });
}
