import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { boardErrorMessage, boardRepository } from './boardRepository';
import { subscribeBoardChanges } from './boardEvents';
import type {
  BoardDetail,
  CreateBoardEdgeInput,
  CreateBoardVisualInput,
  MountBoardMemberInput,
  PatchBoardInput,
  PatchBoardMemberInput,
  PatchBoardEdgeInput,
  PatchBoardVisualInput,
} from './boardTypes';

interface BoardScope {
  boardId: string | undefined;
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
  const scope = useMemo<BoardScope>(() => ({ boardId }), [boardId]);
  const renderedId = useRef(boardId);
  renderedId.current = boardId;
  const scopeRef = useRef<BoardScope>({ boardId: undefined });
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
        if (isCurrent(scope)) {
          setState((current) => current.scope === scope && isCurrent(scope)
            ? { ...current, detail: apply(current.detail, value) }
            : current);
        }
        return true;
      } catch (error) {
        if (isCurrent(scope)) {
          const message = boardErrorMessage(error);
          if (kind === 'write') saveFailure.current = { scope, message };
          setState((current) => current.scope === scope ? { ...current, error: message } : current);
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
    await enqueue((id) => boardRepository.get(id), (_detail, value) => value, 'read', scope);
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
    (detail, member) => detail ? { ...detail, members: upsert(detail.members, member) } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const updateMember = useCallback((memberId: string, input: PatchBoardMemberInput) => enqueue(
    (id) => boardRepository.updateMember(id, memberId, input),
    (detail, member) => detail
      ? { ...detail, members: detail.members.map((item) => item.id === member.id ? member : item) }
      : detail,
    'write', scope,
  ), [enqueue, scope]);

  const unmount = useCallback((memberId: string) => enqueue(
    (id) => boardRepository.unmount(id, memberId),
    (detail) => detail ? {
      ...detail,
      members: detail.members.filter((member) => member.id !== memberId),
      edges: detail.edges.filter((edge) => edge.from_member_id !== memberId && edge.to_member_id !== memberId),
    } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const addEdge = useCallback((input: CreateBoardEdgeInput) => enqueue(
    (id) => boardRepository.createEdge(id, input),
    (detail, edge) => detail ? { ...detail, edges: upsert(detail.edges, edge) } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const removeEdge = useCallback((edgeId: string) => enqueue(
    (id) => boardRepository.deleteEdge(id, edgeId),
    (detail) => detail ? { ...detail, edges: detail.edges.filter((edge) => edge.id !== edgeId) } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const updateEdge = useCallback((edgeId: string, input: PatchBoardEdgeInput) => enqueue(
    (id) => boardRepository.updateEdge(id, edgeId, input),
    (detail, edge) => detail ? { ...detail, edges: upsert(detail.edges, edge) } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const addVisual = useCallback((input: CreateBoardVisualInput) => enqueue(
    (id) => boardRepository.createVisual(id, input),
    (detail, visual) => detail ? { ...detail, visuals: upsert(detail.visuals, visual) } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const removeVisual = useCallback((visualId: string) => enqueue(
    (id) => boardRepository.deleteVisual(id, visualId),
    (detail) => detail ? { ...detail, visuals: detail.visuals.filter((visual) => visual.id !== visualId) } : detail,
    'write', scope,
  ), [enqueue, scope]);

  const updateVisual = useCallback((visualId: string, input: PatchBoardVisualInput) => enqueue(
    (id) => boardRepository.updateVisual(id, visualId, input),
    (detail, visual) => detail ? { ...detail, visuals: upsert(detail.visuals, visual) } : detail,
    'write', scope,
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
    reload, updateBoard, mount, updateMember, unmount, addEdge, removeEdge,
    addVisual, removeVisual, updateVisual, updateEdge, clearError, flush,
  };
}
