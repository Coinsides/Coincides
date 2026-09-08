import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createSurfaceModePolicy,
  createSurfaceModeTransitionPolicy,
  getVisibleBlocksForSurface,
} from '../modePolicyService';
import type { PlacementSeedBlock } from '../placementService';
import type { SnapGuide, SurfaceMode } from '../runtimeLayout';
import { CANVAS_MODE_RETIRED, resolveActiveNoteCanvasMode } from '../canvasRetirementPolicy';

export interface UseSurfaceModeControllerOptions {
  noteId?: string;
  clearBlockSelection: () => void;
  closeOverlay: () => void;
  setSnapGuide: (guide: SnapGuide | null) => void;
}

interface InitialSurfaceModeBlock extends PlacementSeedBlock {
  metadata?: Record<string, unknown>;
}

export interface ResolveInitialSurfaceModeInput {
  blocks: InitialSurfaceModeBlock[];
  contentWidth: number;
  loadedNoteId?: string;
  loading: boolean;
}

export function useSurfaceModeController({
  noteId,
  clearBlockSelection,
  closeOverlay,
  setSnapGuide,
}: UseSurfaceModeControllerOptions) {
  const [surfaceState, setSurfaceState] = useState<{
    noteId?: string;
    mode: SurfaceMode;
  }>(() => ({ noteId, mode: 'page' }));
  const decisionNoteIdRef = useRef(noteId);
  const decidedRef = useRef(false);
  const manualToggledRef = useRef(false);
  const surfaceMode = resolveActiveNoteCanvasMode(surfaceState.noteId === noteId ? surfaceState.mode : 'page');
  const surfacePolicy = useMemo(
    () => createSurfaceModePolicy(surfaceMode),
    [surfaceMode],
  );

  useLayoutEffect(() => {
    decisionNoteIdRef.current = noteId;
    decidedRef.current = false;
    manualToggledRef.current = false;
    setSurfaceState((current) => (
      current.noteId === noteId && current.mode === 'page'
        ? current
        : { noteId, mode: 'page' }
    ));
  }, [noteId]);

  const resolveInitialSurfaceMode = useCallback(({
    blocks,
    contentWidth,
    loadedNoteId,
    loading,
  }: ResolveInitialSurfaceModeInput) => {
    if (CANVAS_MODE_RETIRED) return;
    const hydrated = !loading && loadedNoteId === noteId;
    if (
      !noteId
      || !hydrated
      || decisionNoteIdRef.current !== noteId
      || decidedRef.current
      || manualToggledRef.current
    ) {
      return;
    }

    decidedRef.current = true;
    const pageVisibleBlocks = getVisibleBlocksForSurface(
      blocks,
      createSurfaceModePolicy('page'),
      contentWidth,
    );
    const canvasVisibleBlocks = getVisibleBlocksForSurface(
      blocks,
      createSurfaceModePolicy('canvas'),
      contentWidth,
    );

    // Transitional TD-7 bridge: remove when 12.4 makes the stream surface the default.
    if (pageVisibleBlocks.length === 0 && canvasVisibleBlocks.length > 0) {
      setSurfaceState({ noteId, mode: 'canvas' });
    }
  }, [noteId]);

  const toggleSurfaceMode = useCallback(() => {
    if (CANVAS_MODE_RETIRED) return;
    manualToggledRef.current = true;
    const transition = createSurfaceModeTransitionPolicy(surfaceMode);
    setSurfaceState({ noteId, mode: transition.nextMode });
    if (transition.closeOverlay) closeOverlay();
    if (transition.clearSnapGuide) setSnapGuide(null);
    if (transition.clearBlockSelection) clearBlockSelection();
  }, [clearBlockSelection, closeOverlay, noteId, setSnapGuide, surfaceMode]);

  return {
    pageOffsetX: surfacePolicy.pageOffsetX,
    resolveInitialSurfaceMode,
    surfaceMode,
    surfacePolicy,
    toggleSurfaceMode,
  };
}
