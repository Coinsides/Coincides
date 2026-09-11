import { createRef, type RefObject } from 'react';
import {
  act,
  createEvent,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import type { NoteBlock } from '../runtimeDataTypes';
import type { NoteCanvasRuntimeModel, PageFrameModel } from '../types';
import * as pageReadingDom from '../pageReadingDomService';
import { createPageFrameDefaultTypographyProfile } from '../pageFrameTypographyService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import { createSurfaceModePolicy } from '../modePolicyService';
import { useCanvasSurfacePointerController } from '../hooks/useCanvasSurfacePointerController';
import { NoteRuntimeDocumentLayer, type NoteRuntimeDocumentHandle } from './NoteRuntimeDocumentLayer';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';

vi.mock('./NoteFloatingPanelLayer', () => ({
  NoteFloatingPanelLayer: () => null,
}));

const receipt: BlockEditRecoveryReceipt = {
  version: 2,
  kind: 'block_edit_recovery',
  recoveryKey: 'block-edit:note-a:block-a:mount-a:1:1',
  mountNonce: 'mount-a',
  noteId: 'note-a',
  requestedNoteId: 'note-a',
  creationGeneration: 1,
  operationSequence: 1,
  blockId: 'block-a',
  text: 'recover this edit',
  plainText: 'recover this edit',
  contentJson: { body: 'recover this edit' },
  hydrationEpoch: 1,
  queuedAt: '2026-08-20T00:00:00.000Z',
};

const codeBlock: NoteBlock = {
  id: 'block-a',
  placement_id: 'placement-a',
  display_overrides_json: {},
  canvas_layout: null,
  block_type: 'paragraph',
  title: null,
  content_json: {
    body: 'current editor text',
    language: 'typescript',
  },
  plain_text: 'current editor text',
  metadata: { template_id: 'code.snippet' },
  order_index: 0,
  source_references: [],
};

const runtimeModel = {
  version: 'test',
  route: 'self_owned_minimal_hybrid',
  mode: 'page',
  world: { width: 1024, height: 768 },
  viewport: { x: 0, y: 0, width: 1024, height: 768, zoom: 1 },
  primaryPageFrame: null,
  pageFrames: [],
  pageStacks: [],
  blockPlacements: [],
  canvasObjects: [],
  canvasPlacements: [],
  contentMounts: [],
  pageFrameExtensions: [],
  blockFragmentProjections: [],
  visualStyles: [],
  visualConnectors: [],
  imageObjects: [],
  structuredObjects: [],
  canvasAIReadableSnapshot: { nodes: [] },
  visibleBlockIds: [codeBlock.id],
  canvasObjectReserve: [],
  relationEndpointReserve: [],
} as unknown as NoteCanvasRuntimeModel;

function writingSurfaceProps(
  onSaveBlock: NoteWritingSurfaceLayerProps['onSaveBlock'],
): NoteWritingSurfaceLayerProps {
  const noOp = vi.fn();
  return {
    activeBlockId: codeBlock.id,
    contentReadOnly: false,
    activeSlashCommandId: null,
    allBlocks: [codeBlock],
    anchorsBySourceRef: {},
    annotationTruths: [],
    contentGroups: [],
    groupFolders: [],
    purposeFrames: [],
    blockFieldDrafts: {},
    blockLayouts: {
      [codeBlock.id]: { x: 0, y: 0, width: 540, height: 120 },
    },
    blockListRef: createRef<HTMLDivElement>(),
    blockTextDrafts: {},
    blockTextFlowDrafts: {},
    creatingDraft: false,
    defaultDraftLayout: { x: 0, y: 120, width: 540, height: 72 },
    defaultTextTemplate: {} as never,
    documentTypographyProfile: {} as never,
    draftActive: false,
    draftFocusReceipt: {
      blockId: 'draft-block',
      textFlowId: 'draft-flow',
      textUnitId: 'draft-unit',
    },
    draftLayout: null,
    draftOwnerReconciliation: null,
    draftPhase: 'idle' as never,
    draftRef: createRef<HTMLTextAreaElement>(),
    draftText: '',
    focusBlockId: null,
    focusedTextOwner: null,
    interactionState: { mode: 'idle', target: 'surface' },
    layoutMode: false,
    noteCanvasRuntime: runtimeModel,
    noteId: 'note-a',
    projectId: 'project-a',
    pageContentHeight: 768,
    pageOffsetX: 0,
    placementPending: false,
    primaryPageFrameX: 0,
    primaryPageFrameWidth: 540,
    savingBlockId: null,
    selectedBlockId: codeBlock.id,
    selectedPageFrameId: null,
    showPreviewAIVisibility: false,
    showPreviewBlockTypes: false,
    showPreviewExportStatus: false,
    showPreviewLabelOverlay: false,
    slashCommands: [],
    slashTarget: null,
    snapGuide: null,
    sortedBlockCount: 1,
    sourceJumpBusy: null,
    surfaceMode: 'page',
    surfacePolicyMode: 'page',
    viewportTransform: runtimeModel.viewport,
    visibleBlocks: [codeBlock],
    onCreateBlock: vi.fn(async () => null),
    onPersistCanvasObject: vi.fn(async () => true),
    onPushStructuredMutationHistory: noOp,
    onDeleteCanvasObject: vi.fn(async () => true),
    onSaveAnnotationTruths: vi.fn(async () => undefined),
    onSaveContentGroups: vi.fn(async () => true),
    onSaveDocumentTypographyProfile: noOp,
    onSaveGroupFolders: vi.fn(async () => undefined),
    onActivateDraft: noOp,
    onBeginMoveBlock: noOp,
    onBeginResizeBlock: noOp,
    onBlockKeyDown: noOp,
    onBlockListMouseDown: noOp,
    onBlockTextChange: noOp,
    onBlockTextFlowChange: noOp,
    onApplyBlockTextFlowEdit: vi.fn(async () => undefined),
    onClearSlashTarget: noOp,
    onAddPageBelow: noOp,
    onCreatePageFrame: noOp,
    onCreatePageStack: noOp,
    onDeletePageFrame: noOp,
    onDetachPageFromStack: noOp,
    onDuplicatePageFrame: noOp,
    onMovePageFrame: noOp,
    onDiscardDraft: noOp,
    onDraftChange: noOp,
    onDraftFocusReceipt: noOp,
    onDraftKeyDown: noOp,
    onFieldDraftChange: noOp,
    onFocusBlock: noOp,
    onReleaseTextFocus: noOp,
    onRequestFocusBlock: noOp,
    onMeasuredBlockHeight: noOp,
    onPageSpaceDoubleClick: noOp,
    onPanViewportBy: noOp,
    onPersistDraft: vi.fn(async () => undefined),
    onResizeDraftFromTextarea: noOp,
    onResetViewport: noOp,
    onSaveBlock,
    onScrollViewportBy: noOp,
    onSelectBlock: noOp,
    onSelectPageFrame: noOp,
    onSelectSlashCommand: noOp,
    onResizePageFrame: noOp,
    onSetPrimaryPageFrame: noOp,
    onTogglePageStackCollapse: noOp,
    onToggleAIVisibility: noOp,
    onToggleExportRole: noOp,
    onTrashBlock: noOp,
    onForgetBlockLocally: noOp,
    onRestoreBlockById: vi.fn(async () => null),
    onViewportSizeChange: noOp,
    onViewSource: noOp,
    onZoomViewportAt: noOp,
  };
}

describe('NoteRuntimeDocumentLayer block edit recovery queue', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the effective page typography without a frame extension and preserves the canvas fallback', () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    const profile = createPageFrameDefaultTypographyProfile();
    const props = {
      ...writingSurfaceProps(vi.fn()),
      documentTypographyProfile: profile,
    };
    const renderDocument = (surfaceMode: 'page' | 'canvas') => (
      <NoteRuntimeDocumentLayer
        blockEditRecoveryReceipts={[]}
        floatingPanelProps={{} as never}
        onApplyBlockEditRecovery={vi.fn()}
        onDismissBlockEditRecovery={vi.fn(() => true)}
        onSurfacePointerDown={vi.fn()}
        surfaceMode={surfaceMode}
        templateWarning={null}
        writingSurfaceProps={{ ...props, surfaceMode }}
      />
    );
    const { container, rerender } = render(renderDocument('page'));
    const surface = () => container.querySelector<HTMLElement>('[data-document-font-size]')!;
    expect(surface().dataset.documentFontSize).toBe(String(profile.fontSizePx));
    expect(surface().style.getPropertyValue('--document-font-size')).toBe(`${profile.fontSizePx}px`);
    expect(surface().style.getPropertyValue('--document-line-height')).toBe(`${profile.lineHeightPx}px`);

    rerender(renderDocument('canvas'));
    const canvasDefault = createDefaultDocumentTypographyProfile();
    expect(surface().dataset.documentFontSize).toBe(String(canvasDefault.fontSizePx));
    expect(surface().style.getPropertyValue('--document-font-size')).toBe(`${canvasDefault.fontSizePx}px`);
  });

  it('shows the current-note receipt and exposes explicit Apply and Dismiss actions', () => {
    const onApplyBlockEditRecovery = vi.fn(async () => true);
    const onDismissBlockEditRecovery = vi.fn(() => true);
    render(
      <NoteRuntimeDocumentLayer
        blockEditRecoveryReceipts={[receipt]}
        floatingPanelProps={{} as never}
        onApplyBlockEditRecovery={onApplyBlockEditRecovery}
        onDismissBlockEditRecovery={onDismissBlockEditRecovery}
        onSurfacePointerDown={vi.fn()}
        surfaceMode="page"
        templateWarning={null}
        writingSurfaceProps={writingSurfaceProps(vi.fn(async (): Promise<BlockSaveOutcome> => ({
          status: 'saved',
          block: codeBlock,
          recoveryReceipt: null,
          reconciliation: 'not_needed',
        })))}
      />,
    );

    expect(screen.getByText('recover this edit').closest('[role="status"]')?.textContent).toContain('recover this edit');
    const applyButton = screen.getByRole('button', { name: 'Apply' });
    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    const applyMouseDown = createEvent.mouseDown(applyButton, { button: 0 });
    const dismissMouseDown = createEvent.mouseDown(dismissButton, { button: 0 });
    fireEvent(applyButton, applyMouseDown);
    fireEvent.click(applyButton);
    fireEvent(dismissButton, dismissMouseDown);
    fireEvent.click(dismissButton);

    expect(applyMouseDown.defaultPrevented).toBe(true);
    expect(dismissMouseDown.defaultPrevented).toBe(true);
    expect(onApplyBlockEditRecovery).toHaveBeenCalledWith(receipt.recoveryKey);
    expect(onDismissBlockEditRecovery).toHaveBeenCalledWith(receipt.recoveryKey);
  });

  it('keeps the focused code editor from blur-saving before the selected recovery Apply runs', async () => {
    const events: string[] = [];
    let selectedReceiptRecoverable = true;
    let durableText: string | null = null;
    const onSaveBlock = vi.fn(async (): Promise<BlockSaveOutcome> => {
      events.push('blur-save');
      selectedReceiptRecoverable = false;
      return {
        status: 'saved',
        block: codeBlock,
        recoveryReceipt: null,
        reconciliation: 'not_needed',
      };
    });
    const onApplyBlockEditRecovery = vi.fn(async () => {
      events.push('apply');
      if (!selectedReceiptRecoverable) return false;
      durableText = receipt.text;
      selectedReceiptRecoverable = false;
      return true;
    });

    render(
      <NoteRuntimeDocumentLayer
        blockEditRecoveryReceipts={[receipt]}
        floatingPanelProps={{} as never}
        onApplyBlockEditRecovery={onApplyBlockEditRecovery}
        onDismissBlockEditRecovery={vi.fn(() => true)}
        onSurfacePointerDown={vi.fn()}
        surfaceMode="page"
        templateWarning={null}
        writingSurfaceProps={writingSurfaceProps(onSaveBlock)}
      />,
    );

    const editor = screen.getByRole('textbox');
    const applyButton = screen.getByRole('button', { name: 'Apply' });
    editor.focus();
    expect(document.activeElement).toBe(editor);

    const mouseDownEvent = createEvent.mouseDown(applyButton, { button: 0 });
    fireEvent(applyButton, mouseDownEvent);
    if (!mouseDownEvent.defaultPrevented) {
      fireEvent.blur(editor);
    }
    fireEvent.click(applyButton);

    await waitFor(() => expect(onApplyBlockEditRecovery).toHaveBeenCalledWith(receipt.recoveryKey));
    expect(events).toEqual(['apply']);
    expect(durableText === receipt.text || selectedReceiptRecoverable).toBe(true);
  });
});

describe('NoteRuntimeDocumentLayer overview navigation', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(960);
    vi.stubGlobal('ResizeObserver', class {
      private callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) { this.callback = callback; }
      observe(target: Element) {
        this.callback([{ target, contentRect: { width: 960, height: 720 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
      unobserve() {}
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function overviewProps(pageCount: number): NoteWritingSurfaceLayerProps {
    const pageFrames: PageFrameModel[] = Array.from({ length: pageCount }, (_, index) => ({
      id: `overview-page-${index + 1}`,
      role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
      templateId: 'a4_portrait', pageSize: 'A4', exportable: true,
      x: 100, y: index * 1358, width: 904, height: 1278,
      contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
    }));
    return {
      ...writingSurfaceProps(vi.fn(async (): Promise<BlockSaveOutcome> => ({
        status: 'saved', block: codeBlock, recoveryReceipt: null, reconciliation: 'not_needed',
      }))),
      onFocusBlock: vi.fn(),
      onReleaseTextFocus: vi.fn(),
      documentTypographyProfile: createDefaultDocumentTypographyProfile(),
      selectedPageFrameId: pageFrames[0].id,
      noteCanvasRuntime: {
        ...runtimeModel,
        primaryPageFrame: pageFrames[0],
        pageFrames,
      },
    };
  }

  function documentFor(props: NoteWritingSurfaceLayerProps, documentRef?: RefObject<NoteRuntimeDocumentHandle>) {
    return <div data-app-main-scroll="true" ref={(element) => {
      if (element) element.scrollTo = vi.fn();
    }}>
      <NoteRuntimeDocumentLayer
        ref={documentRef}
        blockEditRecoveryReceipts={[]}
        floatingPanelProps={{} as never}
        onApplyBlockEditRecovery={vi.fn()}
        onDismissBlockEditRecovery={vi.fn(() => true)}
        onSurfacePointerDown={vi.fn()}
        surfaceMode={props.surfaceMode}
        templateWarning={null}
        writingSurfaceProps={props}
      />
    </div>;
  }

  function writers(props: NoteWritingSurfaceLayerProps) {
    return [
      props.onSaveBlock, props.onPersistDraft, props.onBlockTextChange,
      props.onBlockTextFlowChange, props.onApplyBlockTextFlowEdit, props.onFieldDraftChange,
      props.onSaveDocumentTypographyProfile, props.onPersistCanvasObject, props.onMeasuredBlockHeight,
      props.onBeginMoveBlock, props.onBeginResizeBlock, props.onMovePageFrame, props.onResizePageFrame,
      props.onSelectPageFrame, props.onSetPrimaryPageFrame,
    ];
  }

  function paperHeader() {
    return {
      titleDraft: 'Paper title', descriptionDraft: 'Paper description', contentReadOnly: false,
      onTitleDraftChange: vi.fn(), onDescriptionDraftChange: vi.fn(),
      onSaveTitle: vi.fn(), onSaveDescription: vi.fn(),
    };
  }

  it('D2 renders one header across multiple pages, follows live side walls, and declares projection differences', () => {
    const props = { ...overviewProps(4), paperHeader: paperHeader() };
    const { container, rerender } = render(documentFor(props));
    const header = container.querySelector<HTMLElement>('[data-note-paper-header="true"]')!;
    expect(container.querySelectorAll('[data-note-paper-header="true"]')).toHaveLength(1);
    expect(header.style.paddingLeft).toBe('72px');
    expect(header.style.paddingRight).toBe('72px');
    const frame = { ...props.noteCanvasRuntime.primaryPageFrame!, contentInset: { left: 110, right: 48, top: 0, bottom: 96 } };
    const next = { ...props, noteCanvasRuntime: { ...props.noteCanvasRuntime, primaryPageFrame: frame,
      pageFrames: [frame, ...props.noteCanvasRuntime.pageFrames.slice(1)] } };
    rerender(documentFor(next));
    expect(header.style.paddingLeft).toBe('110px');
    expect(header.style.paddingRight).toBe('48px');
    fireEvent.click(screen.getByRole('button', { name: 'Page overview' }));
    const overview = container.querySelector('[data-note-overview-root]')!;
    expect(overview.querySelector('[data-note-paper-header]')).toBeNull();
    expect(container.querySelectorAll('[data-note-paper-header]')).toHaveLength(1);
    act(() => { window.dispatchEvent(new Event('beforeprint')); });
    const print = document.querySelector('[data-note-print-root]')!;
    expect(print.querySelectorAll('[data-note-print-page]')).toHaveLength(4);
    expect(print.querySelector('[data-note-paper-header]')).toBeNull();
    act(() => { window.dispatchEvent(new Event('afterprint')); });
  });

  it('D2 title and description edits move only the outer paper origin within the bounded display band', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      if (!this.matches('[data-note-paper-header]')) return 0;
      return this.querySelector<HTMLTextAreaElement>('[aria-label="Note title"]')!.value.length > 40 ? 500 : 120;
    });
    const props = overviewProps(1);
    props.onMovePageFrame = vi.fn();
    props.blockLayouts = { [codeBlock.id]: { x: 34, y: 85, width: 540, height: 120 } };
    const original = JSON.stringify({ layouts: props.blockLayouts, runtime: props.noteCanvasRuntime, blocks: props.allBlocks });
    const { container, rerender } = render(documentFor(props));
    const shell = container.querySelector<HTMLElement>('[data-note-block-shell]')!;
    const paper = container.querySelector<HTMLElement>('[data-page-display-scale]')!;
    const scale = Number(paper.dataset.pageDisplayScale);
    const localPosition = { top: shell.style.top, left: shell.style.left };
    const oldTop = Number.parseFloat(paper.style.top);
    const header = paperHeader();
    rerender(documentFor({ ...props, paperHeader: header }));
    expect(Number.parseFloat(paper.style.top) - oldTop).toBeCloseTo(120 * scale);
    const title = screen.getByRole('textbox', { name: 'Note title' });
    const description = screen.getByRole('textbox', { name: 'Note description' });
    fireEvent.change(title, { target: { value: 'Changed title '.repeat(30) } });
    fireEvent.change(description, { target: { value: 'Changed description '.repeat(40) } });
    expect(header.onTitleDraftChange).toHaveBeenCalledWith('Changed title '.repeat(30));
    expect(header.onDescriptionDraftChange).toHaveBeenCalledWith('Changed description '.repeat(40));
    rerender(documentFor({ ...props, paperHeader: { ...header, titleDraft: 'Changed title '.repeat(30), descriptionDraft: 'Changed description '.repeat(40) } }));
    expect(Number.parseFloat(paper.style.top) - oldTop).toBeCloseTo(208 * scale);
    expect({ top: shell.style.top, left: shell.style.left }).toEqual(localPosition);
    expect(JSON.stringify({ layouts: props.blockLayouts, runtime: props.noteCanvasRuntime, blocks: props.allBlocks })).toBe(original);
    fireEvent.blur(title);
    fireEvent.blur(description);
    await waitFor(() => expect(header.onSaveTitle).toHaveBeenCalledOnce());
    expect(header.onSaveDescription).toHaveBeenCalledOnce();
    expect(props.onPersistCanvasObject).not.toHaveBeenCalled();
    expect(props.onSaveBlock).not.toHaveBeenCalled();
    expect(props.onMovePageFrame).not.toHaveBeenCalled();
  });

  it('D2 keeps a negative local-y block after the header without rewriting its stored position', () => {
    const props = { ...overviewProps(1), paperHeader: paperHeader() };
    props.onMovePageFrame = vi.fn();
    props.noteCanvasRuntime = { ...props.noteCanvasRuntime, coordinateContract: 'v2' };
    props.blockLayouts = { [codeBlock.id]: { x: -24, y: -90, width: 540, height: 120,
      surface: 'formal_page', coordinate_space: 'page_frame_local', frame_id: props.noteCanvasRuntime.primaryPageFrame!.id } };
    const original = JSON.stringify(props.blockLayouts);
    const { container } = render(documentFor(props));
    const shell = container.querySelector<HTMLElement>('[data-note-block-shell]')!;
    const paper = container.querySelector<HTMLElement>('[data-page-display-scale]')!;
    const scale = Number(paper.dataset.pageDisplayScale);
    // jsdom has no layout engine: these are production DOM layout inputs in
    // CSS pixels, including the actual scale and overflow compensation.
    const bodyTop = Number.parseFloat(paper.style.top)
      + (Number.parseFloat(paper.style.paddingTop) + Number.parseFloat(shell.style.top)) * scale;
    expect(shell.style.top).toBe('-90px');
    expect(bodyTop).toBeGreaterThanOrEqual(120 * scale);
    expect(JSON.stringify(props.blockLayouts)).toBe(original);
    expect(props.onPersistCanvasObject).not.toHaveBeenCalled();
    expect(props.onMovePageFrame).not.toHaveBeenCalled();
  });

  it('D2 blank-body coordinates remain relative to blockListRef while header gestures stay outside the body', () => {
    const props = { ...overviewProps(1), paperHeader: paperHeader() };
    const { container, rerender } = render(documentFor(props));
    const blockList = props.blockListRef.current!;
    const paper = container.querySelector<HTMLElement>('[data-page-display-scale]')!;
    const scale = Number(paper.dataset.pageDisplayScale);
    const blockRect = new DOMRect(180, 60 + Number.parseFloat(paper.style.top), 760 * scale, 1278 * scale);
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue(blockRect);
    const activateDraft = vi.fn();
    const { result } = renderHook(() => useCanvasSurfacePointerController({
      activateDraft, clearBlockSelection: vi.fn(), contentWidth: 760,
      defaultDraftLayout: props.defaultDraftLayout, pageOffsetX: 0, snapEnabled: false,
      surfacePolicy: createSurfaceModePolicy('page'),
      viewportTransform: { x: 0, y: 0, width: 960, height: 720, zoom: scale },
    }));
    rerender(documentFor({ ...props, onPageSpaceDoubleClick: result.current.handlePageSpaceDoubleClick }));
    fireEvent.doubleClick(container.querySelector('[data-note-paper-header]')!, { clientX: 200, clientY: 80 });
    fireEvent.doubleClick(screen.getByRole('textbox', { name: 'Note title' }), { clientX: 200, clientY: 80 });
    expect(activateDraft).not.toHaveBeenCalled();
    fireEvent.doubleClick(blockList, { clientX: blockRect.left + 120 * scale, clientY: blockRect.top + 300 * scale });
    expect(activateDraft).toHaveBeenCalledOnce();
    expect(activateDraft.mock.calls[0][0].x).toBeCloseTo(120);
    expect(activateDraft.mock.calls[0][0].y).toBeCloseTo(300);
    expect(props.blockListRef.current).toBe(blockList);
  });

  it.each([1, 4, 9])('opens %i pages with bounded pagination and closes without invoking writers', async (pageCount) => {
    const props = overviewProps(pageCount);
    const { container } = render(documentFor(props));
    vi.clearAllMocks();
    const toggle = screen.getByRole('button', { name: 'Page overview' });
    fireEvent.click(toggle);
    await waitFor(() => expect(container.querySelector('[data-note-overview-root]')).not.toBeNull());
    const grid = container.querySelector<HTMLElement>('[data-note-overview-grid]')!;
    expect(grid.dataset.columns).toBe('4');
    expect(container.querySelectorAll('[data-note-overview-page]')).toHaveLength(Math.min(pageCount, 8));
    if (pageCount === 9) {
      fireEvent.click(container.querySelector('[data-note-overview-next]')!);
      expect(container.querySelectorAll('[data-note-overview-page]')).toHaveLength(1);
      expect(container.querySelector('[data-note-overview-page]')?.getAttribute('data-page-frame-id')).toBe('overview-page-9');
      fireEvent.click(container.querySelector('[data-note-overview-previous]')!);
      expect(container.querySelectorAll('[data-note-overview-page]')).toHaveLength(8);
    }
    fireEvent.click(container.querySelector('[data-note-overview-close]')!);
    expect(container.querySelector('[data-note-overview-root]')).toBeNull();
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });

  it('restores the dirty editor after local page navigation and resumes its ordinary blur save', async () => {
    const props = overviewProps(9);
    const dirtyText = 'Unsaved code draft survives overview';
    props.blockTextDrafts = { [codeBlock.id]: dirtyText };
    const scroll = vi.spyOn(pageReadingDom, 'scrollPageReadingToRect').mockImplementation(() => undefined);
    const { container } = render(documentFor(props));
    const editor = screen.getByRole('textbox');
    editor.focus();
    vi.clearAllMocks();
    const toggle = screen.getByRole('button', { name: 'Page overview' });
    const mouseDown = createEvent.mouseDown(toggle, { button: 0 });
    fireEvent(toggle, mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);
    fireEvent.click(toggle);
    expect(container.contains(editor)).toBe(true);
    fireEvent.click(container.querySelector('[data-note-overview-next]')!);
    fireEvent.click(container.querySelector('[data-note-overview-page][data-page-frame-id="overview-page-9"]')!);
    await waitFor(() => expect(scroll).toHaveBeenCalledWith(
      props.blockListRef.current,
      expect.objectContaining({ ...props.noteCanvasRuntime.pageFrames[8], x: 0 }),
    ));
    expect(container.querySelector('[data-note-overview-root]')).toBeNull();
    expect(screen.getByRole('textbox')).toBe(editor);
    expect(document.activeElement).toBe(editor);
    expect((editor as HTMLTextAreaElement).value).toBe(dirtyText);
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());

    // Returning from overview must preserve the next normal save opportunity.
    fireEvent.blur(editor);
    await waitFor(() => expect(props.onSaveBlock).toHaveBeenCalledTimes(1));
    expect(props.onSaveBlock).toHaveBeenCalledWith(codeBlock, dirtyText, expect.objectContaining({ silent: true }));
  });

  it('does not resurrect overview across note or surface-mode changes', () => {
    const props = overviewProps(4);
    const { container, rerender } = render(documentFor(props));
    fireEvent.click(screen.getByRole('button', { name: 'Page overview' }));
    expect(container.querySelector('[data-note-overview-root]')).not.toBeNull();
    rerender(documentFor({ ...props, noteId: 'another-overview-note' }));
    expect(container.querySelector('[data-note-overview-root]')).toBeNull();
    rerender(documentFor(props));
    expect(container.querySelector('[data-note-overview-root]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Page overview' }));
    rerender(documentFor({ ...props, surfaceMode: 'canvas' }));
    expect(container.querySelector('[data-note-overview-root]')).toBeNull();
    rerender(documentFor(props));
    expect(container.querySelector('[data-note-overview-root]')).toBeNull();
  });

  it('resumes an overview editor synchronously for host exit without writing before the host blur', async () => {
    const props = overviewProps(4);
    const dirtyText = 'Unsaved code retained for the host exit workflow';
    props.blockTextDrafts = { [codeBlock.id]: dirtyText };
    const handle = createRef<NoteRuntimeDocumentHandle>();
    const { container } = render(documentFor(props, handle));
    const editor = screen.getByRole('textbox');
    editor.focus();
    vi.clearAllMocks();
    fireEvent.click(screen.getByRole('button', { name: 'Page overview' }));
    expect(container.querySelector('[data-note-overview-root]')).not.toBeNull();

    act(() => handle.current!.resumeEditingForExit());
    expect(container.querySelector('[data-note-overview-root]')).toBeNull();
    expect(document.activeElement).toBe(editor);
    expect((editor as HTMLTextAreaElement).value).toBe(dirtyText);
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());

    // A second host dismiss is harmless; the host owns the subsequent blur/save.
    act(() => handle.current!.resumeEditingForExit());
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());
    act(() => editor.blur());
    await waitFor(() => expect(props.onSaveBlock).toHaveBeenCalledTimes(1));
    expect(props.onSaveBlock).toHaveBeenCalledWith(codeBlock, dirtyText, expect.objectContaining({ silent: true }));
  });
});
