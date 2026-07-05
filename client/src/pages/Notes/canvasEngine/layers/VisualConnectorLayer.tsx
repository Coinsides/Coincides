import type {
  MouseEvent as ReactMouseEvent,
} from 'react';
import type {
  CanvasObject,
  CanvasPlacement,
  VisualConnector,
} from '../types';
import styles from '../../NoteDetail.module.css';

interface VisualConnectorLayerProps {
  connectors: VisualConnector[];
  placementByObjectId: Map<string, CanvasPlacement>;
  canvasObjectById: Map<string, CanvasObject>;
  selectedObjectId: string | null;
  onConnectorContextMenu: (
    event: ReactMouseEvent<SVGLineElement>,
    canvasObject: CanvasObject,
  ) => void;
}

function markerIdForConnector(connector: VisualConnector): string {
  return `visual-connector-arrow-${connector.objectId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function VisualConnectorLayer({
  connectors,
  placementByObjectId,
  canvasObjectById,
  selectedObjectId,
  onConnectorContextMenu,
}: VisualConnectorLayerProps) {
  return (
    <>
      {connectors.map((connector) => {
        const canvasObject = canvasObjectById.get(connector.objectId);
        const placement = placementByObjectId.get(connector.objectId);
        if (!canvasObject || !placement) return null;
        const selected = selectedObjectId === connector.objectId;
        const markerId = markerIdForConnector(connector);
        const x1 = connector.start.x - placement.x;
        const y1 = connector.start.y - placement.y;
        const x2 = connector.end.x - placement.x;
        const y2 = connector.end.y - placement.y;
        const stroke = connector.stroke || '#8aa4c2';
        const strokeWidth = connector.strokeWidth || 1.75;
        return (
          <svg
            key={connector.connectorId}
            className={`${styles.canvasVisualConnector} ${selected ? styles.canvasVisualConnectorSelected : ''}`}
            data-canvas-visual-connector="true"
            data-canvas-object-id={connector.objectId}
            data-canvas-object-kind="visual_connector"
            style={{
              left: placement.x,
              top: placement.y,
              width: placement.width,
              height: placement.height,
              zIndex: Math.max(3, placement.zIndex),
            }}
          >
            <defs>
              <marker
                id={markerId}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
              </marker>
            </defs>
            <line
              className={styles.canvasVisualConnectorLine}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={strokeWidth}
              markerEnd={connector.endMarker === 'none' ? undefined : `url(#${markerId})`}
              onContextMenu={(event) => onConnectorContextMenu(event, canvasObject)}
            />
          </svg>
        );
      })}
    </>
  );
}
