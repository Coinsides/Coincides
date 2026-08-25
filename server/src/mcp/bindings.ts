import { AppError } from '../middleware/errorHandler.js';
import { listNotes, trashNoteAsUser } from '../services/notes.js';
import { resolveSelection } from '../services/selectionResolve.js';
import { resolveSelectionInputSchema } from '../toolFace/registry.js';

export interface ToolBindingContext {
  userId: string;
}

export type ToolBinding = (
  input: Record<string, unknown>,
  context: ToolBindingContext,
) => unknown | Promise<unknown>;

const listNotesBinding: ToolBinding = (input, context) => {
  const args = input as { course_id?: string; status?: string };
  return listNotes({
    userId: context.userId,
    courseId: args.course_id,
    status: args.status,
  });
};

const resolveSelectionBinding: ToolBinding = (input, context) => {
  const parsed = resolveSelectionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid selection receipt', parsed.error.errors);
  }
  return resolveSelection(context.userId, parsed.data);
};

const trashNotesBinding: ToolBinding = (input, context) => {
  const args = input as { note_ids: string[] };
  return {
    results: args.note_ids.map((noteId) => ({
      note_id: noteId,
      ...trashNoteAsUser({ userId: context.userId, noteId }),
    })),
  };
};

export const TOOL_BINDINGS: ReadonlyMap<string, ToolBinding> = new Map([
  ['list_notes', listNotesBinding],
  ['resolve_selection', resolveSelectionBinding],
  ['trash_notes', trashNotesBinding],
]);
