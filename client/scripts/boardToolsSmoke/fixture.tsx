import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import BoardPage from '../../src/pages/Boards/BoardPage';
import { BOARD_PATH, STATE_EVENT, diagnostic, resetSample } from './mockApi';
import '../../src/i18n';
import '../../src/styles/global.css';

function Smoke() {
  const [visit, setVisit] = useState(0);
  const [state, setState] = useState(diagnostic);
  useEffect(() => {
    const refresh = () => setState(diagnostic());
    window.addEventListener(STATE_EVENT, refresh);
    return () => window.removeEventListener(STATE_EVENT, refresh);
  }, []);
  return <>
    <nav aria-label="Synthetic fixture controls" style={{ display: 'flex', gap: 20, padding: 12, background: '#fff', color: '#111' }}>
      <strong>13.4 Board tools · memory fixture</strong>
      {(['empty', 'group', 'mixed', 'alignment'] as const).map((sample) => <button key={sample}
        onClick={() => { resetSample(sample); setVisit((n) => n + 1); }}>{sample} sample</button>)}
      <button onClick={() => setVisit((n) => n + 1)}>Reopen saved board</button>
    </nav>
    <div style={{ height: 'calc(100dvh - 48px)' }} key={visit}>
      <Routes><Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<Navigate to={BOARD_PATH} replace />} /></Routes>
    </div>
    <details style={{ position: 'fixed', bottom: 4, right: 4, zIndex: 100, background: '#fff', color: '#111',
      padding: 8, maxWidth: 600, maxHeight: '40vh', overflow: 'auto', border: '1px solid #777' }}>
      <summary>Synthetic saved state</summary>
      <pre data-testid="tools-smoke-state" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify(state, null, 2)}</pre>
    </details>
  </>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><Smoke /></HashRouter>);
