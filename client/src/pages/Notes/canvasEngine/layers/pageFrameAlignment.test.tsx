import { createRef, useState } from 'react';
import { createPaperFreehand } from '../freehandService';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, renderHook, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { resolveDocumentPageFlowPlan } from '../documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts, pageFlowFragmentProjections } from '../notePageFlowService';
import { createPageGapPresentation } from '../pageFramePresentationService';
import { createSurfaceModePolicy } from '../modePolicyService';
import type { PageReadingGear } from '../pageReadingViewportService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { buildRuntimeBlockPlacement } from '../placementService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../runtimeLayout';
import { MIN_BLOCK_WIDTH } from '../runtimeLayout';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { PageFrameModel } from '../types';
import { NoteWritingSurfaceLayer, type NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import { NoteOverviewLayer } from './NoteOverviewLayer';
import { NotePrintLayer } from './NotePrintLayer';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { resolveScreenRect } from '../placementContractService';
import { useNoteCanvasResolvedLayoutModel } from '../hooks/useNoteCanvasLayoutModel';
import { useNoteCanvasLayerProps, type UseNoteCanvasLayerPropsInput } from '../hooks/useNoteCanvasLayerProps';
import { NOTE_INSERT_COMMANDS } from '../../noteSlashCommands';
import { NoteInsertCommandsContext, type NoteInsertCommandHost } from '../NoteInsertCommandsContext';
import * as mediaPaste from '../mediaBlockPasteService';
import { deriveChapterProjection } from '../chapterProjectionService';
import { NoteAgentContextRoute } from '../../NoteAgentContextRoute';
import { useAgentUiStore } from '@/stores/agentUiStore';

vi.mock('../canvasAssetRepository', async (importOriginal) => ({
  ...await importOriginal<typeof import('../canvasAssetRepository')>(),
  loadCanvasImageAssetBlobUrl: vi.fn(async () => { throw new Error('No media image registered in the alignment fixture'); }),
}));

vi.mock('@/services/api', () => ({ default: {
  get: vi.fn().mockRejectedValue(new Error('No HTTP in synthetic alignment fixture')),
  post: vi.fn().mockRejectedValue(new Error('No HTTP in synthetic alignment fixture')),
  put: vi.fn().mockRejectedValue(new Error('No HTTP in synthetic alignment fixture')),
} }));

let availableWidth = 680;
beforeEach(() => {
  availableWidth = 680;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  // Supply available layout space, which jsdom itself cannot measure. The
  // production reading hook computes the resulting scale and writes it to DOM.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => availableWidth);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function frame(x: number): PageFrameModel {
  return {
    id: 'synthetic-alignment-frame', role: 'primary_page_frame', exportable: true,
    x, y: 0, width: 904, height: 1278, pageSize: 'A4', templateId: 'a4_portrait',
    contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
  };
}

function propsFor(pageFrame: PageFrameModel, surfaceMode: SurfaceMode): NoteWritingSurfaceLayerProps {
  const layout: BlockBoxLayout = {
    x: 0, y: 0, width: pageFrame.width - pageFrame.contentInset.left - pageFrame.contentInset.right,
    height: 120, coordinate_space: 'page_frame_local',
    frame_id: pageFrame.id, surface: 'formal_page', width_mode: 'manual',
  };
  const block: NoteBlock = {
    id: 'synthetic-alignment-block', placement_id: 'synthetic-alignment-placement',
    display_overrides_json: {}, canvas_layout: { ...layout }, block_type: 'paragraph',
    title: null, content_json: { body: 'Synthetic alignment content' },
    plain_text: 'Synthetic alignment content', metadata: {}, order_index: 0, source_references: [],
  };
  const noOp = vi.fn();
  const typography = createDefaultDocumentTypographyProfile();
  const viewport = { x: 0, y: 0, width: 1024, height: 768, zoom: 1 };
  return {
    activeBlockId: null, contentReadOnly: true, activeSlashCommandId: null,
    allBlocks: [block], anchorsBySourceRef: {}, annotationTruths: [], contentGroups: [],
    groupFolders: [], purposeFrames: [], blockFieldDrafts: {}, blockLayouts: { [block.id]: layout },
    blockListRef: createRef<HTMLDivElement>(), blockTextDrafts: {}, blockTextFlowDrafts: {},
    creatingDraft: false, defaultDraftLayout: { ...layout, y: 144 },
    defaultTextTemplate: {} as never, documentTypographyProfile: typography, draftActive: false,
    draftFocusReceipt: { blockId: 'draft-block', textFlowId: 'draft-flow', textUnitId: 'draft-unit' },
    draftLayout: null, draftOwnerReconciliation: null, draftPhase: 'idle' as never,
    draftRef: createRef<HTMLTextAreaElement>(), draftText: '', focusBlockId: null,
    focusedTextOwner: null, interactionState: { mode: 'idle', target: 'surface' }, layoutMode: true,
    noteCanvasRuntime: { ...buildNoteCanvasRuntimeModel({
      mode: surfaceMode, primaryPageFrame: pageFrame, pageFrames: [pageFrame],
      pageStacks: [createPageStackFromFrame(pageFrame)],
      viewport, blockPlacements: [buildRuntimeBlockPlacement({
        block, canvasId: 'synthetic-alignment-canvas', layout,
        pageOffsetX: createSurfaceModePolicy(surfaceMode).pageOffsetX,
        pageFrame, pageFrames: [pageFrame], contract: 'v2', zIndex: 0,
      })], documentTypography: typography,
    }), coordinateContract: 'v2' },
    noteId: 'synthetic-alignment-note', projectId: 'synthetic-alignment-project',
    pageContentHeight: 1278, pageOffsetX: createSurfaceModePolicy(surfaceMode).pageOffsetX,
    placementPending: false, primaryPageFrameX: pageFrame.x, primaryPageFrameWidth: pageFrame.width,
    savingBlockId: null, selectedBlockId: null, selectedPageFrameId: null,
    showPreviewAIVisibility: false, showPreviewBlockTypes: false, showPreviewExportStatus: false,
    showPreviewLabelOverlay: false, slashCommands: [], slashTarget: null, snapGuide: null,
    sortedBlockCount: 1, sourceJumpBusy: null, surfaceMode, surfacePolicyMode: surfaceMode,
    viewportTransform: viewport, visibleBlocks: [block],
    onCreateBlock: vi.fn(async () => null), onPersistCanvasObject: vi.fn(async () => true), onDeleteCanvasObject: vi.fn(async () => true),
    onSaveAnnotationTruths: vi.fn(async () => undefined), onSaveContentGroups: vi.fn(async () => true),
    onSaveDocumentTypographyProfile: noOp, onSaveGroupFolders: vi.fn(async () => undefined),
    onActivateDraft: noOp, onBeginMoveBlock: noOp, onBeginResizeBlock: noOp,
    onBlockKeyDown: noOp, onBlockListMouseDown: noOp, onBlockTextChange: noOp,
    onBlockTextFlowChange: noOp, onApplyBlockTextFlowEdit: vi.fn(async () => undefined),
    onClearSlashTarget: noOp, onDiscardDraft: noOp, onDraftChange: noOp,
    onDraftFocusReceipt: noOp, onDraftKeyDown: noOp, onFieldDraftChange: noOp,
    onFocusBlock: noOp, onReleaseTextFocus: noOp, onRequestFocusBlock: noOp,
    onMeasuredBlockHeight: noOp, onPageSpaceDoubleClick: noOp,
    onPersistDraft: vi.fn(async () => undefined), onResizeDraftFromTextarea: noOp,
    onSaveBlock: vi.fn(), onSelectBlock: noOp, onSelectSlashCommand: noOp, onToggleAIVisibility: noOp,
    onToggleExportRole: noOp, onTrashBlock: noOp, onViewSource: noOp,
  };
}

function WritingSurfaceThroughLayerProps({ surfaceProps }: { surfaceProps: NoteWritingSurfaceLayerProps }) {
  // Exercise the real production forwarding boundary. Chrome-only fields are
  // unused because this fixture mounts the complete writing surface only.
  const input = {
    titleDraft: 'Synthetic alignment note', descriptionDraft: '',
    onTitleDraftChange: () => undefined, onDescriptionDraftChange: () => undefined,
    onSaveTitle: () => undefined, onSaveDescription: () => undefined,
    ...surfaceProps,
    onCloseOverlay: surfaceProps.onCloseViewOptions,
    note: { id: surfaceProps.noteId, course_id: surfaceProps.projectId },
    onWritingSurfaceFocusBlock: surfaceProps.onFocusBlock,
    onWritingSurfaceRequestBlockFocus: surfaceProps.onRequestFocusBlock,
  } as unknown as UseNoteCanvasLayerPropsInput;
  const layers = useNoteCanvasLayerProps(input);
  return layers ? <NoteWritingSurfaceLayer {...layers.documentLayerProps.writingSurfaceProps} /> : null;
}

function bindingGapProps(paginatedText = false) {
  const first = { ...frame(0), id: 'a2-first', height: 600,
    contentInset: { left: 72, right: 72, top: 40, bottom: 60 } };
  const second = { ...first, id: 'a2-second', role: 'secondary_page_frame' as const, y: 680 };
  const props = propsFor(first, 'page');
  const flow = createTextBlockContentV1(Array.from({ length: 35 }, (_, i) => `Paragraph ${i}: ${'Writing on paper. '.repeat(10)}`).join('\n'));
  const block = { ...props.visibleBlocks[0], ...(paginatedText
    ? { plain_text: flow.units.map((unit) => unit.text).join('\n'), content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } } : {}) };
  const layout: BlockBoxLayout = { ...props.blockLayouts[block.id], x: paginatedText ? 0 : 20, y: paginatedText ? 0 : 50,
    width: paginatedText ? 760 : 300, width_mode: paginatedText ? 'auto' : 'manual', frame_id: paginatedText ? first.id : second.id };
  const stack = { ...createPageStackFromFrame(first), frameIds: [first.id, second.id] };
  const plan = resolveDocumentPageFlowPlan({ collection: { pageFrames: [first, second], primaryFrameId: first.id, pageStacks: [stack] },
    blocks: noteBlocksToPageFlow([block], { [block.id]: layout }, {}, {}), documentTypography: props.documentTypographyProfile });
  const layouts = pageFlowFirstLayouts(plan, { [block.id]: layout });
  const ink = createPaperFreehand({ frame: second, canvasId: 'a2-canvas', objectId: 'a2-ink',
    points: [{ x: 100, y: 100 }, { x: 200, y: 120 }], zIndex: 1 });
  const runtime = buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: first,
    pageFrames: plan.collection.pageFrames, pageStacks: plan.collection.pageStacks,
    viewport: props.viewportTransform, documentTypography: props.documentTypographyProfile,
    blockPlacements: [buildRuntimeBlockPlacement({ block, canvasId: 'a2-canvas', layout: layouts[block.id],
      pageOffsetX: props.pageOffsetX, pageFrame: first, pageFrames: plan.collection.pageFrames, contract: 'v2', zIndex: 0 })],
    genericCanvasObjects: [ink.canvasObject], genericCanvasPlacements: [ink.placement] });
  return { ...props, allBlocks: [block], visibleBlocks: [block], blockLayouts: layouts,
    pageContentHeight: plan.collection.pageFrames[plan.collection.pageFrames.length - 1].y + 600, contentReadOnly: false, layoutMode: false,
    noteCanvasRuntime: { ...runtime, coordinateContract: 'v2' as const, pageFlowPlan: plan,
      blockFragmentProjections: paginatedText ? pageFlowFragmentProjections(plan) : runtime.blockFragmentProjections } };
}

describe('A2 foldable page gaps', () => {
  it('supplies a canonical drag mapper and displays a manual box beyond its affiliated frame at the folded destination', () => {
    const props = bindingGapProps();
    const block = props.visibleBlocks[0];
    const beginMove = vi.fn();
    const view = render(<NoteWritingSurfaceLayer {...props} pageGapsFolded selectedBlockId={block.id} onBeginMoveBlock={beginMove} />);
    const blockList = props.blockListRef.current!;
    const scale = Number(blockList.closest<HTMLElement>('[data-page-display-scale]')!.dataset.pageDisplayScale);
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue({ top: 200, left: 100,
      width: 760 * scale, height: 1200 * scale } as DOMRect);
    fireEvent.pointerDown(view.getByRole('button', { name: 'Move block' }));
    expect(beginMove).toHaveBeenCalledTimes(1);
    const map = beginMove.mock.calls[0][3] as (clientY: number) => number;
    expect((map(200 + 730 * scale) - map(200 + 440 * scale)) / scale).toBeCloseTo(370);
    // The saved box still uses page 1's content origin, exactly as the existing
    // drag contract allows. Its canonical top is now 810, displayed at 730.
    const saved = { ...props.blockLayouts[block.id], frame_id: 'a2-first', y: 770 };
    view.rerender(<NoteWritingSurfaceLayer {...props} pageGapsFolded blockLayouts={{ [block.id]: saved }} />);
    const shell = view.container.querySelector<HTMLElement>('[data-note-block-shell]')!;
    expect(Number.parseFloat(shell.style.top)).toBe(730);
    expect(saved.frame_id).toBe('a2-first');
    expect(saved.y).toBe(770);
  });

  it('saves ink using the original frame after drawing on a folded page and clips captured motion at that page edge', async () => {
    const props = bindingGapProps();
    const persist = vi.fn(async (_input: Parameters<NoteWritingSurfaceLayerProps['onPersistCanvasObject']>[0]) => true);
    const view = render(<NoteWritingSurfaceLayer {...props} pageGapsFolded onPersistCanvasObject={persist} />);
    fireEvent.click(view.getByRole('button', { name: 'Pen' }));
    const ink = view.container.querySelector<HTMLElement>('[data-paper-ink-layer="a2-second"]')!;
    const scale = Number(ink.closest<HTMLElement>('[data-page-display-scale]')!.dataset.pageDisplayScale);
    const top = 100 + 600 * scale;
    vi.spyOn(ink, 'getBoundingClientRect').mockReturnValue({ top, left: 50,
      width: 904 * scale, height: 600 * scale, right: 50 + 904 * scale, bottom: top + 600 * scale } as DOMRect);
    const pointer = (type: string, x: number, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0,
        clientX: 50 + x * scale, clientY: top + y * scale });
      Object.defineProperties(event, { pointerId: { value: 11 }, isPrimary: { value: true } });
      fireEvent(ink, event);
    };
    await act(async () => { pointer('pointerdown', 100, 100); pointer('pointermove', 140, 700); pointer('pointerup', 140, 700); });
    expect(persist).toHaveBeenCalledTimes(1);
    const placement = persist.mock.calls[0][0].placement;
    expect(placement.frameId).toBe('a2-second');
    expect(placement.y).toBeCloseTo(780);
    expect(placement.height).toBeCloseTo(500);
    expect(props.noteCanvasRuntime.pageFrames[1].y).toBe(680);
  });

  it('folds and reopens the page-gap control while manual boxes, walls and ink retain their local geometry', () => {
    const props = bindingGapProps();
    const before = JSON.stringify({ runtime: props.noteCanvasRuntime, layouts: props.blockLayouts });
    const view = render(<NoteWritingSurfaceLayer {...props} />);
    const manual = view.container.querySelector<HTMLElement>('[data-note-block-shell]')!;
    const paper = view.container.querySelector<HTMLElement>('[data-flow-page-paper="a2-second"]')!;
    const ink = view.container.querySelector<HTMLElement>('[data-paper-ink-layer="a2-second"]')!;
    const path = ink.querySelector('[data-paper-ink-id="a2-ink"]')!;
    const pathBefore = path.getAttribute('transform');
    const manualBefore = Number.parseFloat(manual.style.top);
    const paperBefore = Number.parseFloat(paper.style.top);
    const inkBefore = Number.parseFloat(ink.style.top);
    fireEvent.click(view.getByRole('button', { name: 'Fold page gaps' }));
    expect(Number.parseFloat(manual.style.top)).toBe(manualBefore - 80);
    expect(Number.parseFloat(paper.style.top)).toBe(paperBefore - 80);
    expect(Number.parseFloat(ink.style.top)).toBe(inkBefore - 80);
    expect(manual.style.width).toBe('300px');
    expect(ink.style.height).toBe('600px');
    expect(path.getAttribute('transform')).toBe(pathBefore);
    expect(view.container.querySelector('[data-page-gaps-folded="true"]')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Show page gaps' }));
    expect(Number.parseFloat(manual.style.top)).toBe(manualBefore);
    expect(JSON.stringify({ runtime: props.noteCanvasRuntime, layouts: props.blockLayouts })).toBe(before);
    expect(props.onPersistCanvasObject).not.toHaveBeenCalled();
  });

  it('maps folded blank drops and double clicks back into the original second-page coordinates', () => {
    const props = bindingGapProps();
    const onDropTrayBlock = vi.fn(async (_id: string, _layout: BlockBoxLayout) => undefined);
    const doubleClick = vi.fn();
    const view = render(<NoteWritingSurfaceLayer {...props} pageGapsFolded onDropTrayBlock={onDropTrayBlock}
      onPageSpaceDoubleClick={doubleClick} />);
    const blockList = props.blockListRef.current!;
    const scale = Number(blockList.closest<HTMLElement>('[data-page-display-scale]')!.dataset.pageDisplayScale);
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 200, width: 760 * scale,
      height: 1200 * scale, right: 100 + 760 * scale, bottom: 200 + 1200 * scale } as DOMRect);
    const displayY = 600 + 40 + 90;
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.assign(drop, { clientX: 160, clientY: 200 + displayY * scale,
      dataTransfer: { types: ['application/x-coincides-tray-placement'], getData: () => 'a2-tray' } });
    fireEvent(blockList, drop);
    expect(onDropTrayBlock).toHaveBeenCalledWith('a2-tray', expect.objectContaining({
      frame_id: 'a2-second', coordinate_space: 'page_frame_local',
    }));
    expect(onDropTrayBlock.mock.calls[0][1].y).toBeCloseTo(90);
    fireEvent.doubleClick(blockList, { clientX: 160, clientY: 200 + displayY * scale });
    expect(doubleClick).toHaveBeenCalledTimes(1);
    expect(doubleClick.mock.calls[0][0].clientY).toBeCloseTo(200 + (displayY + 80) * scale);
    expect(props.noteCanvasRuntime.pageFrames[1].y).toBe(680);
  });

  it('moves A1 text fragments only on screen and keeps print and Overview projections unchanged', () => {
    const props = bindingGapProps(true);
    const before = JSON.stringify(props.noteCanvasRuntime.pageFlowPlan);
    const displayed = createPageGapPresentation(props.noteCanvasRuntime.pageFrames, true);
    const view = render(<><NoteWritingSurfaceLayer {...props} /><NotePrintLayer {...props} />
      <NoteOverviewLayer writingSurfaceProps={props} onSelectPage={vi.fn()} onClose={vi.fn()} /></>);
    const writing = view.container.querySelector('[data-text-unit-move-scope]')!;
    const rows = Array.from(writing.querySelectorAll<HTMLElement>('[data-page-flow-fragment-id]'));
    expect(props.noteCanvasRuntime.pageFrames.length).toBeGreaterThan(2);
    const tops = rows.map((row) => Number.parseFloat(row.style.top));
    const overviewBefore = view.container.querySelector('[data-note-overview]')!.innerHTML;
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const printBefore = document.querySelector('[data-note-print-root]')!.innerHTML;
    act(() => window.dispatchEvent(new Event('afterprint')));
    fireEvent.click(view.getAllByRole('button', { name: 'Fold page gaps' })[0]);
    rows.forEach((row, index) => expect(Number.parseFloat(row.style.top))
      .toBe(tops[index] + (displayed.offsetByFrameId.get(row.dataset.pageFlowFrameId!) || 0)));
    expect(view.container.querySelector('[data-note-overview]')!.innerHTML).toBe(overviewBefore);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(document.querySelector('[data-note-print-root]')!.innerHTML).toBe(printBefore);
    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(JSON.stringify(props.noteCanvasRuntime.pageFlowPlan)).toBe(before);
  });

  it('hides folding for a Web long page even if the preference is set', () => {
    const web = { ...frame(0), templateId: 'screen_note' as const, height: 7000 };
    const props = propsFor(web, 'page');
    const view = render(<NoteWritingSurfaceLayer {...props} pageGapsFolded showViewOptions />);
    expect(view.queryByRole('menuitemcheckbox', { name: 'Fold page gaps' })).toBeNull();
    expect(view.container.querySelector('[data-note-page-gap]')).toBeNull();
    expect(view.container.querySelector('[data-page-gaps-folded="false"]')).not.toBeNull();
    expect(props.noteCanvasRuntime.pageFrames[0].height).toBe(7000);
  });
});

function alignment(frameX: number, mode: SurfaceMode, options: {
  gear?: PageReadingGear; stepFactor?: number; frameOverrides?: Partial<PageFrameModel>;
} = {}) {
  const pageFrame = { ...frame(frameX), ...options.frameOverrides };
  const props = { ...propsFor(pageFrame, mode), pageReadingViewState: {
    gear: options.gear ?? 'fit_width', stepFactor: options.stepFactor ?? 1,
  } };
  const before = JSON.stringify(pageFrame);
  const view = render(<NoteWritingSurfaceLayer {...props} />);
  const block = view.container.querySelector<HTMLElement>('[data-note-block-shell]')!;
  const ruler = view.container.querySelector<HTMLElement>('[data-page-frame-guide="top-ruler"]')!;
  const boundary = view.container.querySelector<HTMLElement>('[data-page-frame-index="0"]');
  const paper = block.closest<HTMLElement>('[data-page-display-scale]');
  const scale = paper ? Number(paper.dataset.pageDisplayScale) : 1;
  if (mode === 'page') expect(ruler.closest('[data-page-display-scale]')).toBe(paper);
  // jsdom has no layout engine: these are the actual committed production DOM
  // coordinate inputs, measured in unscaled CSS pixels, not invented client rects.
  const result = {
    rulerOffset: Number.parseFloat(ruler.style.left) - Number.parseFloat(block.style.left),
    rulerTopOffset: Number.parseFloat(ruler.style.top) - Number.parseFloat(block.style.top),
    rulerWidth: Number.parseFloat(ruler.style.width),
    blockWidth: Number.parseFloat(block.style.width),
    scale,
    transformedOffset: (Number.parseFloat(ruler.style.left) - Number.parseFloat(block.style.left)) * scale,
    boundaryOffset: boundary
      ? Number.parseFloat(boundary.style.left) + pageFrame.contentInset.left - Number.parseFloat(block.style.left)
      : null,
  };
  expect(JSON.stringify(pageFrame)).toBe(before);
  view.unmount();
  return result;
}

it('C4 paper tools are available in writing and disabled in layout and read-only modes', () => {
  const props = propsFor(frame(0), 'page');
  const view = render(<NoteWritingSurfaceLayer {...props} contentReadOnly={false} layoutMode={false} />);
  expect((view.getByRole('button', { name: /^Pen$/ }) as HTMLButtonElement).disabled).toBe(false);
  expect((view.getByRole('button', { name: /^Eraser$/ }) as HTMLButtonElement).disabled).toBe(false);
  view.rerender(<NoteWritingSurfaceLayer {...props} contentReadOnly={false} layoutMode />);
  expect((view.getByRole('button', { name: /^Pen$/ }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<NoteWritingSurfaceLayer {...props} contentReadOnly layoutMode={false} />);
  expect((view.getByRole('button', { name: /^Eraser$/ }) as HTMLButtonElement).disabled).toBe(true);
});

describe('C4a four toolbar groups and shared insert doors', () => {
  it('reveals a folded chapter for Agent focus before resolving its new page position, without a domain save', async () => {
    const props = propsFor(frame(0), 'page');
    const body = props.allBlocks[0];
    const heading = { ...body, id: 'heading', content_json: { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1('Chapter', 'heading_1') } };
    const projection = deriveChapterProjection([heading, body]);
    const reveal = vi.fn();
    const scrollTo = vi.fn();
    const main = document.createElement('main'); main.dataset.appMainScroll = 'true'; main.scrollTo = scrollTo;
    document.body.append(main);
    function FoldedSurface() {
      const [collapsed, setCollapsed] = useState(true);
      return <NoteAgentContextRoute.Provider value={true}><NoteWritingSurfaceLayer {...props}
        visibleBlocks={collapsed ? [] : [body]} allBlocks={[heading, body]}
        blockLayouts={{ ...props.blockLayouts, [body.id]: { ...props.blockLayouts[body.id], y: collapsed ? 10 : 960 } }}
        chapterPresentation={{ projection, collapsedChapterIds: new Set(collapsed ? [projection.chapters[0].id] : []),
          numbered: false, onToggleNumbering: vi.fn(), onToggleChapter: vi.fn(),
          onRevealChapter: (id) => { reveal(id); setCollapsed(false); } }} />
      </NoteAgentContextRoute.Provider>;
    }
    const view = render(<FoldedSurface />, { container: main, baseElement: document.body });
    act(() => useAgentUiStore.setState({ focusCommand: { kind: 'focus_object', command_id: 'fold', turn_id: 'turn', conversation_id: 'conv',
      target: { type: 'note_block', note_id: props.noteId, block_id: body.id } } }));
    await waitFor(() => expect(main.querySelector('[data-note-block-shell][data-agent-ui-highlight="true"]')).not.toBeNull());
    expect(reveal).toHaveBeenCalledExactlyOnceWith(projection.chapters[0].id);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo.mock.calls[0][0].top).toBeGreaterThan(500);
    expect(props.onSaveBlock).not.toHaveBeenCalled(); expect(props.onCreateBlock).not.toHaveBeenCalled();
    expect(props.onPersistCanvasObject).not.toHaveBeenCalled();
    act(() => useAgentUiStore.getState().reset());
    view.unmount(); main.remove();
  });
  it('groups controls in the contracted order and exposes all seven menu labels with keyboard navigation', () => {
    const props = propsFor(frame(0), 'page');
    const view = render(<NoteWritingSurfaceLayer {...props} contentReadOnly={false} layoutMode={false}
      onCreateTable={vi.fn(async () => true)} onCreateComponent={vi.fn(async () => true)} />);
    const toolbar = view.getByRole('group', { name: 'Page reading controls' });
    expect([...toolbar.querySelectorAll('[data-note-toolbar-group]')].map((group) => group.getAttribute('aria-label')))
      .toEqual(['纸的状态', '手上的笔', '插入内容', '看的方式']);
    expect(within(view.getByRole('group', { name: '手上的笔' })).getAllByRole('button').map((button) => button.getAttribute('aria-label')))
      .toEqual(['Selection', 'Pen', 'Eraser']);
    const trigger = view.getByRole('button', { name: '插入' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = view.getByRole('menu', { name: '插入' });
    const items = within(menu).getAllByRole('menuitem') as HTMLButtonElement[];
    expect(items.map((item) => item.textContent)).toEqual(['表格', '时间线', '柱图', '折线图', '媒体图', '引文框', '提示框']);
    expect(document.activeElement).toBe(items[0]);
    expect(items[0].title).toBe('Insert table');
    expect(items.slice(4).every((item) => item.disabled)).toBe(true);
    fireEvent.keyDown(menu, { key: 'End' }); expect(document.activeElement).toBe(items[3]);
    fireEvent.keyDown(menu, { key: 'ArrowDown' }); expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(view.queryByRole('menu', { name: '插入' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(props.onCreateBlock).not.toHaveBeenCalled();
  });

  it.each(NOTE_INSERT_COMMANDS)('$label opens the same existing editor from menu and slash host', async (command) => {
    const props = propsFor(frame(0), 'page');
    const source = props.allBlocks[0];
    const onCreateTable = vi.fn(async () => true);
    const onCreateComponent = vi.fn<NonNullable<NoteWritingSurfaceLayerProps['onCreateComponent']>>(async () => true);
    const onSaveParagraphFurniture = vi.fn(async () => true);
    const paste = vi.spyOn(mediaPaste, 'pasteMediaBlock').mockResolvedValue(null);
    const host: { current: NoteInsertCommandHost | null } = { current: null };
    const view = render(<NoteInsertCommandsContext.Provider value={host}>
      <NoteWritingSurfaceLayer {...props} contentReadOnly={false} layoutMode={false} selectedBlockId={source.id}
        onCreateTable={onCreateTable} onCreateComponent={onCreateComponent} onSaveParagraphFurniture={onSaveParagraphFurniture} />
    </NoteInsertCommandsContext.Provider>);
    const before = structuredClone(source);
    const imageInput = view.getByLabelText('选择媒体图') as HTMLInputElement;
    const imageClick = vi.spyOn(imageInput, 'click');
    for (const entry of ['menu', 'slash'] as const) {
      if (entry === 'menu') {
        fireEvent.click(view.getByRole('button', { name: '插入' }));
        fireEvent.click(view.getByRole('menuitem', { name: command.label }));
      } else act(() => host.current!.run(command.insertAction!, source.id));
      if (command.insertAction === 'media') {
        expect(imageClick).toHaveBeenCalledTimes(entry === 'menu' ? 1 : 2);
        const file = new File(['png'], 'tiny.png', { type: 'image/png' });
        fireEvent.change(imageInput, { target: { files: [file] } });
        await waitFor(() => expect(paste).toHaveBeenCalledTimes(entry === 'menu' ? 1 : 2));
        expect(paste.mock.lastCall?.[0]).toMatchObject({ blockId: source.id, file, createBlock: props.onCreateBlock });
      } else if (command.insertAction === 'quote_frame' || command.insertAction === 'callout_frame') {
        const dialog = view.getByRole('dialog', { name: '段落样式' });
        expect((within(dialog).getByRole('combobox') as HTMLSelectElement).value)
          .toBe(command.insertAction === 'quote_frame' ? 'quote' : 'callout');
        fireEvent.click(within(dialog).getByRole('button', { name: '保存样式' }));
        await waitFor(() => expect(view.queryByRole('dialog', { name: '段落样式' })).toBeNull());
        expect(onSaveParagraphFurniture.mock.lastCall).toEqual([source, command.insertAction === 'quote_frame'
          ? { variant: 'quote', source: '' } : { variant: 'callout', label: '注' }]);
      } else {
        const dialog = view.getByRole('dialog', { name: command.insertAction === 'table' ? 'Edit table'
          : command.insertAction === 'timeline' ? 'Edit timeline' : 'Edit chart' });
        fireEvent.click(within(dialog).getByRole('button', { name: /^Save/ }));
        await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
        if (command.insertAction === 'table') expect(onCreateTable).toHaveBeenCalledTimes(entry === 'menu' ? 1 : 2);
        else expect(onCreateComponent.mock.lastCall?.[0]).toMatchObject({ component_kind: command.insertAction });
      }
    }
    expect(source).toEqual(before);
    expect(props.onSaveBlock).not.toHaveBeenCalled();
  });
});

describe('view options writing-surface integration', () => {
  it('forwards shared overlay controls and preserves long-page Fit page scrolling and the Overview action', () => {
    const props = propsFor({ ...frame(80), height: 6000 }, 'page');
    const onPageReadingGearChange = vi.fn();
    const onToggleViewOptions = vi.fn();
    const onCloseViewOptions = vi.fn();
    const onToggleOverview = vi.fn();
    const appMain = document.createElement('main');
    appMain.dataset.appMainScroll = 'true';
    appMain.scrollTo = vi.fn();
    document.body.append(appMain);
    const view = render(<MemoryRouter><WritingSurfaceThroughLayerProps surfaceProps={{ ...props,
      showViewOptions: true, onToggleViewOptions, onCloseViewOptions,
      onPageReadingGearChange, pageReadingViewState: { gear: 'fit_width', stepFactor: 1 },
    }} /></MemoryRouter>, { container: appMain, baseElement: document.body });
    const controls = appMain.querySelector('[data-page-reading-control="true"]')!;
    expect(controls.querySelector('[data-page-reading-select]')).toBeNull();
    fireEvent.click(view.getByRole('menuitemradio', { name: 'Fit page' }));
    expect(onPageReadingGearChange).toHaveBeenCalledExactlyOnceWith('fit_page');
    expect(appMain.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'auto' });
    expect(onCloseViewOptions).toHaveBeenCalledOnce();
    fireEvent.click(view.getByRole('button', { name: 'View options' }));
    expect(onToggleViewOptions).toHaveBeenCalledOnce();
    view.rerender(<NoteWritingSurfaceLayer {...props} onToggleOverview={onToggleOverview} />);
    const overview = view.getByRole('button', { name: 'Page overview' });
    expect(overview.previousElementSibling?.getAttribute('data-page-reading-view-options')).toBe('true');
    fireEvent.click(overview);
    expect(onToggleOverview).toHaveBeenCalledOnce();
    expect(view.getByRole('button', { name: 'Decrease page reading step' })).not.toBeNull();
    expect(view.getByRole('button', { name: 'Increase page reading step' })).not.toBeNull();
    expect(view.getByRole('button', { name: 'Selection' })).not.toBeNull();
    expect(view.getByRole('button', { name: 'Pen' })).not.toBeNull();
    expect(view.getByRole('button', { name: 'Eraser' })).not.toBeNull();
    appMain.remove();
  });
});

it('F15: the actual block/surface mouse chain preserves press feedback and a click opens the unit menu', () => {
  const props = propsFor(frame(0), 'page');
  const flow = createTextBlockContentV1('Synthetic handle press');
  flow.units[0].id = 'synthetic-press-unit';
  const source = { ...props.visibleBlocks[0], plain_text: flow.units[0].text,
    content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
  const selectBlock = vi.fn();
  const blockListMouseDown = vi.fn();
  const extract = vi.fn(async () => true);
  const view = render(<NoteWritingSurfaceLayer {...props} visibleBlocks={[source]} allBlocks={[source]}
    contentReadOnly={false} layoutMode={false} onSelectBlock={selectBlock}
    onBlockListMouseDown={blockListMouseDown} onExtractTextUnit={extract} />);
  const handle = view.container.querySelector<HTMLElement>('[data-text-unit-handle="synthetic-press-unit"]')!;
  const sendPointer = (type: string) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true,
      button: 0, clientX: 85, clientY: 110 });
    Object.defineProperties(event, { pointerId: { value: 23 }, pointerType: { value: 'mouse' }, isPrimary: { value: true } });
    fireEvent(handle, event);
  };
  sendPointer('pointerdown');
  expect(view.container.querySelector<HTMLElement>('[data-text-unit-drop-indicator="synthetic-press-unit"]')?.dataset.dropEdge).toBe('before');
  // Exercise the real ancestor handlers even if a compatibility mousedown is
  // delivered after pointerdown; it must neither focus a textarea nor lose the cue.
  fireEvent.mouseDown(handle, { button: 0, clientX: 85, clientY: 110 });
  expect(blockListMouseDown).toHaveBeenCalledTimes(1);
  expect(selectBlock).not.toHaveBeenCalled();
  expect(view.container.querySelector('[data-text-unit-drop-indicator="synthetic-press-unit"]')).not.toBeNull();
  sendPointer('pointerup');
  fireEvent.mouseUp(handle, { button: 0, clientX: 85, clientY: 110 });
  fireEvent.click(handle, { clientX: 85, clientY: 110 });
  expect(view.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
  expect(view.getByRole('menu', { name: 'Text unit' })).toBeTruthy();
  expect(props.onApplyBlockTextFlowEdit).not.toHaveBeenCalled();
  expect(extract).not.toHaveBeenCalled();
});

describe('B10 extraction landing through the actual writing surface', () => {
  function expectLandedPageVisible(source: NoteBlock, layout: BlockBoxLayout, pageFrame: PageFrameModel, pageOffsetX: number) {
    const landed: NoteBlock = { ...source, id: `${source.id}-landed`, placement_id: `${source.placement_id}-landed`,
      canvas_layout: { ...layout } };
    const resolved = renderHook(() => useNoteCanvasResolvedLayoutModel({
      contentWidth: 760, coordinateContract: 'v2',
      documentTypographyProfile: createDefaultDocumentTypographyProfile(), layoutDrafts: {},
      sortedBlocks: [landed], pageFrames: [pageFrame], surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page'),
    }));
    expect(resolved.result.current.visibleBlocks.map((block) => block.id)).toEqual([landed.id]);
    const persistedLayout = resolved.result.current.blockLayouts[landed.id];
    expect(persistedLayout.x).toBeCloseTo(layout.x);
    expect(persistedLayout.y).toBeCloseTo(layout.y);
    expect(persistedLayout.width).toBeCloseTo(layout.width);
    const pageProps = propsFor(pageFrame, 'page');
    const view = render(<NoteWritingSurfaceLayer {...pageProps} contentReadOnly={false} layoutMode={false}
      allBlocks={[landed]} visibleBlocks={resolved.result.current.visibleBlocks}
      blockLayouts={resolved.result.current.blockLayouts} pageOffsetX={pageOffsetX} />);
    const shell = view.container.querySelector<HTMLElement>(`[data-note-block-shell="true"][data-block-id="${landed.id}"]`)!;
    expect(shell).not.toBeNull();
    expect(shell.hidden).toBe(false);
    const screen = resolveScreenRect(layout, pageFrame, 'v2', pageOffsetX);
    expect(Number.parseFloat(shell.style.left)).toBeCloseTo(screen.x);
    expect(Number.parseFloat(shell.style.top)).toBeCloseTo(screen.y);
    view.unmount();
    resolved.unmount();
  }

  it('round-trips canvas zoom/pan and nonzero frame origin to the actual release point on paper', () => {
    const pageFrame = { ...frame(200), y: 80, contentInset: { left: 72, right: 72, top: 40, bottom: 96 } };
    const props = propsFor(pageFrame, 'canvas');
    const flow = createTextBlockContentV1('Synthetic canvas extraction');
    flow.units[0].id = 'synthetic-canvas-unit';
    const source = { ...props.visibleBlocks[0], plain_text: flow.units[0].text,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
    const extract = vi.fn(async (_block: NoteBlock, _unitId: string, _layout: BlockBoxLayout) => true);
    const pageOffsetX = 96;
    const viewport = { x: 250, y: 150, zoom: 1.5, width: 1024, height: 768 };
    const view = render(<NoteWritingSurfaceLayer {...props} visibleBlocks={[source]} allBlocks={[source]}
      contentReadOnly={false} layoutMode={false} pageOffsetX={pageOffsetX} viewportTransform={viewport}
      onExtractTextUnit={extract} />);
    expect(props.defaultDraftLayout.width).toBe(760);
    const surface = view.container.querySelector<HTMLElement>('[data-page-frame-template]')!;
    const projection = view.container.querySelector<HTMLElement>('[data-text-unit-editor]')!;
    const handle = view.container.querySelector<HTMLElement>('[data-text-unit-handle="synthetic-canvas-unit"]')!;
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 30, width: 1024, height: 768 } as DOMRect);
    vi.spyOn(projection, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, right: 320, bottom: 160,
      width: 220, height: 60 } as DOMRect);
    const originalHit = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => props.blockListRef.current });
    const release = { x: 20 + (500 - viewport.x) * viewport.zoom, y: 30 + (500 - viewport.y) * viewport.zoom };
    const drop = (x: number, y: number) => {
      for (const [type, clientX, clientY] of [
        ['pointerdown', 95, 110], ['pointermove', x, y], ['pointerup', x, y],
      ] as const) {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX, clientY });
        Object.defineProperties(event, { pointerId: { value: 20 }, pointerType: { value: 'mouse' }, isPrimary: { value: true } });
        fireEvent(handle, event);
      }
    };
    try {
      drop(release.x, release.y);
      expect(extract).toHaveBeenCalledTimes(1);
      const layout = extract.mock.calls[0][2];
      const rendered = resolveScreenRect(layout, pageFrame, 'v2', pageOffsetX);
      expect(20 + (rendered.x - viewport.x) * viewport.zoom).toBeCloseTo(release.x);
      expect(30 + (rendered.y - viewport.y) * viewport.zoom).toBeCloseTo(release.y);
      expect(layout).toMatchObject({ coordinate_space: 'page_frame_local', frame_id: pageFrame.id, surface: 'formal_page' });
      expect(layout.width).toBeLessThanOrEqual(760 - layout.x);
      expectLandedPageVisible(source, layout, pageFrame, pageOffsetX);
      drop(release.x + 4000, release.y);
      expect(extract).toHaveBeenCalledTimes(1);
    } finally {
      if (originalHit) Object.defineProperty(document, 'elementFromPoint', originalHit);
      else delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
    }
  });

  it.each([220, 760 - MIN_BLOCK_WIDTH])('maps release x=%i through page scale/frame origin, including the last legal point, and rejects invalid drops', (releaseX) => {
    const pageFrame = { ...frame(200), y: 80, contentInset: { left: 72, right: 72, top: 40, bottom: 96 } };
    const props = propsFor(pageFrame, 'page');
    const flow = createTextBlockContentV1('Synthetic unit to extract');
    flow.units[0].id = 'synthetic-extract-unit';
    const source = { ...props.visibleBlocks[0], plain_text: flow.units[0].text,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
    const extract = vi.fn(async (_block: NoteBlock, _unitId: string, _layout: BlockBoxLayout) => true);
    const view = render(<NoteWritingSurfaceLayer {...props} visibleBlocks={[source]} allBlocks={[source]}
      contentReadOnly={false} layoutMode={false} pageOffsetX={40}
      pageReadingViewState={{ gear: 'fit_width', stepFactor: 0.8 }} onExtractTextUnit={extract} />);
    expect(props.defaultDraftLayout.width).toBe(760);
    const blockList = props.blockListRef.current!;
    const projection = view.container.querySelector<HTMLElement>('[data-text-unit-editor]')!;
    const handle = view.container.querySelector<HTMLElement>('[data-text-unit-handle="synthetic-extract-unit"]')!;
    const paper = projection.closest<HTMLElement>('[data-page-display-scale]')!;
    const scale = Number(paper.dataset.pageDisplayScale);
    expect(scale).toBeGreaterThan(0);
    expect(scale).not.toBe(1);
    const rect = (x: number, y: number, width: number, height: number): DOMRect => ({ x, y, left: x, top: y,
      right: x + width, bottom: y + height, width, height, toJSON: () => ({ x, y, width, height }) });
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue(rect(120, 180, 760 * scale, 1182 * scale));
    vi.spyOn(projection, 'getBoundingClientRect').mockReturnValue(rect(130, 190, 200, 50));
    const point = { x: 120 + (releaseX + 40) * scale, y: 180 + 400 * scale };
    const hit = vi.fn((): Element | null => blockList);
    const originalHit = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit });
    const drop = (x: number, y: number) => {
      for (const [type, clientX, clientY] of [
        ['pointerdown', 120, 200], ['pointermove', x, y], ['pointerup', x, y],
      ] as const) {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX, clientY });
        Object.defineProperties(event, { pointerId: { value: 19 }, pointerType: { value: 'mouse' }, isPrimary: { value: true } });
        fireEvent(handle, event);
      }
    };
    try {
      drop(point.x, point.y);
      expect(extract).toHaveBeenCalledTimes(1);
      expect(extract.mock.calls[0][0]).toMatchObject({ id: source.id });
      expect(extract.mock.calls[0][1]).toBe('synthetic-extract-unit');
      const layout = extract.mock.calls[0][2] as BlockBoxLayout;
      expect(layout.x).toBeCloseTo(releaseX);
      expect(layout.y).toBeCloseTo(280);
      expect(layout).toMatchObject({ coordinate_space: 'page_frame_local', frame_id: pageFrame.id, surface: 'formal_page' });
      expect(layout.width).toBeLessThanOrEqual(760 - layout.x);
      if (releaseX === 760 - MIN_BLOCK_WIDTH) expect(layout.width).toBeCloseTo(MIN_BLOCK_WIDTH);
      const rendered = resolveScreenRect(layout, pageFrame, 'v2', 40);
      expect(120 + rendered.x * scale).toBeCloseTo(point.x);
      expect(180 + rendered.y * scale).toBeCloseTo(point.y);
      expectLandedPageVisible(source, layout, pageFrame, 40);
      // A shell hit must not become cross-block migration, even at a valid paper point.
      const neighbor = document.createElement('article');
      neighbor.dataset.noteBlockShell = 'true';
      blockList.appendChild(neighbor);
      hit.mockReturnValue(neighbor);
      drop(point.x, point.y);
      hit.mockReturnValue(blockList);
      // Still inside paper, but only MIN_BLOCK_WIDTH - 1 px remain. Do not
      // invoke the history/create owner when its legacy landing writer cannot save it.
      drop(120 + (760 - MIN_BLOCK_WIDTH + 1 + 40) * scale, point.y);
      expect(extract).toHaveBeenCalledTimes(1);
      drop(120 + 1200 * scale, point.y);
      hit.mockReturnValue(document.body);
      drop(point.x, point.y);
      expect(extract).toHaveBeenCalledTimes(1);
      expect(props.onCreateBlock).not.toHaveBeenCalled();
    } finally {
      if (originalHit) Object.defineProperty(document, 'elementFromPoint', originalHit);
      else delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
    }
  });
});

describe('C3/F15 cross-block unit handle events through the production layer-props bridge and writing surface', () => {
  let hit: ReturnType<typeof vi.fn<() => Element | null>>;
  let originalHit: PropertyDescriptor | undefined;
  beforeEach(() => {
    originalHit = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
    hit = vi.fn((): Element | null => null);
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit });
  });
  afterEach(() => {
    if (originalHit) Object.defineProperty(document, 'elementFromPoint', originalHit);
    else delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
  });

  const rect = (x: number, y: number, width: number, height: number): DOMRect => ({
    x, y, left: x, top: y, right: x + width, bottom: y + height, width, height,
    toJSON: () => ({ x, y, width, height }),
  });
  function pointer(handle: HTMLElement, type: string, x: number, y: number) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 31 }, pointerType: { value: 'mouse' }, isPrimary: { value: true } });
    fireEvent(handle, event);
  }
  function renderMoveSurface(prefix = 'c3', noteId = 'synthetic-c3-note') {
    const props = propsFor(frame(0), 'page');
    const sourceFlow = createTextBlockContentV1('Synthetic checked task');
    sourceFlow.units[0] = { ...sourceFlow.units[0], id: `${prefix}-move`, writing_role: 'todo_item',
      indent_level: 2, metadata: { checked: true, retained: { field: 'source' } } };
    const targetFlow = createTextBlockContentV1('');
    targetFlow.units = ['Before', 'After'].map((text, index) => ({ ...targetFlow.units[0],
      id: `${prefix}-target-${index}`, text, order_index: index, writing_role: 'quote' as const }));
    const source: NoteBlock = { ...props.visibleBlocks[0], id: `${prefix}-source`,
      placement_id: `${prefix}-source-placement`, plain_text: sourceFlow.units[0].text,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: sourceFlow } };
    const target: NoteBlock = { ...source, id: `${prefix}-target`, placement_id: `${prefix}-target-placement`,
      plain_text: 'Before\nAfter', content_json: { [TEXT_FLOW_CONTENT_KEY]: targetFlow }, order_index: 1 };
    const code: NoteBlock = { ...source, id: `${prefix}-code`, placement_id: `${prefix}-code-placement`,
      block_type: 'code', plain_text: 'const synthetic = true;', content_json: { body: 'const synthetic = true;', language: 'typescript' },
      metadata: { template_key: 'text.code' }, order_index: 2 };
    const blocks = [source, target, code];
    const layouts = Object.fromEntries(blocks.map((block, index) => [block.id, { ...props.defaultDraftLayout, y: index * 180 }]));
    const move = vi.fn<NonNullable<NoteWritingSurfaceLayerProps['onMoveTextUnit']>>(async () => true);
    const extract = vi.fn<NonNullable<NoteWritingSurfaceLayerProps['onExtractTextUnit']>>(async () => true);
    const view = render(<MemoryRouter><WritingSurfaceThroughLayerProps surfaceProps={{
      ...props, noteId, contentReadOnly: false, layoutMode: false,
      allBlocks: blocks, visibleBlocks: blocks, sortedBlockCount: blocks.length, blockLayouts: layouts,
      pageOffsetX: 0, onMoveTextUnit: move, onExtractTextUnit: extract,
    }} /></MemoryRouter>);
    const editor = (blockId: string) => view.container.querySelector<HTMLElement>(`[data-text-unit-editor="${blockId}"]`)!;
    const sourceEditor = editor(source.id);
    const targetEditor = editor(target.id);
    const sourceHandle = sourceEditor.querySelector<HTMLElement>(`[data-text-unit-handle="${prefix}-move"]`)!;
    vi.spyOn(sourceEditor, 'getBoundingClientRect').mockReturnValue(rect(100, 100, 400, 40));
    vi.spyOn(sourceEditor.querySelector<HTMLElement>('[data-text-unit-row]')!, 'getBoundingClientRect')
      .mockReturnValue(rect(100, 100, 400, 40));
    vi.spyOn(targetEditor, 'getBoundingClientRect').mockReturnValue(rect(100, 300, 400, 80));
    [...targetEditor.querySelectorAll<HTMLElement>('[data-text-unit-row]')].forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect(100, 300 + index * 40, 400, 40));
    });
    const blockList = props.blockListRef.current!;
    const scale = Number(sourceEditor.closest<HTMLElement>('[data-page-display-scale]')!.dataset.pageDisplayScale);
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue(rect(100, 100, 760 * scale, 1182 * scale));
    return { ...view, props, blocks, source, target, code, sourceFlow, targetFlow, move, extract, sourceEditor,
      targetEditor, sourceHandle, blockList, scale,
      start: () => pointer(sourceHandle, 'pointerdown', 90, 110),
      over: (y = 340) => pointer(sourceHandle, 'pointermove', 120, y),
      release: (y = 340) => pointer(sourceHandle, 'pointerup', 120, y),
    };
  }

  it.each([{ y: 340, edge: 'before' }, { y: 375, edge: 'after' }] as const)(
    'smoke 1: paints the target $edge line and dispatches one move with the original role and fields', ({ y, edge }) => {
      const editor = renderMoveSurface();
      const before = structuredClone(editor.blocks);
      expect(editor.sourceEditor.dataset.textUnitMoveEnabled).toBe('true');
      expect(editor.targetEditor.dataset.textUnitMoveEnabled).toBe('true');
      hit.mockReturnValue(editor.targetEditor.querySelector('[data-text-unit-row="c3-target-1"]'));
      editor.start(); editor.over(y);
      const line = editor.targetEditor.querySelector<HTMLElement>('[data-text-unit-drop-indicator="c3-target-1"]');
      expect(line?.dataset.dropEdge).toBe(edge);
      expect(editor.sourceEditor.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
      expect(editor.move).not.toHaveBeenCalled();
      expect(editor.extract).not.toHaveBeenCalled();
      editor.release(y);
      expect(editor.move).toHaveBeenCalledExactlyOnceWith(editor.source, 'c3-move', editor.target, 'c3-target-1', edge);
      // This surface dispatches the intact truth to the atomic history owner;
      // its persistence and undo are exercised by the dedicated history tests.
      expect(editor.move.mock.calls[0][0].content_json).toEqual(before[0].content_json);
      expect(editor.sourceFlow.units[0]).toMatchObject({ writing_role: 'todo_item', indent_level: 2,
        metadata: { checked: true, retained: { field: 'source' } } });
      expect(editor.blocks).toEqual(before);
      expect(editor.extract).not.toHaveBeenCalled();
      expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    },
  );

  it('smoke 4: moving over a text block then releasing on blank paper keeps B10 extraction', () => {
    const editor = renderMoveSurface();
    hit.mockReturnValue(editor.targetEditor);
    editor.start(); editor.over();
    expect(editor.targetEditor.querySelector('[data-text-unit-drop-indicator]')).not.toBeNull();
    hit.mockReturnValue(editor.blockList);
    const blank = { x: 100 + 220 * editor.scale, y: 100 + 600 * editor.scale };
    pointer(editor.sourceHandle, 'pointermove', blank.x, blank.y);
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    pointer(editor.sourceHandle, 'pointerup', blank.x, blank.y);
    expect(editor.move).not.toHaveBeenCalled();
    expect(editor.extract).toHaveBeenCalledTimes(1);
    expect(editor.extract.mock.calls[0].slice(0, 2)).toEqual([editor.source, 'c3-move']);
    const layout = editor.extract.mock.calls[0][2];
    const screen = resolveScreenRect(layout, frame(0), 'v2', 0);
    expect(100 + screen.x * editor.scale).toBeCloseTo(blank.x);
    expect(100 + screen.y * editor.scale).toBeCloseTo(blank.y);
    expect(layout.surface).toBe('formal_page');
  });

  it('smoke 5: source/target composition refuses a drag and composition beginning mid-drag clears the line', () => {
    const editor = renderMoveSurface();
    hit.mockReturnValue(editor.targetEditor);
    for (const textarea of [editor.sourceEditor.querySelector('textarea')!, editor.targetEditor.querySelector('textarea')!]) {
      fireEvent.compositionStart(textarea);
      editor.start(); editor.over(); editor.release();
      expect(editor.move).not.toHaveBeenCalled();
      expect(editor.extract).not.toHaveBeenCalled();
      expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
      fireEvent.compositionEnd(textarea);
    }
    editor.start(); editor.over();
    expect(editor.targetEditor.querySelector('[data-text-unit-drop-indicator]')).not.toBeNull();
    const targetTextarea = editor.targetEditor.querySelector('textarea')!;
    fireEvent.compositionStart(targetTextarea);
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    fireEvent.compositionEnd(targetTextarea);
    editor.release();
    expect(editor.move).not.toHaveBeenCalled();
    expect(editor.extract).not.toHaveBeenCalled();
    editor.start(); editor.over(); editor.release();
    expect(editor.move).toHaveBeenCalledTimes(1);
  });

  it('smoke 5: a code block rejects the unit without becoming a blank-paper extraction', () => {
    const editor = renderMoveSurface();
    const codeShell = editor.container.querySelector<HTMLElement>(`[data-note-block-shell="true"][data-block-id="${editor.code.id}"]`)!;
    expect(codeShell).not.toBeNull();
    expect(codeShell.querySelector('[data-text-unit-editor]')).toBeNull();
    hit.mockReturnValue(codeShell.querySelector('textarea') ?? codeShell);
    editor.start(); editor.over(); editor.release();
    expect(editor.move).not.toHaveBeenCalled();
    expect(editor.extract).not.toHaveBeenCalled();
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
  });

  it.each(['synthetic-c3-note', 'synthetic-other-note'])(
    'smoke 5: another mounted writing surface (note %s) cannot receive this drag', (noteId) => {
      const editor = renderMoveSurface();
      const other = renderMoveSurface('foreign-c3', noteId);
      hit.mockReturnValue(other.targetEditor);
      editor.start(); editor.over(); editor.release();
      expect(editor.move).not.toHaveBeenCalled();
      expect(editor.extract).not.toHaveBeenCalled();
      expect(other.move).not.toHaveBeenCalled();
      expect(other.extract).not.toHaveBeenCalled();
      expect(document.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    },
  );
});

describe('page frame decoration alignment on synthetic collections', () => {
  it.each(['page'] as const)('F16: header/footer/page-number use the %s coordinate frame without moving stored slot geometry', (mode) => {
    const pageFrame = { ...frame(208), y: 136,
      contentInset: { left: 54, right: 86, top: 44, bottom: 92 } };
    const props = propsFor(pageFrame, mode);
    const original = structuredClone({ pageFrame, extensions: props.noteCanvasRuntime.pageFrameExtensions });
    const view = render(<NoteWritingSurfaceLayer {...props} />);
    const block = view.container.querySelector<HTMLElement>('[data-note-block-shell]')!;
    const ruler = view.container.querySelector<HTMLElement>('[data-page-frame-guide="top-ruler"]')!;
    const blockLeft = Number.parseFloat(block.style.left);
    const blockTop = Number.parseFloat(block.style.top);
    for (const [kind, topInFrame] of [
      ['header', 18], ['footer', pageFrame.height - 72], ['page-number', pageFrame.height - 38],
    ] as const) {
      const slot = view.container.querySelector<HTMLElement>(`[data-page-frame-slot="${kind}"]`)!;
      expect(slot).not.toBeNull();
      expect(Number.parseFloat(slot.style.width)).toBe(Number.parseFloat(block.style.width));
      expect(Number.parseFloat(slot.style.left)).toBe(Number.parseFloat(ruler.style.left));
      // The frame's vertical origin stays shared by slots and the block column.
      expect(Number.parseFloat(slot.style.top) - blockTop).toBe(topInFrame - pageFrame.contentInset.top);
        expect(Number.parseFloat(slot.style.left)).toBe(blockLeft);
        expect(slot.closest('[data-page-display-scale]')).toBe(block.closest('[data-page-display-scale]'));
    }
    expect({ pageFrame, extensions: props.noteCanvasRuntime.pageFrameExtensions }).toEqual(original);
  });

  it('aligns the page top ruler with the block column despite a historical frame x', () => {
    const sample = alignment(80, 'page');
    expect(sample.rulerOffset, 'top ruler minus block column in CSS px').toBe(0);
    expect(sample.rulerWidth).toBe(sample.blockWidth);
    expect(sample.boundaryOffset).toBeNull();
  });

  it('preserves a collection whose frame content origin already matches page offset', () => {
    expect(alignment(-72, 'page').rulerOffset).toBe(0);
  });

  it('uses the same block coordinate origin with non-default frame y and content insets', () => {
    const sample = alignment(-320, 'page', { frameOverrides: {
      y: 180, width: 880, contentInset: { left: 54, right: 86, top: 44, bottom: 92 },
    } });
    expect(sample.rulerOffset).toBe(0);
    expect(sample.rulerTopOffset).toBe(0);
    expect(sample.rulerWidth).toBe(sample.blockWidth);
  });

  it.each(['fit_width', 'fit_page', 'physical'] as PageReadingGear[])(
    'keeps both edges aligned at every 0.1 step from 0.5 to 2.0 for %s', (gear) => {
      for (let step = 5; step <= 20; step += 1) {
        const sample = alignment(80, 'page', { gear, stepFactor: step / 10 });
        expect(sample.transformedOffset).toBe(0);
        expect(sample.rulerTopOffset * sample.scale).toBe(0);
        expect(sample.rulerWidth * sample.scale).toBe(sample.blockWidth * sample.scale);
      }
    },
  );

  it('keeps Fit width alignment as available space changes', () => {
    for (const width of [480, 904, 1366]) {
      availableWidth = width;
      const sample = alignment(80, 'page');
      expect(sample.scale).toBe(width / 904);
      expect(sample.transformedOffset).toBe(0);
    }
  });

  it('leaves print and overview frame-local page projections unchanged for the same historical collection', () => {
    const props = propsFor(frame(80), 'page');
    const before = JSON.stringify(props.noteCanvasRuntime.pageFrames);
    const view = render(<>
      <NoteOverviewLayer writingSurfaceProps={props} onSelectPage={vi.fn()} onClose={vi.fn()} />
      <NotePrintLayer {...props} />
    </>);
    const overview = view.container.querySelector<HTMLElement>('[data-note-overview-canvas]')!;
    const overviewFragment = overview.querySelector<HTMLElement>('[data-note-readonly-fragment]')!;
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const print = document.querySelector<HTMLElement>('[data-note-print-canvas]')!;
    const printFragment = print.querySelector<HTMLElement>('[data-note-readonly-fragment]')!;
    for (const canvas of [overview, print]) {
      expect(canvas.style.width).toBe('904px');
      expect(canvas.style.height).toBe('1278px');
    }
    for (const fragment of [overviewFragment, printFragment]) {
      expect(fragment.style.left).toBe('72px');
      expect(fragment.style.top).toBe('0px');
      expect(fragment.style.width).toBe('760px');
      expect(fragment.querySelector<HTMLElement>('[data-note-block-shell]')!.style.left).toBe('0px');
    }
    expect(JSON.stringify(props.noteCanvasRuntime.pageFrames)).toBe(before);
    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(document.querySelector('[data-note-print-root]')).toBeNull();
  });
});

it('E3 toolbar uses named icons and explicit switching while runtime rebuilds preserve ink selection', async () => {
  const pageFrame = frame(0);
  const props = { ...propsFor(pageFrame, 'page'), contentReadOnly: false, layoutMode: false, onBlockListMouseDown: vi.fn() };
  const stroke = createPaperFreehand({ frame: pageFrame, canvasId: 'synthetic-alignment-canvas',
    objectId: 'e3-selected', points: [{ x: 100, y: 300 }, { x: 200, y: 300 }], zIndex: 1 });
  props.noteCanvasRuntime = { ...props.noteCanvasRuntime,
    canvasObjects: [...props.noteCanvasRuntime.canvasObjects, stroke.canvasObject],
    canvasPlacements: [...props.noteCanvasRuntime.canvasPlacements, stroke.placement] };
  const view = render(<NoteWritingSurfaceLayer {...props} />);
  for (const label of ['Selection', 'Pen', 'Eraser']) {
    const button = view.getByRole('button', { name: label });
    expect(button.textContent).toBe('');
    expect(button.getAttribute('title')).toBe(label);
    expect(button.querySelector('svg')).not.toBeNull();
  }
  expect(view.getByRole('button', { name: 'Selection' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(view.getByRole('button', { name: 'Pen' }));
  view.rerender(<NoteWritingSurfaceLayer {...props} />);
  expect(view.getByRole('button', { name: 'Pen' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(view.getByRole('button', { name: 'Selection' }));
  const layer = view.container.querySelector<HTMLElement>('[data-paper-ink-layer]')!;
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 904, bottom: 1278, width: 904, height: 1278 } as DOMRect);
  const path = view.container.querySelector('[data-paper-ink-hit]')!;
  Object.defineProperties(path, { getScreenCTM: { value: () => ({ a: 0.5, b: 0, inverse: () => ({}) }) }, isPointInStroke: { value: () => true } });
  vi.stubGlobal('DOMPoint', class { matrixTransform() { return { x: 150, y: 300 }; } });
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 150, clientY: 300, button: 0 });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  fireEvent(props.blockListRef.current!, event);
  const up = new MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: 150, clientY: 300 });
  Object.defineProperty(up, 'pointerId', { value: 1 });
  await act(async () => fireEvent(layer, up));
  expect(view.container.querySelector('[data-paper-ink-selected]')).not.toBeNull();
  expect(props.onBlockListMouseDown).not.toHaveBeenCalled();
  view.rerender(<NoteWritingSurfaceLayer {...props} noteCanvasRuntime={{ ...props.noteCanvasRuntime,
    world: { ...props.noteCanvasRuntime.world }, canvasObjects: [...props.noteCanvasRuntime.canvasObjects] }} />);
  expect(view.container.querySelector('[data-paper-ink-selected]')).not.toBeNull();
  await act(async () => fireEvent.keyDown(layer, { key: 'Delete' }));
  expect(props.onDeleteCanvasObject).toHaveBeenCalledExactlyOnceWith('e3-selected');
});
