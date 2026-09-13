import { useContext, useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import type { AmbientAgentContextHint } from '@shared/types';
import { useAmbientAgentContextHint } from '@/hooks/useAmbientAgentContextHint';
import { useUIStore } from '@/stores/uiStore';
import { NoteAgentContextRoute } from '../../NoteAgentContextRoute';
import type { PageFrameModel } from '../types';

/** Observe the existing reading surface without selecting frames or changing it. */
export function useNoteAmbientAgentContextHint({
  noteId, surfaceMode, blockListRef, pageFrames, overviewOpen, overviewFrameId,
}: {
  noteId: string;
  surfaceMode: 'page' | 'canvas';
  blockListRef: RefObject<HTMLElement>;
  pageFrames: PageFrameModel[];
  overviewOpen: boolean;
  overviewFrameId: string | null;
}): void {
  const isNoteRoute = useContext(NoteAgentContextRoute);
  const panelOpen = useUIStore((state) => state.agentPanelOpen);
  const enabled = isNoteRoute && panelOpen;
  // Match read_note's zero-based paper order, independent of collection selection.
  const orderedFrames = useMemo(() => [...pageFrames].sort((left, right) =>
    left.y - right.y || left.x - right.x), [pageFrames]);
  const [readingFrame, setReadingFrame] = useState<{ noteId: string; frameId: string | null } | null>(null);

  useLayoutEffect(() => {
    if (!enabled || surfaceMode !== 'page' || overviewOpen) return;
    const blockList = blockListRef.current;
    const appMain = blockList?.closest<HTMLElement>('[data-app-main-scroll="true"]');
    if (!blockList || !appMain) return;
    const scaleElement = blockList.closest<HTMLElement>('[data-page-display-scale]');
    let request = 0;
    const measure = () => {
      const scale = Number(scaleElement?.dataset.pageDisplayScale) || 1;
      const viewport = appMain.getBoundingClientRect();
      const readingY = (viewport.top + Math.min(80, viewport.height * 0.2)
        - blockList.getBoundingClientRect().top) / scale;
      const distance = (frame: PageFrameModel) => Math.max(frame.y - readingY, readingY - frame.y - frame.height, 0);
      const nearest = orderedFrames.reduce<PageFrameModel | null>((best, frame) =>
        !best || distance(frame) < distance(best) ? frame : best, null);
      const frameId = nearest?.id ?? null;
      setReadingFrame((previous) => previous?.noteId === noteId && previous.frameId === frameId
        ? previous : { noteId, frameId });
    };
    const schedule = () => {
      cancelAnimationFrame(request);
      request = requestAnimationFrame(measure);
    };
    measure();
    appMain.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(blockList);
    resizeObserver?.observe(appMain);
    const scaleObserver = scaleElement && typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null;
    if (scaleElement) scaleObserver?.observe(scaleElement, { attributes: true, attributeFilter: ['data-page-display-scale'] });
    return () => {
      cancelAnimationFrame(request);
      appMain.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
      scaleObserver?.disconnect();
    };
  }, [enabled, surfaceMode, overviewOpen, noteId, blockListRef, orderedFrames]);

  // Overview changes the DOM layout, so retain the reading page captured on entry.
  const frameId = overviewOpen ? overviewFrameId : readingFrame?.noteId === noteId ? readingFrame.frameId : null;
  const pageIndex = surfaceMode === 'page' ? orderedFrames.findIndex((frame) => frame.id === frameId) : -1;
  const hint = useMemo<AmbientAgentContextHint | null>(() => enabled ? {
    type: 'note_view', data: { note_id: noteId, ...(pageIndex >= 0 ? { page_index: pageIndex } : {}) },
  } : null, [enabled, noteId, pageIndex]);
  useAmbientAgentContextHint(hint);
}
