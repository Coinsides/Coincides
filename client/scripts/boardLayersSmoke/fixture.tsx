import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import BoardPage from '../../src/pages/Boards/BoardPage';
import { BOARD_PATH, STATE_EVENT, detail, diagnostic, resetSample, seedEdge, seedLayer, seedMember, seedVisual } from '../boardToolsSmoke/mockApi';
import '../../src/i18n';
import '../../src/styles/global.css';

type Sample = 'empty' | 'overlap' | 'cross-layer' | 'selection' | 'legacy';
function sampleData(sample: Sample) {
  resetSample();
  detail.board.title = 'Board layers workshop';
  if (sample === 'empty') return;
  const first = sample === 'legacy' ? null : seedLayer('Ideas').id;
  const second = sample === 'legacy' ? null : seedLayer('Evidence').id;
  const a = seedMember('A · Ideas', { x: 100, y: 100, layer_id: first, z_index: 90 });
  const b = seedMember('B · Evidence', { x: sample === 'overlap' ? 175 : 430,
    y: sample === 'overlap' ? 150 : 100, layer_id: second, z_index: -2 });
  if (sample === 'cross-layer' || sample === 'legacy') {
    seedEdge(a, b, { label: 'Across the layers', style: { direction: 'both' } });
    seedMember('Waiting in staging', { placed: false, layer_id: first });
  }
  if (sample !== 'overlap') seedVisual({ visual_kind: 'sticky', x: 110, y: 300,
    layer_id: first, data: { text: 'Select me with A and B, then Move to layer.' } });
  if (sample === 'legacy') seedVisual({ x: 110, y: 450, layer_id: null });
}
sampleData('overlap');

function Smoke() {
  const [visit, setVisit] = useState(0);
  const [state, setState] = useState(diagnostic);
  useEffect(() => {
    const refresh = () => setState(diagnostic());
    window.addEventListener(STATE_EVENT, refresh);
    return () => window.removeEventListener(STATE_EVENT, refresh);
  }, []);
  return <>
    <nav aria-label="Synthetic fixture controls" style={{ display: 'flex', gap: 16, padding: 12, background: '#fff', color: '#111' }}>
      <strong>13.4 Board layers · memory fixture</strong>
      {(['empty', 'overlap', 'cross-layer', 'selection', 'legacy'] as const).map((sample) => <button key={sample}
        onClick={() => { sampleData(sample); setState(diagnostic()); setVisit((n) => n + 1); }}>{sample} sample</button>)}
      <button onClick={() => setVisit((n) => n + 1)}>Reopen saved board</button>
    </nav>
    <div style={{ height: 'calc(100dvh - 48px)' }} key={visit}>
      <Routes><Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<Navigate to={BOARD_PATH} replace />} /></Routes>
    </div>
    <details style={{ position: 'fixed', bottom: 4, right: 4, zIndex: 100, background: '#fff', color: '#111',
      padding: 8, maxWidth: 600, maxHeight: '40vh', overflow: 'auto', border: '1px solid #777' }}>
      <summary>Synthetic saved state</summary>
      <pre data-testid="layers-smoke-state" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify(state, null, 2)}</pre>
    </details>
  </>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><Smoke /></HashRouter>);
