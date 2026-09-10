import type { TextBlockContentV1 } from './runtimeDataTypes';

/** Reorder existing identities; inline structures and external anchors keep their owners. */
export function reorderTextUnit(
  flow: TextBlockContentV1,
  unitId: string,
  targetId: string,
  edge: 'before' | 'after',
): TextBlockContentV1 {
  const unit = flow.units.find((entry) => entry.id === unitId);
  if (!unit || targetId === unitId || !flow.units.some((entry) => entry.id === targetId)) return flow;
  const units = flow.units.filter((entry) => entry.id !== unitId);
  const target = units.findIndex((entry) => entry.id === targetId);
  units.splice(target + (edge === 'after' ? 1 : 0), 0, unit);
  if (units.every((entry, index) => entry === flow.units[index])) return flow;
  return { ...flow, units: units.map((entry, order_index) => ({ ...entry, order_index })) };
}
