import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaginatedTextBlockProjection, type PaginatedTextBlockProjectionProps } from './PaginatedTextBlockProjection';
import { createTextBlockContentV1 } from '../textFlowService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import type { PositionedPageFlowFragment } from '../paginationEditingService';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { useTextFlowHistory, type TextFlowHistoryHost } from '../hooks/useTextFlowHistory';
import { usePlacementHistory } from '../hooks/usePlacementHistory';
import { useBlockDraftAuthority } from '../hooks/useBlockDraftAuthority';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import { TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { DocumentTextFlowSelectionContext, useDocumentTextFlowSelection } from '../hooks/useDocumentTextFlowSelection';
import { navigateTextFlowBlockBoundary, type TextFlowNavigationTarget } from '../textFlowBlockNavigation';
import { measureTextareaNavigation, textareaBoundaryCaret } from '../textareaNavigation';

// DOM layout remains a real-browser acceptance responsibility. Here the mirror
// reports one line per fragment, exercising event routing and canonical offsets.
vi.mock('../textareaNavigation', async (original) => ({
  ...await original<typeof import('../textareaNavigation')>(),
  measureTextareaNavigation: vi.fn((_node: HTMLTextAreaElement, offset: number) => ({ x: offset * 8, y: 0, lineHeight: 22, atFirstLine: true, atLastLine: true })),
  textareaBoundaryCaret: vi.fn((node: HTMLTextAreaElement, _edge: string, x: number) => ({ offset: Math.min(node.value.length, Math.round(x / 8)), y: 0 })),
  textareaCaretAtPoint: vi.fn((_node: HTMLTextAreaElement, x: number) => ({ offset: x / 8, y: 0 })),
}));
afterEach(cleanup);

function fragments(flow: TextBlockContentV1): PositionedPageFlowFragment[] {
  let global = 0;
  const result: PositionedPageFlowFragment[] = [];
  for (const unit of flow.units) {
    for (let start = 0; start < Math.max(1, unit.text.length); start += 4) {
      const end = Math.min(unit.text.length, start + 4), index = result.length;
      result.push({ id: `b@f${index}`, blockId: 'b', frameId: `f${index}`, startFrameId: 'f0', fragmentIndex: index, isFirst: index === 0, isLast: false,
        left: 0, top: index * 100, textRange: { start: global + start, end: global + end }, lineRange: { start: index, end: index + 1 },
        layout: { x: 0, y: 0, width: 220, height: 44, surface: 'formal_page' },
        lines: [{ startOffset: global + start, endOffset: global + end, heightPx: 28, lineHeightPx: 22, widthPx: 32 }] });
    }
    global += unit.text.length + 1;
  }
  result[result.length - 1].isLast = true;
  return result;
}
function subject(initialText = '甲乙丙丁戊己庚辛', overrides: Partial<PaginatedTextBlockProjectionProps> = {}, initialFlow?: TextBlockContentV1) {
  const onFlow = vi.fn(), onKeyDown = vi.fn(), onBoundary = vi.fn();
  let current = initialFlow ?? createTextBlockContentV1(initialText);
  let setExternal: ((flow: TextBlockContentV1) => void) | undefined;
  function Editor() {
    const [flow, setFlow] = useState(current); current = flow; setExternal = setFlow;
    return <PaginatedTextBlockProjection blockId="b" readOnly={false} text={flow.units.map((unit) => unit.text).join('\n')} textFlow={flow}
      fragments={fragments(flow)} typography={DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE} presentationKind="paragraph" annotations={[]} selectedAnnotationIds={[]}
      showLabelOverlay={false} textareaRef={null} onFocused={vi.fn()} onAnnotationSelect={vi.fn()} onAnnotationContextMenu={vi.fn()}
      onTextUnitSelection={vi.fn()} onTextUnitContextMenu={vi.fn()} onTextChange={vi.fn()} onTextFlowChange={(next, edit, previous) => { onFlow(next, edit, previous); setFlow(next); }}
      onTextEditBoundary={onBoundary} onSave={vi.fn().mockResolvedValue({ status: 'saved' })} onKeyDown={onKeyDown} {...overrides} />;
  }
  const view = render(<Editor />);
  return { ...view, onFlow, onBoundary, onKeyDown, flow: () => current, reset: (value: TextBlockContentV1) => act(() => setExternal!(value)),
    nodes: () => [...view.container.querySelectorAll('textarea')], text: () => current.units.map((unit) => unit.text).join('\n') };
}
function focus(node: HTMLTextAreaElement, start: number, end = start) { act(() => { node.focus(); node.setSelectionRange(start, end); }); fireEvent.select(node); }

describe('A4 paginated heading input requests', () => {
  it('recognizes a heading marker typed after an existing hard newline', () => {
    const onHeadingStructure = vi.fn();
    const editor = subject('Body\n##', { onHeadingStructure });
    const node = editor.nodes()[1];
    fireEvent.change(node, { target: { value: '\n## ', selectionStart: 4, selectionEnd: 4 } });
    const request = onHeadingStructure.mock.calls[0][0];
    expect(request.nextTextFlow.units.map((unit: { text: string; writing_role: string }) => [unit.text, unit.writing_role]))
      .toEqual([['Body', 'paragraph'], ['', 'heading_2']]);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });
  it('normalizes both a multiline drop and local range Enter through the single structure callback', () => {
    const onHeadingStructure = vi.fn();
    const drop = subject('', { onHeadingStructure }, createTextBlockContentV1('Head', 'heading_1'));
    fireEvent.drop(drop.nodes()[0], { clientX: 8, clientY: 0,
      dataTransfer: { getData: () => JSON.stringify({ kind: 'block', block_id: 'source', text_preview: 'Alpha\nBeta' }) } });
    expect(onHeadingStructure.mock.calls[0][0].nextTextFlow.units.map((unit: { writing_role: string }) => unit.writing_role))
      .toEqual(['heading_1', 'paragraph']);
    expect(drop.onFlow).not.toHaveBeenCalled();
    drop.unmount(); onHeadingStructure.mockClear();
    const range = subject('', { onHeadingStructure }, createTextBlockContentV1('ABCDEFGH', 'heading_2'));
    const [first, second] = range.nodes(); focus(first, 2);
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onHeadingStructure).toHaveBeenCalledOnce();
    expect(onHeadingStructure.mock.calls[0][0].nextTextFlow.units.map((unit: { text: string; writing_role: string }) => [unit.text, unit.writing_role]))
      .toEqual([['AB', 'heading_2'], ['GH', 'paragraph']]);
    expect(range.onFlow).not.toHaveBeenCalled();
  });
  it('routes a heading handle to chapter movement while retaining its menu', () => {
    const onBeginHeadingMove = vi.fn();
    const editor = subject('', { onBeginHeadingMove }, createTextBlockContentV1('Head', 'heading_1'));
    const handle = editor.container.querySelector<HTMLElement>('[data-text-unit-handle]')!;
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0 });
    expect(onBeginHeadingMove).toHaveBeenCalledOnce();
    expect(editor.container.querySelector('[data-heading-unit="true"]')).toBeTruthy();
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    fireEvent.click(handle);
    expect(editor.getByRole('menu', { name: 'Text unit' })).toBeTruthy();
  });
  it.each([1, 2, 3])('requests block isolation when the level %i marker is completed', (level) => {
    const onHeadingStructure = vi.fn();
    const editor = subject('#'.repeat(level), { onHeadingStructure });
    const node = editor.nodes()[0];
    focus(node, level);
    fireEvent.change(node, { target: { value: '#'.repeat(level) + ' ', selectionStart: level + 1, selectionEnd: level + 1 } });
    expect(onHeadingStructure).toHaveBeenCalledOnce();
    expect(onHeadingStructure.mock.calls[0][0]).toMatchObject({ headingUnitId: 'tu-1', inputType: 'insertHeading',
      nextTextFlow: { units: [{ writing_role: `heading_${level}`, text: '' }] }, focus: { unitId: 'tu-1', caret: 0 } });
    expect(editor.onFlow).not.toHaveBeenCalled();
  });
  it('hands heading Enter to the host with a new body unit and preserves the heading', () => {
    const onHeadingStructure = vi.fn();
    const editor = subject('', { onHeadingStructure }, createTextBlockContentV1('Head', 'heading_2'));
    const node = editor.nodes()[0]; focus(node, 4);
    fireEvent.keyDown(node, { key: 'Enter' });
    const request = onHeadingStructure.mock.calls[0][0];
    expect(request.inputType).toBe('insertParagraphAfterHeading');
    expect(request.nextTextFlow.units.map((unit: { writing_role: string }) => unit.writing_role)).toEqual(['heading_2', 'paragraph']);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });
  it('keeps the marker literal when the cover disables headings', () => {
    const onHeadingStructure = vi.fn();
    const editor = subject('#', { onHeadingStructure, allowHeading: false });
    fireEvent.change(editor.nodes()[0], { target: { value: '# ', selectionStart: 2, selectionEnd: 2 } });
    expect(onHeadingStructure).not.toHaveBeenCalled();
    expect(editor.flow().units[0]).toMatchObject({ text: '# ', writing_role: 'paragraph' });
  });
  it('sends every pasted heading in one request, and keeps the same paste literal on a cover', () => {
    const onHeadingStructure = vi.fn();
    const body = subject('', { onHeadingStructure });
    fireEvent.paste(body.nodes()[0], { clipboardData: { getData: () => '# One\n## Two\nBody' } });
    expect(onHeadingStructure.mock.calls[0][0].nextTextFlow.units.map((unit: { writing_role: string }) => unit.writing_role))
      .toEqual(['heading_1', 'heading_2', 'paragraph']);
    expect(body.onFlow).not.toHaveBeenCalled();
    body.unmount();
    const cover = subject('', { allowHeading: false, onHeadingStructure });
    fireEvent.paste(cover.nodes()[0], { clipboardData: { getData: () => '# One\n## Two\nBody' } });
    expect(cover.flow().units).toHaveLength(1);
    expect(cover.flow().units[0]).toMatchObject({ writing_role: 'paragraph', text: '# One\n## Two\nBody' });
    expect(onHeadingStructure).toHaveBeenCalledOnce();
  });
});

describe('A1 logical editing across rendered fragments', () => {
  it('splices typing in a continuation into the full unit and reports global history offsets', () => {
    const editor = subject(); const second = editor.nodes()[1]; focus(second, 1);
    fireEvent(second, new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: '增' }));
    fireEvent.change(second, { target: { value: '戊增己庚辛', selectionStart: 2, selectionEnd: 2 } });
    expect(editor.text()).toBe('甲乙丙丁戊增己庚辛');
    const [, edit, previous] = editor.onFlow.mock.calls[0];
    expect(edit.beforeSelection.start).toBe(5); expect(edit.afterSelection.start).toBe(6);
    expect(previous.units[0].text).toBe('甲乙丙丁戊己庚辛');
  });
  it('moves horizontally over the page seam, preserving logical unit identity', () => {
    const editor = subject(); const [first, second] = editor.nodes(); focus(first, 4);
    fireEvent.keyDown(first, { key: 'ArrowRight' }); expect(document.activeElement).toBe(second); expect(second.selectionStart).toBe(0);
    fireEvent.keyDown(second, { key: 'ArrowLeft' }); expect(document.activeElement).toBe(first); expect(first.selectionStart).toBe(4);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });
  it('moves vertically between fragments using the sticky measured column', () => {
    const editor = subject(); const [first, second] = editor.nodes(); focus(first, 2);
    fireEvent.keyDown(first, { key: 'ArrowDown' }); expect(document.activeElement).toBe(second); expect(second.selectionStart).toBe(2);
    fireEvent.keyDown(second, { key: 'ArrowUp' }); expect(document.activeElement).toBe(first); expect(first.selectionStart).toBe(2);
  });
  it('retains the upstream line affinity when Down lands at the first visual line end, so Up immediately returns across the page', () => {
    const editor = subject(); const [first, second] = editor.nodes(); focus(first, 4);
    vi.mocked(measureTextareaNavigation).mockImplementationOnce(() => ({ x: 32, y: 22, lineHeight: 22, atFirstLine: false, atLastLine: true }));
    vi.mocked(textareaBoundaryCaret).mockReturnValueOnce({ offset: 2, y: 0, nativeLineEndFrom: 1 });
    fireEvent.keyDown(first, { key: 'ArrowDown' }); expect(document.activeElement).toBe(second); expect(second.selectionStart).toBe(2);
    // Offset 2 is both the first visual line's end and the second one's start.
    // Without explicit affinity the same mirror reports atFirstLine=false.
    vi.mocked(measureTextareaNavigation).mockImplementationOnce((_node, _offset, preferredY) => ({ x: 32, y: preferredY ?? 22,
      lineHeight: 22, atFirstLine: preferredY === 0, atLastLine: preferredY !== 0 }));
    vi.mocked(textareaBoundaryCaret).mockReturnValueOnce({ offset: 4, y: 22 });
    fireEvent.keyDown(second, { key: 'ArrowUp' });
    expect(measureTextareaNavigation).toHaveBeenLastCalledWith(second, 2, 0);
    expect(document.activeElement).toBe(first); expect(first.selectionStart).toBe(4);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });
  it('copies and deletes a cross-page middle range without repeated content', () => {
    const editor = subject(); const [first, second] = editor.nodes(); focus(first, 2);
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    const setData = vi.fn(); fireEvent.copy(second, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', '丙丁戊己');
    fireEvent.keyDown(second, { key: 'Delete' }); expect(editor.text()).toBe('甲乙庚辛');
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });
  it('deletes the previous logical grapheme at a continuation start', () => {
    const editor = subject(); const second = editor.nodes()[1]; focus(second, 0);
    fireEvent.keyDown(second, { key: 'Backspace' }); expect(editor.text()).toBe('甲乙丙戊己庚辛');
    expect(editor.onFlow.mock.calls[0][1].afterSelection.start).toBe(3);
  });
  it('renders a hard newline seam without a hidden row and copies the canonical break across pages', () => {
    const editor = subject('甲乙丙\n丁戊己庚'); const [first, second] = editor.nodes();
    expect(first.value).toBe('甲乙丙'); expect(first.dataset.textEnd).toBe('4'); expect(first.dataset.textDisplayEnd).toBe('3');
    focus(first, 3); fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(second); expect(second.selectionStart).toBe(0);
    fireEvent.keyDown(second, { key: 'ArrowLeft' }); expect(document.activeElement).toBe(first); expect(first.selectionStart).toBe(3);
    focus(first, 1); fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    const setData = vi.fn(); fireEvent.copy(second, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', '乙丙\n丁');
    fireEvent.keyDown(second, { key: 'Delete' }); expect(editor.text()).toBe('甲戊己庚');
  });
  it.each(['Backspace', 'Delete'])('deletes the canonical hard newline with %s at either side of its page seam', (key) => {
    const editor = subject('甲乙丙\n丁戊己庚'); const [first, second] = editor.nodes();
    const node = key === 'Delete' ? first : second; focus(node, key === 'Delete' ? first.value.length : 0);
    fireEvent.keyDown(node, { key }); expect(editor.text()).toBe('甲乙丙丁戊己庚');
  });
  it('inserts at a displayed seam edge while preserving the existing logical hard break', () => {
    const editor = subject('甲乙丙\n丁戊己庚'); const first = editor.nodes()[0]; focus(first, 3);
    fireEvent(first, new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: '增' }));
    fireEvent.change(first, { target: { value: '甲乙丙增', selectionStart: 4, selectionEnd: 4 } });
    expect(editor.text()).toBe('甲乙丙增\n丁戊己庚'); expect(editor.onFlow.mock.calls[0][1].afterSelection.start).toBe(4);
  });
  it('splits Enter at the logical offset, preserving both halves outside the slice', () => {
    const editor = subject(); const second = editor.nodes()[1]; focus(second, 1);
    fireEvent.keyDown(second, { key: 'Enter' }); expect(editor.flow().units.map((unit) => unit.text)).toEqual(['甲乙丙丁戊', '己庚辛']);
  });
  it('freezes fragment mounts through composition and publishes complete logical text', () => {
    const editor = subject(); const second = editor.nodes()[1]; focus(second, 1);
    fireEvent.compositionStart(second);
    fireEvent.change(second, { target: { value: '戊中己庚辛', selectionStart: 2, selectionEnd: 2 } });
    expect(editor.nodes()).toHaveLength(2); expect(editor.nodes()[1]).toBe(second);
    fireEvent.change(second, { target: { value: '戊中文己庚辛', selectionStart: 3, selectionEnd: 3 } });
    fireEvent.compositionEnd(second);
    expect(editor.text()).toBe('甲乙丙丁戊中文己庚辛'); expect(editor.nodes()).toHaveLength(3);
    fireEvent.input(second, { target: { value: '戊中文己庚辛', selectionStart: 3, selectionEnd: 3 }, inputType: 'insertCompositionText' });
    expect(editor.text()).toBe('甲乙丙丁戊中文己庚辛');
    expect(editor.onBoundary.mock.calls.some(([reason]) => reason === 'compositionEnd')).toBe(true);
  });
  it('passes undo/redo keys to the existing owner and accepts restored full-flow snapshots', () => {
    const editor = subject(); const before = structuredClone(editor.flow()); const second = editor.nodes()[1]; focus(second, 1);
    fireEvent.paste(second, { clipboardData: { getData: () => '增', types: ['text/plain'], files: [] } });
    const after = structuredClone(editor.flow());
    fireEvent.keyDown(editor.nodes()[1], { key: 'z', ctrlKey: true }); expect(editor.onKeyDown).toHaveBeenCalled();
    editor.reset(before); expect(editor.text()).toBe('甲乙丙丁戊己庚辛'); expect(editor.nodes()).toHaveLength(2);
    editor.reset(after); expect(editor.text()).toBe('甲乙丙丁戊增己庚辛'); expect(editor.nodes()).toHaveLength(3);
    expect(editor.container.querySelectorAll('[data-text-unit-handle]')).toHaveLength(1);
  });
  it('shows each logical unit handle and annotation stamp once across its fragments', () => {
    const flow = createTextBlockContentV1('甲乙丙丁戊己庚辛');
    const editor = subject(flow.units[0].text, { showLabelOverlay: true, annotations: [{ id: 'note', note_id: 'note', canvas_id: '', raw_label: '史料',
      ranges: [{ id: 'range', target_kind: 'text_span', block_id: 'b', text_flow_id: 'textflow-b', text_unit_id: flow.units[0].id, start_offset: 1, end_offset: 7, range_text_cache: '乙丙丁戊己庚' }],
      parent_annotation_id: null, child_annotation_ids: [], visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human', status: 'active', created_at: '', updated_at: '' }] });
    expect(editor.nodes()).toHaveLength(2);
    expect(editor.container.querySelectorAll('[data-text-unit-handle]')).toHaveLength(1);
    expect(editor.container.querySelectorAll('[data-annotation-stamp]')).toHaveLength(1);
    expect(editor.container.querySelectorAll('[data-annotation-highlight-ids]')).toHaveLength(2);
  });
  it('reorders a unit onto a later page using fragment bounds without mistaking the drop for extraction', () => {
    const flow = createTextBlockContentV1('');
    flow.units = ['甲乙', '丙丁', '戊己'].map((text, index) => ({ ...flow.units[0], id: `unit-${index}`, text, order_index: index }));
    const onExtractTextUnit = vi.fn();
    const editor = subject('', { onExtractTextUnit }, flow);
    const rect = (top: number, height: number): DOMRect => ({ x: 100, y: top, left: 100, top, right: 300, bottom: top + height, width: 200, height, toJSON: () => ({}) });
    const root = editor.container.querySelector<HTMLElement>('[data-text-unit-editor]')!;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(100, 26));
    [...editor.container.querySelectorAll<HTMLElement>('[data-page-flow-fragment-id]')].forEach((row, index) => vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect(100 + index * 100, 28)));
    const handle = editor.container.querySelector<HTMLElement>('[data-text-unit-handle="unit-0"]')!;
    const pointer = (type: string, x: number, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
      Object.defineProperties(event, { pointerId: { value: 7 }, isPrimary: { value: true } }); fireEvent(handle, event);
    };
    pointer('pointerdown', 90, 110); pointer('pointermove', 180, 320);
    expect(editor.container.querySelector('[data-text-unit-drop-indicator="unit-2"]')?.getAttribute('data-drop-edge')).toBe('after');
    pointer('pointerup', 180, 320);
    expect(editor.flow().units.map((unit) => unit.id)).toEqual(['unit-1', 'unit-2', 'unit-0']);
    expect(onExtractTextUnit).not.toHaveBeenCalled(); expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });
  it('registers once per logical block and copies/deletes across a fragmented middle and the next block', () => {
    const initial = { b: createTextBlockContentV1('甲乙丙丁戊己庚辛'), c: createTextBlockContentV1('壬癸子丑寅卯辰巳') };
    const blocks: NoteBlock[] = Object.entries(initial).map(([id, flow], index) => ({ id, placement_id: `p-${id}`, display_overrides_json: {}, block_type: 'text', title: null,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, plain_text: flow.units[0].text, metadata: {}, order_index: index, source_references: [] }));
    let latest = initial;
    function Editor() {
      const [flows, setFlows] = useState(initial); latest = flows;
      const targets = useRef(new Map<string, TextFlowNavigationTarget>());
      const selection = useDocumentTextFlowSelection({ noteId: 'note', visibleBlocks: blocks,
        applyDocumentEdit: async (changes) => { setFlows((previous) => ({ ...previous, ...Object.fromEntries(changes.map((change) => [change.block.id, change.nextTextFlow])) })); return true; } });
      return <DocumentTextFlowSelectionContext.Provider value={selection}>{blocks.map((block) => {
        const flow = flows[block.id as keyof typeof flows];
        return <PaginatedTextBlockProjection key={block.id} blockId={block.id} readOnly={false} text={flow.units.map((unit) => unit.text).join('\n')} textFlow={flow}
          fragments={fragments(flow)} typography={DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE} presentationKind="paragraph" annotations={[]} selectedAnnotationIds={[]}
          showLabelOverlay={false} textareaRef={null} onFocused={vi.fn()} onAnnotationSelect={vi.fn()} onAnnotationContextMenu={vi.fn()}
          onTextUnitSelection={vi.fn()} onTextUnitContextMenu={vi.fn()} onTextChange={vi.fn()} onTextFlowChange={(next) => setFlows((previous) => ({ ...previous, [block.id]: next }))}
          onSave={vi.fn().mockResolvedValue({ status: 'saved' })} onKeyDown={vi.fn()}
          onNavigationTarget={(target) => { if (target) targets.current.set(block.id, target); else targets.current.delete(block.id); }}
          onBoundaryNavigate={(request) => navigateTextFlowBlockBoundary({ visibleBlocks: blocks, fromBlockId: block.id, targets: targets.current, request })} />;
      })}</DocumentTextFlowSelectionContext.Provider>;
    }
    const view = render(<Editor />);
    const [first, second, third] = [...view.container.querySelectorAll('textarea')]; focus(first, 2);
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(second, { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(third); expect(third.selectionStart).toBe(2);
    const setData = vi.fn(); fireEvent.copy(third, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', '丙丁戊己庚辛\n\n壬癸');
    fireEvent.keyDown(third, { key: 'Delete' });
    expect(latest.b.units[0].text).toBe('甲乙'); expect(latest.c.units[0].text).toBe('子丑寅卯辰巳');
  });
});

describe('A1 paginated projection with the production TextFlow and runtime history', () => {
  it('undoes and redoes a cross-fragment deletion through one real history entry and restores continuation caret offsets', async () => {
    const initial = createTextBlockContentV1('甲乙丙丁戊己庚辛');
    const block: NoteBlock = { id: 'b', placement_id: 'p', display_overrides_json: {}, block_type: 'text', title: null,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: initial }, plain_text: initial.units[0].text, metadata: {}, order_index: 0, source_references: [] };
    const board = createBoardTextRangeEditSession('note', async (_note, ranges) => ranges); board.hydrate([]);
    let current!: { history: ReturnType<typeof usePlacementHistory>; flow: TextBlockContentV1; redraw: () => void };
    const saved: string[] = [];
    function Editor() {
      const [, redraw] = useState(0);
      const drafts = useBlockDraftAuthority();
      const host = useRef<TextFlowHistoryHost | null>(null);
      const textHistory = useTextFlowHistory({ noteId: 'note', generation: 1, blocks: [block], annotationTruths: [],
        readAnnotationTruths: () => [], setAnnotationTruthsSnapshot: () => {}, blockTextFlowDrafts: drafts.blockTextFlowDrafts,
        setBlockTextFlowDrafts: drafts.setBlockTextFlowDrafts, setBlockTextDrafts: drafts.setBlockTextDrafts,
        captureBoardTextRanges: board.snapshot, restoreBoardTextRanges: board.restore, rebaseBoardTextRanges: board.rebase,
        saveBlock: async (_block, text) => { saved.push(text); return { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' }; },
        saveAnnotationTruthsOutcome: async () => true, history: host });
      const history = usePlacementHistory({ noteId: 'note', generation: 1, beforeHistoryBoundary: () => textHistory.boundary(),
        applyLayoutDrafts: () => {}, persistLayoutSnapshot: async () => true });
      host.current = history;
      const flow = drafts.blockTextFlowDrafts.b ?? initial;
      current = { history, flow, redraw: () => redraw((value) => value + 1) };
      return <PaginatedTextBlockProjection blockId="b" readOnly={textHistory.replaying || history.historyReplaying} text={flow.units.map((unit) => unit.text).join('\n')} textFlow={flow}
        fragments={fragments(flow)} typography={DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE} presentationKind="paragraph" annotations={[]} selectedAnnotationIds={[]}
        showLabelOverlay={false} textareaRef={null} onFocused={vi.fn()} onAnnotationSelect={vi.fn()} onAnnotationContextMenu={vi.fn()}
        onTextUnitSelection={vi.fn()} onTextUnitContextMenu={vi.fn()}
        onTextChange={(text) => { if (!textHistory.isReplaying()) drafts.setBlockTextDrafts((value) => ({ ...value, b: text })); }}
        onTextFlowChange={(next, metadata, previousTextFlow) => { void textHistory.applyEdit(block, next, { metadata, previousTextFlow }); }}
        onTextEditBoundary={textHistory.boundary}
        onSave={async (_silent, _fields, next) => textHistory.saveBlock(block, (next ?? flow).units.map((unit) => unit.text).join('\n'), { silent: true, textFlow: next ?? flow })}
        onKeyDown={vi.fn()} />;
    }
    const view = render(<Editor />);
    const nodes = () => [...view.container.querySelectorAll('textarea')];
    const [first, second] = nodes(); focus(first, 2);
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(second, { key: 'Delete' });
    await act(async () => { await current.history.whenHistoryIdle(); });
    expect(current.flow.units[0].text).toBe('甲乙庚辛'); expect(nodes()).toHaveLength(1);
    await act(async () => { fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); await current.history.whenHistoryIdle(); });
    expect(current.flow).toEqual(initial); expect(nodes()).toHaveLength(2);
    expect(nodes()[0].selectionStart).toBe(2);
    await act(async () => { expect(await current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { fireEvent.keyDown(window, { key: 'y', ctrlKey: true }); await current.history.whenHistoryIdle(); });
    expect(current.flow.units[0].text).toBe('甲乙庚辛');
    // A later continuation typing transaction must restore a unit-global caret.
    await act(async () => { await current.history.undoRuntimeHistory(); await current.history.whenHistoryIdle(); });
    const continuation = nodes()[1]; focus(continuation, 1);
    fireEvent(continuation, new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: '增' }));
    fireEvent.change(continuation, { target: { value: '戊增己庚辛', selectionStart: 2, selectionEnd: 2 } });
    await act(async () => { fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); await current.history.whenHistoryIdle(); });
    expect(current.flow).toEqual(initial); expect(document.activeElement).toBe(nodes()[1]); expect(nodes()[1].selectionStart).toBe(1);
    act(() => current.redraw());
    expect(document.activeElement).toBe(nodes()[1]); expect(nodes()[1].selectionStart).toBe(1);
    expect(saved).toContain('甲乙庚辛'); expect(saved).toContain(initial.units[0].text);
  });
});
