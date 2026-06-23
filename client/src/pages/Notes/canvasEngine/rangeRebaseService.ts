import type {
  AnnotationRangeV1,
  AnnotationTruthV1,
} from './runtimeDataTypes';

export interface SourceBackedRangeEditIntent {
  annotation_id: string;
  range_id: string;
  replacement_text: string;
}

export interface TextEditDelta {
  editedStartOffset: number;
  editedEndOffset: number;
  replacementText: string;
}

export interface RangeRebaseResult {
  next_text: string;
  next_ranges: AnnotationRangeV1[];
  invalidated_range_ids: string[];
  warnings: string[];
}

export interface RebaseAnnotationsForTextUnitEditResult {
  next_annotations: AnnotationTruthV1[];
  invalidated_range_ids: string[];
  warnings: string[];
}

export interface SourceBackedAnnotationRangeEditResult {
  next_text: string;
  next_annotations: AnnotationTruthV1[];
  invalidated_range_ids: string[];
  warnings: string[];
}

export function deriveSingleTextEditDelta(oldText: string, newText: string): TextEditDelta {
  if (oldText === newText) {
    return {
      editedStartOffset: oldText.length,
      editedEndOffset: oldText.length,
      replacementText: '',
    };
  }

  let prefix = 0;
  while (
    prefix < oldText.length
    && prefix < newText.length
    && oldText[prefix] === newText[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < oldText.length - prefix
    && suffix < newText.length - prefix
    && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return {
    editedStartOffset: prefix,
    editedEndOffset: oldText.length - suffix,
    replacementText: newText.slice(prefix, newText.length - suffix),
  };
}

function normalizeEditOffsets(input: {
  oldText: string;
  editedStartOffset: number;
  editedEndOffset: number;
}): { start: number; end: number } {
  const textLength = input.oldText.length;
  const rawStart = Number.isFinite(input.editedStartOffset) ? input.editedStartOffset : 0;
  const rawEnd = Number.isFinite(input.editedEndOffset) ? input.editedEndOffset : rawStart;
  const start = Math.max(0, Math.min(textLength, Math.min(rawStart, rawEnd)));
  const end = Math.max(0, Math.min(textLength, Math.max(rawStart, rawEnd)));
  return { start, end };
}

function rangeText(range: AnnotationRangeV1, nextText: string): string | undefined {
  if (range.target_kind === 'text_unit') return nextText;
  if (
    range.target_kind === 'text_span'
    && typeof range.start_offset === 'number'
    && typeof range.end_offset === 'number'
  ) {
    return nextText.slice(range.start_offset, range.end_offset);
  }
  return range.range_text_cache;
}

export function rebaseTextUnitAnnotationRanges(input: {
  textUnitId: string;
  oldText: string;
  newText: string;
  editedStartOffset: number;
  editedEndOffset: number;
  replacementText: string;
  ranges: AnnotationRangeV1[];
}): RangeRebaseResult {
  const edit = normalizeEditOffsets(input);
  const replacementLength = input.replacementText.length;
  const delta = replacementLength - (edit.end - edit.start);
  const invalidatedRangeIds: string[] = [];
  const warnings: string[] = [];

  const nextRanges = input.ranges.map((range) => {
    if (range.text_unit_id !== input.textUnitId) return range;

    if (range.target_kind === 'text_unit') {
      return {
        ...range,
        range_text_cache: input.newText,
      };
    }

    if (
      range.target_kind !== 'text_span'
      || typeof range.start_offset !== 'number'
      || typeof range.end_offset !== 'number'
    ) {
      return range;
    }

    const start = range.start_offset;
    const end = range.end_offset;

    if (start === edit.start && end === edit.end) {
      const replaced = {
        ...range,
        start_offset: start,
        end_offset: start + replacementLength,
      };
      return {
        ...replaced,
        range_text_cache: rangeText(replaced, input.newText),
      };
    }

    if (start <= edit.start && edit.end <= end) {
      const contained = {
        ...range,
        start_offset: start,
        end_offset: Math.max(start, end + delta),
      };
      return {
        ...contained,
        range_text_cache: rangeText(contained, input.newText),
      };
    }

    if (end <= edit.start) {
      return {
        ...range,
        range_text_cache: rangeText(range, input.newText),
      };
    }

    if (start >= edit.end) {
      const shifted = {
        ...range,
        start_offset: Math.max(0, start + delta),
        end_offset: Math.max(0, end + delta),
      };
      return {
        ...shifted,
        range_text_cache: rangeText(shifted, input.newText),
      };
    }

    invalidatedRangeIds.push(range.id);
    warnings.push(`Range ${range.id} overlaps edited text and needs review.`);
    return {
      ...range,
      range_text_cache: rangeText(range, input.oldText),
    };
  });

  return {
    next_text: input.newText,
    next_ranges: nextRanges,
    invalidated_range_ids: invalidatedRangeIds,
    warnings,
  };
}

export function rebaseAnnotationsForTextUnitEdit(input: {
  annotations: AnnotationTruthV1[];
  blockId: string;
  textFlowId: string;
  textUnitId: string;
  oldText: string;
  newText: string;
}): RebaseAnnotationsForTextUnitEditResult {
  const delta = deriveSingleTextEditDelta(input.oldText, input.newText);
  const touchedRanges = input.annotations
    .flatMap((annotation) => annotation.ranges)
    .filter((range) => (
      range.block_id === input.blockId
      && range.text_flow_id === input.textFlowId
      && range.text_unit_id === input.textUnitId
    ));

  if (touchedRanges.length === 0) {
    return {
      next_annotations: input.annotations,
      invalidated_range_ids: [],
      warnings: [],
    };
  }

  const rebase = rebaseTextUnitAnnotationRanges({
    textUnitId: input.textUnitId,
    oldText: input.oldText,
    newText: input.newText,
    editedStartOffset: delta.editedStartOffset,
    editedEndOffset: delta.editedEndOffset,
    replacementText: delta.replacementText,
    ranges: touchedRanges,
  });
  const rangesById = new Map(rebase.next_ranges.map((range) => [range.id, range]));

  return {
    next_annotations: input.annotations.map((annotation) => ({
      ...annotation,
      ranges: annotation.ranges.map((range) => rangesById.get(range.id) || range),
    })),
    invalidated_range_ids: rebase.invalidated_range_ids,
    warnings: rebase.warnings,
  };
}

export function applySourceBackedAnnotationRangeEdit(input: {
  annotations: AnnotationTruthV1[];
  annotationId: string;
  rangeId: string;
  currentText: string;
  replacementText: string;
}): SourceBackedAnnotationRangeEditResult | null {
  const annotation = input.annotations.find((item) => item.id === input.annotationId);
  const range = annotation?.ranges.find((item) => item.id === input.rangeId);
  if (!annotation || !range || !range.block_id || !range.text_flow_id || !range.text_unit_id) return null;

  const start = range.target_kind === 'text_span' ? range.start_offset ?? 0 : 0;
  const end = range.target_kind === 'text_span' ? range.end_offset ?? start : input.currentText.length;
  const nextText = `${input.currentText.slice(0, start)}${input.replacementText}${input.currentText.slice(end)}`;

  const rebase = rebaseTextUnitAnnotationRanges({
    textUnitId: range.text_unit_id,
    oldText: input.currentText,
    newText: nextText,
    editedStartOffset: start,
    editedEndOffset: end,
    replacementText: input.replacementText,
    ranges: input.annotations
      .flatMap((item) => item.ranges)
      .filter((candidate) => (
        candidate.block_id === range.block_id
        && candidate.text_flow_id === range.text_flow_id
        && candidate.text_unit_id === range.text_unit_id
      )),
  });

  const rangesById = new Map(rebase.next_ranges.map((item) => [item.id, item]));
  return {
    next_text: nextText,
    next_annotations: input.annotations.map((item) => ({
      ...item,
      ranges: item.ranges.map((candidate) => rangesById.get(candidate.id) || candidate),
    })),
    invalidated_range_ids: rebase.invalidated_range_ids,
    warnings: rebase.warnings,
  };
}
