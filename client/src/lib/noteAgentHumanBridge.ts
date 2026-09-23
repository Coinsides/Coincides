import { useSyncExternalStore } from 'react';

export interface NotePatchReview {
  block_id: string;
  unit_id: string;
  new_text: string;
  old_text: string;
  base_revision: number;
  status: 'pending' | 'applied' | 'discarded' | 'stale';
}

export interface NotePatchReviewData {
  note_id: string;
  note_title: string;
  patches: NotePatchReview[];
}

/** A mounted human editor owns both writes and its existing undo stack. */
export interface NoteAgentHumanEditor {
  noteId: string;
  applyPatch: (proposalId: string, index: number, patch: NotePatchReview) => Promise<boolean>;
}

const editors = new Map<symbol, NoteAgentHumanEditor>();
const listeners = new Set<() => void>();
let revision = 0;
const publish = () => { revision += 1; listeners.forEach((listener) => listener()); };
export function registerNoteAgentHumanEditor(editor: NoteAgentHumanEditor): () => void {
  const owner = Symbol(editor.noteId);
  editors.set(owner, editor);
  publish();
  return () => { editors.delete(owner); publish(); };
}

export function getNoteAgentHumanEditor(noteId: string): NoteAgentHumanEditor | undefined {
  return [...editors.values()].reverse().find((editor) => editor.noteId === noteId);
}

export function useNoteAgentHumanEditor(noteId: string) {
  useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision);
  return getNoteAgentHumanEditor(noteId);
}

export function notePatchReviewData(value: unknown): NotePatchReviewData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as NotePatchReviewData;
  return typeof data.note_id === 'string' && Array.isArray(data.patches) && data.patches.every((patch) =>
    typeof patch.block_id === 'string' && typeof patch.unit_id === 'string'
    && typeof patch.old_text === 'string' && typeof patch.new_text === 'string'
    && Number.isInteger(patch.base_revision)
    && ['pending', 'applied', 'discarded', 'stale'].includes(patch.status)) ? data : null;
}
