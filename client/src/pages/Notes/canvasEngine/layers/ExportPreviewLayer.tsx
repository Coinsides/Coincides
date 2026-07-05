import {
  CircleHelp,
  Eye,
  EyeOff,
  FileText,
  FileX,
  LayoutDashboard,
  Tag,
  X,
} from 'lucide-react';
import {
  aiVisibilityLabel,
  exportPreviewRowLabel,
  exportRoleLabel,
  type ExportPreviewModel,
  type ExportPreviewRow,
  type PageFrameExportPreview,
} from '../exportPreviewService';
import styles from '../../NoteDetail.module.css';

interface ExportPreviewLayerProps {
  preview: ExportPreviewModel;
  showBlockTypes: boolean;
  showAIVisibility: boolean;
  showExportStatus: boolean;
  showLabelOverlay: boolean;
  onToggleBlockTypes: () => void;
  onToggleAIVisibility: () => void;
  onToggleExportStatus: () => void;
  onToggleLabelOverlay: () => void;
  onClose: () => void;
}

function ExportPreviewGroup({
  label,
  rows,
  meta,
  dataAttributes = {},
}: {
  label: string;
  rows: ExportPreviewRow[];
  meta: (row: ExportPreviewRow) => string;
  dataAttributes?: Record<string, string>;
}) {
  return (
    <details className={styles.exportPreviewGroup} {...dataAttributes}>
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

function pageFrameExportPreviewLabel(pageFrame: PageFrameExportPreview, index: number): string {
  const role = pageFrame.role === 'primary_page_frame' ? 'Primary PageFrame' : 'Secondary PageFrame';
  const pageSize = pageFrame.pageSize || 'Custom';
  return `${role} ${index + 1} / ${pageSize}`;
}

function exportPolicyLabel(row: ExportPreviewRow): string {
  if (!row.exportPolicy) return row.boundary;
  if (row.exportPolicy.decision === 'manual_required') return 'manual decision';
  return `${row.exportPolicy.policy} -> ${row.exportPolicy.decision}`;
}

function ExportPreviewPageFrameGroup({
  pageFrame,
  index,
}: {
  pageFrame: PageFrameExportPreview;
  index: number;
}) {
  return (
    <details
      className={`${styles.exportPreviewGroup} ${styles.exportPreviewPageFrameGroup}`}
      data-export-preview-page-frame={pageFrame.pageFrameId}
      data-export-preview-page-frame-role={pageFrame.role}
      open={index === 0}
    >
      <summary>
        <span>{pageFrameExportPreviewLabel(pageFrame, index)}</span>
        <strong>{pageFrame.rows.length}</strong>
      </summary>
      <div className={styles.exportPreviewPageFrameMeta}>
        <span>{pageFrame.includedRows.length} export</span>
        <span>{pageFrame.excludedRows.length} excluded</span>
        <span>{pageFrame.aiHiddenRows.length} AI hidden</span>
        <span>{pageFrame.exportable ? 'exportable' : 'not exportable'}</span>
      </div>
      <div
        className={styles.exportPreviewPageFrameTypography}
        data-export-preview-typography={pageFrame.documentTypography.profileId}
        data-export-preview-line-capacity={pageFrame.estimatedLineCapacity}
      >
        <span>{pageFrame.documentTypography.fontSizePx}px</span>
        <span>{pageFrame.documentTypography.lineHeightPx}px line</span>
        <span>{pageFrame.documentTypography.paragraphSpacingPx}px gap</span>
        <span>{pageFrame.estimatedLineCapacity} lines</span>
      </div>
      <div className={styles.exportPreviewList}>
        {pageFrame.rows.length === 0 ? (
          <div className={styles.exportPreviewEmpty}>No inside blocks in this PageFrame.</div>
        ) : pageFrame.rows.map((row) => (
          <div key={`${pageFrame.pageFrameId}-${row.block.id}`} className={styles.exportPreviewRow}>
            <span>{exportPreviewRowLabel(row)}</span>
            <small>{exportRoleLabel(row.exportRole)} / {aiVisibilityLabel(row.aiVisibility)}</small>
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
  showLabelOverlay,
  onToggleBlockTypes,
  onToggleAIVisibility,
  onToggleExportStatus,
  onToggleLabelOverlay,
  onClose,
}: ExportPreviewLayerProps) {
  return (
    <div className={`${styles.infoPopover} ${styles.exportPopover} ${styles.floatingPanelPopover}`}>
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
        <div className={styles.previewOverlayControl}>
          <button
            type="button"
            className={`${styles.previewOverlayToggle} ${showLabelOverlay ? styles.previewOverlayToggleOn : styles.previewOverlayToggleOff}`}
            onClick={onToggleLabelOverlay}
            aria-label="Toggle label overlay"
            aria-pressed={showLabelOverlay}
            title={showLabelOverlay ? 'Hide label overlay' : 'Show label overlay'}
          >
            <Tag size={20} />
          </button>
          <span
            className={styles.previewOverlayHelp}
            data-tip="Show or hide annotation labels and highlights while writing."
            aria-label="Label overlay help"
          >
            <CircleHelp size={13} />
          </span>
        </div>
      </div>
      {(preview.crossing > 0 || preview.outside > 0) && (
        <div
          className={styles.exportWarning}
          data-export-preview-crossing-policy={preview.crossingExportPolicy}
        >
          {preview.crossing > 0 && <p>{preview.crossing} block crosses the formal page boundary.</p>}
          {preview.outside > 0 && <p>{preview.outside} block is in the scratch workspace.</p>}
          {preview.crossing > 0 && <p>Crossing policy: {preview.crossingExportPolicy}.</p>}
        </div>
      )}
      <div className={styles.exportPreviewGroups}>
        {preview.pageFrames.map((pageFrame, index) => (
          <ExportPreviewPageFrameGroup
            key={pageFrame.pageFrameId}
            pageFrame={pageFrame}
            index={index}
          />
        ))}
        <ExportPreviewGroup
          label="Crossing PageFrame boundary"
          rows={preview.crossingObjects}
          meta={(row) => `${exportRoleLabel(row.exportRole)} / ${aiVisibilityLabel(row.aiVisibility)} / ${exportPolicyLabel(row)}`}
          dataAttributes={{
            'data-export-preview-crossing': 'true',
            'data-export-preview-crossing-policy': preview.crossingExportPolicy,
          }}
        />
        <ExportPreviewGroup
          label="Workspace only"
          rows={preview.workspaceOnlyObjects}
          meta={(row) => `${exportRoleLabel(row.exportRole)} / ${aiVisibilityLabel(row.aiVisibility)} / ${exportPolicyLabel(row)}`}
          dataAttributes={{ 'data-export-preview-workspace-only': 'true' }}
        />
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
        Preview owns export boundary, AI visibility, export status, block type, and label overlays. It is not the final PDF export engine.
      </p>
    </div>
  );
}
