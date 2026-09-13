import type Database from 'better-sqlite3';
import { getCanvasAsset } from './canvasAssets.js';

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Omitted slots are unchanged; null clears only the cover reference, never its asset. */
export function mergeNoteCoverBinding(
  currentMetadata: Record<string, unknown>,
  nextMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const current = record(currentMetadata.binding) ? currentMetadata.binding : undefined;
  const incoming = record(nextMetadata.binding) ? nextMetadata.binding : undefined;
  if (!current && !incoming) return nextMetadata;
  return { ...nextMetadata, binding: { ...current, ...incoming } };
}

export function assertNoteCoverAsset(
  db: Database.Database,
  userId: string,
  metadata: Record<string, unknown> | undefined,
): void {
  const binding = metadata?.binding;
  if (record(binding) && record(binding.cover)) {
    getCanvasAsset(db, userId, String(binding.cover.assetId));
  }
}
