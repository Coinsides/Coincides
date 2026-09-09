import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import BoardPage from '../../src/pages/Boards/BoardPage';
import ToastContainer from '../../src/components/Toast/Toast';
import { BOARD_TEXT_RANGE_MIME } from '../../src/pages/Boards/boardTextRangeClipboard';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { BOARD_A, BOARD_B, NOTE_ID, diagnostic, resetSample } from './mockApi';
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
function Smoke() {
  const [snapshot, setSnapshot] = useState(diagnostic);
  const [clipboard, setClipboard] = useState<unknown>(null);
  useEffect(() => {
    const inspectPaste = (event: ClipboardEvent) => setClipboard({
      types: Array.from(event.clipboardData?.types || []),
      files: Array.from(event.clipboardData?.files || []).map((file) => ({ type: file.type, size: file.size })),
      text: event.clipboardData?.getData('text/plain'),
      reference: event.clipboardData?.getData(BOARD_TEXT_RANGE_MIME),
    });
    window.addEventListener('paste', inspectPaste, true);
    return () => window.removeEventListener('paste', inspectPaste, true);
  }, []);
  useEffect(() => {
    const refresh = () => setSnapshot(diagnostic());
    window.addEventListener('range-smoke-state', refresh);
    return () => window.removeEventListener('range-smoke-state', refresh);
  }, []);
  return <>
    <nav aria-label="Synthetic smoke navigation" style={{ display: 'flex', gap: 20, padding: '12px 20px', alignItems: 'center',
      background: '#fff', color: '#111', borderBottom: '1px solid #bbb', position: 'relative', zIndex: 1000 }}>
      <strong>13.4 text range · synthetic transport only</strong>
      <Link style={{ color: '#111' }} to={`/notes/${NOTE_ID}`}>Note</Link><Link style={{ color: '#111' }} to={`/boards/${BOARD_A}`}>Board A</Link><Link style={{ color: '#111' }} to={`/boards/${BOARD_B}`}>Board B</Link>
      <button style={{ color: '#111' }} type="button" onClick={resetSample}>Reset sample</button>
    </nav>
    <Routes>
      <Route path="/notes/:noteId" element={<NoteCanvasRuntimeProvider noteId={NOTE_ID}><SourceNote /></NoteCanvasRuntimeProvider>} />
      <Route path="/boards/:boardId" element={<div style={{ height: 'calc(100dvh - 49px)', minHeight: 0 }}><BoardPage /></div>} />
      <Route path="*" element={<Navigate to={`/notes/${NOTE_ID}`} replace />} />
    </Routes>
    <ToastContainer />
    <details style={{ position: 'fixed', bottom: 4, right: 4, zIndex: 2000, background: '#fff', color: '#111', border: '1px solid #bbb',
      padding: 8, maxWidth: 640, maxHeight: '48vh', overflow: 'auto' }}>
      <summary>Synthetic data: offsets, excerpts, health, API calls</summary>
      <pre data-testid="range-smoke-diagnostic" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify({ clipboard, ...snapshot }, null, 2)}</pre>
    </details>
  </>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><Smoke /></HashRouter>);
