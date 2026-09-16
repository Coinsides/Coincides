import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import BoardPage from '../../src/pages/Boards/BoardPage';
import { BOARD_PATH, STATE_EVENT, diagnostic, resetSample, seedSticky, seedVisualEdge } from './mockApi';
import '../../src/i18n';
import '../../src/styles/global.css';

function Smoke() {
  const [visit, setVisit] = useState(0);
  const [state, setState] = useState(diagnostic);
  const [theme, setTheme] = useState('dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  function visualSample() {
    resetSample();
    const a = seedSticky({ x: 120, y: 130, h: 240, text: '输入 · Neutral\n轻量概念住在板上。\n\n固定字号，保留换行。' });
    const b = seedSticky({ x: 620, y: 130, h: 240, weight: 2, color_index: 1, text: '整理 · Medium\n同一色槽的浅底与描边。' });
    const c = seedSticky({ x: 1140, y: 150, w: 416, h: 140, weight: 3, color_index: 1, text: '结论 · Heavy\n强调色实底，文字反衬。' });
    seedVisualEdge({ from: { kind: 'sticky', id: a.id, anchor: 'e' }, to: { kind: 'sticky', id: b.id, anchor: 'w' }, label: '水平标签\n在矩形内断线', weight: 2, bend: -26, cap_end: 'arrow' });
    seedVisualEdge({ from: { kind: 'sticky', id: b.id, anchor: 'e' }, to: { kind: 'sticky', id: c.id, anchor: 'w' }, label: '只表达视觉连接', weight: 3, dash: 'dashed', bend: 24, cap_start: 'dot', cap_end: 'arrow' });
    setVisit((n) => n + 1); setState(diagnostic());
  }
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
      <button onClick={visualSample}>Visual v1 sample</button>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</button>
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
const root = createRoot(document.getElementById('root')!);
root.render(<HashRouter><Smoke /></HashRouter>);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
