import { projectNoteCoverMetadata } from './noteCoverStorage.js';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function hydrateNote(row: any) {
  // Binding uses its own human subresource; preserve the existing Note response contract.
  const { binding_settings_json: _bindingSettings, ...note } = row;
  return {
    ...note,
    metadata: projectNoteCoverMetadata(row),
  };
}

export function hydrateBlock(row: any) {
  return {
    ...row,
    content_json: parseJson(row.content_json, {}),
    metadata: parseJson(row.metadata, {}),
    display_overrides_json: parseJson(row.display_overrides_json, {}),
    source_references: parseJson(row.source_references, []),
  };
}
