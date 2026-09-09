import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import BoardPage from '../../src/pages/Boards/BoardPage';
import ToastContainer from '../../src/components/Toast/Toast';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { BOARD_ID, STATE_EVENT, configureNextNoteLoadFailure, configureNextWrite, diagnostic, populateNavigationTargets, resetSample, settleHeldWrite } from './mockApi';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

function SourceNote() {
  const runtime = useNoteCanvasRuntimeController();
  const props = runtime.layerProps;
  return <div className={appStyles.layout}>
    <main className={appStyles.main} data-app-main-scroll="true">
      <div className={appStyles.content} data-app-content-shell="true">
        {props && <div className={`${styles.page} ${props.documentLayerProps.surfaceMode === 'canvas' ? styles.pageCanvas : ''}`}>
          <NoteChromeLayer {...props.chromeProps} />
          <NoteRuntimeDocumentLayer {...props.documentLayerProps} />
        </div>}
      </div>
    </main>
  </div>;
}
function NoteRoute() {
  const { noteId } = useParams();
  return <NoteCanvasRuntimeProvider key={noteId} noteId={noteId}><SourceNote /></NoteCanvasRuntimeProvider>;
}
function Smoke() {
  const [snapshot, setSnapshot] = useState(diagnostic);
  useEffect(() => {
    const refresh = () => setSnapshot(diagnostic());
    window.addEventListener(STATE_EVENT, refresh);
    return () => window.removeEventListener(STATE_EVENT, refresh);
  }, []);
  return <>
    <nav aria-label="Synthetic smoke navigation" style={{ display: 'flex', gap: 20, padding: '12px 20px', alignItems: 'center',
      background: '#fff', color: '#111', borderBottom: '1px solid #bbb' }}>
      <strong>13.4 Open note · synthetic transport only</strong>
      <Link style={{ color: '#111' }} to={`/boards/${BOARD_ID}`}>Fixture board</Link>
      <button style={{ color: '#111' }} type="button" onClick={resetSample}>Reset sample</button>
    </nav>
    <Routes>
      <Route path="/notes/:noteId" element={<NoteRoute />} />
      <Route path="/boards/:boardId" element={<div style={{ height: 'calc(100dvh - 49px)', minHeight: 0 }}><BoardPage /></div>} />
      <Route path="*" element={<Navigate to={`/boards/${BOARD_ID}`} replace />} />
    </Routes>
    <ToastContainer />
    <details data-canvas-layer="floating-overlay" data-synthetic-transport-controls="true"
      style={{ position: 'fixed', bottom: 4, right: 4, zIndex: 2147483000, background: '#fff', color: '#111',
      border: '1px solid #bbb', padding: 8, maxWidth: 700, maxHeight: '48vh', overflow: 'auto' }}>
      <summary>Synthetic transport controls and evidence</summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
        <button disabled={snapshot.navigationTargets} onClick={populateNavigationTargets}>Populate navigation targets</button>
        <button onClick={configureNextNoteLoadFailure}>Fail next note load</button>
        <button onClick={() => configureNextWrite('body', 'hold')}>Hold next body write</button>
        <button onClick={() => configureNextWrite('range', 'hold')}>Hold next range write</button>
        <button onClick={() => configureNextWrite('body', 'fail')}>Fail next body write</button>
        <button onClick={() => configureNextWrite('range', 'fail')}>Fail next range write</button>
        <button disabled={!snapshot.heldWrite} onClick={() => settleHeldWrite()}>Release held write</button>
        <button disabled={!snapshot.heldWrite} onClick={() => settleHeldWrite(true)}>Reject held write</button>
      </div>
      <pre data-testid="open-note-smoke-diagnostic" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify(snapshot, null, 2)}</pre>
    </details>
  </>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><Smoke /></HashRouter>);
