import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';
import { cloneComponentBlockPayload as snapshot, readComponentBlockPayload, type ComponentBlockPayload } from '../componentBlockService';
import type { usePlacementHistory } from './usePlacementHistory';

export interface UseComponentBlockHistoryOptions {
  noteId?: string;
  generation?: number;
  blocks: NoteBlock[];
  saveComponentBlock: (block: NoteBlock, payload: ComponentBlockPayload) => Promise<boolean>;
  history: Pick<ReturnType<typeof usePlacementHistory>, 'pushHistoryEntry' | 'enqueueRuntimeHistoryOperation'>;
  boundary: () => boolean;
}

/** Component saves share the Note history lane with text, layout, and block lifecycle edits. */
export function useComponentBlockHistory(options: UseComponentBlockHistoryOptions) {
  const latest = useRef(options);
  latest.current = options;
  const scope = useMemo(() => ({ active: true }), [options.noteId, options.generation]);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  useEffect(() => {
    scope.active = true;
    return () => { scope.active = false; };
  }, [scope]);

  const save = useCallback(async (block: NoteBlock, payload: ComponentBlockPayload): Promise<boolean> => {
    const current = () => scope.active && activeScope.current === scope;
    if (!current() || block.block_type !== 'component') return false;
    const after = snapshot(payload);
    const start = latest.current;
    if (!start.boundary()) return false;
    try {
      return await start.history.enqueueRuntimeHistoryOperation(async () => {
        if (!current()) return false;
        const source = latest.current.blocks.find((entry) => entry.id === block.id && entry.block_type === 'component');
        if (!source) return false;
        const payloadBefore = readComponentBlockPayload(source);
        if (!payloadBefore) return false;
        const before = snapshot(payloadBefore);
        if (JSON.stringify(before) === JSON.stringify(after)) return true;
        const replay = async (value: ComponentBlockPayload): Promise<boolean> => {
          if (!current()) return false;
          const liveBlock = latest.current.blocks.find((entry) => entry.id === block.id && entry.block_type === 'component');
          if (!liveBlock) return false;
          try {
            return await latest.current.saveComponentBlock(liveBlock, snapshot(value)) && current();
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
