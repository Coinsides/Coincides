type TextFlowUnitRecord = Record<string, unknown> & { text: string };

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function validTextFlowUnits(
  body: Record<string, unknown>,
): TextFlowUnitRecord[] | null {
  const textFlow = recordValue(body.text_flow);
  if (!textFlow || !Array.isArray(textFlow.units)) return null;
  return textFlow.units
    .map((unit) => recordValue(unit))
    .filter((unit): unit is Record<string, unknown> => Boolean(unit))
    .filter((unit): unit is TextFlowUnitRecord => (
      unit.status !== 'deleted' && typeof unit.text === 'string'
    ))
    .sort((left, right) => Number(left.order_index || 0) - Number(right.order_index || 0));
}
