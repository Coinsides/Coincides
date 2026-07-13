import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { listContentGroupFolderPlacementsForGroup } from './groupFolders.js';

type ContentGroupStatus = 'active' | 'hidden' | 'deleted';
type ContentGroupCreatedBy = 'human' | 'ai_proposal' | 'importer';
type ContentGroupIdentityStatus = 'none' | 'draft' | 'accepted' | 'rejected' | 'archived';
type ContentGroupIdentityCreatedBy = 'human' | 'ai' | 'system';

interface ListContentGroupsInput {
  course_id?: string;
  note_id?: string;
  status?: ContentGroupStatus | 'all';
}

interface ContentGroupRow {
  id: string;
  user_id: string;
  course_id: string;
  note_id: string | null;
  canvas_id: string | null;
  primary_folder_id: string | null;
  parent_group_id: string | null;
  title: string;
  status: string;
  created_by: string;
  identity_status: string;
  identity_type: string | null;
  identity_role: string | null;
  identity_topic: string | null;
  identity_summary: string | null;
  identity_created_by: string | null;
  identity_reviewed_by: string | null;
  identity_confidence: number | null;
  identity_updated_at: string | null;
  identity_accepted_at: string | null;
  identity_metadata: string | null;
  placements_json: string;
  members_json: string;
  view_state_json: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface ContentGroupMemberRow {
  id: string;
  user_id: string;
  content_group_id: string;
  course_id: string;
  note_id: string | null;
  kind: string;
  target_id: string | null;
  item_id: string | null;
  label: string | null;
  current_content: string | null;
  preview_text: string | null;
  content_range_json: string | null;
  source_ref_json: string | null;
  source_sync_status: string;
  order_index: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeStatus(value: unknown): ContentGroupStatus {
  if (value === 'hidden' || value === 'deleted') return value;
  return 'active';
}

function normalizeCreatedBy(value: unknown): ContentGroupCreatedBy {
  if (value === 'ai_proposal' || value === 'importer') return value;
  return 'human';
}

function normalizeIdentityStatus(value: unknown): ContentGroupIdentityStatus {
  if (value === 'draft' || value === 'accepted' || value === 'rejected' || value === 'archived') return value;
  return 'none';
}

function normalizeIdentityCreatedBy(value: unknown): ContentGroupIdentityCreatedBy {
  if (value === 'ai' || value === 'system') return value;
  return 'human';
}

function normalizeMemberKind(value: unknown): string {
  const allowed = new Set([
    'content_range',
    'annotation',
    'block',
    'content_group',
    'page_slice',
    'canvas_object',
    'table_region',
    'image_region',
    'future_object',
    'item',
  ]);
  return typeof value === 'string' && allowed.has(value) ? value : 'content_range';
}

function normalizeSourceSyncStatus(value: unknown): string {
  if (
    value === 'fresh'
    || value === 'changed'
    || value === 'missing'
    || value === 'detached'
    || value === 'unsupported'
    || value === 'stale'
  ) {
    return value;
  }
  return 'fresh';
}

function ensureCourse(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function ensureNote(db: Database.Database, userId: string, noteId: string): { id: string; course_id: string } {
  const note = db.prepare('SELECT id, course_id FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as { id: string; course_id: string } | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

function courseIdForInput(input: Record<string, unknown>, note?: { course_id: string }): string {
  return cleanText(input.course_id || input.project_id || note?.course_id, '');
}

function hydrateContentGroupMember(row: ContentGroupMemberRow) {
  const kind = normalizeMemberKind(row.kind);
  const itemId = kind === 'item' ? row.item_id || null : null;
  const missingItem = kind === 'item' && !itemId;
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  return {
    id: row.id,
    kind,
    target_id: kind === 'item' ? null : row.target_id || null,
    item_id: itemId,
    content_range: parseJson<Record<string, unknown> | null>(row.content_range_json, null),
    label: row.label || null,
    current_content: row.current_content ?? null,
    source_ref: parseJson<Record<string, unknown> | null>(row.source_ref_json, null),
    source_sync_status: missingItem ? 'missing' : normalizeSourceSyncStatus(row.source_sync_status),
    preview_text: row.preview_text ?? null,
    order_index: Number(row.order_index || 0),
    metadata: missingItem
      ? {
          ...metadata,
          integrity_status: 'orphaned',
          integrity_reason: 'missing_item_reference',
        }
      : metadata,
  };
}

function listContentGroupMembers(
  db: Database.Database,
  userId: string,
  groupId: string,
) {
  return (db.prepare(`
    SELECT *
    FROM content_group_members
    WHERE user_id = ? AND content_group_id = ?
    ORDER BY order_index ASC, created_at ASC, id ASC
  `).all(userId, groupId) as ContentGroupMemberRow[]).map(hydrateContentGroupMember);
}

function hydrateContentGroup(
  row: ContentGroupRow,
  placementRows?: any[],
  memberRows?: any[],
) {
  const legacyPlacements = parseJson<any[]>(row.placements_json, []);
  const placements = placementRows && placementRows.length > 0 ? placementRows : legacyPlacements;
  const members = memberRows && memberRows.length > 0
    ? memberRows
    : parseJson<any[]>(row.members_json, []);
  const primaryPlacement = placements.find((placement) => placement?.placement_role === 'primary') || placements[0];
  const folderId = optionalText(primaryPlacement?.folder_id) || row.primary_folder_id || null;
  const identityType = row.identity_type || row.identity_role || null;

  return {
    id: row.id,
    project_id: row.course_id,
    note_id: row.note_id || '',
    canvas_id: row.canvas_id || '',
    folder_id: folderId,
    parent_group_id: row.parent_group_id || null,
    placements,
    depth: 0,
    title: row.title,
    status: normalizeStatus(row.status),
    created_by: normalizeCreatedBy(row.created_by),
    created_at: row.created_at,
    updated_at: row.updated_at,
    members,
    identity: {
      status: normalizeIdentityStatus(row.identity_status),
      type: identityType,
      role: identityType,
      topic: row.identity_topic || null,
      summary: row.identity_summary || null,
      created_by: normalizeIdentityCreatedBy(row.identity_created_by),
      reviewed_by: row.identity_reviewed_by === 'human' || row.identity_reviewed_by === 'ai' || row.identity_reviewed_by === 'system'
        ? row.identity_reviewed_by
        : null,
      confidence: typeof row.identity_confidence === 'number' ? row.identity_confidence : null,
      updated_at: row.identity_updated_at || row.updated_at,
      accepted_at: row.identity_accepted_at || null,
      metadata: parseJson<Record<string, unknown>>(row.identity_metadata, {}),
    },
    view_state: parseJson<Record<string, unknown>>(row.view_state_json, {}),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function contentGroupDbValues(userId: string, input: Record<string, any>, note?: { course_id: string }) {
  const now = new Date().toISOString();
  const courseId = courseIdForInput(input, note);
  const identity = input.identity && typeof input.identity === 'object' ? input.identity : {};
  const identityType = optionalText(identity.type) ?? optionalText(identity.role);
  const placements = Array.isArray(input.placements) ? input.placements : [];
  const folderId = optionalText(input.folder_id) || optionalText(placements[0]?.folder_id);

  return {
    id: cleanText(input.id, uuidv4()),
    user_id: userId,
    course_id: courseId,
    note_id: optionalText(input.note_id),
    canvas_id: optionalText(input.canvas_id),
    primary_folder_id: folderId,
    parent_group_id: optionalText(input.parent_group_id),
    title: cleanText(input.title, 'Untitled group'),
    status: normalizeStatus(input.status),
    created_by: normalizeCreatedBy(input.created_by),
    identity_status: normalizeIdentityStatus(identity.status),
    identity_type: identityType,
    identity_topic: optionalText(identity.topic),
    identity_summary: optionalText(identity.summary),
    identity_created_by: normalizeIdentityCreatedBy(identity.created_by),
    identity_reviewed_by: identity.reviewed_by === 'human' || identity.reviewed_by === 'ai' || identity.reviewed_by === 'system'
      ? identity.reviewed_by
      : null,
    identity_confidence: typeof identity.confidence === 'number' ? identity.confidence : null,
    identity_updated_at: typeof identity.updated_at === 'string' ? identity.updated_at : now,
    identity_accepted_at: typeof identity.accepted_at === 'string' ? identity.accepted_at : null,
    identity_metadata: stringifyJson(identity.metadata, {}),
    placements_json: stringifyJson(placements, []),
    members_json: stringifyJson([], []),
    view_state_json: stringifyJson(input.view_state, {}),
    metadata: stringifyJson(input.metadata, {}),
    created_at: typeof input.created_at === 'string' ? input.created_at : now,
    updated_at: now,
  };
}

function contentGroupMemberDbValues(input: {
  userId: string;
  groupId: string;
  courseId: string;
  noteId: string | null;
  member: Record<string, any>;
  orderIndex: number;
}) {
  const member = input.member && typeof input.member === 'object' ? input.member : {};
  const sourceRef = member.source_ref && typeof member.source_ref === 'object' ? member.source_ref : null;
  const kind = normalizeMemberKind(member.kind);
  return {
    id: cleanText(member.id, `content-group-member-${uuidv4()}`),
    user_id: input.userId,
    content_group_id: input.groupId,
    course_id: input.courseId,
    note_id: input.noteId,
    kind,
    target_id: kind === 'item' ? null : optionalText(member.target_id),
    item_id: kind === 'item' ? optionalText(member.item_id) : null,
    label: optionalText(member.label),
    current_content: typeof member.current_content === 'string' ? member.current_content : null,
    preview_text: typeof member.preview_text === 'string' ? member.preview_text : null,
    content_range_json: member.content_range ? stringifyJson(member.content_range, null) : null,
    source_ref_json: sourceRef ? stringifyJson(sourceRef, null) : null,
    source_sync_status: normalizeSourceSyncStatus(member.source_sync_status ?? sourceRef?.status),
    order_index: input.orderIndex,
    metadata: stringifyJson(member.metadata, {}),
  };
}

function replaceContentGroupMembers(
  db: Database.Database,
  userId: string,
  groupId: string,
  courseId: string,
  noteId: string | null,
  members: Record<string, any>[],
) {
  const existingIds = new Set((db.prepare(`
    SELECT id
    FROM content_group_members
    WHERE user_id = ? AND content_group_id = ?
  `).all(userId, groupId) as Array<{ id: string }>).map((row) => row.id));
  const keepIds = new Set<string>();
  const upsertMember = db.prepare(`
    INSERT INTO content_group_members (
      id, user_id, content_group_id, course_id, note_id,
      kind, target_id, item_id, label, current_content, preview_text,
      content_range_json, source_ref_json, source_sync_status,
      order_index, metadata, updated_at
    )
    VALUES (
      @id, @user_id, @content_group_id, @course_id, @note_id,
      @kind, @target_id, @item_id, @label, @current_content, @preview_text,
      @content_range_json, @source_ref_json, @source_sync_status,
      @order_index, @metadata, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      course_id = excluded.course_id,
      note_id = excluded.note_id,
      kind = excluded.kind,
      target_id = excluded.target_id,
      item_id = excluded.item_id,
      label = excluded.label,
      current_content = excluded.current_content,
      preview_text = excluded.preview_text,
      content_range_json = excluded.content_range_json,
      source_ref_json = excluded.source_ref_json,
      source_sync_status = excluded.source_sync_status,
      order_index = excluded.order_index,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
      WHERE content_group_members.user_id = excluded.user_id
        AND content_group_members.content_group_id = excluded.content_group_id
  `);

  members.forEach((member, index) => {
    const values = contentGroupMemberDbValues({
      userId,
      groupId,
      courseId,
      noteId,
      member,
      orderIndex: index,
    });
    keepIds.add(values.id);
    upsertMember.run(values);
  });

  const removedIds = new Set([...existingIds].filter((id) => !keepIds.has(id)));
  if (removedIds.size > 0) {
    const deleteMember = db.prepare(`
      DELETE FROM content_group_members
      WHERE user_id = ? AND content_group_id = ? AND id = ?
    `);
    for (const memberId of removedIds) {
      deleteMember.run(userId, groupId, memberId);
    }
  }
  return removedIds;
}

function assertGroupOwnership(db: Database.Database, userId: string, groupId: string): void {
  const existing = db.prepare('SELECT user_id FROM content_groups WHERE id = ?').get(groupId) as { user_id: string } | undefined;
  if (existing && existing.user_id !== userId) throw new AppError(404, 'Content group not found');
}

export function listContentGroups(
  db: Database.Database,
  userId: string,
  input: ListContentGroupsInput,
) {
  const note = optionalText(input.note_id) ? ensureNote(db, userId, String(input.note_id)) : undefined;
  const courseId = optionalText(input.course_id) || note?.course_id;
  if (!courseId) throw new AppError(400, 'course_id or note_id is required');
  ensureCourse(db, userId, courseId);
  if (note && note.course_id !== courseId) throw new AppError(400, 'Note does not belong to course');
  const conditions = ['user_id = ?', 'course_id = ?'];
  const params: unknown[] = [userId, courseId];

  if (input.note_id) {
    conditions.push('note_id = ?');
    params.push(input.note_id);
  }
  if (input.status && input.status !== 'all') {
    conditions.push('status = ?');
    params.push(input.status);
  } else if (!input.status) {
    conditions.push("status != 'deleted'");
  }

  return (db.prepare(`
    SELECT *
    FROM content_groups
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC, created_at DESC
  `).all(...params) as ContentGroupRow[]).map((row) => hydrateContentGroup(
    row,
    listContentGroupFolderPlacementsForGroup(db, userId, row.id),
    listContentGroupMembers(db, userId, row.id),
  ));
}

export function getContentGroup(db: Database.Database, userId: string, groupId: string) {
  const row = db.prepare('SELECT * FROM content_groups WHERE id = ? AND user_id = ?')
    .get(groupId, userId) as ContentGroupRow | undefined;
  if (!row) throw new AppError(404, 'Content group not found');
  return hydrateContentGroup(
    row,
    listContentGroupFolderPlacementsForGroup(db, userId, row.id),
    listContentGroupMembers(db, userId, row.id),
  );
}

export function upsertContentGroup(db: Database.Database, userId: string, input: Record<string, any>) {
  const note = optionalText(input.note_id) ? ensureNote(db, userId, String(input.note_id)) : undefined;
  const values = contentGroupDbValues(userId, input, note);
  if (!values.course_id) throw new AppError(400, 'course_id, project_id, or note_id is required');
  ensureCourse(db, userId, values.course_id);
  if (note && note.course_id !== values.course_id) throw new AppError(400, 'Note does not belong to course');
  assertGroupOwnership(db, userId, values.id);

  return db.transaction(() => {
    db.prepare(`
      INSERT INTO content_groups (
        id, user_id, course_id, note_id, canvas_id, primary_folder_id, parent_group_id,
        title, status, created_by,
        identity_status, identity_type, identity_topic, identity_summary,
        identity_created_by, identity_reviewed_by, identity_confidence,
        identity_updated_at, identity_accepted_at, identity_metadata,
        placements_json, members_json,
        view_state_json, metadata, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @course_id, @note_id, @canvas_id, @primary_folder_id, @parent_group_id,
        @title, @status, @created_by,
        @identity_status, @identity_type, @identity_topic, @identity_summary,
        @identity_created_by, @identity_reviewed_by, @identity_confidence,
        @identity_updated_at, @identity_accepted_at, @identity_metadata,
        @placements_json, @members_json,
        @view_state_json, @metadata, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        course_id = excluded.course_id,
        note_id = excluded.note_id,
        canvas_id = excluded.canvas_id,
        primary_folder_id = excluded.primary_folder_id,
        parent_group_id = excluded.parent_group_id,
        title = excluded.title,
        status = excluded.status,
        identity_status = excluded.identity_status,
        identity_type = excluded.identity_type,
        identity_topic = excluded.identity_topic,
        identity_summary = excluded.identity_summary,
        identity_created_by = excluded.identity_created_by,
        identity_reviewed_by = excluded.identity_reviewed_by,
        identity_confidence = excluded.identity_confidence,
        identity_updated_at = excluded.identity_updated_at,
        identity_accepted_at = excluded.identity_accepted_at,
        identity_metadata = excluded.identity_metadata,
        placements_json = excluded.placements_json,
        members_json = excluded.members_json,
        view_state_json = excluded.view_state_json,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(values);

    replaceContentGroupMembers(
      db,
      userId,
      values.id,
      values.course_id,
      values.note_id,
      Array.isArray(input.members) ? input.members : [],
    );

    return getContentGroup(db, userId, values.id);
  })();
}

export function deleteContentGroupMember(
  db: Database.Database,
  userId: string,
  groupId: string,
  memberId: string,
) {
  getContentGroup(db, userId, groupId);
  return db.transaction(() => {
    db.prepare(`
      DELETE FROM content_group_members
      WHERE user_id = ? AND content_group_id = ? AND id = ?
    `).run(userId, groupId, memberId);
    return getContentGroup(db, userId, groupId);
  })();
}

export function replaceNoteContentGroups(
  db: Database.Database,
  userId: string,
  noteId: string,
  groups: Record<string, any>[],
) {
  const note = ensureNote(db, userId, noteId);
  return db.transaction(() => {
    const nextGroups = groups.map((group) => upsertContentGroup(db, userId, {
      ...group,
      course_id: group.course_id || group.project_id || note.course_id,
      project_id: group.project_id || group.course_id || note.course_id,
      note_id: noteId,
    }));
    const keepIds = new Set(nextGroups.map((group) => group.id));
    const existing = listContentGroups(db, userId, { course_id: note.course_id, note_id: noteId, status: 'all' });
    const now = new Date().toISOString();

    for (const group of existing) {
      if (!keepIds.has(group.id) && group.status !== 'deleted') {
        db.prepare("UPDATE content_groups SET status = 'deleted', updated_at = ? WHERE id = ? AND user_id = ?")
          .run(now, group.id, userId);
      }
    }

    return listContentGroups(db, userId, { course_id: note.course_id, note_id: noteId });
  })();
}
