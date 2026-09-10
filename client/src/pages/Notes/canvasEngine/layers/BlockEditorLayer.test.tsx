import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import type {
  NoteBlock,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import {
  createTextBlockContentV1,
  TEXT_FLOW_CONTENT_KEY,
} from '../textFlowService';
import { BlockEditorLayer } from './BlockEditorLayer';
import { usePlacementHistory } from '../hooks/usePlacementHistory';

type BlockEditorLayerProps = ComponentProps<typeof BlockEditorLayer>;

function renderSubject(propsOverride: Partial<BlockEditorLayerProps> = {}) {
  const textFlow = createTextBlockContentV1('Alpha');
  const block: NoteBlock = {
    id: 'block-k4',
    placement_id: 'placement-k4',
    display_overrides_json: {},
    canvas_layout: null,
    block_type: 'text',
    title: null,
    content_json: {
      body: 'Alpha',
      [TEXT_FLOW_CONTENT_KEY]: textFlow,
    },
    plain_text: 'Alpha',
    metadata: {},
    order_index: 0,
    source_references: [],
  };
  const onBeginMove = vi.fn();
  const onToggleExportRole = vi.fn();
  const onToggleAIVisibility = vi.fn();
  const onAnnotateBlock = vi.fn();
  const onTrash = vi.fn();
  const onTextChange = vi.fn();
  const onTextFlowChange = vi.fn();
  const onSave = vi.fn(async (): Promise<BlockSaveOutcome> => ({
    status: 'saved',
    block,
    recoveryReceipt: null,
    reconciliation: 'not_needed',
  }));
  const noop = vi.fn();
  const props: BlockEditorLayerProps = {
    block,
    contentReadOnly: false,
    text: 'Alpha',
    textFlowDraft: textFlow,
    annotations: [],
    selectedAnnotationIds: [],
    layout: {
      x: 0,
      y: 0,
      width: 320,
      height: 72,
      surface: 'formal_page',
    },
    blockControlAnchor: { x: 12, y: 12 },
    affiliationOutline: null,
    layoutMode: false,
    pageOffsetX: 0,
    saving: false,
    active: true,
    autoFocus: false,
    onFocused: noop,
    onFocusReleased: noop,
    onAnnotationSelect: noop,
    onAnnotationContextMenu: noop,
    onAnnotationStackSelect: noop,
    onTextUnitSelection: noop,
    onTextUnitContextMenu: noop,
    onBlockContextMenu: noop,
    onTextChange,
    onTextFlowChange,
    onFieldDraftChange: noop,
    onSave,
    onTrash,
    onSelect: noop,
    onBeginMove,
    onBeginResize: noop,
    onToggleExportRole,
    onToggleAIVisibility,
    onAnnotateBlock,
    showBlockTypeBadge: false,
    showAIStatusBadge: false,
    showExportStatusBadge: false,
    showLabelOverlay: false,
    onKeyDown: noop,
    onMeasuredHeight: noop,
    anchorsBySourceRef: {},
    sourceJumpBusy: null,
    onViewSource: noop,
  };

  render(<BlockEditorLayer {...props} {...propsOverride} />);

  return {
    onAnnotateBlock,
    onBeginMove,
    onSave,
    onTextChange,
    onTextFlowChange,
    onToggleAIVisibility,
    onToggleExportRole,
    onTrash,
  };
}

function getBlockToolbar(): HTMLElement {
  const toolbar = screen.getByRole('button', { name: 'Move block' }).parentElement;
  if (!toolbar) throw new Error('Block toolbar action group must exist');
  return toolbar;
}

describe('BlockEditorLayer K-4 affiliation controls', () => {
  it('keeps only recovery saving available while text editing remains paused', async () => {
    const subject = renderSubject({ contentReadOnly: true, allowSaveRecovery: true });
    const retry = screen.getByTitle('Retry saving block') as HTMLButtonElement;
    expect(retry.disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Move block' }) as HTMLButtonElement).disabled).toBe(true);
    expect((document.querySelector('textarea') as HTMLTextAreaElement).readOnly).toBe(true);
    fireEvent.click(retry);
    await waitFor(() => expect(subject.onSave).toHaveBeenCalledWith(false));
  });

  it.each([
    ['ordinary read-only', false, false],
    ['recovery already saving', true, true],
  ] as const)('does not enable Save for %s', (_label, allowSaveRecovery, saving) => {
    const subject = renderSubject({ contentReadOnly: true, allowSaveRecovery, saving });
    const save = screen.getByTitle(allowSaveRecovery ? 'Retry saving block' : 'Save block') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(subject.onSave).not.toHaveBeenCalled();
  });

  it('routes Ctrl+Z from a paused managed textarea to its existing runtime history', async () => {
    const undo = vi.fn(async () => true);
    const history = renderHook(() => usePlacementHistory({
      applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(async () => true),
    }));
    renderSubject({ contentReadOnly: true, onTextEditBoundary: vi.fn() });
    const textarea = document.querySelector('textarea')!;
    await act(async () => {
      history.result.current.pushHistoryEntry({ type: 'reversibleEdit', undo, redo: async () => true });
      fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
      await history.result.current.whenHistoryIdle();
    });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('does not enroll an unmanaged read-only textarea in runtime undo', async () => {
    const undo = vi.fn(async () => true);
    const history = renderHook(() => usePlacementHistory({
      applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(async () => true),
    }));
    renderSubject({ contentReadOnly: true });
    await act(async () => {
      history.result.current.pushHistoryEntry({ type: 'reversibleEdit', undo, redo: async () => true });
      fireEvent.keyDown(document.querySelector('textarea')!, { key: 'z', ctrlKey: true });
      await history.result.current.whenHistoryIdle();
    });
    expect(undo).not.toHaveBeenCalled();
  });

  it.each([
    ['page', 'var(--border-focus)'],
    ['workspace', 'var(--border-default)'],
  ] as const)('K-3 renders the %s affiliation as the existing dashed block frame', (tone, colorToken) => {
    renderSubject({
      affiliationOutline: {
        affiliationKind: tone === 'page' ? 'crossing' : 'workspace_only',
        tone,
        colorToken,
      },
    });

    const blockShell = document.querySelector<HTMLElement>('[data-note-block-shell="true"]');
    expect(blockShell?.style.borderStyle).toBe('dashed');
    expect(blockShell?.style.borderColor).toBe(colorToken);
  });

  it('K-4.1 keeps retired gutter actions absent and replaces the role select with the unit handle', () => {
    renderSubject();

    const gutter = screen.getByLabelText('Text unit tools');
    expect(within(gutter).queryByRole('button', { name: /text unit row/i })).toBeNull();
    expect(within(gutter).queryByRole('button', { name: 'Insert text unit below' })).toBeNull();
    expect(within(gutter).queryByRole('button', { name: 'Label this text unit' })).toBeNull();
    expect(within(gutter).queryByRole('combobox', { name: 'Text unit writing role' })).toBeNull();
    expect(within(gutter).getByRole('button', { name: 'Text unit handle' })).toBeTruthy();
  });

  it('K-4.2 inserts a real paragraph text unit below the active block', () => {
    const subject = renderSubject();

    fireEvent.click(within(getBlockToolbar()).getByRole('button', { name: 'Insert text unit below' }));

    expect(subject.onTextFlowChange).toHaveBeenCalledTimes(1);
    const nextFlow = subject.onTextFlowChange.mock.calls[0]?.[0] as TextBlockContentV1;
    expect(nextFlow.units).toHaveLength(2);
    expect(nextFlow.units[0]).toMatchObject({
      id: 'tu-1',
      text: 'Alpha',
      writing_role: 'paragraph',
      order_index: 0,
    });
    expect(nextFlow.units[1]).toMatchObject({
      id: 'tu-2',
      text: '',
      writing_role: 'paragraph',
      order_index: 1,
      status: 'active',
    });
    expect(subject.onTextChange.mock.calls[0]?.slice(0, 2)).toEqual(['Alpha\n', 6]);
  });

  it('K-4.3 keeps Move Export AI Save Label and Trash controls wired', async () => {
    const subject = renderSubject();
    const toolbar = within(getBlockToolbar());

    fireEvent.pointerDown(toolbar.getByRole('button', { name: 'Move block' }));
    fireEvent.click(toolbar.getByRole('button', { name: 'Exclude from export' }));
    fireEvent.click(toolbar.getByRole('button', { name: 'Hide from AI context' }));
    fireEvent.click(toolbar.getByTitle('Save block'));
    fireEvent.click(toolbar.getByRole('button', { name: 'Label block' }));
    fireEvent.click(toolbar.getByTitle('Move to trash'));

    expect(subject.onBeginMove).toHaveBeenCalledTimes(1);
    expect(subject.onToggleExportRole).toHaveBeenCalledTimes(1);
    expect(subject.onToggleAIVisibility).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(subject.onSave).toHaveBeenCalledTimes(1));
    expect(subject.onSave).toHaveBeenCalledWith(false);
    expect(subject.onAnnotateBlock).toHaveBeenCalledTimes(1);
    expect(subject.onTrash).toHaveBeenCalledTimes(1);
  });
});
