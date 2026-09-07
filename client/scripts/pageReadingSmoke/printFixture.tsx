import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { getPageFramePhysicalMapping } from '../../src/pages/Notes/canvasEngine/pageFramePrintScaleService';
import { apiCalls, NOTE_ID, printSpecimen } from './mockApi';
import { PRINT_CROSS_BLOCK_ID, PRINT_EXCLUDED_BLOCK_IDS } from './printSpecimen';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

type Runtime = ReturnType<typeof useNoteCanvasRuntimeController>;
type PrintReceipt = ReturnType<typeof samplePrint>;
type ScreenSnapshot = ReturnType<typeof sampleScreen>;
const mmToPx = (mm: number) => mm / 25.4 * 96;
const close = (actual: number, expected: number) => Math.abs(actual - expected) <= 0.5;

function sampleScreen(runtime: Runtime) {
  const props = runtime.layerProps?.documentLayerProps.writingSurfaceProps;
  const nodes = [...document.querySelectorAll<HTMLElement>('#root article[data-note-block-shell], #root article[data-note-block-shell] *')];
  return {
    nodes,
    blockLayouts: JSON.stringify(props?.blockLayouts),
    frames: JSON.stringify(props?.noteCanvasRuntime.pageFrames),
    textareaHeights: JSON.stringify(nodes.filter((node) => node instanceof HTMLTextAreaElement).map((node) => node.style.height)),
  };
}

function samplePrint(runtime: Runtime, reason: string, screenBaseline: ScreenSnapshot | null) {
  const props = runtime.layerProps?.documentLayerProps.writingSurfaceProps;
  const printRoot = document.querySelector<HTMLElement>('[data-note-print-root]');
  const printMedia = window.matchMedia('print').matches;
  const pages = [...document.querySelectorAll<HTMLElement>('[data-note-print-page]')].map((page) => {
    const computed = getComputedStyle(page);
    const canvas = page.querySelector<HTMLElement>('[data-note-print-canvas]');
    const transform = canvas ? getComputedStyle(canvas).transform : 'none';
    const scale = transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
    const frame = printSpecimen.frames.find((candidate) => candidate.id === page.dataset.pageFrameId);
    const paper = frame?.pageSize === 'Letter' ? 'Letter' : 'A4';
    const physicalWidth = paper === 'Letter' ? 215.9 : 210;
    const physicalHeight = paper === 'Letter' ? 279.4 : 297;
    const expectedScale = frame
      ? frame.templateId === 'screen_note' || frame.pageSize === 'Custom'
        ? mmToPx(210) / frame.width
        : getPageFramePhysicalMapping(frame.pageSize || 'A4', frame.width, frame.templateId).physicalScale
      : null;
    const fragments = [...page.querySelectorAll<HTMLElement>('[data-note-print-fragment]')].map((fragment) => {
      const style = getComputedStyle(fragment);
      return {
        blockId: fragment.dataset.blockId,
        left: parseFloat(style.left), top: parseFloat(style.top),
        width: parseFloat(style.width), height: parseFloat(style.height),
        overflow: style.overflow,
      };
    });
    return {
      frameId: page.dataset.pageFrameId, paperSize: page.dataset.paperSize,
      width: parseFloat(computed.width), height: parseFloat(computed.height),
      expectedWidth: mmToPx(physicalWidth), expectedHeight: mmToPx(physicalHeight),
      breakAfter: computed.breakAfter, breakInside: computed.breakInside, overflow: computed.overflow,
      transform, scale, declaredScale: Number(page.dataset.printScale), expectedScale,
      fragments,
    };
  });
  const excludedIds = PRINT_EXCLUDED_BLOCK_IDS.filter((id) => printRoot?.querySelector(`[data-block-id="${id}"]`));
  const appRoot = document.getElementById('root');
  const appDisplay = appRoot ? getComputedStyle(appRoot).display : null;
  const appVisibility = appRoot ? getComputedStyle(appRoot).visibility : null;
  const appPosition = appRoot ? getComputedStyle(appRoot).position : null;
  const mutations = apiCalls.filter((call) => call.method !== 'GET' && call.url !== '/source-anchors/generate');
  const crossFragments = pages.flatMap((page) => page.fragments).filter((fragment) => fragment.blockId === PRINT_CROSS_BLOCK_ID);
  const currentScreen = sampleScreen(runtime);
  const screenPreservation = screenBaseline ? {
    blockLayoutsUnchanged: currentScreen.blockLayouts === screenBaseline.blockLayouts,
    framesUnchanged: currentScreen.frames === screenBaseline.frames,
    originalDomNodesRetained: currentScreen.nodes.length === screenBaseline.nodes.length && currentScreen.nodes.every((node, index) => node === screenBaseline.nodes[index]),
    textareaSizingUnchanged: currentScreen.textareaHeights === screenBaseline.textareaHeights,
  } : null;
  const checks = !printMedia ? [] : [
    { check: 'one fixed physical page per frame', pass: pages.length === printSpecimen.frames.length },
    { check: 'physical page width/height within 0.5px', pass: pages.length > 0 && pages.every((page) => close(page.width, page.expectedWidth) && close(page.height, page.expectedHeight)) },
    { check: 'full-precision print scale (screen gear/step excluded)', pass: pages.length > 0 && pages.every((page) => page.expectedScale !== null && Math.abs(page.declaredScale - page.expectedScale) < 1e-12 && Math.abs(page.scale - page.expectedScale) < 1e-6) },
    { check: 'forced page breaks and clipping', pass: pages.length > 0 && pages.every((page, index) => (index === pages.length - 1 || page.breakAfter === 'page') && page.overflow === 'hidden' && page.fragments.every((fragment) => fragment.overflow === 'hidden')) },
    { check: 'cross-frame block has two clipped projections', pass: crossFragments.length === 2 },
    { check: 'each frame keeps its own page label', pass: pages[0]?.fragments.some((fragment) => fragment.blockId === 'print-first-frame-block') === true && pages[1]?.fragments.some((fragment) => fragment.blockId === 'print-second-frame-block') === true },
    { check: 'app chrome/checklist hidden without collapsing screen layout', pass: appVisibility === 'hidden' && appPosition === 'fixed' },
    { check: 'workspace and canvas backing blocks absent', pass: excludedIds.length === 0 && !printRoot?.textContent?.includes('MUST NOT PRINT') },
    { check: 'zero unexpected API writes', pass: mutations.length === 0 },
    { check: 'screen geometry and original DOM preserved', pass: screenPreservation !== null && Object.values(screenPreservation).every(Boolean) },
  ];
  return {
    reason, printMedia, mode: props?.surfaceMode,
    screenGear: props?.pageReadingViewState?.gear,
    screenStep: props?.pageReadingViewState?.stepFactor,
    screenBlockCount: document.querySelectorAll('#root article[data-note-block-shell]').length,
    printRootCount: document.querySelectorAll('[data-note-print-root]').length,
    expectedFrameCount: printSpecimen.frames.length,
    runtimeFrames: props?.noteCanvasRuntime.pageFrames,
    runtimeBlockLayouts: props?.blockLayouts,
    appDisplay, appVisibility, appPosition, pages, excludedIds, crossFragmentCount: crossFragments.length, screenPreservation,
    checks,
    result: printMedia ? checks.every((check) => check.pass) ? 'PASS' : 'FAIL' : 'SCREEN ONLY — not print style evidence',
    apiCalls: [...apiCalls],
  };
}

function PrintSmokeRuntime() {
  const runtime = useNoteCanvasRuntimeController();
  const latest = useRef(runtime);
  const [receipts, setReceipts] = useState<PrintReceipt[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const mode = runtime.layerProps?.documentLayerProps.surfaceMode;
  const ready = !runtime.loading && Boolean(runtime.note && runtime.layerProps);
  const capture = useRef<(reason: string) => void>(() => undefined);
  useLayoutEffect(() => { latest.current = runtime; });
  useEffect(() => {
    document.body.classList.toggle('canvas-runtime-lock', mode === 'canvas');
    return () => document.body.classList.remove('canvas-runtime-lock');
  }, [mode]);
  useEffect(() => {
    let disposed = false;
    let lastSignature = '';
    let screenBaseline: ScreenSnapshot | null = null;
    let lastScreen: ScreenSnapshot | null = null;
    const scheduled = new Set<number>();
    const sample = (reason: string) => {
      if (disposed || !latest.current.layerProps) return;
      const receipt = samplePrint(latest.current, reason, screenBaseline);
      const signature = JSON.stringify({ ...receipt, reason: '' });
      if (signature === lastSignature && reason === 'print-media polling') return;
      lastSignature = signature;
      setReceipts((previous) => [...previous.slice(-39), receipt]);
    };
    capture.current = sample;
    const deferredSample = (reason: string) => {
      queueMicrotask(() => sample(`${reason}:microtask`));
      const timer = window.setTimeout(() => { scheduled.delete(timer); sample(`${reason}:settled`); }, 80);
      scheduled.add(timer);
    };
    const beforePrint = () => {
      screenBaseline = lastScreen || sampleScreen(latest.current);
      setEvents((previous) => [...previous, 'beforeprint']);
      sample('beforeprint');
      deferredSample('beforeprint');
    };
    const afterPrint = () => {
      setEvents((previous) => [...previous, 'afterprint']);
      deferredSample('afterprint');
      const timer = window.setTimeout(() => { scheduled.delete(timer); sample('afterprint:screen recovery'); }, 500);
      scheduled.add(timer);
    };
    const media = window.matchMedia('print');
    const mediaChanged = () => {
      if (media.matches) screenBaseline = lastScreen || sampleScreen(latest.current);
      setEvents((previous) => [...previous, `print media: ${media.matches}`]);
      sample('print media change');
      deferredSample('print media change');
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    media.addEventListener('change', mediaChanged);
    const interval = window.setInterval(() => {
      if (media.matches || document.querySelector('[data-note-print-root]')) sample('print-media polling');
      else if (latest.current.layerProps) lastScreen = sampleScreen(latest.current);
    }, 250);
    return () => {
      disposed = true;
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
      media.removeEventListener('change', mediaChanged);
      window.clearInterval(interval);
      scheduled.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => capture.current('screen baseline'), 500);
    return () => window.clearTimeout(timer);
  }, [ready]);

  const latestPrint = [...receipts].reverse().find((receipt) => receipt.printMedia);
  const latestReceipt = receipts[receipts.length - 1];
  return <>
    <aside aria-label="Print preview checklist" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 268, boxSizing: 'border-box', overflow: 'auto', background: '#fff', color: '#172033', padding: '10px 20px', zIndex: 30000, font: '13px/1.45 system-ui', borderBottom: '1px solid #999' }}>
      <strong>13.1 print preview inspection — synthetic two-frame {printSpecimen.paper} note</strong>
      <nav aria-label="Print specimen choices" style={{ display: 'flex', gap: 18, margin: '5px 0' }}>
        <a href="./print.html?paper=A4">A4 specimen</a>
        <a href="./print.html?paper=Letter">Letter specimen</a>
        <a href="./print.html?paper=web">Web → A4 specimen</a>
        <a href="./index.html">Reading gears smoke</a>
      </nav>
      <p style={{ margin: '5px 0' }}>Use Page mode, then open the browser print preview. Use 100% scale, no margins and no browser headers/footers. Compare the preview, cancel it, change the real reading gear/step and repeat; paper dimensions and clipping must agree.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" disabled={!ready || mode !== 'page'} onClick={() => { capture.current('before user print'); window.print(); capture.current('window.print returned'); }}>Open browser print preview</button>
        <button type="button" disabled={!ready} onClick={() => capture.current('manual computed-style sample')}>Sample computed styles</button>
      </div>
      <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
        <li><strong>Should see:</strong> exactly two {printSpecimen.paper === 'Letter' ? 'Letter' : 'A4'} portrait pages; PAGE ONE on the first; PAGE TWO on the second; CROSS FRAME code cropped at the frame boundaries and repositioned on both pages.</li>
        <li><strong>Should not see:</strong> this checklist, note toolbar, trays, selection/edit controls, continuation badges, workspace-only text or canvas object backing text. Inter-frame canvas gaps do not become blank print pages.</li>
      </ul>
      <output aria-live="polite" data-print-smoke-status="true">
        {latestPrint ? `${latestPrint.result}: ${latestPrint.checks.map((check) => `${check.pass ? 'PASS' : 'FAIL'} ${check.check}`).join('; ')}` : 'PENDING: capture actual print media before claiming computed-style verification.'}
        {` Events: ${events.join(' → ') || 'none'}. Current print roots: ${latestReceipt?.printRootCount ?? 'loading'}.`}
      </output>
      {latestPrint && <output data-print-smoke-dimensions="true" style={{ display: 'block', fontFamily: 'monospace' }}>
        {`media=true; pages=${latestPrint.pages.length}/${latestPrint.expectedFrameCount}; crossFragments=${latestPrint.crossFragmentCount}; gear=${latestPrint.screenGear}; step=${latestPrint.screenStep}. `}
        {latestPrint.pages.map((page) => `${page.frameId}: ${page.width}×${page.height}px; physicalScale=${page.declaredScale}; transform=${page.transform}; fragments=${page.fragments.length}; breakAfter=${page.breakAfter}`).join(' | ')}
      </output>}
      {latestReceipt?.screenPreservation && <output data-print-smoke-screen-preservation="true" style={{ display: 'block' }}>
        {`Screen preservation: ${Object.values(latestReceipt.screenPreservation).every(Boolean) ? 'PASS' : 'FAIL'}; ${Object.entries(latestReceipt.screenPreservation).map(([check, pass]) => `${check}=${pass}`).join('; ')}.`}
      </output>}
      <details><summary>Computed-style receipts and in-memory API calls</summary><pre data-print-evidence="true" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ specimen: printSpecimen.paper, events, receipts }, null, 2)}</pre></details>
      <p style={{ margin: '5px 0' }}>Mechanical receipts are recorded only for actual print media; DevTools print-media emulation can supplement the preview route. This page does not generate a PDF or use a backend. Human inspection and Henry’s real note remain separate acceptance steps.</p>
    </aside>
    <div className={appStyles.layout} style={{ height: 'calc(100vh - 268px)', marginTop: 268 }}>
      <main className={appStyles.main} data-app-main-scroll="true">
        <div className={appStyles.content} data-app-content-shell="true">
          {!ready || !runtime.layerProps ? <div>Loading production note…</div> : <div className={`${styles.page} ${mode === 'canvas' ? styles.pageCanvas : ''}`}>
            <NoteChromeLayer {...runtime.layerProps.chromeProps} />
            <NoteRuntimeDocumentLayer {...runtime.layerProps.documentLayerProps} />
          </div>}
        </div>
      </main>
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(
  <HashRouter><NoteCanvasRuntimeProvider noteId={NOTE_ID}><PrintSmokeRuntime /></NoteCanvasRuntimeProvider></HashRouter>,
);
