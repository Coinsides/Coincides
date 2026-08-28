import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import api from '@/services/api';
import type { NoteBlock } from '../runtimeDataTypes';

type RestoreBlock = (
  block: NoteBlock,
  options?: { silent?: boolean },
) => Promise<NoteBlock | null | undefined>;

interface UseNoteBlockTrashControllerOptions {
  noteId: string | undefined;
  restoreBlock: RestoreBlock;
}

export function useNoteBlockTrashController({
  noteId,
  restoreBlock,
}: UseNoteBlockTrashControllerOptions) {
  const [trashedBlocks, setTrashedBlocks] = useState<NoteBlock[]>([]);
  const [blockTrashLoading, setBlockTrashLoading] = useState(false);
  const [blockTrashLoadFailed, setBlockTrashLoadFailed] = useState(false);
  const [restoringBlockId, setRestoringBlockId] = useState<string | null>(null);
  const routeNoteIdRef = useRef(noteId);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    routeNoteIdRef.current = noteId;
    requestGenerationRef.current += 1;
    setTrashedBlocks([]);
    setBlockTrashLoading(false);
    setBlockTrashLoadFailed(false);
    setRestoringBlockId(null);
  }, [noteId]);

  const loadTrashedBlocks = useCallback(async (): Promise<void> => {
    if (!noteId) return;
    const requestedNoteId = noteId;
    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    const requestIsCurrent = () => (
      routeNoteIdRef.current === requestedNoteId
      && requestGenerationRef.current === requestGeneration
    );

    setBlockTrashLoading(true);
    setBlockTrashLoadFailed(false);
    try {
      const response = await api.get(`/notes/${requestedNoteId}/blocks`, {
        params: { status: 'trashed' },
      });
      if (!requestIsCurrent()) return;
      const blocks = Array.isArray(response.data)
        ? response.data.filter((block): block is NoteBlock => (
          Boolean(block) && typeof block === 'object'
        ))
        : [];
      setTrashedBlocks(blocks);
    } catch (error) {
      if (!requestIsCurrent()) return;
      console.error('Failed to load deleted blocks:', error);
      setTrashedBlocks([]);
      setBlockTrashLoadFailed(true);
    } finally {
      if (requestIsCurrent()) setBlockTrashLoading(false);
    }
  }, [noteId]);

  const restoreTrashedBlock = useCallback(async (
    block: NoteBlock,
  ): Promise<NoteBlock | null | undefined> => {
    const requestedNoteId = noteId;
    if (!requestedNoteId) return null;
    setRestoringBlockId(block.id);
    try {
      const restored = await restoreBlock(block);
      if (restored && routeNoteIdRef.current === requestedNoteId) {
        setTrashedBlocks((current) => current.filter((item) => item.id !== block.id));
      }
      return restored;
    } finally {
      if (routeNoteIdRef.current === requestedNoteId) setRestoringBlockId(null);
    }
  }, [noteId, restoreBlock]);

  return {
    blockTrashLoadFailed,
    blockTrashLoading,
    loadTrashedBlocks,
    restoreTrashedBlock,
    restoringBlockId,
    trashedBlocks,
  };
}
