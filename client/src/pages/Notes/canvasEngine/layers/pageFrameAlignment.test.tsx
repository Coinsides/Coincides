import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { createSurfaceModePolicy } from '../modePolicyService';
import type { PageReadingGear } from '../pageReadingViewportService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { buildRuntimeBlockPlacement } from '../placementService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../runtimeLayout';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { PageFrameModel } from '../types';
import { NoteWritingSurfaceLayer, type NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import { NoteOverviewLayer } from './NoteOverviewLayer';
import { NotePrintLayer } from './NotePrintLayer';

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
