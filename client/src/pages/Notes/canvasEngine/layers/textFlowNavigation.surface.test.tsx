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
import { NoteAgentContextRoute } from '../../NoteAgentContextRoute';
import { useUIStore } from '@/stores/uiStore';
import { useAgentStore } from '@/stores/agentStore';
import { AgentMessageRole, type AgentMessage } from '@shared/types';

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
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('URL', class extends URL { static revokeObjectURL = vi.fn(); });
});
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


function fixture() {
  const props = propsFor(frame(0), 'page');
  const makeBlock = (id: string, text: string, y: number, order_index: number, item = false): NoteBlock => {
    const flow = createTextBlockContentV1(text);
    flow.units[0].id = id + '-unit';
    return { ...props.visibleBlocks[0], id, placement_id: 'placement-' + id, order_index,
      block_type: item ? 'item_ref' : 'paragraph', plain_text: text,
      content_json: item ? { item_id: 'synthetic-item' } : { [TEXT_FLOW_CONTENT_KEY]: flow },
      canvas_layout: { x: 0, y, width: 320, height: 60, coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: props.noteCanvasRuntime.pageFrames[0].id } };
  };
  const media: NoteBlock = { ...makeBlock('image', '', 150, 3), block_type: 'media',
    metadata: { media: { asset_id: 'synthetic-asset', naturalWidth: 10, naturalHeight: 10 } } };
  const reference = makeBlock('table', '', 300, 4, true);
  const blocks = [makeBlock('last', 'last text', 600, 0), makeBlock('item', '', 450, 1, true),
    makeBlock('first', 'first text', 0, 2), media, reference];
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
      noteCanvasRuntime={props.noteCanvasRuntime} />;
  }
  const view = render(<Fixture />);
  const text = (id: string) => view.container.querySelector<HTMLTextAreaElement>('textarea[data-block-id="' + id + '"]')!;
  const object = (id: string) => view.container.querySelector<HTMLElement>('article[data-block-id="' + id + '"]')!;
  const item = view.container.querySelector<HTMLElement>('article[data-block-id="item"]')!;
  return { ...view, text, object, item, apply, props };
}

describe('fix1 real writing surface navigation (synthetic memory)', () => {
  it('lands on actual Page media and item shells and leaves in both directions without editing', () => {
    const editor = fixture();
    const first = editor.text('first');
    act(() => { first.focus(); first.setSelectionRange(2, 2); });
    for (const target of [editor.object('image'), editor.object('table'), editor.item, editor.text('last')]) {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(target);
      if (target !== editor.text('last')) expect(first.closest('article')?.className).not.toContain('blockActive');
      if (target !== editor.text('last')) {
        expect(fireEvent.keyDown(target, { key: 'ArrowDown', shiftKey: true })).toBe(false);
        expect(document.activeElement).toBe(target);
        expect(fireEvent.keyDown(target, { key: 'Enter' })).toBe(true);
        expect(fireEvent.keyDown(target, { key: 'x' })).toBe(true);
      }
    }
    for (const target of [editor.item, editor.object('table'), editor.object('image'), first]) {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(target);
    }
    expect(first.selectionStart).toBe(2);
    expect(editor.apply).not.toHaveBeenCalled();
    expect(editor.props.onCreateBlock).not.toHaveBeenCalled();
    expect(editor.props.onPersistCanvasObject).not.toHaveBeenCalled();
  });

  it('stops Shift arrows and direct Shift+Click at real Page media and item barriers', () => {
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


describe('C2 attention uses the current block selection', () => {
  it('does not project legacy answer cards or their exits on the real note surface', async () => {
    const props = propsFor(frame(0), 'page');
    const block = props.visibleBlocks[0];
    const historical = { id: 'old-answer', conversation_id: 'old-chat', role: AgentMessageRole.Assistant,
      content: 'Complete answer retained in conversation.', tool_calls: null, tool_results: null, token_count: null,
      created_at: '2026-09-20T00:00:00Z', meta: { answer_card: { question: 'Why this paragraph?',
        selection: { note_id: props.noteId, block_ids: [block.id] } } } };
    const previousMessages = useAgentStore.getState().messages;
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 80, right: 500, bottom: 180, width: 400, height: 100, x: 100, y: 80, toJSON: () => ({}),
    });
    // Legacy JSON is intentionally not part of the active metadata type.
    useAgentStore.setState({ messages: [historical as unknown as AgentMessage] });
    try {
      const view = render(<NoteAgentContextRoute.Provider value={true}>
        <NoteWritingSurfaceLayer {...props} selectedBlockId={block.id} contentReadOnly={false} layoutMode={false} />
      </NoteAgentContextRoute.Provider>);
      expect(view.container.querySelector('[data-note-block-shell="true"]')).toBeTruthy();
      expect(view.getByRole('button', { name: '问 Agent' })).toBeTruthy();
      expect(view.queryByRole('complementary', { name: '页边答卡' })).toBeNull();
      expect(view.queryByRole('button', { name: '插入为块' })).toBeNull();
      expect(view.queryByRole('button', { name: '散去' })).toBeNull();
      expect(view.queryByText(historical.content)).toBeNull();
      expect(props.onCreateBlock).not.toHaveBeenCalled();
      expect(useAgentStore.getState().messages).toEqual([historical]);
      view.unmount();
    } finally {
      measure.mockRestore();
      useAgentStore.setState({ messages: previousMessages });
    }
  });

  it('opens the existing contextHint channel after saving selected text, without a model call', async () => {
    const props = propsFor(frame(0), 'page');
    const block = props.visibleBlocks[0];
    const save = vi.fn(async () => ({ status: 'saved' as const, block, recoveryReceipt: null, reconciliation: 'response' as const }));
    useUIStore.setState({ agentPanelOpen: false, agentContextHint: null });
    const view = render(<NoteAgentContextRoute.Provider value={true}><NoteWritingSurfaceLayer {...props}
      selectedBlockId={block.id} contentReadOnly={false} layoutMode={false} onSaveBlock={save} />
    </NoteAgentContextRoute.Provider>);
    expect(useUIStore.getState().agentPanelOpen).toBe(false);
    await act(async () => fireEvent.click(view.getByRole('button', { name: '问 Agent' })));
    expect(save).toHaveBeenCalledTimes(1);
    expect(useUIStore.getState().agentContextHint).toEqual({ type: 'note_view', data: {
      note_id: props.noteId, selection: { note_id: props.noteId, block_ids: [block.id] },
    } });
    expect(useUIStore.getState().agentPanelOpen).toBe(true);
    expect(props.onCreateBlock).not.toHaveBeenCalled();
  });

  it('does not install the note selection entry inside the board modal route', () => {
    const props = propsFor(frame(0), 'page');
    const view = render(<NoteWritingSurfaceLayer {...props} selectedBlockId={props.visibleBlocks[0].id} />);
    expect(view.queryByRole('button', { name: '问 Agent' })).toBeNull();
  });
});
