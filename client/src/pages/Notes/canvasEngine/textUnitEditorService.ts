import type {
  TextBlockContentV1,
  TextFlowObjectStatus,
  TextUnit,
  TextUnitWritingRole,
} from './runtimeDataTypes';

const TEXT_FLOW_CONTENT_VERSION = 'TextBlockContentV1';
const MAX_TEXT_UNIT_INDENT = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneUnit(unit: TextUnit): TextUnit {
  return {
    ...unit,
    metadata: { ...unit.metadata },
  };
}

function cloneFlow(flow: TextBlockContentV1): TextBlockContentV1 {
  return {
    textflow_version: TEXT_FLOW_CONTENT_VERSION,
    units: flow.units.map(cloneUnit),
    inline_structures: flow.inline_structures.map((item) => ({
      ...item,
      anchor_range: item.anchor_range ? { ...item.anchor_range } : null,
      field_values: { ...item.field_values },
      metadata: { ...item.metadata },
    })),
    metadata: { ...flow.metadata },
  };
}

function rewriteUnitOrder(units: TextUnit[]): TextUnit[] {
  return units.map((unit, index) => ({
    ...unit,
    order_index: index,
  }));
}

function maxNumericSuffix(ids: string[], prefix: string): number {
  return ids.reduce((max, id) => {
    if (!id.startsWith(prefix)) return max;
    const parsed = Number.parseInt(id.slice(prefix.length), 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
}

function createNextUnitId(flow: TextBlockContentV1): string {
  const existingIds = new Set(flow.units.map((unit) => unit.id));
  let next = maxNumericSuffix([...existingIds], 'tu-') + 1;
  let candidate = `tu-${next}`;
  while (existingIds.has(candidate)) {
    next += 1;
    candidate = `tu-${next}`;
  }
  return candidate;
}

function createParsedUnit(
  id: string,
  text: string,
  writingRole: TextUnitWritingRole,
  indentLevel: number,
  orderIndex: number,
  metadata: Record<string, unknown> = {},
  status: TextFlowObjectStatus = 'active',
): TextUnit {
  return {
    id,
    text,
    writing_role: writingRole,
    indent_level: clamp(indentLevel, 0, MAX_TEXT_UNIT_INDENT),
    order_index: orderIndex,
    metadata,
    status,
  };
}

function firstExistingRole(flow: TextBlockContentV1): TextUnitWritingRole {
  return flow.units[0]?.writing_role || 'paragraph';
}

function makeFlowFromUnits(
  source: TextBlockContentV1,
  units: TextUnit[],
): TextBlockContentV1 {
  return {
    ...cloneFlow(source),
    units: rewriteUnitOrder(units.map(cloneUnit)),
    inline_structures: [],
  };
}

export function splitTextUnitAtOffset(
  flow: TextBlockContentV1,
  unitId: string,
  offset: number,
): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  const unitIndex = nextFlow.units.findIndex((unit) => unit.id === unitId);
  if (unitIndex < 0) return nextFlow;

  const unit = nextFlow.units[unitIndex];
  const splitOffset = clamp(offset, 0, unit.text.length);
  const beforeText = unit.text.slice(0, splitOffset);
  const afterText = unit.text.slice(splitOffset);
  const afterUnit: TextUnit = {
    ...cloneUnit(unit),
    id: createNextUnitId(nextFlow),
    text: afterText,
  };

  const units = [
    ...nextFlow.units.slice(0, unitIndex),
    { ...unit, text: beforeText },
    afterUnit,
    ...nextFlow.units.slice(unitIndex + 1),
  ];

  return {
    ...nextFlow,
    units: rewriteUnitOrder(units),
  };
}

function enterSplitRoleForUnit(unit: TextUnit, splitOffset: number): TextUnitWritingRole {
  if (unit.writing_role === 'toggle_item' && splitOffset === unit.text.length) return 'paragraph';
  return unit.writing_role;
}

function enterSplitMetadataForUnit(unit: TextUnit, role: TextUnitWritingRole): Record<string, unknown> {
  if (role === 'todo_item') return { ...unit.metadata, checked: false };
  if (role === 'toggle_item') return { ...unit.metadata, collapsed: false };
  if (role === 'paragraph') return {};
  return { ...unit.metadata };
}

export function splitTextUnitForEnter(
  flow: TextBlockContentV1,
  unitId: string,
  offset: number,
): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  const unitIndex = nextFlow.units.findIndex((unit) => unit.id === unitId);
  if (unitIndex < 0) return nextFlow;

  const unit = nextFlow.units[unitIndex];
  const splitOffset = clamp(offset, 0, unit.text.length);
  const beforeText = unit.text.slice(0, splitOffset);
  const afterText = unit.text.slice(splitOffset);
  const nextRole = enterSplitRoleForUnit(unit, splitOffset);
  const afterUnit: TextUnit = {
    ...cloneUnit(unit),
    id: createNextUnitId(nextFlow),
    text: afterText,
    writing_role: nextRole,
    metadata: enterSplitMetadataForUnit(unit, nextRole),
  };

  const units = [
    ...nextFlow.units.slice(0, unitIndex),
    { ...unit, text: beforeText },
    afterUnit,
    ...nextFlow.units.slice(unitIndex + 1),
  ];

  return {
    ...nextFlow,
    units: rewriteUnitOrder(units),
  };
}

export function mergeTextUnitWithPrevious(
  flow: TextBlockContentV1,
  unitId: string,
): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  const unitIndex = nextFlow.units.findIndex((unit) => unit.id === unitId);
  if (unitIndex <= 0) return nextFlow;

  const previous = nextFlow.units[unitIndex - 1];
  const current = nextFlow.units[unitIndex];
  const mergedUnit: TextUnit = {
    ...previous,
    text: `${previous.text}${current.text}`,
  };
  const units = [
    ...nextFlow.units.slice(0, unitIndex - 1),
    mergedUnit,
    ...nextFlow.units.slice(unitIndex + 1),
  ];

  return {
    ...nextFlow,
    units: rewriteUnitOrder(units),
  };
}

export function setTextUnitWritingRole(
  flow: TextBlockContentV1,
  unitId: string,
  role: TextUnitWritingRole,
): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  return {
    ...nextFlow,
    units: nextFlow.units.map((unit) => (
      unit.id === unitId
        ? { ...unit, writing_role: role }
        : unit
    )),
  };
}

export function updateTextUnitMetadata(
  flow: TextBlockContentV1,
  unitId: string,
  metadata: Record<string, unknown>,
): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  return {
    ...nextFlow,
    units: nextFlow.units.map((unit) => (
      unit.id === unitId
        ? { ...unit, metadata: { ...unit.metadata, ...metadata } }
        : unit
    )),
  };
}

export function numberedListOrdinalForUnit(units: TextUnit[], index: number): number {
  const unit = units[index];
  if (!unit || unit.writing_role !== 'numbered_item') return 0;

  let ordinal = 1;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const previous = units[cursor];
    if (previous.indent_level > unit.indent_level) continue;
    if (previous.indent_level < unit.indent_level) break;
    if (previous.writing_role !== 'numbered_item') break;
    ordinal += 1;
  }
  return ordinal;
}

export function textUnitMarkerForDisplay(units: TextUnit[], index: number): string {
  const unit = units[index];
  if (!unit) return '';
  if (unit.writing_role === 'bullet_item') return '-';
  if (unit.writing_role === 'numbered_item') return `${numberedListOrdinalForUnit(units, index)}.`;
  if (unit.writing_role === 'todo_item') return unit.metadata.checked === true ? '[x]' : '[ ]';
  if (unit.writing_role === 'toggle_item') return unit.metadata.collapsed === true ? '>' : 'v';
  return '';
}

export function indentTextUnit(flow: TextBlockContentV1, unitId: string): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  return {
    ...nextFlow,
    units: nextFlow.units.map((unit) => (
      unit.id === unitId
        ? { ...unit, indent_level: clamp(unit.indent_level + 1, 0, MAX_TEXT_UNIT_INDENT) }
        : unit
    )),
  };
}

export function outdentTextUnit(flow: TextBlockContentV1, unitId: string): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  return {
    ...nextFlow,
    units: nextFlow.units.map((unit) => (
      unit.id === unitId
        ? { ...unit, indent_level: clamp(unit.indent_level - 1, 0, MAX_TEXT_UNIT_INDENT) }
        : unit
    )),
  };
}

function leadingIndentLevel(line: string): number {
  const match = line.match(/^[\t ]*/);
  const leading = match?.[0] || '';
  const visualSpaces = leading.replace(/\t/g, '  ').length;
  return clamp(Math.floor(visualSpaces / 2), 0, MAX_TEXT_UNIT_INDENT);
}

function stripIndent(line: string): string {
  return line.replace(/^[\t ]+/, '');
}

function parseLine(line: string, index: number): TextUnit {
  const indentLevel = leadingIndentLevel(line);
  const trimmedStart = stripIndent(line);
  const headingMatch = trimmedStart.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    return createParsedUnit(`tu-${index + 1}`, headingMatch[2], 'heading', indentLevel, index);
  }

  const checkedMatch = trimmedStart.match(/^(?:[-*]\s*)?\[(x|X| )\]\s+(.*)$/);
  if (checkedMatch) {
    return createParsedUnit(
      `tu-${index + 1}`,
      checkedMatch[2],
      'todo_item',
      indentLevel,
      index,
      { checked: checkedMatch[1].toLowerCase() === 'x' },
    );
  }

  const quoteMatch = trimmedStart.match(/^>\s?(.*)$/);
  if (quoteMatch) {
    return createParsedUnit(`tu-${index + 1}`, quoteMatch[1], 'quote', indentLevel, index);
  }

  const bulletMatch = trimmedStart.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    return createParsedUnit(`tu-${index + 1}`, bulletMatch[1], 'bullet_item', indentLevel, index);
  }

  const numberedMatch = trimmedStart.match(/^(?:\d+|[a-zA-Z])[.)]\s+(.+)$/);
  if (numberedMatch) {
    return createParsedUnit(`tu-${index + 1}`, numberedMatch[1], 'numbered_item', indentLevel, index);
  }

  return createParsedUnit(`tu-${index + 1}`, trimmedStart, 'paragraph', indentLevel, index);
}

export function parseTextUnitsFromPlainText(text: string): TextBlockContentV1['units'] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(parseLine)
    .map((unit, index) => ({ ...unit, order_index: index }));
}

function reassignParsedUnitIds(
  parsedUnits: TextUnit[],
  flow: TextBlockContentV1,
): TextUnit[] {
  const existingIds = new Set(flow.units.map((unit) => unit.id));
  let next = maxNumericSuffix([...existingIds], 'tu-') + 1;
  return parsedUnits.map((unit) => {
    let id = `tu-${next}`;
    while (existingIds.has(id)) {
      next += 1;
      id = `tu-${next}`;
    }
    existingIds.add(id);
    next += 1;
    return { ...unit, id };
  });
}

export function pasteTextIntoTextFlow(
  flow: TextBlockContentV1,
  targetUnitId: string,
  offset: number,
  pastedText: string,
): TextBlockContentV1 {
  const nextFlow = cloneFlow(flow);
  const targetIndex = nextFlow.units.findIndex((unit) => unit.id === targetUnitId);
  const parsedUnits = reassignParsedUnitIds(parseTextUnitsFromPlainText(pastedText), nextFlow);
  if (parsedUnits.length === 0) return nextFlow;
  if (targetIndex < 0) {
    return {
      ...nextFlow,
      units: rewriteUnitOrder([...nextFlow.units, ...parsedUnits]),
    };
  }

  const target = nextFlow.units[targetIndex];
  const pasteOffset = clamp(offset, 0, target.text.length);
  const prefix = target.text.slice(0, pasteOffset);
  const suffix = target.text.slice(pasteOffset);
  const firstParsed = parsedUnits[0];
  const firstUnit: TextUnit = {
    ...target,
    text: `${prefix}${firstParsed.text}`,
    metadata: { ...target.metadata, ...firstParsed.metadata },
  };
  const middleUnits = parsedUnits.slice(1);
  const suffixUnit = suffix
    ? [{
      ...cloneUnit(target),
      id: createNextUnitId({
        ...nextFlow,
        units: [...nextFlow.units, ...parsedUnits],
      }),
      text: suffix,
    }]
    : [];

  return {
    ...nextFlow,
    units: rewriteUnitOrder([
      ...nextFlow.units.slice(0, targetIndex),
      firstUnit,
      ...middleUnits,
      ...suffixUnit,
      ...nextFlow.units.slice(targetIndex + 1),
    ]),
  };
}

export function insertPlainTextIntoTextFlow(
  flow: TextBlockContentV1,
  targetUnitId: string,
  offset: number,
  insertedText: string,
): TextBlockContentV1 {
  if (!insertedText.includes('\n') && !insertedText.includes('\r')) {
    const nextFlow = cloneFlow(flow);
    const targetIndex = nextFlow.units.findIndex((unit) => unit.id === targetUnitId);
    if (targetIndex < 0) return nextFlow;
    const target = nextFlow.units[targetIndex];
    const insertOffset = clamp(offset, 0, target.text.length);
    return {
      ...nextFlow,
      units: nextFlow.units.map((unit) => (
        unit.id === targetUnitId
          ? {
            ...unit,
            text: `${unit.text.slice(0, insertOffset)}${insertedText}${unit.text.slice(insertOffset)}`,
          }
          : unit
      )),
    };
  }
  return pasteTextIntoTextFlow(flow, targetUnitId, offset, insertedText);
}

export function splitTextFlowAtUnit(
  flow: TextBlockContentV1,
  unitId: string,
): { before: TextBlockContentV1; after: TextBlockContentV1 } {
  const nextFlow = cloneFlow(flow);
  const targetIndex = nextFlow.units.findIndex((unit) => unit.id === unitId);
  if (targetIndex < 0) {
    return {
      before: nextFlow,
      after: makeFlowFromUnits(nextFlow, []),
    };
  }

  const beforeUnits = nextFlow.units.slice(0, targetIndex);
  const afterUnits = nextFlow.units.slice(targetIndex);

  const before = makeFlowFromUnits(
    nextFlow,
    beforeUnits,
  );
  const after = makeFlowFromUnits(
    nextFlow,
    afterUnits,
  );
  return { before, after };
}

export function mergeTextFlows(
  first: TextBlockContentV1,
  second: TextBlockContentV1,
): TextBlockContentV1 {
  const firstFlow = cloneFlow(first);
  const secondFlow = cloneFlow(second);
  const firstUnitIds = new Set(firstFlow.units.map((unit) => unit.id));
  let nextUnitId = maxNumericSuffix([...firstUnitIds], 'tu-') + 1;
  const secondUnits = secondFlow.units.map((unit) => {
    if (!firstUnitIds.has(unit.id)) return unit;
    const nextUnit = { ...unit, id: `tu-${nextUnitId}` };
    nextUnitId += 1;
    return nextUnit;
  });

  return {
    ...firstFlow,
    units: rewriteUnitOrder([...firstFlow.units, ...secondUnits]),
    inline_structures: [...firstFlow.inline_structures, ...secondFlow.inline_structures],
    metadata: {
      ...firstFlow.metadata,
      ...secondFlow.metadata,
    },
  };
}
