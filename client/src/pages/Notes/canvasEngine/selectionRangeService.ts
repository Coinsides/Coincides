import {
  createTextSpanAnnotationRange,
} from './annotationTruthService';
import type {
  AnnotationRangeV1,
} from './runtimeDataTypes';

export type CapturedSelectionRange = {
  blockId: string;
  textFlowId: string;
  textUnitId: string;
  startOffset: number;
  endOffset: number;
  text: string;
};

export type TextUnitAnnotationHighlightRange = {
  range: AnnotationRangeV1;
  selected?: boolean;
};

export type TextUnitAnnotationHighlightSegment = {
  text: string;
  highlighted: boolean;
  selected: boolean;
};

export function normalizeSelectionOffsets(input: {
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

export function createAnnotationRangeFromCapturedSelection(
  selection: CapturedSelectionRange,
): AnnotationRangeV1 {
  const normalized = normalizeSelectionOffsets({
    startOffset: selection.startOffset,
    endOffset: selection.endOffset,
    textLength: selection.text.length,
  });
  return createTextSpanAnnotationRange({
    blockId: selection.blockId,
    textFlowId: selection.textFlowId,
    textUnitId: selection.textUnitId,
    startOffset: normalized.startOffset,
    endOffset: normalized.endOffset,
    text: selection.text.slice(normalized.startOffset, normalized.endOffset),
  });
}

export function isFullTextUnitAnnotationRange(
  range: AnnotationRangeV1,
  textUnitText: string,
): boolean {
  if (range.target_kind === 'text_unit') return true;
  if (range.target_kind !== 'text_span') return false;
  const textLength = textUnitText.length;
  if (textLength === 0) return false;
  const normalized = normalizeSelectionOffsets({
    startOffset: range.start_offset ?? 0,
    endOffset: range.end_offset ?? range.start_offset ?? 0,
    textLength,
  });
  return normalized.startOffset === 0 && normalized.endOffset >= textLength;
}

export function createTextUnitAnnotationHighlightSegments(input: {
  text: string;
  ranges: TextUnitAnnotationHighlightRange[];
}): TextUnitAnnotationHighlightSegment[] {
  const textLength = input.text.length;
  if (textLength === 0) return [];

  const intervals = input.ranges.flatMap((item) => {
    const { range } = item;
    if (range.target_kind === 'text_unit') {
      return [{ start: 0, end: textLength, selected: item.selected === true }];
    }
    if (range.target_kind !== 'text_span') return [];
    const normalized = normalizeSelectionOffsets({
      startOffset: range.start_offset ?? 0,
      endOffset: range.end_offset ?? range.start_offset ?? 0,
      textLength,
    });
    if (normalized.startOffset === normalized.endOffset) return [];
    return [{
      start: normalized.startOffset,
      end: normalized.endOffset,
      selected: item.selected === true,
    }];
  });

  if (intervals.length === 0) {
    return [{ text: input.text, highlighted: false, selected: false }];
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
    return [{
      text: input.text.slice(start, end),
      highlighted: coveringIntervals.length > 0,
      selected: coveringIntervals.some((interval) => interval.selected),
    }];
  });
}

function closestTextUnitElement(node: Node | null): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node?.parentElement;
  return element?.closest<HTMLElement>('[data-text-unit-id][data-text-flow-id][data-block-id]') || null;
}

export function captureTextUnitSelection(selection: Selection | null): CapturedSelectionRange | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const startElement = closestTextUnitElement(range.startContainer);
  const endElement = closestTextUnitElement(range.endContainer);
  if (!startElement || !endElement || startElement !== endElement) return null;

  const blockId = startElement.dataset.blockId || '';
  const textFlowId = startElement.dataset.textFlowId || '';
  const textUnitId = startElement.dataset.textUnitId || '';
  const text = startElement.dataset.textUnitText || startElement.textContent || '';
  if (!blockId || !textFlowId || !textUnitId || !text) return null;

  const normalized = normalizeSelectionOffsets({
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    textLength: text.length,
  });
  if (normalized.startOffset === normalized.endOffset) return null;

  return {
    blockId,
    textFlowId,
    textUnitId,
    startOffset: normalized.startOffset,
    endOffset: normalized.endOffset,
    text,
  };
}
