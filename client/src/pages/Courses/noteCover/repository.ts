import api from '@/services/api';
import type { NoteCover } from '@shared/types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

/** Read at Save time so editing a cover does not restore stale note settings. */
export async function saveNoteCover(noteId: string, cover: NoteCover | null): Promise<void> {
  const path = `/notes/${encodeURIComponent(noteId)}`;
  const { data } = await api.get<{ metadata?: unknown }>(path);
  const metadata = record(data.metadata);
  await api.put(path, {
    metadata: { ...metadata, binding: { ...record(metadata.binding), cover } },
  });
}
