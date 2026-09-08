import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createSurfaceModePolicy,
  getVisibleBlocksForSurface,
} from '../modePolicyService';
import type { NoteBlock } from '../runtimeDataTypes';
import { DEFAULT_PAGE_CONTENT_WIDTH } from '../runtimeLayout';
import { useSurfaceModeController } from './useSurfaceModeController';

const CANVAS_ONLY_NOTE_ID = '1d10fe77-495b-4458-b7a4-f3d428c568ff';

const canvasOnlySpecimen: NoteBlock = {
  id: '0017f298-fe70-44aa-8fab-e6e12e836938',
  placement_id: 'f6cefd29-canvas-only-specimen',
  display_overrides_json: {},
  canvas_layout: {
    x: 14,
    y: 120,
    width: 760,
    height: 420,
    surface: 'canvas_workspace',
    boundary_role: 'crossing',
    coordinate_space: 'canvas_world',
    surface_authority: {
      coordinateSpace: 'canvas_world',
      pageBoundary: {
        left: 72,
        right: 832,
        frameId: 'primary-page-frame',
      },
    },
  },
  block_type: 'text',
  title: null,
  content_json: {},
  plain_text: 'Canvas-only legacy specimen',
  metadata: {},
  order_index: 6,
  source_references: [],
};

const formalPageSpecimen: NoteBlock = {
  ...canvasOnlySpecimen,
  id: '4dcf1566-4edf-4504-b9f1-formal-page-specimen',
  placement_id: 'a8fbaf13-formal-page-specimen',
  canvas_layout: {
    x: 72,
    y: 24,
    width: 760,
    height: 180,
    surface: 'formal_page',
    boundary_role: 'inside',
    coordinate_space: 'canvas_world',
    surface_authority: {
      coordinateSpace: 'canvas_world',
      pageBoundary: {
        left: 72,
        right: 832,
        frameId: 'primary-page-frame',
      },
    },
  },
  plain_text: 'Formal Page specimen',
  order_index: 1,
};

function renderSubject(noteId = CANVAS_ONLY_NOTE_ID) {
  const clearBlockSelection = vi.fn();
  const closeOverlay = vi.fn();
  const setSnapGuide = vi.fn();
  const subject = renderHook(
    ({ currentNoteId }: { currentNoteId: string }) => useSurfaceModeController({
      noteId: currentNoteId,
      clearBlockSelection,
      closeOverlay,
      setSnapGuide,
    }),
    { initialProps: { currentNoteId: noteId } },
  );

  return {
    clearBlockSelection,
    closeOverlay,
    setSnapGuide,
    subject,
  };
}

function resolveHydration(
  subject: ReturnType<typeof renderSubject>['subject'],
  {
    blocks = [canvasOnlySpecimen],
    loadedNoteId = CANVAS_ONLY_NOTE_ID,
    loading = false,
  }: {
    blocks?: NoteBlock[];
    loadedNoteId?: string;
    loading?: boolean;
  } = {},
) {
  act(() => subject.result.current.resolveInitialSurfaceMode({
    blocks,
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    loadedNoteId,
    loading,
  }));
}

describe('useSurfaceModeController retired initial-surface bridge', () => {
  it('S5: keeps a hydrated canvas-only legacy specimen on Page', () => {
    const { subject } = renderSubject();

    expect(subject.result.current.surfaceMode).toBe('page');
    resolveHydration(subject);
    expect(subject.result.current.surfaceMode).toBe('page');

    act(() => subject.result.current.toggleSurfaceMode());
    expect(subject.result.current.surfaceMode).toBe('page');
    resolveHydration(subject);
    expect(subject.result.current.surfaceMode).toBe('page');
  });

  it('S5: keeps Page before and after hydration completes', () => {
    const { subject } = renderSubject();

    resolveHydration(subject, {
      blocks: [],
      loadedNoteId: CANVAS_ONLY_NOTE_ID,
      loading: true,
    });
    expect(subject.result.current.surfaceMode).toBe('page');

    resolveHydration(subject);
    expect(subject.result.current.surfaceMode).toBe('page');
  });

  it('keeps Page while the loaded note belongs to the previous route generation', () => {
    const { subject } = renderSubject();

    resolveHydration(subject, {
      loadedNoteId: 'previous-note-id',
      loading: false,
    });
    expect(subject.result.current.surfaceMode).toBe('page');

    resolveHydration(subject);
    expect(subject.result.current.surfaceMode).toBe('page');
  });

  it('T-1b: decides that a truly empty hydrated note stays on Page', () => {
    const { subject } = renderSubject();

    resolveHydration(subject, { blocks: [] });
    expect(subject.result.current.surfaceMode).toBe('page');

    resolveHydration(subject);
    expect(subject.result.current.surfaceMode).toBe('page');
  });

  it('G-X1: keeps a hydrated mixed note on Page when both surfaces have visible content', () => {
    const { subject } = renderSubject();
    const mixedSpecimen = [formalPageSpecimen, canvasOnlySpecimen];

    expect(getVisibleBlocksForSurface(
      mixedSpecimen,
      createSurfaceModePolicy('page'),
      DEFAULT_PAGE_CONTENT_WIDTH,
    )).toEqual([formalPageSpecimen]);
    expect(getVisibleBlocksForSurface(
      mixedSpecimen,
      createSurfaceModePolicy('canvas'),
      DEFAULT_PAGE_CONTENT_WIDTH,
    )).toEqual(mixedSpecimen);

    resolveHydration(subject, { blocks: mixedSpecimen });
    expect(subject.result.current.surfaceMode).toBe('page');
  });

  it('S5: stale pre-hydration toggles keep Page', () => {
    const { subject } = renderSubject();

    resolveHydration(subject, {
      blocks: [],
      loadedNoteId: CANVAS_ONLY_NOTE_ID,
      loading: true,
    });
    act(() => subject.result.current.toggleSurfaceMode());
    act(() => subject.result.current.toggleSurfaceMode());
    expect(subject.result.current.surfaceMode).toBe('page');

    resolveHydration(subject);
    expect(subject.result.current.surfaceMode).toBe('page');
  });

  it('S5: retains Page when routing from note A to note B', () => {
    const { subject } = renderSubject();

    resolveHydration(subject, { blocks: [] });
    expect(subject.result.current.surfaceMode).toBe('page');

    act(() => subject.result.current.toggleSurfaceMode());
    expect(subject.result.current.surfaceMode).toBe('page');
    act(() => subject.result.current.toggleSurfaceMode());
    expect(subject.result.current.surfaceMode).toBe('page');

    const nextNoteId = 'next-note-id';
    act(() => subject.rerender({ currentNoteId: nextNoteId }));
    expect(subject.result.current.surfaceMode).toBe('page');
    resolveHydration(subject, { loadedNoteId: nextNoteId });
    expect(subject.result.current.surfaceMode).toBe('page');
  });

  it('S5: retains Page across an A-to-B-to-A route matrix', () => {
    const { subject } = renderSubject();

    resolveHydration(subject);
    expect(subject.result.current.surfaceMode).toBe('page');

    const nextNoteId = 'next-note-id';
    act(() => subject.rerender({ currentNoteId: nextNoteId }));
    expect(subject.result.current.surfaceMode).toBe('page');

    act(() => subject.rerender({ currentNoteId: CANVAS_ONLY_NOTE_ID }));
    expect(subject.result.current.surfaceMode).toBe('page');
  });
});
