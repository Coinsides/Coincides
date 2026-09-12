// Active editing choice survives a visit to a note's tray within this app session.
// It is UI state only; objects persist their actual layer_id through the board API.
const activeLayers = new Map<string, string>();

export function getActiveBoardLayer(boardId: string): string | null {
  return activeLayers.get(boardId) ?? null;
}

export function setActiveBoardLayer(boardId: string, layerId: string | null) {
  if (layerId === null) activeLayers.delete(boardId);
  else activeLayers.set(boardId, layerId);
}
