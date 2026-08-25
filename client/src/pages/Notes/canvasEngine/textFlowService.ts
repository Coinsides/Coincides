import type {
  InlineStructuredObject,
  InlineStructuredObjectSemanticKind,
  NoteBlock,
  TextBlockContentV1,
  TextFlowObjectStatus,
  TextFlowProjection,
  TextFlowProjectionAddressableObject,
  TextUnit,
  TextUnitWritingRole,
} from './runtimeDataTypes';

export const TEXT_FLOW_CONTENT_KEY = 'text_flow';
export const TEXT_FLOW_CONTENT_VERSION = 'TextBlockContentV1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function statusValue(value: unknown): TextFlowObjectStatus {
  return value === 'draft' || value === 'deprecated' || value === 'deleted' ? value : 'active';
}

function writingRoleValue(value: unknown): TextUnitWritingRole {
  const role = stringValue(value);
  if (
    role === 'heading'
    || role === 'quote'
    || role === 'bullet_item'
    || role === 'numbered_item'
    || role === 'todo_item'
    || role === 'toggle_item'
    || role === 'code_line'
  ) {
    return role;
  }
  return 'paragraph';
}

function semanticKindValue(value: unknown): InlineStructuredObjectSemanticKind {
  const kind = stringValue(value);
  if (
    kind === 'inline_formula'
    || kind === 'inline_code'
    || kind === 'inline_definition'
    || kind === 'inline_source_marker'
    || kind === 'inline_link'
    || kind === 'inline_concept_mention'
    || kind === 'inline_claim'
  ) {
    return kind;
  }
  return 'custom';
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function normalizeTextUnit(value: unknown, index: number): TextUnit | null {
  if (!isRecord(value)) return null;
  const text = stringValue(value.text);
  const id = stringValue(value.id) || `tu-${index + 1}`;
  return {
    id,
    text,
    writing_role: writingRoleValue(value.writing_role),
    indent_level: Math.max(0, numberValue(value.indent_level, 0)),
    order_index: numberValue(value.order_index, index),
    metadata: recordValue(value.metadata),
    status: statusValue(value.status),
  };
}

function normalizeInlineStructuredObject(value: unknown, index: number): InlineStructuredObject | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id) || `iso-${index + 1}`;
  const parentTextUnitId = stringValue(value.parent_text_unit_id);
  if (!parentTextUnitId) return null;
  const anchorRange = isRecord(value.anchor_range)
    ? {
      start: Math.max(0, numberValue(value.anchor_range.start, 0)),
      end: Math.max(0, numberValue(value.anchor_range.end, 0)),
    }
    : null;
  return {
    id,
    semantic_kind: semanticKindValue(value.semantic_kind),
    parent_text_unit_id: parentTextUnitId,
    anchor_text: stringValue(value.anchor_text) || null,
    anchor_range: anchorRange,
    field_values: recordValue(value.field_values),
    metadata: recordValue(value.metadata),
    status: statusValue(value.status),
  };
}

export function createTextBlockContentV1(
  text: string,
  writingRole: TextUnitWritingRole = 'paragraph',
  metadata: Record<string, unknown> = {},
): TextBlockContentV1 {
  return {
    textflow_version: TEXT_FLOW_CONTENT_VERSION,
    units: [{
      id: 'tu-1',
      text,
      writing_role: writingRole,
      indent_level: 0,
      order_index: 0,
      metadata: {},
      status: 'active',
    }],
    inline_structures: [],
    metadata,
  };
}

export function createEmptyTextBlockContentV1(
  writingRole: TextUnitWritingRole = 'paragraph',
): TextBlockContentV1 {
  return createTextBlockContentV1('', writingRole, {
    creation_mode: 'immediate_text_unit',
  });
}

export function createTextFlowFromDroppedText(text: string): TextBlockContentV1 {
  return createTextBlockContentV1(text.trimEnd(), 'paragraph', {
    projection_source: 'drag_drop_projection',
  });
}

export function readTextFlowContent(content: Record<string, unknown>): {
  textFlow: TextBlockContentV1 | null;
  warnings: string[];
} {
  const candidate = content[TEXT_FLOW_CONTENT_KEY];
  if (!isRecord(candidate)) {
    return {
      textFlow: null,
      warnings: ['TextFlow content missing.'],
    };
  }

  const warnings: string[] = [];
  if (candidate.textflow_version !== TEXT_FLOW_CONTENT_VERSION) {
    warnings.push('Unsupported TextFlow content version.');
  }
  const candidateUnits = Array.isArray(candidate.units) ? candidate.units : null;
  const candidateInlineStructures = Array.isArray(candidate.inline_structures)
    ? candidate.inline_structures
    : null;

  if (!candidateUnits) warnings.push('TextFlow units are missing or malformed.');
  if (!candidateInlineStructures) warnings.push('TextFlow inline structures are missing or malformed.');

  if (warnings.length > 0) {
    return {
      textFlow: null,
      warnings,
    };
  }

  const unitsInput = candidateUnits ?? [];
  const inlineStructuresInput = candidateInlineStructures ?? [];

  const units = unitsInput
    .map(normalizeTextUnit)
    .filter((unit): unit is TextUnit => Boolean(unit))
    .sort((a, b) => a.order_index - b.order_index);
  const inlineStructures = inlineStructuresInput
    .map(normalizeInlineStructuredObject)
    .filter((item): item is InlineStructuredObject => Boolean(item));

  return {
    textFlow: {
      textflow_version: TEXT_FLOW_CONTENT_VERSION,
      units,
      inline_structures: inlineStructures,
      metadata: recordValue(candidate.metadata),
    },
    warnings,
  };
}

export function getTextFlowContent(content: Record<string, unknown>): TextBlockContentV1 | null {
  return readTextFlowContent(content).textFlow;
}

export function replaceTextUnitText(input: {
  textFlow: TextBlockContentV1;
  textUnitId: string;
  nextText: string;
}): TextBlockContentV1 {
  return {
    ...input.textFlow,
    units: input.textFlow.units.map((unit) => (
      unit.id === input.textUnitId
        ? { ...unit, text: input.nextText }
        : unit
    )),
  };
}

export function attachFreshTextFlow(
  content: Record<string, unknown>,
  text: string,
  writingRole: TextUnitWritingRole = 'paragraph',
): Record<string, unknown> {
  return {
    ...content,
    [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(text, writingRole),
  };
}

function buildAddressableObjects(
  ownerBlockId: string | null,
  units: TextUnit[],
  inlineStructures: InlineStructuredObject[],
): TextFlowProjectionAddressableObject[] {
  const unitObjects = units.map((unit): TextFlowProjectionAddressableObject => ({
    kind: 'text_unit',
    id: unit.id,
    parent_id: ownerBlockId,
    label: unit.writing_role,
    text: unit.text,
    metadata: {
      writing_role: unit.writing_role,
      indent_level: unit.indent_level,
      status: unit.status,
    },
  }));

  const inlineObjects = inlineStructures.map((item): TextFlowProjectionAddressableObject => ({
    kind: 'inline_structured_object',
    id: item.id,
    parent_id: item.parent_text_unit_id,
    label: item.semantic_kind,
    text: item.anchor_text || '',
    metadata: {
      semantic_kind: item.semantic_kind,
      anchor_range: item.anchor_range,
      status: item.status,
      field_values: item.field_values,
    },
  }));

  return [...unitObjects, ...inlineObjects];
}

export function projectTextFlowContent(
  content: Record<string, unknown>,
  fallbackPlainText = '',
  ownerBlockId: string | null = null,
): TextFlowProjection {
  const { textFlow, warnings } = readTextFlowContent(content);
  if (!textFlow) {
    const fallback = fallbackPlainText.trimEnd();
    const fallbackFlow = createTextBlockContentV1(fallback, 'paragraph', { projection_source: 'fallback' });
    return {
      textflow_version: TEXT_FLOW_CONTENT_VERSION,
      owner_block_id: ownerBlockId,
      plain_text: fallback,
      text_units: fallback ? fallbackFlow.units : [],
      inline_structures: [],
      addressable_objects: fallback
        ? buildAddressableObjects(ownerBlockId, fallbackFlow.units, [])
        : [],
      debug_warnings: warnings,
    };
  }

  const activeUnits = textFlow.units.filter((unit) => unit.status !== 'deleted');
  const activeInlineStructures = textFlow.inline_structures.filter((item) => item.status !== 'deleted');

  return {
    textflow_version: TEXT_FLOW_CONTENT_VERSION,
    owner_block_id: ownerBlockId,
    plain_text: activeUnits.map((unit) => unit.text).join('\n'),
    text_units: activeUnits,
    inline_structures: activeInlineStructures,
    addressable_objects: buildAddressableObjects(ownerBlockId, activeUnits, activeInlineStructures),
    debug_warnings: warnings,
  };
}

export function projectNoteBlockTextFlow(block: NoteBlock): TextFlowProjection {
  const fallback = typeof block.plain_text === 'string' ? block.plain_text : '';
  return projectTextFlowContent(block.content_json, fallback, block.id);
}
