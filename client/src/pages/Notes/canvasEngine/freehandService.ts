import type { CanvasObject, CanvasPlacement, CanvasPoint, FreehandCanvasObject, PageFrameModel, PaperFreehandData } from './types';

export type { PaperFreehandData } from './types';
export type PaperInkTool = 'selection' | 'pen' | 'eraser';

// A 16 CSS-pixel target remains usable for thin ink at every reading scale.
export const PAPER_INK_HIT_WIDTH = 16;

/** Native SVG geometry also covers persisted path-only curves and rotations. */
export function hitTestPaperInk(host: HTMLElement, point: { clientX: number; clientY: number }): string | null {
  const rect = host.getBoundingClientRect();
  if (point.clientX < rect.left || point.clientX > rect.right || point.clientY < rect.top || point.clientY > rect.bottom) return null;
  const paths = Array.from(host.querySelectorAll<SVGPathElement>('[data-paper-ink-hit]')).reverse();
  for (const path of paths) {
    const matrix = path.getScreenCTM?.();
    if (!matrix || !path.isPointInStroke) continue;
    const scale = Math.hypot(matrix.a, matrix.b);
    if (!Number.isFinite(scale) || scale <= 0) continue;
    // isPointInStroke uses local stroke width even with non-scaling-stroke in
    // Chrome. Adjust only the invisible query path, synchronously restoring it
    // so eraser and projection geometry remain unchanged.
    const width = path.getAttribute('stroke-width');
    try {
      path.setAttribute('stroke-width', String(Math.max(Number(path.dataset.paperInkWidth) || 0, PAPER_INK_HIT_WIDTH / scale)));
      if (path.isPointInStroke(new DOMPoint(point.clientX, point.clientY).matrixTransform(matrix.inverse()))) {
        return path.dataset.paperInkHit || null;
      }
    } finally {
      if (width === null) path.removeAttribute('stroke-width'); else path.setAttribute('stroke-width', width);
    }
  }
  return null;
}

// Same initial token and width as board ink; no board runtime or storage imports.
export const PAPER_INK_STYLE = { color_token: 'ink', width: 2.5 } as const;

export function readPaperFreehandData(object: CanvasObject): PaperFreehandData | null {
  if (object.kind !== 'freehand') return null;
  const data = (object as FreehandCanvasObject).data ?? object.metadata?.freehand;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const raw = data as PaperFreehandData;
  const points = Array.isArray(raw.points)
    ? raw.points.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)) : undefined;
  const path = typeof raw.path === 'string' && raw.path.trim() ? raw.path : undefined;
  if (!points?.length && !path) return null;
  return { ...(points?.length ? { points } : {}), ...(path ? { path } : {}), style: raw.style };
}

export function paperFreehandPath(data: PaperFreehandData): string {
  if (data.path) return data.path;
  const points = data.points || [];
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return points.length === 1 ? `${path} l 0.01 0` : path;
}

export function paperFreehandStyle(data: PaperFreehandData): { color: string; width: number } {
  const width = data.style?.width;
  return {
    color: 'var(--sk-ink, var(--board-ink, var(--text-primary, #374151)))',
    width: typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : PAPER_INK_STYLE.width,
  };
}

/** Pointer samples stay on the entire starting sheet, including its margins. */
export function clipPaperInkPoint(point: CanvasPoint, frame: Pick<PageFrameModel, 'width' | 'height'>): CanvasPoint {
  return { x: Math.max(0, Math.min(frame.width, point.x)), y: Math.max(0, Math.min(frame.height, point.y)) };
}

export function createPaperFreehand(input: {
  objectId: string; canvasId: string; frame: PageFrameModel; points: CanvasPoint[]; zIndex: number;
}): { canvasObject: FreehandCanvasObject; placement: CanvasPlacement; payload: Record<string, unknown> } {
  const { frame, objectId, canvasId } = input;
  const samples = input.points.map((point) => clipPaperInkPoint(point, frame));
  if (!samples.length) throw new Error('A paper stroke requires a point');
  const { minX, minY, maxX, maxY } = samples.reduce((bounds, p) => ({
    minX: Math.min(bounds.minX, p.x), minY: Math.min(bounds.minY, p.y),
    maxX: Math.max(bounds.maxX, p.x), maxY: Math.max(bounds.maxY, p.y),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const x = Math.min(minX, frame.width - 1);
  const y = Math.min(minY, frame.height - 1);
  const points = samples.map((point) => ({ x: point.x - x, y: point.y - y }));
  // A tap is a visible dot. Keep even this tiny segment inside the owning page.
  if (points.length === 1 || points.every((p) => p.x === points[0].x && p.y === points[0].y)) {
    points.push({ x: points[0].x + (points[0].x > 0.99 ? -0.01 : 0.01), y: points[0].y });
  }
  const data: PaperFreehandData = { points, style: { ...PAPER_INK_STYLE } };
  data.path = paperFreehandPath(data);
  const canvasObject: FreehandCanvasObject = {
    objectId, canvasId, kind: 'freehand', backing: 'none', objectClass: 'pure', status: 'active',
    source: 'entity', data, metadata: { freehand: data },
  };
  const placement: CanvasPlacement = {
    placementId: `${objectId}:placement`, objectId, canvasId, frameId: frame.id,
    surface: 'formal_page', boundaryRole: 'inside', x: frame.x + x, y: frame.y + y,
    width: Math.max(1, maxX - x), height: Math.max(1, maxY - y), rotation: 0,
    zIndex: input.zIndex, visibilityState: 'normal', renderVisibility: 'visible',
  };
  return { canvasObject, placement, payload: paperFreehandSavePayload(canvasObject, placement) };
}

/** Generic object I/O converts this runtime world placement to frame-local once. */
export function paperFreehandSavePayload(canvasObject: CanvasObject, placement: CanvasPlacement): Record<string, unknown> {
  const data = readPaperFreehandData(canvasObject);
  if (!data) throw new Error('Paper ink data is missing');
  return {
    kind: 'freehand', backing: 'none', object_class: 'pure', data,
    metadata: { ...canvasObject.metadata, freehand: data },
    ...(canvasObject.source && typeof canvasObject.source === 'object' ? { source: canvasObject.source } : {}),
    placement: {
      placement_id: placement.placementId, order_index: placement.orderIndex ?? null,
      x: placement.x, y: placement.y, width: placement.width, height: placement.height,
      rotation: placement.rotation, z_index: placement.zIndex, frame_id: placement.frameId,
      surface: placement.surface, boundary_role: placement.boundaryRole,
      visibility_state: placement.visibilityState, render_visibility: placement.renderVisibility,
    },
  };
}
