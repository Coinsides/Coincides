import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

type GroupFolderStatus = 'active' | 'temporary' | 'archived' | 'deleted';
type GroupFolderOrigin = 'human' | 'system' | 'ai_proposal';
type GroupFolderScopeKind = 'workspace' | 'project' | 'note' | 'custom' | 'temporary';
type ContentGroupFolderPlacementRole = 'primary' | 'reference' | 'temporary';
type ContentGroupFolderPlacementStatus = 'active' | 'deleted';
type ContentGroupFolderPlacementAddedBy = 'human' | 'ai_proposal' | 'ai' | 'system' | 'importer';

interface GroupFolderScopeInput {
  kind?: GroupFolderScopeKind;
  project_id?: string | null;
  note_id?: string | null;
  label?: string | null;
}

interface ListGroupFoldersInput {
  course_id?: string;
  note_id?: string;
  scope_kind?: GroupFolderScopeKind;
  include_archived?: boolean;
}

interface GroupFolderRow {
  id: string;
  user_id: string;
  course_id: string | null;
  note_id: string | null;
  parent_folder_id: string | null;
  scope_kind: string;
  scope_project_id: string | null;
  scope_note_id: string | null;
  scope_label: string | null;
  title: string;
  origin: string;
  system_root: number;
  status: string;
  order_index: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

interface ContentGroupFolderPlacementRow {
  id: string;
  user_id: string;
  content_group_id: string;
  folder_id: string;
  placement_role: string;
  status: string;
  order_index: number;
  added_by: string;
  added_at: string;
  updated_at: string;
  metadata: string | null;
}

interface SetPrimaryContentGroupFolderPlacementInput {
  folder_id: string | null;
  order_index?: number;
  added_by?: ContentGroupFolderPlacementAddedBy;
  metadata?: Record<string, unknown>;
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

function normalizeStatus(value: unknown): GroupFolderStatus {
  if (value === 'temporary' || value === 'archived' || value === 'deleted') return value;
  return 'active';
}

function normalizeOrigin(value: unknown): GroupFolderOrigin {
  if (value === 'system') return 'system';
  if (value === 'ai_proposal' || value === 'ai') return 'ai_proposal';
  return 'human';
}

function normalizeScopeKind(value: unknown): GroupFolderScopeKind {
  if (value === 'workspace' || value === 'project' || value === 'custom' || value === 'temporary') return value;
  return 'note';
}

function normalizePlacementRole(value: unknown): ContentGroupFolderPlacementRole {
  if (value === 'reference' || value === 'temporary') return value;
  return 'primary';
}

function normalizePlacementStatus(value: unknown): ContentGroupFolderPlacementStatus {
  if (value === 'deleted') return 'deleted';
  return 'active';
}

function normalizePlacementAddedBy(value: unknown): ContentGroupFolderPlacementAddedBy {
  if (value === 'ai_proposal' || value === 'ai') return 'ai_proposal';
  if (value === 'system' || value === 'importer') return value;
  return 'human';
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

function workspaceRootId(userId: string): string {
  return `group-folder-root-workspace-${userId}-`;
}

function projectRootId(courseId: string): string {
  return `group-folder-root-project-${courseId}-`;
}

function noteRootId(courseId: string, noteId: string): string {
  return `group-folder-root-note-${courseId}-${noteId}-`;
}

function deleteStaleSystemRoots(
  db: Database.Database,
  userId: string,
  roots: Array<{
    id: string;
    scope_kind: 'workspace' | 'project' | 'note';
    project_id?: string | null;
    note_id?: string | null;
  }>,
): void {
  for (const root of roots) {
    if (root.scope_kind === 'workspace') {
      db.prepare(`
        DELETE FROM group_folders
        WHERE user_id = ?
          AND system_root = 1
          AND scope_kind = 'workspace'
          AND id != ?
      `).run(userId, root.id);
      continue;
    }

    if (root.scope_kind === 'project') {
      db.prepare(`
        DELETE FROM group_folders
        WHERE user_id = ?
          AND system_root = 1
          AND scope_kind = 'project'
          AND scope_project_id = ?
          AND id != ?
      `).run(userId, root.project_id || null, root.id);
      continue;
    }

    db.prepare(`
      DELETE FROM group_folders
      WHERE user_id = ?
        AND system_root = 1
        AND scope_kind = 'note'
        AND scope_project_id = ?
        AND scope_note_id = ?
        AND id != ?
    `).run(userId, root.project_id || null, root.note_id || null, root.id);
  }
}

function hydrateGroupFolder(row: GroupFolderRow) {
  return {
    id: row.id,
    title: row.title,
    parent_folder_id: row.parent_folder_id || null,
    scope: {
      kind: normalizeScopeKind(row.scope_kind),
      project_id: row.scope_project_id || null,
      note_id: row.scope_note_id || null,
      label: row.scope_label || null,
    },
    origin: normalizeOrigin(row.origin),
    system_root: Number(row.system_root) === 1,
    status: normalizeStatus(row.status),
    order_index: Number(row.order_index || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function hydrateContentGroupFolderPlacement(row: ContentGroupFolderPlacementRow) {
  return {
    id: row.id,
    content_group_id: row.content_group_id,
    folder_id: row.folder_id,
    placement_role: normalizePlacementRole(row.placement_role),
    status: normalizePlacementStatus(row.status),
    order_index: Number(row.order_index || 0),
    added_by: normalizePlacementAddedBy(row.added_by),
    added_at: row.added_at,
    updated_at: row.updated_at,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function getFolderRow(db: Database.Database, userId: string, folderId: string): GroupFolderRow {
  const row = db.prepare('SELECT * FROM group_folders WHERE id = ? AND user_id = ?')
    .get(folderId, userId) as GroupFolderRow | undefined;
  if (!row) throw new AppError(404, 'Group folder not found');
  return row;
}

function findFolderRow(db: Database.Database, userId: string, folderId: string): GroupFolderRow | null {
  return (db.prepare('SELECT * FROM group_folders WHERE id = ? AND user_id = ?')
    .get(folderId, userId) as GroupFolderRow | undefined) || null;
}

function ensureContentGroup(db: Database.Database, userId: string, groupId: string): { id: string } {
  const group = db.prepare("SELECT id FROM content_groups WHERE id = ? AND user_id = ? AND status != 'deleted'")
    .get(groupId, userId) as { id: string } | undefined;
  if (!group) throw new AppError(404, 'Content group not found');
  return group;
}

function assertParentFolder(db: Database.Database, userId: string, parentFolderId: string | null): void {
  if (!parentFolderId) return;
  const parent = getFolderRow(db, userId, parentFolderId);
  if (normalizeStatus(parent.status) === 'deleted') throw new AppError(400, 'Parent folder is deleted');
}

function assertNoFolderCycle(
  db: Database.Database,
  userId: string,
  folderId: string,
  parentFolderId: string | null,
): void {
  let cursor = parentFolderId;
  const seen = new Set<string>();

  while (cursor) {
    if (cursor === folderId) throw new AppError(400, 'Folder cannot be moved under itself');
    if (seen.has(cursor)) throw new AppError(400, 'Folder parent cycle detected');
    seen.add(cursor);
    const row = db.prepare('SELECT id, parent_folder_id FROM group_folders WHERE id = ? AND user_id = ?')
      .get(cursor, userId) as Pick<GroupFolderRow, 'id' | 'parent_folder_id'> | undefined;
    cursor = row?.parent_folder_id || null;
  }
}

function normalizeScope(input: Record<string, any>): {
  kind: GroupFolderScopeKind;
  project_id: string | null;
  note_id: string | null;
  label: string | null;
} {
  const scope = input.scope && typeof input.scope === 'object' ? input.scope as GroupFolderScopeInput : {};
  const noteId = optionalText(scope.note_id) || optionalText(input.note_id);
  const projectId = optionalText(scope.project_id) || optionalText(input.course_id) || optionalText(input.project_id);
  const kind = normalizeScopeKind(scope.kind || (noteId ? 'note' : projectId ? 'project' : 'workspace'));

  return {
    kind,
    project_id: projectId,
    note_id: noteId,
    label: optionalText(scope.label),
  };
}

function groupFolderDbValues(
  db: Database.Database,
  userId: string,
  input: Record<string, any>,
) {
  const now = new Date().toISOString();
  const scope = normalizeScope(input);
  let courseId = scope.project_id;
  let noteId = scope.note_id;

  if (scope.kind === 'note') {
    if (!noteId) throw new AppError(400, 'note scope requires note_id');
    const note = ensureNote(db, userId, noteId);
    noteId = note.id;
    courseId = note.course_id;
    if (scope.project_id && scope.project_id !== note.course_id) {
      throw new AppError(400, 'Note does not belong to project scope');
    }
    scope.project_id = note.course_id;
  } else if (scope.kind === 'project') {
    if (!courseId) throw new AppError(400, 'project scope requires project_id');
    ensureCourse(db, userId, courseId);
    scope.project_id = courseId;
    noteId = null;
  } else if (courseId) {
    ensureCourse(db, userId, courseId);
  }

  const id = cleanText(input.id, `group-folder-${uuidv4()}`);
  const parentFolderId = optionalText(input.parent_folder_id);
  const existing = findFolderRow(db, userId, id);
  if (
    existing
    && Number(existing.system_root) === 1
    && (existing.parent_folder_id || null) !== parentFolderId
  ) {
    throw new AppError(400, 'System root folder cannot be moved');
  }
  assertParentFolder(db, userId, parentFolderId);
  assertNoFolderCycle(db, userId, id, parentFolderId);

  return {
    id,
    user_id: userId,
    course_id: courseId,
    note_id: noteId,
    parent_folder_id: parentFolderId,
    scope_kind: scope.kind,
    scope_project_id: scope.project_id,
    scope_note_id: scope.note_id,
    scope_label: scope.label,
    title: cleanText(input.title, 'Untitled folder'),
    origin: normalizeOrigin(input.origin),
    system_root: input.system_root === true ? 1 : 0,
    status: normalizeStatus(input.status),
    order_index: typeof input.order_index === 'number' ? Math.trunc(input.order_index) : 0,
    metadata: stringifyJson(input.metadata, {}),
    created_at: typeof input.created_at === 'string' ? input.created_at : now,
    updated_at: now,
  };
}

export function upsertGroupFolder(db: Database.Database, userId: string, input: Record<string, any>) {
  const values = groupFolderDbValues(db, userId, input);

  db.prepare(`
    INSERT INTO group_folders (
      id, user_id, course_id, note_id, parent_folder_id,
      scope_kind, scope_project_id, scope_note_id, scope_label,
      title, origin, system_root, status, order_index, metadata,
      created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @parent_folder_id,
      @scope_kind, @scope_project_id, @scope_note_id, @scope_label,
      @title, @origin, @system_root, @status, @order_index, @metadata,
      @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      course_id = excluded.course_id,
      note_id = excluded.note_id,
      parent_folder_id = excluded.parent_folder_id,
      scope_kind = excluded.scope_kind,
      scope_project_id = excluded.scope_project_id,
      scope_note_id = excluded.scope_note_id,
      scope_label = excluded.scope_label,
      title = excluded.title,
      origin = excluded.origin,
      system_root = excluded.system_root,
      status = excluded.status,
      order_index = excluded.order_index,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
    WHERE group_folders.user_id = excluded.user_id
  `).run(values);

  return getGroupFolder(db, userId, values.id);
}

export function getGroupFolder(db: Database.Database, userId: string, folderId: string) {
  return hydrateGroupFolder(getFolderRow(db, userId, folderId));
}

function ensureProjectGroupFolderRoots(db: Database.Database, userId: string, courseId: string) {
  ensureCourse(db, userId, courseId);
  const workspace = upsertGroupFolder(db, userId, {
    id: workspaceRootId(userId),
    title: 'Workspace',
    scope: { kind: 'workspace' },
    origin: 'system',
    system_root: true,
    order_index: 0,
  });
  const project = upsertGroupFolder(db, userId, {
    id: projectRootId(courseId),
    title: 'Project groups',
    scope: { kind: 'project', project_id: courseId },
    origin: 'system',
    system_root: true,
    order_index: 1,
  });
  deleteStaleSystemRoots(db, userId, [
    { id: workspace.id, scope_kind: 'workspace' },
    { id: project.id, scope_kind: 'project', project_id: courseId },
  ]);

  return { workspace, project };
}

export function ensureNoteGroupFolderRoots(db: Database.Database, userId: string, noteId: string) {
  const note = ensureNote(db, userId, noteId);
  const roots = ensureProjectGroupFolderRoots(db, userId, note.course_id);
  const noteRoot = upsertGroupFolder(db, userId, {
    id: noteRootId(note.course_id, note.id),
    title: 'Note groups',
    scope: { kind: 'note', project_id: note.course_id, note_id: note.id },
    origin: 'system',
    system_root: true,
    order_index: 2,
  });
  deleteStaleSystemRoots(db, userId, [
    { id: noteRoot.id, scope_kind: 'note', project_id: note.course_id, note_id: note.id },
  ]);

  return {
    workspace: roots.workspace,
    project: roots.project,
    note: noteRoot,
  };
}

export function listGroupFolders(
  db: Database.Database,
  userId: string,
  input: ListGroupFoldersInput = {},
) {
  const conditions = ['user_id = ?'];
  const params: unknown[] = [userId];
  const noteId = optionalText(input.note_id);
  const courseIdInput = optionalText(input.course_id);

  if (noteId) {
    const note = ensureNote(db, userId, noteId);
    ensureNoteGroupFolderRoots(db, userId, note.id);
    conditions.push(`(
      scope_kind = 'workspace'
      OR (scope_kind = 'project' AND scope_project_id = ?)
      OR (scope_kind = 'note' AND scope_note_id = ?)
    )`);
    params.push(note.course_id, note.id);
  } else if (courseIdInput) {
    ensureProjectGroupFolderRoots(db, userId, courseIdInput);
    conditions.push(`(
      scope_kind = 'workspace'
      OR (scope_kind = 'project' AND scope_project_id = ?)
    )`);
    params.push(courseIdInput);
  } else {
    conditions.push("scope_kind = 'workspace'");
  }

  if (input.scope_kind) {
    conditions.push('scope_kind = ?');
    params.push(input.scope_kind);
  }

  if (input.include_archived) {
    conditions.push("status != 'deleted'");
  } else {
    conditions.push("status NOT IN ('archived', 'deleted')");
  }

  return (db.prepare(`
    SELECT *
    FROM group_folders
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE scope_kind
        WHEN 'workspace' THEN 0
        WHEN 'project' THEN 1
        WHEN 'note' THEN 2
        ELSE 3
      END,
      order_index ASC,
      title ASC,
      created_at ASC
  `).all(...params) as GroupFolderRow[]).map(hydrateGroupFolder);
}

export function listContentGroupFolderPlacementsForGroup(
  db: Database.Database,
  userId: string,
  contentGroupId: string,
) {
  return (db.prepare(`
    SELECT *
    FROM content_group_folder_placements
    WHERE user_id = ?
      AND content_group_id = ?
      AND status = 'active'
    ORDER BY
      CASE placement_role
        WHEN 'primary' THEN 0
        WHEN 'reference' THEN 1
        ELSE 2
      END,
      order_index ASC,
      added_at ASC
  `).all(userId, contentGroupId) as ContentGroupFolderPlacementRow[])
    .map(hydrateContentGroupFolderPlacement);
}

export function getPrimaryContentGroupFolderPlacement(
  db: Database.Database,
  userId: string,
  contentGroupId: string,
) {
  const row = db.prepare(`
    SELECT *
    FROM content_group_folder_placements
    WHERE user_id = ?
      AND content_group_id = ?
      AND placement_role = 'primary'
      AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(userId, contentGroupId) as ContentGroupFolderPlacementRow | undefined;
  return row ? hydrateContentGroupFolderPlacement(row) : null;
}

export function setPrimaryContentGroupFolderPlacement(
  db: Database.Database,
  userId: string,
  contentGroupId: string,
  input: SetPrimaryContentGroupFolderPlacementInput,
) {
  ensureContentGroup(db, userId, contentGroupId);
  const folderId = optionalText(input.folder_id);
  const now = new Date().toISOString();

  return db.transaction(() => {
    db.prepare(`
      UPDATE content_group_folder_placements
      SET status = 'deleted', updated_at = ?
      WHERE user_id = ?
        AND content_group_id = ?
        AND placement_role = 'primary'
        AND status = 'active'
    `).run(now, userId, contentGroupId);

    if (!folderId) {
      db.prepare(`
        UPDATE content_groups
        SET primary_folder_id = NULL,
            placements_json = '[]',
            updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(now, contentGroupId, userId);
      return null;
    }

    const folder = getFolderRow(db, userId, folderId);
    const folderStatus = normalizeStatus(folder.status);
    if (folderStatus === 'archived' || folderStatus === 'deleted') {
      throw new AppError(400, 'Folder is not active');
    }

    const placement = {
      id: `content-group-folder-placement-${uuidv4()}`,
      user_id: userId,
      content_group_id: contentGroupId,
      folder_id: folderId,
      placement_role: 'primary',
      status: 'active',
      order_index: typeof input.order_index === 'number' ? Math.trunc(input.order_index) : 0,
      added_by: normalizePlacementAddedBy(input.added_by),
      added_at: now,
      updated_at: now,
      metadata: stringifyJson(input.metadata, {}),
    };

    db.prepare(`
      INSERT INTO content_group_folder_placements (
        id, user_id, content_group_id, folder_id,
        placement_role, status, order_index, added_by,
        added_at, updated_at, metadata
      )
      VALUES (
        @id, @user_id, @content_group_id, @folder_id,
        @placement_role, @status, @order_index, @added_by,
        @added_at, @updated_at, @metadata
      )
    `).run(placement);

    const hydrated = hydrateContentGroupFolderPlacement(placement);
    db.prepare(`
      UPDATE content_groups
      SET primary_folder_id = ?,
          placements_json = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(folderId, JSON.stringify([hydrated]), now, contentGroupId, userId);

    return hydrated;
  })();
}

function defaultNoteScope(folder: Record<string, any>, note: { id: string; course_id: string }) {
  const scope = folder.scope && typeof folder.scope === 'object'
    ? { ...folder.scope }
    : {};

  if (!scope.kind || scope.kind === 'note') {
    return {
      ...folder,
      scope: {
        ...scope,
        kind: 'note',
        project_id: note.course_id,
        note_id: note.id,
      },
    };
  }

  if (scope.kind === 'project') {
    return {
      ...folder,
      scope: {
        ...scope,
        project_id: scope.project_id || note.course_id,
      },
    };
  }

  return folder;
}

export function importNoteGroupFolders(
  db: Database.Database,
  userId: string,
  noteId: string,
  folders: Record<string, any>[],
) {
  const note = ensureNote(db, userId, noteId);
  return db.transaction(() => {
    ensureNoteGroupFolderRoots(db, userId, note.id);
    for (const folder of folders) {
      upsertGroupFolder(db, userId, defaultNoteScope(folder, note));
    }
    return listGroupFolders(db, userId, { note_id: note.id });
  })();
}

export function replaceNoteGroupFolders(
  db: Database.Database,
  userId: string,
  noteId: string,
  folders: Record<string, any>[],
) {
  const note = ensureNote(db, userId, noteId);
  return db.transaction(() => {
    const roots = ensureNoteGroupFolderRoots(db, userId, note.id);
    const keepIds = new Set([roots.note.id]);

    for (const folder of folders) {
      const saved = upsertGroupFolder(db, userId, defaultNoteScope(folder, note));
      keepIds.add(saved.id);
    }

    const existing = db.prepare(`
      SELECT id, system_root
      FROM group_folders
      WHERE user_id = ?
        AND scope_kind = 'note'
        AND scope_note_id = ?
        AND status != 'deleted'
    `).all(userId, note.id) as Array<{ id: string; system_root: number }>;

    const now = new Date().toISOString();
    for (const folder of existing) {
      if (!keepIds.has(folder.id) && Number(folder.system_root) !== 1) {
        db.prepare("UPDATE group_folders SET status = 'deleted', updated_at = ? WHERE id = ? AND user_id = ?")
          .run(now, folder.id, userId);
      }
    }

    return listGroupFolders(db, userId, { note_id: note.id });
  })();
}

export function archiveOrDeleteGroupFolder(
  db: Database.Database,
  userId: string,
  folderId: string,
) {
  const folder = getFolderRow(db, userId, folderId);
  if (Number(folder.system_root) === 1) throw new AppError(400, 'System root folder cannot be deleted');

  const child = db.prepare(`
    SELECT id
    FROM group_folders
    WHERE user_id = ?
      AND parent_folder_id = ?
      AND status != 'deleted'
    LIMIT 1
  `).get(userId, folderId);
  if (child) throw new AppError(400, 'Folder is not empty');

  const placement = db.prepare(`
    SELECT id
    FROM content_group_folder_placements
    WHERE user_id = ?
      AND folder_id = ?
      AND status = 'active'
    LIMIT 1
  `).get(userId, folderId);
  if (placement) throw new AppError(400, 'Folder is not empty');

  db.prepare("UPDATE group_folders SET status = 'deleted', updated_at = ? WHERE id = ? AND user_id = ?")
    .run(new Date().toISOString(), folderId, userId);

  return getGroupFolder(db, userId, folderId);
}
