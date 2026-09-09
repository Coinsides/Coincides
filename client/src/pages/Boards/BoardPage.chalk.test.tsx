import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import type { BoardDetail, BoardMember, BoardVisual } from './boardTypes';

// Production page, useBoard and repository, with synthetic memory-only transport.
// Unknown requests throw: this test never starts or contacts an application server.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

const date = '2026-09-09T12:00:00.000Z';
const path = '/boards/chalk-board';
const response = <T,>(data: T) => ({ data: structuredClone(data) });
const noOp = () => undefined;
let detail: BoardDetail;
let sequence: number;

function seedChalk(text = 'A short board thought.', overrides: Partial<BoardVisual> = {}) {
  const visual: BoardVisual = {
    id: `chalk-${++sequence}`, board_id: detail.board.id, visual_kind: 'sticky',
    x: 120, y: 180, w: 240, h: 140, scale: 1, z_index: 7, pinned: false,
    rotation: 0, data: { text }, metadata: {}, created_at: date, updated_at: date, ...overrides,
  };
  detail.visuals.push(visual);
  return visual;
}

function openBoard() {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
  </MemoryRouter>);
}

function pointer(target: Element, phase: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number) {
  fireEvent[phase](target, { pointerId: 1, button: 0, buttons: phase === 'pointerUp' ? 0 : 1, clientX: x, clientY: y });
}

async function saved() {
  await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
}

async function draft(text: string, x = 350, y = 250) {
  const surface = await screen.findByTestId('board-surface');
  fireEvent.doubleClick(surface, { clientX: x, clientY: y });
  const editor = await screen.findByRole('textbox', { name: 'Chalk text' });
  fireEvent.change(editor, { target: { value: text } });
  return editor;
}

async function selectChalk(visual: BoardVisual) {
  const chalk = await screen.findByTestId(`board-visual-${visual.id}`);
  pointer(chalk, 'pointerDown', 130, 190);
  pointer(screen.getByTestId('board-surface'), 'pointerUp', 130, 190);
  return chalk;
}

beforeEach(() => {
  vi.clearAllMocks();
  sequence = 0;
  detail = {
    board: { id: 'chalk-board', user_id: 'synthetic-chalk-user', title: 'Chalk workshop', soul_id: 'chalk-soul',
      project_id: null, viewport: { x: 0, y: 0, zoom: 1 }, created_at: date, updated_at: date },
    members: [], edges: [], visuals: [],
  };
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId || 0; }
  });
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) {
    Object.defineProperties(prototype, {
      setPointerCapture: { configurable: true, value: noOp },
      releasePointerCapture: { configurable: true, value: noOp },
      hasPointerCapture: { configurable: true, value: () => false },
    });
  }
  http.get.mockImplementation(async (url: string) => {
    if (url === path) return response(detail);
    if (url === '/courses' || url === '/items') return response([]);
    throw new Error(`Unexpected synthetic GET: ${url}`);
  });
  http.post.mockImplementation(async (url: string, input: Partial<BoardVisual>) => {
    if (url === `${path}/visuals`) {
      const visual = seedChalk('', { ...structuredClone(input), id: `chalk-${++sequence}` });
      return response({ visual });
    }
    const visual = detail.visuals.find((entry) => url === `${path}/visuals/${entry.id}/cast`);
    if (visual) {
      const item = { id: 'cast-item', status: 'active', plain_text: visual.data.text,
        item_type: null, topic: null, origin_note_id: null, origin_course_id: null,
        origin_board_id: detail.board.id };
      const member: BoardMember = {
        id: 'cast-member', board_id: detail.board.id, member_kind: 'item', member_id: item.id,
        x: visual.x, y: visual.y, w: visual.w, h: visual.h, scale: visual.scale,
        z_index: visual.z_index, pinned: visual.pinned, metadata: {}, created_at: date, updated_at: date,
        reference: { kind: 'item', id: item.id, title: 'Item', note_id: null, state: 'available', reason: null,
          summary: String(item.plain_text), item_status: 'active', item_type: null, topic: null,
          origin_board_id: detail.board.id, origin_board_title: detail.board.title },
      };
      detail.visuals = detail.visuals.filter((entry) => entry.id !== visual.id);
      detail.members.push(member);
      return response({ item, member, removed_visual_id: visual.id });
    }
    throw new Error(`Unexpected synthetic POST: ${url}`);
  });
  http.patch.mockImplementation(async (url: string, input: Partial<BoardVisual>) => {
    const visual = detail.visuals.find((entry) => url === `${path}/visuals/${entry.id}`);
    if (!visual) throw new Error(`Unexpected synthetic PATCH: ${url}`);
    Object.assign(visual, structuredClone(input));
    return response({ visual });
  });
  http.delete.mockImplementation(async (url: string) => {
    const visual = detail.visuals.find((entry) => url === `${path}/visuals/${entry.id}`);
    if (!visual) throw new Error(`Unexpected synthetic DELETE: ${url}`);
    detail.visuals = detail.visuals.filter((entry) => entry.id !== visual.id);
    return response({ visual });
  });
  http.put.mockImplementation(async (url: string) => { throw new Error(`Unexpected synthetic PUT: ${url}`); });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) {
    for (const property of ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture']) {
      Reflect.deleteProperty(prototype, property);
    }
  }
});

describe('V13.4 S9 chalk interaction smoke', () => {
  it('discards a blank ghost without a write and deletes saved chalk cleared back to a ghost', async () => {
    openBoard();
    const empty = await draft('');
    expect(empty.parentElement?.getAttribute('data-chalk-state')).toBe('ghost');
    fireEvent.change(empty, { target: { value: 'temporary' } });
    expect(empty.parentElement?.getAttribute('data-chalk-state')).toBe('filled');
    fireEvent.change(empty, { target: { value: '  ' } });
    expect(empty.parentElement?.getAttribute('data-chalk-state')).toBe('ghost');
    fireEvent.blur(empty);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull());
    expect(http.post).not.toHaveBeenCalled();
    expect(detail.visuals).toEqual([]);
    const filled = await draft('Saved thought');
    fireEvent.blur(filled);
    await waitFor(() => expect(detail.visuals).toHaveLength(1));
    await saved();
    const id = detail.visuals[0].id;
    fireEvent.doubleClick(screen.getByTestId(`board-visual-${id}`));
    const editing = screen.getByRole('textbox', { name: 'Chalk text' });
    fireEvent.change(editing, { target: { value: '' } });
    fireEvent.blur(editing);
    await waitFor(() => expect(detail.visuals).toEqual([]));
    expect(http.delete).toHaveBeenCalledWith(`${path}/visuals/${id}`);
    expect(http.patch).not.toHaveBeenCalled();
  });
  it('double-clicks blank space, saves with Enter at board coordinates and rereads chalk on reopening', async () => {
    detail.board.viewport = { x: 30, y: 50, zoom: 2 };
    const view = openBoard();
    const editor = await draft('A thought that stays on the board.', 350, 250);
    fireEvent.keyDown(editor, { key: 'Enter' });
    await waitFor(() => expect(detail.visuals).toHaveLength(1));
    await saved();
    const visual = detail.visuals[0];
    expect(visual).toMatchObject({ visual_kind: 'sticky', x: 160, y: 100,
      data: { text: 'A thought that stays on the board.' } });
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    expect(detail.members).toEqual([]);
    view.unmount();
    openBoard();
    const chalk = await screen.findByTestId(`board-visual-${visual.id}`);
    expect(chalk.textContent).toContain('A thought that stays on the board.');
    expect(chalk.style.left).toBe('160px');
    expect(chalk.style.top).toBe('100px');
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.get.mock.calls.filter(([url]) => url === path)).toHaveLength(2);
  });

  it('saves a draft on blur and discards a new draft with Escape without writing', async () => {
    openBoard();
    const editor = await draft('Save on blur.');
    fireEvent.blur(editor);
    await waitFor(() => expect(detail.visuals).toHaveLength(1));
    await saved();
    const abandoned = await draft('This stays unsaved.', 700, 450);
    fireEvent.keyDown(abandoned, { key: 'Escape' });
    fireEvent.blur(abandoned);
    await act(async () => undefined);
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    expect(detail.visuals).toHaveLength(1);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('drags, edits, pins, blocks pinned movement, unpins and deletes through the visual channel', async () => {
    const visual = seedChalk();
    openBoard();
    const chalk = await screen.findByTestId(`board-visual-${visual.id}`);
    const surface = screen.getByTestId('board-surface');
    pointer(chalk, 'pointerDown', 130, 190);
    pointer(surface, 'pointerMove', 175, 225);
    pointer(surface, 'pointerUp', 175, 225);
    await waitFor(() => expect(visual).toMatchObject({ x: 165, y: 215 }));
    await saved();
    fireEvent.doubleClick(screen.getByTestId(`board-visual-${visual.id}`));
    const editor = await screen.findByRole('textbox', { name: 'Chalk text' });
    expect((editor as HTMLTextAreaElement).value).toBe('A short board thought.');
    fireEvent.change(editor, { target: { value: 'Edited in place.' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    await waitFor(() => expect(visual.data.text).toBe('Edited in place.'));
    await saved();
    await selectChalk(visual);
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    await waitFor(() => expect(visual.pinned).toBe(true));
    await saved();
    const writesBeforePinnedDrag = http.patch.mock.calls.length;
    pointer(screen.getByTestId(`board-visual-${visual.id}`), 'pointerDown', 170, 220);
    pointer(surface, 'pointerMove', 270, 320);
    pointer(surface, 'pointerUp', 270, 320);
    await act(async () => undefined);
    expect(visual).toMatchObject({ x: 165, y: 215 });
    expect(http.patch).toHaveBeenCalledTimes(writesBeforePinnedDrag);
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    await waitFor(() => expect(visual.pinned).toBe(false));
    await saved();
    fireEvent.click(screen.getByRole('button', { name: 'Delete chalk' }));
    await waitFor(() => expect(detail.visuals).toEqual([]));
    expect(screen.queryByTestId(`board-visual-${visual.id}`)).toBeNull();
    expect(http.delete).toHaveBeenCalledWith(`${path}/visuals/${visual.id}`);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('casts through one endpoint and replaces chalk with an item at the returned geometry', async () => {
    const visual = seedChalk('This thought becomes an item.', { scale: 1.25, z_index: 12 });
    openBoard();
    await selectChalk(visual);
    fireEvent.click(screen.getByRole('button', { name: 'Cast to item' }));
    const card = await screen.findByTestId('board-member-cast-member');
    await saved();
    expect(screen.queryByTestId(`board-visual-${visual.id}`)).toBeNull();
    expect(within(card).getByText('This thought becomes an item.')).toBeTruthy();
    expect(within(card).queryByText(/Chalk workshop/)).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: 'Reference details' }));
    expect(within(card).getByText('Board chalk · Chalk workshop')).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'Close reference details' }));
    expect(card.style.left).toBe('120px');
    expect(card.style.top).toBe('180px');
    expect(card.style.transform).toBe('scale(1.25)');
    expect(card.style.zIndex).toBe('12');
    expect(card.title).toBe('This item has no origin note. Double-click is unavailable.');
    fireEvent.doubleClick(card);
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    expect(http.post.mock.calls.map(([url]) => url)).toEqual([`${path}/visuals/${visual.id}/cast`]);
    expect(http.patch).not.toHaveBeenCalled();
    expect(http.put).not.toHaveBeenCalled();
    expect(http.delete).not.toHaveBeenCalled();
  });

  it('rejects 281 characters visibly while preserving the draft and accepts 280 characters', async () => {
    openBoard();
    const editor = await draft('字'.repeat(281));
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect((await screen.findByRole('alert')).textContent).toContain('280');
    expect((screen.getByRole('textbox', { name: 'Chalk text' }) as HTMLTextAreaElement).value).toHaveLength(281);
    expect(http.post).not.toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: '字'.repeat(280) } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    await waitFor(() => expect(detail.visuals).toHaveLength(1));
    await saved();
    expect(detail.visuals[0].data.text).toBe('字'.repeat(280));
  });

  it('does not open an editor or delete chalk while casting is pending', async () => {
    const visual = seedChalk();
    openBoard();
    const chalk = await selectChalk(visual);
    const transport = http.post.getMockImplementation()!;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    http.post.mockImplementationOnce(async (...args) => { await pending; return transport(...args); });
    fireEvent.click(screen.getByRole('button', { name: 'Cast to item' }));
    await screen.findByText('Saving…');
    fireEvent.doubleClick(chalk);
    fireEvent.keyDown(screen.getByTestId('board-surface'), { key: 'Delete' });
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    expect(http.delete).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    await screen.findByTestId('board-member-cast-member');
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
  });

  it('keeps the original chalk when an over-limit edit loses focus and Delete is pressed', async () => {
    const visual = seedChalk('Keep the saved text.');
    openBoard();
    fireEvent.doubleClick(await screen.findByTestId(`board-visual-${visual.id}`));
    const editor = await screen.findByRole('textbox', { name: 'Chalk text' });
    fireEvent.change(editor, { target: { value: '字'.repeat(281) } });
    fireEvent.blur(editor);
    fireEvent.keyDown(screen.getByTestId('board-surface'), { key: 'Delete' });
    await act(async () => undefined);
    expect(http.delete).not.toHaveBeenCalled();
    expect(visual.data.text).toBe('Keep the saved text.');
    expect((screen.getByRole('textbox', { name: 'Chalk text' }) as HTMLTextAreaElement).value).toHaveLength(281);
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(await screen.findByText('Keep the saved text.')).toBeTruthy();
  });

  it('shows an unavailable birthplace on a surviving item projection after an origin is removed', async () => {
    const visual = seedChalk('The body survives its birthplace.');
    const view = openBoard();
    await selectChalk(visual);
    fireEvent.click(screen.getByRole('button', { name: 'Cast to item' }));
    await screen.findByTestId('board-member-cast-member');
    // The real FK deletion and response are covered by the isolated server test.
    detail.members[0].reference.origin_board_id = null;
    detail.members[0].reference.origin_board_title = null;
    view.unmount();
    openBoard();
    const card = await screen.findByTestId('board-member-cast-member');
    fireEvent.click(within(card).getByRole('button', { name: 'Reference details' }));
    expect(within(card).getByText('Birthplace unavailable')).toBeTruthy();
    expect(within(card).getByText('The body survives its birthplace.')).toBeTruthy();
  });

  it('keeps a failed new draft readable and retries without losing its text', async () => {
    openBoard();
    http.post.mockRejectedValueOnce({ response: { data: { error: 'Synthetic chalk save failed.' } } });
    const editor = await draft('Keep this until saved.');
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect((await screen.findByText('Chalk was not saved. Your draft is here; press Enter to retry.')).getAttribute('role')).toBe('alert');
    expect((screen.getByRole('textbox', { name: 'Chalk text' }) as HTMLTextAreaElement).value).toBe('Keep this until saved.');
    expect(detail.visuals).toEqual([]);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Chalk text' }), { key: 'Enter' });
    await waitFor(() => expect(detail.visuals).toHaveLength(1));
    expect(detail.visuals[0].data.text).toBe('Keep this until saved.');
  });

  it('preserves existing chalk and its edited draft after a rejected update', async () => {
    const visual = seedChalk('Original text.');
    openBoard();
    fireEvent.doubleClick(await screen.findByTestId(`board-visual-${visual.id}`));
    const editor = await screen.findByRole('textbox', { name: 'Chalk text' });
    fireEvent.change(editor, { target: { value: 'Pending edit.' } });
    http.patch.mockRejectedValueOnce({ response: { data: { error: 'Synthetic edit failed.' } } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect((await screen.findByText('Chalk was not saved. Your draft is here; press Enter to retry.')).getAttribute('role')).toBe('alert');
    expect(visual.data.text).toBe('Original text.');
    expect((screen.getByRole('textbox', { name: 'Chalk text' }) as HTMLTextAreaElement).value).toBe('Pending edit.');
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Chalk text' }), { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    expect((await screen.findByTestId(`board-visual-${visual.id}`)).textContent).toContain('Original text.');
  });

  it('does not draft over other visuals or with Pan, Connect or Pen selected', async () => {
    const drawing = seedChalk('', { visual_kind: 'freehand', data: { points: [{ x: 0, y: 0 }, { x: 30, y: 20 }] } });
    openBoard();
    const surface = await screen.findByTestId('board-surface');
    fireEvent.doubleClick(await screen.findByTestId(`board-visual-${drawing.id}`));
    expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    for (const name of ['Pan', 'Connect', 'Pen']) {
      fireEvent.click(screen.getByRole('button', { name }));
      fireEvent.doubleClick(surface, { clientX: 600, clientY: 400 });
      expect(screen.queryByRole('textbox', { name: 'Chalk text' })).toBeNull();
    }
    expect(http.post).not.toHaveBeenCalled();
  });

  it('keeps chalk on a failed cast and exposes the readable item-body error', async () => {
    const visual = seedChalk('   ');
    openBoard();
    await selectChalk(visual);
    http.post.mockRejectedValueOnce({ response: { data: { error: 'Item content is required' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Cast to item' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Add some text to the chalk before casting it to an item.');
    expect(screen.getByTestId(`board-visual-${visual.id}`)).toBeTruthy();
    expect(detail.visuals).toHaveLength(1);
    expect(detail.members).toEqual([]);
    expect(http.delete).not.toHaveBeenCalled();
  });
});
