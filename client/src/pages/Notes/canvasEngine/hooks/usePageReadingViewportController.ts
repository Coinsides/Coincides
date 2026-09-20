import { useCallback, useLayoutEffect, useState } from 'react';
import { documentKey, useDocumentTabsStore } from '@/stores/documentTabsStore';
import {
  createDefaultPageReadingViewState,
  nudgePageReadingStepFactor,
  type PageReadingGear,
  type PageReadingViewState,
} from '../pageReadingViewportService';

export interface UsePageReadingViewportControllerOptions {
  noteId: string | undefined;
}

interface NotePageReadingState {
  noteId: string | undefined;
  viewState: PageReadingViewState;
}

function rememberedReading(noteId?: string) {
  return useDocumentTabsStore.getState().tabs.find((tab) => tab.key === documentKey('note', noteId ?? ''))?.reading
    ?? createDefaultPageReadingViewState();
}

export function usePageReadingViewportController({ noteId }: UsePageReadingViewportControllerOptions) {
  const [scopedState, setScopedState] = useState<NotePageReadingState>(() => ({
    noteId,
    viewState: rememberedReading(noteId),
  }));
  // A same-mode route change must not expose the previous note's reading state,
  // including the render before the layout effect clears the old scope.
  const pageReadingViewState = scopedState.noteId === noteId
    ? scopedState.viewState
    : rememberedReading(noteId);

  useLayoutEffect(() => {
    setScopedState((current) => current.noteId === noteId ? current : {
      noteId,
      viewState: rememberedReading(noteId),
    });
  }, [noteId]);

  useLayoutEffect(() => {
    if (noteId && scopedState.noteId === noteId) useDocumentTabsStore.getState().remember(documentKey('note', noteId), { reading: scopedState.viewState });
  }, [noteId, scopedState]);

  const updateViewState = useCallback((update: (current: PageReadingViewState) => PageReadingViewState) => {
    setScopedState((current) => {
      const viewState = update(current.noteId === noteId ? current.viewState : rememberedReading(noteId));
      return { noteId, viewState };
    });
  }, [noteId]);

  const setPageReadingGear = useCallback((gear: PageReadingGear) => {
    updateViewState((current) => ({ ...current, gear }));
  }, [updateViewState]);

  const nudgePageReadingStep = useCallback((direction: -1 | 1) => {
    updateViewState((current) => ({
      ...current,
      stepFactor: nudgePageReadingStepFactor(current.stepFactor, direction),
    }));
  }, [updateViewState]);

  const resetPageReadingView = useCallback(() => {
    updateViewState(createDefaultPageReadingViewState);
  }, [updateViewState]);

  return {
    pageReadingViewState,
    setPageReadingGear,
    nudgePageReadingStep,
    resetPageReadingView,
  };
}
