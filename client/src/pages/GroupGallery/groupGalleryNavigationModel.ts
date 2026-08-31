import type { GroupFolderV1 } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import {
  activeGroups,
  flattenGroups,
  type GalleryRecord,
  type GroupRef,
} from './groupGalleryData';

export type GalleryDestinationKey = 'all' | 'recent' | 'workspace' | `project:${string}`;

export interface GalleryDestinationRow {
  key: GalleryDestinationKey;
  kind: 'all' | 'recent' | 'workspace' | 'project';
  label: string;
  count: number | null;
  projectId: string | null;
  color: string | null;
}

export interface GalleryDestinationModel {
  primary: [GalleryDestinationRow, GalleryDestinationRow];
  scoped: GalleryDestinationRow[];
}

export interface GalleryCreationTarget {
  record: GalleryRecord;
  folder: GroupFolderV1;
}

export function normalizeGalleryDestinationKey(value: string | null | undefined): GalleryDestinationKey {
  if (value === 'recent' || value === 'workspace' || value?.startsWith('project:')) return value as GalleryDestinationKey;
  return 'all';
}

function groupFolder(record: GalleryRecord, group: GroupRef['group']): GroupFolderV1 | null {
  const folderId = group.folder_id || group.placements?.[0]?.folder_id || null;
  return record.folders.find((folder) => folder.id === folderId) || null;
}

function isProjectScopedGroup(ref: GroupRef, projectId: string): boolean {
  if (ref.record.project.id !== projectId) return false;
  const scopeKind = groupFolder(ref.record, ref.group)?.scope.kind;
  return scopeKind === 'project' || scopeKind === 'note';
}

function isWorkspaceScopedGroup(ref: GroupRef): boolean {
  return groupFolder(ref.record, ref.group)?.scope.kind === 'workspace';
}

export function groupsForGalleryDestination(
  records: GalleryRecord[],
  destination: GalleryDestinationKey,
): GroupRef[] {
  const groups = flattenGroups(records);
  if (destination === 'recent') {
    return [...groups].sort((a, b) => b.group.updated_at.localeCompare(a.group.updated_at));
  }
  if (destination === 'workspace') return groups.filter(isWorkspaceScopedGroup);
  if (destination.startsWith('project:')) {
    const projectId = destination.slice('project:'.length);
    return groups.filter((ref) => isProjectScopedGroup(ref, projectId));
  }
  return groups;
}

export function buildGalleryDestinationModel(records: GalleryRecord[]): GalleryDestinationModel {
  const allCount = flattenGroups(records).length;
  const workspaceCount = groupsForGalleryDestination(records, 'workspace').length;
  const projects = new Map<string, GalleryRecord['project']>();
  records.forEach((record) => projects.set(record.project.id, record.project));

  const scoped: GalleryDestinationRow[] = [];
  if (workspaceCount > 0) {
    scoped.push({
      key: 'workspace',
      kind: 'workspace',
      label: 'Workspace',
      count: workspaceCount,
      projectId: null,
      color: null,
    });
  }
  projects.forEach((project, projectId) => {
    const count = groupsForGalleryDestination(records, `project:${projectId}`).length;
    if (count === 0) return;
    scoped.push({
      key: `project:${projectId}`,
      kind: 'project',
      label: project.name,
      count,
      projectId,
      color: project.color || '#64748b',
    });
  });

  return {
    primary: [
      { key: 'all', kind: 'all', label: 'All groups', count: allCount, projectId: null, color: null },
      { key: 'recent', kind: 'recent', label: 'Recent', count: null, projectId: null, color: null },
    ],
    scoped,
  };
}

export function galleryDestinationLabel(
  model: GalleryDestinationModel,
  destination: GalleryDestinationKey,
): string {
  return [...model.primary, ...model.scoped].find((row) => row.key === destination)?.label || 'All groups';
}

export function resolveGalleryCreationTarget(
  records: GalleryRecord[],
  destination: GalleryDestinationKey,
): GalleryCreationTarget | null {
  const projectId = destination.startsWith('project:')
    ? destination.slice('project:'.length)
    : null;
  for (const record of records) {
    if (projectId && record.project.id !== projectId) continue;
    const folder = record.folders.find((candidate) => (
      candidate.status === 'active'
      && candidate.system_root
      && (projectId
        ? candidate.scope.kind === 'project' && candidate.scope.project_id === projectId
        : candidate.scope.kind === 'workspace')
    ));
    if (folder) return { record, folder };
  }
  return null;
}

export function recordHasFolderWork(record: GalleryRecord): boolean {
  return activeGroups(record.groups).length > 0 || record.folders.some((folder) => !folder.system_root && folder.status === 'active');
}
