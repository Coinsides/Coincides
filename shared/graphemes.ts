/// <reference lib="es2022.intl" />

// Keep in sync with server/src/services/graphemes.ts; server runtime cannot import shared.
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export type GraphemeAffinity = 'backward' | 'forward' | 'nearest';

function offsetInText(text: string, offset: number): number {
  return Math.min(text.length, Math.max(0, Number.isNaN(offset) ? 0 : Math.trunc(offset)));
}

/** Coordinates remain UTF-16 offsets. Nearest ties go to the end of the cluster. */
export function snapGraphemeOffset(
  text: string,
  offset: number,
  affinity: GraphemeAffinity = 'nearest',
): number {
  const point = offsetInText(text, offset);
  const cluster = segmenter.segment(text).containing(point);
  if (!cluster || cluster.index === point) return point;
  const end = cluster.index + cluster.segment.length;
  if (affinity === 'backward') return cluster.index;
  if (affinity === 'forward') return end;
  return point - cluster.index < end - point ? cluster.index : end;
}

export function previousGraphemeOffset(text: string, offset: number): number {
  const point = offsetInText(text, offset);
  return point === 0 ? 0 : segmenter.segment(text).containing(point - 1)!.index;
}

export function nextGraphemeOffset(text: string, offset: number): number {
  const point = offsetInText(text, offset);
  const cluster = segmenter.segment(text).containing(point);
  return cluster ? cluster.index + cluster.segment.length : text.length;
}

/** Expand nonempty ranges outward; a caret remains collapsed at its nearest boundary. */
export function expandGraphemeRange(
  text: string,
  start: number,
  end: number,
): { start: number; end: number } {
  const from = offsetInText(text, start);
  const to = offsetInText(text, end);
  if (to <= from) {
    const caret = snapGraphemeOffset(text, from);
    return { start: caret, end: caret };
  }
  return {
    start: snapGraphemeOffset(text, from, 'backward'),
    end: snapGraphemeOffset(text, to, 'forward'),
  };
}

function sliceOffset(text: string, offset: number): number {
  const integer = Number.isNaN(offset) ? 0 : Math.trunc(offset);
  return integer < 0 ? Math.max(0, text.length + integer) : Math.min(text.length, integer);
}

/** String.slice indices, with nonempty excerpts expanded to complete graphemes. */
export function sliceGraphemes(text: string, start: number, end = text.length): string {
  const range = expandGraphemeRange(text, sliceOffset(text, start), sliceOffset(text, end));
  return text.slice(range.start, range.end);
}

