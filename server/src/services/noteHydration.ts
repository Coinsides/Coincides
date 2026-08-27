function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function hydrateNote(row: any) {
  return {
    ...row,
    metadata: parseJson(row.metadata, {}),
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
