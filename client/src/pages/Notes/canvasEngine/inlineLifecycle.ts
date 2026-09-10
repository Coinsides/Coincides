import type { InlineStructuredObject, TextUnit } from './runtimeDataTypes';
import { sliceGraphemes } from '../../../../../shared/graphemes';

/** An unchanged slice of an old unit and its location after an edit. */
export interface RetainedInlineText {
  start: number;
  end: number;
  unitId: string;
  offset: number;
}

export function remapUnitInlineStructures(
  items: InlineStructuredObject[],
  unit: TextUnit,
  retained: RetainedInlineText[],
  fallbackUnitId: string,
): InlineStructuredObject[] {
  return items.map((item) => {
    if (item.parent_text_unit_id !== unit.id) return item;
    const range = item.anchor_range;
    if (!range) return { ...item, parent_text_unit_id: fallbackUnitId };
    const segment = Number.isInteger(range.start) && Number.isInteger(range.end)
      && range.start >= 0 && range.end >= range.start && range.end <= unit.text.length
      ? retained.find((slice) => slice.start <= range.start && range.end <= slice.end)
      : undefined;
    if (segment) {
      return {
        ...item,
        parent_text_unit_id: segment.unitId,
        anchor_range: {
          start: range.start - segment.start + segment.offset,
          end: range.end - segment.start + segment.offset,
        },
      };
    }
    // Match existing range degradation: retain the object and its evidence,
    // remove the coordinates instead of clipping a different piece of text.
    return {
      ...item,
      parent_text_unit_id: fallbackUnitId,
      anchor_range: null,
      metadata: {
        ...item.metadata,
        pre_edit_offsets: item.metadata.pre_edit_offsets ?? {
          text_unit_id: unit.id,
          start_offset: range.start,
          end_offset: range.end,
          range_text_cache: item.anchor_text ?? sliceGraphemes(unit.text, range.start, range.end),
        },
      },
    };
  });
}
