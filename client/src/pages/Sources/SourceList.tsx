import {
  Download,
  ExternalLink,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Info,
  Presentation,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  deriveSourceExperienceState,
  formatSourceBytes,
  SOURCE_STATE_LABELS,
  sourceOpenBehavior,
  type SourceRecordDetail,
} from './sourceExperienceModel';
import styles from './SourceLibrary.module.css';

interface SourceListProps {
  sources: SourceRecordDetail[];
  loading: boolean;
  emptyMessage?: string;
  onOpen: (source: SourceRecordDetail) => void;
  onDetails: (source: SourceRecordDetail) => void;
  onOriginal: (source: SourceRecordDetail) => void;
  onDownload: (source: SourceRecordDetail) => void;
  onRetry: (source: SourceRecordDetail) => void;
  onReproject?: (source: SourceRecordDetail) => void;
}

function iconForSource(source: SourceRecordDetail) {
  if (['png', 'jpeg', 'webp'].includes(source.file.format)) return FileImage;
  if (['xlsx', 'csv'].includes(source.file.format)) return FileSpreadsheet;
  if (source.file.format === 'pptx') return Presentation;
  return FileText;
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
    : 'Unknown date';
}

export function SourceList({
  sources,
  loading,
  emptyMessage = 'No sources found',
  onOpen,
  onDetails,
  onOriginal,
  onDownload,
  onRetry,
  onReproject,
}: SourceListProps) {
  const { t } = useTranslation();
  if (loading) return <div className={styles.emptyState}>Loading sources...</div>;
  if (sources.length === 0) return <div className={styles.emptyState}>{emptyMessage}</div>;

  return (
    <div className={styles.sourceList} role="list">
      {sources.map((source) => {
        const Icon = iconForSource(source);
        const state = deriveSourceExperienceState(source);
        const behavior = sourceOpenBehavior(source);
        return (
          <div
            key={source.id}
            className={styles.sourceRow}
            role="listitem"
            data-source-state={state}
          >
            <button type="button" className={styles.sourceIdentity} onClick={() => onOpen(source)}>
              <span className={styles.sourceIcon}><Icon size={17} /></span>
              <span className={styles.sourceText}>
                <strong>{source.display_name}</strong>
                <small>
                  {source.file.format.toUpperCase()} · {formatSourceBytes(source.file.byte_size)} · {formatDate(source.file.uploaded_at)}
                </small>
              </span>
            </button>
            <span className={`${styles.statusBadge} ${styles[`status_${state}`]}`}>
              {SOURCE_STATE_LABELS[state]}
            </span>
            <span className={styles.placementCount} title="Project placements">
              {source.placements.length} {source.placements.length === 1 ? 'placement' : 'placements'}
            </span>
            <div className={styles.rowActions}>
              <button type="button" onClick={() => onOpen(source)} title={behavior.message} aria-label={behavior.message}>
                <ExternalLink size={15} />
              </button>
              <button
                type="button"
                onClick={() => onOriginal(source)}
                disabled={!behavior.canOpenOriginal}
                title="View original"
                aria-label="View original"
              >
                <Eye size={15} />
              </button>
              <button
                type="button"
                onClick={() => onDownload(source)}
                disabled={!behavior.canDownloadOriginal}
                title="Download original"
                aria-label="Download original"
              >
                <Download size={15} />
              </button>
              {behavior.canRetry && (
                <button type="button" onClick={() => onRetry(source)} title="Retry extraction" aria-label="Retry extraction">
                  <RotateCcw size={15} />
                </button>
              )}
              {state === 'materialized' && onReproject && (
                <button
                  type="button"
                  onClick={() => onReproject(source)}
                  title={t('sources.reprojection.action')}
                  aria-label={t('sources.reprojection.action')}
                >
                  <RefreshCw size={15} />
                </button>
              )}
              <button type="button" onClick={() => onDetails(source)} title="Source details" aria-label="Source details">
                <Info size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
