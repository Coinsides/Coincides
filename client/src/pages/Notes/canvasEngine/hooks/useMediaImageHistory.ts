import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MediaImageEditV1 } from '@shared/types';
import type { NoteBlock } from '../runtimeDataTypes';
import { readMediaBlockMetadata } from '../mediaBlockService';
import type { usePlacementHistory } from './usePlacementHistory';

export interface UseMediaImageHistoryOptions {
  noteId?: string;
  generation?: number;
  blocks: NoteBlock[];
  saveMediaImageEdit: (block: NoteBlock, edit: MediaImageEditV1 | null | undefined) => Promise<boolean>;
  history: Pick<ReturnType<typeof usePlacementHistory>, 'pushHistoryEntry' | 'enqueueRuntimeHistoryOperation'>;
  boundary: () => boolean;
}

/** One image save uses the same serialized Note history as body and layout edits. */
export function useMediaImageHistory(options: UseMediaImageHistoryOptions) {
  const latest = useRef(options);
  latest.current = options;
  const scope = useMemo(() => ({ active: true }), [options.noteId, options.generation]);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  useEffect(() => {
    scope.active = true;
    return () => { scope.active = false; };
  }, [scope]);

  const save = useCallback(async (block: NoteBlock, edit: MediaImageEditV1 | null): Promise<boolean> => {
    const current = () => scope.active && activeScope.current === scope;
    const assetId = readMediaBlockMetadata(block)?.asset_id;
    if (!current() || block.block_type !== 'media' || !assetId) return false;
    const after = structuredClone(edit);
    const start = latest.current;
    if (!start.boundary()) return false;
    try {
      return await start.history.enqueueRuntimeHistoryOperation(async () => {
        if (!current()) return false;
        const findLive = () => latest.current.blocks.find((entry) => entry.id === block.id
          && entry.block_type === 'media' && readMediaBlockMetadata(entry)?.asset_id === assetId);
        const source = findLive();
        if (!source) return false;
        const before = structuredClone(readMediaBlockMetadata(source)?.edit_v1);
        if (JSON.stringify(before ?? null) === JSON.stringify(after)) return true;
        const replay = async (value: MediaImageEditV1 | null | undefined): Promise<boolean> => {
          if (!current()) return false;
          const liveBlock = findLive();
          if (!liveBlock) return false;
          try {
            return await latest.current.saveMediaImageEdit(liveBlock, structuredClone(value)) && current();
          } catch { return false; }
        };
        if (!await replay(after)) return false;
        return start.history.pushHistoryEntry({
          type: 'reversibleEdit', undo: () => replay(before), redo: () => replay(after),
        }, { skipBoundary: true });
      });
    } catch { return false; }
  }, [scope]);

  return { save };
}
