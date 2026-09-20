import { describe, expect, it } from 'vitest';
import { createPrimaryPageFrame } from './engineModel';
import { createPageFrameCollectionSeed } from './pageFrameCollectionService';
import { appendPageFrameToStack } from './pageStackCollectionService';
import { resolveDocumentPageFlowPlan, type PageFlowLine, type ResolveDocumentPageFlowPlanInput } from './documentPageFlowService';
import { noteBlocksToPageFlow } from './notePageFlowService';
import { buildPaperSizeEdit, resolvePaperSizeEditLayouts } from './paperSizeEditService';
import { normalizeResolvedBlockLayout } from './placementService';
import { setNotebookPaperPreset } from './paperSizeService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { NoteBlock } from './runtimeDataTypes';

const measure: NonNullable<ResolveDocumentPageFlowPlanInput['measureTextLines']> = (input) => {
  const columns = Math.max(1, Math.floor((input.width - 20) / 10));
  const lines: PageFlowLine[] = [];
  for (let start = input.startOffset || 0; start < input.text.length; start += columns) {
    const end = Math.min(input.text.length, start + columns);
    lines.push({ startOffset: start, endOffset: end, widthPx: (end - start) * 10, heightPx: 20, lineHeightPx: 20 });
  }
  return { lines: lines.length ? lines : [{ startOffset: 0, endOffset: 0, widthPx: 0, heightPx: 20 }] };
};
const baseLayout: BlockBoxLayout = { x: 10.25, y: 777.5, width: 900, height: 100, width_mode: 'auto',
  frame_id: 'paper-first', coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside' };
function row(id: string, text: string, layout: Partial<BlockBoxLayout> = {}): NoteBlock & { plain_text: string; canvas_layout: BlockBoxLayout } {
  return { id, placement_id: `placement:${id}`, block_type: 'paragraph', title: null,
    content_json: {}, plain_text: text, metadata: {}, order_index: 0, source_references: [],
    display_overrides_json: {}, canvas_layout: { ...baseLayout, ...layout } };
}
function seed() {
  const first = createPageFrameCollectionSeed(createPrimaryPageFrame({ id: 'paper-first', templateId: 'a4_portrait' }));
  return appendPageFrameToStack(first, first.primaryStackId!, 'paper-first', { id: 'paper-second' });
}

describe('A5 paper edit and A1 reflow transaction', () => {
  it('uses persisted auto geometry for affiliation writes even when the runtime reports a different rendered width', () => {
    const before = seed();
    const blocks = [row('long', '甲'.repeat(9000)), row('tail', '尾段', { frame_id: 'paper-second' })];
    const rendered = Object.fromEntries(blocks.map((block) => [block.id, normalizeResolvedBlockLayout({
      block, layout: block.canvas_layout as unknown as BlockBoxLayout, contentWidth: 760,
      contract: 'v2', pageFrames: before.pageFrames, surfaceMode: 'page', estimateHeight: () => 200,
    })]));
    expect(rendered.tail.width).not.toBe((blocks[1].canvas_layout as unknown as BlockBoxLayout).width);
    const layouts = resolvePaperSizeEditLayouts(blocks, {}, rendered);
    const edit = buildPaperSizeEdit({ before, after: setNotebookPaperPreset(before, 'a5_portrait'), blocks,
      layoutDrafts: layouts, objects: [], placements: [], coordinateContract: 'v2',
      typography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, measureTextLines: measure });
    const update = edit.after.layoutUpdates.find((entry) => entry.block.id === 'tail')!;
    expect(update).toBeDefined();
    expect(update.layout.frame_id).not.toBe('paper-second');
    expect(update.layout).toEqual({ ...blocks[1].canvas_layout, frame_id: update.layout.frame_id });
    expect(edit.before.layoutUpdates.find((entry) => entry.block.id === 'tail')?.layout).toEqual(blocks[1].canvas_layout);
    expect(update.layout).toMatchObject({ x: 10.25, y: 777.5, width: 900, height: 100, width_mode: 'auto' });
  });

  it('prefers actual placement drafts and uses rendered fallbacks only for rows not yet placed', () => {
    const placed = row('placed', '已存');
    const draft = { ...placed.canvas_layout as unknown as BlockBoxLayout, x: 20.5, y: 333.25, width: 880 };
    const unplaced = { ...row('new', '待落地'), canvas_layout: undefined };
    const fallback = { ...baseLayout, x: 0, y: 100, width: 740 };
    const layouts = resolvePaperSizeEditLayouts([placed, unplaced], { placed: draft }, { placed: fallback, new: fallback });
    expect(layouts.placed).toEqual(draft);
    expect(layouts.new).toEqual(fallback);
  });

  it('rewraps long text across the new page size without writing stored auto coordinates or body truth', () => {
    const before = seed();
    const blocks = [row('long', '甲'.repeat(9000)), row('tail', '尾段', { frame_id: 'paper-second' })];
    const layouts: Record<string, BlockBoxLayout> = Object.fromEntries(blocks.map((block) => [block.id, block.canvas_layout]));
    const oldPlan = resolveDocumentPageFlowPlan({ collection: before, blocks: noteBlocksToPageFlow(blocks, layouts, {}, {}), measureTextLines: measure });
    const inputBytes = JSON.stringify({ before, blocks, layouts });
    const edit = buildPaperSizeEdit({ before, after: setNotebookPaperPreset(before, 'a5_portrait'), blocks, layoutDrafts: layouts,
      objects: [], placements: [], coordinateContract: 'v2', typography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, measureTextLines: measure });
    const afterLayouts = { ...layouts };
    for (const update of edit.after.layoutUpdates) afterLayouts[update.block.id] = update.layout;
    const plan = resolveDocumentPageFlowPlan({ collection: edit.after.collection,
      blocks: noteBlocksToPageFlow(blocks, afterLayouts, {}, {}), measureTextLines: measure });
    expect(plan.collection.pageFrames.length).toBeGreaterThan(oldPlan.collection.pageFrames.length);
    expect(plan.fragments.filter((fragment) => fragment.blockId === 'long').length)
      .toBeGreaterThan(oldPlan.fragments.filter((fragment) => fragment.blockId === 'long').length);
    expect(plan.fragments.filter((fragment) => fragment.blockId === 'long').map((fragment) => blocks[0].plain_text.slice(fragment.textRange!.start, fragment.textRange!.end)).join(''))
      .toBe(blocks[0].plain_text);
    expect(edit.after.collection.pageFrames.every((frame) => frame.templateId === 'a5_portrait')).toBe(true);
    expect(edit.after.layoutUpdates.some((update) => update.block.id === 'tail' && update.layout.frame_id !== 'paper-second')).toBe(true);
    for (const update of edit.after.layoutUpdates) {
      expect(update.layout).toEqual({ ...layouts[update.block.id], frame_id: update.layout.frame_id });
      expect(edit.before.layoutUpdates.find((entry) => entry.block.id === update.block.id)?.layout).toEqual(layouts[update.block.id]);
    }
    expect(JSON.stringify({ before, blocks, layouts })).toBe(inputBytes);
    expect(plan.appendedFrameIds).toEqual([]);
  });

  it('includes only violating manual clamps in the same reversible paper snapshot', () => {
    const before = seed();
    const after = setNotebookPaperPreset(before, 'a5_portrait');
    const blocks = [row('manual', '手动', { width_mode: 'manual', x: 400, y: 20.25, width: 300 }),
      row('fitting', '合适', { width_mode: 'manual', x: 0, y: 30.25, width: 100 }), row('auto', '自动')];
    const draft: BlockBoxLayout = { ...blocks[0].canvas_layout, x: 430, width: 320 };
    const original = JSON.stringify(blocks);
    const edit = buildPaperSizeEdit({ before, after, blocks, layoutDrafts: { manual: draft }, objects: [], placements: [],
      coordinateContract: 'v2', typography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, measureTextLines: measure });
    const frame = edit.after.collection.pageFrames[0];
    const span = frame.width - frame.contentInset.left - frame.contentInset.right;
    expect(edit.after.layoutUpdates.map((update) => update.block.id)).toEqual(['manual']);
    expect(edit.before.layoutUpdates[0].layout).toEqual(draft);
    expect(edit.after.layoutUpdates[0].layout).toEqual({ ...draft, x: span - draft.width });
    expect(edit.before.collection).toBe(before);
    expect(edit.after.collection.paperDefault?.templateId).toBe('a5_portrait');
    expect(JSON.stringify(blocks)).toBe(original);
  });

  it('paginates the current draft text while keeping every stored block body unchanged', () => {
    const before = seed();
    const blocks = [row('draft', '旧文')];
    const stored = JSON.stringify(blocks);
    const input = { before, after: setNotebookPaperPreset(before, 'a5_portrait'), blocks, objects: [], placements: [],
      coordinateContract: 'v2' as const, typography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, measureTextLines: measure };
    const storedEdit = buildPaperSizeEdit(input);
    const draftEdit = buildPaperSizeEdit({ ...input, textDrafts: { draft: '新文'.repeat(6000) } });
    expect(draftEdit.after.collection.pageFrames.length).toBeGreaterThan(storedEdit.after.collection.pageFrames.length);
    expect(JSON.stringify(blocks)).toBe(stored);
  });
});
