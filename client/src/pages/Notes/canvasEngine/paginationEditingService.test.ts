import { describe, expect, it } from 'vitest';
import { createTextBlockContentV1 } from './textFlowService';
import { pageSliceForCaret, paginateTextFlowSlices, replaceSliceText, logicalSliceSelection, type PositionedPageFlowFragment } from './paginationEditingService';

function fragment(index: number, lines: PositionedPageFlowFragment['lines']): PositionedPageFlowFragment {
  return { id: `b@f${index}`, blockId: 'b', frameId: `f${index}`, startFrameId: 'f0', fragmentIndex: index,
    isFirst: index === 0, isLast: index === 1, textRange: { start: lines[0].startOffset, end: lines[lines.length - 1].endOffset },
    lineRange: { start: 0, end: lines.length }, lines, left: 0, top: index * 120,
    layout: { x: 0, y: 0, width: 180, height: 70, surface: 'formal_page' } };
}
const line = (start: number, end: number) => ({ startOffset: start, endOffset: end, heightPx: 28, lineHeightPx: 22, widthPx: 90 });

describe('A1 pagination editing projection', () => {
  it('maps a unit spanning pages without changing logical identity or text', () => {
    const flow = createTextBlockContentV1('甲乙丙丁戊己');
    const before = JSON.stringify(flow);
    const slices = paginateTextFlowSlices(flow, [fragment(0, [line(0, 3)]), fragment(1, [line(3, 6)])]);
    expect(slices.map((slice) => [slice.start, slice.end, slice.first, slice.textHeight])).toEqual([[0, 3, true, 22], [3, 6, false, 22]]);
    expect(slices.map((slice) => slice.unit.id)).toEqual([flow.units[0].id, flow.units[0].id]);
    expect(JSON.stringify(flow)).toBe(before);
    expect(replaceSliceText(flow.units[0].text, slices[1], '戊增己')).toBe('甲乙丙戊增己');
    expect(logicalSliceSelection(slices[1], 1, 2)).toEqual({ unitId: flow.units[0].id, start: 4, end: 5 });
  });
  it('preserves both visual caret affinities at a page seam', () => {
    const flow = createTextBlockContentV1('abcdef');
    const slices = paginateTextFlowSlices(flow, [fragment(0, [line(0, 3)]), fragment(1, [line(3, 6)])]);
    const point = { unitId: flow.units[0].id, offset: 3 };
    expect(pageSliceForCaret(slices, point, 'forward')?.frameId).toBe('f1');
    expect(pageSliceForCaret(slices, point, 'backward')?.frameId).toBe('f0');
  });
  it.each(['\n', '\r\n'])('keeps a hard %j page-seam break outside the textarea without dropping it from logical edits', (breakText) => {
    const flow = createTextBlockContentV1(`甲乙${breakText}丙丁`);
    const seam = 2 + breakText.length;
    const slices = paginateTextFlowSlices(flow, [fragment(0, [line(0, seam)]), fragment(1, [line(seam, flow.units[0].text.length)])]);
    expect(slices[0]).toMatchObject({ start: 0, end: seam, displayEnd: 2 });
    expect(slices[1]).toMatchObject({ start: seam, end: flow.units[0].text.length, displayEnd: flow.units[0].text.length });
    expect(replaceSliceText(flow.units[0].text, slices[0], '甲乙增')).toBe(`甲乙增${breakText}丙丁`);
    expect(pageSliceForCaret(slices, { unitId: flow.units[0].id, offset: seam })?.frameId).toBe('f1');
  });
  it('excludes logical separators from textarea values and retains page-local unit spacing', () => {
    const base = createTextBlockContentV1('abc');
    const flow = { ...base, units: [base.units[0], { ...base.units[0], id: 'second', text: 'def', order_index: 1 }] };
    const slices = paginateTextFlowSlices(flow, [fragment(0, [line(0, 4), line(4, 7)])]);
    expect(slices.map((slice) => [slice.unit.id, slice.start, slice.end, slice.top])).toEqual([
      [base.units[0].id, 0, 3, 0], ['second', 0, 3, 28],
    ]);
  });
});
