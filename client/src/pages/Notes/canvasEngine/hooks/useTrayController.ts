import type { CoordinateContract } from '../placementContractService';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/services/api';
import { boardErrorMessage, boardRepository } from '@/pages/Boards/boardRepository';
import { notifyBoardChanged } from '@/pages/Boards/boardEvents';
import type { Board } from '@/pages/Boards/boardTypes';
import { saveBlockCanvasPlacementForNote } from '../canvasObjectRepository';
import { buildTrayEntries } from '../trayService';
import { forgetTrayRelocation, rememberTrayRelocation, useTrayRelocationHistory } from '../trayRelocationHistory';
import { readStoredLayout, reconcileHydratedBlockLayoutSurfaceAuthority } from '../placementService';
import { resolvePageDraftSessionAuthority } from './useRuntimeNaturalWritingController';
import type { RuntimeHistoryEntry } from '../historyService';
import type { TrackPendingWrite } from '../inFlightWriteRegistry';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { CanvasObject, CanvasPlacement, ContentMount, PageFrameCollectionModel } from '../types';

export function useTrayController(input: {
  noteId?: string;
  hostMode?: 'page' | 'modal';
  trackPendingWrite?: TrackPendingWrite;
  coordinateContract?: CoordinateContract;
  enabled: boolean;
  blocks: NoteBlock[];
  objects: CanvasObject[];
  placements: CanvasPlacement[];
  mounts: ContentMount[];
  selectedBlockId: string | null;
  blockLayouts: Record<string, BlockBoxLayout>;
  collection: PageFrameCollectionModel | null;
  pageOffsetX: number;
  refresh: (changedBlockIds?: string[]) => Promise<void>;
  clearSelection: () => void;
  pushHistory: (entry: RuntimeHistoryEntry) => void;
  flushBlock: (block: NoteBlock) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const currentNote = useRef(input.noteId);
  currentNote.current = input.noteId;
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [error, setError] = useState<string | null>(null);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [boardsRevision, setBoardsRevision] = useState(0);
  const relocationHistory = useTrayRelocationHistory(input.noteId);
  const latestRelocation = relocationHistory[relocationHistory.length - 1] || null;
  useEffect(() => {
    if (!open || !input.enabled || !input.noteId) return;
    let current = true;
    setBoardsLoading(true);
    setBoardsError(null);
    void boardRepository.list().then((value) => { if (current) setBoards(value); })
      .catch(() => { if (current) { setBoards([]); setBoardsError('Could not load boards. Try again.'); } })
      .finally(() => { if (current) setBoardsLoading(false); });
    return () => { current = false; };
  }, [open, input.enabled, input.noteId, boardsRevision]);
  const entries = useMemo(() => buildTrayEntries(input.objects, input.placements, input.mounts, input.blocks),
    [input.objects, input.placements, input.mounts, input.blocks]);
  const selectedBlock = input.blocks.find((block) => block.id === input.selectedBlockId
    && input.blockLayouts[block.id] && readStoredLayout(block)?.surface !== 'tray');
  const isCurrent = () => alive.current && currentNote.current === input.noteId;
  const run = async (writeKey: string, action: () => Promise<void>, message = (_error: unknown) => 'The tray edit could not be saved. Please try again.'): Promise<boolean> => {
    if (!input.enabled || !input.noteId || !isCurrent() || busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      // Observe the complete operation before the existing UI catch converts failure to false.
      if (input.hostMode === 'modal' && input.trackPendingWrite) {
        await input.trackPendingWrite(`tray:${input.noteId}:${writeKey}`, action);
      } else await action();
      return true;
    }
    catch (failure) { if (isCurrent()) setError(message(failure)); return false; }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  };
  const save = async (block: NoteBlock, layout: BlockBoxLayout) => {
    await saveBlockCanvasPlacementForNote({ noteId: input.noteId!, block, layout, pageFrameCollection: input.collection, coordinateContract: input.coordinateContract });
    await refresh([block.id]);
    input.clearSelection();
  };
  const refresh = async (blockIds: string[]) => {
    try { await input.refresh(blockIds); }
    catch { setError('The edit was saved. Reload this note to refresh the tray.'); }
  };
  const editLayout = async (block: NoteBlock, before: BlockBoxLayout, after: BlockBoxLayout, flush = false) => {
    await run(`placement:${block.id}`, async () => {
      if (flush && !await input.flushBlock(block)) throw new Error('Block edit is still pending');
      await save(block, after);
      input.pushHistory({ type: 'reversibleEdit',
        undo: () => run(`placement:${block.id}`, () => save(block, before)),
        redo: () => run(`placement:${block.id}`, () => save(block, after)),
      });
    });
  };
  const moveSelectedToTray = async () => {
    if (!selectedBlock) return;
    const order = Math.max(-1, ...entries.map((entry) => entry.placement.orderIndex ?? -1)) + 1;
    await editLayout(selectedBlock, input.blockLayouts[selectedBlock.id], {
      x: 0, y: 0, width: 0, height: 0, surface: 'tray', order_index: order,
      export_role: input.blockLayouts[selectedBlock.id].export_role,
      ai_visibility: input.blockLayouts[selectedBlock.id].ai_visibility,
    }, true);
    setOpen(true);
  };
  const dropOnPaper = async (placementId: string, layout: BlockBoxLayout) => {
    const entry = entries.find((item) => item.placement.placementId === placementId);
    if (!entry?.block) return;
    const authority = resolvePageDraftSessionAuthority({
      coordinateContract: input.coordinateContract,
      collection: input.collection, layout, pageOffsetX: input.pageOffsetX,
      selectedFrameId: input.collection?.selectedFrameId,
    });
    if (!authority) return;
    const before = readStoredLayout(entry.block) as BlockBoxLayout;
    // The surface has already converted the drop to the loaded contract.
    const after = reconcileHydratedBlockLayoutSurfaceAuthority({
      ...layout, coordinate_space: 'page_frame_local', frame_id: authority.frameId,
    }, input.collection?.pageFrames || [], input.coordinateContract) as unknown as BlockBoxLayout;
    await editLayout(entry.block, before, after);
  };
  const split = async (placementIds: string[], title: string) => {
    await run(`split:${[...placementIds].sort().join(',')}`, async () => {
      const response = await api.post<{ note_id: string; batch_id: string }>(`/notes/${input.noteId}/tray/split`, {
        placement_ids: placementIds, title,
      });
      const { note_id, batch_id } = response.data;
      const changedIds = entries.filter((entry) => placementIds.includes(entry.placement.placementId))
        .flatMap((entry) => entry.block ? [entry.block.id] : []);
      await refresh(changedIds);
      setCreatedNoteId(note_id);
      const toggle = (applied: boolean) => run(`split-batch:${batch_id}`, async () => {
        await api.post(`/notes/${input.noteId}/tray/split/${batch_id}`, { applied });
        await refresh(changedIds);
        setCreatedNoteId(applied ? note_id : null);
      });
      input.pushHistory({ type: 'reversibleEdit', undo: () => toggle(false), redo: () => toggle(true) });
    });
  };
  const refreshAfterRelocation = async (boardId: string) => {
    notifyBoardChanged(boardId);
    if (!isCurrent()) return;
    try { await input.refresh([]); }
    catch { if (isCurrent()) setError('The board move was saved. Reload this note to refresh the tray.'); }
  };
  const relocateToBoard = async (placementIds: string[], boardId: string): Promise<boolean> => {
    if (!boardId || !placementIds.length || new Set(placementIds).size !== placementIds.length
      || placementIds.some((id) => !entries.some((entry) => entry.placement.placementId === id && entry.boardKind))) return false;
    return run(`relocate:${boardId}:${[...placementIds].sort().join(',')}`, async () => {
      const receipt = await boardRepository.relocateTray(boardId, placementIds);
      rememberTrayRelocation(input.noteId!, receipt);
      await refreshAfterRelocation(boardId);
    }, boardErrorMessage);
  };
  const undoBoardRelocation = async (): Promise<boolean> => {
    if (!latestRelocation) return false;
    return run(`relocate-undo:${latestRelocation.batch_id}`, async () => {
      await boardRepository.undoTrayRelocation(latestRelocation.board_id, latestRelocation.batch_id);
      forgetTrayRelocation(input.noteId!, latestRelocation.batch_id);
      await refreshAfterRelocation(latestRelocation.board_id);
    }, boardErrorMessage);
  };
  return { open, setOpen, busy, error, entries, createdNoteId, canMoveSelected: Boolean(selectedBlock) && input.enabled,
    moveSelectedToTray, dropOnPaper, split, boards, boardsLoading, boardsError,
    reloadBoards: () => setBoardsRevision((revision) => revision + 1), boardActionsEnabled: input.enabled,
    relocateToBoard, undoBoardRelocation, latestRelocation, navigationDisabled: input.hostMode === 'modal' };
}
