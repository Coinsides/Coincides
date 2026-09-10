import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useRef, useState, type ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import type { NoteBlock } from './runtimeDataTypes';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from './textFlowService';
import {
  navigateTextFlowBlockBoundary,
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
} = {}) {
  const onChange = vi.fn();
  function Fixture() {
    const targets = useRef(new Map<string, TextFlowNavigationTarget>());
    const [focusRevision, setFocusRevision] = useState(0);
    return <div data-synthetic-focus-revision={focusRevision}>{blocks.map((entry) => {
      const noop = () => undefined;
      const props: ComponentProps<typeof BlockEditorLayer> = {
        block: entry, contentReadOnly: options.disabled || options.readOnlyIds?.includes(entry.id) || false,
        text: entry.plain_text || '', annotations: [], selectedAnnotationIds: [],
        layout: { x: 0, y: 0, width: 320, height: 72, surface: 'formal_page' },
        blockControlAnchor: null, affiliationOutline: null, layoutMode: false, pageOffsetX: 0,
        saving: false, active: true, autoFocus: false,
        onFocused: options.rerenderOnFocus ? () => setFocusRevision((current) => current + 1) : noop,
        onFocusReleased: noop,
        onAnnotationSelect: noop, onAnnotationContextMenu: noop, onAnnotationStackSelect: noop,
        onTextUnitSelection: noop, onTextUnitContextMenu: noop, onBlockContextMenu: noop,
        onTextChange: onChange, onTextFlowChange: onChange, onFieldDraftChange: noop,
        onSave: vi.fn().mockResolvedValue({ status: 'saved' }), onTrash: noop, onSelect: noop,
        onBeginMove: noop, onBeginResize: noop, onToggleExportRole: noop, onToggleAIVisibility: noop,
        onAnnotateBlock: noop, showBlockTypeBadge: false, showAIStatusBadge: false,
        showExportStatusBadge: false, showLabelOverlay: false, onKeyDown: noop,
        onMeasuredHeight: noop, anchorsBySourceRef: {}, sourceJumpBusy: null, onViewSource: noop,
        onBoundaryNavigate: (request) => navigateTextFlowBlockBoundary({
          visibleBlocks: blocks, fromBlockId: entry.id, request, targets: targets.current,
          disabled: options.disabled,
        }),
        onNavigationTarget: (target) => {
          if (target) targets.current.set(entry.id, target);
          else targets.current.delete(entry.id);
        },
      };
      return <BlockEditorLayer key={entry.id} {...props} />;
    })}</div>;
  }
  const view = render(<Fixture />);
  return {
    ...view, onChange,
    unit: (id: string, index = 0) => view.container.querySelector<HTMLTextAreaElement>(
      `textarea[data-text-unit-id="${id}-unit-${index}"]`,
    )!,
  };
}

describe('B6 cross-block cursor navigation', () => {
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

  it('smoke 4: follows rendered order and skips item, source projection, media and read-only blocks', () => {
    const editor = renderBlocks([
      block('z-first', 'long first text', { order_index: 90 }),
      block('item', '', { block_type: 'item_ref', content_json: { item_id: 'synthetic-item' } }),
      block('projection', 'Source projection', { source_kind: 'source_projection' }),
      block('media', 'Image caption', { block_type: 'image' }),
      block('paused', 'Read only'),
      block('a-next', 'next text content', { order_index: 1 }),
    ], { readOnlyIds: ['paused'] });
    const source = editor.unit('z-first');
    const target = editor.unit('a-next');
    act(() => { source.focus(); source.setSelectionRange(7, 7); });
    expect(fireEvent.keyDown(source, { key: 'ArrowDown' })).toBe(false);
    expect(document.activeElement).toBe(target);
    expect(target.selectionStart).toBe(7);
    expect(editor.unit('paused').readOnly).toBe(true);
    expect(editor.onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(target, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(source);
    expect(source.selectionStart).toBe(7);
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
