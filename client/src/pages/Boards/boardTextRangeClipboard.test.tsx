import { useRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import type { BoardTextRangeSelection, BoardTextRangeStatus } from '@shared/types/boardTextRange';
import { useBoardReferenceClipboard } from '../Notes/canvasEngine/hooks/useBoardReferenceClipboard';
import { SelectionTypographyToolbarLayer } from '../Notes/canvasEngine/layers/SelectionTypographyToolbarLayer';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../Notes/canvasEngine/typographyProfileService';
import BoardPage from './BoardPage';
import { BOARD_TEXT_RANGE_MIME } from './boardTextRangeClipboard';
import type { BoardDetail, BoardMember, MountBoardTextRangeInput } from './boardTypes';

// Only HTTP and the native clipboard are simulated. The copy hook, toolbar,
// board component, write queue and repository all execute production code.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

const selected = {
  blockId: 'source-block', textFlowId: 'textflow-source-block', textUnitId: 'source-unit',
  startOffset: 6, endOffset: 10, text: 'alpha beta gamma',
};
const date = '2026-09-09T12:00:00.000Z';
const geometry = { x: 100, y: 80, w: 320, h: 220, scale: 1, z_index: 1, pinned: false };
let detail: BoardDetail;
let sequence = 0;
const addToast = vi.fn();

function clipboard() {
  const contents = new Map<string, string>();
  return {
    setData: (type: string, text: string) => { contents.set(type, text); },
    getData: (type: string) => contents.get(type) || '',
  };
}

function clipboardEvent(target: Node | Window, kind: 'copy' | 'paste', data: ReturnType<typeof clipboard>) {
  const event = new Event(kind, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: data });
  fireEvent(target, event);
  return event;
}

function SourceEditor() {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const copy = useBoardReferenceClipboard({
    noteId: 'source-note', surfaceRef, selection: selected, blockIds: [selected.blockId], surfaceMode: 'page',
  });
  return <div ref={surfaceRef}>
    <h1>Source note</h1>
    <textarea aria-label="Source text" defaultValue={selected.text}
      data-block-id={selected.blockId} data-text-flow-id={selected.textFlowId} data-text-unit-id={selected.textUnitId} />
    <SelectionTypographyToolbarLayer selection={{ range: selected, anchorRect: new DOMRect(100, 120, 100, 20) }}
      typographyProfile={DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE} onSaveTypographyProfile={() => undefined}
      onClose={() => undefined} onCopyBoardReference={copy} />
    <Link to="/boards/board">Go to board</Link>
  </div>;
}

function renderApp(path = '/notes/source-note') {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/notes/:noteId" element={<SourceEditor />} />
      <Route path="/boards/:boardId" element={<BoardPage />} />
    </Routes>
  </MemoryRouter>);
}

function member(reference: BoardTextRangeSelection, status: BoardTextRangeStatus = 'active'): BoardMember {
  return { ...geometry, id: `member-${++sequence}`, board_id: 'board', member_kind: 'text_range',
    member_id: `range-${sequence}`, metadata: {}, created_at: date, updated_at: date,
    reference: { kind: 'text_range', id: `range-${sequence}`, title: 'Source note', note_id: reference.note_id,
      state: status === 'active' ? 'available' : status === 'lost' ? 'missing' : 'unavailable',
      reason: status === 'active' ? null : 'source_changed', anchor_status: status,
      summary: reference.excerpt, block_id: reference.block_id },
  };
}

function copySourceSelection() {
  const textarea = screen.getByRole('textbox', { name: 'Source text' }) as HTMLTextAreaElement;
  textarea.focus();
  textarea.setSelectionRange(selected.startOffset, selected.endOffset);
  const data = clipboard();
  const event = clipboardEvent(textarea, 'copy', data);
  expect(event.defaultPrevented).toBe(true);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  sequence = 0;
  useUIStore.setState({ addToast });
  vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(date);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
  detail = {
    board: { id: 'board', title: 'Reference board', user_id: 'fixture', soul_id: 'soul', project_id: null,
      identity_item_id: null, identity_description: null,
      viewport: { x: 0, y: 0, zoom: 1 }, created_at: date, updated_at: date },
    members: [], visuals: [], edges: [],
  };
  http.get.mockImplementation(async (url: string) => {
    if (url === '/boards/board') return { data: structuredClone(detail) };
    if (url === '/courses' || url === '/items') return { data: [] };
    throw new Error(`Unmapped fixture GET ${url}`);
  });
  http.post.mockImplementation(async (url: string, input: MountBoardTextRangeInput) => {
    if (url !== '/boards/board/text-ranges') throw new Error(`Unmapped fixture POST ${url}`);
    const mounted = { ...member(input.text_range), x: input.x ?? 100, y: input.y ?? 80 };
    detail.members.push(mounted);
    return { data: { member: structuredClone(mounted) } };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (document as unknown as { execCommand?: unknown }).execCommand;
});

describe('text range copy and board paste user loop', () => {
  it('copies a native selected passage, posts its anchor on board paste, and retains the mounted card after reopening', async () => {
    const view = renderApp();
    const data = copySourceSelection();
    expect(data.getData('text/plain')).toBe('beta');
    const reference = JSON.parse(data.getData(BOARD_TEXT_RANGE_MIME));
    expect(reference).toEqual({ note_id: 'source-note', block_id: selected.blockId,
      text_flow_id: selected.textFlowId, text_unit_id: selected.textUnitId,
      start_offset: 6, end_offset: 10, excerpt: 'beta', at: date });
    fireEvent.click(screen.getByRole('link', { name: 'Go to board' }));
    const workspace = await screen.findByRole('region', { name: 'Board workspace' });
    const event = clipboardEvent(workspace, 'paste', data);
    expect(event.defaultPrevented).toBe(true);
    const card = await screen.findByRole('article', { name: 'Source note' });
    expect(within(card).getByRole('button', { name: 'Reference details' }).getAttribute('data-reference-health')).toBe('active');
    expect(within(card).getByText('beta')).toBeTruthy();
    expect(http.post).toHaveBeenCalledWith('/boards/board/text-ranges', expect.objectContaining({ text_range: reference, w: 320, h: 220 }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
    view.unmount();
    renderApp('/boards/board');
    expect(await screen.findByRole('article', { name: 'Source note' })).toBeTruthy();
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('the visible toolbar and Ctrl+C write the same structured MIME and plain-text contract', async () => {
    renderApp();
    const native = copySourceSelection();
    const sourceTextarea = screen.getByRole('textbox', { name: 'Source text' }) as HTMLTextAreaElement;
    const blur = vi.fn();
    sourceTextarea.addEventListener('blur', blur);
    // Production TextBlockProjection collapses the native range after mouseup.
    sourceTextarea.setSelectionRange(selected.endOffset, selected.endOffset);
    const toolbarData = clipboard();
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
      const active = document.activeElement as HTMLTextAreaElement;
      expect(active).toBeInstanceOf(HTMLTextAreaElement);
      expect(active.value.slice(active.selectionStart, active.selectionEnd)).toBe('beta');
      clipboardEvent(active, 'copy', toolbarData);
      return true;
    }) });
    fireEvent.click(screen.getByRole('button', { name: 'Copy as board reference' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('success', 'Board reference copied. Paste it onto a board.'));
    expect(toolbarData.getData(BOARD_TEXT_RANGE_MIME)).toBe(native.getData(BOARD_TEXT_RANGE_MIME));
    expect(toolbarData.getData('text/plain')).toBe(native.getData('text/plain'));
    expect(document.activeElement).toBe(sourceTextarea);
    expect(sourceTextarea.selectionStart).toBe(selected.endOffset);
    expect(sourceTextarea.selectionEnd).toBe(selected.endOffset);
    expect(document.querySelectorAll('textarea')).toHaveLength(1);
    expect(blur).not.toHaveBeenCalled();
  });

  it('mounts a custom web MIME ClipboardItem delivered as a typed Blob on paste', async () => {
    renderApp();
    const native = copySourceSelection();
    const raw = native.getData(BOARD_TEXT_RANGE_MIME);
    const file = new File([raw], 'board-reference', { type: `web ${BOARD_TEXT_RANGE_MIME}` });
    // jsdom lacks Blob.text; supply the browser method on this synthetic clipboard item.
    Object.defineProperty(file, 'text', { value: async () => raw });
    const data = Object.assign(clipboard(), { files: [file], types: ['text/plain', 'Files'] });
    data.setData('text/plain', 'beta');
    fireEvent.click(screen.getByRole('link', { name: 'Go to board' }));
    const workspace = await screen.findByRole('region', { name: 'Board workspace' });
    expect(clipboardEvent(workspace, 'paste', data).defaultPrevented).toBe(true);
    const card = await screen.findByRole('article', { name: 'Source note' });
    expect(within(card).getByRole('button', { name: 'Reference details' }).getAttribute('data-reference-health')).toBe('active');
    expect(within(card).getByText('beta')).toBeTruthy();
    expect(http.post).toHaveBeenCalledWith('/boards/board/text-ranges', expect.objectContaining({ text_range: JSON.parse(raw) }));
  });

  it('reads the custom ClipboardItem on paste when the browser exposes only plain text in the event', async () => {
    renderApp();
    const raw = copySourceSelection().getData(BOARD_TEXT_RANGE_MIME);
    const format = `web ${BOARD_TEXT_RANGE_MIME}`;
    const blob = new Blob([raw], { type: format });
    Object.defineProperty(blob, 'text', { value: async () => raw });
    const getType = vi.fn().mockResolvedValue(blob);
    const read = vi.fn().mockResolvedValue([{ types: [format, 'text/plain'], getType }]);
    vi.stubGlobal('navigator', { clipboard: { read } });
    const data = clipboard();
    data.setData('text/plain', 'beta');
    fireEvent.click(screen.getByRole('link', { name: 'Go to board' }));
    const workspace = await screen.findByRole('region', { name: 'Board workspace' });
    clipboardEvent(workspace, 'paste', data);
    const card = await screen.findByRole('article', { name: 'Source note' });
    expect(within(card).getByRole('button', { name: 'Reference details' }).getAttribute('data-reference-health')).toBe('active');
    expect(within(card).getByText('beta')).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(1);
    expect(getType).toHaveBeenCalledWith(format);
    expect(http.post).toHaveBeenCalledWith('/boards/board/text-ranges', expect.objectContaining({ text_range: JSON.parse(raw) }));
  });

  it('keeps ordinary text as plain text when clipboard reading has no board reference format', async () => {
    const getType = vi.fn();
    const read = vi.fn().mockResolvedValue([{ types: ['text/plain'], getType }]);
    vi.stubGlobal('navigator', { clipboard: { read } });
    renderApp('/boards/board');
    const workspace = await screen.findByRole('region', { name: 'Board workspace' });
    const data = clipboard();
    data.setData('text/plain', 'ordinary text');
    await act(async () => {
      expect(clipboardEvent(workspace, 'paste', data).defaultPrevented).toBe(false);
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(getType).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it.each(['Control', 'Meta'] as const)('%s+C copies a retained mouse-selection draft after the editor collapses its native range', async (modifier) => {
    renderApp();
    const native = copySourceSelection();
    const sourceTextarea = screen.getByRole('textbox', { name: 'Source text' }) as HTMLTextAreaElement;
    sourceTextarea.setSelectionRange(selected.endOffset, selected.endOffset);
    const data = clipboard();
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
      const target = document.activeElement as HTMLTextAreaElement;
      expect(target.value.slice(target.selectionStart, target.selectionEnd)).toBe('beta');
      clipboardEvent(target, 'copy', data);
      return true;
    }) });
    const copiedByKey = fireEvent.keyDown(sourceTextarea, {
      key: 'c', ctrlKey: modifier === 'Control', metaKey: modifier === 'Meta',
    });
    expect(copiedByKey).toBe(false);
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('success', 'Board reference copied. Paste it onto a board.'));
    expect(data.getData(BOARD_TEXT_RANGE_MIME)).toBe(native.getData(BOARD_TEXT_RANGE_MIME));
    expect(data.getData('text/plain')).toBe('beta');
    expect(sourceTextarea.selectionStart).toBe(sourceTextarea.selectionEnd);
    fireEvent.click(screen.getByRole('link', { name: 'Go to board' }));
    const workspace = await screen.findByRole('region', { name: 'Board workspace' });
    clipboardEvent(workspace, 'paste', data);
    expect(await screen.findByRole('article', { name: 'Source note' })).toBeTruthy();
  });

  it.each(['drifted', 'lost'] as const)('%s displays its last snapshot and opens the source note', async (status) => {
    detail.members.push(member({ note_id: 'source-note', block_id: selected.blockId,
      text_flow_id: selected.textFlowId, text_unit_id: selected.textUnitId,
      start_offset: 6, end_offset: 10, excerpt: 'beta', at: date }, status));
    renderApp('/boards/board');
    const card = await screen.findByRole('article', { name: 'Source note' });
    expect(within(card).getByRole('button', { name: 'Reference details' }).getAttribute('data-reference-health')).toBe(status);
    expect(within(card).getByText('beta')).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'Reference details' }));
    expect(within(card).getByText(status === 'drifted' ? /The source changed/ : /The source is unavailable/)).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'Open source note' }));
    expect(await screen.findByRole('textbox', { name: 'Source text' })).toBeTruthy();
  });

  it('leaves plain-text board paste and structured paste into the board name input to native editing', async () => {
    renderApp();
    const structured = copySourceSelection();
    fireEvent.click(screen.getByRole('link', { name: 'Go to board' }));
    const workspace = await screen.findByRole('region', { name: 'Board workspace' });
    const plain = clipboard();
    plain.setData('text/plain', 'regular clipboard text');
    expect(clipboardEvent(workspace, 'paste', plain).defaultPrevented).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Rename board' }));
    const input = screen.getByRole('textbox', { name: 'Board name' });
    expect(clipboardEvent(input, 'paste', structured).defaultPrevented).toBe(false);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('reports plain-text fallback honestly when the native clipboard does not support references', async () => {
    renderApp();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy as board reference' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('beta'));
    expect(addToast).toHaveBeenCalledWith('info', 'Copied plain text. Use Ctrl+C on the selected text to copy a board reference.');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('does not call an emitted copy event successful when the native copy command failed', async () => {
    renderApp();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
      clipboardEvent(document.activeElement as HTMLElement, 'copy', clipboard());
      return false;
    }) });
    fireEvent.click(screen.getByRole('button', { name: 'Copy as board reference' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('beta'));
    expect(addToast).toHaveBeenCalledWith('info', 'Copied plain text. Use Ctrl+C on the selected text to copy a board reference.');
    expect(addToast.mock.calls.some(([type]) => type === 'success')).toBe(false);
    expect(document.querySelectorAll('textarea')).toHaveLength(1);
  });
});
