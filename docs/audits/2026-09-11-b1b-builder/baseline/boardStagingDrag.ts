export const BOARD_STAGING_MIME = 'application/x-coincides-board-staging';

export interface StagingItemDrop {
  boardId: string;
  items: ReadonlyArray<{ memberId: string; itemId: string }>;
}

/** Resolve identity against the current staging rows, never against copied card text. */
export function resolveStagingItemDrop(raw: string, staging?: StagingItemDrop): string | null {
  if (!staging) return null;
  try {
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;
    const { boardId, memberId } = payload as Record<string, unknown>;
    if (boardId !== staging.boardId || typeof memberId !== 'string') return null;
    return staging.items.find((item) => item.memberId === memberId)?.itemId || null;
  } catch { return null; }
}
