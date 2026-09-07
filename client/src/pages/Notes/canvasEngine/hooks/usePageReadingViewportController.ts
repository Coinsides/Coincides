import { useCallback, useLayoutEffect, useState } from 'react';
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

export function usePageReadingViewportController({ noteId }: UsePageReadingViewportControllerOptions) {
  const [scopedState, setScopedState] = useState<NotePageReadingState>(() => ({
    noteId,
    viewState: createDefaultPageReadingViewState(),
  }));
  // A same-mode route change must not expose the previous note's reading state,
  // including the render before the layout effect clears the old scope.
  const pageReadingViewState = scopedState.noteId === noteId
    ? scopedState.viewState
    : createDefaultPageReadingViewState();

  useLayoutEffect(() => {
    setScopedState((current) => current.noteId === noteId ? current : {
      noteId,
      viewState: createDefaultPageReadingViewState(),
    });
  }, [noteId]);

  const updateViewState = useCallback((update: (current: PageReadingViewState) => PageReadingViewState) => {
    setScopedState((current) => ({
      noteId,
      viewState: update(current.noteId === noteId ? current.viewState : createDefaultPageReadingViewState()),
    }));
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
