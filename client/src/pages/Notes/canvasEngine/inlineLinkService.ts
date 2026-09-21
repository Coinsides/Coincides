import { expandGraphemeRange } from '../../../../../shared/graphemes';
import type { InlineStructuredObject, TextBlockContentV1, TextUnit } from './runtimeDataTypes';
import type { CapturedSelectionRange } from './selectionRangeService';

export type InlineLinkTarget =
  | { target_kind: 'heading'; block_id: string; unit_id: string }
  | { target_kind: 'block'; block_id: string }
  | { target_kind: 'note'; note_id: string };

export function readInlineLinkTarget(value: Record<string, unknown>): InlineLinkTarget | null {
  if (value.target_kind === 'heading' && typeof value.block_id === 'string' && value.block_id
    && typeof value.unit_id === 'string' && value.unit_id) {
    return { target_kind: 'heading', block_id: value.block_id, unit_id: value.unit_id };
  }
  if (value.target_kind === 'block' && typeof value.block_id === 'string' && value.block_id) {
    return { target_kind: 'block', block_id: value.block_id };
  }
  if (value.target_kind === 'note' && typeof value.note_id === 'string' && value.note_id) {
    return { target_kind: 'note', note_id: value.note_id };
  }
  return null;
}

export function inlineLinksForUnit(flow: TextBlockContentV1, unitId: string): InlineStructuredObject[] {
  return flow.inline_structures.filter((record) => record.semantic_kind === 'inline_link'
    && record.status !== 'deleted' && record.parent_text_unit_id === unitId);
}

export function hasInlineLinkRange(record: InlineStructuredObject, unit: TextUnit): boolean {
  const range = record.anchor_range;
  return Boolean(range && Number.isInteger(range.start) && Number.isInteger(range.end)
    && range.start >= 0 && range.end > range.start && range.end <= unit.text.length);
}

/** Creation only. All subsequent edits remain owned by the existing B8 lifecycle. */
export function appendInlineLink(flow: TextBlockContentV1, selection: CapturedSelectionRange,
  target: InlineLinkTarget, id = `inline-link-${crypto.randomUUID()}`): TextBlockContentV1 | null {
  const unit = flow.units.find((candidate) => candidate.id === selection.textUnitId && candidate.status !== 'deleted');
  if (!unit || unit.text !== selection.text || selection.startOffset < 0 || selection.endOffset > unit.text.length
    || selection.startOffset >= selection.endOffset || flow.inline_structures.some((record) => record.id === id)) return null;
  const range = expandGraphemeRange(unit.text, selection.startOffset, selection.endOffset);
  return { ...flow, inline_structures: [...flow.inline_structures, {
    id, semantic_kind: 'inline_link', parent_text_unit_id: unit.id,
    anchor_text: unit.text.slice(range.start, range.end), anchor_range: range,
    field_values: { ...target }, metadata: {}, status: 'active',
  }] };
}
