import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { documentTypographyToCssVars } from '../typographyProfileService';
import { NoteReadOnlyPageContent } from './NoteReadOnlyPageContent';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import './NoteOverviewLayer.css';

export const OVERVIEW_MIN_THUMBNAIL_WIDTH = 160;
const MAX_THUMBNAIL_WIDTH = 220;
const THUMBNAIL_GAP = 20;
const ROWS_PER_SCREEN = 2;
const MAX_PREVIEW_ASPECT_RATIO = 1.6;

type OverviewInput = Pick<NoteWritingSurfaceLayerProps,
  'noteId' | 'noteCanvasRuntime' | 'visibleBlocks' | 'blockTextDrafts'
  | 'blockTextFlowDrafts' | 'blockFieldDrafts' | 'documentTypographyProfile'
  | 'anchorsBySourceRef' | 'selectedPageFrameId'>;

export interface NoteOverviewLayerProps {
  writingSurfaceProps: OverviewInput;
  onSelectPage: (frameId: string) => void;
  onClose: () => void;
}

function OverviewPages({ writingSurfaceProps: input, onSelectPage, onClose }: NoteOverviewLayerProps) {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [firstPageIndex, setFirstPageIndex] = useState(0);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setAvailableWidth(viewport.clientWidth);
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    window.addEventListener('resize', measure);
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const columns = availableWidth >= 800 ? 4 : availableWidth >= 560 ? 3 : 2;
  const thumbnailWidth = Math.max(OVERVIEW_MIN_THUMBNAIL_WIDTH, Math.min(
    MAX_THUMBNAIL_WIDTH,
    (availableWidth - THUMBNAIL_GAP * (columns - 1)) / columns,
  ));
  // Keep the engine's page order and fragment exclusions. No layout or frame is rewritten.
  const frames = input.noteCanvasRuntime.pageFrames;
  const capacity = columns * ROWS_PER_SCREEN;
  const screenCount = Math.max(1, Math.ceil(frames.length / capacity));
  const screen = Math.min(screenCount - 1, Math.floor(firstPageIndex / capacity));
  const start = screen * capacity;
  const end = Math.min(start + capacity, frames.length);
  const changeScreen = (direction: -1 | 1) => {
    setFirstPageIndex((screen + direction) * capacity);
    viewportRef.current?.scrollTo?.({ top: 0, left: 0 });
  };

  return <section
    ref={rootRef}
    className="noteOverview"
    data-note-overview="true"
    data-note-overview-root="true"
    data-note-id={input.noteId}
    aria-label="Page overview"
    tabIndex={-1}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    }}
  >
    <header className="noteOverviewHeader">
      <div className="noteOverviewHeading">
        <h2>Page overview</h2>
        <p>Select a page to return to reading.</p>
      </div>
      <button
        type="button"
        className="noteOverviewClose"
        data-note-overview-close="true"
        onClick={onClose}
        aria-label="Close page overview"
        title="Close page overview (Esc)"
      ><X size={18} aria-hidden="true" /></button>
    </header>
    <div ref={viewportRef} className="noteOverviewViewport" data-note-overview-viewport="true">
      {frames.length === 0 ? <p className="noteOverviewEmpty">No pages to preview.</p> : <div
        className="noteOverviewGrid"
        data-note-overview-grid="true"
        data-columns={columns}
        data-screen={screen + 1}
        data-screen-count={screenCount}
        style={{
          '--overview-columns': columns,
          '--overview-thumbnail-width': `${thumbnailWidth}px`,
          '--overview-gap': `${THUMBNAIL_GAP}px`,
        } as CSSProperties}
      >
        {frames.slice(start, end).map((frame, index) => {
          const pageNumber = start + index + 1;
          const scale = thumbnailWidth / frame.width;
          const isLongPage = frame.height > frame.width * MAX_PREVIEW_ASPECT_RATIO;
          const previewHeight = Math.min(frame.height, frame.width * MAX_PREVIEW_ASPECT_RATIO) * scale;
          const selected = input.selectedPageFrameId === frame.id;
          return <div className="noteOverviewCard" key={frame.id}>
            <div
              className="noteOverviewPreview"
              data-note-overview-preview="true"
              data-long-page={isLongPage ? 'true' : undefined}
              aria-hidden="true"
              {...{ inert: '' }}
              style={{ width: thumbnailWidth, height: previewHeight }}
            >
              <div
                className="noteOverviewCanvas"
                data-note-overview-canvas="true"
                style={{
                  ...documentTypographyToCssVars(input.documentTypographyProfile),
                  width: frame.width,
                  height: frame.height,
                  transform: `scale(${scale})`,
                } as CSSProperties}
              >
                <NoteReadOnlyPageContent
                  frame={frame}
                  fragments={input.noteCanvasRuntime.blockFragmentProjections}
                  canvasObjects={input.noteCanvasRuntime.canvasObjects}
                  canvasPlacements={input.noteCanvasRuntime.canvasPlacements}
                  visibleBlocks={input.visibleBlocks}
                  blockTextDrafts={input.blockTextDrafts}
                  blockTextFlowDrafts={input.blockTextFlowDrafts}
                  blockFieldDrafts={input.blockFieldDrafts}
                  anchorsBySourceRef={input.anchorsBySourceRef}
                />
              </div>
            </div>
            <button
              type="button"
              className="noteOverviewPage"
              data-note-overview-page="true"
              data-page-frame-id={frame.id}
              aria-label={`Read page ${pageNumber}${isLongPage ? ', long page preview cropped' : ''}`}
              aria-current={selected ? 'page' : undefined}
              onClick={() => onSelectPage(frame.id)}
            >
              <span className="noteOverviewPageLabel">
                <span>Page {pageNumber}</span>
                {isLongPage && <span className="noteOverviewLongPage">Long page</span>}
              </span>
            </button>
          </div>;
        })}
      </div>}
    </div>
    <footer className="noteOverviewFooter">
      <p aria-live="polite" aria-atomic="true">
        {frames.length ? `Pages ${start + 1}–${end} of ${frames.length}` : '0 pages'}
      </p>
      <nav className="noteOverviewPagination" aria-label="Overview screens">
        <button
          type="button"
          data-note-overview-previous="true"
          onClick={() => changeScreen(-1)}
          disabled={screen === 0}
        ><ChevronLeft size={16} aria-hidden="true" />Previous screen</button>
        <span>{screen + 1} / {screenCount}</span>
        <button
          type="button"
          data-note-overview-next="true"
          onClick={() => changeScreen(1)}
          disabled={screen + 1 >= screenCount}
        >Next screen<ChevronRight size={16} aria-hidden="true" /></button>
      </nav>
    </footer>
  </section>;
}

/** This view owns presentation state only; changing notes discards its current screen. */
export function NoteOverviewLayer(props: NoteOverviewLayerProps) {
  return <OverviewPages key={props.writingSurfaceProps.noteId} {...props} />;
}
