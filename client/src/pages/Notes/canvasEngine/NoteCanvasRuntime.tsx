import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useUIStore } from '@/stores/uiStore';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { useNoteCanvasRuntimeController } from './hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer, type NoteRuntimeDocumentHandle } from './layers/NoteRuntimeDocumentLayer';
import styles from '../NoteDetail.module.css';

export interface NoteCanvasRuntimeHandle {
  dismissTransientUI: () => void;
  flushPendingSaves: () => Promise<void>;
}

const NoteCanvasRuntime = forwardRef<NoteCanvasRuntimeHandle, { onRequestClose?: () => void }>(function NoteCanvasRuntime({ onRequestClose }, ref) {
  const { hostMode = 'page' } = useNoteCanvasRuntime();
  const { layerProps, loading, loadError, note, dismissTransientUI: dismissControllerUI, flushPendingSaves } = useNoteCanvasRuntimeController();
  const documentRef = useRef<NoteRuntimeDocumentHandle>(null);
  const leaving = useRef(false);
  const addToast = useUIStore((state) => state.addToast);
  const dismissTransientUI = useCallback(() => {
    documentRef.current?.resumeEditingForExit();
    dismissControllerUI();
  }, [dismissControllerUI]);
  useImperativeHandle(ref, () => ({ dismissTransientUI, flushPendingSaves }), [dismissTransientUI, flushPendingSaves]);
  const surfaceMode = layerProps?.documentLayerProps.surfaceMode;

  const backToProject = async () => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      // Leaving the note is an ordinary editing boundary, not an overview action.
      dismissTransientUI();
      await Promise.resolve();
      flushSync(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      await flushPendingSaves();
      layerProps?.chromeProps.onBackProject();
    } catch {
      addToast('error', 'Changes could not be saved. Please retry before leaving the note.');
    } finally {
      leaving.current = false;
    }
  };

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
        onBackProject={hostMode === 'modal' && onRequestClose ? onRequestClose : () => { void backToProject(); }} />

      <NoteRuntimeDocumentLayer ref={documentRef} {...layerProps.documentLayerProps} />
    </div>
  );
});

export default NoteCanvasRuntime;
