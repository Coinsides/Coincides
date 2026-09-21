import { act, cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDocumentPageFlowPlan } from '../documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFragmentProjections } from '../notePageFlowService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { NoteBlock, TextUnitWritingRole } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteCanvasRuntimeModel, PageFrameModel } from '../types';
import { NotePrintLayer, type NotePrintInput } from './NotePrintLayer';
import { tocPageNumbers } from '../tocProjectionService';
import { deriveChapterProjection } from '../chapterProjectionService';
import { getPagePrintSlices } from '../pagePrintProjectionService';

afterEach(cleanup);

function fixture(withCover = false) {
  const frame: PageFrameModel = { id: 'paper', role: 'primary_page_frame', templateId: 'a4_portrait', pageSize: 'Custom',
    x: 0, y: 0, width: 520, height: 620, contentInset: { left: 50, right: 50, top: 40, bottom: 40 }, exportable: true };
  const layout: BlockBoxLayout = { x: 0, y: 0, width: 420, height: 96, frame_id: frame.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };
  const text = (id: string, value: string, role: TextUnitWritingRole = 'paragraph'): NoteBlock => {
    const flow = createTextBlockContentV1(value);
    flow.units[0].writing_role = role;
    return { id, placement_id: `${id}-place`, block_type: 'paragraph', title: null, plain_text: value,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, metadata: {}, source_references: [],
      order_index: 0, canvas_layout: { ...layout }, display_overrides_json: {} };
  };
  const toc: NoteBlock = { ...text('toc', ''), block_type: 'toc', content_json: {}, plain_text: '' };
  const blocks = [toc, text('first', '第一章', 'heading_1'), text('body', '正文\n'.repeat(60)), text('second', '第二章', 'heading_2')];
  const cover = { ...frame, id: 'cover' };
  if (withCover) blocks.unshift({ ...text('cover-title', '封面标题', 'heading_1'), canvas_layout: { ...layout, frame_id: cover.id } });
  const layouts = Object.fromEntries(blocks.map((block) => [block.id, { ...layout, ...block.canvas_layout }]));
  const stack = createPageStackFromFrame(frame);
  const collection = { pageFrames: withCover ? [cover, frame] : [frame], primaryFrameId: frame.id, pageStacks: [stack] };
  const typography = createDefaultDocumentTypographyProfile();
  const plan = resolveDocumentPageFlowPlan({ collection, coverFrameId: withCover ? cover.id : undefined,
    blocks: noteBlocksToPageFlow(blocks, layouts, {}, {}), documentTypography: typography });
  const input: NotePrintInput = { noteId: 'toc-print', surfaceMode: 'page', visibleBlocks: blocks,
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {}, documentTypographyProfile: typography,
    noteCanvasRuntime: { pageFlowPlan: plan, pageFrames: plan.collection.pageFrames,
      pageFrameExtensions: withCover ? [{ frameId: cover.id, isCover: true, coverExportIncluded: false }] : [],
      blockFragmentProjections: pageFlowFragmentProjections(plan), canvasObjects: [], canvasPlacements: [] } as unknown as NoteCanvasRuntimeModel };
  return { input, plan, blocks, toc, layouts };
}

describe('T1 TOC printing and disposable page labels', () => {
  it.each([false, true])('prints static titles and current first-fragment page numbers (cover=%s)', (withCover) => {
    const data = fixture(withCover);
    const before = structuredClone(data.blocks);
    render(<NotePrintLayer {...data.input} />);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const toc = document.querySelector('[data-toc-projection="print"]') as HTMLElement;
    expect(toc).toBeTruthy();
    expect(within(toc).queryAllByRole('button')).toHaveLength(0);
    const rows = within(toc).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    const contentFrames = data.plan.collection.pageFrames.filter((frame) => frame.id !== 'cover');
    for (const [index, id] of ['first', 'second'].entries()) {
      const fragment = data.plan.fragments.find((entry) => entry.blockId === id && entry.isFirst)!;
      expect(rows[index].querySelector('[data-toc-page-number]')?.textContent)
        .toBe(String(contentFrames.findIndex((frame) => frame.id === fragment.frameId) + 1));
    }
    expect(Number(rows[1].querySelector('[data-toc-page-number]')?.textContent)).toBeGreaterThan(1);
    expect(toc.textContent).not.toContain('封面标题');
    expect(data.blocks).toEqual(before);
    expect(data.toc.content_json).toEqual({});
    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(document.querySelector('[data-toc-projection="print"]')).toBeNull();
  });

  it('recalculates labels after repagination and falls back to plan frames for manual headings', () => {
    const data = fixture();
    const { agenda } = deriveChapterProjection(data.blocks);
    const previous = tocPageNumbers(agenda, data.plan, [], new Set(), data.layouts);
    const compact = resolveDocumentPageFlowPlan({ collection: data.plan.collection,
      blocks: noteBlocksToPageFlow(data.blocks.filter((block) => block.id !== 'body'), data.layouts, {}, {}) });
    const next = tocPageNumbers(agenda, compact, [], new Set(), data.layouts);
    expect(previous.get(agenda[1].id)).toBeGreaterThan(next.get(agenda[1].id)!);
    const manual = { ...data.layouts.second, width_mode: 'manual' as const, frame_id: data.plan.collection.pageFrames[1].id };
    const manualPlan = resolveDocumentPageFlowPlan({ collection: data.plan.collection,
      blocks: noteBlocksToPageFlow(data.blocks, { ...data.layouts, second: manual }, {}, {}) });
    expect(tocPageNumbers(agenda, manualPlan, [], new Set(), { ...data.layouts, second: manual }).get(agenda[1].id)).toBe(2);
  });

  it('uses existing Web print slices and accumulates their physical page counts', () => {
    const data = fixture();
    const frame: PageFrameModel = { ...data.plan.collection.pageFrames[0], templateId: 'screen_note', height: 2200 };
    const slices = getPagePrintSlices(frame, true);
    expect(slices.length).toBeGreaterThan(1);
    const secondFrame = { ...frame, id: 'next-web', y: 2400 };
    const source = pageFlowFragmentProjections(data.plan)[0];
    const fragments = [
      { ...source, blockId: 'first', pageFrameId: frame.id, fragmentIndex: 0,
        visibleRect: { ...source.visibleRect, y: frame.y + slices[1].offsetY + 10 } },
      { ...source, blockId: 'second', pageFrameId: secondFrame.id, fragmentIndex: 0,
        visibleRect: { ...source.visibleRect, y: secondFrame.y + 10 } },
    ];
    const { agenda } = deriveChapterProjection(data.blocks);
    const pages = tocPageNumbers(agenda, undefined, [frame, secondFrame], new Set(), {}, true, fragments);
    expect(pages.get(agenda[0].id)).toBe(2);
    expect(pages.get(agenda[1].id)).toBe(slices.length + 1);
  });
});
