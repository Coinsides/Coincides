import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { boardErrorMessage, boardRepository } from './boardRepository';
import { subscribeBoardChanges } from './boardEvents';
import { BoardCommandHistory, type BoardGeometryChange, type BoardRemovalSelection } from './boardCommandHistory';
import type {
  BoardDetail,
  CreateBoardEdgeInput,
  CreateBoardVisualInput,
  MountBoardMemberInput,
  MountBoardTextRangeInput,
  PatchBoardInput,
  PatchBoardMemberInput,
  PatchBoardEdgeInput,
  PatchBoardVisualInput,
} from './boardTypes';

interface BoardScope {
  boardId: string | undefined;
  history: BoardCommandHistory;
}

interface BoardState {
  scope: BoardScope | null;
  detail: BoardDetail | null;
  loadingCount: number;
  pendingCount: number;
  error: string | null;
}

function upsert<T extends { id: string }>(items: T[], value: T): T[] {
  return items.some((item) => item.id === value.id)
    ? items.map((item) => item.id === value.id ? value : item)
    : [...items, value];
}

export function useBoard(boardId: string | undefined) {
  const scope = useMemo<BoardScope>(() => ({ boardId, history: new BoardCommandHistory() }), [boardId]);
  const renderedId = useRef(boardId);
  renderedId.current = boardId;
  const scopeRef = useRef<BoardScope>({ boardId: undefined, history: new BoardCommandHistory() });
  const alive = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveFailure = useRef<{ scope: BoardScope; message: string } | null>(null);
  const [state, setState] = useState<BoardState>({
    scope: null, detail: null, loadingCount: 0, pendingCount: 0, error: null,
  });

  const isCurrent = useCallback((scope: BoardScope) => (
    alive.current && scopeRef.current === scope && renderedId.current === scope.boardId
  ), []);

  // Reads share the queue so a slow reload cannot overwrite a newer geometry save.
  const enqueue = useCallback(<T,>(
    work: (id: string) => Promise<T>,
    apply: (detail: BoardDetail | null, value: T) => BoardDetail | null,
    kind: 'read' | 'write' = 'write',
    scope = scopeRef.current,
  ): Promise<boolean> => {
    const id = scope.boardId;
    if (!id || (kind === 'read' && !isCurrent(scope))) return Promise.resolve(false);
    const count = kind === 'read' ? 'loadingCount' : 'pendingCount';
    if (isCurrent(scope)) {
      setState((current) => current.scope === scope
        ? { ...current, [count]: current[count] + 1 }
        : current);
    }
    const result = queue.current.then(async () => {
      // User actions retain their original board even when navigation happens first.
      if (kind === 'read' && !isCurrent(scope)) return false;
      try {
        const value = await work(id);
        // Update the queue-owned snapshot synchronously: the next queued undo
        // must see this write even before React processes its render.
        scope.history.detail = apply(scope.history.detail, value);
        if (isCurrent(scope)) {
          setState((current) => current.scope === scope && isCurrent(scope)
            ? { ...current, detail: scope.history.detail }
            : current);
        }
        return true;
      } catch (error) {
        if (isCurrent(scope)) {
          const message = boardErrorMessage(error);
          if (kind === 'write') saveFailure.current = { scope, message };
          setState((current) => current.scope === scope ? { ...current, detail: scope.history.detail, error: message } : current);
        }
        return false;
      } finally {
        if (isCurrent(scope)) {
          setState((current) => current.scope === scope
            ? { ...current, [count]: Math.max(0, current[count] - 1) }
            : current);
        }
      }
    });
    // Failed writes return false, leaving the queue able to accept the next action.
    queue.current = result.then(() => undefined);
    return result;
  }, [isCurrent]);

  const load = useCallback(async (scope: BoardScope) => {
    await enqueue((id) => boardRepository.get(id), (_detail, value) => {
      scope.history.reset(value);
      return value;
    }, 'read', scope);
  }, [enqueue]);

  useEffect(() => {
    scopeRef.current = scope;
    alive.current = true;
    saveFailure.current = null;
    setState({ scope, detail: null, loadingCount: 0, pendingCount: 0, error: null });
    if (boardId) void load(scope);
    return () => { alive.current = false; };
  }, [boardId, load, scope]);

  const reload = useCallback(() => load(scope), [load, scope]);
  useEffect(() => subscribeBoardChanges((changedBoardId) => {
    if (changedBoardId === boardId) void reload();
  }), [boardId, reload]);
  const clearError = useCallback(() => {
    if (!isCurrent(scope)) return;
    saveFailure.current = null;
    setState((current) => current.scope === scope ? { ...current, error: null } : current);
  }, [isCurrent, scope]);

  const updateBoard = useCallback((input: PatchBoardInput) => enqueue(
    (id) => boardRepository.update(id, input),
    (detail, board) => detail ? { ...detail, board } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const mount = useCallback((input: MountBoardMemberInput) => enqueue(
    (id) => boardRepository.mount(id, input),
    (detail, member) => {
      scope.history.newEdit();
      return detail ? { ...detail, members: upsert(detail.members, member) } : detail;
    },
    'write', scope,
  ), [enqueue, scope]);

  const updateMember = useCallback((memberId: string, input: PatchBoardMemberInput) => enqueue(
    (id) => scope.history.patch(id, 'member', memberId, input),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const mountTextRange = useCallback((input: MountBoardTextRangeInput) => enqueue(
    (id) => boardRepository.mountTextRange(id, input),
    (detail, member) => {
      scope.history.newEdit();
      return detail ? { ...detail, members: upsert(detail.members, member) } : detail;
    },
    'write', scope,
  ), [enqueue, scope]);

  const unmount = useCallback((memberId: string) => enqueue(
    (id) => scope.history.removeSelection(id, { memberIds: [memberId], edgeIds: [], visualIds: [] }),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const addEdge = useCallback((input: CreateBoardEdgeInput) => enqueue(
    (id) => scope.history.create(id, 'edge', input),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const removeEdge = useCallback((edgeId: string) => enqueue(
    (id) => scope.history.removeSelection(id, { memberIds: [], edgeIds: [edgeId], visualIds: [] }),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const updateEdge = useCallback((edgeId: string, input: PatchBoardEdgeInput) => enqueue(
    (id) => scope.history.patch(id, 'edge', edgeId, input),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const addVisual = useCallback((input: CreateBoardVisualInput) => enqueue(
    (id) => scope.history.create(id, 'visual', input),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const removeVisual = useCallback((visualId: string) => enqueue(
    (id) => scope.history.removeSelection(id, { memberIds: [], edgeIds: [], visualIds: [visualId] }),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const updateVisual = useCallback((visualId: string, input: PatchBoardVisualInput) => enqueue(
    (id) => scope.history.patch(id, 'visual', visualId, input),
    (detail) => detail,
    'write', scope,
  ), [enqueue, scope]);

  const castVisual = useCallback((visualId: string) => enqueue(
    (id) => boardRepository.castVisual(id, scope.history.resolve('visual', visualId)),
    (detail, result) => {
      scope.history.invalidate('visual', [result.removed_visual_id]);
      scope.history.newEdit();
      return detail ? {
        ...detail,
        members: upsert(detail.members, result.member),
        visuals: detail.visuals.filter((visual) => visual.id !== result.removed_visual_id),
      } : detail;
    },
    'write', scope,
  ), [enqueue, scope]);

  const updateGeometryBatch = useCallback((changes: BoardGeometryChange[]) => enqueue(
    (id) => scope.history.updateGeometryBatch(id, changes), (detail) => detail, 'write', scope,
  ), [enqueue, scope]);
  const removeSelection = useCallback((selection: BoardRemovalSelection) => enqueue(
    (id) => scope.history.removeSelection(id, selection), (detail) => detail, 'write', scope,
  ), [enqueue, scope]);
  const removeVisuals = useCallback((visualIds: string[]) => removeSelection({
    memberIds: [], edgeIds: [], visualIds,
  }), [removeSelection]);
  const undo = useCallback(() => enqueue(
    (id) => scope.history.undo(id), (detail) => detail, 'write', scope,
  ), [enqueue, scope]);
  const redo = useCallback(() => enqueue(
    (id) => scope.history.redo(id), (detail) => detail, 'write', scope,
  ), [enqueue, scope]);

  const flush = useCallback(async () => {
    let pending: Promise<void>;
    do {
      pending = queue.current;
      await pending;
    } while (pending !== queue.current);
    if (isCurrent(scope) && saveFailure.current?.scope === scope) {
      throw new Error(saveFailure.current.message);
    }
  }, [isCurrent, scope]);

  const current = state.scope === scopeRef.current && state.scope?.boardId === boardId;
  return {
    detail: current ? state.detail : null,
    loading: current ? state.loadingCount > 0 : Boolean(boardId),
    error: current ? state.error : null,
    pending: current && state.pendingCount > 0,
    canUndo: current && scope.history.canUndo,
    canRedo: current && scope.history.canRedo,
    reload, updateBoard, mount, mountTextRange, updateMember, unmount, addEdge, removeEdge,
    addVisual, removeVisual, updateVisual, castVisual, updateEdge, clearError, flush,
    updateGeometryBatch, removeSelection, removeVisuals, undo, redo,
  };
}
