/** A projection of the owning note's identity, with no copied content. */
export interface NoteRefBlockData { field: 'title' | 'description' }

export function isNoteRefBlockData(value: unknown): value is NoteRefBlockData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return Object.keys(data).length === 1 && (data.field === 'title' || data.field === 'description');
}
