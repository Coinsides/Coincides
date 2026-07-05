import type { BlockBoxLayout } from './runtimeLayout';
import type {
  CanvasImageAsset,
  CanvasObject,
  CanvasPlacement,
  CanvasSurface,
  ImageCanvasObject,
  VisualStyle,
} from './types';

export interface CreateImageObjectProjectionInput {
  objectId: string;
  canvasId: string;
  asset: CanvasImageAsset;
  layout: BlockBoxLayout;
  zIndex: number;
  frameId?: string;
  fit?: ImageCanvasObject['fit'];
  caption?: string;
  altText?: string;
  visualStyle?: VisualStyle | null;
}

export interface ImageObjectProjection {
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  imageObject: ImageCanvasObject;
  contentMount: null;
  visualStyle: VisualStyle | null;
}

function surfaceForLayout(layout: BlockBoxLayout): CanvasSurface {
  return layout.surface === 'formal_page' ? 'formal_page' : 'canvas_workspace';
}

function createImagePlacement({
  objectId,
  canvasId,
  layout,
  zIndex,
  frameId,
}: {
  objectId: string;
  canvasId: string;
  layout: BlockBoxLayout;
  zIndex: number;
  frameId?: string;
}): CanvasPlacement {
  const surface = surfaceForLayout(layout);
  return {
    placementId: `${objectId}:placement`,
    objectId,
    canvasId,
    frameId: surface === 'formal_page' ? frameId : undefined,
    surface,
    boundaryRole: surface === 'formal_page' ? 'inside' : 'outside',
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    rotation: layout.rotation || 0,
    zIndex,
    snapState: surface === 'formal_page' ? 'snapped' : 'free',
    visibilityState: 'normal',
    renderVisibility: 'visible',
  };
}

export function createImageObjectProjection({
  objectId,
  canvasId,
  asset,
  layout,
  zIndex,
  frameId,
  fit = 'contain',
  caption,
  altText,
  visualStyle = null,
}: CreateImageObjectProjectionInput): ImageObjectProjection {
  const placement = createImagePlacement({
    objectId,
    canvasId,
    layout,
    zIndex,
    frameId,
  });
  const canvasObject: CanvasObject = {
    objectId,
    canvasId,
    kind: 'image',
    backing: 'asset',
    objectClass: 'media',
    status: 'active',
    source: 'runtime_seed',
    metadata: {
      assetKind: 'image',
    },
  };
  const imageObject: ImageCanvasObject = {
    imageObjectId: objectId,
    objectId,
    canvasId,
    assetId: asset.assetId,
    asset,
    fit,
    caption,
    altText,
    naturalWidth: asset.width,
    naturalHeight: asset.height,
    metadata: {
      source: 'canvas_image_object',
    },
  };

  return {
    canvasObject,
    placement,
    imageObject,
    contentMount: null,
    visualStyle,
  };
}

export function imageObjectSavePayload(
  canvasObject: CanvasObject,
  placement: CanvasPlacement,
  imageObject: ImageCanvasObject,
  style?: VisualStyle | null,
): Record<string, unknown> {
  return {
    kind: 'image',
    backing: 'asset',
    object_class: 'media',
    placement: {
      placement_id: placement.placementId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotation: placement.rotation,
      frame_id: placement.frameId || null,
      surface: placement.surface,
      boundary_role: placement.boundaryRole,
      z_index: placement.zIndex,
      visibility_state: placement.visibilityState || 'normal',
      render_visibility: placement.renderVisibility || 'visible',
    },
    extension: {
      asset_id: imageObject.assetId,
      fit: imageObject.fit || 'contain',
      caption: imageObject.caption || null,
      alt_text: imageObject.altText || null,
      natural_width: imageObject.naturalWidth || imageObject.asset.width || null,
      natural_height: imageObject.naturalHeight || imageObject.asset.height || null,
      metadata: imageObject.metadata || {},
    },
    metadata: {
      ...(canvasObject.metadata || {}),
      asset_kind: 'image',
      style_id: style?.styleId,
    },
    source: {
      source: 'canvas_image_asset',
    },
  };
}
