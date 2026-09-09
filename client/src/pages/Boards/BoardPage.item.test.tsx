import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { retireItem, updateItem } from '@/pages/Notes/canvasEngine/itemRepository';
import BoardPage from './BoardPage';
import type { BoardDetail, BoardMember, BoardMemberReference } from './boardTypes';

// Only transport is replaced. BoardPage, repositories, the summary adapter and useBoard are real.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
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

beforeEach(() => {
  vi.clearAllMocks();
  items = [
    { id: 'standalone', plain_text: 'Current standalone body.', item_type: 'Claim', topic: 'Mechanics',
      status: 'active', origin_note_id: null, origin_course_id: null },
    { id: 'from-note', plain_text: 'Current body from an origin note.', item_type: 'Observation', topic: 'Fieldwork',
      status: 'active', origin_note_id: 'origin-note', origin_course_id: 'project' },
  ];
  detail = {
    board: { id: 'item-board', user_id: 'fixture-user', title: 'Item board', soul_id: 'soul', project_id: null,
      viewport: { x: 0, y: 0, zoom: 1 }, created_at: '2026-09-09', updated_at: '2026-09-09' },
    members: [], edges: [], visuals: [],
  };
  http.get.mockImplementation(async (url: string) => {
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
});

describe('V13.4 item projection smoke', () => {
  it('mounts through the item picker, shows current body and rereads it on reopening without copying membership content', async () => {
    const view = openBoard();
    const card = await mount('Claim');
    expect(within(card).getByText('Current standalone body.')).toBeTruthy();
    expect(within(card).getByText('Active')).toBeTruthy();
    expect(within(card).getByText('Mechanics')).toBeTruthy();
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
    expect(within(card).getByText('Retired')).toBeTruthy();
    expect(within(card).getByText('This content is currently unavailable.')).toBeTruthy();
    items = items.filter((item) => item.id !== 'standalone');
    view.unmount();
    openBoard();
    card = await screen.findByTestId(`board-member-${memberId}`);
    expect(within(card).getByText('Missing')).toBeTruthy();
    expect(within(card).getByText('This content is no longer available.')).toBeTruthy();
  });

  it('disables standalone double-click with a title hint and opens the origin note for a linked item', async () => {
    openBoard();
    const standalone = await mount('Claim');
    expect(standalone.title).toBe('This item has no origin note. Double-click is unavailable.');
    fireEvent.doubleClick(standalone);
    expect(screen.queryByText(/Opened origin/)).toBeNull();
    fireEvent.focus(standalone);
    expect((screen.getByRole('button', { name: 'Open note' }) as HTMLButtonElement).disabled).toBe(true);
    const linked = await mount('Observation');
    fireEvent.doubleClick(linked);
    expect(await screen.findByText('Opened origin origin-note')).toBeTruthy();
  });
});
