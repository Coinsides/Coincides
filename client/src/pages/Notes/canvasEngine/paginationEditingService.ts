import type { PageFlowFragment } from './documentPageFlowService';
import type { TextBlockContentV1, TextUnit } from './runtimeDataTypes';
import type { FlowPoint } from './textFlowSelection';

/** Geometry is relative to the first fragment's block content origin. */
export interface PositionedPageFlowFragment extends PageFlowFragment { left: number; top: number }
export interface PaginatedTextSlice {
  key: string;
  fragmentId: string;
  frameId: string;
  unit: TextUnit;
  unitIndex: number;
  start: number;
  end: number;
  /** A hard break at a page seam remains logical text, not an extra textarea row. */
  displayEnd: number;
  left: number;
  top: number;
  width: number;
  height: number;
  textHeight: number | null;
  lineCount: number;
  first: boolean;
}

/** Slice addresses are derived from TextFlow UTF-16 ranges, never new identities. */
export function paginateTextFlowSlices(flow: TextBlockContentV1, fragments: readonly PositionedPageFlowFragment[]): PaginatedTextSlice[] {
  let offset = 0;
  const units = flow.units.map((unit, index) => {
    const entry = { unit, index, start: offset, end: offset + unit.text.length };
    offset = entry.end + 1;
    return entry;
  });
  const slices: PaginatedTextSlice[] = [];
  for (const fragment of fragments) {
    let y = fragment.top;
    let last: PaginatedTextSlice | undefined;
    for (const line of fragment.lines) {
      const entry = units.find((candidate) => line.startOffset >= candidate.start && line.startOffset <= candidate.end);
      if (!entry) { y += line.heightPx; continue; }
      const start = Math.max(0, line.startOffset - entry.start);
      const end = Math.min(entry.unit.text.length, line.endOffset - entry.start);
      if (last?.unit.id === entry.unit.id) {
        last.end = end;
        last.height += line.heightPx;
        last.textHeight = last.textHeight !== null && line.lineHeightPx !== undefined ? last.textHeight + line.lineHeightPx : null;
        last.lineCount += 1;
      } else {
        last = { key: `${fragment.id}/${entry.unit.id}`, fragmentId: fragment.id, frameId: fragment.frameId,
          unit: entry.unit, unitIndex: entry.index, start, end, displayEnd: end, left: fragment.left, top: y,
          width: fragment.layout.width, height: line.heightPx, textHeight: line.lineHeightPx ?? null, lineCount: 1, first: start === 0 };
        slices.push(last);
      }
      y += line.heightPx;
    }
  }
  for (const slice of slices) {
    slice.displayEnd = slice.end;
    if (slice.end < slice.unit.text.length && slice.unit.text[slice.end - 1] === '\n') {
      slice.displayEnd -= slice.unit.text[slice.end - 2] === '\r' ? 2 : 1;
    }
  }
  return slices;
}

/** At a soft page seam one logical offset has two visual carets. */
export function pageSliceForCaret(slices: readonly PaginatedTextSlice[], point: FlowPoint, affinity: 'forward' | 'backward' = 'forward'): PaginatedTextSlice | undefined {
  const matches = slices.filter((slice) => slice.unit.id === point.unitId && point.offset >= slice.start && point.offset <= slice.end);
  return affinity === 'forward' ? matches[matches.length - 1] : matches[0];
}

export function logicalSliceSelection(slice: Pick<PaginatedTextSlice, 'unit' | 'start'>, start: number, end: number) {
  return { unitId: slice.unit.id, start: slice.start + start, end: slice.start + end };
}

/** A textarea owns only its visible range; surrounding logical text is retained. */
export function replaceSliceText(text: string, slice: Pick<PaginatedTextSlice, 'start' | 'end'> & Partial<Pick<PaginatedTextSlice, 'displayEnd'>>, value: string): string {
  return text.slice(0, slice.start) + value + text.slice(slice.displayEnd ?? slice.end);
}
