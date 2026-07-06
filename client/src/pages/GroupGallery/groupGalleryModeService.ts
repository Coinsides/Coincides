import type { GalleryMode } from './groupGalleryData';

export function normalizeGalleryMode(value: string | null): GalleryMode {
  if (value === 'role') return 'type';
  return value === 'topic' || value === 'type' ? value : 'folder';
}
