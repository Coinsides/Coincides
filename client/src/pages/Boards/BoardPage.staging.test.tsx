import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';
import BoardPage from './BoardPage';
import { BOARD_STAGING_MIME } from './BoardStaging';
import type { BoardDetail, BoardMember, MountBoardMemberInput, PatchBoardMemberInput } from './boardTypes';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/api')>(), default: http,
}));
// Host integration uses the real BoardPage/useBoard/repository; runtime selection/flush is tested separately.
vi.mock('./BoardNoteModal', async () => {
  const { forwardRef } = await import('react');
  return { default: forwardRef(function Modal(props: {
    stagingOpen: boolean; onClosed: () => void; onSendToStaging: (selection: BoardTextRangeSelection) => Promise<boolean>;
  }, _ref) {
    return <div role="dialog" aria-label="Open note" data-staging-open={props.stagingOpen}>
      <button onClick={() => { void props.onSendToStaging({ note_id: 'note', block_id: 'block', text_flow_id: 'flow',
        text_unit_id: 'unit', start_offset: 0, end_offset: 16, excerpt: 'Selected passage', at: '2026-09-09T12:00:00.000Z' }); }}>Send to staging</button>
      <button onClick={props.onClosed}>Close note</button>
    </div>;
  }) };
});

const at = '2026-09-09T12:00:00.000Z';
const clone = <T,>(data: T) => ({ data: structuredClone(data) });
let detail: BoardDetail;
function member(id: string, placed = true, kind: BoardMember['member_kind'] = 'item'): BoardMember {
  return { id, board_id: 'board', member_kind: kind, member_id: id, placed, mounted_actor: 'human',
    x: 10, y: 20, w: 260, h: 156, scale: 1, pinned: false, z_index: 1, metadata: {}, created_at: at, updated_at: at,
    reference: { kind, id, state: 'available', reason: null, title: kind === 'note' ? 'Source note' : 'Claim',
      note_id: 'note', summary: 'An item ready for thought.' } };
}
function openBoard() {
  return render(<MemoryRouter initialEntries={['/boards/board']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
  </MemoryRouter>);
}
async function openPicker() {
  fireEvent.click(await screen.findByRole('button', { name: 'Add notes and items' }));
  return screen.findByRole('complementary', { name: 'Add projections' });
}
async function stage(title = 'Claim') {
  const picker = await openPicker();
  fireEvent.click(await within(picker).findByRole('button', { name: `Stage ${title}` }));
  const dock = await screen.findByRole('complementary', { name: 'Staging' });
  await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
  return dock;
}
beforeEach(() => {
  vi.clearAllMocks();
  detail = { board: { id: 'board', user_id: 'synthetic', title: 'Staging board', soul_id: 'soul', project_id: null,
    identity_item_id: null, identity_description: null,
    viewport: { x: 30, y: -20, zoom: 2 }, created_at: at, updated_at: at }, members: [], edges: [], visuals: [] };
  http.get.mockImplementation(async (url: string) => {
    if (url === '/palette-colors') return { data: [] };
    if (url === '/boards/board') return clone(detail);
    if (url === '/boards/board/viewport-bookmarks') return clone({ bookmarks: [] });
    if (url === '/courses') return clone([{ id: 'project', name: 'Synthetic project' }]);
    if (url === '/notes') return clone([{ id: 'note', title: 'Source note', course_id: 'project', status: 'active' }]);
    if (url === '/items') return clone([{ id: 'item', plain_text: 'An item ready for thought.', item_type: 'Claim',
      status: 'active', origin_note_id: 'note', origin_course_id: 'project' }]);
    if (url === '/content-groups') return clone([{ id: 'group', note_id: 'note', title: 'Study group',
      status: 'active', identity: {}, members: [] }]);
    if (url === '/notes/note/blocks') return clone([]);
    throw new Error(`Unexpected synthetic GET ${url}`);
  });
  http.post.mockImplementation(async (url: string, input: MountBoardMemberInput & { text_range?: BoardTextRangeSelection }) => {
    if (url !== '/boards/board/members' && url !== '/boards/board/text-ranges') throw new Error('Unexpected synthetic mount');
    const kind = input.text_range ? 'text_range' : input.member_kind;
    const created = { ...member(input.id || 'range-member', input.placed !== false, kind), ...input,
      member_kind: kind, member_id: input.text_range ? 'range' : input.member_id };
    if (input.text_range) created.reference = { ...created.reference, kind, id: 'range', title: 'Source note',
      summary: input.text_range.excerpt, anchor_status: 'active' };
    detail.members.push(created);
    return clone({ member: created, created: true });
  });
  http.patch.mockImplementation(async (url: string, input: PatchBoardMemberInput) => {
    const current = detail.members.find(({ id }) => url === `/boards/board/members/${id}`);
    if (!current) throw new Error('Unexpected synthetic patch');
    Object.assign(current, input);
    return clone({ member: current });
  });
  http.delete.mockImplementation(async (url: string) => {
    detail.members = detail.members.filter(({ id }) => url !== `/boards/board/members/${id}`);
    return clone({ removed: true });
  });
});

describe('board staging dock', () => {
  it.each(['Claim', 'Source note', 'Study group'])('Stages %s once, leaves it off canvas and reads it back on reopening', async (title) => {
    const view = openBoard();
    expect(screen.queryByRole('complementary', { name: 'Staging' })).toBeNull();
    const dock = await stage(title);
    const id = detail.members[0].id;
    expect(within(dock).getByTestId(`staging-member-${id}`)).toBeTruthy();
    expect(screen.queryByTestId(`board-member-${id}`)).toBeNull();
    expect(screen.getByRole('button', { name: 'Staging (1)' })).toBeTruthy();
    expect(within(dock).queryByText('human')).toBeNull();
    const input = http.post.mock.calls[0][1];
    expect(input.placed).toBe(false);
    expect(input).not.toHaveProperty('x');
    expect(input).not.toHaveProperty('mounted_actor');
    view.unmount();
    openBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Staging (1)' }));
    expect(await screen.findByTestId(`staging-member-${id}`)).toBeTruthy();
    expect(screen.queryByTestId(`board-member-${id}`)).toBeNull();
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('Places at the default grid with one geometry PATCH and retains that placement on reopening', async () => {
    const view = openBoard();
    const dock = await stage();
    const id = detail.members[0].id;
    // Staged geometry is deliberately unusable and cannot become placement defaults.
    Object.assign(detail.members[0], { w: 0, h: 0, scale: 7, z_index: 99999 });
    fireEvent.click(within(dock).getByRole('button', { name: 'Place on board' }));
    const card = await screen.findByTestId(`board-member-${id}`);
    expect(http.patch).toHaveBeenCalledWith(`/boards/board/members/${id}`,
      { placed: true, x: 25, y: 45, w: 260, h: 156, scale: 1, pinned: false, z_index: 1 });
    expect(card.style.left).toBe('25px');
    expect(screen.queryByTestId(`staging-member-${id}`)).toBeNull();
    expect(http.post).toHaveBeenCalledTimes(1);
    view.unmount();
    openBoard();
    expect((await screen.findByTestId(`board-member-${id}`)).style.left).toBe('25px');
    expect(screen.getByRole('button', { name: 'Staging (0)' })).toBeTruthy();
  });

  it('drags a staging row to world coordinates without moving the board viewport', async () => {
    openBoard();
    await stage();
    const id = detail.members[0].id;
    const surface = screen.getByTestId('board-surface');
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 150, width: 1000, height: 700,
      right: 1100, bottom: 850, x: 100, y: 150, toJSON() {} });
    const transform = screen.getByTestId('board-world').style.transform;
    const data = new Map<string, string>();
    const transfer = { types: [BOARD_STAGING_MIME], effectAllowed: '', dropEffect: '',
      setData: (type: string, value: string) => data.set(type, value), getData: (type: string) => data.get(type) || '' };
    fireEvent.dragStart(screen.getByTestId(`staging-member-${id}`), { dataTransfer: transfer });
    expect(transfer.effectAllowed).toBe('copyMove');
    fireEvent.dragOver(surface, { dataTransfer: transfer });
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.assign(drop, { dataTransfer: transfer, clientX: 530, clientY: 350 });
    fireEvent(surface, drop);
    await screen.findByTestId(`board-member-${id}`);
    expect(http.patch).toHaveBeenCalledWith(`/boards/board/members/${id}`, expect.objectContaining({ placed: true, x: 200, y: 110 }));
    expect(screen.getByTestId('board-world').style.transform).toBe(transform);
  });

  it('sends a modal selection to a source-labelled staging row and keeps dock controls live while canvas keys yield', async () => {
    detail.members.push(member('note', true, 'note'));
    openBoard();
    fireEvent.doubleClick(await screen.findByTestId('board-member-note'));
    const modal = await screen.findByRole('dialog', { name: 'Open note' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Send to staging' }));
    const row = await screen.findByTestId('staging-member-range-member');
    expect(within(row).getByText('Selected passage')).toBeTruthy();
    expect(within(row).queryByText('Source note')).toBeNull();
    expect(within(row).getByRole('button', { name: 'Reference details' })).toBeTruthy();
    expect(screen.queryByTestId('board-member-range-member')).toBeNull();
    expect(modal.getAttribute('data-staging-open')).toBe('true');
    expect(http.post).toHaveBeenCalledWith('/boards/board/text-ranges', expect.objectContaining({ placed: false,
      text_range: expect.objectContaining({ excerpt: 'Selected passage' }) }));
    const transform = screen.getByTestId('board-world').style.transform;
    fireEvent.keyDown(screen.getByTestId('board-surface'), { key: 'Delete' });
    expect(http.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Staging (1)' }));
    expect(modal.getAttribute('data-staging-open')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Staging (1)' }));
    fireEvent.click(within(await screen.findByTestId('staging-member-range-member')).getByRole('button', { name: 'Place on board' }));
    await screen.findByTestId('board-member-range-member');
    expect(screen.getByTestId('board-world').style.transform).toBe(transform);
    expect(screen.getByRole('dialog', { name: 'Open note' })).toBeTruthy();
  });

  it('removes through unmount and preserves the library source', async () => {
    openBoard();
    const dock = await stage();
    const id = detail.members[0].id;
    fireEvent.click(within(dock).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByTestId(`staging-member-${id}`)).toBeNull());
    expect(http.delete).toHaveBeenCalledExactlyOnceWith(`/boards/board/members/${id}`);
    expect(screen.getByRole('button', { name: 'Stage Claim' })).toBeTruthy();
    expect(detail.members).toHaveLength(0);
  });

  it('excludes staged members and their edges from rendering, selection and Z-order', async () => {
    detail.members = [member('visible'), { ...member('waiting', false), z_index: 99999 }];
    detail.edges = [{ id: 'hidden-edge', board_id: 'board', from_member_id: 'visible', to_member_id: 'waiting', style: {}, label: null, created_at: at }];
    openBoard();
    fireEvent.focus(await screen.findByTestId('board-member-visible'));
    expect(screen.queryByTestId('board-member-waiting')).toBeNull();
    expect(screen.queryByTestId('board-edge-hidden-edge')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bring forward' }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith('/boards/board/members/visible', { z_index: 2 }));
    expect(http.delete).not.toHaveBeenCalled();
  });

  it('retains a staged row when Place or Remove fails', async () => {
    openBoard();
    const dock = await stage();
    const id = detail.members[0].id;
    http.patch.mockRejectedValueOnce(new Error('Synthetic offline failure'));
    fireEvent.click(within(dock).getByRole('button', { name: 'Place on board' }));
    await screen.findByRole('alert');
    expect(screen.getByTestId(`staging-member-${id}`)).toBeTruthy();
    expect(screen.queryByTestId(`board-member-${id}`)).toBeNull();
    await waitFor(() => expect((within(dock).getByRole('button', { name: 'Remove' }) as HTMLButtonElement).disabled).toBe(false));
    http.delete.mockRejectedValueOnce(new Error('Synthetic offline failure'));
    fireEvent.click(within(dock).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect((within(dock).getByRole('button', { name: 'Remove' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByTestId(`staging-member-${id}`)).toBeTruthy();
  });
});
