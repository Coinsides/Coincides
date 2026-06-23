import { useEffect } from 'react';
import { useNoteCanvasRuntimeController } from './hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from './layers/NoteRuntimeDocumentLayer';
import styles from '../NoteDetail.module.css';

export default function NoteCanvasRuntime() {
  const { layerProps, loading, note } = useNoteCanvasRuntimeController();
  const surfaceMode = layerProps?.documentLayerProps.surfaceMode;

  useEffect(() => {
    const lockClass = 'canvas-runtime-lock';
    if (surfaceMode === 'canvas') {
      document.body.classList.add(lockClass);
      return () => {
        document.body.classList.remove(lockClass);
      };
    }
    document.body.classList.remove(lockClass);
    return undefined;
  }, [surfaceMode]);

  if (loading || !note || !layerProps) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${surfaceMode === 'canvas' ? styles.pageCanvas : ''}`}>
      <NoteChromeLayer {...layerProps.chromeProps} />

      <NoteRuntimeDocumentLayer {...layerProps.documentLayerProps} />
    </div>
  );
}
