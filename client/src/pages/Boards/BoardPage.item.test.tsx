import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { retireItem, updateItem } from '@/pages/Notes/canvasEngine/itemRepository';
import BoardPage from './BoardPage';
import type { BoardDetail, BoardMember, BoardMemberReference } from './boardTypes';

// Only transport is replaced. BoardPage, repositories, the summary adapter and useBoard are real.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

interface FixtureItem {
  id: string;
  plain_text: string;
  item_type: string;
  topic: string;
  status: 'active' | 'retired';
  origin_note_id: string | null;
  origin_course_id: string | null;
}
const clone = <T,>(data: T) => ({ data: structuredClone(data) });
let items: FixtureItem[];
let detail: BoardDetail;

function reference(id: string): BoardMemberReference {
  const item = items.find((entry) => entry.id === id);
  if (!item) return { kind: 'item', id, title: null, note_id: null, state: 'missing',
    reason: 'reference_missing', item_status: 'missing' };
  return { kind: 'item', id, title: item.item_type, note_id: item.origin_note_id,
    state: item.status === 'active' ? 'available' : 'unavailable',
    reason: item.status === 'active' ? null : 'item_retired', item_status: item.status,
    summary: item.plain_text, item_type: item.item_type, topic: item.topic };
}

function NoteDestination() {
  const { noteId } = useParams();
  return <div>Opened origin {noteId}</div>;
}

function openBoard() {
  return render(<MemoryRouter initialEntries={['/boards/item-board']}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/boards/:boardId" element={<BoardPage />} />
      <Route path="/notes/:noteId" element={<NoteDestination />} />
    </Routes>
  </MemoryRouter>);
}

async function mount(title: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'Add notes and items' }));
  const picker = await screen.findByRole('complementary', { name: 'Add projections' });
  const itemGroup = await within(picker).findByRole('region', { name: 'Items' });
  fireEvent.click(await within(itemGroup).findByRole('button', { name: `Add ${title} to board` }));
  const card = await screen.findByRole('article', { name: title });
  await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
  fireEvent.click(within(picker).getByRole('button', { name: 'Close note picker' }));
  return card;
}

function seedItem(overrides: Partial<BoardMember> = {}) {
  const member: BoardMember = {
    id: 'saved-item-projection', board_id: detail.board.id, member_kind: 'item', member_id: 'standalone',
    x: 80, y: 70, w: 260, h: 156, scale: 1, z_index: 1, pinned: false,
    metadata: {}, created_at: '2026-09-10', updated_at: '2026-09-10', reference: reference('standalone'),
    ...overrides,
  };
  detail.members.push(member);
  return member;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId || 0;
    }
  });
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: () => {} },
    releasePointerCapture: { configurable: true, value: () => {} },
    hasPointerCapture: { configurable: true, value: () => false },
  });
  items = [
    { id: 'standalone', plain_text: 'Current standalone body.', item_type: 'Claim', topic: 'Mechanics',
      status: 'active', origin_note_id: null, origin_course_id: null },
    { id: 'from-note', plain_text: 'Current body from an origin note.', item_type: 'Observation', topic: 'Fieldwork',
      status: 'active', origin_note_id: 'origin-note', origin_course_id: 'project' },
  ];
  detail = {
    board: { id: 'item-board', user_id: 'fixture-user', title: 'Item board', soul_id: 'soul', project_id: null,
      identity_item_id: null, identity_description: null,
      viewport: { x: 0, y: 0, zoom: 1 }, created_at: '2026-09-09', updated_at: '2026-09-09' },
    members: [], edges: [], visuals: [],
  };
  http.get.mockImplementation(async (url: string) => {
    if (url === '/boards/item-board/viewport-bookmarks') return clone({ bookmarks: [] });
    if (url === '/courses') return clone([{ id: 'project', name: 'Fieldwork' }]);
    if (url === '/items') return clone(items.filter((item) => item.status === 'active'));
    if (url === '/notes') return clone([{ id: 'origin-note', course_id: 'project', title: 'Origin note', status: 'active' }]);
    if (url === '/content-groups') return clone([]);
    if (url === '/boards/item-board') return clone({ ...detail,
      members: detail.members.map((member) => ({ ...member, reference: reference(member.member_id) })) });
    throw new Error(`Unexpected fixture GET ${url}`);
  });
  http.post.mockImplementation(async (url: string, input: Record<string, unknown>) => {
    if (url === '/boards/item-board/members') {
      const member: BoardMember = { x: 0, y: 0, w: 260, h: 156, scale: 1, z_index: 0, pinned: false,
        ...input, id: String(input.id), member_kind: 'item', member_id: String(input.member_id),
        board_id: detail.board.id, metadata: {}, created_at: '2026-09-09', updated_at: '2026-09-09',
        reference: reference(String(input.member_id)) };
      detail.members.push(member);
      return clone({ member, created: true });
    }
    if (url === '/items/standalone/retire') {
      items[0].status = 'retired';
      return clone(items[0]);
    }
    throw new Error(`Unexpected fixture POST ${url}`);
  });
  http.put.mockImplementation(async (url: string, input: { plain_text: string }) => {
    if (url !== '/items/standalone') throw new Error(`Unexpected fixture PUT ${url}`);
    items[0].plain_text = input.plain_text;
    return clone(items[0]);
  });
  http.patch.mockImplementation(async (url: string, input: Partial<BoardMember>) => {
    const member = detail.members.find((entry) => url === `/boards/item-board/members/${entry.id}`);
    if (!member) throw new Error(`Unexpected fixture PATCH ${url}`);
    Object.assign(member, input);
    return clone({ member });
  });
});

describe('V13.4 item projection smoke', () => {
  it('resizes an item projection at board zoom, retains its minimum size and rereads saved geometry', async () => {
    detail.board.viewport.zoom = 2;
    const view = openBoard();
    const card = await mount('Claim');
    const memberId = detail.members[0].id;
    const surface = screen.getByTestId('board-surface');
    const resize = within(card).getByRole('button', { name: 'Resize Claim' });
    const pointer = { pointerId: 1, button: 0, buttons: 1 };
    fireEvent.pointerDown(resize, { ...pointer, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(surface, { ...pointer, clientX: 320, clientY: 280 });
    fireEvent.pointerUp(surface, { ...pointer, clientX: 320, clientY: 280 });
    await waitFor(() => expect(detail.members[0]).toMatchObject({ w: 320, h: 196 }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
    expect(card.style.width).toBe('320px');
    expect(card.style.height).toBe('196px');
    fireEvent.pointerDown(resize, { ...pointer, clientX: 320, clientY: 280 });
    fireEvent.pointerMove(surface, { ...pointer, clientX: -1000, clientY: -1000 });
    fireEvent.pointerUp(surface, { ...pointer, clientX: -1000, clientY: -1000 });
    await waitFor(() => expect(detail.members[0]).toMatchObject({ w: 160, h: 100 }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
    expect(http.patch.mock.calls.map(([, input]) => input)).toEqual([
      { w: 320, h: 196 }, { w: 160, h: 100 },
    ]);
    view.unmount();
    openBoard();
    const reopened = await screen.findByTestId(`board-member-${memberId}`);
    expect(reopened.style.width).toBe('160px');
    expect(reopened.style.height).toBe('100px');
    expect(within(reopened).getByRole('button', { name: 'Resize Claim' })).toBeTruthy();
  });

  it('mounts through the item picker, shows current body and rereads it on reopening without copying membership content', async () => {
    const view = openBoard();
    const card = await mount('Claim');
    expect(within(card).getByText('Current standalone body.')).toBeTruthy();
    expect(within(card).queryByText('Active')).toBeNull();
    expect(within(card).getByRole('button', { name: 'Reference details' })).toBeTruthy();
    const input = http.post.mock.calls.find(([url]) => url.endsWith('/members'))![1];
    expect(input.member_kind).toBe('item');
    expect(input.member_id).toBe('standalone');
    expect(input).not.toHaveProperty('plain_text');
    expect(input).not.toHaveProperty('summary');
    const memberId = detail.members[0].id;
    await updateItem('standalone', { plain_text: 'Revised item body.' });
    view.unmount();
    openBoard();
    expect(await screen.findByText('Revised item body.')).toBeTruthy();
    expect(screen.getByTestId(`board-member-${memberId}`)).toBeTruthy();
  });

  it('retirement and missing identity keep the same projection as a visibly degraded card on the next GET', async () => {
    let view = openBoard();
    await mount('Claim');
    const memberId = detail.members[0].id;
    await retireItem('standalone');
    view.unmount();
    view = openBoard();
    let card = await screen.findByTestId(`board-member-${memberId}`);
    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(within(card).getByText('Current standalone body.')).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'Reference details' }));
    expect(within(card).getByText(/This item is retired/)).toBeTruthy();
    items = items.filter((item) => item.id !== 'standalone');
    view.unmount();
    openBoard();
    card = await screen.findByTestId(`board-member-${memberId}`);
    expect(within(card).getByRole('button', { name: 'Reference details' }).getAttribute('data-reference-health')).toBe('lost');
    expect(within(card).getByText('This content is no longer available.')).toBeTruthy();
  });

  it('disables standalone double-click with a title hint and opens the origin note for a linked item', async () => {
    openBoard();
    const standalone = await mount('Claim');
    expect(standalone.title).toBe('This item has no origin note. Double-click is unavailable.');
    fireEvent.doubleClick(standalone);
    expect(screen.queryByText(/Opened origin/)).toBeNull();
    fireEvent.focus(standalone);
    expect((screen.getByRole('button', { name: 'Enter note' }) as HTMLButtonElement).disabled).toBe(true);
    const linked = await mount('Observation');
    fireEvent.doubleClick(linked);
    expect(await screen.findByText('Opened origin origin-note')).toBeTruthy();
  });
});

describe('V13.5 item resize command smoke', () => {
  it.each([
    { zoom: 0.5, scale: 2, w: 380, h: 246 },
    { zoom: 2, scale: 1.5, w: 300, h: 186 },
  ])('resizes at zoom $zoom and projection scale $scale as one undoable command and refreshes its final geometry', async ({ zoom, scale, w, h }) => {
    detail.board.viewport.zoom = zoom;
    const original = structuredClone(seedItem({ scale }));
    const view = openBoard();
    const card = await screen.findByTestId(`board-member-${original.id}`);
    const surface = screen.getByTestId('board-surface');
    const resize = within(card).getByRole('button', { name: 'Resize Claim' });
    const undo = screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement;
    const redo = screen.getByRole('button', { name: 'Redo board action' }) as HTMLButtonElement;
    const pointer = { pointerId: 11, button: 0, buttons: 1 };
    expect(undo.disabled).toBe(true);
    fireEvent.pointerDown(resize, { ...pointer, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(surface, { ...pointer, clientX: 260, clientY: 230 });
    fireEvent.pointerMove(surface, { ...pointer, clientX: 320, clientY: 290 });
    expect(card.style.width).toBe(`${w}px`);
    expect(card.style.height).toBe(`${h}px`);
    expect(card.style.transform).toBe(`scale(${scale})`);
    expect(http.patch).not.toHaveBeenCalled();
    expect(detail.members[0]).toEqual(original);
    fireEvent.pointerUp(surface, { ...pointer, clientX: 320, clientY: 290 });
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
    expect(detail.members[0]).toEqual({ ...original, w, h });
    expect(http.patch.mock.calls.map(([, input]) => input)).toEqual([{ w, h }]);
    expect(within(card).getByText('Current standalone body.')).toBeTruthy();
    expect(undo.disabled).toBe(false);
    fireEvent.click(undo);
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
    expect(detail.members[0]).toEqual(original);
    expect(card.style.width).toBe('260px');
    expect(card.style.height).toBe('156px');
    expect(undo.disabled).toBe(true);
    expect(redo.disabled).toBe(false);
    fireEvent.click(redo);
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
    expect(detail.members[0]).toEqual({ ...original, w, h });
    expect(http.patch.mock.calls.map(([, input]) => input)).toEqual([
      { w, h }, { w: 260, h: 156 }, { w, h },
    ]);
    expect(redo.disabled).toBe(true);
    view.unmount();
    openBoard();
    const reopened = await screen.findByTestId(`board-member-${original.id}`);
    expect(reopened.style.width).toBe(`${w}px`);
    expect(reopened.style.height).toBe(`${h}px`);
    expect(reopened.style.transform).toBe(`scale(${scale})`);
    expect(within(reopened).getByRole('button', { name: 'Resize Claim' })).toBeTruthy();
    expect(within(reopened).getByText('Current standalone body.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement).disabled).toBe(true);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('discards a cancelled item resize without persisting geometry or adding a command', async () => {
    const original = structuredClone(seedItem());
    openBoard();
    const card = await screen.findByTestId(`board-member-${original.id}`);
    const surface = screen.getByTestId('board-surface');
    const pointer = { pointerId: 12, button: 0, buttons: 1 };
    fireEvent.pointerDown(within(card).getByRole('button', { name: 'Resize Claim' }),
      { ...pointer, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(surface, { ...pointer, clientX: 320, clientY: 290 });
    expect(card.style.width).toBe('380px');
    expect(card.style.height).toBe('246px');
    fireEvent.pointerCancel(surface, pointer);
    fireEvent.pointerUp(surface, { ...pointer, clientX: 320, clientY: 290 });
    expect(card.style.width).toBe('260px');
    expect(card.style.height).toBe('156px');
    expect(detail.members[0]).toEqual(original);
    expect(http.patch).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Redo board action' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps a pinned item fixed with no resize handle or enabled projection scale controls', async () => {
    const original = structuredClone(seedItem({ pinned: true, scale: 1.5 }));
    openBoard();
    const card = await screen.findByTestId(`board-member-${original.id}`);
    expect(within(card).queryByRole('button', { name: 'Resize Claim' })).toBeNull();
    fireEvent.focus(card);
    expect((screen.getByRole('button', { name: 'Shrink projection' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Enlarge projection' }) as HTMLButtonElement).disabled).toBe(true);
    const surface = screen.getByTestId('board-surface');
    const pointer = { pointerId: 13, button: 0, buttons: 1 };
    fireEvent.pointerDown(card, { ...pointer, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(surface, { ...pointer, clientX: 320, clientY: 290 });
    fireEvent.pointerUp(surface, { ...pointer, clientX: 320, clientY: 290 });
    expect(card.style.width).toBe('260px');
    expect(card.style.height).toBe('156px');
    expect(detail.members[0]).toEqual(original);
    expect(http.patch).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
