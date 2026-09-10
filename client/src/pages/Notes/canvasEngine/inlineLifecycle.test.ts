import { describe, expect, it } from 'vitest';
import type { InlineStructuredObject, TextBlockContentV1 } from './runtimeDataTypes';
import { createTextBlockContentV1, replaceTextUnitText } from './textFlowService';
import { replaceFlowSelection } from './textFlowSelection';
import {
  insertPlainTextIntoTextFlow,
  mergeTextFlows,
  mergeTextUnitWithPrevious,
  pasteTextIntoTextFlow,
  splitTextFlowAtUnit,
  splitTextUnitAtOffset,
  splitTextUnitForEnter,
} from './textUnitEditorService';

function inline(id: string, parent: string, start: number, end: number): InlineStructuredObject {
  return {
    id, parent_text_unit_id: parent, semantic_kind: 'inline_code',
    anchor_text: 'code', anchor_range: { start, end }, status: 'active',
    field_values: { language: 'text', nested: { retained: true } }, metadata: { retained: 'receipt' },
  };
}

function fixture(): TextBlockContentV1 {
  const flow = createTextBlockContentV1('AAcodeBBcodeCC');
  flow.inline_structures = [inline('left', 'tu-1', 2, 6), inline('right', 'tu-1', 8, 12)];
  return flow;
}

function anchored(
  flow: TextBlockContentV1,
  kind: 'inline_formula' | 'inline_code',
  id: string,
  unitIndex: number,
  start: number,
  end: number,
): InlineStructuredObject {
  const unit = flow.units[unitIndex];
  return {
    ...inline(id, unit.id, start, end),
    semantic_kind: kind,
    anchor_text: unit.text.slice(start, end),
    field_values: kind === 'inline_formula'
      ? { latex: 'x+1', options: { display: false } }
      : { code: 'x+1', options: { language: 'text' } },
    metadata: { retained: id, nested: { source: 'synthetic fixture' } },
  };
}

function expectAttached(flow: TextBlockContentV1, id: string, parent: string, start: number, end: number) {
  const item = flow.inline_structures.find((candidate) => candidate.id === id)!;
  expect(item).toMatchObject({ parent_text_unit_id: parent, anchor_range: { start, end } });
  const unit = flow.units.find((candidate) => candidate.id === parent)!;
  expect(unit).toBeDefined();
  expect(unit.text.slice(start, end)).toBe(item.anchor_text);
}

function expectDegraded(flow: TextBlockContentV1, original: InlineStructuredObject, parent: string) {
  expect(flow.inline_structures.find((item) => item.id === original.id)).toEqual({
    ...original,
    parent_text_unit_id: parent,
    anchor_range: null,
    metadata: {
      ...original.metadata,
      pre_edit_offsets: {
        text_unit_id: original.parent_text_unit_id,
        start_offset: original.anchor_range!.start,
        end_offset: original.anchor_range!.end,
        range_text_cache: original.anchor_text,
      },
    },
  });
}

describe('B8 inline lifecycle', () => {
  it('smoke 1: splitting a flow retains each unit’s inline instead of clearing it', () => {
    const flow = fixture();
    flow.units.push({ ...flow.units[0], id: 'tu-2', order_index: 1 });
    flow.inline_structures[1].parent_text_unit_id = 'tu-2';
    const { before, after } = splitTextFlowAtUnit(flow, 'tu-2');
    expect(before.inline_structures).toEqual([flow.inline_structures[0]]);
    expect(after.inline_structures).toEqual([flow.inline_structures[1]]);
  });

  it('smoke 1: splitting a unit moves the suffix inline with local offsets', () => {
    const flow = fixture();
    const result = splitTextUnitAtOffset(flow, 'tu-1', 7);
    expect(result.inline_structures).toEqual([
      flow.inline_structures[0],
      { ...flow.inline_structures[1], parent_text_unit_id: result.units[1].id, anchor_range: { start: 1, end: 5 } },
    ]);
  });

  it('smoke 2: merging flows remaps colliding parent and inline identities', () => {
    const first = fixture();
    const second = fixture();
    const result = mergeTextFlows(first, second);
    expect(result.inline_structures.slice(2).map((item) => item.parent_text_unit_id)).toEqual([
      result.units[1].id, result.units[1].id,
    ]);
    expect(new Set(result.inline_structures.map((item) => item.id)).size).toBe(4);
  });

  it('smoke 2: merging units rebases the removed parent’s inline by prefix length', () => {
    const flow = fixture();
    flow.units.unshift({ ...flow.units[0], id: 'prefix', text: 'PRE' });
    const result = mergeTextUnitWithPrevious(flow, 'tu-1');
    expect(result.inline_structures).toEqual(flow.inline_structures.map((item) => ({
      ...item, parent_text_unit_id: 'prefix',
      anchor_range: { start: item.anchor_range!.start + 3, end: item.anchor_range!.end + 3 },
    })));
  });

  describe.each(['inline_formula', 'inline_code'] as const)('%s', (kind) => {
    it.each([
      { split: 1, owner: 1, start: 1, end: 5 },
      { split: 2, owner: 1, start: 0, end: 4 },
      { split: 6, owner: 0, start: 2, end: 6 },
      { split: 7, owner: 0, start: 2, end: 6 },
    ])('keeps the whole anchor when splitting at $split', ({ split, owner, start, end }) => {
      const flow = createTextBlockContentV1('AAtermZZ');
      flow.inline_structures = [anchored(flow, kind, 'term', 0, 2, 6)];
      const original = structuredClone(flow);
      const result = splitTextUnitAtOffset(flow, 'tu-1', split);
      expect(result.units.map((unit) => unit.text).join('')).toBe('AAtermZZ');
      expectAttached(result, 'term', result.units[owner].id, start, end);
      expect(result.inline_structures[0]).toMatchObject({
        field_values: original.inline_structures[0].field_values,
        metadata: original.inline_structures[0].metadata,
        semantic_kind: kind,
        status: 'active',
      });
      expect(flow).toEqual(original);
    });

    it('retains a crossing anchor and its original evidence without claiming a clipped range', () => {
      const flow = createTextBlockContentV1('AAtermZZ');
      flow.inline_structures = [anchored(flow, kind, 'term', 0, 2, 6)];
      const original = structuredClone(flow);
      const result = splitTextUnitAtOffset(flow, 'tu-1', 4);
      expect(result.units.map((unit) => unit.text)).toEqual(['AAte', 'rmZZ']);
      expectDegraded(result, original.inline_structures[0], result.units[0].id);
      expect(flow).toEqual(original);
    });

    it.each(['enter', 'paste'] as const)('%s replaces a selection while preserving both surviving anchors', (operation) => {
      const flow = createTextBlockContentV1('AAtermBBtailCC');
      flow.inline_structures = [
        anchored(flow, kind, 'prefix', 0, 2, 6),
        anchored(flow, kind, 'suffix', 0, 8, 12),
        anchored(flow, kind, 'crossing', 0, 5, 9),
        anchored(flow, kind, 'removed', 0, 6, 8),
      ];
      const original = structuredClone(flow);
      const result = operation === 'enter'
        ? splitTextUnitForEnter(flow, 'tu-1', 6, 8)
        : pasteTextIntoTextFlow(flow, 'tu-1', 6, 'one\ntwo', 8);
      expect(result.units.map((unit) => unit.text)).toEqual(operation === 'enter'
        ? ['AAterm', 'tailCC'] : ['AAtermone', 'two', 'tailCC']);
      expect(result.inline_structures).toHaveLength(4);
      expectAttached(result, 'prefix', result.units[0].id, 2, 6);
      expectAttached(result, 'suffix', result.units[result.units.length - 1].id, 0, 4);
      expectDegraded(result, original.inline_structures[2], result.units[0].id);
      expectDegraded(result, original.inline_structures[3], result.units[0].id);
      expect(flow).toEqual(original);
    });

    it.each([
      { operation: 'insert before', text: 'XAAtermZZ', start: 3, end: 7 },
      { operation: 'insert at start boundary', text: 'AAXtermZZ', start: 3, end: 7 },
      { operation: 'insert at end boundary', text: 'AAtermXZZ', start: 2, end: 6 },
      { operation: 'insert after', text: 'AAtermZZX', start: 2, end: 6 },
      { operation: 'delete before', text: 'AtermZZ', start: 1, end: 5 },
      { operation: 'delete after', text: 'AAtermZ', start: 2, end: 6 },
    ])('$operation moves only the coordinates and preserves the anchored text', ({ text, start, end }) => {
      const flow = createTextBlockContentV1('AAtermZZ');
      flow.inline_structures = [anchored(flow, kind, 'term', 0, 2, 6)];
      const original = structuredClone(flow);
      const result = replaceTextUnitText({ textFlow: flow, textUnitId: 'tu-1', nextText: text });
      expect(result.units[0].text).toBe(text);
      expectAttached(result, 'term', 'tu-1', start, end);
      expect(result.inline_structures[0]).toEqual({
        ...original.inline_structures[0], anchor_range: { start, end },
      });
      expect(flow).toEqual(original);
    });

    it.each([
      { operation: 'insert inside', text: 'AAteXrmZZ' },
      { operation: 'delete inside', text: 'AAtmZZ' },
      { operation: 'delete across start', text: 'ArmZZ' },
      { operation: 'delete across end', text: 'AAteZ' },
      { operation: 'replace whole anchor', text: 'AAnewZZ' },
    ])('$operation degrades with the intact original payload', ({ text }) => {
      const flow = createTextBlockContentV1('AAtermZZ');
      flow.inline_structures = [anchored(flow, kind, 'term', 0, 2, 6)];
      const original = structuredClone(flow);
      const result = replaceTextUnitText({ textFlow: flow, textUnitId: 'tu-1', nextText: text });
      expect(result.units[0].text).toBe(text);
      expectDegraded(result, original.inline_structures[0], 'tu-1');
      expect(flow).toEqual(original);
    });

    it('uses the explicit insertion position when repeated text makes a diff ambiguous', () => {
      const flow = createTextBlockContentV1('aaaaaa');
      flow.inline_structures = [anchored(flow, kind, 'term', 0, 2, 4)];
      const before = insertPlainTextIntoTextFlow(flow, 'tu-1', 0, 'a');
      const inside = insertPlainTextIntoTextFlow(flow, 'tu-1', 3, 'a');
      expect(before.units[0].text).toBe(inside.units[0].text);
      expectAttached(before, 'term', 'tu-1', 3, 5);
      expectDegraded(inside, flow.inline_structures[0], 'tu-1');
    });

    it('uses an explicit range replacement before a repeated-text anchor', () => {
      const flow = createTextBlockContentV1('aaaaaa');
      flow.inline_structures = [anchored(flow, kind, 'term', 0, 2, 4)];
      const result = replaceTextUnitText({
        textFlow: flow, textUnitId: 'tu-1', nextText: 'aaaaaaa',
        edit: { editedStartOffset: 0, editedEndOffset: 1, replacementText: 'aa' },
      });
      expectAttached(result, 'term', 'tu-1', 3, 5);
    });

    it.each([
      { start: 3, end: 3, replacement: '' },
      { start: 3, end: 5, replacement: 'er' },
    ])('preserves the anchor for an unchanged selection replacement at $start:$end', ({ start, end, replacement }) => {
      const flow = createTextBlockContentV1('AAtermZZ');
      flow.inline_structures = [anchored(flow, kind, 'term', 0, 2, 6)];
      const original = structuredClone(flow);
      const result = replaceFlowSelection(flow, {
        anchor: { unitId: 'tu-1', offset: start }, focus: { unitId: 'tu-1', offset: end },
      }, replacement)!;
      expect(result.flow).toEqual(original);
      expectAttached(result.flow, 'term', 'tu-1', 2, 6);
      expect(flow).toEqual(original);
    });

    it('keeps prefix and suffix anchors during cross-unit replacement and retains removed anchors as evidence', () => {
      const flow = createTextBlockContentV1('AAtermBB');
      flow.units.push(
        { ...flow.units[0], id: 'middle', text: 'middle', order_index: 1 },
        { ...flow.units[0], id: 'last', text: 'QQtailCC', order_index: 2 },
        { ...flow.units[0], id: 'outside', text: 'unaffected', order_index: 3 },
      );
      flow.inline_structures = [
        anchored(flow, kind, 'prefix', 0, 2, 6),
        anchored(flow, kind, 'first-removed', 0, 6, 8),
        anchored(flow, kind, 'middle-removed', 1, 1, 4),
        anchored(flow, kind, 'last-removed', 2, 0, 2),
        anchored(flow, kind, 'suffix', 2, 2, 6),
        anchored(flow, kind, 'outside', 3, 0, 10),
      ];
      const original = structuredClone(flow);
      const replacement = replaceFlowSelection(flow, {
        anchor: { unitId: 'tu-1', offset: 6 }, focus: { unitId: 'last', offset: 2 },
      }, 'NEW')!;
      expect(replacement.caret).toEqual({ unitId: 'tu-1', offset: 9 });
      expect(replacement.flow.units.map((unit) => unit.text)).toEqual(['AAtermNEWtailCC', 'unaffected']);
      expect(replacement.flow.inline_structures).toHaveLength(6);
      expectAttached(replacement.flow, 'prefix', 'tu-1', 2, 6);
      expectAttached(replacement.flow, 'suffix', 'tu-1', 9, 13);
      expectAttached(replacement.flow, 'outside', 'outside', 0, 10);
      original.inline_structures.slice(1, 4).forEach((item) => expectDegraded(replacement.flow, item, 'tu-1'));
      expect(flow).toEqual(original);
    });

    it('avoids generated IDs already owned by the second flow and remaps only its colliding identities', () => {
      const first = createTextBlockContentV1('AAtermZZ');
      const second = createTextBlockContentV1('BBtailCC');
      second.units.push({ ...second.units[0], id: 'tu-2', text: 'QQkeptRR', order_index: 1 });
      first.inline_structures = [anchored(first, kind, 'iso-1', 0, 2, 6)];
      second.inline_structures = [
        anchored(second, kind, 'iso-1', 0, 2, 6),
        anchored(second, kind, 'iso-2', 1, 2, 6),
      ];
      const originalFirst = structuredClone(first);
      const originalSecond = structuredClone(second);
      const result = mergeTextFlows(first, second);
      expect(result.units.map((unit) => unit.text)).toEqual(['AAtermZZ', 'BBtailCC', 'QQkeptRR']);
      expect(new Set(result.units.map((unit) => unit.id)).size).toBe(3);
      expect(new Set(result.inline_structures.map((item) => item.id)).size).toBe(3);
      expect(result.units[2].id).toBe('tu-2');
      expect(result.inline_structures[0]).toEqual(originalFirst.inline_structures[0]);
      expect(result.inline_structures[2]).toEqual(originalSecond.inline_structures[1]);
      const remapped = result.inline_structures[1];
      expect(remapped.id).not.toBe('iso-1');
      expect(remapped.id).not.toBe('iso-2');
      expectAttached(result, remapped.id, result.units[1].id, 2, 6);
      expect(remapped).toEqual({
        ...originalSecond.inline_structures[0], id: remapped.id, parent_text_unit_id: result.units[1].id,
      });
      expect(first).toEqual(originalFirst);
      expect(second).toEqual(originalSecond);
    });

    it('preserves null anchors, lifecycle statuses and the earliest degradation evidence across later edits and merge', () => {
      const flow = createTextBlockContentV1('AAtermZZ');
      const evidence = { text_unit_id: 'historical-unit', start_offset: 7, end_offset: 11, range_text_cache: 'term' };
      flow.inline_structures = [
        { ...anchored(flow, kind, 'null', 0, 2, 6), anchor_range: null, status: 'draft',
          metadata: { retained: 'null payload', pre_edit_offsets: evidence } },
        { ...anchored(flow, kind, 'deprecated', 0, 2, 6), status: 'deprecated',
          metadata: { retained: 'deprecated payload', pre_edit_offsets: evidence } },
        { ...anchored(flow, kind, 'deleted', 0, 2, 6), status: 'deleted' },
      ];
      const original = structuredClone(flow);
      const edited = replaceTextUnitText({ textFlow: flow, textUnitId: 'tu-1', nextText: 'AAteXrmZZ' });
      const editedAgain = replaceTextUnitText({ textFlow: edited, textUnitId: 'tu-1', nextText: 'PAAteXrmZZ' });
      editedAgain.units.unshift({ ...editedAgain.units[0], id: 'prefix', text: 'PRE' });
      const result = mergeTextUnitWithPrevious(editedAgain, 'tu-1');
      expect(result.inline_structures).toHaveLength(3);
      expect(result.inline_structures[0]).toEqual({ ...original.inline_structures[0], parent_text_unit_id: 'prefix' });
      expect(result.inline_structures[1]).toEqual({
        ...original.inline_structures[1], parent_text_unit_id: 'prefix', anchor_range: null,
      });
      expectDegraded(result, original.inline_structures[2], 'prefix');
      expect(flow).toEqual(original);
    });

    it('restores every inline field after an untouched split and rejoin, including non-active and null records', () => {
      const flow = createTextBlockContentV1('AAtermZZ');
      flow.inline_structures = [
        anchored(flow, kind, 'active', 0, 2, 6),
        { ...anchored(flow, kind, 'deprecated', 0, 2, 6), status: 'deprecated' },
        { ...anchored(flow, kind, 'deleted', 0, 2, 6), status: 'deleted' },
        { ...anchored(flow, kind, 'null', 0, 2, 6), anchor_range: null, anchor_text: null, status: 'draft' },
      ];
      const original = structuredClone(flow);
      const split = splitTextUnitAtOffset(flow, 'tu-1', 1);
      ['active', 'deprecated', 'deleted'].forEach((id) => expectAttached(split, id, split.units[1].id, 1, 5));
      expect(split.inline_structures[3]).toEqual(original.inline_structures[3]);
      const joined = mergeTextUnitWithPrevious(split, split.units[1].id);
      expect(joined.inline_structures).toEqual(original.inline_structures);
      expect(joined.units.map((unit) => unit.text)).toEqual(['AAtermZZ']);
      expect(flow).toEqual(original);
    });
  });
});
