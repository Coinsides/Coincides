import { createRef } from 'react';
import {
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import type { NoteBlock } from '../runtimeDataTypes';
import type { NoteCanvasRuntimeModel } from '../types';
import { createPageFrameDefaultTypographyProfile } from '../pageFrameTypographyService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import { NoteRuntimeDocumentLayer } from './NoteRuntimeDocumentLayer';
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
    onSavePurposeFrames: vi.fn(async () => true),
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
