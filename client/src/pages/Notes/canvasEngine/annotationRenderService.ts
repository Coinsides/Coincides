import type {
  AnnotationRangeV1,
  AnnotationTruthV1,
} from './runtimeDataTypes';
import {
  normalizeSelectionOffsets,
} from './selectionRangeService';
import {
  DEFAULT_ANNOTATION_DISPLAY_STATE,
  visibleAnnotationsForDisplay,
  type AnnotationDisplayStateV1,
} from './annotationDisplayService';

export interface AnnotationRenderSegment {
  text: string;
  annotationIds: string[];
  labels: string[];
  childAnnotationIds: string[];
  childLabels: string[];
  selected: boolean;
}

export interface AnnotationUnitSummary {
  primary: AnnotationTruthV1 | null;
  count: number;
  labels: string[];
  annotationIds: string[];
}

type AnnotationInterval = {
  start: number;
  end: number;
  annotation: AnnotationTruthV1;
  selected: boolean;
};

function activeAnnotations(
  annotations: AnnotationTruthV1[],
  displayState: AnnotationDisplayStateV1 = DEFAULT_ANNOTATION_DISPLAY_STATE,
): AnnotationTruthV1[] {
  return visibleAnnotationsForDisplay({
    annotations,
    displayState,
  });
}

function rangeTargetsTextUnit(range: AnnotationRangeV1, input: {
  blockId: string;
  textUnitId: string;
}): boolean {
  return range.block_id === input.blockId
    && range.text_unit_id === input.textUnitId
    && (range.target_kind === 'text_span' || range.target_kind === 'text_unit');
}

function intervalForRange(input: {
  range: AnnotationRangeV1;
  textLength: number;
}): { start: number; end: number } | null {
  if (input.textLength === 0) return null;
  if (input.range.target_kind === 'text_unit') {
    return { start: 0, end: input.textLength };
  }
  if (input.range.target_kind !== 'text_span') return null;

  const normalized = normalizeSelectionOffsets({
    startOffset: input.range.start_offset ?? 0,
    endOffset: input.range.end_offset ?? input.range.start_offset ?? 0,
    textLength: input.textLength,
  });
  if (normalized.startOffset === normalized.endOffset) return null;
  return {
    start: normalized.startOffset,
    end: normalized.endOffset,
  };
}

function labelsForAnnotations(annotations: AnnotationTruthV1[]): string[] {
  return Array.from(new Set(annotations.map((annotation) => annotation.raw_label)));
}

function isChildAnnotation(annotation: AnnotationTruthV1, annotations: AnnotationTruthV1[]): boolean {
  if (annotation.parent_annotation_id) return true;
  return annotations.some((candidate) => candidate.child_annotation_ids.includes(annotation.id));
}

export function createAnnotationRenderSegments(input: {
  text: string;
  annotations: AnnotationTruthV1[];
  blockId: string;
  textUnitId: string;
  selectedAnnotationIds?: string[];
  selectedAnnotationId?: string | null;
  displayState?: AnnotationDisplayStateV1;
}): AnnotationRenderSegment[] {
  const textLength = input.text.length;
  if (textLength === 0) return [];

  const selectedIds = new Set([
    ...(input.selectedAnnotationIds || []),
    ...(input.selectedAnnotationId ? [input.selectedAnnotationId] : []),
  ]);
  const intervals: AnnotationInterval[] = activeAnnotations(input.annotations, input.displayState).flatMap((annotation) => (
    annotation.ranges.flatMap((range) => {
      if (!rangeTargetsTextUnit(range, input)) return [];
      const interval = intervalForRange({ range, textLength });
      if (!interval) return [];
      return [{
        ...interval,
        annotation,
        selected: selectedIds.has(annotation.id),
      }];
    })
  ));

  if (intervals.length === 0) {
    return [{
      text: input.text,
      annotationIds: [],
      labels: [],
      childAnnotationIds: [],
      childLabels: [],
      selected: false,
    }];
  }

  const breakpoints = Array.from(new Set([
    0,
    textLength,
    ...intervals.flatMap((interval) => [interval.start, interval.end]),
  ])).sort((a, b) => a - b);

  return breakpoints.slice(0, -1).flatMap((start, index) => {
    const end = breakpoints[index + 1];
    if (start === end) return [];
    const coveringIntervals = intervals.filter((interval) => interval.start < end && interval.end > start);
    const coveringAnnotations = coveringIntervals.map((interval) => interval.annotation);
    const coveringChildAnnotations = coveringAnnotations.filter((annotation) => (
      isChildAnnotation(annotation, input.annotations)
    ));
    return [{
      text: input.text.slice(start, end),
      annotationIds: Array.from(new Set(coveringAnnotations.map((annotation) => annotation.id))),
      labels: labelsForAnnotations(coveringAnnotations),
      childAnnotationIds: Array.from(new Set(coveringChildAnnotations.map((annotation) => annotation.id))),
      childLabels: labelsForAnnotations(coveringChildAnnotations),
      selected: coveringIntervals.some((interval) => interval.selected),
    }];
  });
}

export function summarizeAnnotationsForTextUnit(input: {
  annotations: AnnotationTruthV1[];
  blockId: string;
  textUnitId: string;
  selectedAnnotationIds?: string[];
  selectedAnnotationId?: string | null;
  displayState?: AnnotationDisplayStateV1;
}): AnnotationUnitSummary {
  const selectedIds = new Set([
    ...(input.selectedAnnotationIds || []),
    ...(input.selectedAnnotationId ? [input.selectedAnnotationId] : []),
  ]);
  const annotations = activeAnnotations(input.annotations, input.displayState).filter((annotation) => (
    annotation.ranges.some((range) => rangeTargetsTextUnit(range, input))
  ));
  const selected = annotations.find((annotation) => selectedIds.has(annotation.id)) || null;
  const primary = selected || annotations[annotations.length - 1] || null;
  return {
    primary,
    count: annotations.length,
    labels: labelsForAnnotations(annotations),
    annotationIds: annotations.map((annotation) => annotation.id),
  };
}

export function summarizeAnnotationsForBlock(input: {
  annotations: AnnotationTruthV1[];
  blockId: string;
  selectedAnnotationIds?: string[];
  selectedAnnotationId?: string | null;
  displayState?: AnnotationDisplayStateV1;
}): AnnotationUnitSummary {
  const selectedIds = new Set([
    ...(input.selectedAnnotationIds || []),
    ...(input.selectedAnnotationId ? [input.selectedAnnotationId] : []),
  ]);
  const annotations = activeAnnotations(input.annotations, input.displayState).filter((annotation) => (
    annotation.ranges.some((range) => range.target_kind === 'block' && range.block_id === input.blockId)
  ));
  const selected = annotations.find((annotation) => selectedIds.has(annotation.id)) || null;
  const primary = selected || annotations[annotations.length - 1] || null;
  return {
    primary,
    count: annotations.length,
    labels: labelsForAnnotations(annotations),
    annotationIds: annotations.map((annotation) => annotation.id),
  };
}
