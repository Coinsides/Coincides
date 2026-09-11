import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { scrollPageReadingToRect } from '../pageReadingDomService';
import type { PageFrameModel } from '../types';

/** Presentation only: never selects or saves the persisted frame collection. */
export function useNoteOverviewController({ noteId, surfaceMode, blockListRef, pageFrames }: {
  noteId: string;
  surfaceMode: 'page' | 'canvas';
  blockListRef: RefObject<HTMLElement>;
  pageFrames: PageFrameModel[];
}) {
  const [state, setState] = useState({ noteId, surfaceMode, open: false, targetFrameId: null as string | null });
  const scrollBeforeOverview = useRef<{ top: number; left: number } | null>(null);
  const focusedBeforeOverview = useRef<HTMLElement | null>(null);
  const pendingReturn = useRef(false);
  const pendingOpen = useRef(false);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const inScope = state.noteId === noteId && state.surfaceMode === surfaceMode;
  const open = inScope && surfaceMode === 'page' && state.open;

  useLayoutEffect(() => {
    if (inScope) return;
    scrollBeforeOverview.current = null;
    focusedBeforeOverview.current = null;
    pendingReturn.current = false;
    pendingOpen.current = false;
    setState({ noteId, surfaceMode, open: false, targetFrameId: null });
  }, [inScope, noteId, surfaceMode]);

  useLayoutEffect(() => {
    if (!inScope) return;
    const blockList = blockListRef.current;
    const appMain = blockList?.closest<HTMLElement>('[data-app-main-scroll="true"]');
    if (!appMain) return;
    if (open) {
      if (!pendingOpen.current) return;
      pendingOpen.current = false;
      const shell = blockList?.closest<HTMLElement>('[data-note-overview-active]');
      if (shell) appMain.scrollTo({
        top: Math.max(0, appMain.scrollTop + shell.getBoundingClientRect().top - appMain.getBoundingClientRect().top),
        behavior: 'auto',
      });
      return;
    }
    if (!pendingReturn.current) return;
    // The reading layer may need one layout commit to adopt a window/modal
    // resize that happened during overview. Navigate with its final DOM scale.
    const request = requestAnimationFrame(() => {
      if (!pendingReturn.current) return;
      pendingReturn.current = false;
      const frame = pageFrames.find((page) => page.id === state.targetFrameId);
      if (frame) {
        // Continuous reading has one horizontal origin, independent of world x.
        scrollPageReadingToRect(blockList, { ...frame, x: 0 });
      } else if (scrollBeforeOverview.current) {
        appMain.scrollTo({ ...scrollBeforeOverview.current, behavior: 'auto' });
      }
      // Resume the existing caret without moving the reading destination. The
      // next ordinary blur can then save its draft, as before overview opened.
      const previousEditor = focusedBeforeOverview.current;
      const focusTarget = previousEditor?.isConnected ? previousEditor : frame ? blockList
        : blockList?.closest<HTMLElement>('[data-note-overview-active]')
          ?.querySelector<HTMLButtonElement>('[data-note-overview-toggle]');
      focusTarget?.focus({ preventScroll: true });
      focusedBeforeOverview.current = null;
    });
    return () => cancelAnimationFrame(request);
  }, [open, inScope, state.targetFrameId, blockListRef, pageFrames]);

  const close = (targetFrameId: string | null = null) => {
    pendingReturn.current = true;
    setState({ noteId, surfaceMode, open: false, targetFrameId });
  };
  const toggle = () => {
    if (open) { close(); return; }
    if (surfaceMode !== 'page') return;
    const appMain = blockListRef.current?.closest<HTMLElement>('[data-app-main-scroll="true"]');
    scrollBeforeOverview.current = appMain ? { top: appMain.scrollTop, left: appMain.scrollLeft } : null;
    const blockList = blockListRef.current;
    if (blockList && appMain) {
      const scale = Number(blockList.closest<HTMLElement>('[data-page-display-scale]')?.dataset.pageDisplayScale) || 1;
      const scrollRect = appMain.getBoundingClientRect();
      const readingY = (scrollRect.top + Math.min(80, scrollRect.height * 0.2)
        - blockList.getBoundingClientRect().top) / scale;
      // Read position is ephemeral, independent of the saved collection selection.
      const nearest = pageFrames.reduce<PageFrameModel | null>((best, frame) => {
        const distance = (page: PageFrameModel) => Math.max(page.y - readingY, readingY - page.y - page.height, 0);
        return !best || distance(frame) < distance(best) ? frame : best;
      }, null);
      setCurrentFrameId(nearest?.id ?? null);
    } else setCurrentFrameId(pageFrames[0]?.id ?? null);
    const focused = document.activeElement;
    focusedBeforeOverview.current = focused instanceof HTMLElement && blockListRef.current?.contains(focused)
      ? focused : null;
    pendingReturn.current = false;
    pendingOpen.current = true;
    setState({ noteId, surfaceMode, open: true, targetFrameId: null });
  };

  const resumeForExit = () => {
    if (!open) return;
    // The host's ordinary leave workflow will blur and wait for its saves.
    // Restore the suspended editor before that workflow, without saving here.
    flushSync(() => setState({ noteId, surfaceMode, open: false, targetFrameId: null }));
    pendingReturn.current = false;
    pendingOpen.current = false;
    const editor = focusedBeforeOverview.current;
    if (editor?.isConnected) editor.focus({ preventScroll: true });
    focusedBeforeOverview.current = null;
  };

  return { open, toggle, close: () => close(), selectPage: (frameId: string) => close(frameId),
    targetFrameId: inScope ? state.targetFrameId : null, currentFrameId, resumeForExit };
}
