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
} from './groupGalleryData';

export type GalleryShellMode = 'folder' | 'topic' | 'type';

export interface GalleryGroupCardView {
  title: string;
  preview: string;
  topicLabel: string;
  typeLabel: string;
  sourceLabel: string;
  folderPath: string;
  memberCountLabel: string;
  statusLabel: string;
  statusKind: ContentGroupIdentityStatus;
  statusReason: string;
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
  sourceNoteTitle: string;
}): GalleryGroupCardView {
  const {
    group,
    folders,
    folderId,
    sourceNoteTitle,
  } = params;
  const folder = folders.find((item) => item.id === folderId) || null;
  const stability = summarizeContentGroupStability({ group, folder });
  const statusKind = group.identity.status === 'none' ? 'draft' : group.identity.status;
  return {
    title: group.title,
    preview: groupPreview(group),
    topicLabel: cleanLabel(group.identity.topic, 'No topic'),
    typeLabel: cleanLabel(group.identity.type || group.identity.role, 'No type'),
    sourceLabel: cleanLabel(sourceNoteTitle, 'Untitled note'),
    folderPath: folderPathText(folders, folderId),
    memberCountLabel: `${group.members.length} members`,
    statusLabel: statusKind,
    statusKind,
    statusReason: stability.reason,
  };
}
