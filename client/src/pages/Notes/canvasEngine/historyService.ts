import type { NoteBlock } from './runtimeDataTypes';
import type { LayoutHistoryEntry } from './runtimeLayout';

export type RuntimeHistoryEntry =
  | { type: 'layout'; entry: LayoutHistoryEntry }
  | { type: 'createdBlock'; block: NoteBlock }
  | { type: 'trashedBlock'; block: NoteBlock };

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
