import { createRef, useState } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { createSurfaceModePolicy } from '../modePolicyService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { buildRuntimeBlockPlacement } from '../placementService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../runtimeLayout';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { PageFrameModel } from '../types';
import { NoteWritingSurfaceLayer, type NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';

import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { useBlockSelectionController } from '../hooks/useBlockSelectionController';
import { createImageObjectProjection } from '../imageObjectService';
import { createTableObjectProjection } from '../tableObjectService';

vi.mock('@/services/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn(async () => 'data:image/png;base64,') }));
vi.mock('../blocks/ItemRefBlockProjection', () => ({ ItemRefBlockProjection: () => <span>Synthetic item</span> }));
vi.mock('../textareaNavigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('../textareaNavigation')>(),
  measureTextareaNavigation: vi.fn((_node: HTMLTextAreaElement, offset: number) => ({
    x: offset * 8, y: 0, lineHeight: 20, atFirstLine: true, atLastLine: true,
  })),
  textareaBoundaryCaret: vi.fn((node: HTMLTextAreaElement, _edge: string, x: number) => ({ offset: Math.min(node.value.length, Math.round(x / 8)), y: 0 })),
  textareaCaretAtPoint: vi.fn((_node: HTMLTextAreaElement, x: number) => ({ offset: x / 8, y: 0 })),
}));
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
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


function fixture() {
  const props = propsFor(frame(0), 'canvas');
  const makeBlock = (id: string, text: string, y: number, order_index: number, item = false): NoteBlock => {
    const flow = createTextBlockContentV1(text);
    flow.units[0].id = id + '-unit';
    return { ...props.visibleBlocks[0], id, placement_id: 'placement-' + id, order_index,
      block_type: item ? 'item_ref' : 'paragraph', plain_text: text,
      content_json: item ? { item_id: 'synthetic-item' } : { [TEXT_FLOW_CONTENT_KEY]: flow },
      canvas_layout: { x: 0, y, width: 320, height: 60, coordinate_space: 'canvas_world', surface: 'canvas_workspace' } };
  };
  const blocks = [makeBlock('last', 'last text', 600, 0), makeBlock('item', '', 450, 1, true), makeBlock('first', 'first text', 0, 2)];
  const image = createImageObjectProjection({ objectId: 'image', canvasId: 'synthetic', zIndex: 1,
    asset: { assetId: 'synthetic-asset', kind: 'image', filename: 'synthetic.png', mimeType: 'image/png', byteSize: 0, width: 10, height: 10, blobUrl: 'data:image/png;base64,' },
    layout: { x: 0, y: 150, width: 100, height: 80, surface: 'canvas_workspace' } });
  const table = createTableObjectProjection({ objectId: 'table', canvasId: 'synthetic', zIndex: 2,
    rowCount: 1, columnCount: 1, layout: { x: 0, y: 300, width: 320, height: 100, surface: 'canvas_workspace' } });
  const apply = vi.fn(async () => true);
  function Fixture() {
    const [interactionState, setInteractionState] = useState(props.interactionState);
    const selection = useBlockSelectionController({ setInteractionState });
    return <NoteWritingSurfaceLayer {...props} {...selection} interactionState={interactionState}
      allBlocks={blocks} visibleBlocks={blocks} contentReadOnly={false} layoutMode={false}
      blockLayouts={Object.fromEntries(blocks.map((block) => [block.id, block.canvas_layout! as unknown as BlockBoxLayout]))}
      onFocusBlock={selection.markBlockFocused} onReleaseTextFocus={selection.releaseTextFocus} onSelectBlock={selection.markBlockSelected}
      onClearBlockSelection={selection.clearBlockSelection}
      onApplyDocumentTextFlowEdit={apply} onSaveBlock={vi.fn(async () => ({ status: 'saved' as const, block: blocks[0], recoveryReceipt: null, reconciliation: 'response' as const }))}
      noteCanvasRuntime={{ ...props.noteCanvasRuntime, canvasObjects: [...props.noteCanvasRuntime.canvasObjects, image.canvasObject, table.canvasObject],
        canvasPlacements: [table.placement, image.placement], imageObjects: [image.imageObject], structuredObjects: [table.structuredObject] }} />;
  }
  const view = render(<Fixture />);
  const text = (id: string) => view.container.querySelector<HTMLTextAreaElement>('textarea[data-block-id="' + id + '"]')!;
  const object = (id: string) => view.container.querySelector<HTMLElement>('[data-canvas-object-id="' + id + '"]')!;
  const item = view.container.querySelector<HTMLElement>('article[data-block-id="item"]')!;
  return { ...view, text, object, item, apply, props };
}

describe('fix1 real writing surface navigation (synthetic memory)', () => {
  it('lands on actual image, table and item shells and leaves in both directions without editing', () => {
    const editor = fixture();
    const first = editor.text('first');
    act(() => { first.focus(); first.setSelectionRange(2, 2); });
    for (const target of [editor.object('image'), editor.object('table'), editor.item, editor.text('last')]) {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(target);
      if (target.dataset.canvasObjectId) expect(target.getAttribute('data-canvas-' + target.dataset.canvasObjectId + '-selected')).toBe('true');
      if (target.dataset.canvasObjectId) expect(first.closest('article')?.className).not.toContain('blockActive');
      if (target !== editor.text('last')) {
        expect(fireEvent.keyDown(target, { key: 'ArrowDown', shiftKey: true })).toBe(false);
        expect(document.activeElement).toBe(target);
        expect(fireEvent.keyDown(target, { key: 'Enter' })).toBe(true);
        expect(fireEvent.keyDown(target, { key: 'x' })).toBe(true);
      }
    }
    expect(editor.object('image').dataset.canvasImageSelected).toBe('false');
    expect(editor.object('table').dataset.canvasTableSelected).toBe('false');
    for (const target of [editor.item, editor.object('table'), editor.object('image'), first]) {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(target);
    }
    expect(first.selectionStart).toBe(2);
    expect(editor.apply).not.toHaveBeenCalled();
    expect(editor.props.onCreateBlock).not.toHaveBeenCalled();
    expect(editor.props.onPersistCanvasObject).not.toHaveBeenCalled();
  });

  it('stops Shift arrows and direct Shift+Click at real canvas object barriers', () => {
    const editor = fixture();
    const first = editor.text('first');
    act(() => { first.focus(); first.setSelectionRange(2, 2); });
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(first);
    fireEvent.mouseDown(editor.text('last'), { shiftKey: true, clientX: 16, clientY: 0 });
    expect(document.activeElement).toBe(first);
    expect(editor.container.querySelector('[data-textflow-selection-layer]')).toBeNull();
    expect(editor.apply).not.toHaveBeenCalled();
  });
});
