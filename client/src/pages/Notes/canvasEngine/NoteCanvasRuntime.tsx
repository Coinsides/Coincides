import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { useNoteCanvasRuntimeController } from './hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer, type NoteRuntimeDocumentHandle } from './layers/NoteRuntimeDocumentLayer';
import styles from '../NoteDetail.module.css';
import { PaperSkinContext } from './PaperSkinContext';
import { SkinFloatCard } from '@/components/Skin/SkinFloatCard';

export interface NoteCanvasRuntimeHandle {
  dismissTransientUI: () => void;
  flushPendingSaves: () => Promise<void>;
  refreshBoardTextRanges: () => Promise<void>;
}

const NoteCanvasRuntime = forwardRef<NoteCanvasRuntimeHandle, { onRequestClose?: () => void }>(function NoteCanvasRuntime({ onRequestClose }, ref) {
  const { hostMode = 'page', noteId } = useNoteCanvasRuntime();
  const { layerProps, loading, loadError, note, skin, showAppearancePanel, toggleAppearancePanel,
    dismissTransientUI: dismissControllerUI, flushPendingSaves, refreshBoardTextRanges } = useNoteCanvasRuntimeController();
  const documentRef = useRef<NoteRuntimeDocumentHandle>(null);
  const appearanceAnchorRef = useRef<HTMLButtonElement>(null);
  const dismissTransientUI = useCallback(() => {
    documentRef.current?.resumeEditingForExit();
    dismissControllerUI();
  }, [dismissControllerUI]);
  useImperativeHandle(ref, () => ({ dismissTransientUI, flushPendingSaves, refreshBoardTextRanges }), [dismissTransientUI, flushPendingSaves, refreshBoardTextRanges]);

  const content = hostMode === 'modal' && loadError ? <div className={styles.page}>
      <div className={styles.loading} role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={onRequestClose}>Return to board</button>
      </div>
    </div> : loading || !note || !layerProps ? (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    ) : (
    <PaperSkinContext.Provider value={skin}>
    <div className={styles.page} data-note-host-mode={hostMode}
      data-note-skin-preset={skin.materialPreset ?? skin.preset} style={skin.style}>
      {skin.error && <div role="alert">{skin.error}<button type="button" onClick={skin.retry}>重试</button></div>}
      <NoteRuntimeDocumentLayer ref={documentRef} {...layerProps.documentLayerProps}
        writingSurfaceProps={{ ...layerProps.documentLayerProps.writingSurfaceProps,
          noteTools: <NoteChromeLayer {...layerProps.chromeProps} mountAppearanceCard={false} appearanceAnchorRef={appearanceAnchorRef} /> }} />
    </div>
    </PaperSkinContext.Provider>
  );
  return <>
    <SkinFloatCard noteId={noteId ?? ''} skin={skin} open={showAppearancePanel} onClose={toggleAppearancePanel}
      anchorRef={appearanceAnchorRef} disabled={loading || !note || !layerProps || Boolean(loadError)} />
    {content}
  </>;
});

export default NoteCanvasRuntime;
