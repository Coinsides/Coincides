import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { OVERVIEW_GAP, OVERVIEW_PADDING, overviewLayout, overviewPageIsVisible } from '../overviewLayout';
import { NotePageThumbnail, type NotePageThumbnailInput } from './NotePageThumbnail';
import './NoteOverviewLayer.css';

export interface NoteOverviewLayerProps {
  writingSurfaceProps: NotePageThumbnailInput;
  currentPageFrameId?: string | null;
  onSelectPage: (frameId: string) => void;
  onClose: () => void;
}

function OverviewPages({ writingSurfaceProps: input, currentPageFrameId, onSelectPage, onClose }: NoteOverviewLayerProps) {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const positioned = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const previousLayout = useRef<ReturnType<typeof overviewLayout> | null>(null);
  const frames = input.noteCanvasRuntime.pageFrames;
  const currentId = currentPageFrameId ?? input.selectedPageFrameId;
  const layout = useMemo(() => overviewLayout(frames,
    Math.max(1, size.width - OVERVIEW_PADDING * 2), Math.max(1, size.height - OVERVIEW_PADDING * 2)),
  [frames, size]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const root = rootRef.current;
    if (!viewport || !root) return;
    const appMain = root.closest<HTMLElement>('[data-app-main-scroll="true"]');
    const measure = () => {
      // Fill the work viewport, including embedded note hosts, without changing reading geometry.
      const hostBottom = appMain?.getBoundingClientRect().bottom || window.innerHeight;
      const top = Math.max(0, root.getBoundingClientRect().top);
      root.style.height = `${Math.max(240, Math.min(window.innerHeight, hostBottom) - top - 12)}px`;
      const next = { width: viewport.clientWidth || root.clientWidth || window.innerWidth,
        height: viewport.clientHeight || 600 };
      setSize((previous) => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    if (appMain) observer?.observe(appMain);
    window.addEventListener('resize', measure);
    root.focus({ preventScroll: true });
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || size.width === 0) return;
    if (!positioned.current) {
      positioned.current = true;
      const index = frames.findIndex((frame) => frame.id === currentId);
      viewport.scrollTop = Math.max(0, (layout.pages[index]?.top ?? 0) - OVERVIEW_PADDING);
    } else if (previousLayout.current && (previousLayout.current.pageWidth !== layout.pageWidth
      || previousLayout.current.columns !== layout.columns)) {
      // Retain the page being browsed when columns change, rather than retaining
      // a pixel offset that could now point hundreds of pages earlier.
      const previous = previousLayout.current;
      const index = previous.pages.findIndex((page) => page.top + page.height >= scrollTop - OVERVIEW_PADDING);
      const before = previous.pages[index];
      const after = layout.pages[index];
      if (before && after) {
        const offset = (scrollTop - OVERVIEW_PADDING - before.top) / before.scale;
        viewport.scrollTop = scrollTop === 0 ? 0
          : Math.max(0, OVERVIEW_PADDING + after.top + offset * after.scale);
      }
    }
    previousLayout.current = layout;
    // Resizing can clamp the native scroll offset; keep the lazy window in sync.
    setScrollTop(viewport.scrollTop);
  }, [layout, currentId, frames, size.width]);

  return <section ref={rootRef} className="noteOverview" data-note-overview="true"
    data-note-overview-root="true" data-note-id={input.noteId} aria-label="Page overview" tabIndex={-1}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    }}>
    <header className="noteOverviewHeader">
      <h2>Overview <span>{frames.length}</span></h2>
      <button type="button" className="noteOverviewClose" data-note-overview-close="true"
        onClick={onClose} aria-label="Close page overview" title="Close page overview (Esc)">
        <X size={18} aria-hidden="true" />
      </button>
    </header>
    <div ref={viewportRef} className="noteOverviewViewport" data-note-overview-viewport="true"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      {frames.length === 0 ? <p className="noteOverviewEmpty">No pages to preview.</p> : <div
        className="noteOverviewGrid" data-note-overview-grid="true" data-columns={layout.columns}
        data-single-page={frames.length === 1 ? 'true' : undefined}
        style={{ '--overview-columns': layout.columns, '--overview-page-width': `${layout.pageWidth}px`,
          '--overview-gap': `${OVERVIEW_GAP}px` } as CSSProperties}>
        {frames.map((frame, index) => {
          const page = layout.pages[index];
          return <NotePageThumbnail key={frame.id} input={input} frame={frame} pageNumber={index + 1}
            width={layout.pageWidth} height={page.height} scale={page.scale} selected={currentId === frame.id}
            renderContent={size.width > 0 && overviewPageIsVisible(page.top + OVERVIEW_PADDING,
              page.height, scrollTop, size.height)} onSelectPage={onSelectPage} />;
        })}
      </div>}
    </div>
  </section>;
}

/** Presentation state is discarded on note changes; no page collection writes. */
export function NoteOverviewLayer(props: NoteOverviewLayerProps) {
  return <OverviewPages key={props.writingSurfaceProps.noteId} {...props} />;
}
