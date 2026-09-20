import { describe, expect, it } from 'vitest';
import { createPrimaryPageFrame } from './engineModel';
import { createPageStackFromFrame } from './pageStackCollectionService';
import {
  resolveDocumentPageFlowPlan, type PageFlowBlock, type PageFlowLine,
  type ResolveDocumentPageFlowPlanInput,
} from './documentPageFlowService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';
import type { PageFrameCollectionModel, PageFrameModel } from './types';

function frame(id: string, width = 100, height = 80, y = 0): PageFrameModel {
  return { ...createPrimaryPageFrame({ id, y }), width: width + 20, height: height + 20,
    contentInset: { top: 10, right: 10, bottom: 10, left: 10 } };
}

function collection(frames = [frame('p1')]): PageFrameCollectionModel {
  return { pageFrames: frames, primaryFrameId: frames[0]!.id, selectedFrameId: frames[0]!.id,
    primaryStackId: 'stack', selectedStackId: 'stack',
    pageStacks: [{ ...createPageStackFromFrame(frames[0]!, { id: 'stack' }), frameIds: frames.map((item) => item.id) }] };
}

function block(blockId: string, text = '甲'.repeat(60), overrides: Partial<PageFlowBlock> = {}): PageFlowBlock {
  return { blockId, kind: 'text', text,
    layout: { x: 0, y: 777, width: 999, height: 40, width_mode: 'auto',
      frame_id: 'p1', coordinate_space: 'page_frame_local', surface: 'formal_page' }, ...overrides };
}

// Fixed glyph geometry isolates pagination from the estimator's font choices.
const measure: NonNullable<ResolveDocumentPageFlowPlanInput['measureTextLines']> = (input) => {
  const columns = Math.max(1, Math.floor((input.width - 20 - (input.indentLevel || 0) * 24) / 10));
  const lines: PageFlowLine[] = [];
  for (let start = input.startOffset || 0; start < input.text.length; start += columns) {
    const end = Math.min(input.text.length, start + columns);
    lines.push({ startOffset: start, endOffset: end, widthPx: (end - start) * 10, heightPx: 20, lineHeightPx: 20 });
  }
  if (lines.length === 0) lines.push({ startOffset: 0, endOffset: 0, widthPx: 0, heightPx: 20 });
  return { lines };
};

function plan(blocks: PageFlowBlock[], frames?: PageFrameModel[]) {
  return resolveDocumentPageFlowPlan({ collection: collection(frames), blocks, measureTextLines: measure });
}

describe('A1 document pagination projection', () => {
  it('splits only at complete measured lines, covers all text once, and derives deterministic new pages', () => {
    const input = { collection: collection(), blocks: [block('text')], measureTextLines: measure };
    const before = structuredClone({ collection: input.collection, blocks: input.blocks });
    const output = resolveDocumentPageFlowPlan(input);
    expect(output.fragments.map((fragment) => fragment.textRange)).toEqual([
      { start: 0, end: 24 }, { start: 24, end: 48 }, { start: 48, end: 60 },
    ]);
    expect(output.fragments.map((fragment) => fragment.lineRange)).toEqual([
      { start: 0, end: 3 }, { start: 3, end: 6 }, { start: 6, end: 8 },
    ]);
    expect(output.fragments.map((fragment) => input.blocks[0]!.text!.slice(fragment.textRange!.start, fragment.textRange!.end)).join(''))
      .toBe(input.blocks[0]!.text);
    expect(output.frames).toHaveLength(3);
    expect(output.appendedFrameIds).toHaveLength(2);
    expect(output.fragments.every((fragment) => fragment.startFrameId === 'p1')).toBe(true);
    expect(resolveDocumentPageFlowPlan(input)).toEqual(output);
    expect({ collection: input.collection, blocks: input.blocks }).toEqual(before);
  });

  it('rewraps remaining text at each target page width and inset, using only derived auto width', () => {
    const output = plan([block('text')], [frame('p1'), frame('p2', 60, 80, 180)]);
    expect(output.fragments.map((fragment) => fragment.layout.width)).toEqual([100, 60, 60, 60]);
    expect(output.fragments.map((fragment) => fragment.textRange)).toEqual([
      { start: 0, end: 24 }, { start: 24, end: 36 }, { start: 36, end: 48 }, { start: 48, end: 60 },
    ]);
    expect(output.fragments.every((fragment) => fragment.layout.width !== 999)).toBe(true);
  });

  it('converges after generated pages are saved and preserves the stack gap', () => {
    const input = collection();
    input.pageStacks![0]!.layout.gap = 140;
    const blocks = [block('long')];
    const output = resolveDocumentPageFlowPlan({ collection: input, blocks, measureTextLines: measure });
    expect(output.frames[1]!.frame.y).toBe(output.frames[0]!.frame.y + output.frames[0]!.frame.height + 140);
    const next = resolveDocumentPageFlowPlan({ collection: output.collection, blocks, measureTextLines: measure });
    expect(next.fragments).toEqual(output.fragments);
    expect(next.appendedFrameIds).toEqual([]);
    expect(next.placementUpdates).toEqual([]);
  });

  it('preserves stored x while deriving width from the target frame', () => {
    const source = block('indented');
    source.layout.x = 20;
    const output = plan([source]);
    expect(output.fragments[0]!.layout).toMatchObject({ x: 20, y: 0, width: 80 });
    expect(source.layout).toMatchObject({ x: 20, y: 777, width: 999 });
  });

  it.each(['media', 'projection', 'component'] as const)('moves an indivisible %s to an empty page', (kind) => {
    const first = block('first', '甲');
    const atom = block('atom', '', { kind });
    atom.layout.height = 60;
    const output = plan([first, atom]);
    expect(output.fragments).toHaveLength(2);
    expect(output.fragments[1]).toMatchObject({ isFirst: true, isLast: true, textRange: null,
      layout: { y: 0, height: 60 } });
    expect(output.fragments[1]!.frameId).not.toBe('p1');
    expect(output.overflows).toEqual([]);
  });

  it('keeps an overheight indivisible block alone, reports overflow, and continues on the following page', () => {
    const atom = block('large', '', { kind: 'media' });
    atom.layout.height = 130;
    const output = plan([block('before', '甲'), atom, block('after', '乙')]);
    expect(output.frames.map((item) => item.fragments.map((fragment) => fragment.blockId))).toEqual([
      ['before'], ['large'], ['after'],
    ]);
    expect(output.overflows).toEqual([expect.objectContaining({ kind: 'indivisible_block_exceeds_page',
      blockId: 'large', requiredHeight: 130, availableHeight: 80, overflowPx: 50 })]);
    expect(output.fragments[1]!.layout.height).toBe(130);
  });

  it('reports a taller-than-page text row without clipping or infinite pagination', () => {
    const output = plan([block('tall', '甲乙')], [frame('p1', 100, 30)]);
    expect(output.frames).toHaveLength(1);
    expect(output.fragments[0]!.textRange).toEqual({ start: 0, end: 2 });
    expect(output.overflows[0]).toMatchObject({ kind: 'text_line_exceeds_page', requiredHeight: 42, availableHeight: 30 });
  });

  it('includes first-fragment furniture in page fit decisions without repeating it on continuations', () => {
    const output = plan([block('first', '甲'), block('sourced', '乙'.repeat(48), { firstFragmentExtraHeight: 34 })]);
    const sourced = output.fragments.filter((fragment) => fragment.blockId === 'sourced');
    expect(sourced[0]!.frameId).not.toBe('p1');
    expect(sourced[0]!.layout).toMatchObject({ y: 0, height: 70 });
    expect(sourced[0]!.textRange).toEqual({ start: 0, end: 8 });
    expect(sourced[1]!.layout.height).toBe(76);
    expect(sourced[1]!.textRange).toEqual({ start: 8, end: 32 });
  });

  it('never reflows manual boxes, workspace/tray blocks or non-flow coverage citizens', () => {
    const manual = block('manual');
    manual.layout.width_mode = 'manual';
    const workspace = block('workspace');
    workspace.layout.surface = 'canvas_workspace';
    const tray = block('tray');
    tray.layout.surface = 'tray';
    const blocks = [manual, workspace, tray, block('under', '', { presentation: 'underlay' }),
      block('over', '', { presentation: 'overlay' }), block('pin', '', { presentation: 'viewport' }),
      block('fixed', '', { flow: false })];
    const before = structuredClone(blocks);
    const output = plan(blocks);
    expect(output.fragments).toEqual([]);
    expect(output.placementUpdates).toEqual([]);
    expect(output.excludedBlockIds).toEqual(blocks.map((item) => item.blockId));
    expect(blocks).toEqual(before);
  });

  it('keeps Web notes as one growing frame with no overflow reports', () => {
    const web = { ...frame('p1'), templateId: 'screen_note' as const };
    const output = plan([block('long', '甲'.repeat(600))], [web]);
    expect(output.frames).toHaveLength(1);
    expect(output.fragments).toHaveLength(1);
    expect(output.fragments[0]!.textRange).toEqual({ start: 0, end: 600 });
    expect(output.frames[0]!.frame.height).toBeGreaterThan(web.height);
    expect(output.overflows).toEqual([]);
    expect(output.appendedFrameIds).toEqual([]);
  });

  it('reflows back to stack start after deletion and only proposes first-fragment affiliation writes', () => {
    const source = block('moved', '甲');
    source.layout.frame_id = 'p3';
    const frames = [frame('p1'), frame('p2'), frame('p3')];
    const output = plan([source], frames);
    expect(output.fragments[0]).toMatchObject({ frameId: 'p1', startFrameId: 'p1', layout: { y: 0 } });
    expect(output.placementUpdates).toEqual([{ blockId: 'moved', frameId: 'p1', layout: { ...source.layout, frame_id: 'p1' } }]);
    expect(output.frames).toHaveLength(3); // manual content/ink may still own p2/p3.
    const roundTrip = plan([{ ...source, layout: output.placementUpdates[0]!.layout }], frames);
    expect(roundTrip.fragments).toEqual(output.fragments);
    expect(roundTrip.placementUpdates).toEqual([]);
  });

  it('keeps independent stacks independent, irrespective of selected stack', () => {
    const p1 = frame('p1');
    const other = frame('other');
    const input = collection([p1, other]);
    input.pageStacks = [createPageStackFromFrame(p1, { id: 'stack' }), createPageStackFromFrame(other, { id: 'other-stack' })];
    input.selectedStackId = 'other-stack';
    const second = block('second', '乙');
    second.layout.frame_id = other.id;
    const output = resolveDocumentPageFlowPlan({ collection: input, blocks: [block('first', '甲'), second], measureTextLines: measure });
    expect(output.fragments.map((fragment) => [fragment.blockId, fragment.frameId, fragment.layout.y])).toEqual([
      ['first', 'p1', 0], ['second', 'other', 0],
    ]);
  });

  it('accepts implicit auto width and preserves v1 legacy sessions', () => {
    const source = block('implicit', '甲');
    delete source.layout.width_mode;
    expect(plan([source]).fragments[0]!.layout.width).toBe(100);
    expect(resolveDocumentPageFlowPlan({ collection: collection(), blocks: [source], coordinateContract: 'v1' }).fragments).toEqual([]);
  });

  it('recomputes after typography and wall changes, keeps graphemes intact, and converges on repeat input', () => {
    const input = { collection: collection([frame('p1', 160, 130)]),
      blocks: [block('unicode', '祖宗之法👨‍👩‍👧‍👦é'.repeat(20))],
      documentTypography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE };
    const regular = resolveDocumentPageFlowPlan(input);
    const changedInput = { ...input, documentTypography: { ...input.documentTypography,
      fontSizePx: 24, lineHeightPx: 36, averageCharWidthPx: 14 } };
    const larger = resolveDocumentPageFlowPlan(changedInput);
    expect(larger.fragments.length).toBeGreaterThan(regular.fragments.length);
    const boundaries = new Set([0, ...Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      .segment(input.blocks[0]!.text!)).map((item) => item.index + item.segment.length)]);
    expect(larger.fragments.every((fragment) => boundaries.has(fragment.textRange!.start) && boundaries.has(fragment.textRange!.end))).toBe(true);
    expect(resolveDocumentPageFlowPlan(changedInput)).toEqual(larger);
    const narrowed = resolveDocumentPageFlowPlan({ ...input, collection: collection([frame('p1', 100, 130)]) });
    expect(narrowed.fragments.length).toBeGreaterThan(regular.fragments.length);
  });
});
