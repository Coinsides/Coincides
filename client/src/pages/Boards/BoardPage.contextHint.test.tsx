import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOARD_ID, BOARD_PATH, detail, resetSample } from '../../../scripts/boardToolsSmoke/mockApi';
import { selectAgentContextHint, useUIStore } from '@/stores/uiStore';
import BoardPage from './BoardPage';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));

beforeEach(() => {
  vi.clearAllMocks();
  resetSample();
  useUIStore.setState({ agentPanelOpen: false, agentContextHint: null, ambientAgentContextHint: null,
    ambientAgentContextOwner: null, ambientAgentContextDismissed: false });
  http.get.mockImplementation(async (url: string) => {
    if (url === BOARD_PATH) return { data: structuredClone(detail) };
    if (url === '/boards/board-next') return { data: { ...structuredClone(detail), board: { ...detail.board, id: 'board-next' } } };
    if (url.endsWith('/viewport-bookmarks')) return { data: { bookmarks: [] } };
    if (['/courses', '/items', '/palette-colors', '/skin-suites'].includes(url)) return { data: [] };
    throw new Error(`Unexpected read: ${url}`);
  });
});

describe('B2 production board route context', () => {
  it('registers the current board passively, preserves explicit priority and clears on leaving the route', async () => {
    render(<MemoryRouter initialEntries={[BOARD_PATH]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Link to="/boards/board-next">Next board</Link><Link to="/away">Leave board</Link>
      <Routes><Route path="/boards/:boardId" element={<BoardPage />} /><Route path="/away" element={<p>Away</p>} /></Routes>
    </MemoryRouter>);
    await screen.findByTestId('board-world');
    await waitFor(() => expect(http.get).toHaveBeenCalledWith(`${BOARD_PATH}/viewport-bookmarks`));
    await act(async () => {});
    const readsBeforeOpen = http.get.mock.calls.length;
    expect(useUIStore.getState().ambientAgentContextHint).toBeNull();
    act(() => useUIStore.getState().setAgentPanelOpen(true));
    expect(selectAgentContextHint(useUIStore.getState())).toEqual({ type: 'board_view', data: { board_id: BOARD_ID } });
    expect(http.get).toHaveBeenCalledTimes(readsBeforeOpen);
    act(() => useUIStore.getState().openAgentWithContext({ type: 'deck', data: { deck_id: 'deck-a' } }));
    fireEvent.click(screen.getByRole('link', { name: 'Next board' }));
    await waitFor(() => expect(useUIStore.getState().ambientAgentContextHint).toEqual({ type: 'board_view', data: { board_id: 'board-next' } }));
    expect(selectAgentContextHint(useUIStore.getState())?.type).toBe('deck');
    act(() => useUIStore.getState().dismissAgentContextHint());
    expect(selectAgentContextHint(useUIStore.getState())).toEqual({ type: 'board_view', data: { board_id: 'board-next' } });
    fireEvent.click(screen.getByRole('link', { name: 'Leave board' }));
    expect(screen.getByText('Away')).toBeTruthy();
    expect(useUIStore.getState().ambientAgentContextHint).toBeNull();
    for (const method of [http.post, http.put, http.patch, http.delete]) expect(method).not.toHaveBeenCalled();
  });
});
