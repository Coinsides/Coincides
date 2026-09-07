import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { getPageFramePhysicalMapping } from '../pageFramePrintScaleService';
import { pageReadingViewportFromDom } from '../pageReadingDomService';
import { derivePageReadingViewport, type PageReadingViewState } from '../pageReadingViewportService';
import type { CanvasViewport, PageFrameModel } from '../types';

export function usePageReadingPresentation({
  enabled, noteId, surfaceRef, blockListRef, pageFrame, pageContentHeight, viewState, onViewportChange,
}: {
  enabled: boolean;
  noteId?: string;
  surfaceRef: RefObject<HTMLElement>;
  blockListRef: RefObject<HTMLElement>;
  pageFrame: PageFrameModel | null;
  pageContentHeight: number;
  viewState: PageReadingViewState;
  onViewportChange?: (viewport: CanvasViewport) => void;
}) {
  const [available, setAvailable] = useState({ width: 904, height: 720 });
  const paperWidth = pageFrame?.width || 904;
  const inset = pageFrame?.contentInset || { top: 0, right: 72, bottom: 96, left: 72 };
  const paperHeight = Math.max(pageFrame?.height || 0, pageContentHeight + inset.top);
  const layoutWidth = Math.max(1, paperWidth - inset.left - inset.right);
  const physicalScale = getPageFramePhysicalMapping(
    pageFrame?.pageSize || 'A4', paperWidth, pageFrame?.templateId,
  ).physicalScale;
  const reading = useMemo(() => derivePageReadingViewport({
    viewState, availableWidth: available.width, availableHeight: available.height,
    paperWidth, paperHeight, physicalScale,
  }), [viewState, available, paperWidth, paperHeight, physicalScale]);

  const measureAvailableSpace = useCallback(() => {
    const surface = surfaceRef.current;
    if (!enabled || !surface) return;
    const appMain = surface.closest<HTMLElement>('[data-app-main-scroll="true"]');
    const width = Math.max(1, surface.clientWidth);
    const surfaceTop = appMain
      ? Math.max(0, surface.getBoundingClientRect().top - appMain.getBoundingClientRect().top + appMain.scrollTop)
      : 0;
    // Exclude note chrome and control space. Adding scrollTop keeps fit stable while scrolling.
    const height = Math.max(1, (appMain?.clientHeight || window.innerHeight) - surfaceTop - 64);
    setAvailable((current) => current.width === width && current.height === height ? current : { width, height });
  }, [enabled, surfaceRef]);
  useLayoutEffect(() => { measureAvailableSpace(); });
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!enabled || !surface) return;
    const appMain = surface.closest<HTMLElement>('[data-app-main-scroll="true"]');
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureAvailableSpace);
    observer?.observe(surface);
    if (appMain) observer?.observe(appMain);
    window.addEventListener('resize', measureAvailableSpace);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measureAvailableSpace); };
  }, [enabled, noteId, surfaceRef, measureAvailableSpace]);

  const publishViewport = useCallback(() => {
    const blockList = blockListRef.current;
    if (!enabled || !blockList || !onViewportChange) return;
    const appMain = blockList.closest<HTMLElement>('[data-app-main-scroll="true"]');
    if (!appMain) return;
    onViewportChange(pageReadingViewportFromDom(
      blockList.getBoundingClientRect(), appMain.getBoundingClientRect(),
      appMain.clientWidth, appMain.clientHeight, reading.displayScale,
    ));
  }, [enabled, blockListRef, onViewportChange, reading.displayScale]);

  // Layout can move without resizing (chrome collapse or overflow compensation).
  // The state receiver deduplicates identical snapshots; layout width is never written here.
  useLayoutEffect(() => { publishViewport(); });
  useLayoutEffect(() => {
    if (!enabled) return;
    const appMain = blockListRef.current?.closest<HTMLElement>('[data-app-main-scroll="true"]');
    appMain?.addEventListener('scroll', publishViewport, { passive: true });
    window.addEventListener('resize', publishViewport);
    return () => { appMain?.removeEventListener('scroll', publishViewport); window.removeEventListener('resize', publishViewport); };
  }, [enabled, noteId, blockListRef, publishViewport]);

  const previousSelection = useRef('');
  useLayoutEffect(() => {
    const selection = `${noteId}:${enabled}:${viewState.gear}:${reading.isLongPage}`;
    if (selection !== previousSelection.current && enabled && viewState.gear === 'fit_page' && reading.isLongPage) {
      surfaceRef.current?.closest<HTMLElement>('[data-app-main-scroll="true"]')?.scrollTo({ top: 0, behavior: 'auto' });
    }
    previousSelection.current = selection;
  }, [enabled, noteId, viewState.gear, reading.isLongPage, surfaceRef]);

  return { ...reading, paperWidth, paperHeight, layoutWidth, inset };
}
