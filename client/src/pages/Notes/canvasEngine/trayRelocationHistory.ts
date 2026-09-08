import { useCallback, useSyncExternalStore } from 'react';
import type { TrayRelocationResult } from '@/pages/Boards/boardTypes';

// Keep server batch identities across in-app board/paper navigation. The server
// operation batch owns restoration; no client geometry or metadata is replayed.
const receipts = new Map<string, readonly TrayRelocationResult[]>();
const empty: readonly TrayRelocationResult[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const notify = () => { for (const listener of listeners) listener(); };

export function rememberTrayRelocation(noteId: string, receipt: TrayRelocationResult): void {
  const current = receipts.get(noteId) || empty;
  if (current.some((entry) => entry.batch_id === receipt.batch_id)) return;
  receipts.set(noteId, [...current, receipt]);
  notify();
}

export function forgetTrayRelocation(noteId: string, batchId: string): void {
  const next = (receipts.get(noteId) || empty).filter((entry) => entry.batch_id !== batchId);
  if (next.length) receipts.set(noteId, next);
  else receipts.delete(noteId);
  notify();
}

export function useTrayRelocationHistory(noteId: string | undefined): readonly TrayRelocationResult[] {
  const snapshot = useCallback(() => noteId ? receipts.get(noteId) || empty : empty, [noteId]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
