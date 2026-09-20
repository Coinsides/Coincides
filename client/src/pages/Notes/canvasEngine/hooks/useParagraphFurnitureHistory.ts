import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';
import { canStyleParagraph, readParagraphFurniture, type ParagraphFurniture } from '../paragraphFurniture';
import type { usePlacementHistory } from './usePlacementHistory';

export function useParagraphFurnitureHistory(options: {
  noteId?: string; generation?: number; blocks: NoteBlock[];
  saveParagraphFurniture: (block: NoteBlock, value: ParagraphFurniture | null) => Promise<boolean>;
  history: Pick<ReturnType<typeof usePlacementHistory>, 'pushHistoryEntry' | 'enqueueRuntimeHistoryOperation'>;
  boundary: () => boolean;
}) {
  const latest = useRef(options); latest.current = options;
  const scope = useMemo(() => ({ active: true }), [options.noteId, options.generation]);
  const activeScope = useRef(scope); activeScope.current = scope;
  useEffect(() => { scope.active = true; return () => { scope.active = false; }; }, [scope]);
  const save = useCallback(async (block: NoteBlock, value: ParagraphFurniture | null): Promise<boolean> => {
    const current = () => scope.active && activeScope.current === scope;
    if (!current() || !canStyleParagraph(block) || !latest.current.boundary()) return false;
    const after = value ? { ...value } : null;
    try {
      return await latest.current.history.enqueueRuntimeHistoryOperation(async () => {
        const source = latest.current.blocks.find((entry) => entry.placement_id === block.placement_id);
        if (!current() || !source) return false;
        const before = readParagraphFurniture(source);
        if (JSON.stringify(before) === JSON.stringify(after)) return true;
        const replay = async (next: ParagraphFurniture | null) => {
          const live = latest.current.blocks.find((entry) => entry.placement_id === block.placement_id);
          if (!current() || !live) return false;
          return await latest.current.saveParagraphFurniture(live, next ? { ...next } : null) && current();
        };
        if (!await replay(after)) return false;
        return latest.current.history.pushHistoryEntry({ type: 'reversibleEdit',
          undo: () => replay(before), redo: () => replay(after) }, { skipBoundary: true });
      });
    } catch { return false; }
  }, [scope]);
  return { save };
}
