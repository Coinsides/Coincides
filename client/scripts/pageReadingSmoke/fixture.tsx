import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { apiCalls, fixtureBlocks, fixtureFrame, NOTE_ID } from './mockApi';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

type Snapshot = {
  mode: string;
  gear: string;
  step: number;
  clientWidth: number;
  transform: string;
  scale: number;
  viewport: unknown;
  layouts: unknown;
  localGeometry: unknown;
  frameGeometry: unknown;
  paperRect: { top: number; bottom: number; height: number; width: number };
  appRect: { top: number; bottom: number; height: number; width: number };
  appScrollTop: number;
  paperInternalHeight: number;
  mappedPaperHeight: number;
  fitPageWithinApp?: boolean;
};
type Report = { current?: Snapshot; samples: string[]; checks: string[]; details: string };
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const geometry = (layout: {
  x?: unknown; y?: unknown; width?: unknown; height?: unknown;
  coordinate_space?: unknown; frame_id?: unknown;
} | null | undefined) => layout && ({
  x: layout.x, y: layout.y, width: layout.width, height: layout.height,
  coordinate_space: layout.coordinate_space, frame_id: layout.frame_id,
});

function SmokeRuntime() {
  // Production controller and layers are used without mocking their implementation.
  const runtime = useNoteCanvasRuntimeController();
  const latest = useRef(runtime);
  const [report, setReport] = useState<Report>({ samples: [], checks: [], details: '' });
  const mode = runtime.layerProps?.documentLayerProps.surfaceMode;
  useLayoutEffect(() => { latest.current = runtime; });
  useEffect(() => {
    document.body.classList.toggle('canvas-runtime-lock', mode === 'canvas');
    return () => document.body.classList.remove('canvas-runtime-lock');
  }, [mode]);

  useEffect(() => {
    let lastCandidate = '';
    let stableTicks = 0;
    let previousMode = '';
    let canvasVisits = 0;
    const samples = new Map<string, Snapshot>();
    const errors = new Set<string>();
    let lastPublished = '';
    const originalLocal = fixtureBlocks.map((block) => ({ id: block.id, ...geometry(block.canvas_layout) }));
    const originalFrame = JSON.stringify(fixtureFrame);
    const timer = window.setInterval(() => {
      const current = latest.current;
      if (current.loading || !current.note || !current.layerProps) return;
      const props = current.layerProps.documentLayerProps.writingSurfaceProps;
      const blockList = props.blockListRef.current;
      if (!blockList || !blockList.clientWidth) return;
      const transformed = props.surfaceMode === 'canvas'
        ? blockList
        : blockList.closest<HTMLElement>('[data-page-display-scale]') || blockList;
      const transform = getComputedStyle(transformed).transform;
      const scale = transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
      const paperBox = transformed.getBoundingClientRect();
      const app = blockList.closest<HTMLElement>('[data-app-main-scroll="true"]')!;
      const appBox = app.getBoundingClientRect();
      const appVisibleTop = appBox.top + app.clientTop;
      const appVisibleBottom = appVisibleTop + app.clientHeight;
      const fitPageAtTop = props.surfaceMode === 'page'
        && props.pageReadingViewState?.gear === 'fit_page'
        && props.pageReadingViewState?.stepFactor === 1
        && transformed.dataset.pageReadingEffectiveGear === 'fit_page'
        && app.scrollTop === 0;
      const paperInternalHeight = parseFloat(getComputedStyle(transformed).height);
      const next: Snapshot = {
        mode: props.surfaceMode,
        gear: props.pageReadingViewState?.gear || 'fit_width',
        step: props.pageReadingViewState?.stepFactor || 1,
        clientWidth: blockList.clientWidth,
        transform,
        scale,
        viewport: props.noteCanvasRuntime.viewport,
        layouts: Object.fromEntries(Object.entries(props.blockLayouts).map(([id, layout]) => [id, geometry(layout)])),
        localGeometry: props.allBlocks.map((block) => ({ id: block.id, ...geometry(block.canvas_layout) })),
        frameGeometry: props.noteCanvasRuntime.pageFrames,
        paperRect: { top: paperBox.top, bottom: paperBox.bottom, height: paperBox.height, width: paperBox.width },
        appRect: { top: appVisibleTop, bottom: appVisibleBottom, height: app.clientHeight, width: app.clientWidth },
        appScrollTop: app.scrollTop,
        paperInternalHeight,
        mappedPaperHeight: paperInternalHeight * props.noteCanvasRuntime.viewport.zoom,
        fitPageWithinApp: fitPageAtTop
          ? paperBox.top >= appVisibleTop - 1 && paperBox.bottom <= appVisibleBottom + 1
          : undefined,
      };
      const candidate = JSON.stringify(next);
      if (candidate !== lastCandidate) { lastCandidate = candidate; stableTicks = 0; return; }
      if (++stableTicks < 3) return;
      if (next.mode !== previousMode) {
        if (next.mode === 'canvas') canvasVisits += 1;
        previousMode = next.mode;
      }
      const id = next.mode === 'canvas' ? `canvas-${canvasVisits}` : `${next.gear} × ${next.step}`;
      samples.set(id, next);
      const page = [...samples.values()].filter((sample) => sample.mode === 'page');
      const baseline = page[0];
      if (baseline && page.some((sample) => sample.clientWidth !== baseline.clientWidth)) errors.add('FAIL page clientWidth changed');
      if (baseline && page.some((sample) => !equal(sample.layouts, baseline.layouts))) errors.add('FAIL page blockLayouts changed');
      if (page.some((sample) => !equal(sample.localGeometry, originalLocal))) errors.add('FAIL persisted page_frame_local geometry changed');
      if (originalFrame !== JSON.stringify(fixtureFrame)) errors.add('FAIL fixture frame geometry changed');
      if (Object.keys(props.blockLayouts).length !== fixtureBlocks.length) errors.add('FAIL not all specimen blocks rendered');
      if (Math.abs(props.noteCanvasRuntime.viewport.zoom - scale) > 0.00001) errors.add('FAIL runtime zoom differs from rendered scale');
      if (next.fitPageWithinApp === false) errors.add('FAIL fit_page paper exceeds app visible bounds');
      const writes = apiCalls.filter((call) => call.method !== 'GET' && call.url !== '/source-anchors/generate');
      if (writes.length) errors.add('FAIL unexpected API write');
      const firstCanvas = samples.get('canvas-1');
      const secondCanvas = samples.get('canvas-2');
      const canvasUnchanged = Boolean(firstCanvas && secondCanvas
        && equal(firstCanvas.viewport, secondCanvas.viewport)
        && equal(firstCanvas.layouts, secondCanvas.layouts)
        && firstCanvas.clientWidth === secondCanvas.clientWidth
        && firstCanvas.transform === secondCanvas.transform);
      if (firstCanvas && secondCanvas && !canvasUnchanged) errors.add('FAIL canvas visits differ');
      const gears = ['fit_width', 'physical', 'fit_page'];
      const allGears = gears.every((gear) => samples.has(`${gear} × 1`));
      const varied = new Set(gears.map((gear) => samples.get(`${gear} × 1`)?.transform).filter(Boolean)).size === 3;
      const fittedPage = samples.get('fit_page × 1');
      const fitPageVisible = fittedPage?.fitPageWithinApp === true;
      const complete = allGears && varied && canvasUnchanged && fitPageVisible && !errors.size;
      const checks = [
        complete ? 'PASS complete browser smoke' : errors.size ? 'FAIL see checks' : 'PENDING complete the route',
        `Three gears: ${allGears ? 'PASS' : 'PENDING'}; three transforms: ${varied ? 'PASS' : 'PENDING'}`,
        `Page clientWidth and all ${fixtureBlocks.length} blockLayouts: ${baseline && ![...errors].some((error) => error.includes('page clientWidth') || error.includes('page blockLayouts')) ? 'PASS' : 'PENDING'}`,
        `Persisted page_frame_local geometry: ${[...errors].some((error) => error.includes('persisted')) ? 'FAIL' : 'PASS'}; unexpected writes: ${writes.length}`,
        `Fit page within app at scrollTop=0: ${fitPageVisible ? 'PASS' : fittedPage?.fitPageWithinApp === false ? 'FAIL' : 'PENDING'}`,
        `Canvas before/after: ${secondCanvas ? canvasUnchanged ? 'PASS' : 'FAIL' : 'PENDING'}`,
        ...errors,
      ];
      const sampleLines = [...samples.entries()].map(([key, value]) => (
        `${key}: clientWidth=${value.clientWidth}; runtimeZoom=${(value.viewport as { zoom: number }).zoom}; ${value.transform}`
        + (value.mode === 'page' ? `; paperY=${value.paperRect.top.toFixed(2)}..${value.paperRect.bottom.toFixed(2)}; appY=${value.appRect.top.toFixed(2)}..${value.appRect.bottom.toFixed(2)}; paperHeight=${value.paperRect.height.toFixed(2)} mapped=${value.mappedPaperHeight.toFixed(2)}` : '')
      ));
      const details = JSON.stringify({ samples: Object.fromEntries(samples), apiCalls }, null, 2);
      const signature = JSON.stringify({ candidate, sampleLines, checks, details });
      if (signature === lastPublished) return;
      lastPublished = signature;
      setReport({ current: next, samples: sampleLines, checks, details });
    }, 160);
    return () => window.clearInterval(timer);
  }, []);

  return <>
    <aside aria-label="Smoke evidence" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 194, overflow: 'auto', background: '#fff', color: '#172033', padding: '8px 20px', zIndex: 30000, font: '12px/1.4 monospace', borderBottom: '1px solid #999' }}>
      <strong>13.1 browser smoke — isolated in-memory note</strong>
      <p style={{ margin: '3px 0' }}>Use real controls: Canvas → Page → Physical → Fit page → Canvas. Initial Page supplies Fit width. Pause a second after each change.</p>
      <output aria-live="polite" style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{report.checks.join('\n') || 'Loading production runtime…'}</output>
      <pre style={{ margin: '3px 0', whiteSpace: 'pre-wrap' }}>{report.samples.join('\n')}</pre>
      <details><summary>All block geometry and request receipts</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{report.details}</pre></details>
    </aside>
    <div className={appStyles.layout} style={{ height: 'calc(100vh - 194px)', marginTop: 194 }}>
      <main className={appStyles.main} data-app-main-scroll="true">
        <div className={appStyles.content} data-app-content-shell="true">
          {runtime.loading || !runtime.note || !runtime.layerProps
            ? <div>Loading production note…</div>
            : <div className={`${styles.page} ${mode === 'canvas' ? styles.pageCanvas : ''}`}>
              <NoteChromeLayer {...runtime.layerProps.chromeProps} />
              <NoteRuntimeDocumentLayer {...runtime.layerProps.documentLayerProps} />
            </div>}
        </div>
      </main>
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(
  <HashRouter><NoteCanvasRuntimeProvider noteId={NOTE_ID}><SmokeRuntime /></NoteCanvasRuntimeProvider></HashRouter>,
);
