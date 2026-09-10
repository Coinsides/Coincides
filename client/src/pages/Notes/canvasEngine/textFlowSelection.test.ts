import { describe, expect, it } from 'vitest';
import type { TextBlockContentV1, TextUnit } from './runtimeDataTypes';
import {
  flowSelectionText,
  orderedFlowSelection,
  replaceFlowSelection,
  type FlowSelection,
} from './textFlowSelection';

function makeFlow(texts = ['alpha', 'beta', 'gamma']): TextBlockContentV1 {
  return {
    textflow_version: 'TextBlockContentV1',
    units: texts.map((text, index): TextUnit => ({
      id: `unit-${index}`,
      text,
      writing_role: index === 0 ? 'todo_item' : 'paragraph',
      indent_level: index + 1,
      order_index: index,
      metadata: { checked: true, nested: { tag: `metadata-${index}` } },
      status: index === 1 ? 'draft' : 'active',
    })),
    inline_structures: [{
      id: 'inline-1',
      semantic_kind: 'inline_code',
      parent_text_unit_id: 'unit-1',
      anchor_text: 'et',
      anchor_range: { start: 1, end: 3 },
      field_values: { language: 'text' },
      metadata: { retained: true },
      status: 'active',
    }],
    metadata: { writing: { language: 'en' } },
  };
}

function selection(startUnit: number, start: number, endUnit: number, end: number): FlowSelection {
  return {
    anchor: { unitId: `unit-${startUnit}`, offset: start },
    focus: { unitId: `unit-${endUnit}`, offset: end },
  };
}

describe('flow selection ranges', () => {
  it('normalizes reverse endpoints in complete flow order without changing the selection', () => {
    const flow = makeFlow();
    flow.units[0].order_index = 90;
    flow.units[1].order_index = 10;
    const range = selection(2, 3, 0, 2);
    expect(orderedFlowSelection(flow, range)).toEqual({
      start: { unitId: 'unit-0', offset: 2 },
      end: { unitId: 'unit-2', offset: 3 },
      startIndex: 0,
      endIndex: 2,
    });
    expect(range).toEqual(selection(2, 3, 0, 2));
    expect(flowSelectionText(flow, range)).toBe('pha\nbeta\ngam');
  });

  it('orders endpoints within one unit and uses UTF-16 textarea offsets', () => {
    const flow = makeFlow(['A😀B']);
    const range = selection(0, 3, 0, 1);
    expect(flowSelectionText(flow, range)).toBe('😀');
    expect(replaceFlowSelection(flow, range, '字')?.flow.units[0].text).toBe('A字B');
  });

  it('clamps out-of-range and fractional endpoints before copying or replacing', () => {
    const flow = makeFlow();
    const range = selection(0, -3, 2, 99);
    expect(flowSelectionText(flow, range)).toBe('alpha\nbeta\ngamma');
    expect(orderedFlowSelection(flow, selection(0, 2.8, 0, Infinity))).toMatchObject({
      start: { offset: 2 },
      end: { offset: 5 },
    });
    expect(orderedFlowSelection(flow, selection(0, NaN, 0, -Infinity))).toMatchObject({
      start: { offset: 0 },
      end: { offset: 0 },
    });
    expect(replaceFlowSelection(flow, range, 'all')?.caret).toEqual({ unitId: 'unit-0', offset: 3 });
  });

  it('includes empty units and the selected boundary newline', () => {
    const flow = makeFlow(['alpha', '', 'gamma']);
    const range = selection(0, 5, 2, 0);
    expect(flowSelectionText(flow, range)).toBe('\n\n');
    const result = replaceFlowSelection(flow, range, '');
    expect(result?.flow.units.map((unit) => unit.text)).toEqual(['alphagamma']);
    expect(result?.caret).toEqual({ unitId: 'unit-0', offset: 5 });
  });

  it('returns no range or replacement for missing endpoints or an empty flow', () => {
    for (const flow of [makeFlow(), makeFlow([])]) {
      for (const range of [selection(0, 1, 8, 2), selection(8, 1, 0, 2)]) {
        expect(orderedFlowSelection(flow, range)).toBeNull();
        expect(flowSelectionText(flow, range)).toBe('');
        expect(replaceFlowSelection(flow, range, 'lost')).toBeNull();
      }
    }
  });
});

describe('flow selection replacement', () => {
  it('deletes a multi-unit range, preserving the prefix, suffix and unaffected units', () => {
    const flow = makeFlow(['before', 'first', 'middle', 'last', 'after']);
    const result = replaceFlowSelection(flow, selection(1, 2, 3, 2), '');
    expect(result?.flow.units.map((unit) => [unit.id, unit.text, unit.order_index])).toEqual([
      ['unit-0', 'before', 0],
      ['unit-1', 'fist', 1],
      ['unit-4', 'after', 2],
    ]);
    expect(result?.caret).toEqual({ unitId: 'unit-1', offset: 2 });
  });

  it('replaces a reverse range at its earlier endpoint', () => {
    const result = replaceFlowSelection(makeFlow(), selection(2, 2, 0, 2), 'XY');
    expect(result?.flow.units.map((unit) => unit.text)).toEqual(['alXYmma']);
    expect(result?.caret).toEqual({ unitId: 'unit-0', offset: 4 });
  });

  it('keeps one empty first unit after deleting all text', () => {
    const flow = makeFlow();
    const result = replaceFlowSelection(flow, selection(0, 0, 2, 5), '');
    expect(result?.flow.units).toEqual([{ ...flow.units[0], text: '' }]);
    expect(result?.caret).toEqual({ unitId: 'unit-0', offset: 0 });
  });

  it('can insert at a collapsed selection in an empty unit', () => {
    const flow = makeFlow(['', 'after']);
    const range = selection(0, 0, 0, 0);
    expect(flowSelectionText(flow, range)).toBe('');
    const result = replaceFlowSelection(flow, range, 'text');
    expect(result?.flow.units.map((unit) => unit.text)).toEqual(['text', 'after']);
    expect(result?.caret).toEqual({ unitId: 'unit-0', offset: 4 });
  });

  it('preserves all first-unit, flow and inline fields without mutating the source', () => {
    const flow = makeFlow();
    const before = structuredClone(flow);
    const result = replaceFlowSelection(flow, selection(0, 1, 2, 2), 'new');
    expect(result?.flow).toEqual({
      ...before,
      units: [{ ...before.units[0], text: 'anewmma' }],
    });
    expect(flow).toEqual(before);
    expect(result?.flow).not.toBe(flow);
    expect(result?.flow.units[0]).not.toBe(flow.units[0]);
  });

  it('copies without changing any source fields', () => {
    const flow = makeFlow();
    const before = structuredClone(flow);
    expect(flowSelectionText(flow, selection(0, 1, 2, 2))).toBe('lpha\nbeta\nga');
    expect(flow).toEqual(before);
  });
});
