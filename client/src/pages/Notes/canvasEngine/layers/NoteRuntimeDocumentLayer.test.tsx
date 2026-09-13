import { createRef, type RefObject } from 'react';
// @ts-expect-error Vitest runs in Node; the browser client has no @types/node dependency.
import { readFileSync } from 'node:fs';
// @ts-expect-error Inspect the production responsive stylesheet without adding a dependency.
import { fileURLToPath } from 'node:url';
import {
  act,
  createEvent,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
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

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

vi.mock('../canvasAssetRepository', async (importOriginal) => ({
  ...await importOriginal<typeof import('../canvasAssetRepository')>(),
  loadCanvasImageAssetBlobUrl: vi.fn(async () => { throw new Error('No media image registered in the document fixture'); }),
}));

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
    onPersistDraft: vi.fn(async () => undefined),
    onResizeDraftFromTextarea: noOp,
    onSaveBlock,
    onSelectBlock: noOp,
    onSelectSlashCommand: noOp,
    onToggleAIVisibility: noOp,
    onToggleExportRole: noOp,
    onTrashBlock: noOp,
    onViewSource: noOp,
  };
}

describe('NoteRuntimeDocumentLayer block edit recovery queue', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the effective page typography without a frame extension', () => {
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
    const { container } = render(renderDocument('page'));
    const surface = () => container.querySelector<HTMLElement>('[data-document-font-size]')!;
    expect(surface().dataset.documentFontSize).toBe(String(profile.fontSizePx));
    expect(surface().style.getPropertyValue('--document-font-size')).toBe(`${profile.fontSizePx}px`);
    expect(surface().style.getPropertyValue('--document-line-height')).toBe(`${profile.lineHeightPx}px`);

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

  it('passes recovery conflict choices and comparison through the document layer', async () => {
    const inspect = vi.fn(async () => codeBlock);
    const replay = vi.fn(async () => false);
    render(<NoteRuntimeDocumentLayer blockEditRecoveryReceipts={[receipt]}
      blockEditRecoveryConflicts={{ [receipt.recoveryKey]: true }}
      floatingPanelProps={{} as never} onApplyBlockEditRecovery={vi.fn()}
      onDismissBlockEditRecovery={vi.fn(() => true)} onInspectBlockEditRecovery={inspect}
      onReplayBlockEditRecovery={replay} onSurfacePointerDown={vi.fn()} surfaceMode="page"
      templateWarning={null} writingSurfaceProps={writingSurfaceProps(vi.fn())} />);
    fireEvent.click(screen.getByRole('button', { name: 'View differences' }));
    const comparison = await screen.findByRole('region', { name: 'Draft and current text comparison' });
    expect(comparison.textContent).toContain('current editor text');
    expect(comparison.textContent).toContain('recover this edit');
    fireEvent.click(screen.getByRole('button', { name: 'Replay draft on current version' }));
    await waitFor(() => expect(replay).toHaveBeenCalledWith(receipt.recoveryKey));
    expect(inspect).toHaveBeenCalledWith(receipt.recoveryKey);
  });
});

describe('NoteRuntimeDocumentLayer overview navigation', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-note-navigation-pages]') ? 256 : 960;
    });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(720);
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
    vi.useRealTimers();
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
      props.onBeginMoveBlock, props.onBeginResizeBlock,
    ];
  }

  function paperHeader() {
    return {
      titleDraft: 'Paper title', descriptionDraft: 'Paper description', contentReadOnly: false,
      onTitleDraftChange: vi.fn(), onDescriptionDraftChange: vi.fn(),
      onSaveTitle: vi.fn(), onSaveDescription: vi.fn(),
    };
  }

  function searchableProps(): NoteWritingSurfaceLayerProps {
    const props = overviewProps(3);
    const visibleRect = { x: 172, y: 42, width: 540, height: 120 };
    props.blockLayouts = { [codeBlock.id]: { x: 0, y: 42, width: 540, height: 120 } };
    props.noteCanvasRuntime = { ...props.noteCanvasRuntime, coordinateContract: 'v2',
      blockFragmentProjections: [{
        blockId: codeBlock.id, pageStackId: 'navigation-stack', pageFrameId: props.selectedPageFrameId!,
        pageIndex: 0, pageTotal: 3, fragmentIndex: 0, fragmentTotal: 1, role: 'single',
        clippedTop: false, clippedBottom: false, blockRect: visibleRect, visibleRect, pageContentRect: visibleRect,
      }] };
    return props;
  }

  it('navigation keeps the real editor mounted, editable and saveable, and Escape leaves the pane open', async () => {
    const props = overviewProps(3);
    const { container, rerender } = render(documentFor(props));
    const editor = screen.getByRole('textbox');
    editor.focus();
    vi.clearAllMocks();
    const toggle = screen.getByRole('button', { name: 'Navigation pane' });
    const mouseDown = createEvent.mouseDown(toggle, { button: 0 });
    fireEvent(toggle, mouseDown);
    fireEvent.click(toggle);
    expect(mouseDown.defaultPrevented).toBe(true);
    expect(screen.getByRole('complementary', { name: 'Note navigation' })).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('textbox')).toBe(editor);
    expect(document.activeElement).toBe(editor);
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());

    const draft = 'Writing continues with navigation open';
    fireEvent.change(editor, { target: { value: draft, selectionStart: draft.length } });
    expect(props.onBlockTextChange).toHaveBeenCalledWith(codeBlock.id, draft, draft.length, editor);
    rerender(documentFor({ ...props, blockTextDrafts: { [codeBlock.id]: draft } }));
    expect(screen.getByRole('textbox')).toBe(editor);
    expect((editor as HTMLTextAreaElement).value).toBe(draft);
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(container.querySelector('[data-note-navigation]')).not.toBeNull();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pages' }), { key: 'Escape' });
    expect(container.querySelector('[data-note-navigation]')).not.toBeNull();
    fireEvent.blur(editor);
    await waitFor(() => expect(props.onSaveBlock).toHaveBeenCalledOnce());
    expect(props.onSaveBlock).toHaveBeenCalledWith(codeBlock, draft, expect.objectContaining({ silent: true }));
  });

  it('navigation remembers open and closed preference across mounts, and the chosen tab across closing', () => {
    const props = overviewProps(3);
    const first = render(documentFor(props));
    const toggle = screen.getByRole('button', { name: 'Navigation pane' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('tab', { name: 'Results' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation pane' }));
    expect(screen.queryByRole('complementary', { name: 'Note navigation' })).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByRole('tab', { name: 'Results' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('searchbox', { name: 'Search this note' })).not.toBeNull();
    first.unmount();

    const second = render(documentFor(overviewProps(3)));
    expect(screen.getByRole('button', { name: 'Navigation pane' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('complementary', { name: 'Note navigation' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Navigation pane' }));
    second.unmount();

    render(documentFor(overviewProps(3)));
    expect(screen.getByRole('button', { name: 'Navigation pane' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('complementary', { name: 'Note navigation' })).toBeNull();
  });

  it('navigation follows paper scrolling and jumps to a clicked page without closing or writing', async () => {
    const props = overviewProps(9);
    const scroll = vi.spyOn(pageReadingDom, 'scrollPageReadingToRect').mockImplementation(() => undefined);
    const { container } = render(documentFor(props));
    const blockList = props.blockListRef.current!;
    const appMain = blockList.closest<HTMLElement>('[data-app-main-scroll="true"]')!;
    const paper = blockList.closest<HTMLElement>('[data-page-display-scale]')!;
    const scale = Number(paper.dataset.pageDisplayScale);
    const ninth = props.noteCanvasRuntime.pageFrames[8];
    const before = JSON.stringify(props.noteCanvasRuntime);
    const blockBounds = vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue(new DOMRect(180, 60, 760 * scale, 12222 * scale));
    vi.spyOn(appMain, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 60, 960, 720));
    fireEvent.click(screen.getByRole('button', { name: 'Navigation pane' }));
    expect(screen.getByRole('button', { name: 'Read page 1' }).getAttribute('aria-current')).toBe('page');
    blockBounds.mockReturnValue(new DOMRect(180, 60 - (ninth.y + 40) * scale, 760 * scale, 12222 * scale));
    appMain.scrollTop = (ninth.y + 40) * scale;
    vi.clearAllMocks();
    fireEvent.scroll(appMain);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Read page 9' }).getAttribute('aria-current')).toBe('page'));
    expect(screen.getByRole('button', { name: 'Read page 1' }).hasAttribute('aria-current')).toBe(false);
    expect(container.querySelector<HTMLElement>('[data-note-navigation-pages]')!.scrollTop).toBeGreaterThan(0);
    expect(scroll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Read page 3' }));
    expect(scroll).toHaveBeenCalledWith(blockList, expect.objectContaining({ ...props.noteCanvasRuntime.pageFrames[2], x: 0 }));
    expect(screen.getByRole('button', { name: 'Read page 3' }).getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[data-note-navigation]')).not.toBeNull();
    expect(props.selectedPageFrameId).toBe('overview-page-1');
    expect(JSON.stringify(props.noteCanvasRuntime)).toBe(before);
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });

  it('navigation debounces search, highlights the matching words and temporarily marks the jumped block', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const props = searchableProps();
    const scroll = vi.spyOn(pageReadingDom, 'scrollPageReadingToRect').mockImplementation(() => undefined);
    const { container } = render(documentFor(props));
    fireEvent.click(screen.getByRole('button', { name: 'Navigation pane' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Results' }));
    const search = screen.getByRole('searchbox', { name: 'Search this note' });
    const results = screen.getByRole('list', { name: 'Search results' });
    vi.clearAllMocks();
    fireEvent.change(search, { target: { value: 'curr' } });
    act(() => vi.advanceTimersByTime(120));
    fireEvent.change(search, { target: { value: 'current' } });
    act(() => vi.advanceTimersByTime(179));
    expect(within(results).queryAllByRole('button')).toHaveLength(0);
    expect(results.getAttribute('aria-busy')).toBe('true');
    act(() => vi.advanceTimersByTime(1));
    const result = within(results).getByRole('button', { name: 'Page 1 current editor text' });
    expect(result.querySelector('mark')?.textContent).toBe('current');
    expect(screen.getByText('1 result')).not.toBeNull();
    expect(results.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(result);
    expect(scroll).toHaveBeenCalledWith(props.blockListRef.current, { x: 0, y: 42, width: 540, height: 120 });
    const block = container.querySelector<HTMLElement>('[data-note-block-shell="true"][data-block-id="block-a"]')!;
    expect(block.dataset.noteNavigationHit).toBe('true');
    act(() => vi.advanceTimersByTime(2199));
    expect(block.dataset.noteNavigationHit).toBe('true');
    act(() => vi.advanceTimersByTime(1));
    expect(block.hasAttribute('data-note-navigation-hit')).toBe(false);
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });

  it('navigation clears results immediately, reports no matches and discards query and highlight on note changes', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const props = searchableProps();
    vi.spyOn(pageReadingDom, 'scrollPageReadingToRect').mockImplementation(() => undefined);
    const { container, rerender } = render(documentFor(props));
    fireEvent.click(screen.getByRole('button', { name: 'Navigation pane' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Results' }));
    const search = screen.getByRole('searchbox', { name: 'Search this note' });
    const results = screen.getByRole('list', { name: 'Search results' });
    fireEvent.change(search, { target: { value: 'current' } });
    act(() => vi.advanceTimersByTime(180));
    expect(within(results).getAllByRole('button')).toHaveLength(1);
    fireEvent.change(search, { target: { value: '' } });
    expect(within(results).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Search the loaded text in this note.')).not.toBeNull();
    fireEvent.change(search, { target: { value: 'unmatched phrase' } });
    act(() => vi.advanceTimersByTime(180));
    expect(screen.getByText('No results in this note.')).not.toBeNull();
    fireEvent.change(search, { target: { value: 'current' } });
    act(() => vi.advanceTimersByTime(180));
    fireEvent.click(within(results).getByRole('button'));
    expect(container.querySelector('[data-note-navigation-hit]')).not.toBeNull();

    rerender(documentFor({ ...props, noteId: 'another-note' }));

    expect((screen.getByRole('searchbox', { name: 'Search this note' }) as HTMLInputElement).value).toBe('');
    expect(within(screen.getByRole('list', { name: 'Search results' })).queryAllByRole('button')).toHaveLength(0);
    expect(container.querySelector('[data-note-navigation-hit]')).toBeNull();
    expect(screen.getByText('Search the loaded text in this note.')).not.toBeNull();
  });

  it('navigation exposes only the heading placeholder and supports arrow, Home and End tab navigation', () => {
    const props = overviewProps(3);
    const before = JSON.stringify({ blocks: props.visibleBlocks, runtime: props.noteCanvasRuntime });
    render(documentFor(props));
    fireEvent.click(screen.getByRole('button', { name: 'Navigation pane' }));
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Headings', 'Pages', 'Results']);
    vi.clearAllMocks();
    tabs[1].focus();
    fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toBe('The heading tree will arrive with chapter heading blocks.');
    expect(screen.queryByRole('tree')).toBeNull();
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(document.activeElement).toBe(tabs[2]);
    expect(screen.getByRole('searchbox', { name: 'Search this note' })).not.toBeNull();
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[0]);
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[1]);
    fireEvent.keyDown(tabs[1], { key: 'Home' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(JSON.stringify({ blocks: props.visibleBlocks, runtime: props.noteCanvasRuntime })).toBe(before);
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });

  it('navigation docks within the document row and declares a 900 px non-modal drawer with independent content scrolling', () => {
    const sheetPath = fileURLToPath(import.meta.url).replace('NoteRuntimeDocumentLayer.test.tsx', 'NoteNavigationPane.css');
    const style = document.createElement('style');
    style.textContent = readFileSync(sheetPath, 'utf8');
    document.head.appendChild(style);
    try {
      const { container } = render(documentFor(overviewProps(3)));
      fireEvent.click(screen.getByRole('button', { name: 'Navigation pane' }));
      const navigation = screen.getByRole('complementary', { name: 'Note navigation' });
      const row = container.querySelector<HTMLElement>('[data-note-navigation-row]')!;
      expect(navigation.parentElement).toBe(row);
      expect(row.children[1].hasAttribute('data-note-overview-active')).toBe(true);
      expect(getComputedStyle(navigation).position).toBe('sticky');
      expect(getComputedStyle(navigation).width).toBe('256px');
      expect(navigation.hasAttribute('aria-modal')).toBe(false);
      const narrow = Array.from(style.sheet!.cssRules).find((rule) =>
        rule instanceof CSSMediaRule && rule.conditionText === '(max-width: 900px)') as CSSMediaRule;
      expect(narrow).toBeDefined();
      const narrowRules = Array.from(narrow.cssRules) as CSSStyleRule[];
      expect(narrowRules.find((rule) => rule.selectorText === '.noteNavigationDock')!.style.width).toBe('0');
      expect(narrowRules.find((rule) => rule.selectorText === '.noteNavigationPane')!.style.position).toBe('absolute');
      fireEvent.click(screen.getByRole('tab', { name: 'Results' }));
      expect(getComputedStyle(screen.getByRole('list', { name: 'Search results' })).overflow).toBe('auto');
    } finally {
      style.remove();
    }
  });

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
    expect(Number.parseFloat(paper.style.top) - oldTop).toBeCloseTo(240 * scale);
    expect({ top: shell.style.top, left: shell.style.left }).toEqual(localPosition);
    expect(JSON.stringify({ layouts: props.blockLayouts, runtime: props.noteCanvasRuntime, blocks: props.allBlocks })).toBe(original);
    fireEvent.blur(title);
    fireEvent.blur(description);
    await waitFor(() => expect(header.onSaveTitle).toHaveBeenCalledOnce());
    expect(header.onSaveDescription).toHaveBeenCalledOnce();
    expect(props.onPersistCanvasObject).not.toHaveBeenCalled();
    expect(props.onSaveBlock).not.toHaveBeenCalled();
  });

  it('D2 keeps a negative local-y block after the header without rewriting its stored position', () => {
    const props = { ...overviewProps(1), paperHeader: paperHeader() };
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

  it.each([1, 4, 9])('opens %i pages in a continuous grid and closes without invoking writers', async (pageCount) => {
    const props = overviewProps(pageCount);
    const { container } = render(documentFor(props));
    vi.clearAllMocks();
    const toggle = screen.getByRole('button', { name: 'Page overview' });
    fireEvent.click(toggle);
    await waitFor(() => expect(container.querySelector('[data-note-overview-root]')).not.toBeNull());
    const grid = container.querySelector<HTMLElement>('[data-note-overview-grid]')!;
    expect(grid.dataset.columns).toBe(pageCount === 1 ? '1' : '3');
    expect(Array.from(container.querySelectorAll('[data-note-overview-page]'))
      .map((page) => page.getAttribute('data-page-frame-id')))
      .toEqual(props.noteCanvasRuntime.pageFrames.map((frame) => frame.id));
    expect(container.querySelector('[data-note-overview-next]')).toBeNull();
    expect(container.querySelector('[data-note-overview-previous]')).toBeNull();
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

  it('highlights the currently read page after scrolling without changing the selected frame collection', () => {
    const props = overviewProps(9);
    const { container } = render(documentFor(props));
    const blockList = props.blockListRef.current!;
    const appMain = blockList.closest<HTMLElement>('[data-app-main-scroll="true"]')!;
    const paper = blockList.closest<HTMLElement>('[data-page-display-scale]')!;
    const scale = Number(paper.dataset.pageDisplayScale);
    const ninthPage = props.noteCanvasRuntime.pageFrames[8];
    const before = JSON.stringify(props.noteCanvasRuntime);
    // jsdom has no scroll layout. Supply the same scaled body position produced
    // when the reader is 40 document pixels into the ninth page.
    vi.spyOn(appMain, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 60, 960, 720));
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(180, 60 - (ninthPage.y + 40) * scale, 760 * scale, 12222 * scale),
    );
    appMain.scrollTop = (ninthPage.y + 40) * scale;
    vi.clearAllMocks();
    fireEvent.click(screen.getByRole('button', { name: 'Page overview' }));

    const currentPages = container.querySelectorAll('[data-note-overview-page][aria-current="page"]');
    expect(currentPages).toHaveLength(1);
    expect(currentPages[0].getAttribute('data-page-frame-id')).toBe(ninthPage.id);
    expect(props.selectedPageFrameId).toBe('overview-page-1');
    expect(JSON.stringify(props.noteCanvasRuntime)).toBe(before);
    writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled());
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
