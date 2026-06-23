import type {
  ContentGroupV1,
  GroupFolderOrigin,
  GroupFolderScopeKind,
  GroupFolderScopeV1,
  GroupFolderStatus,
  GroupFolderV1,
} from './runtimeDataTypes';

function createRuntimeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanTitle(title: string | null | undefined): string {
  const trimmed = (title || '').trim();
  return trimmed || 'Untitled folder';
}

function cloneMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object'
    ? { ...(metadata as Record<string, unknown>) }
    : {};
}

function normalizeScopeKind(kind: unknown): GroupFolderScopeKind {
  if (kind === 'workspace' || kind === 'project' || kind === 'note' || kind === 'custom') return kind;
  return 'custom';
}

function normalizeOrigin(origin: unknown): GroupFolderOrigin {
  if (origin === 'system' || origin === 'ai_proposal') return origin;
  return 'human';
}

function normalizeStatus(status: unknown): GroupFolderStatus {
  if (status === 'archived' || status === 'deleted') return status;
  return 'active';
}

export function normalizeGroupFolderScope(scope: Partial<GroupFolderScopeV1> | null | undefined): GroupFolderScopeV1 {
  return {
    kind: normalizeScopeKind(scope?.kind),
    project_id: typeof scope?.project_id === 'string' ? scope.project_id : null,
    note_id: typeof scope?.note_id === 'string' ? scope.note_id : null,
    label: typeof scope?.label === 'string' && scope.label.trim() ? scope.label.trim() : null,
  };
}

export function groupFolderScopeKey(scope: Partial<GroupFolderScopeV1> | null | undefined): string {
  const normalized = normalizeGroupFolderScope(scope);
  return [
    normalized.kind,
    normalized.project_id || '',
    normalized.note_id || '',
    normalized.label || '',
  ].join('|');
}

export function systemGroupFolderId(scope: Partial<GroupFolderScopeV1> | null | undefined): string {
  return `group-folder-root-${groupFolderScopeKey(scope).replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

export function createGroupFolder(input: {
  title: string;
  scope: GroupFolderScopeV1;
  parentFolderId?: string | null;
  origin?: GroupFolderOrigin;
  systemRoot?: boolean;
  orderIndex?: number;
  metadata?: Record<string, unknown>;
}): GroupFolderV1 {
  const timestamp = nowIso();
  const scope = normalizeGroupFolderScope(input.scope);
  const systemRoot = Boolean(input.systemRoot);
  return {
    id: systemRoot ? systemGroupFolderId(scope) : createRuntimeId('group-folder'),
    title: cleanTitle(input.title),
    parent_folder_id: input.parentFolderId || null,
    scope,
    origin: input.origin || (systemRoot ? 'system' : 'human'),
    system_root: systemRoot,
    status: 'active',
    order_index: Number.isFinite(input.orderIndex) ? input.orderIndex || 0 : 0,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: cloneMetadata(input.metadata),
  };
}

export function normalizeGroupFolder(folder: Partial<GroupFolderV1>): GroupFolderV1 {
  const createdAt = folder.created_at || nowIso();
  return {
    id: typeof folder.id === 'string' && folder.id ? folder.id : createRuntimeId('group-folder'),
    title: cleanTitle(folder.title),
    parent_folder_id: typeof folder.parent_folder_id === 'string' ? folder.parent_folder_id : null,
    scope: normalizeGroupFolderScope(folder.scope),
    origin: normalizeOrigin(folder.origin),
    system_root: Boolean(folder.system_root),
    status: normalizeStatus(folder.status),
    order_index: Number.isFinite(folder.order_index) ? folder.order_index || 0 : 0,
    created_at: createdAt,
    updated_at: folder.updated_at || createdAt,
    metadata: cloneMetadata(folder.metadata),
  };
}

export function normalizeGroupFolders(folders: unknown): GroupFolderV1[] {
  if (!Array.isArray(folders)) return [];
  return folders
    .filter((folder): folder is Partial<GroupFolderV1> => Boolean(folder) && typeof folder === 'object')
    .map(normalizeGroupFolder)
    .sort((a, b) => a.order_index - b.order_index);
}

export function ensureGroupFolderRoots(input: {
  folders: GroupFolderV1[];
  projectId?: string | null;
  noteId?: string | null;
}): GroupFolderV1[] {
  const scopes: GroupFolderScopeV1[] = [
    { kind: 'workspace', project_id: null, note_id: null, label: null },
  ];
  if (input.projectId) {
    scopes.push({ kind: 'project', project_id: input.projectId, note_id: null, label: null });
  }
  if (input.projectId && input.noteId) {
    scopes.push({ kind: 'note', project_id: input.projectId, note_id: input.noteId, label: null });
  }

  const byId = new Map(input.folders.map((folder) => [folder.id, folder]));
  scopes.forEach((scope, index) => {
    const id = systemGroupFolderId(scope);
    if (byId.has(id)) return;
    const title = scope.kind === 'workspace'
      ? 'Workspace groups'
      : scope.kind === 'project'
        ? 'Project groups'
        : 'Note groups';
    byId.set(id, createGroupFolder({
      title,
      scope,
      systemRoot: true,
      orderIndex: index,
    }));
  });
  return Array.from(byId.values()).sort((a, b) => a.order_index - b.order_index);
}

export function canMoveGroupFolder(input: {
  folders: GroupFolderV1[];
  folderId: string;
  nextParentFolderId: string | null;
}): boolean {
  const folder = input.folders.find((item) => item.id === input.folderId);
  if (!folder || folder.system_root) return false;
  if (!input.nextParentFolderId) return true;
  if (input.nextParentFolderId === input.folderId) return false;

  let cursor = input.folders.find((item) => item.id === input.nextParentFolderId) || null;
  if (!cursor || cursor.status === 'deleted') return false;
  while (cursor) {
    if (cursor.id === input.folderId) return false;
    cursor = cursor.parent_folder_id
      ? input.folders.find((item) => item.id === cursor?.parent_folder_id) || null
      : null;
  }
  return true;
}

export function moveGroupFolder(input: {
  folders: GroupFolderV1[];
  folderId: string;
  nextParentFolderId: string | null;
}): GroupFolderV1[] {
  if (!canMoveGroupFolder(input)) return input.folders;
  const timestamp = nowIso();
  return input.folders.map((folder) => (
    folder.id === input.folderId
      ? { ...folder, parent_folder_id: input.nextParentFolderId, updated_at: timestamp }
      : folder
  ));
}

export function renameGroupFolder(input: {
  folders: GroupFolderV1[];
  folderId: string;
  title: string;
}): GroupFolderV1[] {
  const timestamp = nowIso();
  return input.folders.map((folder) => (
    folder.id === input.folderId && !folder.system_root
      ? { ...folder, title: cleanTitle(input.title), updated_at: timestamp }
      : folder
  ));
}

export function archiveGroupFolder(input: {
  folders: GroupFolderV1[];
  folderId: string;
}): GroupFolderV1[] {
  const timestamp = nowIso();
  return input.folders.map((folder) => (
    folder.id === input.folderId && !folder.system_root
      ? { ...folder, status: 'archived', updated_at: timestamp }
      : folder
  ));
}

export function activeGroupFolders(folders: GroupFolderV1[]): GroupFolderV1[] {
  return folders
    .filter((folder) => folder.status === 'active')
    .sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title));
}

export function deleteGroupFolder(input: {
  folders: GroupFolderV1[];
  groups?: ContentGroupV1[];
  folderId: string;
  allowNonEmpty?: boolean;
}): GroupFolderV1[] {
  const folder = input.folders.find((item) => item.id === input.folderId);
  if (!folder || folder.system_root) return input.folders;
  const hasChildren = input.folders.some((item) => item.parent_folder_id === input.folderId && item.status !== 'deleted');
  const hasGroups = (input.groups || []).some((group) => (
    group.status !== 'deleted'
    && (
      group.folder_id === input.folderId
      || group.placements?.some((placement) => placement.folder_id === input.folderId)
    )
  ));
  if ((hasChildren || hasGroups) && !input.allowNonEmpty) return input.folders;
  const timestamp = nowIso();
  return input.folders.map((item) => (
    item.id === input.folderId
      ? { ...item, status: 'deleted', updated_at: timestamp }
      : item
  ));
}

export function groupFolderChildren(
  folders: GroupFolderV1[],
  folderId: string | null | undefined,
  options: { includeArchived?: boolean } = {},
): GroupFolderV1[] {
  if (!folderId) return [];
  return folders
    .filter((folder) => (
      folder.parent_folder_id === folderId
      && folder.status !== 'deleted'
      && (options.includeArchived || folder.status === 'active')
    ))
    .sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title));
}

export function canDeleteGroupFolder(input: {
  folders: GroupFolderV1[];
  groups?: ContentGroupV1[];
  folderId: string;
}): boolean {
  const folder = input.folders.find((item) => item.id === input.folderId);
  if (!folder || folder.system_root) return false;
  const hasChildren = groupFolderChildren(input.folders, input.folderId, { includeArchived: true }).length > 0;
  const hasGroups = (input.groups || []).some((group) => (
    group.status !== 'deleted'
    && (
      group.folder_id === input.folderId
      || group.placements?.some((placement) => placement.folder_id === input.folderId)
    )
  ));
  return !hasChildren && !hasGroups;
}

export function groupFolderPath(folders: GroupFolderV1[], folderId: string | null | undefined): GroupFolderV1[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: GroupFolderV1[] = [];
  const seen = new Set<string>();
  let cursor = byId.get(folderId) || null;
  while (cursor) {
    if (seen.has(cursor.id)) break;
    seen.add(cursor.id);
    path.unshift(cursor);
    cursor = cursor.parent_folder_id ? byId.get(cursor.parent_folder_id) || null : null;
  }
  return path;
}

export function resolveGroupFolderPath(folders: GroupFolderV1[], folderId: string | null | undefined): string[] {
  return groupFolderPath(folders, folderId).map((folder) => folder.title);
}

export function groupFolderDerivedDepth(folders: GroupFolderV1[], folderId: string | null | undefined): number {
  const path = groupFolderPath(folders, folderId);
  return Math.max(0, path.length - 1);
}

export interface GroupFolderIntegrityIssue {
  folder_id: string;
  status: 'missing_parent' | 'cycle' | 'system_root_deleted';
  reason: string;
}

export function validateGroupFolderGraph(folders: GroupFolderV1[]): GroupFolderIntegrityIssue[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const issues: GroupFolderIntegrityIssue[] = [];

  folders.forEach((folder) => {
    if (folder.system_root && folder.status === 'deleted') {
      issues.push({
        folder_id: folder.id,
        status: 'system_root_deleted',
        reason: 'system root folders cannot be deleted while their scope exists',
      });
    }

    if (folder.parent_folder_id && !byId.has(folder.parent_folder_id)) {
      issues.push({
        folder_id: folder.id,
        status: 'missing_parent',
        reason: `parent folder ${folder.parent_folder_id} is missing`,
      });
    }

    const seen = new Set<string>();
    let cursor: GroupFolderV1 | undefined = folder;
    while (cursor) {
      if (seen.has(cursor.id)) {
        issues.push({
          folder_id: folder.id,
          status: 'cycle',
          reason: 'folder parent chain contains a cycle',
        });
        break;
      }
      seen.add(cursor.id);
      cursor = cursor.parent_folder_id ? byId.get(cursor.parent_folder_id) : undefined;
    }
  });

  return issues;
}
