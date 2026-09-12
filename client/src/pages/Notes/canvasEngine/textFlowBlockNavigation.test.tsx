import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useRef, useState, type ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import {
  DocumentTextFlowSelectionContext,
  useDocumentTextFlowSelection,
} from './hooks/useDocumentTextFlowSelection';
import { useNoteCanvasResolvedLayoutModel } from './hooks/useNoteCanvasLayoutModel';
import { createSurfaceModePolicy } from './modePolicyService';
import { createDefaultDocumentTypographyProfile } from './typographyProfileService';
import type { DocumentFlowEdit } from './documentTextFlowSelection';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from './textFlowService';
import {
  navigateTextFlowBlockBoundary,
  textFlowReadingOrder,
  type TextFlowNavigationTarget,
} from './textFlowBlockNavigation';

// jsdom has no line layout; the browser smoke verifies the shared B5 mirror.
vi.mock('./textareaNavigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('./textareaNavigation')>(),
  measureTextareaNavigation: vi.fn((_node: HTMLTextAreaElement, offset: number) => ({
    x: offset * 8, y: 0, lineHeight: 20, atFirstLine: true, atLastLine: true,
  })),
  textareaBoundaryCaret: vi.fn((node: HTMLTextAreaElement, _edge: string, x: number) => ({
    offset: Math.min(node.value.length, Math.round(x / 8)), y: 0,
  })),
  textareaCaretAtPoint: vi.fn((node: HTMLTextAreaElement, x: number) => ({
    offset: Math.min(node.value.length, Math.round(x / 8)), y: 0,
  })),
}));

// Item content is an independent read-only projection, outside this text test.
vi.mock('./blocks/ItemRefBlockProjection', () => ({
  ItemRefBlockProjection: () => <div data-synthetic-item-projection="true">Referenced item</div>,
}));

afterEach(cleanup);

function block(id: string, text: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  const base = createTextBlockContentV1(text);
  const flow = { ...base, units: text.split('\n').map((value, index) => ({
    ...base.units[0], id: `${id}-unit-${index}`, text: value, order_index: index,
  })) };
  return {
    id, placement_id: `placement-${id}`, display_overrides_json: {}, canvas_layout: null,
    block_type: 'paragraph', title: null, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow },
    plain_text: text, metadata: {}, order_index: 0, source_references: [], ...overrides,
  };
}

function renderBlocks(blocks: NoteBlock[], options: {
  readOnlyIds?: string[];
  disabled?: boolean;
  rerenderOnFocus?: boolean;
  documentSelection?: boolean;
  realLayout?: boolean;
} = {}) {
  const onChange = vi.fn();
  const onSelect = vi.fn();
  const onDocumentEdit = vi.fn(async (_changes: DocumentFlowEdit[]) => true);
  let changeNote!: (noteId: string) => void;
  function Fixture() {
    const targets = useRef(new Map<string, TextFlowNavigationTarget>());
    const [focusRevision, setFocusRevision] = useState(0);
    const [drafts, setDrafts] = useState<Record<string, TextBlockContentV1>>({});
    const [noteId, setNoteId] = useState('synthetic-b6b-note');
    changeNote = setNoteId;
    const resolved = useNoteCanvasResolvedLayoutModel({
      contentWidth: 760, documentTypographyProfile: createDefaultDocumentTypographyProfile(),
      layoutDrafts: {}, sortedBlocks: [...blocks].sort((a, b) => a.order_index - b.order_index),
      surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page'), pageFrames: [],
    });
    const visibleBlocks = options.realLayout ? resolved.visibleBlocks : blocks;
    const layoutOrder = options.realLayout ? { blockLayouts: resolved.blockLayouts, pageFrames: [] } : {};

    const selection = useDocumentTextFlowSelection({
      noteId, visibleBlocks, ...layoutOrder,
      disabled: !options.documentSelection || options.disabled,
      applyDocumentEdit: async (changes) => {
        setDrafts((current) => ({ ...current, ...Object.fromEntries(changes.map((change) => [change.block.id, change.nextTextFlow])) }));
        return onDocumentEdit(changes);
      },
    });
    return <DocumentTextFlowSelectionContext.Provider value={options.documentSelection ? selection : null}>
      <div data-synthetic-focus-revision={focusRevision}>{blocks.map((entry) => {
      const noop = () => undefined;
      const props: ComponentProps<typeof BlockEditorLayer> = {
        block: entry, contentReadOnly: options.disabled || options.readOnlyIds?.includes(entry.id) || false,
        text: drafts[entry.id]?.units.map((unit) => unit.text).join('\n') ?? entry.plain_text ?? '',
        textFlowDraft: drafts[entry.id], annotations: [], selectedAnnotationIds: [],
        layout: { x: 0, y: 0, width: 320, height: 72, surface: 'formal_page' },
        blockControlAnchor: null, affiliationOutline: null, layoutMode: false, pageOffsetX: 0,
        saving: false, active: true, autoFocus: false,
        onFocused: options.rerenderOnFocus ? () => setFocusRevision((current) => current + 1) : noop,
        onFocusReleased: noop,
        onAnnotationSelect: noop, onAnnotationContextMenu: noop, onAnnotationStackSelect: noop,
        onTextUnitSelection: noop, onTextUnitContextMenu: noop, onBlockContextMenu: noop,
        onTextChange: onChange, onTextFlowChange: onChange, onFieldDraftChange: noop,
        onSave: vi.fn().mockResolvedValue({ status: 'saved' }), onTrash: noop, onSelect: () => onSelect(entry.id),
        onBeginMove: noop, onBeginResize: noop, onToggleExportRole: noop, onToggleAIVisibility: noop,
        onAnnotateBlock: noop, showBlockTypeBadge: false, showAIStatusBadge: false,
        showExportStatusBadge: false, showLabelOverlay: false, onKeyDown: noop,
        onMeasuredHeight: noop, anchorsBySourceRef: {}, sourceJumpBusy: null, onViewSource: noop,
        onBoundaryNavigate: (request) => navigateTextFlowBlockBoundary({
          visibleBlocks, ...layoutOrder, fromBlockId: entry.id, request, targets: targets.current,
          disabled: options.disabled,
        }),
        onNavigationTarget: (target) => {
          if (target) targets.current.set(entry.id, target);
          else targets.current.delete(entry.id);
        },
      };
      return <BlockEditorLayer key={entry.id} {...props} />;
    })}</div></DocumentTextFlowSelectionContext.Provider>;
  }
  const view = render(<Fixture />);
  return {
    ...view, onChange, onSelect, onDocumentEdit, switchNote: (noteId: string) => act(() => changeNote(noteId)),
    unit: (id: string, index = 0) => view.container.querySelector<HTMLTextAreaElement>(
      `textarea[data-text-unit-id="${id}-unit-${index}"]`,
    )!,
  };
}

describe('B6 cross-block cursor navigation', () => {
  it.each(['v1', 'v2'] as const)('orders same-row objects and text in the rendered %s coordinate system', (coordinateContract) => {
    expect(textFlowReadingOrder([block('text', 'text')], {
      coordinateContract, pageOffsetX: 80, pageFrames: [],
      blockLayouts: { text: { x: 0, y: 0, width: 320, height: 72, coordinate_space: 'canvas_world', surface: 'canvas_workspace' } },
      obstacles: [{ id: 'object:image', x: 40, y: 0 }],
    }).map((entry) => entry.id)).toEqual(['object:image', 'text']);
  });

  it('fix1 smoke 3: follows real Layout placement after movement leaves order_index unchanged', () => {
    const editor = renderBlocks([
      block('lower', 'lower paragraph', { order_index: 0, canvas_layout: { x: 0, y: 220, width: 320, height: 72, surface: 'formal_page' } }),
      block('upper', 'upper paragraph', { order_index: 1, canvas_layout: { x: 0, y: 0, width: 320, height: 72, surface: 'formal_page' } }),
    ], { documentSelection: true, realLayout: true });
    const upper = editor.unit('upper');
    act(() => { upper.focus(); upper.setSelectionRange(5, 5); });
    fireEvent.keyDown(upper, { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(editor.unit('lower'));
    const setData = vi.fn();
    fireEvent.copy(editor.unit('lower'), { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', ' paragraph\n\nlower');
  });

  it('fix1 smoke 1: Henry three paragraphs keep the mid-unit anchor through two Shift+Down steps', () => {
    const editor = renderBlocks([block('henry', 'We are the Champions of the world\nSecond paragraph has more text here\nThird paragraph has more text here')], { documentSelection: true, rerenderOnFocus: true });
    const first = editor.unit('henry');
    act(() => { first.focus(); first.setSelectionRange(21, 21); });
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(editor.unit('henry', 1), { key: 'ArrowDown', shiftKey: true });
    const setData = vi.fn();
    fireEvent.copy(editor.unit('henry', 2), { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'of the world\nSecond paragraph has more text here\nThird paragraph has m');
  });

  it('B9 keeps cross-block Shift hit coordinates and subsequent emoji traversal on grapheme boundaries', () => {
    const editor = renderBlocks([block('first', 'start'), block('last', 'A😀e\u0301B')], { documentSelection: true });
    const source = editor.unit('first');
    const target = editor.unit('last');
    act(() => { source.focus(); source.setSelectionRange(2, 2); });
    fireEvent.mouseDown(target, { shiftKey: true, clientX: 16, clientY: 0 });
    expect(target.selectionStart).toBe(3);
    const setData = vi.fn();
    fireEvent.copy(target, { clipboardData: { setData } });
    expect(setData).toHaveBeenLastCalledWith('text/plain', 'art\n\nA😀');
    fireEvent.keyDown(target, { key: 'ArrowRight', shiftKey: true });
    expect(target.selectionStart).toBe(5);
    fireEvent.copy(target, { clipboardData: { setData } });
    expect(setData).toHaveBeenLastCalledWith('text/plain', 'art\n\nA😀e\u0301');
    fireEvent.keyDown(target, { key: 'Backspace' });
    expect(editor.unit('first').value).toBe('st');
    expect(editor.unit('last').value).toBe('B');
    expect(editor.onDocumentEdit).toHaveBeenCalledTimes(1);
    expect(editor.onChange).not.toHaveBeenCalled();
  });

  it('B6b smoke 1: extends Shift selection across adjacent text blocks and copies a blank line', () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], { documentSelection: true });
    const source = editor.unit('first');
    const target = editor.unit('last');
    act(() => { source.focus(); source.setSelectionRange(2, 2); });
    fireEvent.keyDown(source, { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement, 'Shift selection must leave the first block boundary').toBe(target);
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(2);
    const setData = vi.fn();
    fireEvent.copy(target, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'rst\n\nla');
    expect(editor.onChange).not.toHaveBeenCalled();
  });

  it('retains a saved block selection when its focus receipt rerenders the parent', () => {
    // There is intentionally no textFlowDraft: BlockEditorLayer rehydrates the
    // saved content on every parent render, just as a newly opened note does.
    const editor = renderBlocks([block('saved', 'first\nsecond')], { rerenderOnFocus: true });
    const first = editor.unit('saved');
    const second = editor.unit('saved', 1);
    act(() => { first.focus(); first.setSelectionRange(2, 2); });
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(second);
    expect(editor.container.querySelector('[data-synthetic-focus-revision="2"]')).not.toBeNull();
    const setData = vi.fn();
    fireEvent.copy(second, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'rst\nse');
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(2);
    expect(editor.onChange).not.toHaveBeenCalled();
  });

  it('fix1 smoke 4: lands on item, projection and image shells, then leaves with the next arrow', () => {
    const editor = renderBlocks([
      block('first', 'long first text'),
      block('item', '', { block_type: 'item_ref', content_json: { item_id: 'synthetic-item' } }),
      block('projection', 'Source projection', { source_kind: 'source_projection' }),
      block('media', 'Image caption', { block_type: 'image' }),
      block('last', 'last text content'),
    ]);
    const source = editor.unit('first');
    act(() => { source.focus(); source.setSelectionRange(7, 7); });
    const shell = (id: string) => editor.container.querySelector<HTMLElement>('article[data-block-id="' + id + '"]')!;
    let current: HTMLElement = source;
    for (const id of ['item', 'projection', 'media']) {
      fireEvent.keyDown(current, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(shell(id));
      expect(editor.onSelect).toHaveBeenLastCalledWith(id);
      fireEvent.keyDown(shell(id), { key: 'ArrowDown', shiftKey: true });
      expect(document.activeElement).toBe(shell(id));
      expect(fireEvent.keyDown(shell(id), { key: 'Enter' })).toBe(true);
      expect(fireEvent.keyDown(shell(id), { key: 'x' })).toBe(true);
      current = shell(id);
    }
    fireEvent.keyDown(current, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(editor.unit('last'));
    expect(editor.unit('last').selectionStart).toBe(7);
    for (const id of ['media', 'projection', 'item']) {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(shell(id));
    }
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(source);
    expect(source.selectionStart).toBe(7);
    expect(editor.onChange).not.toHaveBeenCalled();
  });

  it('retains the sticky column through a short block and reverses across blocks', () => {
    const editor = renderBlocks([
      block('first', 'first unit\nlong source text'), block('short', 'hi'),
      block('last', 'long target text\nlast unit'),
    ]);
    const source = editor.unit('first', 1);
    const short = editor.unit('short');
    const target = editor.unit('last');
    act(() => { source.focus(); source.setSelectionRange(9, 9); });
    fireEvent.keyDown(source, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(short);
    expect(short.selectionStart).toBe(2);
    fireEvent.keyUp(short, { key: 'ArrowDown' });
    fireEvent.select(short);
    fireEvent.keyDown(short, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(target);
    expect(target.selectionStart).toBe(9);
    fireEvent.keyDown(target, { key: 'ArrowUp' });
    fireEvent.keyDown(short, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(source);
    expect(source.selectionStart).toBe(9);
    expect(editor.onChange).not.toHaveBeenCalled();
  });

  it('moves Right to the first unit and Left to the final unit without claiming outer edges', () => {
    const editor = renderBlocks([block('first', 'first\nend'), block('last', 'start\nlast')]);
    const source = editor.unit('first', 1);
    const target = editor.unit('last');
    act(() => { source.focus(); source.setSelectionRange(source.value.length, source.value.length); });
    expect(fireEvent.keyDown(source, { key: 'ArrowRight' })).toBe(false);
    expect(document.activeElement).toBe(target);
    expect(target.selectionStart).toBe(0);
    expect(fireEvent.keyDown(target, { key: 'ArrowLeft' })).toBe(false);
    expect(document.activeElement).toBe(source);
    expect(source.selectionStart).toBe(source.value.length);
    const first = editor.unit('first');
    act(() => { first.focus(); first.setSelectionRange(0, 0); });
    expect(fireEvent.keyDown(first, { key: 'ArrowLeft' })).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('does not cross blocks while composing, holding Shift, or on a read-only surface', () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')]);
    const source = editor.unit('first');
    act(() => { source.focus(); source.setSelectionRange(source.value.length, source.value.length); });
    fireEvent.keyDown(source, { key: 'ArrowRight', shiftKey: true });
    expect(document.activeElement).toBe(source);
    fireEvent.compositionStart(source);
    fireEvent.keyDown(source, { key: 'ArrowDown', isComposing: true });
    fireEvent.keyDown(source, { key: 'ArrowRight', keyCode: 229 });
    expect(document.activeElement).toBe(source);
    editor.unmount();
    const readOnly = renderBlocks([block('first', 'first'), block('last', 'last')], { disabled: true });
    const paused = readOnly.unit('first');
    act(() => { paused.focus(); paused.setSelectionRange(paused.value.length, paused.value.length); });
    fireEvent.keyDown(paused, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(paused);
    expect(readOnly.onChange).not.toHaveBeenCalled();
  });

  it('ignores unavailable targets, stale source IDs and disabled coordinators', () => {
    const first = block('first', 'first');
    const refused = vi.fn(() => false);
    const accepted = vi.fn(() => true);
    const request = { direction: 'down', columnX: 72 } as const;
    const input = {
      visibleBlocks: [first, block('missing', ''), block('hidden', ''), block('last', '')],
      fromBlockId: first.id, request,
      targets: new Map([['hidden', refused], ['last', accepted]]),
    };
    expect(navigateTextFlowBlockBoundary({ ...input, disabled: true })).toBe(false);
    expect(navigateTextFlowBlockBoundary({ ...input, fromBlockId: 'removed' })).toBe(false);
    expect(accepted).not.toHaveBeenCalled();
    expect(navigateTextFlowBlockBoundary(input)).toBe(true);
    expect(refused).toHaveBeenCalledWith(request);
    expect(accepted).toHaveBeenCalledWith(request);
  });
});

describe('B6b document selection events (synthetic memory)', () => {
  const documentOptions = { documentSelection: true };
  const copy = (node: HTMLElement) => {
    const setData = vi.fn();
    fireEvent.copy(node, { clipboardData: { setData } });
    return setData;
  };
  const selectDown = (editor: ReturnType<typeof renderBlocks>, id = 'first', offset = 2) => {
    const source = editor.unit(id);
    act(() => { source.focus(); source.setSelectionRange(offset, offset); });
    fireEvent.keyDown(source, { key: 'ArrowDown', shiftKey: true });
  };

  it('uses rendered order and retains a cross-block selection after focus receipt rerenders', () => {
    const editor = renderBlocks([
      block('first', 'first', { order_index: 90 }), block('last', 'last', { order_index: 1 }),
    ], { ...documentOptions, rerenderOnFocus: true });
    selectDown(editor);
    expect(document.activeElement).toBe(editor.unit('last'));
    expect(editor.container.querySelector('[data-synthetic-focus-revision="2"]')).not.toBeNull();
    expect(copy(editor.unit('last'))).toHaveBeenCalledWith('text/plain', 'rst\n\nla');
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(2);
    expect(editor.onChange).not.toHaveBeenCalled();
    expect(editor.onDocumentEdit).not.toHaveBeenCalled();
  });

  it('extends and retracts the same anchor through three blocks in both directions', () => {
    const editor = renderBlocks([block('first', 'first'), block('middle', 'middle'), block('last', 'last')], documentOptions);
    selectDown(editor);
    fireEvent.keyDown(editor.unit('middle'), { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(editor.unit('last'));
    expect(copy(editor.unit('last'))).toHaveBeenCalledWith('text/plain', 'rst\n\nmiddle\n\nla');
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(3);
    fireEvent.keyDown(editor.unit('last'), { key: 'ArrowUp', shiftKey: true });
    expect(document.activeElement).toBe(editor.unit('middle'));
    expect(copy(editor.unit('middle'))).toHaveBeenCalledWith('text/plain', 'rst\n\nmi');
    fireEvent.keyDown(editor.unit('middle'), { key: 'ArrowUp', shiftKey: true });
    expect(document.activeElement).toBe(editor.unit('first'));
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(0);
    expect(copy(editor.unit('first'))).not.toHaveBeenCalled();

    const last = editor.unit('last');
    act(() => { last.focus(); last.setSelectionRange(2, 2); });
    fireEvent.keyDown(last, { key: 'ArrowUp', shiftKey: true });
    expect(copy(editor.unit('middle'))).toHaveBeenCalledWith('text/plain', 'ddle\n\nla');
    fireEvent.keyDown(editor.unit('middle'), { key: 'ArrowUp', shiftKey: true });
    expect(copy(editor.unit('first'))).toHaveBeenCalledWith('text/plain', 'rst\n\nmiddle\n\nla');
  });

  it('keeps unit newlines inside each block and blank lines between blocks', () => {
    const editor = renderBlocks([block('first', 'first\ninner'), block('last', 'last\ntail')], documentOptions);
    const source = editor.unit('first');
    act(() => { source.focus(); source.setSelectionRange(2, 2); });
    fireEvent.keyDown(source, { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(editor.unit('first', 1));
    fireEvent.keyDown(editor.unit('first', 1), { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(editor.unit('last'));
    expect(copy(editor.unit('last'))).toHaveBeenCalledWith('text/plain', 'rst\ninner\n\nla');
    fireEvent.keyDown(editor.unit('last'), { key: 'ArrowDown', shiftKey: true });
    expect(copy(editor.unit('last', 1))).toHaveBeenCalledWith('text/plain', 'rst\ninner\n\nlast\nta');
  });

  it('preserves the local cross-unit anchor when Shift+Click extends into the next block', () => {
    const editor = renderBlocks([block('first', 'first\ninner'), block('last', 'last')], documentOptions);
    selectDown(editor);
    expect(document.activeElement).toBe(editor.unit('first', 1));
    fireEvent.mouseDown(editor.unit('last'), { shiftKey: true, clientX: 24, clientY: 0 });
    expect(document.activeElement).toBe(editor.unit('last'));
    expect(editor.unit('last').selectionStart).toBe(3);
    expect(copy(editor.unit('last'))).toHaveBeenCalledWith('text/plain', 'rst\ninner\n\nlas');
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(3);
  });

  it('permits selection in the contiguous text segment before a later read-only block', () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last'), block('readonly', 'Read only')], {
      ...documentOptions, readOnlyIds: ['readonly'],
    });
    selectDown(editor);
    expect(document.activeElement).toBe(editor.unit('last'));
    expect(copy(editor.unit('last'))).toHaveBeenCalledWith('text/plain', 'rst\n\nla');
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(2);
    fireEvent.keyDown(editor.unit('last'), { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(editor.unit('last'));
    expect(copy(editor.unit('last'))).toHaveBeenCalledWith('text/plain', 'rst\n\nla');
  });

  it('clears a live document selection when switching Notes even if block IDs are reused', () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    editor.switchNote('different-synthetic-note');
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(0);
    expect(copy(editor.unit('last'))).not.toHaveBeenCalled();
    expect(editor.onDocumentEdit).not.toHaveBeenCalled();
  });

  it('normal pointer interaction outside the editor clears document selection', () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    fireEvent.pointerDown(document.body);
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(0);
    expect(copy(editor.unit('last'))).not.toHaveBeenCalled();
  });

  it.each(['item_ref', 'image', 'source_projection', 'read_only'] as const)(
    'smoke 4: Shift extension stops at an adjacent %s barrier in both directions', (barrier) => {
      const obstruction = block('barrier', 'Barrier', barrier === 'source_projection'
        ? { source_kind: 'source_projection' }
        : barrier === 'read_only' ? {} : { block_type: barrier });
      if (barrier === 'item_ref') obstruction.content_json = { item_id: 'synthetic-item' };
      const editor = renderBlocks([block('first', 'first'), obstruction, block('last', 'last')], {
        ...documentOptions, readOnlyIds: barrier === 'read_only' ? ['barrier'] : [],
      });
      selectDown(editor);
      expect(document.activeElement).toBe(editor.unit('first'));
      expect(copy(editor.unit('first'))).not.toHaveBeenCalled();
      const last = editor.unit('last');
      act(() => { last.focus(); last.setSelectionRange(2, 2); });
      fireEvent.keyDown(last, { key: 'ArrowUp', shiftKey: true });
      expect(document.activeElement).toBe(last);
      expect(copy(last)).not.toHaveBeenCalled();
      expect(editor.onDocumentEdit).not.toHaveBeenCalled();
      expect(editor.onChange).not.toHaveBeenCalled();
    },
  );

  it.each(['Escape', 'ArrowLeft', 'ArrowRight'])('clears a document selection with %s', (key) => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(2);
    fireEvent.keyDown(editor.unit('last'), { key });
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(0);
    expect(copy(document.activeElement as HTMLElement)).not.toHaveBeenCalled();
    expect(editor.onDocumentEdit).not.toHaveBeenCalled();
  });

  it('clears selection on compositionstart and blocks IME cross-boundary operations', () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    const target = editor.unit('last');
    fireEvent.compositionStart(target);
    expect(editor.container.querySelectorAll('[data-textflow-selection-layer="true"]')).toHaveLength(0);
    fireEvent.keyDown(target, { key: 'ArrowUp', shiftKey: true, isComposing: true });
    fireEvent.keyDown(target, { key: 'ArrowLeft', shiftKey: true, keyCode: 229 });
    expect(document.activeElement).toBe(target);
    expect(editor.onChange).not.toHaveBeenCalled();
    expect(editor.onDocumentEdit).not.toHaveBeenCalled();
  });

  it('native isComposing and keyCode 229 preserve a live document range without extending it', () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    const target = editor.unit('last');
    fireEvent.keyDown(target, { key: 'ArrowUp', shiftKey: true, isComposing: true });
    fireEvent.keyDown(target, { key: 'ArrowLeft', shiftKey: true, keyCode: 229 });
    expect(document.activeElement).toBe(target);
    expect(copy(target)).toHaveBeenCalledWith('text/plain', 'rst\n\nla');
    expect(editor.onChange).not.toHaveBeenCalled();
    expect(editor.onDocumentEdit).not.toHaveBeenCalled();
  });

  it('noncancelable beforeinput uses the following input fallback exactly once', async () => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    const target = editor.unit('last');
    await act(async () => {
      fireEvent(target, new InputEvent('beforeinput', {
        bubbles: true, cancelable: false, inputType: 'insertText', data: 'X',
      }));
      expect(editor.onDocumentEdit).not.toHaveBeenCalled();
      fireEvent.input(target, { target: { value: 'laXst', selectionStart: 3, selectionEnd: 3 }, inputType: 'insertText' });
    });
    expect(editor.onDocumentEdit).toHaveBeenCalledTimes(1);
    expect(editor.unit('first').value).toBe('fiX');
    expect(editor.unit('last').value).toBe('st');
    expect(editor.onChange).not.toHaveBeenCalled();
  });

  it.each(['Delete', 'Backspace'])('smoke 2 event route: %s edits each selected block without merging blocks', async (key) => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    await act(async () => { expect(fireEvent.keyDown(editor.unit('last'), { key })).toBe(false); });
    expect(editor.onDocumentEdit).toHaveBeenCalledTimes(1);
    const [changes] = editor.onDocumentEdit.mock.calls[0];
    expect(changes.map((change) => [change.block.id, change.nextTextFlow.units.map((unit) => unit.text)]))
      .toEqual([['first', ['fi']], ['last', ['st']]]);
    expect(editor.container.querySelectorAll('textarea')).toHaveLength(2);
    expect(document.activeElement).toBe(editor.unit('first'));
    expect(editor.unit('first').selectionStart).toBe(2);
    expect(editor.onChange).not.toHaveBeenCalled();
  });

  it.each(['beforeinput', 'paste', 'cut'] as const)('smoke 3 event route: cross-block %s produces a single document edit', async (operation) => {
    const editor = renderBlocks([block('first', 'first'), block('last', 'last')], documentOptions);
    selectDown(editor);
    const target = editor.unit('last');
    const setData = vi.fn();
    await act(async () => {
      if (operation === 'beforeinput') {
        expect(fireEvent(target, new InputEvent('beforeinput', {
          bubbles: true, cancelable: true, inputType: 'insertText', data: 'X',
        }))).toBe(false);
      } else if (operation === 'paste') {
        expect(fireEvent.paste(target, { clipboardData: { getData: () => 'X' } })).toBe(false);
      } else {
        expect(fireEvent.cut(target, { clipboardData: { setData } })).toBe(false);
        expect(setData).toHaveBeenCalledWith('text/plain', 'rst\n\nla');
      }
    });
    expect(editor.onDocumentEdit).toHaveBeenCalledTimes(1);
    const [changes] = editor.onDocumentEdit.mock.calls[0];
    expect(changes.map((change) => [change.block.id, change.nextTextFlow.units.map((unit) => unit.text)]))
      .toEqual([['first', [operation === 'cut' ? 'fi' : 'fiX']], ['last', ['st']]]);
    expect(editor.container.querySelectorAll('textarea')).toHaveLength(2);
    expect(editor.onChange).not.toHaveBeenCalled();
  });
});
