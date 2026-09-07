export type CanvasSurfaceCoordinateSpace = 'page_frame_local' | 'canvas_world';

export type CanvasSurfaceAuthority = 'formal_page' | 'canvas_workspace' | 'tray';

export type CanvasSurfaceBoundaryRole = 'inside' | 'crossing' | 'outside';

export interface CanvasSurfaceHorizontalBox {
  x: number;
  width: number;
}

export interface CanvasSurfacePageBoundary {
  left: number;
  right: number;
  frameId?: string | null;
}

export interface ClassifyCanvasSurfaceAuthorityInput {
  coordinateSpace: CanvasSurfaceCoordinateSpace;
  box: CanvasSurfaceHorizontalBox;
  pageBoundary?: CanvasSurfacePageBoundary | null;
  pageLocalWidth?: number;
  explicitSurface?: CanvasSurfaceAuthority;
}

export interface CanvasSurfaceAuthorityDecision {
  surface: CanvasSurfaceAuthority;
  boundaryRole: CanvasSurfaceBoundaryRole;
  frameId: string | null;
}

function hasFiniteGeometry(box: CanvasSurfaceHorizontalBox): boolean {
  return Number.isFinite(box.x) && Number.isFinite(box.width) && box.width >= 0;
}

function validBoundary(
  boundary: CanvasSurfacePageBoundary | null | undefined,
): boundary is CanvasSurfacePageBoundary {
  return Boolean(
    boundary
      && Number.isFinite(boundary.left)
      && Number.isFinite(boundary.right)
      && boundary.right > boundary.left,
  );
}

function fallbackDecision(
  explicitSurface: CanvasSurfaceAuthority | undefined,
): CanvasSurfaceAuthorityDecision {
  return explicitSurface === 'formal_page'
    ? { surface: 'formal_page', boundaryRole: 'inside', frameId: null }
    : { surface: 'canvas_workspace', boundaryRole: 'outside', frameId: null };
}

/**
 * The sole horizontal Page-boundary classifier used by create, move, save,
 * hydrate, and migration paths. Geometry wins over a stale explicit surface
 * whenever the coordinate-space boundary is known.
 */
export function classifyCanvasSurfaceAuthority(
  input: ClassifyCanvasSurfaceAuthorityInput,
): CanvasSurfaceAuthorityDecision {
  // Tray membership has no geometry. Never classify its placeholder rectangle.
  if (input.explicitSurface === 'tray') return { surface: 'tray', boundaryRole: 'outside', frameId: null };
  const pageBoundary = input.coordinateSpace === 'page_frame_local'
    ? input.pageBoundary || {
      left: 0,
      right: input.pageLocalWidth ?? 0,
      frameId: null,
    }
    : input.pageBoundary;

  if (!hasFiniteGeometry(input.box) || !validBoundary(pageBoundary)) {
    return fallbackDecision(input.explicitSurface);
  }

  const boxRight = input.box.x + input.box.width;
  let boundaryRole: CanvasSurfaceBoundaryRole;
  if (boxRight <= pageBoundary.left || input.box.x >= pageBoundary.right) {
    boundaryRole = 'outside';
  } else if (input.box.x >= pageBoundary.left && boxRight <= pageBoundary.right) {
    boundaryRole = 'inside';
  } else {
    boundaryRole = 'crossing';
  }

  return {
    surface: boundaryRole === 'inside' ? 'formal_page' : 'canvas_workspace',
    boundaryRole,
    frameId: boundaryRole === 'outside' ? null : pageBoundary.frameId || null,
  };
}
