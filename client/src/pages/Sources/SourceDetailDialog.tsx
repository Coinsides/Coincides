import { Download, ExternalLink, Eye, RotateCcw, Trash2, X } from 'lucide-react';
import {
  deriveSourceExperienceState,
  formatSourceBytes,
  SOURCE_STATE_LABELS,
  sourceOpenBehavior,
  type SourceRecordDetail,
} from './sourceExperienceModel';
import styles from './SourceLibrary.module.css';

interface SourceDetailDialogProps {
  source: SourceRecordDetail | null;
  onClose: () => void;
  onOpen: (source: SourceRecordDetail) => void;
  onOriginal: (source: SourceRecordDetail) => void;
  onDownload: (source: SourceRecordDetail) => void;
  onRetry: (source: SourceRecordDetail) => void;
  onDelete?: (source: SourceRecordDetail) => void;
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Not recorded';
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

export function SourceDetailDialog({
  source,
  onClose,
  onOpen,
  onOriginal,
  onDownload,
  onRetry,
  onDelete,
}: SourceDetailDialogProps) {
  if (!source) return null;
  const state = deriveSourceExperienceState(source);
  const behavior = sourceOpenBehavior(source);

  return (
    <div className={styles.dialogOverlay} onMouseDown={onClose}>
      <section
        className={styles.detailDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.detailHeader}>
          <div>
            <span className={`${styles.statusBadge} ${styles[`status_${state}`]}`}>
              {SOURCE_STATE_LABELS[state]}
            </span>
            <h2 id="source-detail-title">{source.display_name}</h2>
            <p>{behavior.message}</p>
          </div>
          <div className={styles.detailHeaderActions}>
            <button
              type="button"
              disabled={!onDelete}
              onClick={() => onDelete?.(source)}
              title={onDelete ? 'Delete Source' : 'Delete Sources from the global Source Library'}
              aria-label={onDelete ? 'Delete Source' : 'Delete Source unavailable here'}
            >
              <Trash2 size={15} />
            </button>
            <button type="button" onClick={onClose} title="Close" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </header>

        <div className={styles.detailActions}>
          {behavior.primary === 'projection' && (
            <button type="button" onClick={() => onOpen(source)}>
              <ExternalLink size={15} />
              Open extracted content
            </button>
          )}
          <button type="button" onClick={() => onOriginal(source)} disabled={!behavior.canOpenOriginal}>
            <Eye size={15} />
            View original
          </button>
          <button type="button" onClick={() => onDownload(source)} disabled={!behavior.canDownloadOriginal}>
            <Download size={15} />
            Download
          </button>
          {behavior.canRetry && (
            <button type="button" onClick={() => onRetry(source)}>
              <RotateCcw size={15} />
              Retry extraction
            </button>
          )}
        </div>

        <div className={styles.detailSections}>
          <section>
            <h3>Original receipt</h3>
            <dl className={styles.detailGrid}>
              <div><dt>Filename</dt><dd>{source.file.original_filename}</dd></div>
              <div><dt>Format</dt><dd>{source.file.format.toUpperCase()}</dd></div>
              <div><dt>Size</dt><dd>{formatSourceBytes(source.file.byte_size)}</dd></div>
              <div><dt>Received</dt><dd>{formatTimestamp(source.file.uploaded_at)}</dd></div>
              <div><dt>Origin</dt><dd>{source.origin.course_name_snapshot || 'Source Library'}</dd></div>
              <div><dt>Entry</dt><dd>{source.origin.entry_kind.replace(/_/g, ' ')}</dd></div>
            </dl>
          </section>

          <section>
            <h3>Extraction</h3>
            <dl className={styles.detailGrid}>
              <div><dt>Parser</dt><dd>{source.materialization.parser_key}</dd></div>
              <div><dt>Version</dt><dd>{source.materialization.parser_version}</dd></div>
              <div><dt>Attempts</dt><dd>{source.materialization.attempt_count}</dd></div>
              <div><dt>Completed</dt><dd>{formatTimestamp(source.materialization.completed_at)}</dd></div>
            </dl>
            {source.materialization.error_message && (
              <div className={styles.errorNotice}>
                <strong>{source.materialization.error_code || 'Extraction error'}</strong>
                <span>{source.materialization.error_message}</span>
              </div>
            )}
          </section>

          <section>
            <h3>Placements</h3>
            <div className={styles.placementList}>
              {source.placements.map((placement) => (
                <div key={placement.id}>
                  <strong>{placement.course_name}</strong>
                  <span>Added {formatTimestamp(placement.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
