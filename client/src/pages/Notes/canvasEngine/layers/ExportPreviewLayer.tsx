import {
  CircleHelp,
  Eye,
  EyeOff,
  FileText,
  FileX,
  LayoutDashboard,
  X,
} from 'lucide-react';
import {
  aiVisibilityLabel,
  exportPreviewRowLabel,
  exportRoleLabel,
  type ExportPreviewModel,
  type ExportPreviewRow,
} from '../exportPreviewService';
import styles from '../../NoteDetail.module.css';

interface ExportPreviewLayerProps {
  preview: ExportPreviewModel;
  showBlockTypes: boolean;
  showAIVisibility: boolean;
  showExportStatus: boolean;
  onToggleBlockTypes: () => void;
  onToggleAIVisibility: () => void;
  onToggleExportStatus: () => void;
  onClose: () => void;
}

function ExportPreviewGroup({
  label,
  rows,
  meta,
}: {
  label: string;
  rows: ExportPreviewRow[];
  meta: (row: ExportPreviewRow) => string;
}) {
  return (
    <details className={styles.exportPreviewGroup}>
      <summary>
        <span>{label}</span>
        <strong>{rows.length}</strong>
      </summary>
      <div className={styles.exportPreviewList}>
        {rows.length === 0 ? (
          <div className={styles.exportPreviewEmpty}>No blocks in this group.</div>
        ) : rows.map((row) => (
          <div key={`${label}-${row.block.id}`} className={styles.exportPreviewRow}>
            <span>{exportPreviewRowLabel(row)}</span>
            <small>{meta(row)}</small>
          </div>
        ))}
      </div>
    </details>
  );
}
export function ExportPreviewLayer({
  preview,
  showBlockTypes,
  showAIVisibility,
  showExportStatus,
  onToggleBlockTypes,
  onToggleAIVisibility,
  onToggleExportStatus,
  onClose,
}: ExportPreviewLayerProps) {
  return (
    <div className={`${styles.infoPopover} ${styles.exportPopover}`}>
      <div className={styles.popoverHeader}>
        <div>
          <div className={styles.popoverEyebrow}>Export preview</div>
          <strong>Boundary seed</strong>
        </div>
        <button
          className={styles.iconBtn}
          onClick={onClose}
          title="Close"
        >
          <X size={15} />
        </button>
      </div>
      <div className={styles.exportStats}>
        <div>
          <strong>{preview.included}</strong>
          <span>Included</span>
        </div>
        <div>
          <strong>{preview.excluded}</strong>
          <span>Excluded</span>
        </div>
        <div>
          <strong>{preview.aiVisible}</strong>
          <span>AI visible</span>
        </div>
        <div>
          <strong>{preview.aiHidden}</strong>
          <span>AI hidden</span>
        </div>
      </div>
      <div className={styles.previewOverlayControls} aria-label="Preview overlay controls">
        <div className={styles.previewOverlayControl}>
          <button
            type="button"
            className={`${styles.previewOverlayToggle} ${showBlockTypes ? styles.previewOverlayToggleOn : styles.previewOverlayToggleOff}`}
            onClick={onToggleBlockTypes}
            aria-label="Toggle block type overlay"
            aria-pressed={showBlockTypes}
            title={showBlockTypes ? 'Hide block type overlay' : 'Show block type overlay'}
          >
            <LayoutDashboard size={20} />
          </button>
          <span
            className={styles.previewOverlayHelp}
            data-tip="Show or hide block type badges across the page."
            aria-label="Block type overlay help"
          >
            <CircleHelp size={13} />
          </span>
        </div>
        <div className={styles.previewOverlayControl}>
          <button
            type="button"
            className={`${styles.previewOverlayToggle} ${showAIVisibility ? styles.previewOverlayToggleOn : styles.previewOverlayToggleOff}`}
            onClick={onToggleAIVisibility}
            aria-label="Toggle AI visibility overlay"
            aria-pressed={showAIVisibility}
            title={showAIVisibility ? 'Hide AI visibility overlay' : 'Show AI visibility overlay'}
          >
            {showAIVisibility ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <span
            className={styles.previewOverlayHelp}
            data-tip="Show which blocks are visible or hidden from AI context."
            aria-label="AI visibility overlay help"
          >
            <CircleHelp size={13} />
          </span>
        </div>
        <div className={styles.previewOverlayControl}>
          <button
            type="button"
            className={`${styles.previewOverlayToggle} ${showExportStatus ? styles.previewOverlayToggleOn : styles.previewOverlayToggleOff}`}
            onClick={onToggleExportStatus}
            aria-label="Toggle export status overlay"
            aria-pressed={showExportStatus}
            title={showExportStatus ? 'Hide export status overlay' : 'Show export status overlay'}
          >
            {showExportStatus ? <FileText size={20} /> : <FileX size={20} />}
          </button>
          <span
            className={styles.previewOverlayHelp}
            data-tip="Show which blocks are included, excluded, or scratch-only."
            aria-label="Export status overlay help"
          >
            <CircleHelp size={13} />
          </span>
        </div>
      </div>
      {(preview.crossing > 0 || preview.outside > 0) && (
        <div className={styles.exportWarning}>
          {preview.crossing > 0 && <p>{preview.crossing} block crosses the formal page boundary.</p>}
          {preview.outside > 0 && <p>{preview.outside} block is in the scratch workspace.</p>}
        </div>
      )}
      <div className={styles.exportPreviewGroups}>
        <ExportPreviewGroup
          label="Included in export"
          rows={preview.includedRows}
          meta={(row) => `${aiVisibilityLabel(row.aiVisibility)} / ${row.boundary}`}
        />
        <ExportPreviewGroup
          label="Excluded / scratch"
          rows={preview.excludedRows}
          meta={(row) => `${aiVisibilityLabel(row.aiVisibility)} / ${row.boundary}`}
        />
        <ExportPreviewGroup
          label="AI visible"
          rows={preview.aiVisibleRows}
          meta={(row) => `${exportRoleLabel(row.exportRole)} / ${row.boundary}`}
        />
        <ExportPreviewGroup
          label="AI hidden"
          rows={preview.aiHiddenRows}
          meta={(row) => `${exportRoleLabel(row.exportRole)} / ${row.boundary}`}
        />
      </div>
      <p className={styles.popoverNote}>
        This is a boundary preview seed, not the final PDF export engine.
      </p>
    </div>
  );
}
