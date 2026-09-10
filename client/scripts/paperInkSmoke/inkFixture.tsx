import { createRoot } from 'react-dom/client';
import { HashRouter, useLocation } from 'react-router-dom';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { NOTE_ID, apiCalls } from './inkMockApi';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

function PaperInkSmoke() {
  const runtime = useNoteCanvasRuntimeController();
  const props = runtime.layerProps;
  return <div className={appStyles.layout}>
    <main className={appStyles.main} data-app-main-scroll="true">
      <div className={appStyles.content} data-app-content-shell="true">
        <p>13.5 C4 paper ink · isolated in-memory SQLite · production routes and runtime</p>
        <div aria-label="Synthetic print lifecycle controls">
          <button type="button" onClick={() => window.dispatchEvent(new Event('beforeprint'))}>Inspect print projection</button>
          <button type="button" onClick={() => window.dispatchEvent(new Event('afterprint'))}>End print inspection</button>
        </div>
        {props && <div className={`${styles.page} ${props.documentLayerProps.surfaceMode === 'canvas' ? styles.pageCanvas : ''}`}>
          <NoteChromeLayer {...props.chromeProps} />
          <NoteRuntimeDocumentLayer {...props.documentLayerProps} />
          <output data-ink-smoke-runtime="true" style={{ display: 'none' }}>{JSON.stringify({
            frames: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.pageFrames,
            objects: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.canvasObjects,
            placements: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.canvasPlacements,
            blocks: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.blockPlacements,
            calls: apiCalls,
          })}</output>
        </div>}
      </div>
    </main>
  </div>;
}

function RoutedPaperInkSmoke() {
  const { pathname } = useLocation();
  const noteId = pathname.startsWith('/notes/') ? pathname.slice('/notes/'.length) : NOTE_ID;
  return <NoteCanvasRuntimeProvider key={noteId} noteId={noteId}><PaperInkSmoke /></NoteCanvasRuntimeProvider>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><RoutedPaperInkSmoke /></HashRouter>);
