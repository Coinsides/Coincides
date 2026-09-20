import { Eye } from 'lucide-react';
import type { CSSProperties } from 'react';
import { PAGINATED_SOURCE_REFERENCE_ACTION_HEIGHT_PX, PAGINATED_SOURCE_REFERENCE_CHIP_HEIGHT_PX, PAGINATED_SOURCE_REFERENCE_GAP_PX, PAGINATED_SOURCE_REFERENCE_STRIP_HEIGHT_PX } from '../pageFlowSourceReferenceService';
import type {
  NoteBlock,
  SourceAnchor,
} from '../runtimeDataTypes';
import styles from '../../NoteDetail.module.css';

interface BlockSourceReferenceLayerProps {
  sourceReferences: NoteBlock['source_references'];
  anchorsBySourceRef: Record<string, SourceAnchor>;
  sourceJumpBusy: string | null;
  onViewSource: (anchorId: string) => void;
  /** The first flow fragment reserves one fixed strip, regardless of source count. */
  paginated?: boolean;
}

export function BlockSourceReferenceLayer({
  sourceReferences,
  anchorsBySourceRef,
  sourceJumpBusy,
  onViewSource,
  paginated = false,
}: BlockSourceReferenceLayerProps) {
  if (!sourceReferences?.length) return null;

  return (
    <div className={[styles.sources, paginated ? styles.sourcesPaginated : ''].filter(Boolean).join(' ')}
      data-page-flow-sources={paginated ? 'true' : undefined}
      role={paginated ? 'region' : undefined} aria-label={paginated ? 'Source references' : undefined} tabIndex={paginated ? 0 : undefined}
      style={paginated ? { height: PAGINATED_SOURCE_REFERENCE_STRIP_HEIGHT_PX, marginTop: PAGINATED_SOURCE_REFERENCE_GAP_PX,
        '--page-source-chip-height': `${PAGINATED_SOURCE_REFERENCE_CHIP_HEIGHT_PX}px`,
        '--page-source-action-height': `${PAGINATED_SOURCE_REFERENCE_ACTION_HEIGHT_PX}px` } as CSSProperties : undefined}>
      {sourceReferences.map((source, sourceIndex) => {
        const anchor = source.id ? anchorsBySourceRef[source.id] : undefined;
        return (
          <span key={source.id || sourceIndex} className={styles.sourceRef}>
            <span>
              Source
              {source.source_page_start ? ` p.${source.source_page_start}` : ''}
              {source.source_page_end && source.source_page_end !== source.source_page_start ? `-${source.source_page_end}` : ''}
            </span>
            {anchor && (
              <button
                type="button"
                className={styles.sourceRefAction}
                disabled={sourceJumpBusy === anchor.id}
                onClick={() => onViewSource(anchor.id)}
              >
                <Eye size={13} />
                View
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
