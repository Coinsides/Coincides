import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { scrollPageReadingToRect } from '../pageReadingDomService';
import type { CanvasRect, PageFrameModel } from '../types';

export const NOTE_NAVIGATION_OPEN_KEY = 'coincides:note-navigation:open';
export type NoteNavigationTab = 'headings' | 'pages' | 'results';

/** Local presentation only. The reading surface and its editors stay mounted. */
export function useNoteNavigationController({ noteId, enabled, blockListRef, pageFrames }: {
  noteId: string; enabled: boolean; blockListRef: RefObject<HTMLElement>; pageFrames: PageFrameModel[];
}) {
  const [preferredOpen, setPreferredOpen] = useState(() => {
    try { return localStorage.getItem(NOTE_NAVIGATION_OPEN_KEY) === 'true'; } catch { return false; }
  });
  const [tab, setTab] = useState<NoteNavigationTab>('pages');
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ noteId: string; blockId: string | null } | null>(null);
  const open = enabled && preferredOpen;
  const setOpen = useCallback((value: boolean) => {
    setPreferredOpen(value);
    try { localStorage.setItem(NOTE_NAVIGATION_OPEN_KEY, String(value)); } catch { /* Session still works. */ }
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !open) return;
    const blockList = blockListRef.current;
    const appMain = blockList?.closest<HTMLElement>('[data-app-main-scroll="true"]');
    if (!blockList || !appMain) return;
    let request = 0;
    const measure = () => {
      const scale = Number(blockList.closest<HTMLElement>('[data-page-display-scale]')?.dataset.pageDisplayScale) || 1;
      const viewport = appMain.getBoundingClientRect();
      const readingY = (viewport.top + Math.min(80, viewport.height * 0.2)
        - blockList.getBoundingClientRect().top) / scale;
      const distance = (page: PageFrameModel) => Math.max(page.y - readingY, readingY - page.y - page.height, 0);
      const current = pageFrames.reduce<PageFrameModel | null>((best, frame) =>
        !best || distance(frame) < distance(best) ? frame : best, null);
      setCurrentFrameId(current?.id ?? null);
    };
    const schedule = () => {
      cancelAnimationFrame(request);
      request = requestAnimationFrame(measure);
    };
    measure();
    appMain.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(blockList);
    observer?.observe(appMain);
    return () => {
      cancelAnimationFrame(request);
      appMain.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [noteId, enabled, open, blockListRef, pageFrames]);

  useEffect(() => {
    if (!highlight || highlight.noteId !== noteId) return;
    const blockList = blockListRef.current;
    const root = blockList?.closest<HTMLElement>('[data-note-overview-active]') ?? blockList;
    if (!root) return;
    const marked = new Set<HTMLElement>();
    const mark = () => {
      root.querySelectorAll<HTMLElement>(highlight.blockId === null
        ? '[data-note-paper-header="true"]' : '[data-note-block-shell="true"]').forEach((element) => {
        if (highlight.blockId !== null && element.dataset.blockId !== highlight.blockId) return;
        element.dataset.noteNavigationHit = 'true';
        marked.add(element);
      });
    };
    mark();
    // A far destination can mount after the viewport moves.
    const observer = new MutationObserver(mark);
    observer.observe(root, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => setHighlight(null), 2200);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      marked.forEach((element) => { delete element.dataset.noteNavigationHit; });
    };
  }, [highlight, noteId, blockListRef]);

  const selectPage = (frameId: string) => {
    const frame = pageFrames.find((page) => page.id === frameId);
    if (!frame) return;
    scrollPageReadingToRect(blockListRef.current, { ...frame, x: 0 });
    setCurrentFrameId(frameId);
  };
  const selectResult = (blockId: string | null, frameId: string, rect: CanvasRect) => {
    const blockList = blockListRef.current;
    if (blockId === null) {
      const appMain = blockList?.closest<HTMLElement>('[data-app-main-scroll="true"]');
      const header = blockList?.closest('[data-note-overview-active]')?.querySelector('[data-note-paper-header="true"]');
      if (appMain && header) appMain.scrollTo({
        top: Math.max(0, appMain.scrollTop + header.getBoundingClientRect().top - appMain.getBoundingClientRect().top - 24),
        left: 0, behavior: 'auto',
      });
    } else scrollPageReadingToRect(blockList, rect);
    setCurrentFrameId(frameId);
    setHighlight({ noteId, blockId });
  };
  return { open, setOpen, toggle: () => setOpen(!preferredOpen), tab, setTab,
    currentFrameId, selectPage, selectResult };
}
