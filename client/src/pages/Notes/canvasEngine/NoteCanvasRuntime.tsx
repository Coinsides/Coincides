import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { useNoteCanvasRuntimeController } from './hooks/useNoteCanvasRuntimeController';
import { useSourcePageViewController } from './hooks/useSourcePageViewController';
import { sourceProjectionPolicyForNote } from './sourceProjectionPolicy';
import { NoteChromeLayer } from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer, type NoteRuntimeDocumentHandle } from './layers/NoteRuntimeDocumentLayer';
import styles from '../NoteDetail.module.css';
import { PaperSkinContext } from './PaperSkinContext';
import { SkinFloatCard } from '@/components/Skin/SkinFloatCard';
import { NotePaperControls } from './layers/NotePaperControls';
import { NoteInsertCommandsProvider } from './NoteInsertCommandsContext';
import { SourceConversionNotice } from './layers/SourceConversionNotice';
import { SourceViewToggle } from './layers/SourceViewToggle';

export interface NoteCanvasRuntimeHandle {
  dismissTransientUI: () => void;
  flushPendingSaves: () => Promise<void>;
  /** After a departure the route guard could not hold: settles when this note's writes have, rejects if one failed. */
  whenLeaveSettled?: () => Promise<void>;
  /** Keeps the open, unsealed text in the kept-words archive (a departure that cannot wait for its save). */
  keepOpenEdit?: () => void;
  /** Take back what keepOpenEdit kept: the departure did not happen after all (A-20 r3). */
  withdrawKeptEdit?: () => void;
  /** Whether anything on screen is still not on the server: asked again before a departure goes on. */
  hasUnsavedEdit?: () => boolean;
  refreshBoardTextRanges: () => Promise<void>;
}

const NoteCanvasRuntimeContent = forwardRef<NoteCanvasRuntimeHandle, { onRequestClose?: () => void }>(function NoteCanvasRuntimeContent({ onRequestClose }, ref) {
  const { hostMode = 'page', noteId } = useNoteCanvasRuntime();
  const { layerProps, loading, loadError, note, skin, paper, layoutMode, runtimePageFrameCollection, showAppearancePanel, toggleAppearancePanel,
    dismissTransientUI: dismissControllerUI, flushPendingSaves, whenLeaveSettled, keepOpenEdit, withdrawKeptEdit, hasUnsavedEdit, refreshBoardTextRanges,
  } = useNoteCanvasRuntimeController();
  // The note lags the route while the next one hydrates, so a projection's class must
  // not stand in for the note the route has already moved to.
  const sourcePageView = useSourcePageViewController({ noteId,
    enabled: hostMode === 'page' && note?.id === noteId && sourceProjectionPolicyForNote(note ?? null).isSourceProjection });
  const documentRef = useRef<NoteRuntimeDocumentHandle>(null);
  const appearanceAnchorRef = useRef<HTMLButtonElement>(null);
  const dismissTransientUI = useCallback(() => {
    documentRef.current?.resumeEditingForExit();
    dismissControllerUI();
  }, [dismissControllerUI]);
  // A-20 r3d (N5): withdrawKeptEdit was left out of this handle, so the route guard's take-back (a departure the router
  // held after all) called nothing and the record stayed kept while the person was still on the note.
  useImperativeHandle(ref, () => ({ dismissTransientUI, flushPendingSaves, whenLeaveSettled, keepOpenEdit, withdrawKeptEdit, hasUnsavedEdit,
    refreshBoardTextRanges }),
  [dismissTransientUI, flushPendingSaves, whenLeaveSettled, keepOpenEdit, withdrawKeptEdit, hasUnsavedEdit, refreshBoardTextRanges]);

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
      {!sourcePageView.active && <SourceConversionNotice note={note} />}
      {sourcePageView.available && !sourcePageView.active && <div className={styles.sourceViewFloat} data-source-view-float="true">
        <SourceViewToggle view={sourcePageView} />
      </div>}
      <NoteRuntimeDocumentLayer ref={documentRef} {...layerProps.documentLayerProps} sourcePageView={sourcePageView}
        writingSurfaceProps={{ ...layerProps.documentLayerProps.writingSurfaceProps,
          noteTools: <NoteChromeLayer {...layerProps.chromeProps} mountAppearanceCard={false} appearanceAnchorRef={appearanceAnchorRef} /> }} />
    </div>
    </PaperSkinContext.Provider>
  );
  return <>
    <SkinFloatCard noteId={noteId ?? ''} skin={skin} open={showAppearancePanel} onClose={toggleAppearancePanel}
      paperControls={paper && runtimePageFrameCollection ? <NotePaperControls key={`paper-${noteId}`} paper={paper}
        collection={runtimePageFrameCollection} layoutMode={layoutMode}
        disabled={Boolean(layerProps?.chromeProps.contentReadOnly)} /> : undefined}
      anchorRef={appearanceAnchorRef} disabled={loading || !note || !layerProps || Boolean(loadError)} />
    {content}
  </>;
});

const NoteCanvasRuntime = forwardRef<NoteCanvasRuntimeHandle, { onRequestClose?: () => void }>(function NoteCanvasRuntime(props, ref) {
  return <NoteInsertCommandsProvider><NoteCanvasRuntimeContent {...props} ref={ref} /></NoteInsertCommandsProvider>;
});

export default NoteCanvasRuntime;
