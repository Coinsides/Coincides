import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import type { BoardDetail, BoardMember } from './boardTypes';
import { BOARD_TEXT_RANGE_MIME } from './boardTextRangeClipboard';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
const close = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<boolean>>());
vi.mock('@/services/api', () => ({ default: http }));
// This suite isolates the board host contract. The separate modal smoke mounts the real runtime.
vi.mock('./BoardNoteModal', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return { default: forwardRef(function Modal(props: {
    noteId: string; onClosed: () => void; onSwitchNote: (id: string) => void; onOpenFullPage: (id: string) => void;
  }, ref) {
    const requestClose = async (destination?: { kind: 'note' | 'page'; noteId: string }) => {
      if (!await close(props.noteId, destination)) return false;
      if (destination?.kind === 'note') props.onSwitchNote(destination.noteId);
      else if (destination?.kind === 'page') props.onOpenFullPage(destination.noteId);
      else props.onClosed();
      return true;
    };
    useImperativeHandle(ref, () => ({ requestClose }));
    return <div role="dialog" aria-label={`Open ${props.noteId}`}>
      <button onClick={() => { void requestClose(); }}>Close note</button>
      <button onClick={() => { void requestClose({ kind: 'page', noteId: props.noteId }); }}>Open full page</button>
    </div>;
  }) };
});

const date = '2026-09-09';
const clone = <T,>(data: T) => ({ data: structuredClone(data) });
let detail: BoardDetail;
let savedText: string;
function member(id: string, kind: BoardMember['member_kind'] = 'note'): BoardMember {
  return { id: `member-${id}`, board_id: 'board', member_kind: kind, member_id: id,
    x: id === 'first' ? 20 : 400, y: 50, w: 260, h: 156, scale: 1, z_index: 0, pinned: false,
    metadata: {}, created_at: date, updated_at: date,
    reference: { kind, id, state: 'available', reason: null, title: id, note_id: id } };
}
function NoteDestination() { return <div>Entered {useParams().noteId}</div>; }
function openBoard() {
  return render(<MemoryRouter initialEntries={['/boards/board']}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} />
      <Route path="/notes/:noteId" element={<NoteDestination />} /></Routes>
  </MemoryRouter>);
}
async function openFirst() {
  openBoard();
  const first = await screen.findByRole('article', { name: 'first' });
  fireEvent.focus(first);
  fireEvent.doubleClick(first);
  return screen.findByRole('dialog', { name: 'Open first' });
}

beforeEach(() => {
  vi.clearAllMocks();
  close.mockResolvedValue(true);
  savedText = 'Saved paragraph from the note.';
  detail = {
    board: { id: 'board', user_id: 'fixture', title: 'Modal board', soul_id: 'soul', project_id: null,
      identity_item_id: null, identity_description: null,
      viewport: { x: 31, y: -42, zoom: 0.8 }, created_at: date, updated_at: date },
    members: [member('first'), member('second'), member('item', 'item'), member('range', 'text_range')],
    edges: [], visuals: [],
  };
  http.get.mockImplementation(async (url: string) => {
    if (url === '/boards/board') return clone(detail);
    if (url === '/courses') return clone([{ id: 'project', name: 'Fixture project' }]);
    if (url === '/items' || url === '/content-groups') return clone([]);
    if (url === '/notes') return clone(['first', 'second'].map((id) => ({ id, title: id,
      course_id: 'project', status: 'active', description: 'Unchanged note description.' })));
    if (/^\/notes\/[^/]+\/blocks$/.test(url)) return clone([{ block_type: 'paragraph', title: null,
      content_json: { body: savedText }, plain_text: savedText, metadata: {} }]);
    throw new Error(`Unexpected fixture GET ${url}`);
  });
  for (const method of [http.post, http.put, http.patch, http.delete]) {
    method.mockRejectedValue(new Error('Unexpected board mutation'));
  }
});

describe('BoardPage note modal host', () => {
  it('closes the selection list when opening a note and keeps the same selected cards after closing it', async () => {
    openBoard();
    const first = await screen.findByRole('article', { name: 'first' });
    const second = screen.getByRole('article', { name: 'second' });
    fireEvent.focus(first);
    // The modifier click takes the production selection branch before capture.
    fireEvent(second, new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: true }));
    const controls = screen.getByRole('toolbar', { name: 'Selected projection controls' });
    expect(within(controls).getByText('2 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Selection list' }));
    const panel = await screen.findByRole('complementary', { name: 'Selection list' });
    const keys = (list: HTMLElement) => Array.from(list.querySelectorAll('[data-selection-key]'),
      (row) => row.getAttribute('data-selection-key')).sort();
    const selectedBefore = keys(panel);
    expect(selectedBefore).toEqual(['member:member-first', 'member:member-second']);
    fireEvent.pointerEnter(within(panel).getByRole('button', { name: 'first' }).closest('li')!);
    expect(first.getAttribute('data-selection-highlighted')).toBe('true');
    fireEvent.doubleClick(first);
    const dialog = await screen.findByRole('dialog', { name: 'Open first' });
    expect(screen.queryByRole('complementary', { name: 'Selection list' })).toBeNull();
    expect(within(controls).getByText('2 selected')).toBeTruthy();
    expect(first.getAttribute('data-selection-highlighted')).not.toBe('true');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close note' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect((screen.getByRole('button', { name: 'Selection list' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Selection list' }));
    expect(keys(await screen.findByRole('complementary', { name: 'Selection list' }))).toEqual(selectedBefore);
  });

  it('leaves nonempty board undo and redo stacks untouched while the note modal owns keyboard input', async () => {
    http.patch.mockImplementation(async (url: string, input: Partial<BoardMember>) => {
      const target = detail.members.find(({ id }) => url === `/boards/board/members/${id}`);
      if (!target) throw new Error('Unexpected fixture geometry target');
      Object.assign(target, input);
      return clone({ member: target });
    });
    openBoard();
    const first = await screen.findByRole('article', { name: 'first' });
    fireEvent.focus(first);
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unpin' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pin' })).toBeTruthy());
    const surface = screen.getByTestId('board-surface');
    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unpin' })).toBeTruthy());
    expect((screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Redo board action' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.doubleClick(first);
    const dialog = await screen.findByRole('dialog', { name: 'Open first' });
    const count = http.patch.mock.calls.length;
    for (const target of [surface, dialog, within(dialog).getByRole('button', { name: 'Close note' })]) {
      fireEvent.keyDown(target, { key: 'z', ctrlKey: true });
      fireEvent.keyDown(target, { key: 'y', ctrlKey: true });
      fireEvent.keyDown(target, { key: 'z', metaKey: true, shiftKey: true });
    }
    await act(async () => undefined);
    expect(http.patch).toHaveBeenCalledTimes(count);
    expect(detail.members[0].pinned).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Open first' })).toBeTruthy();
  });

  it('keeps the selected board unchanged while the New note dialog owns input and an older paste finishes', async () => {
    const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, value: function (this: HTMLDialogElement) { this.open = true; },
    });
    try {
      openBoard();
      const first = await screen.findByRole('article', { name: 'first' });
      fireEvent.focus(first);
      const surface = screen.getByTestId('board-surface');
      let finish!: (text: string) => void;
      fireEvent.paste(surface, { clipboardData: {
        getData: () => '', files: [{ type: BOARD_TEXT_RANGE_MIME, size: 200,
          text: () => new Promise<string>((resolve) => { finish = resolve; }) }],
      } });
      fireEvent.click(screen.getByRole('button', { name: 'New note' }));
      const dialog = await screen.findByRole('dialog', { name: 'New note' });
      await waitFor(() => expect((within(dialog).getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).disabled).toBe(false));
      fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'project' } });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Note title' }), { target: { value: 'Draft' } });
      for (const name of ['Create note', 'Cancel']) {
        const button = within(dialog).getByRole('button', { name });
        button.focus();
        for (const key of ['Delete', 'Enter', 'Escape']) fireEvent.keyDown(button, { key });
      }
      fireEvent.keyDown(surface, { key: 'Delete' });
      await act(async () => { finish(JSON.stringify({ note_id: 'first', block_id: 'block', text_flow_id: 'flow',
        text_unit_id: 'unit', start_offset: 0, end_offset: 5, excerpt: 'hello', at: '2026-09-09T12:00:00.000Z' })); });
      for (const method of [http.post, http.put, http.patch, http.delete]) expect(method).not.toHaveBeenCalled();
      expect(screen.getAllByRole('dialog')).toEqual([dialog]);
      expect(screen.getByRole('toolbar', { name: 'Selected projection controls' })).toBeTruthy();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('article', { name: 'first' })).toBeTruthy();
    } finally {
      if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    }
  });

  it('opens a note in place, refreshes its saved body after close and keeps Enter as navigation', async () => {
    await openFirst();
    expect(screen.getByRole('heading', { name: 'Modal board' })).toBeTruthy();
    const transform = screen.getByTestId('board-world').style.transform;
    savedText = 'Edited inside the note, with unchanged description.';
    // A refreshed stored viewport does not replace the user's current board viewport.
    detail.board.viewport = { x: 900, y: 900, zoom: 2 };
    fireEvent.click(screen.getByRole('button', { name: 'Close note' }));
    const first = screen.getByRole('article', { name: 'first' });
    await within(first).findByText(savedText);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(http.get.mock.calls.filter(([url]) => url === '/boards/board')).toHaveLength(2);
    expect(http.get).toHaveBeenCalledWith('/notes/first/blocks');
    expect(screen.getByTestId('board-world').style.transform).toBe(transform);
    fireEvent.click(screen.getByRole('button', { name: 'Enter note' }));
    expect(await screen.findByText('Entered first')).toBeTruthy();
  });

  it('yields all board keys, paste, controls and non-note gestures while keeping the note-switch target', async () => {
    await openFirst();
    const surface = screen.getByTestId('board-surface');
    const transform = screen.getByTestId('board-world').style.transform;
    const snapshot = structuredClone(detail);
    for (const key of ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape']) {
      fireEvent.keyDown(surface, { key });
    }
    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'z', metaKey: true, shiftKey: true });
    fireEvent.keyDown(surface, { key: ' ', code: 'Space' });
    fireEvent.pointerDown(surface, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(surface, { pointerId: 1 });
    fireEvent.wheel(surface, { deltaY: 200 });
    fireEvent.doubleClick(surface, { clientX: 100, clientY: 100 });
    fireEvent.doubleClick(screen.getByRole('article', { name: 'item' }));
    fireEvent.doubleClick(screen.getByRole('article', { name: 'range' }));
    for (const name of ['Pin', 'Zoom board in', 'Add notes and items', 'Boards', 'Pen', 'Enter note']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    const clipboardData = { getData: vi.fn(() => JSON.stringify({ kind: BOARD_TEXT_RANGE_MIME })), files: [] };
    fireEvent.paste(surface, { clipboardData });
    expect(clipboardData.getData).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Open first' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: 'Add projections' })).toBeNull();
    expect(screen.getByTestId('board-world').style.transform).toBe(transform);
    expect(detail).toEqual(snapshot);
    for (const method of [http.post, http.put, http.patch, http.delete]) expect(method).not.toHaveBeenCalled();
  });

  it('holds a single instance until the old note accepts closing and retains it when saving fails', async () => {
    await openFirst();
    let finish!: (success: boolean) => void;
    close.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    fireEvent.doubleClick(screen.getByRole('article', { name: 'second' }));
    expect(close).toHaveBeenLastCalledWith('first', { kind: 'note', noteId: 'second' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Open first' })).toBeTruthy();
    await act(async () => { finish(false); });
    expect(screen.getByRole('dialog', { name: 'Open first' })).toBeTruthy();
    expect(http.get.mock.calls.filter(([url]) => url === '/boards/board')).toHaveLength(1);
    fireEvent.doubleClick(screen.getByRole('article', { name: 'second' }));
    await screen.findByRole('dialog', { name: 'Open second' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(http.get).toHaveBeenCalledWith('/notes/first/blocks');
    fireEvent.click(screen.getByRole('button', { name: 'Open full page' }));
    await screen.findByText('Entered second');
    expect(close).toHaveBeenLastCalledWith('second', { kind: 'page', noteId: 'second' });
  });

  it('does not finish an older async board paste after the note runtime takes focus', async () => {
    openBoard();
    const surface = await screen.findByTestId('board-surface');
    let finish!: (text: string) => void;
    const payload = new Promise<string>((resolve) => { finish = resolve; });
    fireEvent.paste(surface, { clipboardData: {
      getData: () => '', files: [{ type: BOARD_TEXT_RANGE_MIME, size: 200, text: () => payload }],
    } });
    fireEvent.doubleClick(screen.getByRole('article', { name: 'first' }));
    await screen.findByRole('dialog', { name: 'Open first' });
    await act(async () => { finish(JSON.stringify({ note_id: 'first', block_id: 'block', text_flow_id: 'flow',
      text_unit_id: 'unit', start_offset: 0, end_offset: 5, excerpt: 'hello', at: '2026-09-09T12:00:00.000Z' })); });
    expect(http.post).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Open first' })).toBeTruthy();
  });

  it.each(['item', 'range'])('keeps the %s double-click destination when no modal is open', async (kind) => {
    openBoard();
    fireEvent.doubleClick(await screen.findByRole('article', { name: kind }));
    await waitFor(() => expect(screen.getByText(`Entered ${kind}`)).toBeTruthy());
    expect(close).not.toHaveBeenCalled();
  });
});
