import { listNotes } from '../services/notes.js';

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

export const TOOL_BINDINGS: ReadonlyMap<string, ToolBinding> = new Map([
  ['list_notes', listNotesBinding],
]);
