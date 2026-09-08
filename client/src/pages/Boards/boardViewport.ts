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
