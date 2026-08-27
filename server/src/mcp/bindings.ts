import { AppError } from '../middleware/errorHandler.js';
import { getDb } from '../db/init.js';
import { listContentGroups } from '../services/contentGroups.js';
import { getItem, listItems } from '../services/items.js';
import {
  getNote,
  listNoteBlocks,
  listNotes,
  trashNoteAsUser,
} from '../services/notes.js';
import { listRelations, listRelationTypes } from '../services/relations.js';
import { resolveSelection } from '../services/selectionResolve.js';
import { getSourceAnchorJumpTarget, listSourceAnchors } from '../services/sourceAnchors.js';
import { getSourceScopeJumpTarget, listSourceScopes } from '../services/sourceScopes.js';
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

const getNoteBinding: ToolBinding = (input, context) => {
  const args = input as { note_id: string };
  return getNote({ userId: context.userId, noteId: args.note_id });
};

const listNoteBlocksBinding: ToolBinding = (input, context) => {
  const args = input as { note_id: string };
  return listNoteBlocks({ userId: context.userId, noteId: args.note_id });
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

const listRelationTypesBinding: ToolBinding = () => listRelationTypes();

const listSourceScopesBinding: ToolBinding = (input, context) => {
  const args = input as {
    course_id: string;
    status?: 'active' | 'archived';
  };
  return listSourceScopes(
    getDb(),
    context.userId,
    args,
  );
};

const getSourceScopeJumpTargetBinding: ToolBinding = (input, context) => {
  const args = input as { scope_id: string };
  return getSourceScopeJumpTarget(getDb(), context.userId, args.scope_id);
};

const listSourceAnchorsBinding: ToolBinding = (input, context) => {
  const args = input as {
    course_id: string;
    target_type?: 'note_block' | 'note_block_source' | 'evidence_set' | 'evidence_item' | 'proposal';
    target_id?: string;
  };
  return listSourceAnchors(
    getDb(),
    context.userId,
    args,
  );
};

const getSourceAnchorJumpTargetBinding: ToolBinding = (input, context) => {
  const args = input as { anchor_id: string };
  return getSourceAnchorJumpTarget(getDb(), context.userId, args.anchor_id);
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
  ['get_note', getNoteBinding],
  ['list_note_blocks', listNoteBlocksBinding],
  ['list_items', listItemsBinding],
  ['get_item', getItemBinding],
  ['list_content_groups', listContentGroupsBinding],
  ['list_relations', listRelationsBinding],
  ['list_relation_types', listRelationTypesBinding],
  ['list_source_scopes', listSourceScopesBinding],
  ['get_source_scope_jump_target', getSourceScopeJumpTargetBinding],
  ['list_source_anchors', listSourceAnchorsBinding],
  ['get_source_anchor_jump_target', getSourceAnchorJumpTargetBinding],
  ['resolve_selection', resolveSelectionBinding],
  ['trash_notes', trashNotesBinding],
]);
