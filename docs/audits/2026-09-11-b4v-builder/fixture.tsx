import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import BoardPage from '../../../client/src/pages/Boards/BoardPage';
import '../../../client/src/i18n';
import '../../../client/src/styles/global.css';

function ReadOnlyViewportProbe() {
  const [label, setLabel] = useState('Waiting for the rendered board viewport…');
  useEffect(() => {
    let last = '';
    let frame = 0;
    const observe = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const world = document.querySelector<HTMLElement>('[data-testid="board-world"]');
        if (!world || world.style.transform === last) return;
        last = world.style.transform;
        const observation = {
          observed_at: new Date().toISOString(), source: 'actual DOM; read-only MutationObserver',
          transform: last, computed_transform: getComputedStyle(world).transform,
          landmarks: [...world.querySelectorAll<HTMLElement>('[data-visual-kind]')].map((element) => {
            const rect = element.getBoundingClientRect();
            return { id: element.dataset.testid, kind: element.dataset.visualKind,
              x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          }),
        };
        setLabel(`Rendered viewport: ${last}`);
        void fetch('/__fixture/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(observation) });
      });
    };
    const observer = new MutationObserver(observe);
    observer.observe(document.getElementById('root')!, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    observe();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return <output aria-label="Read-only viewport observation" style={{ position: 'fixed', left: 8, bottom: 4,
    zIndex: 200, padding: '2px 6px', font: '11px monospace', background: '#fff', color: '#222', pointerEvents: 'none' }}>{label}</output>;
}

// API calls use the unchanged production axios client and production boards router.
// Only this server's newly created SQLite :memory: database is reachable.
async function start() {
  const response = await fetch('/__fixture/state');
  if (!response.ok) throw new Error('The isolated B4v fixture is unavailable.');
  const state = await response.json() as { board_id: string };
  const path = `/boards/${state.board_id}`;
  createRoot(document.getElementById('root')!).render(
    <HashRouter>
      <div style={{ height: '100dvh' }}>
        <Routes>
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/boards" element={<p style={{ padding: 32 }}>Synthetic board deleted. Inspect /__fixture/state for cascade evidence.</p>} />
          <Route path="*" element={<Navigate to={path} replace />} />
        </Routes>
        {new URLSearchParams(window.location.search).get('probe') === '1' && <ReadOnlyViewportProbe />}
      </div>
    </HashRouter>,
  );
}
void start();
