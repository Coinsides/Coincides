import { describe, expect, it } from 'vitest';
import { applyHeadingInputAtLine, headingStructureRequestForEdit, normalizeHeadingTextFlow } from './headingInputService';
import { createTextBlockContentV1 } from './textFlowService';

describe('A4 logical heading line boundaries', () => {
  it.each([1, 2, 3])('recognizes heading %i after a paragraph hard newline and preserves an inline address', (level) => {
    const value = 'Body\n' + '#'.repeat(level);
    const flow = createTextBlockContentV1(value);
    flow.inline_structures = [{ id: 'inline-body', semantic_kind: 'inline_code', parent_text_unit_id: 'tu-1',
      anchor_text: 'Body', anchor_range: { start: 0, end: 4 }, field_values: {}, metadata: {}, status: 'active' }];
    const request = applyHeadingInputAtLine(flow, 'tu-1', value + ' ', value.length + 1)!;
    expect(request.nextTextFlow.units.map((unit) => [unit.text, unit.writing_role])).toEqual([['Body', 'paragraph'], ['', `heading_${level}`]]);
    expect(request.headingUnitId).toBe(request.nextTextFlow.units[1].id);
    expect(request.focus).toEqual({ unitId: request.headingUnitId, caret: 0 });
    expect(request.nextTextFlow.inline_structures).toEqual(flow.inline_structures);
    expect(flow.units).toHaveLength(1);
  });
  it('normalizes a multiline heading edit and follows its caret into the body unit', () => {
    const previous = createTextBlockContentV1('Title', 'heading_2');
    const next = createTextBlockContentV1('Title\nBody', 'heading_2');
    const request = headingStructureRequestForEdit(previous, next, { unitId: 'tu-1', caret: 10 })!;
    expect(request.nextTextFlow.units.map((unit) => [unit.text, unit.writing_role])).toEqual([['Title', 'heading_2'], ['Body', 'paragraph']]);
    expect(request.focus).toEqual({ unitId: request.nextTextFlow.units[1].id, caret: 4 });
    expect(normalizeHeadingTextFlow(request.nextTextFlow, request.focus).flow).toBe(request.nextTextFlow);
  });
  it('keeps ordinary typing in a standalone heading on its ordinary edit path', () => {
    expect(headingStructureRequestForEdit(createTextBlockContentV1('A', 'heading_1'), createTextBlockContentV1('AB', 'heading_1'),
      { unitId: 'tu-1', caret: 2 })).toBeNull();
  });
});
