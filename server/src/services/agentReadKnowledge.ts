import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { listAnnotationTruths } from './annotationTruths.js';
import { listContentGroups } from './contentGroups.js';
import { listItemSummaries } from './itemSummaries.js';
import { getNote, listNoteBlocks } from './notes.js';
import { listRelations } from './relations.js';

export const READ_GROUP_LIMIT = 100;
export const READ_MEMBER_LIMIT = 200;
export const READ_ANNOTATION_LIMIT = 200;
export const READ_RANGE_LIMIT = 200;
export const READ_RELATION_LIMIT = 200;
export const READ_RELATION_SCOPE_LIMIT = 200;
export const READ_SUMMARY_LENGTH = 200;

// SQLite substr(..., 1, 200), used by courseCards, counts Unicode code points.
function summarize(value: unknown) {
  const characters = Array.from(typeof value === 'string' ? value.trim() : '');
  return { plain_text: characters.slice(0, READ_SUMMARY_LENGTH).join(''), text_truncated: characters.length > READ_SUMMARY_LENGTH };
}

export function readContentGroupsForAgent(
  db: Database.Database,
  userId: string,
  input: { course_id?: string; note_id?: string },
) {
  const groups = listContentGroups(db, userId, input);
  let remainingMembers = READ_MEMBER_LIMIT;
  const selected = groups.slice(0, READ_GROUP_LIMIT).map((group) => {
    const members = group.members.slice(0, remainingMembers);
    remainingMembers -= members.length;
    return { group, members };
  });
  const itemIds: string[] = selected.flatMap(({ members }) => members
    .filter((member: { kind?: string; item_id?: string }) => member.kind === 'item' && member.item_id)
    .map((member: { item_id: string }) => member.item_id));
  const items = new Map(listItemSummaries(db, userId, itemIds).map((item) => [item.id, item]));
  const projectedGroups = selected.map(({ group, members }) => ({
    id: group.id, course_id: group.project_id, note_id: group.note_id || null,
    title: group.title, status: group.status,
    members: members.map((member: Record<string, any>) => ({
      id: String(member.id), kind: String(member.kind),
      target_id: member.target_id ?? null, item_id: member.item_id ?? null,
      ...summarize(member.kind === 'item'
        ? items.get(member.item_id)?.plain_text
        : member.current_content || member.preview_text || member.label || ''),
    })),
    total_members: group.members.length,
    has_more: members.length < group.members.length,
  }));
  const hasMore = groups.length > projectedGroups.length || projectedGroups.some((group) => group.has_more);
  return { groups: projectedGroups, total_groups: groups.length,
    total_members: groups.reduce((count, group) => count + group.members.length, 0),
    has_more: hasMore, truncated: hasMore };
}

export function readAnnotationsRelationsForAgent(
  db: Database.Database,
  userId: string,
  input: { note_id?: string; item_id?: string },
) {
  // The two explicit scopes are independent: annotations belong to a Note;
  // Relations belong to Items. A note-only read follows its placed Item refs
  // and ContentGroup memberships, never treating birth provenance as scope.
  if (input.note_id) getNote({ userId, noteId: input.note_id });
  if (input.item_id && listItemSummaries(db, userId, [input.item_id]).length === 0) {
    throw new AppError(404, 'Item not found');
  }
  const annotations = input.note_id ? listAnnotationTruths(db, userId, input.note_id) : [];
  let remainingRanges = READ_RANGE_LIMIT;
  const projectedAnnotations = annotations.slice(0, READ_ANNOTATION_LIMIT).map((annotation) => {
    const ranges = annotation.ranges.slice(0, remainingRanges);
    remainingRanges -= ranges.length;
    return { id: annotation.id, note_id: annotation.note_id, text: annotation.raw_label,
      ranges, total_ranges: annotation.ranges.length, has_more: ranges.length < annotation.ranges.length,
      status: annotation.status, created_by: annotation.created_by,
      created_at: annotation.created_at, updated_at: annotation.updated_at,
      metadata: annotation.metadata };
  });
  const scopeIds = new Set<string>();
  if (input.item_id) scopeIds.add(input.item_id);
  else if (input.note_id) {
    const blocks = listNoteBlocks({ userId, noteId: input.note_id });
    for (const block of blocks) {
      if (block.block_type === 'item_ref' && typeof block.content_json.item_id === 'string') {
        scopeIds.add(block.content_json.item_id);
      }
    }
    for (const group of listContentGroups(db, userId, { note_id: input.note_id })) {
      for (const member of group.members) {
        if (member.kind === 'item' && typeof member.item_id === 'string') scopeIds.add(member.item_id);
      }
    }
  }
  const requestedIds = [...scopeIds].sort();
  const selectedIds = requestedIds.slice(0, READ_RELATION_SCOPE_LIMIT);
  const availableIds = listItemSummaries(db, userId, selectedIds).map((item) => item.id);
  const relationsById = new Map<string, ReturnType<typeof listRelations>[number]>();
  for (const itemId of availableIds) {
    for (const relation of listRelations(db, userId, { item_id: itemId, status: 'all' })) {
      relationsById.set(relation.id, relation);
    }
  }
  const relations = [...relationsById.values()].sort((a, b) =>
    b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
  const hasMore = annotations.length > projectedAnnotations.length
    || projectedAnnotations.some((annotation) => annotation.has_more)
    || requestedIds.length > selectedIds.length || relations.length > READ_RELATION_LIMIT;
  return {
    annotations_note_id: input.note_id ?? null,
    annotations: projectedAnnotations,
    // Keep judgment state, author, timestamps, receipt IDs and snapshots intact.
    relations: relations.slice(0, READ_RELATION_LIMIT),
    relation_scope: { item_ids: availableIds, total_items: requestedIds.length,
      unavailable_item_ids: selectedIds.filter((id) => !availableIds.includes(id)),
      has_more: requestedIds.length > selectedIds.length },
    total_annotations: annotations.length,
    total_ranges: annotations.reduce((count, annotation) => count + annotation.ranges.length, 0),
    total_relations: relations.length,
    relation_count_complete: requestedIds.length <= selectedIds.length,
    has_more: hasMore, truncated: hasMore,
  };
}
