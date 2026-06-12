import { Eye } from 'lucide-react';
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
}

export function BlockSourceReferenceLayer({
  sourceReferences,
  anchorsBySourceRef,
  sourceJumpBusy,
  onViewSource,
}: BlockSourceReferenceLayerProps) {
  if (!sourceReferences?.length) return null;

  return (
    <div className={styles.sources}>
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
