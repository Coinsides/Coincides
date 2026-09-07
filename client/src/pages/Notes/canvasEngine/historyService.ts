import type { NoteBlock } from './runtimeDataTypes';
import type { LayoutHistoryEntry } from './runtimeLayout';
import type { TableStructuredPayload } from './types';

export type RuntimeHistoryEntry =
  | { type: 'reversibleEdit'; undo: () => Promise<boolean>; redo: () => Promise<boolean> }
  | { type: 'layout'; entry: LayoutHistoryEntry }
  | { type: 'createdBlock'; block: NoteBlock }
  | { type: 'trashedBlock'; block: NoteBlock }
  | {
    type: 'structuredMutation';
    objectId: string;
    before: TableStructuredPayload;
    after: TableStructuredPayload;
  };

export interface RuntimeHistoryApplyHandlers {
  applyLayoutDrafts: (layouts: LayoutHistoryEntry['before']) => void;
  persistLayoutSnapshot: (layouts: LayoutHistoryEntry['before']) => void;
  persistStructuredObject?: (objectId: string, payload: TableStructuredPayload) => Promise<boolean> | boolean;
  restoreBlockForHistory?: (block: NoteBlock, options?: { silent?: boolean }) => Promise<NoteBlock | null>;
  trashBlockForHistory?: (blockId: string, options?: { silent?: boolean }) => Promise<boolean>;
}

export type RuntimeHistoryKeyboardIntent = 'undo' | 'redo';

export interface RuntimeHistoryKeyboardIntentInput {
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

export function isEditableDomTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function getRuntimeHistoryKeyboardIntent({
  ctrlKey,
  key,
  metaKey,
  shiftKey,
  target,
}: RuntimeHistoryKeyboardIntentInput): RuntimeHistoryKeyboardIntent | null {
  if (!(ctrlKey || metaKey) || isEditableDomTarget(target)) return null;

  const normalizedKey = key.toLowerCase();
  if (normalizedKey === 'z' && !shiftKey) return 'undo';
  if (normalizedKey === 'y' || (normalizedKey === 'z' && shiftKey)) return 'redo';
  return null;
}

export async function applyRuntimeHistoryUndo(
  entry: RuntimeHistoryEntry,
  handlers: RuntimeHistoryApplyHandlers,
): Promise<RuntimeHistoryEntry | null> {
  if (entry.type === 'reversibleEdit') return await entry.undo() ? entry : null;
  if (entry.type === 'layout') {
    handlers.applyLayoutDrafts(entry.entry.before);
    handlers.persistLayoutSnapshot(entry.entry.before);
    return entry;
  }

  if (entry.type === 'createdBlock') {
    if (!handlers.trashBlockForHistory) return null;
    const removed = await handlers.trashBlockForHistory(entry.block.id, { silent: true });
    return removed ? entry : null;
  }

  if (entry.type === 'structuredMutation') {
    if (!handlers.persistStructuredObject) return null;
    const saved = await handlers.persistStructuredObject(entry.objectId, entry.before);
    return saved ? entry : null;
  }

  if (!handlers.restoreBlockForHistory) return null;
  const restored = await handlers.restoreBlockForHistory(entry.block, { silent: true });
  return restored ? { type: 'trashedBlock', block: restored } : null;
}

export async function applyRuntimeHistoryRedo(
  entry: RuntimeHistoryEntry,
  handlers: RuntimeHistoryApplyHandlers,
): Promise<RuntimeHistoryEntry | null> {
  if (entry.type === 'reversibleEdit') return await entry.redo() ? entry : null;
  if (entry.type === 'layout') {
    handlers.applyLayoutDrafts(entry.entry.after);
    handlers.persistLayoutSnapshot(entry.entry.after);
    return entry;
  }

  if (entry.type === 'createdBlock') {
    if (!handlers.restoreBlockForHistory) return null;
    const restored = await handlers.restoreBlockForHistory(entry.block, { silent: true });
    return restored ? { type: 'createdBlock', block: restored } : null;
  }

  if (entry.type === 'structuredMutation') {
    if (!handlers.persistStructuredObject) return null;
    const saved = await handlers.persistStructuredObject(entry.objectId, entry.after);
    return saved ? entry : null;
  }

  if (!handlers.trashBlockForHistory) return null;
  const removed = await handlers.trashBlockForHistory(entry.block.id, { silent: true });
  return removed ? entry : null;
}
