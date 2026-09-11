import { forwardRef, useImperativeHandle, type PointerEvent as ReactPointerEvent } from 'react';
import { Inbox } from 'lucide-react';
import {
  NoteFloatingPanelLayer,
  type NoteFloatingPanelLayerProps,
} from './NoteFloatingPanelLayer';
import {
  NoteWritingSurfaceLayer,
  type NoteWritingSurfaceLayerProps,
} from './NoteWritingSurfaceLayer';
import type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import type { NoteBlock } from '../runtimeDataTypes';
import { BlockEditRecoveryQueue } from './BlockEditRecoveryQueue';
import { NotePrintLayer } from './NotePrintLayer';
import { NoteOverviewLayer } from './NoteOverviewLayer';
import { useNoteOverviewController } from '../hooks/useNoteOverviewController';
import { NoteTraySidebar, type NoteTrayState } from './NoteTraySidebar';
import styles from '../../NoteDetail.module.css';

export interface NoteRuntimeDocumentLayerProps {
  tray?: NoteTrayState;
  blockEditRecoveryReceipts: BlockEditRecoveryReceipt[];
  blockEditRecoveryConflicts?: Record<string, boolean>;
  floatingPanelProps: NoteFloatingPanelLayerProps;
  onApplyBlockEditRecovery: (recoveryKey: string) => void | Promise<boolean>;
  onDismissBlockEditRecovery: (recoveryKey: string) => boolean;
  onInspectBlockEditRecovery?: (recoveryKey: string) => Promise<NoteBlock | null>;
  onReplayBlockEditRecovery?: (recoveryKey: string) => Promise<boolean>;
  onSurfacePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  surfaceMode: 'page' | 'canvas';
  templateWarning: string | null;
  writingSurfaceProps: NoteWritingSurfaceLayerProps;
}

export interface NoteRuntimeDocumentHandle {
  resumeEditingForExit: () => void;
}

export const NoteRuntimeDocumentLayer = forwardRef<NoteRuntimeDocumentHandle, NoteRuntimeDocumentLayerProps>(function NoteRuntimeDocumentLayer({
  tray,
  blockEditRecoveryReceipts,
  blockEditRecoveryConflicts,
  floatingPanelProps,
  onApplyBlockEditRecovery,
  onDismissBlockEditRecovery,
  onInspectBlockEditRecovery,
  onReplayBlockEditRecovery,
  onSurfacePointerDown,
  surfaceMode,
  templateWarning,
  writingSurfaceProps,
}, ref) {
  const overview = useNoteOverviewController({
    noteId: writingSurfaceProps.noteId,
    surfaceMode,
    blockListRef: writingSurfaceProps.blockListRef,
    pageFrames: writingSurfaceProps.noteCanvasRuntime.pageFrames,
  });
  useImperativeHandle(ref, () => ({ resumeEditingForExit: overview.resumeForExit }));
  const document = (
    <div
      className={`${styles.documentShell} ${surfaceMode === 'canvas' ? styles.documentShellCanvas : ''}`}
      data-note-overview-active={overview.open ? 'true' : 'false'}
      data-page-reading-target-frame={overview.targetFrameId || undefined}
      onMouseDown={overview.open ? undefined : onSurfacePointerDown}
    >
      {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}
      <BlockEditRecoveryQueue receipts={blockEditRecoveryReceipts} conflicts={blockEditRecoveryConflicts}
        onApply={onApplyBlockEditRecovery} onDismiss={onDismissBlockEditRecovery}
        onInspect={onInspectBlockEditRecovery} onReplay={onReplayBlockEditRecovery} />

      <NoteFloatingPanelLayer {...floatingPanelProps} />
      {overview.open && <NoteOverviewLayer writingSurfaceProps={writingSurfaceProps}
        currentPageFrameId={overview.currentFrameId}
        onSelectPage={overview.selectPage} onClose={overview.close} />}
      <NoteWritingSurfaceLayer {...writingSurfaceProps} overviewOpen={overview.open} onToggleOverview={overview.toggle} />
      <NotePrintLayer {...writingSurfaceProps} />
    </div>
  );
  if (surfaceMode !== 'page' || !tray) return document;
  return <div className={styles.trayViewport}>
    <button type="button" className={`${styles.contentGroupLauncher} ${styles.trayToggle}`} aria-expanded={tray.open}
      data-note-tray-toggle="true" onClick={() => tray.setOpen(!tray.open)}>
      <Inbox size={16} aria-hidden="true" /><span>Staging ({tray.entries.length})</span>
    </button>
    <div className={styles.trayDocumentRow}>
      {document}
      {tray.open && <NoteTraySidebar tray={tray} />}
    </div>
  </div>;
});
