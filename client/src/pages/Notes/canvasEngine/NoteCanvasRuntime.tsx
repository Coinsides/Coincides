import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { useNoteCanvasRuntimeController } from './hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer, type NoteRuntimeDocumentHandle } from './layers/NoteRuntimeDocumentLayer';
import styles from '../NoteDetail.module.css';

export interface NoteCanvasRuntimeHandle {
  dismissTransientUI: () => void;
  flushPendingSaves: () => Promise<void>;
  refreshBoardTextRanges: () => Promise<void>;
}

const NoteCanvasRuntime = forwardRef<NoteCanvasRuntimeHandle, { onRequestClose?: () => void }>(function NoteCanvasRuntime({ onRequestClose }, ref) {
  const { hostMode = 'page' } = useNoteCanvasRuntime();
  const { layerProps, loading, loadError, note, dismissTransientUI: dismissControllerUI, flushPendingSaves, refreshBoardTextRanges } = useNoteCanvasRuntimeController();
  const documentRef = useRef<NoteRuntimeDocumentHandle>(null);
  const dismissTransientUI = useCallback(() => {
    documentRef.current?.resumeEditingForExit();
    dismissControllerUI();
  }, [dismissControllerUI]);
  useImperativeHandle(ref, () => ({ dismissTransientUI, flushPendingSaves, refreshBoardTextRanges }), [dismissTransientUI, flushPendingSaves, refreshBoardTextRanges]);
  const surfaceMode = layerProps?.documentLayerProps.surfaceMode;

  useEffect(() => {
    if (hostMode === 'modal') return;
    const lockClass = 'canvas-runtime-lock';
    if (surfaceMode === 'canvas') {
      document.body.classList.add(lockClass);
      return () => {
        document.body.classList.remove(lockClass);
      };
    }
    document.body.classList.remove(lockClass);
    return undefined;
  }, [hostMode, surfaceMode]);

  if (hostMode === 'modal' && loadError) {
    return <div className={styles.page}>
      <div className={styles.loading} role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={onRequestClose}>Return to board</button>
      </div>
    </div>;
  }

  if (loading || !note || !layerProps) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${surfaceMode === 'canvas' ? styles.pageCanvas : ''}`} data-note-host-mode={hostMode}>
      <NoteRuntimeDocumentLayer ref={documentRef} {...layerProps.documentLayerProps}
        writingSurfaceProps={{ ...layerProps.documentLayerProps.writingSurfaceProps,
          noteTools: <NoteChromeLayer {...layerProps.chromeProps} /> }} />
    </div>
  );
});

export default NoteCanvasRuntime;
