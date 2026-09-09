import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { useNoteCanvasRuntimeController } from './hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from './layers/NoteRuntimeDocumentLayer';
import styles from '../NoteDetail.module.css';

export interface NoteCanvasRuntimeHandle {
  dismissTransientUI: () => void;
  flushPendingSaves: () => Promise<void>;
}

const NoteCanvasRuntime = forwardRef<NoteCanvasRuntimeHandle, { onRequestClose?: () => void }>(function NoteCanvasRuntime({ onRequestClose }, ref) {
  const { hostMode = 'page' } = useNoteCanvasRuntime();
  const { layerProps, loading, loadError, note, dismissTransientUI, flushPendingSaves } = useNoteCanvasRuntimeController();
  useImperativeHandle(ref, () => ({ dismissTransientUI, flushPendingSaves }), [dismissTransientUI, flushPendingSaves]);
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
      <NoteChromeLayer {...layerProps.chromeProps}
        {...(hostMode === 'modal' && onRequestClose ? { onBackProject: onRequestClose } : {})} />

      <NoteRuntimeDocumentLayer {...layerProps.documentLayerProps} />
    </div>
  );
});

export default NoteCanvasRuntime;
