import { createRoot } from 'react-dom/client';
import { useEffect, useRef } from 'react';
import { HashRouter, useLocation } from 'react-router-dom';
import { NoteCanvasRuntimeProvider } from '../../src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import { useNoteCanvasRuntimeController } from '../../src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController';
import { NoteChromeLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from '../../src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer';
import { NOTE_ID, apiCalls } from './mockApi';
import styles from '../../src/pages/Notes/NoteDetail.module.css';
import appStyles from '../../src/components/Layout/AppLayout.module.css';
import '../../src/i18n';
import '../../src/styles/global.css';

function PointerObservation() {
  const outputRef = useRef<HTMLOutputElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const visibleRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const records: Array<Record<string, unknown>> = [];
    const pendingFrames = new Set<number>();
    let sequence = 0;
    let highestIndicatorCount = 0;
    const observe = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const eventRecord = { sequence: ++sequence, type: event.type, isTrusted: event.isTrusted,
        pointerId: event.pointerId, pointerType: event.pointerType, buttons: event.buttons,
        x: event.clientX, y: event.clientY,
        target: { tag: target?.tagName, label: target?.getAttribute('aria-label'),
          handle: target?.closest('[data-text-unit-handle]')?.getAttribute('data-text-unit-handle'),
          block: target?.closest('[data-text-unit-editor]')?.getAttribute('data-text-unit-editor') } };
      const recordSnapshot = (phase: string) => {
        const indicators = Array.from(document.querySelectorAll<HTMLElement>('[data-text-unit-drop-indicator]'))
          .map((node) => { const rect = node.getBoundingClientRect(); return {
            unit: node.dataset.textUnitDropIndicator, edge: node.dataset.dropEdge,
            block: node.closest('[data-text-unit-editor]')?.getAttribute('data-text-unit-editor'),
            x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          }; });
        highestIndicatorCount = Math.max(highestIndicatorCount, indicators.length);
        records.push({ ...eventRecord, phase, observedAt: performance.now(), indicatorCount: indicators.length, indicators });
        if (records.length > 400) records.splice(0, records.length - 400);
        if (outputRef.current) outputRef.current.textContent = JSON.stringify(records);
        if (summaryRef.current) summaryRef.current.textContent = `Pointer observation: ${event.type} / ${phase}; trusted=${event.isTrusted}; buttons=${event.buttons}; lines=${indicators.length}; peak=${highestIndicatorCount}`;
        if (visibleRef.current) visibleRef.current.textContent = records.slice(-10)
          .map((record) => `${record.sequence} ${record.type} ${record.phase} trusted=${record.isTrusted} buttons=${record.buttons} lines=${record.indicatorCount}`)
          .join('\n');
      };
      recordSnapshot('capture');
      const frame = requestAnimationFrame(() => { pendingFrames.delete(frame); recordSnapshot('animation-frame'); });
      pendingFrames.add(frame);
    };
    const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const;
    for (const type of types) document.addEventListener(type, observe, { capture: true, passive: true });
    return () => {
      for (const type of types) document.removeEventListener(type, observe, true);
      for (const frame of pendingFrames) cancelAnimationFrame(frame);
    };
  }, []);
  return <details data-c-fix1-pointer-observation="true" style={{ fontSize: 11 }}>
    <summary ref={summaryRef}>Pointer observation: waiting for a native pointer event</summary>
    <pre ref={visibleRef} style={{ maxHeight: 145, overflow: 'auto', margin: 0 }} />
    <output ref={outputRef} data-c-fix1-pointer-log="true" style={{ display: 'none' }}>[]</output>
  </details>;
}

function PaperInteractionSmoke() {
  const runtime = useNoteCanvasRuntimeController();
  const props = runtime.layerProps;
  return <div className={appStyles.layout}>
    <main className={appStyles.main} data-app-main-scroll="true">
      <div className={appStyles.content} data-app-content-shell="true">
        <p>C fix 1 · synthetic content · in-memory SQLite · production paper runtime</p>
        <PointerObservation />
        <div aria-label="Synthetic print lifecycle controls">
          <button type="button" onClick={() => window.dispatchEvent(new Event('beforeprint'))}>Inspect print projection</button>
          <button type="button" onClick={() => window.dispatchEvent(new Event('afterprint'))}>End print inspection</button>
        </div>
        {props && <div className={`${styles.page} ${props.documentLayerProps.surfaceMode === 'canvas' ? styles.pageCanvas : ''}`}>
          <NoteChromeLayer {...props.chromeProps} />
          <NoteRuntimeDocumentLayer {...props.documentLayerProps} />
          <output data-c-fix1-runtime="true" style={{ display: 'none' }}>{JSON.stringify({
            frames: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.pageFrames,
            objects: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.canvasObjects,
            placements: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.canvasPlacements,
            blocks: props.documentLayerProps.writingSurfaceProps.noteCanvasRuntime.blockPlacements,
            calls: apiCalls,
          })}</output>
        </div>}
      </div>
    </main>
  </div>;
}

function RoutedSmoke() {
  const { pathname } = useLocation();
  const noteId = pathname.startsWith('/notes/') ? pathname.slice('/notes/'.length) : NOTE_ID;
  return <NoteCanvasRuntimeProvider key={noteId} noteId={noteId}><PaperInteractionSmoke /></NoteCanvasRuntimeProvider>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><RoutedSmoke /></HashRouter>);
