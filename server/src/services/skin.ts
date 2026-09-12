import type { SkinSelection } from '../../../shared/types/skin.js';
import { skinSelectionSchema } from '../validators/skin.js';

export function parseStoredSkin(value: unknown): SkinSelection | null {
  let decoded = value;
  if (typeof value === 'string') {
    try { decoded = JSON.parse(value); } catch { return null; }
  }
  const result = skinSelectionSchema.safeParse(decoded);
  return result.success ? result.data : null;
}

export function serializeSkin(value: SkinSelection | null | undefined): string | null {
  return value == null ? null : JSON.stringify(value);
}

export function hydrateCourseSkin<T extends Record<string, unknown>>(course: T) {
  return { ...course, skin: parseStoredSkin(course.skin) };
}

/** Paper presentation shares metadata storage, but a skin-only write never replaces document properties. */
export function mergeNoteSkin(
  currentMetadata: Record<string, unknown>,
  incomingMetadata: Record<string, unknown> | undefined,
  skin: SkinSelection | null | undefined,
): Record<string, unknown> {
  const next = { ...(incomingMetadata ?? currentMetadata) };
  // Existing typography/layout callers can carry a stale metadata snapshot. Only the explicit
  // human-route skin field changes the paper property, so such saves cannot rewind a newer skin.
  if (incomingMetadata) {
    if (Object.prototype.hasOwnProperty.call(currentMetadata, 'skin')) next.skin = currentMetadata.skin;
    else delete next.skin;
  }
  if (skin !== undefined) next.skin = skin;
  return next;
}
