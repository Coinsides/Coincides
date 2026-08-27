import { AppError } from '../middleware/errorHandler.js';
import { getDb } from '../db/init.js';
import { listContentGroups } from '../services/contentGroups.js';
import { getItem, listItems } from '../services/items.js';
import { listNotes, trashNoteAsUser } from '../services/notes.js';
import { getRelation, listRelations, listRelationTypes } from '../services/relations.js';
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

const listItemsBinding: ToolBinding = (input, context) => {
  return listItems(
    getDb(),
    context.userId,
    input as Parameters<typeof listItems>[2],
  );
};

const getItemBinding: ToolBinding = (input, context) => {
  const args = input as { item_id: string };
  return getItem(getDb(), context.userId, args.item_id);
};

const listContentGroupsBinding: ToolBinding = (input, context) => {
  return listContentGroups(
    getDb(),
    context.userId,
    input as Parameters<typeof listContentGroups>[2],
  );
};

const listRelationsBinding: ToolBinding = (input, context) => {
  return listRelations(
    getDb(),
    context.userId,
    input as Parameters<typeof listRelations>[2],
  );
};

const getRelationBinding: ToolBinding = (input, context) => {
  const args = input as { relation_id: string };
  return getRelation(getDb(), context.userId, args.relation_id);
};

const listRelationTypesBinding: ToolBinding = () => listRelationTypes();

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
  ['list_items', listItemsBinding],
  ['get_item', getItemBinding],
  ['list_content_groups', listContentGroupsBinding],
  ['list_relations', listRelationsBinding],
  ['get_relation', getRelationBinding],
  ['list_relation_types', listRelationTypesBinding],
  ['resolve_selection', resolveSelectionBinding],
  ['trash_notes', trashNotesBinding],
]);
