import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import ToastContainer from '../../src/components/Toast/Toast';
import { useUIStore } from '../../src/stores/uiStore';
import { TRAY_DRAG_TYPE } from '../../src/pages/Notes/canvasEngine/trayService';
import { apiCalls, collectionPending, healthy, NOTE_ID, releaseCollection, storedState } from './mockApi';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

type Runtime = ReturnType<typeof useNoteCanvasRuntimeController>;
const toastReceipts: Array<{ type: string; message: string }> = [];
const dropReceipts: Array<{ tag: string | null; attributes: Record<string, string>; types: string[]; trayPlacement: string }> = [];
function sample(runtime: Runtime) {
  const props = runtime.layerProps?.documentLayerProps.writingSurfaceProps;
  const blockList = props?.blockListRef.current;
  const rects = [...(blockList?.querySelectorAll<HTMLElement>('[data-block-id]') || [])].map((node) => {
    const rect = node.getBoundingClientRect();
    return { blockId: node.dataset.blockId, tag: node.tagName, className: node.className,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const blockRects = [...(blockList?.querySelectorAll<HTMLElement>('[data-note-block-shell]') || [])].map((node) => {
    const rect = node.getBoundingClientRect();
    return { blockId: node.querySelector<HTMLElement>('[data-block-id]')?.dataset.blockId,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  return structuredClone({
    ready: Boolean(!runtime.loading && blockList), healthy,
    overview: Boolean(document.querySelector('[data-note-overview-root]')),
    runtimeCollection: runtime.runtimePageFrameCollection,
    runtimePlacements: props?.noteCanvasRuntime.blockPlacements,
    layouts: props?.blockLayouts, viewport: props?.noteCanvasRuntime.viewport,
    rects, blockRects, stored: storedState(), calls: apiCalls, pendingCollection: collectionPending(),
    toasts: useUIStore.getState().toasts.map(({ type, message }) => ({ type, message })),
    toastReceipts, dropReceipts,
    tray: runtime.layerProps?.documentLayerProps.tray?.entries.map((entry) => ({
      label: entry.label, category: entry.category, placement: entry.placement, blockId: entry.block?.id,
    })),
  });
}
declare global { interface Window { __frameHealingSmoke?: { sample: () => ReturnType<typeof sample>; releaseCollection: () => void } } }
function HealingRuntime() {
  const runtime = useNoteCanvasRuntimeController();
  const latest = useRef(runtime);
  const [evidence, setEvidence] = useState('');
  const [status, setStatus] = useState('Loading…');
  const [assertion, setAssertion] = useState('Smoke 1 not asserted');
  const beforeSave = useRef<ReturnType<typeof sample> | null>(null);
  const mode = runtime.layerProps?.documentLayerProps.surfaceMode;
  useLayoutEffect(() => { latest.current = runtime; });
  useEffect(() => {
    document.body.classList.toggle('canvas-runtime-lock', mode === 'canvas');
    return () => document.body.classList.remove('canvas-runtime-lock');
  }, [mode]);
  useEffect(() => {
    window.__frameHealingSmoke = { sample: () => sample(latest.current), releaseCollection };
    const seenToasts = new Set<string>();
    const unsubscribe = useUIStore.subscribe((state) => {
      for (const toast of state.toasts) {
        if (seenToasts.has(toast.id)) continue;
        seenToasts.add(toast.id);
        toastReceipts.push({ type: toast.type, message: toast.message });
      }
    });
    const recordDrop = (event: DragEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      dropReceipts.push({ tag: target?.tagName || null,
        attributes: Object.fromEntries([...(target?.attributes || [])].filter((attribute) => attribute.name.startsWith('data-')).map((attribute) => [attribute.name, attribute.value])),
        types: [...(event.dataTransfer?.types || [])], trayPlacement: event.dataTransfer?.getData(TRAY_DRAG_TYPE) || '',
      });
    };
    document.addEventListener('drop', recordDrop, true);
    const timer = window.setInterval(() => {
      setStatus(`${healthy ? 'Healthy' : 'Incomplete'} note · API calls ${apiCalls.length} · collection PUT pending ${collectionPending()}`);
    }, 150);
    return () => { window.clearInterval(timer); unsubscribe(); document.removeEventListener('drop', recordDrop, true); delete window.__frameHealingSmoke; };
  }, []);
  const assertSmokeOne = () => {
    const state = storedState();
    const collectionPuts = apiCalls.filter((call) => call.method === 'PUT' && call.url.endsWith('/page-frame-collection'));
    const layoutWrites = apiCalls.filter((call) => call.method === 'PUT' && call.url.includes('/block-placements/') && call.completed);
    const frameIds = state.collection?.pageFrames.map((frame) => frame.id) || [];
    const latestLayout = layoutWrites[layoutWrites.length - 1]?.body as { layout?: { frame_id?: string } } | undefined;
    const failures = [
      ...(collectionPuts.length !== (healthy ? 0 : 1) ? [`Expected ${healthy ? 0 : 1} collection PUT, received ${collectionPuts.length}`] : []),
      ...(!layoutWrites.length ? ['No successful block placement PUT'] : []),
      ...(!latestLayout?.layout?.frame_id || !frameIds.includes(latestLayout.layout.frame_id) ? ['Saved block layout lacks a frame_id in the stored collection'] : []),
      ...(toastReceipts.some((toast) => toast.message === 'Failed to save block layout') ? ['Observed Henry toast: Failed to save block layout'] : []),
    ];
    setAssertion(failures.length ? `FAIL placement smoke: ${failures.join('; ')}` : `PASS placement smoke: ${collectionPuts.length} collection PUT, successful block placement, frame_id in stored collection`);
    setEvidence(JSON.stringify(sample(latest.current), null, 2));
  };
  return <>
    <aside style={{ position: 'fixed', inset: '0 0 auto', height: 102, padding: '8px 20px', boxSizing: 'border-box', zIndex: 30000, background: '#fff', color: '#172033', borderBottom: '1px solid #aaa', font: '12px/1.4 monospace', overflow: 'auto' }}>
      <strong>F11 · in-memory NoteDetail controller and layers</strong>
      <output data-f11-status="true" style={{ display: 'block' }}>{status}</output>
      <button style={{ color: '#172033', background: '#eee' }} type="button" onClick={() => setEvidence(JSON.stringify(sample(latest.current), null, 2))}>Capture evidence</button>{' '}
      <button style={{ color: '#172033', background: '#eee' }} type="button" onClick={assertSmokeOne}>Assert smoke 1</button>{' '}
      <button style={{ color: '#172033', background: '#eee' }} type="button" onClick={() => { beforeSave.current = sample(latest.current); releaseCollection(); }}>Release collection PUT</button>{' '}
      <button style={{ color: '#172033', background: '#eee' }} type="button" onClick={() => {
        const before = beforeSave.current;
        const after = sample(latest.current);
        const request = after.calls.find((call) => call.method === 'PUT' && call.url.endsWith('/page-frame-collection'));
        const minted = (request?.body as { collection?: unknown })?.collection;
        const sameRects = Boolean(before && before.blockRects.length === 2
          && JSON.stringify(before.blockRects) === JSON.stringify(after.blockRects)
          && JSON.stringify(before.rects) === JSON.stringify(after.rects));
        const sameCollection = Boolean(before && JSON.stringify(before.runtimeCollection) === JSON.stringify(minted)
          && JSON.stringify(before.runtimeCollection) === JSON.stringify(after.runtimeCollection));
        setAssertion(`${sameRects && sameCollection ? 'PASS' : 'FAIL'} smoke 2: rectangles equal=${sameRects}, runtime/PUT/after collection equal=${sameCollection}`);
        setEvidence(JSON.stringify({ before, after }, null, 2));
      }}>Check saved geometry</button>{' '}
      <a href="?healthy=1">Healthy note</a>{' · '}<a href="?hold=1">Incomplete note, hold collection PUT</a>{' · '}<a href="?">Reset incomplete note</a>
      <details><summary>Captured runtime, screen rectangles, API payloads and toasts</summary><pre data-f11-evidence="true" style={{ whiteSpace: 'pre-wrap' }}>{evidence}</pre></details>
      <output data-f11-assertion="true" style={{ display: 'block' }}>{assertion}</output>
    </aside>
    <div className={appStyles.layout} style={{ height: 'calc(100vh - 102px)', marginTop: 102 }}>
      <main className={appStyles.main} data-app-main-scroll="true">
        <div className={appStyles.content} data-app-content-shell="true">
          {runtime.loading || !runtime.note || !runtime.layerProps ? <p>Loading synthetic note…</p>
            : <div className={`${styles.page} ${mode === 'canvas' ? styles.pageCanvas : ''}`}>
              <NoteChromeLayer {...runtime.layerProps.chromeProps} />
              <NoteRuntimeDocumentLayer {...runtime.layerProps.documentLayerProps} />
            </div>}
        </div>
      </main>
    </div>
    <ToastContainer />
  </>;
}
createRoot(document.getElementById('root')!).render(
  <HashRouter><NoteCanvasRuntimeProvider noteId={NOTE_ID} hostMode="page"><HealingRuntime /></NoteCanvasRuntimeProvider></HashRouter>,
);
