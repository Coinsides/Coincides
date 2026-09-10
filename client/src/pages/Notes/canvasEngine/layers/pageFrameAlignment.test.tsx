import { createRef } from 'react';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
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
    onCreateBlock: vi.fn(async () => null), onPersistCanvasObject: vi.fn(async () => true),
    onPushStructuredMutationHistory: noOp, onDeleteCanvasObject: vi.fn(async () => true),
    onSaveAnnotationTruths: vi.fn(async () => undefined), onSaveContentGroups: vi.fn(async () => true),
    onSaveDocumentTypographyProfile: noOp, onSaveGroupFolders: vi.fn(async () => undefined),
    onActivateDraft: noOp, onBeginMoveBlock: noOp, onBeginResizeBlock: noOp,
    onBlockKeyDown: noOp, onBlockListMouseDown: noOp, onBlockTextChange: noOp,
    onBlockTextFlowChange: noOp, onApplyBlockTextFlowEdit: vi.fn(async () => undefined),
    onClearSlashTarget: noOp, onAddPageBelow: noOp, onCreatePageFrame: noOp, onCreatePageStack: noOp,
    onDeletePageFrame: noOp, onDetachPageFromStack: noOp, onDuplicatePageFrame: noOp,
    onMovePageFrame: noOp, onDiscardDraft: noOp, onDraftChange: noOp,
    onDraftFocusReceipt: noOp, onDraftKeyDown: noOp, onFieldDraftChange: noOp,
    onFocusBlock: noOp, onReleaseTextFocus: noOp, onRequestFocusBlock: noOp,
    onMeasuredBlockHeight: noOp, onPageSpaceDoubleClick: noOp, onPanViewportBy: noOp,
    onPersistDraft: vi.fn(async () => undefined), onResizeDraftFromTextarea: noOp,
    onResetViewport: noOp, onSaveBlock: vi.fn(), onScrollViewportBy: noOp, onSelectBlock: noOp,
    onSelectPageFrame: noOp, onSelectSlashCommand: noOp, onResizePageFrame: noOp,
    onSetPrimaryPageFrame: noOp, onTogglePageStackCollapse: noOp, onToggleAIVisibility: noOp,
    onToggleExportRole: noOp, onTrashBlock: noOp, onForgetBlockLocally: noOp,
    onRestoreBlockById: vi.fn(async () => null), onViewportSizeChange: noOp, onViewSource: noOp,
    onZoomViewportAt: noOp,
  };
}

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

describe('C3 cross-block unit handle events through the actual writing surface', () => {
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
    const view = render(<NoteWritingSurfaceLayer {...props} noteId={noteId} contentReadOnly={false} layoutMode={false}
      allBlocks={blocks} visibleBlocks={blocks} sortedBlockCount={blocks.length} blockLayouts={layouts}
      pageOffsetX={0} onMoveTextUnit={move} onExtractTextUnit={extract} />);
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
  it('aligns the page top ruler with the block column despite a historical frame x', () => {
    const sample = alignment(80, 'page');
    expect(sample.rulerOffset, 'top ruler minus block column in CSS px').toBe(0);
    expect(sample.rulerWidth).toBe(sample.blockWidth);
    expect(sample.boundaryOffset).toBeNull();
  });

  it('preserves canvas world frame geometry while the page-only repair leaves its separate mismatch explicit', () => {
    const sample = alignment(80, 'canvas');
    // Red investigation measured +56 px for both. Correcting this needs a canvas
    // block projection/frame interaction decision beyond the full-page repair.
    expect(sample.rulerOffset).toBe(56);
    expect(sample.boundaryOffset).toBe(56);
  });

  it('preserves a collection whose frame content origin already matches page offset', () => {
    expect(alignment(-72, 'page').rulerOffset).toBe(0);
    const canvasOffset = createSurfaceModePolicy('canvas').pageOffsetX;
    expect(alignment(canvasOffset - 72, 'canvas').rulerOffset).toBe(0);
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
