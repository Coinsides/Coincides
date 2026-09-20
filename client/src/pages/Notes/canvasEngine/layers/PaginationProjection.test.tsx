import { cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDocumentPageFlowPlan } from '../documentPageFlowService';
import { deriveChapterProjection, getCollapsedChapterBlockIds } from '../chapterProjectionService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts, pageFlowFragmentProjections } from '../notePageFlowService';
import { useNoteCanvasFrameModel, type UseNoteCanvasFrameModelOptions } from '../hooks/useNoteCanvasLayoutModel';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { CanvasObject, CanvasPlacement, PageFrameModel } from '../types';
import { NoteReadOnlyPageContent } from './NoteReadOnlyPageContent';

afterEach(cleanup);

function seed() {
  const text = Array.from({ length: 36 }, (_, index) => `第${index + 1}段：${'宋代制度与地方社会的联系。'.repeat(10)}`).join('\n');
  const flow = createTextBlockContentV1(text);
  const block: NoteBlock = { id: 'chapter', placement_id: 'chapter-place', block_type: 'paragraph', title: null,
    plain_text: text, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, metadata: {}, source_references: [],
    order_index: 0, canvas_layout: null, display_overrides_json: {} };
  const frame: PageFrameModel = { id: 'paper', role: 'primary_page_frame', templateId: 'a4_portrait', pageSize: 'Custom',
    x: 0, y: 0, width: 520, height: 620, contentInset: { left: 50, right: 50, top: 40, bottom: 40 }, exportable: true };
  const layout: BlockBoxLayout = { x: 0, y: 0, width: 420, height: 72, frame_id: frame.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };
  const typography = createDefaultDocumentTypographyProfile();
  const collection = { pageFrames: [frame], primaryFrameId: frame.id, pageStacks: [createPageStackFromFrame(frame)] };
  const plan = resolveDocumentPageFlowPlan({ collection, blocks: noteBlocksToPageFlow([block], { chapter: layout }, {}, {}), documentTypography: typography });
  return { text, flow, block, frame, layout, typography, collection, plan };
}

describe('A1 one plan across writing, print and Overview', () => {
  it('projects the complete long logical block into the same page slices in both read-only surfaces', () => {
    const data = seed();
    expect(data.plan.frames.length).toBeGreaterThanOrEqual(3);
    const fragments = pageFlowFragmentProjections(data.plan);
    const input = { fragments, visibleBlocks: [data.block], blockTextDrafts: {}, blockTextFlowDrafts: {},
      blockFieldDrafts: {}, anchorsBySourceRef: {}, documentTypography: data.typography };
    const printed = render(<>{data.plan.frames.map(({ frame }) => <NoteReadOnlyPageContent key={frame.id} frame={frame} {...input} print />)}</>);
    const printedSlices = Array.from(printed.container.querySelectorAll<HTMLTextAreaElement>('textarea')).map((node) => ({
      value: node.value, unit: node.dataset.textUnitId, start: node.dataset.textStart, end: node.dataset.textEnd,
      displayEnd: node.dataset.textDisplayEnd,
    }));
    expect(printed.container.querySelectorAll('[data-note-print-fragment]')).toHaveLength(data.plan.fragments.length);
    const canonicalSlices = printedSlices.map((slice) => {
      const unit = data.flow.units.find((item) => item.id === slice.unit)!;
      const start = Number(slice.start);
      const end = Number(slice.end);
      const displayEnd = Number(slice.displayEnd);
      expect(slice.value).toBe(unit.text.slice(start, displayEnd));
      // The physical page boundary replaces a terminal hard-break's blank row,
      // while the canonical range must still account for that exact newline.
      expect(['', '\n', '\r\n']).toContain(unit.text.slice(displayEnd, end));
      return unit.text.slice(start, end);
    });
    expect(canonicalSlices.join('')).toBe(data.flow.units.map((unit) => unit.text).join(''));
    printed.unmount();
    const overview = render(<>{data.plan.frames.map(({ frame }) => <NoteReadOnlyPageContent key={frame.id} frame={frame} {...input} />)}</>);
    const overviewSlices = Array.from(overview.container.querySelectorAll<HTMLTextAreaElement>('textarea')).map((node) => ({
      value: node.value, unit: node.dataset.textUnitId, start: node.dataset.textStart, end: node.dataset.textEnd,
      displayEnd: node.dataset.textDisplayEnd,
    }));
    expect(overviewSlices).toEqual(printedSlices);
    expect(overview.container.querySelectorAll('[data-runtime-textflow-editor="true"]')).toHaveLength(0);
    expect(data.block.content_json[TEXT_FLOW_CONTENT_KEY]).toBe(data.flow);
  });

  it('frame runtime consumes the supplied plan object without repaginating the projected boxes', () => {
    const data = seed();
    const layouts = pageFlowFirstLayouts(data.plan, { chapter: data.layout });
    const { result } = renderHook(() => useNoteCanvasFrameModel({
      coordinateContract: 'v2', pageFlowPlan: data.plan, blockLayouts: layouts, defaultDraftLayout: data.layout,
      documentTypographyProfile: data.typography, draftActive: false, draftLayout: null,
      pageFrameCollection: data.collection, persistedCanvasObjects: [], persistedCanvasPlacements: [],
      persistedContentMounts: [], persistedVisualConnectors: [], persistedImageObjects: [], persistedStructuredObjects: [],
      pageOffsetX: 0, surfaceMode: 'page', viewportTransform: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 },
      visibleBlocks: [data.block],
    }));
    expect(result.current.noteCanvasRuntime.pageFlowPlan).toBe(data.plan);
    expect(result.current.runtimePageFrameCollection).toBe(data.plan.collection);
    expect(result.current.noteCanvasRuntime.blockFragmentProjections.map((fragment) => fragment.flowFragment))
      .toEqual(data.plan.fragments);
    expect(result.current.noteCanvasRuntime.pageFrames.map((frame) => frame.id)).toEqual(data.plan.collection.pageFrames.map((frame) => frame.id));
    expect(result.current.exportPreview.pageFrames.flatMap((frame) => frame.rows.map((row) => row.flowFragment)))
      .toEqual(data.plan.fragments);
  });

  it('keeps hidden auto text and a manual box on their complete export pages after folding a chapter', () => {
    const data = seed();
    const headingFlow = createTextBlockContentV1('宋代地方社会');
    headingFlow.units[0]!.writing_role = 'heading_1';
    const heading: NoteBlock = { ...data.block, id: 'heading', placement_id: 'heading-place',
      plain_text: '宋代地方社会', content_json: { [TEXT_FLOW_CONTENT_KEY]: headingFlow } };
    const autoBlocks = [heading, data.block];
    const autoLayouts = { heading: data.layout, chapter: data.layout };
    const autoPlan = resolveDocumentPageFlowPlan({ collection: data.collection, documentTypography: data.typography,
      blocks: noteBlocksToPageFlow(autoBlocks, autoLayouts, {}, {}) });
    const manualFrame = autoPlan.collection.pageFrames[1]!;
    expect(manualFrame).toMatchObject({ x: 0, y: 700 });
    const manualLayout: BlockBoxLayout = { ...data.layout, frame_id: manualFrame.id, width_mode: 'manual',
      x: 30, y: 100, width: 170, height: 80 };
    const manual: NoteBlock = { ...data.block, id: 'manual', placement_id: 'manual-place',
      plain_text: '手动旁注', content_json: { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1('手动旁注') },
      canvas_layout: { ...manualLayout } };
    const blocks = [...autoBlocks, manual];
    const layouts = { ...autoLayouts, manual: manualLayout };
    const fullPlan = resolveDocumentPageFlowPlan({ collection: autoPlan.collection, documentTypography: data.typography,
      blocks: noteBlocksToPageFlow(blocks, layouts, {}, {}) });
    const fullLayouts = pageFlowFirstLayouts(fullPlan, layouts);
    const chapter = deriveChapterProjection(blocks);
    const hidden = getCollapsedChapterBlockIds(chapter, new Set([chapter.roots[0]!.id]));
    const foldedBlocks = blocks.filter((block) => !hidden.has(block.id));
    const foldedPlan = resolveDocumentPageFlowPlan({ collection: data.collection, documentTypography: data.typography,
      blocks: noteBlocksToPageFlow(foldedBlocks, layouts, {}, {}) });
    const options: UseNoteCanvasFrameModelOptions = {
      coordinateContract: 'v2', pageFlowPlan: fullPlan, blockLayouts: fullLayouts, defaultDraftLayout: data.layout,
      documentTypographyProfile: data.typography, draftActive: false, draftLayout: null,
      pageFrameCollection: data.collection, persistedCanvasObjects: [], persistedCanvasPlacements: [],
      persistedContentMounts: [], persistedVisualConnectors: [], persistedImageObjects: [], persistedStructuredObjects: [],
      pageOffsetX: 0, surfaceMode: 'page', viewportTransform: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 },
      visibleBlocks: blocks, exportContent: { blocks, layouts: fullLayouts, pageFlowPlan: fullPlan },
    };
    const { result, rerender } = renderHook((props) => useNoteCanvasFrameModel(props), { initialProps: options });
    const expandedExport = result.current.exportPreview;
    rerender({ ...options, visibleBlocks: foldedBlocks, pageFlowPlan: foldedPlan,
      blockLayouts: pageFlowFirstLayouts(foldedPlan, { heading: data.layout }) });

    expect(result.current.noteCanvasRuntime.blockPlacements.map((placement) => placement.blockId)).toEqual(['heading']);
    expect(result.current.noteCanvasRuntime.pageFrames).toHaveLength(1);
    expect(result.current.searchSource.blocks.map((block) => block.id)).toEqual(['heading', 'chapter', 'manual']);
    expect(result.current.searchSource.runtime.pageFrames).toEqual(fullPlan.collection.pageFrames);
    expect(result.current.searchSource.runtime.blockPlacements.find((placement) => placement.blockId === manual.id))
      .toMatchObject({ frameId: manualFrame.id, x: 80, y: 840, width: 170, height: 80 });
    expect(result.current.exportPreview).toEqual(expandedExport);
    expect(result.current.exportPreview.includedRows.map((row) => row.block.id)).toEqual(['heading', 'chapter', 'manual']);
    const manualExport = result.current.exportPreview.pageFrames.find((frame) => frame.pageFrameId === manualFrame.id)!
      .includedRows.find((row) => row.block.id === manual.id)!;
    expect(manualExport).toMatchObject({ pageFrameId: manualFrame.id, boundary: 'inside',
      layout: { x: 30, y: 100, width_mode: 'manual' },
      placement: { frameId: manualFrame.id, x: 80, y: 840, width: 170, height: 80 } });
    const autoExport = result.current.exportPreview.pageFrames.flatMap((frame) => frame.includedRows)
      .filter((row) => row.block.id === data.block.id);
    expect(autoExport.length).toBeGreaterThanOrEqual(3);
    expect(autoExport.map((row) => row.flowFragment)).toEqual(fullPlan.fragments.filter((fragment) => fragment.blockId === data.block.id));
    expect(autoExport.map((row) => data.text.slice(row.flowFragment!.textRange!.start, row.flowFragment!.textRange!.end)).join(''))
      .toBe(data.text);
  });

  it.each([false, true])('keeps ink on its original page when text starts later and creates continuation pages (print=%s)', (print) => {
    const data = seed();
    const stroke: CanvasObject = {
      objectId: 'original-ink', canvasId: 'ink-canvas', kind: 'freehand', backing: 'none',
      objectClass: 'pure', status: 'active',
      metadata: { freehand: { path: 'M 0 0 L 120 80', style: { color_token: 'ink', width: 2.5 } } },
    };
    const inkPlacement: CanvasPlacement = {
      placementId: 'ink-placement', objectId: stroke.objectId, canvasId: 'ink-canvas',
      frameId: data.frame.id, surface: 'formal_page', boundaryRole: 'inside', rotation: 0, zIndex: 4,
      x: data.frame.x + 40, y: data.frame.y + 50, width: 120, height: 80,
      renderVisibility: 'visible', visibilityState: 'normal',
    };
    const inkBefore = structuredClone(inkPlacement);
    // An indivisible flow object fills the original paper, so the logical text
    // block's first fragment moves while all later pages remain projections.
    const plan = resolveDocumentPageFlowPlan({ collection: data.collection, documentTypography: data.typography,
      blocks: [{ blockId: 'full-page-media', kind: 'media',
        layout: { ...data.layout, height: data.frame.height - data.frame.contentInset.top - data.frame.contentInset.bottom } },
      ...noteBlocksToPageFlow([data.block], { chapter: data.layout }, {}, {})] });
    const chapter = plan.fragments.filter((fragment) => fragment.blockId === data.block.id);
    expect(chapter.length).toBeGreaterThan(2);
    expect(plan.appendedFrameIds.length).toBeGreaterThan(2);
    expect(chapter[0]!.frameId).not.toBe(data.frame.id);
    expect(plan.placementUpdates).toContainEqual(expect.objectContaining({ blockId: data.block.id, frameId: chapter[0]!.frameId }));
    expect(plan.placementUpdates.some((update) => update.blockId === stroke.objectId)).toBe(false);
    const { result } = renderHook(() => useNoteCanvasFrameModel({
      coordinateContract: 'v2', pageFlowPlan: plan, blockLayouts: pageFlowFirstLayouts(plan, { chapter: data.layout }),
      defaultDraftLayout: data.layout, documentTypographyProfile: data.typography, draftActive: false, draftLayout: null,
      pageFrameCollection: data.collection, persistedCanvasObjects: [stroke], persistedCanvasPlacements: [inkPlacement],
      persistedContentMounts: [], persistedVisualConnectors: [], persistedImageObjects: [], persistedStructuredObjects: [],
      pageOffsetX: 0, surfaceMode: 'page', viewportTransform: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 },
      visibleBlocks: [data.block],
    }));
    const runtime = result.current.noteCanvasRuntime;
    expect(runtime.canvasPlacements.find((placement) => placement.objectId === stroke.objectId)).toEqual(inkBefore);
    const { container } = render(<>{runtime.pageFrames.map((frame) => <section key={frame.id} data-a1-page={frame.id}>
      <NoteReadOnlyPageContent frame={frame} print={print} fragments={runtime.blockFragmentProjections}
        canvasObjects={runtime.canvasObjects} canvasPlacements={runtime.canvasPlacements}
        visibleBlocks={[data.block]} blockTextDrafts={{}} blockTextFlowDrafts={{}} blockFieldDrafts={{}}
        anchorsBySourceRef={{}} documentTypography={data.typography} />
    </section>)}</>);
    const paths = container.querySelectorAll('[data-paper-ink-id="original-ink"]');
    expect(paths).toHaveLength(1);
    expect(paths[0]!.closest('svg')?.getAttribute('data-page-frame-id')).toBe(data.frame.id);
    expect(paths[0]!.getAttribute('transform')).toBe('translate(40 50) rotate(0 60 40)');
    for (const fragment of chapter) {
      expect(container.querySelector(`[data-a1-page="${fragment.frameId}"] [data-paper-ink-id]`)).toBeNull();
    }
    expect(container.querySelectorAll('[data-runtime-textflow-editor="true"]')).toHaveLength(0);
    expect(inkPlacement).toEqual(inkBefore);
  });
});
