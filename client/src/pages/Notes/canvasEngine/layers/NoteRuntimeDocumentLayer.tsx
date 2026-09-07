import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  NoteFloatingPanelLayer,
  type NoteFloatingPanelLayerProps,
} from './NoteFloatingPanelLayer';
import {
  NoteWritingSurfaceLayer,
  type NoteWritingSurfaceLayerProps,
} from './NoteWritingSurfaceLayer';
import type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import { NotePrintLayer } from './NotePrintLayer';
import { NoteTraySidebar, type NoteTrayState } from './NoteTraySidebar';
import styles from '../../NoteDetail.module.css';

export interface NoteRuntimeDocumentLayerProps {
  tray?: NoteTrayState;
  blockEditRecoveryReceipts: BlockEditRecoveryReceipt[];
  floatingPanelProps: NoteFloatingPanelLayerProps;
  onApplyBlockEditRecovery: (recoveryKey: string) => void | Promise<boolean>;
  onDismissBlockEditRecovery: (recoveryKey: string) => boolean;
  onSurfacePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  surfaceMode: 'page' | 'canvas';
  templateWarning: string | null;
  writingSurfaceProps: NoteWritingSurfaceLayerProps;
}

export function NoteRuntimeDocumentLayer({
  tray,
  blockEditRecoveryReceipts,
  floatingPanelProps,
  onApplyBlockEditRecovery,
  onDismissBlockEditRecovery,
  onSurfacePointerDown,
  surfaceMode,
  templateWarning,
  writingSurfaceProps,
}: NoteRuntimeDocumentLayerProps) {
  const document = (
    <div
      className={`${styles.documentShell} ${surfaceMode === 'canvas' ? styles.documentShellCanvas : ''}`}
      onMouseDown={onSurfacePointerDown}
    >
      {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}
      {blockEditRecoveryReceipts.length > 0 && (
        <div className={styles.blockEditRecoveryQueue} role="status">
          <div className={styles.blockEditRecoveryTitle}>
            {blockEditRecoveryReceipts.length === 1
              ? 'A block edit is waiting for recovery'
              : `${blockEditRecoveryReceipts.length} block edits are waiting for recovery`}
          </div>
          {blockEditRecoveryReceipts.map((receipt) => (
            <div className={styles.blockEditRecoveryItem} key={receipt.recoveryKey}>
              <span className={styles.blockEditRecoveryPreview}>
                {receipt.text.trim() || 'Empty block edit'}
              </span>
              <div className={styles.blockEditRecoveryActions}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => { void onApplyBlockEditRecovery(receipt.recoveryKey); }}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => { onDismissBlockEditRecovery(receipt.recoveryKey); }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NoteFloatingPanelLayer {...floatingPanelProps} />
      <NoteWritingSurfaceLayer {...writingSurfaceProps} />
      <NotePrintLayer {...writingSurfaceProps} />
    </div>
  );
  if (surfaceMode !== 'page' || !tray) return document;
  return <div className={styles.trayViewport}>
    <button type="button" className={styles.trayToggle} aria-expanded={tray.open}
      onClick={() => tray.setOpen(!tray.open)}>Tray ({tray.entries.length})</button>
    <div className={styles.trayDocumentRow}>
      {document}
      {tray.open && <NoteTraySidebar tray={tray} />}
    </div>
  </div>;
}
