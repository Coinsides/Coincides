export const SKIN_FLOAT_CARD_STORAGE_KEY = 'coincides:skin-float-card:v1';
export interface FloatCardPosition { x: number; y: number; collapsed: boolean }

/** Geometry is UI state only. The viewport is the sole snapping target. */
export function clampFloatCard(position: FloatCardPosition, size: { width: number; height: number }, viewport: { width: number; height: number }, snap = false): FloatCardPosition {
  const maxX = Math.max(8, viewport.width - size.width - 8);
  const maxY = Math.max(8, viewport.height - size.height - 8);
  let x = Math.max(8, Math.min(position.x, maxX));
  let y = Math.max(8, Math.min(position.y, maxY));
  if (snap) {
    if (x <= 16) x = 8;
    else if (viewport.width - size.width - x <= 16) x = maxX;
    if (y <= 16) y = 8;
    else if (viewport.height - size.height - y <= 16) y = maxY;
  }
  return { x, y, collapsed: position.collapsed };
}

export function readFloatCardPosition(): FloatCardPosition | null {
  try {
    const value = JSON.parse(localStorage.getItem(SKIN_FLOAT_CARD_STORAGE_KEY) ?? 'null') as FloatCardPosition | null;
    return value && Number.isFinite(value.x) && Number.isFinite(value.y) && typeof value.collapsed === 'boolean' ? value : null;
  } catch { return null; }
}

export function rememberFloatCardPosition(position: FloatCardPosition) {
  try { localStorage.setItem(SKIN_FLOAT_CARD_STORAGE_KEY, JSON.stringify(position)); } catch { /* Storage can be disabled; the tool still works. */ }
}
