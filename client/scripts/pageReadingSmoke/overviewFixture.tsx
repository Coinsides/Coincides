import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { apiCalls, NOTE_ID, overviewSpecimen } from './mockApi';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

type Runtime = ReturnType<typeof useNoteCanvasRuntimeController>;
let originalFocusedEditor: Element | null = null;
function sample(runtime: Runtime) {
  const props = runtime.layerProps?.documentLayerProps.writingSurfaceProps;
  const root = document.querySelector<HTMLElement>('[data-note-overview-root]');
  const grid = root?.querySelector<HTMLElement>('[data-note-overview-grid]');
  const app = document.querySelector<HTMLElement>('[data-app-main-scroll="true"]');
  const appRect = app?.getBoundingClientRect();
  const targetFrameId = document.querySelector('[data-page-reading-target-frame]')?.getAttribute('data-page-reading-target-frame');
  const targetFrame = overviewSpecimen.frames.find((frame) => frame.id === targetFrameId);
  const blockList = props?.blockListRef.current;
  const readingScale = Number(blockList?.closest<HTMLElement>('[data-page-display-scale]')?.dataset.pageDisplayScale) || 1;
  const readingPaper = blockList?.closest<HTMLElement>('[data-page-display-scale]');
  const previews = [...(root?.querySelectorAll<HTMLElement>('[data-note-overview-preview]') || [])];
  const sourceRows = JSON.stringify({ blocks: overviewSpecimen.blocks, canvas: overviewSpecimen.canvas });
  return {
    ready: Boolean(!runtime.loading && props?.blockListRef.current), pageCount: overviewSpecimen.pageCount,
    readingGear: readingPaper?.dataset.pageReadingGear, effectiveReadingGear: readingPaper?.dataset.pageReadingEffectiveGear, readingScale,
    overview: Boolean(root), columns: Number(grid?.dataset.columns), screen: Number(grid?.dataset.screen),
    screenCount: Number(grid?.dataset.screenCount),
    previewWidths: previews.map((node) => node.getBoundingClientRect().width),
    pageIds: [...(root?.querySelectorAll<HTMLElement>('[data-note-overview-page]') || [])].map((node) => node.dataset.pageFrameId),
    pageFragments: [...(root?.querySelectorAll<HTMLElement>('[data-note-overview-page]') || [])].map((node) => ({
      frameId: node.dataset.pageFrameId,
      blockIds: [...(node.parentElement?.querySelectorAll<HTMLElement>('[data-block-id]') || [])].map((block) => block.dataset.blockId),
    })),
    fragmentBlockIds: [...(root?.querySelectorAll<HTMLElement>('[data-block-id]') || [])].map((node) => node.dataset.blockId),
    editableElements: [...(root?.querySelectorAll<HTMLElement>('textarea:not([readonly]):not([disabled]), input:not([readonly]):not([disabled]), select:not([disabled]), [contenteditable="true"]') || [])].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility === 'visible';
    }).length,
    readonlyTextareaCount: root?.querySelectorAll('textarea[readonly]').length || 0,
    formControls: [...(root?.querySelectorAll<HTMLElement>('textarea, input, select, [contenteditable="true"]') || [])].map((node) => ({
      tag: node.tagName, type: node.getAttribute('type'), readonly: node.hasAttribute('readonly'),
      disabled: node.hasAttribute('disabled'), label: node.getAttribute('aria-label'), hidden: node.getBoundingClientRect().height === 0 || node.getBoundingClientRect().width === 0,
    })),
    previewsInert: previews.every((preview) => Boolean(preview.closest('[inert]') || preview.querySelector('[inert]'))),
    longPageCount: root?.querySelectorAll('[data-long-page="true"]').length || 0,
    printRootCount: document.querySelectorAll('[data-note-print-root]').length,
    calls: [...apiCalls], sourceRows,
    frames: JSON.stringify(props?.noteCanvasRuntime.pageFrames), layouts: JSON.stringify(props?.blockLayouts),
    appScrollTop: app?.scrollTop || 0,
    appRect: appRect ? { top: appRect.top, bottom: appRect.bottom } : null,
    targetFrame: targetFrame && blockList ? { id: targetFrame.id, top: blockList.getBoundingClientRect().top + targetFrame.y * readingScale } : null,
    pageLabels: overviewSpecimen.frames.map((_frame, index) => {
      const node = props?.blockListRef.current?.querySelector<HTMLElement>(`[data-block-id="overview-label-${index + 1}"]`);
      const rect = node?.getBoundingClientRect();
      return { page: index + 1, top: rect?.top, bottom: rect?.bottom };
    }),
    draftTexts: props?.blockTextDrafts,
    readingTexts: [...(blockList?.querySelectorAll<HTMLTextAreaElement>('textarea') || [])].map((node) => node.value),
    activeEditorBlockId: document.activeElement instanceof HTMLTextAreaElement ? document.activeElement.closest('[data-block-id]')?.getAttribute('data-block-id') : null,
    activeElement: { tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') },
    originalEditorConnected: originalFocusedEditor?.isConnected,
    originalEditorFocused: originalFocusedEditor !== null && document.activeElement === originalFocusedEditor,
    originalEditorVisibility: originalFocusedEditor ? getComputedStyle(originalFocusedEditor).visibility : null,
    originalEditorDisplay: originalFocusedEditor ? getComputedStyle(originalFocusedEditor).display : null,
    originalEditorDisabled: originalFocusedEditor?.hasAttribute('disabled'),
    originalEditorRect: originalFocusedEditor ? { x: originalFocusedEditor.getBoundingClientRect().x, y: originalFocusedEditor.getBoundingClientRect().y, width: originalFocusedEditor.getBoundingClientRect().width, height: originalFocusedEditor.getBoundingClientRect().height } : null,
  };
}

declare global {
  interface Window { __overviewSmoke?: { sample: () => ReturnType<typeof sample>; rememberFocusedEditor: () => void } }
}

function OverviewSmokeRuntime() {
  const runtime = useNoteCanvasRuntimeController();
  const latest = useRef(runtime);
  const [status, setStatus] = useState('Loading production runtime…');
  useLayoutEffect(() => { latest.current = runtime; });
  useEffect(() => {
    window.__overviewSmoke = {
      sample: () => sample(latest.current), rememberFocusedEditor: () => { originalFocusedEditor = document.activeElement; },
    };
    const timer = window.setInterval(() => {
      const current = sample(latest.current);
      setStatus(current.ready
        ? `${current.pageCount} synthetic pages · overview ${current.overview ? `screen ${current.screen}/${current.screenCount}, ${current.columns} columns` : 'closed'} · PUT attempts ${current.calls.filter((call) => call.method === 'PUT').length}`
        : 'Loading production runtime…');
    }, 150);
    return () => {
      window.clearInterval(timer); delete window.__overviewSmoke;
    };
  }, []);
  return <>
    <aside style={{ position: 'fixed', inset: '0 0 auto', height: 66, padding: '10px 20px', boxSizing: 'border-box', zIndex: 30000, background: '#fff', color: '#172033', borderBottom: '1px solid #bbb', font: '12px/1.5 monospace' }}>
      <strong>13.4 overview — isolated in-memory functional smoke</strong>
      <output data-overview-smoke-status="true" style={{ display: 'block' }}>{status}</output>
    </aside>
    <div className={appStyles.layout} style={{ height: 'calc(100vh - 66px)', marginTop: 66 }}>
      <main className={appStyles.main} data-app-main-scroll="true">
        <div className={appStyles.content} data-app-content-shell="true">
          {runtime.loading || !runtime.note || !runtime.layerProps ? <p>Loading synthetic note…</p>
            : <div className={styles.page}>
              <NoteChromeLayer {...runtime.layerProps.chromeProps} />
              <NoteRuntimeDocumentLayer {...runtime.layerProps.documentLayerProps} />
            </div>}
        </div>
      </main>
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(
  <HashRouter><NoteCanvasRuntimeProvider noteId={NOTE_ID} hostMode={new URLSearchParams(window.location.search).get('host') === 'modal' ? 'modal' : 'page'}><OverviewSmokeRuntime /></NoteCanvasRuntimeProvider></HashRouter>,
);
