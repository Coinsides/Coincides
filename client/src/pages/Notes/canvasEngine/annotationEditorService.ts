import type {
  AnnotationCreatedBy,
  AnnotationRangeV1,
  AnnotationTruthV1,
} from './runtimeDataTypes';
import {
  createTextSpanAnnotationRange,
  createAnnotationTruth,
} from './annotationTruthService';
export {
  annotationVisibleInHierarchy,
  attachChildAnnotation,
  detachChildAnnotation,
  getChildAnnotations,
  getParentAnnotation,
  isRootAnnotation,
  normalizeAnnotationHierarchy,
  resolveAnnotationInspectorRootIds,
  resolveAnnotationRootId,
} from './annotationHierarchyService';

function hasMeaningfulTextRange(range: AnnotationRangeV1): boolean {
  if (range.target_kind === 'block') return Boolean(range.block_id);
  if (range.target_kind === 'text_unit') return Boolean(range.block_id && range.text_unit_id);
  if (range.target_kind === 'text_span') {
    return Boolean(range.block_id && range.text_unit_id)
      && typeof range.start_offset === 'number'
      && typeof range.end_offset === 'number'
      && range.start_offset !== range.end_offset;
  }
  return Boolean(
    range.inline_structure_id
    || range.canvas_object_id
    || range.source_region_id,
  );
}

export function annotationRangeIdentityKey(range: AnnotationRangeV1): string {
  return [
    range.target_kind,
    range.block_id || '',
    range.text_flow_id || '',
    range.text_unit_id || '',
    range.inline_structure_id || '',
    range.canvas_object_id || '',
    range.source_region_id || '',
    range.start_offset ?? '',
    range.end_offset ?? '',
  ].join('|');
}

export function mergeAnnotationRanges(
  ranges: AnnotationRangeV1[],
): AnnotationRangeV1[] {
  const seen = new Set<string>();
  const merged: AnnotationRangeV1[] = [];
  ranges.forEach((range) => {
    const key = annotationRangeIdentityKey(range);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(range);
  });
  return merged;
}

export function canCreateAnnotationFromRanges(ranges: AnnotationRangeV1[]): boolean {
  return ranges.length > 0 && ranges.every(hasMeaningfulTextRange);
}

export function createAnnotationFromExistingRanges(input: {
  sourceAnnotation: AnnotationTruthV1;
  label: string;
  createdBy?: AnnotationCreatedBy;
}): AnnotationTruthV1 {
  return createAnnotationTruth({
    noteId: input.sourceAnnotation.note_id,
    canvasId: input.sourceAnnotation.canvas_id,
    label: input.label,
    ranges: input.sourceAnnotation.ranges.map((range) => ({ ...range })),
    createdBy: input.createdBy || 'human',
    markerKind: input.sourceAnnotation.visual_style.marker_kind,
    colorToken: input.sourceAnnotation.visual_style.color_token,
  });
}

function normalizePreviewOffsets(input: {
  startOffset: number;
  endOffset: number;
  textLength: number;
}): { startOffset: number; endOffset: number } {
  const textLength = Math.max(0, input.textLength);
  const rawStart = Number.isFinite(input.startOffset) ? input.startOffset : 0;
  const rawEnd = Number.isFinite(input.endOffset) ? input.endOffset : rawStart;
  const start = Math.max(0, Math.min(textLength, rawStart));
  const end = Math.max(0, Math.min(textLength, rawEnd));
  return start <= end
    ? { startOffset: start, endOffset: end }
    : { startOffset: end, endOffset: start };
}

export function createChildAnnotationRangeFromParentRange(input: {
  parentRange: AnnotationRangeV1;
  selectionStartOffset: number;
  selectionEndOffset: number;
  selectedText?: string;
}): AnnotationRangeV1 | null {
  const { parentRange } = input;
  if (parentRange.target_kind !== 'text_span' && parentRange.target_kind !== 'text_unit') {
    return null;
  }
  if (!parentRange.block_id || !parentRange.text_flow_id || !parentRange.text_unit_id) {
    return null;
  }

  const previewText = parentRange.range_text_cache || input.selectedText || '';
  const normalized = normalizePreviewOffsets({
    startOffset: input.selectionStartOffset,
    endOffset: input.selectionEndOffset,
    textLength: previewText.length,
  });
  if (normalized.startOffset === normalized.endOffset) return null;

  const parentStart = parentRange.target_kind === 'text_span'
    ? parentRange.start_offset ?? 0
    : 0;
  const selectedText = input.selectedText
    || previewText.slice(normalized.startOffset, normalized.endOffset);

  return createTextSpanAnnotationRange({
    blockId: parentRange.block_id,
    textFlowId: parentRange.text_flow_id,
    textUnitId: parentRange.text_unit_id,
    startOffset: parentStart + normalized.startOffset,
    endOffset: parentStart + normalized.endOffset,
    text: selectedText,
  });
}
