// Local notification only; persistence and source evidence belong to the server transaction.
const boardListeners = new Set<(boardId: string) => void>();

export function notifyBoardChanged(boardId: string): void {
  boardListeners.forEach((listener) => listener(boardId));
}

export function subscribeBoardChanges(listener: (boardId: string) => void): () => void {
  boardListeners.add(listener);
  return () => { boardListeners.delete(listener); };
}
