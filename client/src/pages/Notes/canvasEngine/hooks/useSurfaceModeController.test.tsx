import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createSurfaceModePolicy,
  getVisibleBlocksForSurface,
} from '../modePolicyService';
import type { NoteBlock } from '../runtimeDataTypes';
import { DEFAULT_PAGE_CONTENT_WIDTH } from '../runtimeLayout';
import { useSurfaceModeController } from './useSurfaceModeController';

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

describe('useSurfaceModeController Page authority after bridge removal', () => {
  it('exposes the Page policy without hydration or toggle callbacks', () => {
    const { result } = renderHook(() => useSurfaceModeController());
    expect(result.current.surfaceMode).toBe('page');
    expect(result.current.pageOffsetX).toBe(0);
    expect(result.current.surfacePolicy).toMatchObject({ mode: 'page', isPageMode: true, isCanvasMode: false });
    expect(result.current).not.toHaveProperty('resolveInitialSurfaceMode');
    expect(result.current).not.toHaveProperty('toggleSurfaceMode');
  });

  it('keeps the Page visibility rule for a mixed historical note', () => {
    const mixedSpecimen = [formalPageSpecimen, canvasOnlySpecimen];
    expect(getVisibleBlocksForSurface(
      mixedSpecimen,
      createSurfaceModePolicy('page'),
      DEFAULT_PAGE_CONTENT_WIDTH,
    )).toEqual([formalPageSpecimen]);
  });
});
