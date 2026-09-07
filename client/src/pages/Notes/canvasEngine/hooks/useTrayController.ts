import { useMemo, useRef, useState } from 'react';
import api from '@/services/api';
import { saveBlockCanvasPlacementForNote } from '../canvasObjectRepository';
import { buildTrayEntries } from '../trayService';
import { readStoredLayout, reconcileHydratedBlockLayoutSurfaceAuthority } from '../placementService';
import { resolvePageDraftSessionAuthority } from './useRuntimeNaturalWritingController';
import type { RuntimeHistoryEntry } from '../historyService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { CanvasObject, CanvasPlacement, ContentMount, PageFrameCollectionModel } from '../types';

export function useTrayController(input: {
  noteId?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const entries = useMemo(() => buildTrayEntries(input.objects, input.placements, input.mounts, input.blocks),
    [input.objects, input.placements, input.mounts, input.blocks]);
  const selectedBlock = input.blocks.find((block) => block.id === input.selectedBlockId
    && input.blockLayouts[block.id] && readStoredLayout(block)?.surface !== 'tray');
  const run = async (action: () => Promise<void>): Promise<boolean> => {
    if (!input.enabled || !input.noteId || currentNote.current !== input.noteId || busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try { await action(); return true; }
    catch { setError('The tray edit could not be saved. Please try again.'); return false; }
    finally { busyRef.current = false; setBusy(false); }
  };
  const save = async (block: NoteBlock, layout: BlockBoxLayout) => {
    await saveBlockCanvasPlacementForNote({ noteId: input.noteId!, block, layout, pageFrameCollection: input.collection });
    await refresh([block.id]);
    input.clearSelection();
  };
  const refresh = async (blockIds: string[]) => {
    try { await input.refresh(blockIds); }
    catch { setError('The edit was saved. Reload this note to refresh the tray.'); }
  };
  const editLayout = async (block: NoteBlock, before: BlockBoxLayout, after: BlockBoxLayout, flush = false) => {
    await run(async () => {
      if (flush && !await input.flushBlock(block)) throw new Error('Block edit is still pending');
      await save(block, after);
      input.pushHistory({ type: 'reversibleEdit',
        undo: () => run(() => save(block, before)), redo: () => run(() => save(block, after)),
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
      collection: input.collection, layout, pageOffsetX: input.pageOffsetX,
      selectedFrameId: input.collection?.selectedFrameId,
    });
    if (!authority) return;
    const before = readStoredLayout(entry.block) as BlockBoxLayout;
    // The existing blank-drop layout is already relative to the paper's block list.
    // Use the same local layout save path as moving an existing paper block.
    const after = reconcileHydratedBlockLayoutSurfaceAuthority({
      ...layout, coordinate_space: 'page_frame_local', frame_id: authority.frameId,
    }, input.collection?.pageFrames || []) as unknown as BlockBoxLayout;
    await editLayout(entry.block, before, after);
  };
  const split = async (placementIds: string[], title: string) => {
    await run(async () => {
      const response = await api.post<{ note_id: string; batch_id: string }>(`/notes/${input.noteId}/tray/split`, {
        placement_ids: placementIds, title,
      });
      const { note_id, batch_id } = response.data;
      const changedIds = entries.filter((entry) => placementIds.includes(entry.placement.placementId))
        .flatMap((entry) => entry.block ? [entry.block.id] : []);
      await refresh(changedIds);
      setCreatedNoteId(note_id);
      const toggle = (applied: boolean) => run(async () => {
        await api.post(`/notes/${input.noteId}/tray/split/${batch_id}`, { applied });
        await refresh(changedIds);
        setCreatedNoteId(applied ? note_id : null);
      });
      input.pushHistory({ type: 'reversibleEdit', undo: () => toggle(false), redo: () => toggle(true) });
    });
  };
  return { open, setOpen, busy, error, entries, createdNoteId, canMoveSelected: Boolean(selectedBlock) && input.enabled,
    moveSelectedToTray, dropOnPaper, split };
}
