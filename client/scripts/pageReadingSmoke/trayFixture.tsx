import { createRoot } from 'react-dom/client';
import { HashRouter, useLocation } from 'react-router-dom';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { NOTE_ID } from './mockApi';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

function TraySmoke() {
  const runtime = useNoteCanvasRuntimeController();
  const props = runtime.layerProps;
  return <div className={appStyles.layout}>
    <main className={appStyles.main} data-app-main-scroll="true">
      <div className={appStyles.content} data-app-content-shell="true">
        <p>13.2 tray smoke · isolated in-memory SQLite · production routes and runtime</p>
        {props && <div className={`${styles.page} ${props.documentLayerProps.surfaceMode === 'canvas' ? styles.pageCanvas : ''}`}>
          <NoteChromeLayer {...props.chromeProps} />
          <NoteRuntimeDocumentLayer {...props.documentLayerProps} />
          <output data-tray-smoke-runtime="true" style={{display:'none'}}>{JSON.stringify({
            blocks:props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.blockPlacements,
            layouts:props.documentLayerProps.writingSurfaceProps.blockLayouts,
          })}</output>
        </div>}
      </div>
    </main>
  </div>;
}
function RoutedTraySmoke() {
  const { pathname } = useLocation();
  const noteId = pathname.startsWith('/notes/') ? pathname.slice('/notes/'.length) : NOTE_ID;
  return <NoteCanvasRuntimeProvider key={noteId} noteId={noteId}><TraySmoke /></NoteCanvasRuntimeProvider>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><RoutedTraySmoke /></HashRouter>);
