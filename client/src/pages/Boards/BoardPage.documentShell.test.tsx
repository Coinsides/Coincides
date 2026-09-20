import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Link, MemoryRouter, Outlet, Route, RouterProvider, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BOARD_ID, BOARD_PATH, detail, resetSample } from '../../../scripts/boardToolsSmoke/mockApi';
import { useAgentUiStore } from '@/stores/agentUiStore';
import { useDocumentTabsStore } from '@/stores/documentTabsStore';
import { AgentUiBridge } from '@/components/Layout/AgentUiBridge';
import { DocumentTabs } from '@/components/Layout/DocumentTabs';
import BoardPage from './BoardPage';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));
beforeEach(() => {
  vi.clearAllMocks(); resetSample(); useAgentUiStore.getState().reset(); useDocumentTabsStore.getState().reset();
  detail.members.push({ id: 'member', board_id: BOARD_ID, member_kind: 'note', member_id: 'paper', x: 900, y: 600, w: 240, h: 180, scale: 1, z_index: 1, pinned: false, metadata: {}, created_at: '', updated_at: '',
    reference: { kind: 'note', id: 'paper', state: 'available', reason: null, title: 'Paper', note_id: 'paper' } });
  http.get.mockImplementation(async (url: string) => {
    if (url === BOARD_PATH) return { data: structuredClone(detail) };
    if (url.endsWith('/viewport-bookmarks')) return { data: { bookmarks: [] } };
    if (['/courses', '/items', '/palette-colors', '/skin-suites'].includes(url)) return { data: [] };
    throw new Error(`Unexpected read: ${url}`);
  });
});
afterEach(cleanup);
function host() {
  render(<MemoryRouter initialEntries={[BOARD_PATH]}><DocumentTabs/><AgentUiBridge/>
    <Link to="/away">Away</Link><Link to={BOARD_PATH}>Return</Link>
    <Routes><Route path="/boards/:boardId" element={<BoardPage/>}/><Route path="/away" element={<p>Other page</p>}/></Routes>
  </MemoryRouter>);
}

it('focuses a placed member, flashes and remembers its viewport without writing board or paper truth', async () => {
  host(); await screen.findByTestId('board-world');
  const member = detail.members.find((entry) => entry.placed !== false)!;
  const before = screen.getByTestId('board-world').getAttribute('style');
  act(() => useAgentUiStore.getState().enqueue({ command_id: 'hit', turn_id: 'turn', conversation_id: 'conv',
    kind: 'focus_object', target: { type: 'board_member', board_id: BOARD_ID, member_id: member.id } }));
  await waitFor(() => expect(screen.getByTestId('board-world').getAttribute('style')).not.toBe(before));
  expect(screen.getByTestId(`board-member-${member.id}`).getAttribute('data-agent-ui-highlight')).toBe('true');
  const changed = screen.getByTestId('board-world').getAttribute('style');
  fireEvent.click(screen.getByText('Away')); await screen.findByText('Other page');
  fireEvent.click(screen.getByText('Return')); await screen.findByTestId('board-world');
  expect(screen.getByTestId('board-world').getAttribute('style')).toBe(changed);
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  for (const write of [http.post, http.put, http.patch, http.delete]) expect(write).not.toHaveBeenCalled();
});

it('holds a board focus request while the title editor owns input and delivers after blur', async () => {
  host(); await screen.findByTestId('board-world');
  fireEvent.click(screen.getByLabelText('Rename board'));
  const input = screen.getAllByRole('textbox')[0]; input.focus();
  const before = screen.getByTestId('board-world').getAttribute('style');
  const member = detail.members.find((entry) => entry.placed !== false)!;
  act(() => useAgentUiStore.getState().enqueue({ command_id: 'hit', turn_id: 'turn', conversation_id: 'conv',
    kind: 'focus_object', target: { type: 'board_member', board_id: BOARD_ID, member_id: member.id } }));
  expect(document.activeElement).toBe(input);
  expect(screen.getByTestId('board-world').getAttribute('style')).toBe(before);
  act(() => (input as HTMLElement).blur());
  await waitFor(() => expect(screen.getByTestId('board-world').getAttribute('style')).not.toBe(before));
  for (const write of [http.post, http.put, http.patch, http.delete]) expect(write).not.toHaveBeenCalled();
});

it('keeps the current tab until an already submitted board edit has finished saving', async () => {
  let resolve!: (value: { data: typeof detail }) => void;
  http.patch.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const router = createMemoryRouter([{ element: <><DocumentTabs/><Outlet/></>, children: [
    { path: '/boards/:boardId', element: <BoardPage/> }, { path: '/boards', element: <p>Board list</p> },
  ] }], { initialEntries: [BOARD_PATH] });
  render(<RouterProvider router={router}/>);
  await screen.findByTestId('board-world');
  fireEvent.click(screen.getByLabelText('Rename board'));
  fireEvent.change(screen.getByLabelText('Board name'), { target: { value: 'Saved board' } });
  fireEvent.click(screen.getByText('Save name'));
  await waitFor(() => expect(http.patch).toHaveBeenCalledExactlyOnceWith(BOARD_PATH, { title: 'Saved board' }));
  fireEvent.click(screen.getByLabelText(`关闭 ${detail.board.title}`));
  expect(router.state.location.pathname).toBe(BOARD_PATH);
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  await act(async () => resolve({ data: { ...detail, board: { ...detail.board, title: 'Saved board' } } }));
  await screen.findByText('Board list');
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
  expect(http.delete).not.toHaveBeenCalled();
});
