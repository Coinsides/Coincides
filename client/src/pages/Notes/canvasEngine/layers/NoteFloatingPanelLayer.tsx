import {
  X,
} from 'lucide-react';
import type { SourceJumpTarget } from '../runtimeDataTypes';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import styles from '../../NoteDetail.module.css';

export interface NoteFloatingPanelLayerProps {
  sourceJumpTarget: SourceJumpTarget | null;
  onFocusBlock: (blockId: string) => void;
  onCloseSourceJump: () => void;
}

export function NoteFloatingPanelLayer({
  sourceJumpTarget,
  onCloseSourceJump,
}: NoteFloatingPanelLayerProps) {
  return (
    <>
      <FloatingOverlayLayer open={Boolean(sourceJumpTarget)}>
        {sourceJumpTarget && (
          <div className={`${styles.sourceJumpPanel} ${styles.floatingPanelPopover}`} data-note-overlay="source">
            <div className={styles.sourceJumpHeader}>
              <div>
                <div className={styles.sourceJumpEyebrow}>Source snapshot</div>
                <div className={styles.sourceJumpTitle}>{sourceJumpTarget.snapshot.title}</div>
                <div className={styles.sourceJumpMeta}>
                  {sourceJumpTarget.snapshot.source_filename} - {sourceJumpTarget.page.page_label || `p.${sourceJumpTarget.page.page_number}`}
                </div>
              </div>
              <button
                className={styles.iconBtn}
                onClick={onCloseSourceJump}
                title="Close source"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.sourceJumpPage}>
              <div className={styles.sourceJumpPageLabel}>
                Focused source page
                {sourceJumpTarget.focus.page_start ? ` ${sourceJumpTarget.focus.page_start}` : ''}
                {sourceJumpTarget.focus.page_end && sourceJumpTarget.focus.page_end !== sourceJumpTarget.focus.page_start ? `-${sourceJumpTarget.focus.page_end}` : ''}
              </div>
              <p>{sourceJumpTarget.page.text_content}</p>
            </div>
          </div>
        )}
      </FloatingOverlayLayer>
    </>
  );
}
