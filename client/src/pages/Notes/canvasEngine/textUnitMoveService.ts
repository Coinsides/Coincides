import type { TextBlockContentV1 } from './runtimeDataTypes';
import { extractTextUnit } from './textUnitExtractionService';

/** Current source IDs -> destination IDs, frozen in the document history entry. */
export interface TextUnitIdMapping {
  unit_id: string;
  inline_ids: Record<string, string>;
}

function unusedMoveId(id: string, occupied: Set<string>): string {
  let suffix = 1;
  let candidate: string;
  do { candidate = `${id.slice(0, 160)}-move-${suffix++}`; } while (occupied.has(candidate));
  occupied.add(candidate);
  return candidate;
}

/** Preserve identities unless the destination already owns them. Never alter creation defaults. */
export function moveTextUnitBetweenFlows(
  source: TextBlockContentV1,
  unitId: string,
  target: TextBlockContentV1,
  targetUnitId: string,
  edge: 'before' | 'after',
): { source: TextBlockContentV1; target: TextBlockContentV1; idMapping: TextUnitIdMapping } | null {
  const split = extractTextUnit(source, unitId);
  const targetIndex = target.units.findIndex((unit) => unit.id === targetUnitId && unit.status !== 'deleted');
  if (!split || (targetIndex < 0 && target.units.length > 0)) return null;
  const occupiedUnits = new Set([...source.units, ...target.units].map((unit) => unit.id));
  const occupiedInline = new Set([...source.inline_structures, ...target.inline_structures].map((inline) => inline.id));
  const targetInlineIds = new Set(target.inline_structures.map((inline) => inline.id));
  const mappedUnitId = target.units.some((unit) => unit.id === unitId) ? unusedMoveId(unitId, occupiedUnits) : unitId;
  const inlineIds = Object.fromEntries(split.extracted.inline_structures
    .filter((inline) => targetInlineIds.has(inline.id)).map((inline) => [inline.id, unusedMoveId(inline.id, occupiedInline)]));
  split.extracted.units[0].id = mappedUnitId;
  split.extracted.inline_structures = split.extracted.inline_structures.map((inline) => ({
    ...inline, id: Object.prototype.hasOwnProperty.call(inlineIds, inline.id) ? inlineIds[inline.id] : inline.id, parent_text_unit_id: mappedUnitId,
  }));
  const nextTarget = structuredClone(target);
  nextTarget.units.splice(targetIndex < 0 ? 0 : targetIndex + (edge === 'after' ? 1 : 0), 0, split.extracted.units[0]);
  nextTarget.units = nextTarget.units.map((unit, order_index) => ({ ...unit, order_index }));
  nextTarget.inline_structures.push(...split.extracted.inline_structures);
  return { source: split.remaining, target: nextTarget, idMapping: { unit_id: mappedUnitId, inline_ids: inlineIds } };
}
