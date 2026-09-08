import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Board, BoardDetail, BoardEdge, BoardMember, BoardVisual } from './boardTypes';
import { useBoard } from './useBoard';

// All repository I/O is synthetic; only the fixed error-copy mapper is real.
const repository = vi.hoisted(() => ({
  get: vi.fn(), update: vi.fn(), mount: vi.fn(), updateMember: vi.fn(), unmount: vi.fn(),
  createEdge: vi.fn(), deleteEdge: vi.fn(), createVisual: vi.fn(), deleteVisual: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: {} }));
vi.mock('./boardRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./boardRepository')>();
  return { boardRepository: repository, boardErrorMessage: actual.boardErrorMessage };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const timestamp = '2026-09-08T00:00:00.000Z';
const geometry = { x: 10, y: 20, w: 240, h: 120, scale: 1, z_index: 0, pinned: false };

function board(id = 'board-a'): Board {
  return {
    id, user_id: 'fixture', title: id, soul_id: `soul-${id}`, project_id: null,
    viewport: { x: 0, y: 0, zoom: 1 }, created_at: timestamp, updated_at: timestamp,
  };
}

function member(id = 'member-a', boardId = 'board-a'): BoardMember {
  return {
    id, board_id: boardId, member_kind: 'note', member_id: `note-${id}`, ...geometry,
    metadata: {}, created_at: timestamp, updated_at: timestamp,
    reference: {
      kind: 'note', id: `note-${id}`, state: 'available', reason: null,
      title: id, note_id: `note-${id}`,
    },
  };
}

function detail(id = 'board-a'): BoardDetail {
  return { board: board(id), members: [member('member-a', id), member('member-b', id)], edges: [], visuals: [] };
}

beforeEach(() => {
  vi.resetAllMocks();
  repository.get.mockImplementation(async (id: string) => detail(id));
});

describe('useBoard persistence queue', () => {
  it('serializes writes and reloads, and flush waits for the final submitted action', async () => {
    const firstSave = deferred<Board>();
    const savedBoard = { ...board(), viewport: { x: -4200, y: 9000, zoom: 3.25 } };
    repository.update.mockReturnValueOnce(firstSave.promise);
    repository.updateMember.mockResolvedValue({ ...member(), x: 500, pinned: true });
    const { result } = renderHook(() => useBoard('board-a'));
    await waitFor(() => expect(result.current.detail?.board.id).toBe('board-a'));
    repository.get.mockResolvedValue({
      ...detail(), board: savedBoard, members: [{ ...member(), x: 500, pinned: true }, member('member-b')],
    });
    let save!: Promise<boolean>;
    let move!: Promise<boolean>;
    let reloaded!: Promise<void>;
    let flushed = false;
    let flush!: Promise<void>;
    act(() => {
      save = result.current.updateBoard({ viewport: savedBoard.viewport });
      move = result.current.updateMember('member-a', { x: 500, pinned: true });
      reloaded = result.current.reload();
      flush = result.current.flush().then(() => { flushed = true; });
    });
    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    expect(repository.updateMember).not.toHaveBeenCalled();
    expect(repository.get).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);
    expect(flushed).toBe(false);
    await act(async () => {
      firstSave.resolve(savedBoard);
      expect(await save).toBe(true);
      expect(await move).toBe(true);
      await reloaded;
      await flush;
    });
    expect(result.current.detail?.board.viewport).toEqual(savedBoard.viewport);
    expect(result.current.detail?.members[0]).toMatchObject({ x: 500, pinned: true });
    expect(result.current.pending).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(flushed).toBe(true);
  });

  it('exposes a failed save, preserves confirmed geometry, and continues the queue', async () => {
    const { result } = renderHook(() => useBoard('board-a'));
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    repository.update.mockRejectedValueOnce(new Error('fixture save failed'));
    repository.updateMember.mockResolvedValueOnce({ ...member(), y: -500 });
    await act(async () => {
      const failure = result.current.updateBoard({ viewport: { x: 1, y: 2, zoom: 5 } });
      const next = result.current.updateMember('member-a', { y: -500 });
      expect(await failure).toBe(false);
      expect(await next).toBe(true);
    });
    expect(result.current.detail?.board.viewport.zoom).toBe(1);
    expect(result.current.detail?.members[0].y).toBe(-500);
    expect(result.current.error).toBe('Could not complete the board action. Try again.');
    expect(result.current.pending).toBe(false);
    await expect(result.current.flush()).rejects.toThrow('Could not complete the board action. Try again.');
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
    await expect(result.current.flush()).resolves.toBeUndefined();
  });

  it('finishes queued actions for the original board without putting old responses on a new board', async () => {
    const firstSave = deferred<Board>();
    repository.update.mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce({ ...board(), title: 'cleanup save' });
    repository.mount.mockResolvedValueOnce(member('late-member'));
    const { result, rerender } = renderHook(({ id }) => useBoard(id), { initialProps: { id: 'board-a' } });
    await waitFor(() => expect(result.current.detail?.board.id).toBe('board-a'));
    const oldUpdateBoard = result.current.updateBoard;
    let save!: Promise<boolean>;
    let mount!: Promise<boolean>;
    act(() => {
      save = result.current.updateBoard({ title: 'first save' });
      mount = result.current.mount({ member_kind: 'note', member_id: 'note-late-member' });
    });
    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    rerender({ id: 'board-b' });
    expect(result.current.detail).toBeNull();
    let cleanupSave!: Promise<boolean>;
    act(() => { cleanupSave = oldUpdateBoard({ title: 'cleanup save' }); });
    await act(async () => {
      firstSave.resolve({ ...board(), title: 'first save' });
      expect(await save).toBe(true);
      expect(await mount).toBe(true);
      expect(await cleanupSave).toBe(true);
      await result.current.flush();
    });
    expect(repository.mount).toHaveBeenCalledWith('board-a', { member_kind: 'note', member_id: 'note-late-member' });
    expect(repository.update.mock.calls.map(([id]) => id)).toEqual(['board-a', 'board-a']);
    expect(result.current.detail?.board).toEqual(board('board-b'));
    expect(result.current.detail?.members).toHaveLength(2);
    expect(result.current.pending).toBe(false);
  });

  it('allows the captured viewport saver to finish after unmount', async () => {
    const firstSave = deferred<Board>();
    repository.update.mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce(board());
    const { result, unmount } = renderHook(() => useBoard('board-a'));
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    const saveBoard = result.current.updateBoard;
    let first!: Promise<boolean>;
    act(() => { first = saveBoard({ title: 'queued before exit' }); });
    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    unmount();
    const cleanup = saveBoard({ viewport: { x: -500, y: 200, zoom: 0.75 } });
    firstSave.resolve(board());
    expect(await first).toBe(true);
    expect(await cleanup).toBe(true);
    expect(repository.update.mock.calls.map(([id]) => id)).toEqual(['board-a', 'board-a']);
    expect(repository.update).toHaveBeenLastCalledWith('board-a', { viewport: { x: -500, y: 200, zoom: 0.75 } });
  });

  it('updates projection instances, edges, and freehand visuals from confirmed repository responses', async () => {
    const edge: BoardEdge = {
      id: 'edge-a', board_id: 'board-a', from_member_id: 'member-a', to_member_id: 'member-b',
      style: {}, label: 'clue', created_at: timestamp,
    };
    const visual: BoardVisual = {
      id: 'visual-a', board_id: 'board-a', visual_kind: 'freehand', ...geometry,
      rotation: 0, data: { points: [{ x: 0, y: 0 }, { x: 30, y: 40 }], style: { stroke: '#000' } },
      metadata: {}, created_at: timestamp, updated_at: timestamp,
    };
    repository.mount.mockResolvedValue(member());
    repository.createEdge.mockResolvedValue(edge);
    repository.createVisual.mockResolvedValue(visual);
    repository.unmount.mockResolvedValue(undefined);
    repository.deleteEdge.mockResolvedValue(undefined);
    repository.deleteVisual.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBoard('board-a'));
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    await act(async () => {
      await result.current.mount({ id: 'member-a', member_kind: 'note', member_id: 'note-member-a' });
      await result.current.addEdge({ from_member_id: 'member-a', to_member_id: 'member-b', label: 'clue' });
      await result.current.addVisual({ visual_kind: 'freehand', data: visual.data });
    });
    expect(result.current.detail?.members).toHaveLength(2);
    expect(result.current.detail?.edges).toEqual([edge]);
    expect(result.current.detail?.visuals).toEqual([visual]);
    await act(async () => { await result.current.removeEdge('edge-a'); });
    expect(result.current.detail?.edges).toEqual([]);
    await act(async () => {
      await result.current.addEdge({ from_member_id: 'member-a', to_member_id: 'member-b' });
      await result.current.unmount('member-a');
      await result.current.removeVisual('visual-a');
    });
    expect(result.current.detail?.members.map((item) => item.id)).toEqual(['member-b']);
    expect(result.current.detail?.edges).toEqual([]);
    expect(result.current.detail?.visuals).toEqual([]);
  });
});
