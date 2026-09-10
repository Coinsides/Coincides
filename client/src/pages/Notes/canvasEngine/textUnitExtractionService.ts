import type { TextBlockContentV1 } from './runtimeDataTypes';

/** Moving a unit moves its existing inline objects, without deriving fresh anchors. */
export function extractTextUnit(flow: TextBlockContentV1, unitId: string): {
  remaining: TextBlockContentV1;
  extracted: TextBlockContentV1;
} | null {
  const unit = flow.units.find((candidate) => candidate.id === unitId);
  if (!unit || unit.status === 'deleted') return null;
  return structuredClone({
    remaining: { ...flow, units: flow.units.filter((candidate) => candidate.id !== unitId),
      inline_structures: flow.inline_structures.filter((inline) => inline.parent_text_unit_id !== unitId) },
    extracted: { ...flow, units: [unit],
      inline_structures: flow.inline_structures.filter((inline) => inline.parent_text_unit_id === unitId) },
  });
}
