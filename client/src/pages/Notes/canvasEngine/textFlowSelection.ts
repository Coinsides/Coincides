import type { TextBlockContentV1 } from './runtimeDataTypes';
import { remapUnitInlineStructures, type RetainedInlineText } from './inlineLifecycle';

export interface FlowPoint {
  unitId: string;
  offset: number;
}

export interface FlowSelection {
  anchor: FlowPoint;
  focus: FlowPoint;
}

export interface OrderedFlowSelection {
  start: FlowPoint;
  end: FlowPoint;
  startIndex: number;
  endIndex: number;
}

function clampOffset(offset: number, length: number): number {
  return Math.min(length, Math.max(0, Number.isNaN(offset) ? 0 : Math.trunc(offset)));
}

/** Resolve against the complete flow, including units hidden by a collapsed toggle. */
export function orderedFlowSelection(
  flow: TextBlockContentV1,
  selection: FlowSelection,
): OrderedFlowSelection | null {
  const anchorIndex = flow.units.findIndex((unit) => unit.id === selection.anchor.unitId);
  const focusIndex = flow.units.findIndex((unit) => unit.id === selection.focus.unitId);
  if (anchorIndex < 0 || focusIndex < 0) return null;

  const anchor = {
    unitId: selection.anchor.unitId,
    offset: clampOffset(selection.anchor.offset, flow.units[anchorIndex].text.length),
  };
  const focus = {
    unitId: selection.focus.unitId,
    offset: clampOffset(selection.focus.offset, flow.units[focusIndex].text.length),
  };
  const forward = anchorIndex < focusIndex
    || (anchorIndex === focusIndex && anchor.offset <= focus.offset);
  return forward
    ? { start: anchor, end: focus, startIndex: anchorIndex, endIndex: focusIndex }
    : { start: focus, end: anchor, startIndex: focusIndex, endIndex: anchorIndex };
}

export function flowSelectionText(flow: TextBlockContentV1, selection: FlowSelection): string {
  const range = orderedFlowSelection(flow, selection);
  if (!range) return '';

  return flow.units.slice(range.startIndex, range.endIndex + 1).map((unit, index) => {
    const unitIndex = range.startIndex + index;
    const start = unitIndex === range.startIndex ? range.start.offset : 0;
    const end = unitIndex === range.endIndex ? range.end.offset : unit.text.length;
    return unit.text.slice(start, end);
  }).join('\n');
}

/** Merge into the first unit, preserving its identity and the existing merge metadata policy. */
export function replaceFlowSelection(
  flow: TextBlockContentV1,
  selection: FlowSelection,
  text: string,
): { flow: TextBlockContentV1; caret: FlowPoint } | null {
  const range = orderedFlowSelection(flow, selection);
  if (!range) return null;

  const first = flow.units[range.startIndex];
  const last = flow.units[range.endIndex];
  const merged = {
    ...first,
    text: `${first.text.slice(0, range.start.offset)}${text}${last.text.slice(range.end.offset)}`,
  };
  if (range.startIndex === range.endIndex && merged.text === first.text) {
    return { flow, caret: { unitId: first.id, offset: range.start.offset + text.length } };
  }
  const units = [
    ...flow.units.slice(0, range.startIndex),
    merged,
    ...flow.units.slice(range.endIndex + 1),
  ].map((unit, index) => ({ ...unit, order_index: index }));

  let inlineStructures = flow.inline_structures;
  for (let index = range.startIndex; index <= range.endIndex; index += 1) {
    const unit = flow.units[index];
    const retained: RetainedInlineText[] = [];
    if (index === range.startIndex) retained.push({ start: 0, end: range.start.offset, unitId: first.id, offset: 0 });
    if (index === range.endIndex) retained.push({
      start: range.end.offset, end: last.text.length, unitId: first.id, offset: range.start.offset + text.length,
    });
    inlineStructures = remapUnitInlineStructures(inlineStructures, unit, retained, first.id);
  }

  return {
    flow: { ...flow, units, inline_structures: inlineStructures },
    caret: { unitId: first.id, offset: range.start.offset + text.length },
  };
}
