import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardViewportBookmark } from '@shared/types/boardViewportBookmarks';
import BoardPage from './BoardPage';
import type { BoardDetail, BoardViewport } from './boardTypes';
import { BOARD_ID, BOARD_PATH, detail, resetSample, seedLayer, seedMember, seedVisual } from '../../../scripts/boardToolsSmoke/mockApi';

// Production BoardPage, rail, viewport animator, hook and repository; transport only is mocked.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/api')>(),
  default: http,
}));
const date = '2026-09-11T12:00:00.000Z';
const target = { x: -1357.25, y: 682.5, zoom: 0.375 };
const initial = { x: 40, y: -20, zoom: 1.25 };
const copy = <T,>(value: T): T => structuredClone(value);
const response = <T,>(data: T) => ({ data: copy(data) });
const bookmark = (id: string, name: string, viewport = target, boardId = BOARD_ID): BoardViewportBookmark => ({
  id, name, board_id: boardId, user_id: 'synthetic-user', created_at: date, ...viewport,
});
let boards: Map<string, BoardDetail>;
let entries: Map<string, BoardViewportBookmark[]>;
let frames: Map<number, FrameRequestCallback>;
let frameId: number;
let now: number;
function openBoard() {
  return render(<MemoryRouter initialEntries={[BOARD_PATH]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Link to="/boards/next-board">Open next board</Link>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
  </MemoryRouter>);
}
const world = () => screen.getByTestId('board-world');
const transform = ({ x, y, zoom }: BoardViewport) => `translate(${x}px, ${y}px) scale(${zoom})`;
async function frame(time: number) {
  now = time;
  const queued = [...frames.values()];
  frames.clear();
  await act(async () => queued.forEach((callback) => callback(time)));
}
const noSceneWrites = () => {
  expect(http.put).not.toHaveBeenCalled();
  expect(http.delete).not.toHaveBeenCalled();
  expect(http.patch.mock.calls.every(([url, input]) => url === BOARD_PATH && Object.keys(input).join() === 'viewport')).toBe(true);
  expect(http.post.mock.calls.every(([url]) => url === `${BOARD_PATH}/viewport-bookmarks`)).toBe(true);
};

beforeEach(() => {
  vi.resetAllMocks();
  resetSample();
  detail.board.viewport = copy(initial);
  const layer = seedLayer('Existing scene');
  seedMember('Existing member', { x: 65, y: 100, z_index: 8, layer_id: layer.id });
  seedVisual({ visual_kind: 'sticky', x: 220, y: 70, z_index: -2, layer_id: layer.id, data: { text: 'Existing chalk' } });
  boards = new Map([[BOARD_ID, detail]]);
  entries = new Map([[BOARD_ID, [bookmark('chapter', 'Chapter two')]]]);
  http.get.mockImplementation(async (url: string) => {
    if (url === '/palette-colors' || url === '/skin-suites') return { data: [] };
    if (url === '/courses' || url === '/items') return response([]);
    const match = /^\/boards\/([^/]+)(\/viewport-bookmarks)?$/.exec(url);
    if (!match) throw new Error(`Unexpected read: ${url}`);
    return match[2] ? response({ bookmarks: entries.get(match[1]) || [] }) : response(boards.get(match[1]));
  });
  http.patch.mockImplementation(async (url: string, input: { viewport: BoardViewport }) => {
    const boardId = url.split('/')[2];
    const saved = boards.get(boardId)!;
    Object.assign(saved.board, copy(input));
    return response({ board: saved.board });
  });
  http.post.mockImplementation(async (url: string, input: BoardViewport & { name: string }) => {
    if (!url.endsWith('/viewport-bookmarks')) throw new Error(`Unexpected write: ${url}`);
    const saved = bookmark('saved', input.name, input, url.split('/')[2]);
    entries.get(saved.board_id)!.push(saved);
    return response({ bookmark: saved });
  });
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.set(++frameId, callback); return frameId;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id); }));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('B4v BoardPage camera wiring', () => {
  it('saves the current page camera, smoothly jumps to exact x/y/zoom, and persists only viewport', async () => {
    const sceneBefore = copy({ members: detail.members, visuals: detail.visuals, edges: detail.edges, layers: detail.layers });
    openBoard();
    await screen.findByRole('button', { name: 'Go to Chapter two' });
    expect(world().style.transform).toBe(transform(initial));
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bookmark name' }), { target: { value: 'Starting point' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    await screen.findByRole('button', { name: 'Go to Starting point' });
    expect(http.post).toHaveBeenCalledExactlyOnceWith(`${BOARD_PATH}/viewport-bookmarks`, { name: 'Starting point', ...initial });
    fireEvent.click(screen.getByRole('button', { name: 'Go to Chapter two' }));
    await frame(120);
    expect(world().style.transform).not.toBe(transform(initial));
    expect(world().style.transform).not.toBe(transform(target));
    expect(http.patch).not.toHaveBeenCalled();
    await frame(240);
    await waitFor(() => expect(http.patch).toHaveBeenCalledExactlyOnceWith(BOARD_PATH, { viewport: target }));
    expect(world().style.transform).toBe(transform(target));
    expect(detail.board.viewport).toEqual(target);
    expect({ members: detail.members, visuals: detail.visuals, edges: detail.edges, layers: detail.layers }).toEqual(sceneBefore);
    noSceneWrites();
  });

  it('honors reduced motion and immediately saves the exact bookmark through the board PATCH', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    openBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Go to Chapter two' }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledExactlyOnceWith(BOARD_PATH, { viewport: target }));
    expect(world().style.transform).toBe(transform(target));
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    noSceneWrites();
  });

  it('lets wheel panning interrupt the animation and saves the user-adjusted camera', async () => {
    openBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Go to Chapter two' }));
    await frame(120);
    // At half time the quartic ease is 15/16; pan applies screen deltas to that live camera.
    const eased = 15 / 16;
    const interrupted = {
      x: initial.x + (target.x - initial.x) * eased - 30,
      y: initial.y + (target.y - initial.y) * eased + 15,
      zoom: initial.zoom + (target.zoom - initial.zoom) * eased,
    };
    fireEvent.wheel(screen.getByTestId('board-surface'), { deltaX: 30, deltaY: -15 });
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    await frame(300);
    expect(world().style.transform).toBe(transform(interrupted));
    await waitFor(() => expect(http.patch).toHaveBeenCalledExactlyOnceWith(BOARD_PATH, { viewport: interrupted }));
    expect(detail.board.viewport).toEqual(interrupted);
    noSceneWrites();
  });

  it('keeps an old board bookmark list response out of the new board after route navigation', async () => {
    const next = copy(detail);
    next.board.id = 'next-board'; next.board.title = 'Next board'; next.board.viewport = { x: 3, y: 5, zoom: 2 };
    next.members = []; next.visuals = []; next.edges = []; next.layers = [];
    boards.set('next-board', next);
    entries.set('next-board', [bookmark('next', 'New board view', { x: 90, y: 80, zoom: 0.5 }, 'next-board')]);
    let resolveOld!: (value: { data: { bookmarks: BoardViewportBookmark[] } }) => void;
    const oldResponse = new Promise<{ data: { bookmarks: BoardViewportBookmark[] } }>((resolve) => { resolveOld = resolve; });
    const read = http.get.getMockImplementation()!;
    http.get.mockImplementation((url: string) => url === `${BOARD_PATH}/viewport-bookmarks` ? oldResponse : read(url));
    openBoard();
    await screen.findByTestId('board-surface');
    fireEvent.click(screen.getByRole('link', { name: 'Open next board' }));
    await screen.findByRole('button', { name: 'Go to New board view' });
    await act(async () => resolveOld(response({ bookmarks: [bookmark('old', 'Old board view')] })));
    expect(screen.queryByRole('button', { name: 'Go to Old board view' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Go to New board view' })).toBeTruthy();
    expect(world().style.transform).toBe(transform(next.board.viewport));
    expect(http.patch).not.toHaveBeenCalled();
    noSceneWrites();
  });
});
