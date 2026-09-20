import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';
import { cloneTableBlockPayload as snapshot, readTableBlockPayload, type TableBlockPayload } from '../tableBlockService';
import type { usePlacementHistory } from './usePlacementHistory';

export interface UseTableBlockHistoryOptions {
  noteId?: string;
  generation?: number;
  blocks: NoteBlock[];
  saveTableBlock: (block: NoteBlock, payload: TableBlockPayload) => Promise<boolean>;
  history: Pick<ReturnType<typeof usePlacementHistory>, 'pushHistoryEntry' | 'enqueueRuntimeHistoryOperation'>;
  boundary: () => boolean;
}

/** Table saves share the Note history lane with text, layout, and block lifecycle edits. */
export function useTableBlockHistory(options: UseTableBlockHistoryOptions) {
  const latest = useRef(options);
  latest.current = options;
  const scope = useMemo(() => ({ active: true }), [options.noteId, options.generation]);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  useEffect(() => {
    scope.active = true;
    return () => { scope.active = false; };
  }, [scope]);

  const save = useCallback(async (block: NoteBlock, payload: TableBlockPayload): Promise<boolean> => {
    const current = () => scope.active && activeScope.current === scope;
    if (!current() || block.block_type !== 'table') return false;
    const after = snapshot(payload);
    const start = latest.current;
    if (!start.boundary()) return false;
    try {
      return await start.history.enqueueRuntimeHistoryOperation(async () => {
        if (!current()) return false;
        const source = latest.current.blocks.find((entry) => entry.id === block.id && entry.block_type === 'table');
        if (!source) return false;
        const payloadBefore = readTableBlockPayload(source);
        if (!payloadBefore) return false;
        const before = snapshot(payloadBefore);
        if (JSON.stringify(before) === JSON.stringify(after)) return true;
        const replay = async (value: TableBlockPayload): Promise<boolean> => {
          if (!current()) return false;
          const liveBlock = latest.current.blocks.find((entry) => entry.id === block.id && entry.block_type === 'table');
          if (!liveBlock) return false;
          try {
            return await latest.current.saveTableBlock(liveBlock, snapshot(value)) && current();
          } catch {
            return false;
          }
        };
        if (!await replay(after)) return false;
        return start.history.pushHistoryEntry({
          type: 'reversibleEdit', undo: () => replay(before), redo: () => replay(after),
        }, { skipBoundary: true });
      });
    } catch {
      return false;
    }
  }, [scope]);

  return { save };
}
