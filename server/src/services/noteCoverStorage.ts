import type { NoteCover } from '../../../shared/types/noteCover.js';
import type { NoteBindingSettings } from '../../../shared/types/noteBinding.js';
import { noteBindingSettingsSchema } from '../validators/noteBinding.js';
import { noteCoverSchema } from '../validators/noteCover.js';
import { upgradeNoteBindingSettings } from './noteBindingModel.js';

function record(value: unknown): Record<string, any> {
  if (typeof value === 'string') { try { return record(JSON.parse(value)); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

/** Legacy card-only metadata is exposed as a read-only v2 view; reads never migrate rows. */
export function readNoteBindingView(row: { binding_settings_json?: unknown; metadata?: unknown }): NoteBindingSettings | null {
  const parsed = noteBindingSettingsSchema.safeParse(record(row.binding_settings_json));
  const settings = parsed.success ? parsed.data : null;
  if (settings?.version === 2) return settings;
  const legacyResult = noteCoverSchema.safeParse(record(record(row.metadata).binding).cover);
  const legacy = legacyResult.success ? legacyResult.data : null;
  return legacy ? { ...upgradeNoteBindingSettings(settings), cover: { assetId: legacy.assetId, card: legacy.card } } : settings;
}

/** The existing card reader keeps consuming metadata.binding.cover, now a projection. */
export function projectNoteCoverMetadata(row: { binding_settings_json?: unknown; metadata?: unknown }): Record<string, unknown> {
  const metadata = record(row.metadata);
  const settings = readNoteBindingView(row);
  if (settings?.version !== 2) return metadata;
  if (!settings.cover?.card) return detachLegacyNoteCover(metadata);
  return { ...metadata, binding: { ...record(metadata.binding),
    cover: { assetId: settings.cover.assetId, card: settings.cover.card } } };
}

/** A null compatibility slot is harmless; asset identities and crop parameters live only in binding settings. */
export function detachLegacyNoteCover(metadata: Record<string, unknown>): Record<string, unknown> {
  const binding = record(metadata.binding);
  return Object.prototype.hasOwnProperty.call(binding, 'cover')
    ? { ...metadata, binding: { ...binding, cover: null } } : metadata;
}

/** Adapt the unchanged card PUT payload without changing its input vocabulary. */
export function adaptCardCoverWrite(
  row: { binding_settings_json?: unknown; metadata?: unknown }, incomingMetadata: Record<string, unknown> | undefined,
  mergedMetadata: Record<string, unknown>,
): { metadata: Record<string, unknown>; bindingSettings?: NoteBindingSettings } {
  const incomingBinding = record(incomingMetadata?.binding);
  if (!Object.prototype.hasOwnProperty.call(incomingBinding, 'cover')) return { metadata: mergedMetadata };
  const settings = upgradeNoteBindingSettings(readNoteBindingView(row));
  const incoming = incomingBinding.cover as NoteCover | null;
  return { metadata: detachLegacyNoteCover(mergedMetadata), bindingSettings: { ...settings,
    cover: incoming ? { assetId: incoming.assetId, card: incoming.card,
      ...(settings.cover?.page ? { page: settings.cover.page } : {}) } : null,
  } };
}
