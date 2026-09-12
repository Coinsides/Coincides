import type { BoardViewport } from './boardTypes';

export interface BoardPoint { x: number; y: number }

export function toBoardPoint(point: BoardPoint, viewport: BoardViewport): BoardPoint {
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}

/** The board has no paper bounds or paper reading modes. Zoom keeps the pointer's world point fixed. */
export function zoomBoardAt(viewport: BoardViewport, point: BoardPoint, factor: number): BoardViewport {
  const zoom = Math.max(0.01, Math.min(100, viewport.zoom * factor));
  const world = toBoardPoint(point, viewport);
  return { x: point.x - world.x * zoom, y: point.y - world.y * zoom, zoom };
}

export function pointsPath(points: BoardPoint[]): string {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

/** Animate only the camera. Callers retain the existing viewport persistence path. */
export function animateBoardViewport(
  from: BoardViewport, to: BoardViewport,
  apply: (viewport: BoardViewport) => void, complete: () => void,
): () => void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    apply({ ...to });
    complete();
    return () => undefined;
  }
  const start = performance.now();
  let frame = 0;
  function tick(now: number) {
    const progress = Math.min(1, Math.max(0, (now - start) / 240));
    const eased = 1 - (1 - progress) ** 4;
    apply(progress === 1 ? { ...to } : {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
      zoom: from.zoom + (to.zoom - from.zoom) * eased,
    });
    if (progress < 1) frame = requestAnimationFrame(tick);
    else complete();
  }
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
