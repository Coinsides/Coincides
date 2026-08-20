// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  classifyCanvasSurfaceAuthority,
} from '../../../../../shared/types/canvasSurfaceAuthority';
import {
  buildLayoutPayload,
  normalizeBlockLayout,
  normalizeResolvedBlockLayout,
  reconcileHydratedBlockLayoutSurfaceAuthority,
} from './placementService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

const PAGE_FRAME: PageFrameModel = {
  id: 'page-world',
  role: 'primary_page_frame',
  exportable: true,
  x: 100,
  y: 0,
  width: 904,
  height: 1278,
  contentInset: { top: 0, right: 72, bottom: 96, left: 72 },
};

const LIVE_PAGE_FRAME: PageFrameModel = {
  ...PAGE_FRAME,
  id: 'primary-page-frame',
  x: 0,
};

describe('canvas surface authority classifier contract', () => {
  it.each([
    {
      label: 'inside',
      x: 0,
      width: 760,
      expected: { surface: 'formal_page', boundaryRole: 'inside', frameId: 'page-1' },
    },
    {
      label: 'crossing',
      x: 700,
      width: 120,
      expected: { surface: 'canvas_workspace', boundaryRole: 'crossing', frameId: 'page-1' },
    },
    {
      label: 'outside',
      x: 784,
      width: 120,
      expected: { surface: 'canvas_workspace', boundaryRole: 'outside', frameId: null },
    },
  ])('classifies PageFrame-local $label geometry', ({ x, width, expected }) => {
    expect(classifyCanvasSurfaceAuthority({
      coordinateSpace: 'page_frame_local',
      box: { x, width },
      pageLocalWidth: 760,
      pageBoundary: { left: 0, right: 760, frameId: 'page-1' },
      explicitSurface: 'formal_page',
    })).toEqual(expected);
  });

  it.each([
    {
      label: 'inside',
      x: 172,
      width: 760,
      explicitSurface: 'canvas_workspace' as const,
      expected: { surface: 'formal_page', boundaryRole: 'inside', frameId: 'page-world' },
    },
    {
      label: 'crossing',
      x: 900,
      width: 80,
      explicitSurface: 'formal_page' as const,
      expected: { surface: 'canvas_workspace', boundaryRole: 'crossing', frameId: 'page-world' },
    },
    {
      label: 'outside',
      x: 956,
      width: 120,
      explicitSurface: 'formal_page' as const,
      expected: { surface: 'canvas_workspace', boundaryRole: 'outside', frameId: null },
    },
  ])('classifies Canvas-world $label geometry over stale explicit surface', ({
    x,
    width,
    explicitSurface,
    expected,
  }) => {
    expect(classifyCanvasSurfaceAuthority({
      coordinateSpace: 'canvas_world',
      box: { x, width },
      pageBoundary: { left: 172, right: 932, frameId: 'page-world' },
      explicitSurface,
    })).toEqual(expected);
  });

  it('uses explicit surface only when a Canvas-world boundary receipt is unavailable', () => {
    expect(classifyCanvasSurfaceAuthority({
      coordinateSpace: 'canvas_world',
      box: { x: 72, width: 760 },
      explicitSurface: 'formal_page',
    })).toEqual({
      surface: 'formal_page',
      boundaryRole: 'inside',
      frameId: null,
    });
  });

  it('keeps an untagged legacy formal layout on its explicit surface during hydrate', () => {
    const legacy = {
      x: 72,
      y: 0,
      width: 760,
      height: 72,
      surface: 'formal_page',
    };

    expect(reconcileHydratedBlockLayoutSurfaceAuthority(legacy, [PAGE_FRAME])).toEqual(legacy);
    expect(buildLayoutPayload(legacy as BlockBoxLayout)).toMatchObject({
      surface: 'formal_page',
      boundary_role: 'inside',
    });
    expect(buildLayoutPayload(legacy as BlockBoxLayout)).not.toHaveProperty('coordinate_space');
  });

  it('converts a tagged Canvas-world inside layout at the hydrate boundary', () => {
    expect(reconcileHydratedBlockLayoutSurfaceAuthority({
      x: 172,
      y: 0,
      width: 760,
      height: 72,
      surface: 'formal_page',
      coordinate_space: 'canvas_world',
      frame_id: PAGE_FRAME.id,
      boundary_role: 'inside',
    }, [PAGE_FRAME])).toMatchObject({
      x: 0,
      surface: 'formal_page',
      coordinate_space: 'page_frame_local',
      frame_id: PAGE_FRAME.id,
      boundary_role: 'inside',
    });
  });

  it.each([
    { label: 'left', x: 0, width: 100 },
    { label: 'right', x: 956, width: 120 },
  ])('keeps a tagged Canvas-world $label outside layout in world coordinates through hydrate and save', ({ x, width }) => {
    const hydrated = reconcileHydratedBlockLayoutSurfaceAuthority({
      x,
      y: 0,
      width,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'outside',
    }, [PAGE_FRAME]);
    expect(hydrated).toMatchObject({
      x,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'outside',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: {
          left: 172,
          right: 932,
          frameId: PAGE_FRAME.id,
        },
      },
    });
    expect(hydrated).not.toHaveProperty('frame_id');

    const normalized = normalizeBlockLayout({
      block: { id: `outside-${x}`, canvas_layout: hydrated },
      fallback: { x: 0, y: 0, width: 760, height: 72 },
      contentWidth: 760,
      surfaceMode: 'canvas',
      estimateHeight: () => 72,
    });
    expect(normalized).toMatchObject({
      x,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
    });
    expect(buildLayoutPayload(normalized)).toMatchObject({
      x,
      surface: 'canvas_workspace',
      boundary_role: 'outside',
      coordinate_space: 'canvas_world',
    });
    expect(buildLayoutPayload(normalized)).not.toHaveProperty('frame_id');
  });

  it.each([
    {
      label: 'left live f6cefd29',
      placementId: 'f6cefd29-c59e-4915-b773-0687908b817d',
      x: 14,
      width: 760,
    },
    {
      label: 'right live c02b2457',
      placementId: 'c02b2457-8c9a-4f9b-bcf2-6724055312e6',
      x: 414,
      width: 760,
    },
  ])('keeps a tagged Canvas-world $label crossing through hydrate, normalize, and save', ({
    placementId,
    x,
    width,
  }) => {
    const hydrated = reconcileHydratedBlockLayoutSurfaceAuthority({
      x,
      y: 0,
      width,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      frame_id: LIVE_PAGE_FRAME.id,
      boundary_role: 'crossing',
    }, [LIVE_PAGE_FRAME]);
    expect(hydrated).toMatchObject({
      x,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      frame_id: LIVE_PAGE_FRAME.id,
      boundary_role: 'crossing',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: {
          left: 72,
          right: 832,
          frameId: LIVE_PAGE_FRAME.id,
        },
      },
    });

    const normalized = normalizeBlockLayout({
      block: { id: placementId, placement_id: placementId, canvas_layout: hydrated },
      fallback: { x: 0, y: 0, width: 760, height: 72 },
      contentWidth: 760,
      surfaceMode: 'canvas',
      estimateHeight: () => 72,
    });
    expect(normalized).toMatchObject({
      x,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      frame_id: LIVE_PAGE_FRAME.id,
      boundary_role: 'crossing',
    });

    expect(buildLayoutPayload(normalized)).toMatchObject({
      x,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      frame_id: LIVE_PAGE_FRAME.id,
      boundary_role: 'crossing',
    });
  });

  it('does not clamp a stored Canvas-world x coordinate during normalization', () => {
    const normalized = normalizeBlockLayout({
      block: {
        id: 'negative-world-crossing',
        canvas_layout: {
          x: -20,
          y: -15,
          width: 120,
          height: 72,
          surface: 'canvas_workspace',
          coordinate_space: 'canvas_world',
          frame_id: LIVE_PAGE_FRAME.id,
          boundary_role: 'crossing',
        },
      },
      fallback: { x: 0, y: 0, width: 120, height: 72 },
      contentWidth: 760,
      surfaceMode: 'canvas',
      estimateHeight: () => 72,
    });

    expect(normalized.x).toBe(-20);
    expect(normalized.y).toBe(-15);

    expect(normalizeResolvedBlockLayout({
      block: { id: 'negative-world-crossing' },
      layout: normalized,
      contentWidth: 760,
      surfaceMode: 'canvas',
      estimateHeight: () => 72,
    })).toMatchObject({
      x: -20,
      y: -15,
      coordinate_space: 'canvas_world',
    });
  });

  it('reclassifies a hydrated Canvas-world outside layout after an explicit drag back inside', () => {
    const hydratedOutside = reconcileHydratedBlockLayoutSurfaceAuthority({
      x: 0,
      y: 0,
      width: 100,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'outside',
    }, [PAGE_FRAME]) as unknown as BlockBoxLayout;
    const insideWorldPayload = buildLayoutPayload({
      ...hydratedOutside,
      x: 172,
      width: 760,
    });
    expect(insideWorldPayload).toMatchObject({
      x: 172,
      surface: 'formal_page',
      boundary_role: 'inside',
      coordinate_space: 'canvas_world',
      frame_id: PAGE_FRAME.id,
    });

    expect(reconcileHydratedBlockLayoutSurfaceAuthority(insideWorldPayload, [PAGE_FRAME])).toMatchObject({
      x: 0,
      surface: 'formal_page',
      boundary_role: 'inside',
      coordinate_space: 'page_frame_local',
      frame_id: PAGE_FRAME.id,
    });
  });

  it('reclassifies tagged drag-out and drag-back layouts with the same boundary receipt', () => {
    const draggedOut: BlockBoxLayout = {
      x: 700,
      y: 0,
      width: 120,
      height: 72,
      surface: 'formal_page',
      coordinate_space: 'page_frame_local',
      frame_id: PAGE_FRAME.id,
    };
    expect(buildLayoutPayload(draggedOut)).toMatchObject({
      surface: 'canvas_workspace',
      boundary_role: 'crossing',
      frame_id: PAGE_FRAME.id,
    });

    const hydratedCrossing = reconcileHydratedBlockLayoutSurfaceAuthority({
      x: 900,
      y: 0,
      width: 80,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      frame_id: PAGE_FRAME.id,
      boundary_role: 'crossing',
    }, [PAGE_FRAME]) as unknown as BlockBoxLayout;
    expect(hydratedCrossing).toMatchObject({
      x: 900,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
      frame_id: PAGE_FRAME.id,
    });
    expect(buildLayoutPayload({
      ...hydratedCrossing,
      x: 200,
      width: 120,
    })).toMatchObject({
      surface: 'formal_page',
      boundary_role: 'inside',
      frame_id: PAGE_FRAME.id,
    });
  });
});
