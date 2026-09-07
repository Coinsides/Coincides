import type {
  CanvasObject,
  CanvasPlacement,
  CanvasPoint,
  VisualConnector,
  VisualStyle,
} from './types';

const CONNECTOR_BBOX_PADDING = 6;

export function pointForPlacementAnchor(
  placement: CanvasPlacement | undefined,
  anchor: VisualConnector['startAnchor'] = 'center',
): CanvasPoint | null {
  if (!placement) return null;
  const normalizedAnchor = anchor === 'auto' ? 'center' : anchor;
  if (normalizedAnchor === 'north') {
    return { x: placement.x + placement.width / 2, y: placement.y };
  }
  if (normalizedAnchor === 'east') {
    return { x: placement.x + placement.width, y: placement.y + placement.height / 2 };
  }
  if (normalizedAnchor === 'south') {
    return { x: placement.x + placement.width / 2, y: placement.y + placement.height };
  }
  if (normalizedAnchor === 'west') {
    return { x: placement.x, y: placement.y + placement.height / 2 };
  }
  return {
    x: placement.x + placement.width / 2,
    y: placement.y + placement.height / 2,
  };
}

export function resolveVisualConnectorWithPlacements(
  connector: VisualConnector,
  placements: CanvasPlacement[],
): VisualConnector {
  const placementByObjectId = new Map(placements.map((placement) => [placement.objectId, placement]));
  const start = connector.startObjectId
    ? pointForPlacementAnchor(placementByObjectId.get(connector.startObjectId), connector.startAnchor)
    : null;
  const end = connector.endObjectId
    ? pointForPlacementAnchor(placementByObjectId.get(connector.endObjectId), connector.endAnchor)
    : null;

  return {
    ...connector,
    startKind: connector.startObjectId ? 'object' : connector.startKind || 'point',
    endKind: connector.endObjectId ? 'object' : connector.endKind || 'point',
    start: start || connector.start,
    end: end || connector.end,
    relationKind: 'visual_only',
  };
}

export function placementForVisualConnector(
  placement: CanvasPlacement,
  connector: VisualConnector,
): CanvasPlacement {
  const left = Math.min(connector.start.x, connector.end.x);
  const top = Math.min(connector.start.y, connector.end.y);
  const right = Math.max(connector.start.x, connector.end.x);
  const bottom = Math.max(connector.start.y, connector.end.y);
  return {
    ...placement,
    x: left - CONNECTOR_BBOX_PADDING,
    y: top - CONNECTOR_BBOX_PADDING,
    width: Math.max(1, right - left) + CONNECTOR_BBOX_PADDING * 2,
    height: Math.max(1, bottom - top) + CONNECTOR_BBOX_PADDING * 2,
  };
}

function endpointPayload(
  connector: VisualConnector,
  side: 'start' | 'end',
): Record<string, unknown> {
  const objectId = side === 'start' ? connector.startObjectId : connector.endObjectId;
  const anchor = side === 'start' ? connector.startAnchor : connector.endAnchor;
  const point = side === 'start' ? connector.start : connector.end;
  if (objectId) {
    return {
      kind: 'object',
      object_id: objectId,
      anchor: anchor || 'center',
    };
  }
  return {
    kind: 'point',
    x: point.x,
    y: point.y,
  };
}

export function visualConnectorSavePayload(
  canvasObject: CanvasObject,
  placement: CanvasPlacement,
  connector: VisualConnector,
  style?: VisualStyle | null,
): Record<string, unknown> {
  return {
    kind: 'visual_connector',
    backing: 'none',
    object_class: 'pure',
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
      order_index: placement.orderIndex ?? null,
      visibility_state: placement.visibilityState || 'normal',
      render_visibility: placement.renderVisibility || 'visible',
    },
    extension: {
      start: endpointPayload(connector, 'start'),
      end: endpointPayload(connector, 'end'),
      line_style: connector.lineStyle || 'solid',
      stroke: connector.stroke || style?.stroke || '#8aa4c2',
      stroke_width: connector.strokeWidth || style?.strokeWidth || 1.75,
      start_marker: connector.startMarker || 'none',
      end_marker: connector.endMarker || 'arrow',
      relation_kind: 'visual_only',
      metadata: connector.metadata || {},
    },
    metadata: {
      ...(canvasObject.metadata || {}),
      connector_type: 'visual_only',
    },
    source: {
      source: 'visual_connector_object',
    },
  };
}
