import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { OVERVIEW_PAGE_FOOTER, overviewPageIsVisible } from '../overviewLayout';
import { NotePageThumbnail, type NotePageThumbnailInput } from './NotePageThumbnail';
import './NoteNavigationPages.css';

const PAGE_GAP = 16;
const PAGE_PADDING = 16;

export interface NoteNavigationPagesProps {
  writingSurfaceProps: NotePageThumbnailInput;
  currentPageFrameId?: string | null;
  onSelectPage: (frameId: string) => void;
}

function NavigationPages({ writingSurfaceProps: input, currentPageFrameId, onSelectPage }: NoteNavigationPagesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const followedPage = useRef<{ id: string; width: number; height: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const frames = input.noteCanvasRuntime.pageFrames;
  const currentId = currentPageFrameId ?? input.selectedPageFrameId;
  const layout = useMemo(() => {
    const width = Math.max(1, size.width - PAGE_PADDING * 2);
    let top = PAGE_PADDING;
    const pages = frames.map((frame) => {
      const scale = width / frame.width;
      const height = frame.height * scale;
      const page = { top, height, scale };
      top += height + OVERVIEW_PAGE_FOOTER + PAGE_GAP;
      return page;
    });
    return { width, pages };
  }, [frames, size.width]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const next = { width: viewport.clientWidth, height: viewport.clientHeight };
      setSize((previous) => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || size.width === 0 || size.height === 0) return;
    const index = frames.findIndex((frame) => frame.id === currentId);
    const page = layout.pages[index];
    const previous = followedPage.current;
    if (page && currentId && (!previous || previous.id !== currentId
      || previous.width !== size.width || previous.height !== size.height)) {
      // Runtime projections may rebuild during outer scrolling. Preserve the
      // user's thumbnail browsing unless the reading page or viewport changes.
      followedPage.current = { id: currentId, ...size };
      const bottom = page.top + page.height + OVERVIEW_PAGE_FOOTER;
      // Only move this viewport. A document-wide scrollIntoView would move the
      // reading surface while it is reporting its current page back to us.
      if (page.top < viewport.scrollTop || page.height + OVERVIEW_PAGE_FOOTER > size.height) {
        viewport.scrollTop = Math.max(0, page.top - PAGE_PADDING);
      } else if (bottom > viewport.scrollTop + size.height) {
        viewport.scrollTop = Math.max(0, bottom - size.height + PAGE_PADDING);
      }
    }
    setScrollTop(viewport.scrollTop);
  }, [currentId, frames, layout, size]);

  return <div ref={viewportRef} className="noteNavigationPages" data-note-navigation-pages="true"
    data-note-id={input.noteId} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
    {frames.length === 0 ? <p className="noteNavigationPagesEmpty">No pages to preview.</p> : <div
      className="noteNavigationPageList" data-note-navigation-page-list="true"
      style={{ '--navigation-page-width': `${layout.width}px`, '--navigation-page-gap': `${PAGE_GAP}px`,
        '--navigation-page-padding': `${PAGE_PADDING}px` } as CSSProperties}>
      {frames.map((frame, index) => {
        const page = layout.pages[index];
        return <NotePageThumbnail key={frame.id} input={input} frame={frame} pageNumber={index + 1}
          width={layout.width} height={page.height} scale={page.scale} selected={currentId === frame.id}
          renderContent={size.width > 0 && size.height > 0
            && overviewPageIsVisible(page.top, page.height, scrollTop, size.height)}
          preserveEditingFocus onSelectPage={onSelectPage} />;
      })}
    </div>}
  </div>;
}

/** A note change resets this pane's lazy window without focusing the pane. */
export function NoteNavigationPages(props: NoteNavigationPagesProps) {
  return <NavigationPages key={props.writingSurfaceProps.noteId} {...props} />;
}
