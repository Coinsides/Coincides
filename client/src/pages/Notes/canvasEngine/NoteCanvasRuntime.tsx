import { useNoteCanvasRuntimeController } from './hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from './layers/NoteRuntimeDocumentLayer';
import styles from '../NoteDetail.module.css';

export default function NoteCanvasRuntime() {
  const { layerProps, loading, note } = useNoteCanvasRuntimeController();

  if (loading || !note || !layerProps) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const surfaceMode = layerProps.documentLayerProps.surfaceMode;

  return (
    <div className={`${styles.page} ${surfaceMode === 'canvas' ? styles.pageCanvas : ''}`}>
      <NoteChromeLayer {...layerProps.chromeProps} />

      <NoteRuntimeDocumentLayer {...layerProps.documentLayerProps} />
    </div>
  );
}
