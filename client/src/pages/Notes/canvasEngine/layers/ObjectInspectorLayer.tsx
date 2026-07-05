import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Image,
  PanelRightClose,
  SquareDashedMousePointer,
  Trash2,
} from 'lucide-react';
import type { CanvasObjectInspectorActionId, CanvasObjectInspectorModel } from '../objectInspectorService';
import styles from '../../NoteDetail.module.css';

export interface ObjectInspectorLayerProps {
  model: CanvasObjectInspectorModel | null;
  onClose: () => void;
  onAction: (actionId: CanvasObjectInspectorActionId) => void;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function iconForAction(actionId: CanvasObjectInspectorActionId, exportVisible: boolean) {
  if (actionId === 'open_original') return <ExternalLink size={13} />;
  if (actionId === 'duplicate_canvas_object') return <Copy size={13} />;
  if (actionId === 'toggle_export_visibility') return exportVisible ? <EyeOff size={13} /> : <Eye size={13} />;
  if (actionId === 'toggle_shape_style') return <SquareDashedMousePointer size={13} />;
  if (actionId === 'toggle_image_fit') return <Image size={13} />;
  return <Trash2 size={13} />;
}

export function ObjectInspectorLayer({
  model,
  onClose,
  onAction,
}: ObjectInspectorLayerProps) {
  if (!model) return null;

  return (
    <aside
      className={styles.canvasObjectInspector}
      data-canvas-object-inspector="true"
      data-canvas-object-id={model.objectId}
      data-canvas-object-kind={model.kind}
      aria-label="Canvas object inspector"
    >
      <div className={styles.canvasObjectInspectorHeader}>
        <div>
          <div className={styles.canvasObjectInspectorKicker}>Object</div>
          <h3 className={styles.canvasObjectInspectorTitle}>{model.title}</h3>
          <p className={styles.canvasObjectInspectorSubtitle}>{model.subtitle}</p>
        </div>
        <button
          type="button"
          className={styles.canvasObjectInspectorClose}
          onClick={onClose}
          aria-label="Close object inspector"
        >
          <PanelRightClose size={15} />
        </button>
      </div>

      <div className={styles.canvasObjectInspectorSection}>
        <div className={styles.canvasObjectInspectorGrid}>
          <span>Kind</span>
          <strong>{model.kind}</strong>
          <span>Backing</span>
          <strong>{model.backing}</strong>
          <span>Class</span>
          <strong>{model.objectClass}</strong>
          <span>Surface</span>
          <strong>{model.surface}</strong>
          <span>Export</span>
          <strong>{model.exportVisible ? 'visible' : 'hidden'}</strong>
          <span>AI tree</span>
          <strong>{model.aiReadable ? 'readable' : 'missing'}</strong>
        </div>
      </div>

      <div className={styles.canvasObjectInspectorSection}>
        <div className={styles.canvasObjectInspectorGrid}>
          <span>X / Y</span>
          <strong>{formatNumber(model.bbox.x)} / {formatNumber(model.bbox.y)}</strong>
          <span>Size</span>
          <strong>{formatNumber(model.bbox.width)} x {formatNumber(model.bbox.height)}</strong>
          <span>Rotation</span>
          <strong>{formatNumber(model.bbox.rotation)} deg</strong>
          <span>Z index</span>
          <strong>{model.bbox.zIndex}</strong>
        </div>
      </div>

      {(model.contentRef || model.connectorRef || model.imageRef || model.structuredRef || model.presentationRef) && (
        <div className={styles.canvasObjectInspectorSection}>
          <div className={styles.canvasObjectInspectorBadgeRow}>
            {model.contentRef && (
              <span className={styles.canvasObjectInspectorBadge}>
                content:{model.contentRef.kind}
              </span>
            )}
            {model.connectorRef && (
              <span className={styles.canvasObjectInspectorBadge}>
                connector:{model.connectorRef.relationKind}
              </span>
            )}
            {model.imageRef && (
              <span className={styles.canvasObjectInspectorBadge}>
                image:{model.imageRef.fit}
              </span>
            )}
            {model.structuredRef && (
              <span className={styles.canvasObjectInspectorBadge}>
                table:{model.structuredRef.rowCount}x{model.structuredRef.columnCount}
              </span>
            )}
            {model.presentationRef && (
              <span className={styles.canvasObjectInspectorBadge}>
                style:{model.presentationRef.variant}
              </span>
            )}
          </div>
        </div>
      )}

      {model.summary && (
        <div className={styles.canvasObjectInspectorSection}>
          <p className={styles.canvasObjectInspectorSummary}>{model.summary}</p>
        </div>
      )}

      <div className={styles.canvasObjectInspectorActions}>
        {model.actions.map((action) => (
          <button
            key={action.actionId}
            type="button"
            className={`${styles.canvasObjectInspectorAction} ${action.danger ? styles.canvasObjectInspectorActionDanger : ''}`}
            data-canvas-object-inspector-action={action.actionId}
            disabled={!action.enabled}
            title={action.disabledReason || action.label}
            onClick={() => onAction(action.actionId)}
          >
            {iconForAction(action.actionId, model.exportVisible)}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
