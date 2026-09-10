import { describe, expect, it, vi } from 'vitest';
import type { AnnotationRangeSnapshot, TextFlowEditTransaction } from './textFlowEditSession';
import { createTextFlowEditSession } from './textFlowEditSession';
import { createTextBlockContentV1 } from './textFlowService';

const flow = (text: string) => createTextBlockContentV1(text);
const selection = (start: number, unitId = 'tu-1') => ({ unitId, start, end: start });
const range = (offset: number): AnnotationRangeSnapshot => ({
  annotationId: 'annotation',
  range: { id: 'range', target_kind: 'text_span', block_id: 'block', text_unit_id: 'tu-1', start_offset: offset, end_offset: offset + 1 },
});
const change = (before: string, after: string, beforePosition = before.length): TextFlowEditTransaction => ({
  noteId: 'note', generation: 1, blockId: 'block',
  metadata: {
    unitId: 'tu-1', inputType: 'insertText', kind: 'typing', isComposing: false,
    beforeSelection: selection(beforePosition), afterSelection: selection(after.length),
  },
  before: { textFlow: flow(before), selection: selection(beforePosition), annotationRanges: [], boardRanges: [] },
  after: { textFlow: flow(after), selection: selection(after.length), annotationRanges: [], boardRanges: [] },
});

describe('one pending TextFlow edit group feeding runtime history', () => {
  it('keeps first before, latest after and first touched range before within one continuous input group', () => {
    const onSeal = vi.fn();
    const session = createTextFlowEditSession({ noteId: 'note', generation: 1, onSeal });
    const first = change('a', 'ab');
    first.before.annotationRanges = [range(1)];
    first.after.annotationRanges = [range(2)];
    const second = change('ab', 'abc');
    second.before.annotationRanges = [range(2)];
    second.after.annotationRanges = [range(3)];
    session.record(first);
    session.record(second);
    expect(onSeal).not.toHaveBeenCalled();
    session.seal();
    expect(onSeal).toHaveBeenCalledTimes(1);
    expect(onSeal.mock.calls[0][0]).toMatchObject({
      before: { textFlow: flow('a'), annotationRanges: [range(1)] },
      after: { textFlow: flow('abc'), annotationRanges: [range(3)] },
    });
  });

  it.each(['selection', 'unit', 'category', 'paste', 'structure', 'layout'] as const)(
    'separates input across a %s boundary', (boundary) => {
      const onSeal = vi.fn();
      const session = createTextFlowEditSession({ noteId: 'note', generation: 1, onSeal });
      session.record(change('a', 'ab'));
      const next = change('ab', 'abc');
      if (boundary === 'selection') next.metadata.beforeSelection = selection(0);
      if (boundary === 'unit') next.metadata.unitId = 'tu-2';
      if (boundary === 'category') next.metadata.inputType = 'deleteContentBackward';
      if (boundary === 'paste') next.metadata.inputType = 'insertFromPaste';
      if (boundary === 'structure') next.metadata.kind = 'structural';
      if (boundary === 'layout') session.seal();
      session.record(next);
      session.seal();
      expect(onSeal).toHaveBeenCalledTimes(2);
      expect(onSeal.mock.calls[0][0].after.textFlow).toEqual(flow('ab'));
      expect(onSeal.mock.calls[1][0].before.textFlow).toEqual(flow('ab'));
    },
  );

  it('holds composition despite intermediate selection changes and seal requests, then emits one complete input', () => {
    const onSeal = vi.fn();
    const session = createTextFlowEditSession({ noteId: 'note', generation: 1, onSeal });
    session.beginComposition();
    const first = change('', 'n');
    first.metadata.isComposing = true;
    first.metadata.inputType = 'insertCompositionText';
    session.record(first);
    expect(session.seal()).toBe(false);
    const second = change('n', '你', 0);
    second.metadata.isComposing = true;
    second.metadata.inputType = 'insertCompositionText';
    session.record(second);
    expect(onSeal).not.toHaveBeenCalled();
    session.endComposition();
    expect(onSeal).toHaveBeenCalledTimes(1);
    expect(onSeal.mock.calls[0][0]).toMatchObject({ before: { textFlow: flow('') }, after: { textFlow: flow('你') } });
  });

  it('rejects a mismatched Note or generation without leaking it into the active pending group', () => {
    const onSeal = vi.fn();
    const session = createTextFlowEditSession({ noteId: 'note', generation: 2, onSeal });
    expect(session.record(change('a', 'ab'))).toBe(false);
    expect(session.record({ ...change('a', 'ab'), noteId: 'other', generation: 2 })).toBe(false);
    expect(session.record({ ...change('a', 'ab'), generation: 2 })).toBe(true);
    session.seal();
    expect(onSeal).toHaveBeenCalledTimes(1);
    expect(onSeal.mock.calls[0][0].generation).toBe(2);
  });
});
