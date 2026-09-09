import { useEffect, useState } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import BoardPage from '@/pages/Boards/BoardPage';
import { subscribeBoardChanges } from '@/pages/Boards/boardEvents';
import type { Board, BoardDetail, BoardVisual, TrayRelocationResult } from '@/pages/Boards/boardTypes';
import { NoteTraySidebar } from '../layers/NoteTraySidebar';
import { buildTrayEntries } from '../trayService';
import { forgetTrayRelocation, rememberTrayRelocation } from '../trayRelocationHistory';
import { createInFlightWriteRegistry } from '../inFlightWriteRegistry';
import type { CanvasObject, CanvasPlacement, ContentMount } from '../types';
import type { NoteBlock } from '../runtimeDataTypes';
import { useTrayController } from './useTrayController';

// Only the HTTP transport is replaced. The tray UI/hook, board repository,
// route navigation, board hook and board rendering are production components.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const response = <T,>(data: T) => ({ data: clone(data) });
const date = '2026-09-08T12:00:00.000Z';
const board: Board = { id: 'cross-project-board', user_id: 'fixture', title: 'Across the library',
  soul_id: 'soul', project_id: 'other-project', viewport: { x: 0, y: 0, zoom: 1 }, created_at: date, updated_at: date };
const block: NoteBlock = { id: 'block', placement_id: 'p-block', block_type: 'paragraph', title: null,
  content_json: { body: 'A block stays in the tray' }, plain_text: 'A block stays in the tray',
  display_overrides_json: {}, metadata: {}, order_index: 0, source_references: [] };
const objectKinds = ['shape', 'image', 'table', 'visual_connector', 'content_group_projection', 'paragraph_block_projection'] as const;
const objects: CanvasObject[] = objectKinds.map((kind, index) => ({ objectId: `o-${index}`, canvasId: 'tray-source',
  kind, backing: kind === 'content_group_projection' ? 'content_group' : kind === 'paragraph_block_projection' ? 'note_block' : 'none',
  objectClass: 'pure', status: 'active' }));
const placements: CanvasPlacement[] = objects.map((object, index) => ({
  objectId: object.objectId, placementId: index === 5 ? 'p-block' : `p-${index}`, canvasId: 'tray-source',
  surface: 'tray', boundaryRole: 'outside', orderIndex: index, zIndex: index, rotation: index === 0 ? 27 : 0,
  x: index === 0 ? 120 : 0, y: index === 0 ? 48 : 0, width: index === 0 ? 96 : 0, height: index === 0 ? 60 : 0,
}));
const mounts: ContentMount[] = [
  { mountId: 'm-group', objectId: 'o-4', targetKind: 'content_group', targetId: 'group', projectionMode: 'reference', syncPolicy: 'read_through' },
  { mountId: 'm-block', objectId: 'o-5', targetKind: 'note_block', targetId: 'block', projectionMode: 'owned', syncPolicy: 'manual' },
];
const selectedIds = placements.slice(0, 5).map((placement) => placement.placementId);
const movedVisuals: BoardVisual[] = ['shape', 'image', 'table', 'connector'].map((kind, index) => ({
  id: `v-${index}`, board_id: board.id, visual_kind: kind as BoardVisual['visual_kind'],
  x: index === 0 ? 120 : 40 + (index - 1) * 320, y: index === 0 ? 48 : 40,
  w: index === 0 ? 96 : 280, h: index === 0 ? 60 : 180, rotation: index === 0 ? 27 : 0,
  scale: 1, z_index: index, pinned: false, created_at: date, updated_at: date,
  metadata: {}, data: { tray_source: { object: { metadata: JSON.stringify({ style: 'retained extension' }) },
    placement: { metadata: JSON.stringify({ nested: { untouched: true } }) }, backing_blocks: [], extensions: {
      image: { asset_id: 'synthetic-image', alt_text: 'Synthetic moved image', caption: 'Kept caption', fit: 'contain' },
      table: { data_json: JSON.stringify({ rows: [{ rowId: 'row', index: 0 }], columns: [{ columnId: 'col', index: 0 }],
        cells: [{ rowId: 'row', columnId: 'col', text: 'Preserved cell' }] }) },
      connector: { line_style: 'dashed', stroke: '#456789', stroke_width: 3, start_marker: 'none', end_marker: 'arrow' },
    } }, connector_points: { start: { x: 4, y: 9 }, end: { x: 80, y: 51 } } },
}));
const receipt: TrayRelocationResult = { board_id: board.id, batch_id: 'fixture-relocation',
  placement_ids: selectedIds, visual_ids: movedVisuals.map((visual) => visual.id), member_ids: ['member-group'], applied: true,
  geometry: { preserved_placement_ids: ['p-0'], default_grid_placement_ids: ['p-1', 'p-2', 'p-3', 'p-4'] } };
let trayRows: CanvasPlacement[];
let detail: BoardDetail;
let refreshCount: number;

function options(noteId = 'tray-source') {
  return { noteId, enabled: true, blocks: [block], objects, placements, mounts, selectedBlockId: null,
    blockLayouts: {}, collection: null, pageOffsetX: 0, refresh: vi.fn().mockResolvedValue(undefined),
    clearSelection: vi.fn(), pushHistory: vi.fn(), flushBlock: vi.fn().mockResolvedValue(true) };
}

function TrayPaper({ hostMode = 'page' }: { hostMode?: 'page' | 'modal' }) {
  const { noteId } = useParams();
  const [rows, setRows] = useState<CanvasPlacement[]>([]);
  const refresh = async () => {
    const { data } = await api.get<{ placements: CanvasPlacement[] }>(`/fixture-tray/${noteId}`);
    refreshCount += 1;
    setRows(data.placements);
  };
  const tray = useTrayController({ ...options(noteId), placements: rows, refresh, hostMode });
  useEffect(() => { void refresh(); tray.setOpen(true); }, [noteId]);
  return <NoteTraySidebar tray={tray} />;
}

beforeEach(() => {
  forgetTrayRelocation('tray-source', receipt.batch_id);
  forgetTrayRelocation('other-note', receipt.batch_id);
  trayRows = clone(placements);
  detail = { board: clone(board), members: [], edges: [], visuals: [] };
  refreshCount = 0;
  vi.clearAllMocks();
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:synthetic-tray-image');
    static revokeObjectURL = vi.fn();
  });
  http.get.mockImplementation(async (path: string) => {
    if (path === '/boards') return response({ boards: [board, { ...board, id: 'local-board', title: 'Local board', project_id: 'source-project' }] });
    if (path === `/boards/${board.id}`) return response(detail);
    if (path === '/courses') return response([]);
    if (path === '/fixture-tray/tray-source') return response({ placements: trayRows });
    if (path === '/canvas-assets/synthetic-image/blob') return { data: new Blob(['synthetic'], { type: 'image/png' }) };
    throw new Error(`Unexpected fixture read: ${path}`);
  });
  http.post.mockImplementation(async (path: string, body: unknown) => {
    if (path === `/boards/${board.id}/relocate-tray`) {
      expect(body).toEqual({ placement_ids: selectedIds });
      trayRows = trayRows.filter((placement) => !selectedIds.includes(placement.placementId));
      detail.visuals = clone(movedVisuals);
      detail.members = [{ id: 'member-group', board_id: board.id, member_kind: 'content_group', member_id: 'group',
        x: 1000, y: 40, w: 280, h: 180, scale: 1, z_index: 4, pinned: false, metadata: {}, created_at: date, updated_at: date,
        reference: { kind: 'content_group', id: 'group', state: 'available', reason: null, title: 'Collected idea', note_id: 'tray-source' } }];
      return response(receipt);
    }
    if (path === `/boards/${board.id}/relocate-tray/${receipt.batch_id}/undo`) {
      expect(body).toEqual({});
      trayRows = clone(placements);
      detail.visuals = []; detail.members = [];
      return response({ ...receipt, applied: false });
    }
    if (path === '/notes/tray-source/tray/split') return response({ note_id: 'split-note', batch_id: 'split-batch' });
    throw new Error(`Unexpected fixture mutation: ${path}`);
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('V13 S3 tray relocation', () => {
  it('offers only the four drawing kinds and an unambiguous CG mount, keeping blocks on their existing path', () => {
    expect(buildTrayEntries(objects, placements, mounts, [block]).map((entry) => entry.boardKind))
      .toEqual(['shape', 'image', 'table', 'connector', 'content_group', undefined]);
    const ambiguous = [...mounts, { ...mounts[0], mountId: 'second-mount' }];
    expect(buildTrayEntries(objects, placements, ambiguous, [block])[4].boardKind).toBeUndefined();
    const { result } = renderHook(() => useTrayController(options()));
    return act(async () => {
      expect(await result.current.relocateToBoard(['p-block'], board.id)).toBe(false);
      expect(await result.current.relocateToBoard(['p-0', 'p-block'], board.id)).toBe(false);
      expect(http.post).not.toHaveBeenCalled();
    });
  });

  it('retains the server receipt after a refresh failure and failed undo, then refreshes and notifies on successful undo', async () => {
    const input = options(); input.refresh.mockRejectedValue(new Error('Synthetic refresh failure'));
    const changed = vi.fn(); const unsubscribe = subscribeBoardChanges(changed);
    const { result } = renderHook(() => useTrayController(input));
    await act(async () => { expect(await result.current.relocateToBoard(selectedIds, board.id)).toBe(true); });
    expect(http.post).toHaveBeenCalledWith(`/boards/${board.id}/relocate-tray`, { placement_ids: selectedIds });
    expect(result.current.error).toContain('move was saved');
    expect(result.current.latestRelocation?.batch_id).toBe(receipt.batch_id);
    expect(input.refresh).toHaveBeenCalledWith([]);
    http.post.mockRejectedValueOnce(new Error('Synthetic conflict'));
    await act(async () => { expect(await result.current.undoBoardRelocation()).toBe(false); });
    expect(result.current.latestRelocation?.batch_id).toBe(receipt.batch_id);
    input.refresh.mockResolvedValue(undefined);
    await act(async () => { expect(await result.current.undoBoardRelocation()).toBe(true); });
    expect(result.current.latestRelocation).toBeNull();
    expect(changed.mock.calls).toEqual([[board.id], [board.id]]);
    expect(input.pushHistory).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('settles an in-flight relocation into its source note receipt after leaving without refreshing a different note', async () => {
    let finish!: (value: ReturnType<typeof response<TrayRelocationResult>>) => void;
    http.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const input = options();
    const { result, rerender, unmount } = renderHook((props) => useTrayController(props), { initialProps: input });
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.relocateToBoard(selectedIds, board.id); });
    rerender({ ...input, noteId: 'other-note' });
    await act(async () => { finish(response(receipt)); await pending; });
    expect(result.current.latestRelocation).toBeNull();
    expect(input.refresh).not.toHaveBeenCalled();
    unmount();
    const again = renderHook(() => useTrayController(options()));
    expect(again.result.current.latestRelocation?.batch_id).toBe(receipt.batch_id);
  });

  it('keeps modal relocation and undo registered through refresh and preserves an undo failure for close', async () => {
    const registry = createInFlightWriteRegistry();
    const input = { ...options(), hostMode: 'modal' as const, trackPendingWrite: registry.track };
    let finishWrite!: (value: ReturnType<typeof response<TrayRelocationResult>>) => void;
    let finishRefresh!: () => void;
    http.post.mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve; }));
    input.refresh.mockImplementationOnce(() => new Promise<void>((resolve) => { finishRefresh = resolve; }));
    const { result } = renderHook(() => useTrayController(input));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.relocateToBoard(selectedIds, board.id); });
    const idle = vi.fn(); const closing = registry.whenIdle().then(idle);
    await act(async () => { finishWrite(response(receipt)); });
    expect(result.current.latestRelocation?.batch_id).toBe(receipt.batch_id);
    expect(idle).not.toHaveBeenCalled();
    await act(async () => { finishRefresh(); expect(await pending).toBe(true); await closing; });
    expect(idle).toHaveBeenCalledTimes(1);
    const failure = new Error('Synthetic undo rejection');
    http.post.mockRejectedValueOnce(failure);
    await act(async () => { expect(await result.current.undoBoardRelocation()).toBe(false); });
    await expect(registry.whenIdle()).rejects.toBe(failure);
    expect(result.current.latestRelocation?.batch_id).toBe(receipt.batch_id);
    input.refresh.mockImplementationOnce(() => new Promise<void>((resolve) => { finishRefresh = resolve; }));
    act(() => { pending = result.current.undoBoardRelocation(); });
    const undoIdle = vi.fn(); const undoClose = registry.whenIdle().then(undoIdle);
    await act(async () => { await Promise.resolve(); });
    expect(undoIdle).not.toHaveBeenCalled();
    await act(async () => { finishRefresh(); expect(await pending).toBe(true); await undoClose; });
    expect(undoIdle).toHaveBeenCalledTimes(1);
    expect(result.current.latestRelocation).toBeNull();
  });

  it.each(['modal', 'page'] as const)('gates all three tray navigation destinations only in %s host mode', async (hostMode) => {
    rememberTrayRelocation('tray-source', receipt);
    const defaultGet = http.get.getMockImplementation()!;
    http.get.mockImplementation(async (path: string) => path === '/boards' ? response({ boards: [] }) : defaultGet(path));
    render(<MemoryRouter initialEntries={['/notes/tray-source']}><Routes>
      <Route path="/notes/:noteId" element={<TrayPaper hostMode={hostMode} />} />
    </Routes></MemoryRouter>);
    await screen.findByRole('checkbox', { name: 'Select shape for board' });
    const blockRow = document.querySelector('[data-tray-placement-id="p-block"]') as HTMLElement;
    fireEvent.click(within(blockRow).getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create note from selection' }));
    await screen.findByText('Open new note');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select shape for board' }));
    await screen.findByText('Create a board');
    for (const [name, href] of [['Create a board', '/boards'], ['Open board', `/boards/${board.id}`], ['Open new note', '/notes/split-note']]) {
      if (hostMode === 'modal') {
        const button = screen.getByRole('button', { name }) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        expect(button.title).toBe('Open full page to use this');
        expect(screen.queryByRole('link', { name })).toBeNull();
        fireEvent.click(button);
        expect(screen.getByLabelText('Note tray')).toBeTruthy();
      } else expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
    }
  });

  it('keeps block selection in split and distinguishes a failed board list from an empty library', async () => {
    const defaultGet = http.get.getMockImplementation()!;
    let failBoardList = true;
    http.get.mockImplementation(async (path: string) => {
      if (path === '/boards') {
        if (failBoardList) throw new Error('Synthetic board-list failure');
        return response({ boards: [] });
      }
      return defaultGet(path);
    });
    render(<MemoryRouter initialEntries={['/notes/tray-source']}><Routes>
      <Route path="/notes/:noteId" element={<TrayPaper />} />
    </Routes></MemoryRouter>);
    await screen.findByRole('checkbox', { name: 'Select shape for board' });
    const blockRow = document.querySelector('[data-tray-placement-id="p-block"]') as HTMLElement;
    fireEvent.click(within(blockRow).getByRole('checkbox'));
    expect(screen.queryByLabelText('Target board')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Create note from selection' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/notes/tray-source/tray/split', { placement_ids: ['p-block'], title: 'Untitled note' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select shape for board' }));
    expect(screen.getByLabelText('Target board')).toBeTruthy();
    expect(within(blockRow).queryByRole('checkbox', { name: /for board/ })).toBeNull();
    expect(screen.getByText('Could not load boards. Try again.')).toBeTruthy();
    expect(screen.queryByText('No boards yet.')).toBeNull();
    failBoardList = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry boards' }));
    await screen.findByRole('link', { name: 'Create a board' });
    expect(screen.queryByText('Could not load boards. Try again.')).toBeNull();
    expect((screen.getByRole('button', { name: 'Move selection to board' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('moves a mixed selection, opens the real board route, returns through its CG and undoes back into the tray', async () => {
    render(<MemoryRouter initialEntries={['/notes/tray-source']}>
      <Link to={`/boards/${board.id}`}>Review board</Link>
      <Routes><Route path="/notes/:noteId" element={<TrayPaper />} /><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
    </MemoryRouter>);
    await screen.findByRole('checkbox', { name: 'Select shape for board' });
    for (const label of ['shape', 'image', 'table', 'visual_connector', 'content_group_projection']) {
      fireEvent.click(screen.getByRole('checkbox', { name: `Select ${label} for board` }));
    }
    await screen.findByRole('option', { name: 'Across the library' });
    expect(screen.getByRole('option', { name: 'Local board' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Target board'), { target: { value: board.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Move selection to board' }));
    await screen.findByRole('button', { name: 'Undo move to board' });
    expect(screen.queryByRole('checkbox', { name: 'Select shape for board' })).toBeNull();
    expect(screen.getByText('A block stays in the tray')).toBeTruthy();
    expect(refreshCount).toBe(2);
    fireEvent.click(screen.getByRole('link', { name: 'Open board' }));
    const shape = await screen.findByTestId('board-visual-v-0');
    expect(shape.style.left).toBe('120px'); expect(shape.style.top).toBe('48px');
    expect(shape.style.width).toBe('96px'); expect(shape.style.height).toBe('60px');
    expect((within(shape).getByRole('button') as HTMLElement).style.transform).toBe('rotate(27deg)');
    expect(await screen.findByAltText('Synthetic moved image')).toBeTruthy();
    expect(screen.getByText('Preserved cell')).toBeTruthy();
    const connector = screen.getByTestId('board-visual-v-3');
    expect(connector.querySelector('path[stroke="#456789"]')?.getAttribute('d')).toBe('M 4 9 L 80 51');
    expect(connector.querySelector('path[stroke="#456789"]')?.getAttribute('stroke-dasharray')).toBe('8 5');
    expect(screen.getByTestId('board-visual-v-1').style.width).toBe('280px');
    expect(screen.getByTestId('board-visual-v-1').style.height).toBe('180px');
    expect(screen.getByTestId('board-visual-v-1').style.left).toBe('40px');
    expect(screen.getByTestId('board-visual-v-1').style.top).toBe('40px');
    fireEvent.doubleClick(screen.getByRole('article', { name: 'Collected idea' }));
    await screen.findByRole('button', { name: 'Undo move to board' });
    fireEvent.click(screen.getByRole('button', { name: 'Undo move to board' }));
    await screen.findByRole('checkbox', { name: 'Select shape for board' });
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: 'Undo move to board' })).toBeNull();
    expect(trayRows).toEqual(placements);
    expect(http.post.mock.calls).toEqual([
      [`/boards/${board.id}/relocate-tray`, { placement_ids: selectedIds }],
      [`/boards/${board.id}/relocate-tray/${receipt.batch_id}/undo`, {}],
    ]);
    fireEvent.click(screen.getByRole('link', { name: 'Review board' }));
    await screen.findByRole('heading', { name: 'Give this thought some room.' });
    expect(screen.queryByTestId('board-visual-v-0')).toBeNull();
    expect(screen.queryByRole('article', { name: 'Collected idea' })).toBeNull();
    expect(http.put).not.toHaveBeenCalled(); expect(http.patch).not.toHaveBeenCalled(); expect(http.delete).not.toHaveBeenCalled();
  });
});
