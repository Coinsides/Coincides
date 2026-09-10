import { describe, expect, it } from 'vitest';
import { createTextBlockContentV1 } from './textFlowService';
import { moveTextUnitBetweenFlows } from './textUnitMoveService';

describe('C3 flow insertion boundaries', () => {
  it('leaves both inputs immutable, preserves all unit and inline fields, and orders before the first row', () => {
    const source = createTextBlockContentV1('source', 'quote', { source: true });
    source.units[0].id = 'source';
    source.units[0].indent_level = 3;
    source.units[0].metadata = { nested: { preserve: true } };
    source.inline_structures.push({ id: 'inline', parent_text_unit_id: 'source', semantic_kind: 'inline_source_marker',
      anchor_range: { start: 0, end: 3 }, anchor_text: 'sou', field_values: { source_id: 'synthetic' }, metadata: {}, status: 'active' });
    const target = createTextBlockContentV1('target', 'heading', { target: true });
    const before = structuredClone({ source, target });
    const result = moveTextUnitBetweenFlows(source, 'source', target, 'tu-1', 'before')!;
    expect({ source, target }).toEqual(before);
    expect(result.source).toEqual({ ...source, units: [], inline_structures: [] });
    expect(result.target).toEqual({ ...target, units: [source.units[0], { ...target.units[0], order_index: 1 }],
      inline_structures: source.inline_structures });
    expect(result.idMapping).toEqual({ unit_id: 'source', inline_ids: {} });
  });

  it('rejects missing or deleted rows without losing content', () => {
    const source = createTextBlockContentV1('source'); source.units[0].id = 'source';
    const target = createTextBlockContentV1('target');
    expect(moveTextUnitBetweenFlows(source, 'missing', target, 'tu-1', 'before')).toBeNull();
    expect(moveTextUnitBetweenFlows(source, 'source', target, 'missing', 'before')).toBeNull();
    source.units[0].status = 'deleted';
    expect(moveTextUnitBetweenFlows(source, 'source', target, 'tu-1', 'before')).toBeNull();
    source.units[0].status = 'active'; target.units[0].status = 'deleted';
    expect(moveTextUnitBetweenFlows(source, 'source', target, 'tu-1', 'before')).toBeNull();
  });

  it('moves ordinary tu-1 rows by remapping only collisions, including inline parents, without mutating inputs', () => {
    const source = createTextBlockContentV1('source', 'quote');
    const target = createTextBlockContentV1('target', 'heading');
    expect([source.units[0].id, target.units[0].id]).toEqual(['tu-1', 'tu-1']);
    source.inline_structures.push({ id: 'inline', parent_text_unit_id: 'source', semantic_kind: 'inline_code',
      anchor_range: { start: 0, end: 3 }, anchor_text: 'sou', field_values: { language: 'text' }, metadata: { keep: true }, status: 'active' });
    source.inline_structures[0].parent_text_unit_id = 'tu-1';
    source.inline_structures.push({ ...source.inline_structures[0], id: 'unique-inline' });
    target.inline_structures.push({ ...source.inline_structures[0], parent_text_unit_id: 'tu-1' });
    const before = structuredClone({ source, target });
    const moved = moveTextUnitBetweenFlows(source, 'tu-1', target, 'tu-1', 'before')!;
    expect(moved).not.toBeNull();
    const { unit_id: unitId, inline_ids: inlineIds } = moved.idMapping;
    expect(unitId).not.toBe('tu-1');
    expect(inlineIds.inline).toEqual(expect.any(String));
    expect(inlineIds.inline).not.toBe('inline');
    expect(inlineIds.inline).not.toBe('unique-inline');
    expect(Object.keys(inlineIds)).toEqual(['inline']);
    expect(moved.source).toEqual({ ...source, units: [], inline_structures: [] });
    expect(moved.target.units).toEqual([
      { ...source.units[0], id: unitId }, { ...target.units[0], order_index: 1 },
    ]);
    expect(moved.target.inline_structures).toEqual([
      ...target.inline_structures,
      { ...source.inline_structures[0], id: inlineIds.inline, parent_text_unit_id: unitId },
      { ...source.inline_structures[1], parent_text_unit_id: unitId },
    ]);
    expect({ source, target }).toEqual(before);
  });

  it('remaps an inline collision without renaming the already unique unit or another incoming inline', () => {
    const source = createTextBlockContentV1('source'); source.units[0].id = 'source';
    const target = createTextBlockContentV1('target');
    source.inline_structures.push({ id: 'inline', parent_text_unit_id: 'source', semantic_kind: 'inline_code',
      anchor_range: null, anchor_text: null, field_values: {}, metadata: {}, status: 'active' });
    target.inline_structures.push({ ...source.inline_structures[0], parent_text_unit_id: 'tu-1' });
    const result = moveTextUnitBetweenFlows(source, 'source', target, 'tu-1', 'after')!;
    expect(result.idMapping.unit_id).toBe('source');
    expect(result.idMapping.inline_ids.inline).not.toBe('inline');
    expect(result.target.units[1]).toEqual({ ...source.units[0], order_index: 1 });
    expect(result.target.inline_structures[0]).toEqual(target.inline_structures[0]);
    expect(result.target.inline_structures[1]).toEqual({ ...source.inline_structures[0], id: result.idMapping.inline_ids.inline });
  });
});
