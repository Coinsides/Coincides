import {
  summarizeContentGroupStability,
} from '@/pages/Notes/canvasEngine/contentGroupService';
import type {
  ContentGroupIdentityStatus,
  ContentGroupV1,
  GroupFolderV1,
} from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import {
  cleanLabel,
  folderPathText,
  groupPreview,
  type GalleryNote,
} from './groupGalleryData';

export type GalleryShellMode = 'folder' | 'topic' | 'type';

export interface GalleryGroupCardView {
  title: string;
  preview: string;
  topicLabel: string;
  typeLabel: string;
  originLabel: string;
  originColor: string;
  originRoute: string;
  originKind: 'workspace' | 'project' | 'note';
  folderPath: string;
  memberCountLabel: string;
  statusLabel: string;
  statusKind: ContentGroupIdentityStatus;
  statusReason: string;
}

export function galleryNoteLabel(note: GalleryNote): string {
  const title = note.title.trim();
  if (title) return title;
  const timestamp = note.updated_at || note.created_at || '';
  const match = /^(?:\d{4})-(\d{2})-(\d{2})/.exec(timestamp);
  return match ? `未命名 · ${Number(match[1])}/${Number(match[2])}` : '未命名';
}

export function galleryModeLabel(mode: GalleryShellMode): string {
  if (mode === 'folder') return 'Folder view';
  if (mode === 'topic') return 'Topic view';
  return 'Type view';
}

export function buildGalleryGroupCardView(params: {
  group: ContentGroupV1;
  folders: GroupFolderV1[];
  folderId: string | null | undefined;
  sourceProject: { id: string; name: string; color?: string | null };
  sourceNote: GalleryNote;
}): GalleryGroupCardView {
  const {
    group,
    folders,
    folderId,
    sourceProject,
    sourceNote,
  } = params;
  const folder = folders.find((item) => item.id === folderId) || null;
  const stability = summarizeContentGroupStability({ group, folder });
  const statusKind = group.identity.status === 'none' ? 'draft' : group.identity.status;
  const originKind = folder?.scope.kind === 'workspace'
    ? 'workspace'
    : folder?.scope.kind === 'project'
      ? 'project'
      : 'note';
  const originLabel = originKind === 'workspace'
    ? 'Workspace · 工作区级'
    : originKind === 'project'
      ? `${sourceProject.name} · 项目级`
      : `${sourceProject.name} · ${galleryNoteLabel(sourceNote)}`;
  const originRoute = originKind === 'workspace'
    ? '/group-gallery?destination=workspace'
    : originKind === 'project'
      ? `/projects/${sourceProject.id}`
      : `/notes/${sourceNote.id}`;
  return {
    title: group.title,
    preview: groupPreview(group),
    topicLabel: cleanLabel(group.identity.topic, 'No topic'),
    typeLabel: cleanLabel(group.identity.type || group.identity.role, 'No type'),
    originLabel,
    originColor: sourceProject.color || '#64748b',
    originRoute,
    originKind,
    folderPath: folderPathText(folders, folderId),
    memberCountLabel: `${group.members.length} members`,
    statusLabel: statusKind,
    statusKind,
    statusReason: stability.reason,
  };
}
