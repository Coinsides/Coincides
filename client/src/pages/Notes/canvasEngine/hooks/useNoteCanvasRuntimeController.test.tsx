import { useLayoutEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from '../runtimeDataTypes';
import { DEFAULT_PAGE_CONTENT_WIDTH } from '../runtimeLayout';

interface ResolverCall {
  blocks: NoteBlock[];
  contentWidth: number;
  loadedNoteId?: string;
  loading: boolean;
}

const rootBridgeContract = vi.hoisted(() => ({
  blocks: [] as NoteBlock[],
  contentWidth: 0,
  loading: true,
  note: undefined as { id: string } | undefined,
  noteId: undefined as string | undefined,
  resolverCalls: [] as ResolverCall[],
  layoutPhaseReceipts: [] as Array<{
    resolverCallCount: number;
    surfaceMode: string;
  }>,
  noop: () => undefined,
}));

vi.mock('./useNoteCanvasRuntime', () => ({
  useNoteCanvasRuntime: () => ({ noteId: rootBridgeContract.noteId }),
}));

vi.mock('./useRuntimeSurfaceStateController', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const surfaceModule = await vi.importActual<typeof import('./useSurfaceModeController')>(
    './useSurfaceModeController',
  );
  const blockListRef = { current: null };
  const movingBlockIdRef = { current: null };
  const suppressMeasuredReflowUntilRef = { current: 0 };

  return {
    useRuntimeSurfaceStateController: ({ noteId }: { noteId?: string }) => {
      const surface = surfaceModule.useSurfaceModeController({
        noteId,
        clearBlockSelection: rootBridgeContract.noop,
        closeOverlay: rootBridgeContract.noop,
        setSnapGuide: rootBridgeContract.noop,
      });
      const resolveInitialSurfaceMode = React.useCallback((input: ResolverCall) => {
        rootBridgeContract.resolverCalls.push(input);
        surface.resolveInitialSurfaceMode(input);
      }, [surface.resolveInitialSurfaceMode]);

      return new Proxy({
        ...surface,
        blockListRef,
        movingBlockIdRef,
        resolveInitialSurfaceMode,
        suppressMeasuredReflowUntilRef,
      }, {
        get(target, property, receiver) {
          return Reflect.has(target, property)
            ? Reflect.get(target, property, receiver)
            : rootBridgeContract.noop;
        },
      });
    },
  };
});

vi.mock('./useRuntimeDocumentDataController', () => ({
  useRuntimeDocumentDataController: () => new Proxy({
    blocks: rootBridgeContract.blocks,
    loading: rootBridgeContract.loading,
    note: rootBridgeContract.note,
    pageFrameCollection: null,
    sourceProjectionPolicy: { contentReadOnly: false },
    sourceReferenceCount: 0,
    sortedBlocks: rootBridgeContract.blocks,
  }, {
    get(target, property, receiver) {
      return Reflect.has(target, property)
        ? Reflect.get(target, property, receiver)
        : rootBridgeContract.noop;
    },
  }),
}));

vi.mock('./useRuntimeLayoutModelController', () => ({
  useRuntimeLayoutModelController: () => ({
    blockLayouts: {},
    contentWidth: rootBridgeContract.contentWidth,
    defaultDraftLayout: { x: 0, y: 0, width: 640, height: 72 },
    persistChangedBlockLayouts: rootBridgeContract.noop,
    persistLayoutSnapshot: rootBridgeContract.noop,
    visibleBlocks: rootBridgeContract.blocks,
  }),
}));

vi.mock('./useRuntimeBlockOperationsController', () => ({
  useRuntimeBlockOperationsController: () => new Proxy({}, {
    get: () => rootBridgeContract.noop,
  }),
}));

vi.mock('./useRuntimePresentationController', () => ({
  useRuntimePresentationController: ({ surfaceMode }: { surfaceMode: string }) => ({
    layerProps: { surfaceMode },
  }),
}));

vi.mock('./useBlockTextFlowEditController', () => ({
  useBlockTextFlowEditController: () => rootBridgeContract.noop,
}));

vi.mock('./useSlashBlockRollbackController', () => ({
  useSlashBlockRollbackController: () => rootBridgeContract.noop,
}));

vi.mock('../tableObjectService', () => ({
  tableObjectSavePayload: rootBridgeContract.noop,
}));

import { useNoteCanvasRuntimeController } from './useNoteCanvasRuntimeController';

const NOTE_ID = 'c2772c92-fdc1-468d-bb1b-root-bridge-note';

const canvasOnlySpecimen: NoteBlock = {
  id: 'f59a15ac-56f6-4d82-a27d-root-canvas-specimen',
  placement_id: 'root-canvas-only-placement',
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
  plain_text: 'Root canvas-only specimen',
  metadata: {},
  order_index: 2,
  source_references: [],
};

const formalPageSpecimen: NoteBlock = {
  ...canvasOnlySpecimen,
  id: '32df5515-8bfd-47c3-b787-root-formal-specimen',
  placement_id: 'root-formal-page-placement',
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
  plain_text: 'Root formal Page specimen',
  order_index: 1,
};

function RootBridgeHarness() {
  const { layerProps } = useNoteCanvasRuntimeController();
  const surfaceMode = (layerProps as unknown as { surfaceMode: string }).surfaceMode;

  useLayoutEffect(() => {
    rootBridgeContract.layoutPhaseReceipts.push({
      resolverCallCount: rootBridgeContract.resolverCalls.length,
      surfaceMode,
    });
  }, [surfaceMode]);

  return <output data-testid="root-surface-mode">{surfaceMode}</output>;
}

describe('useNoteCanvasRuntimeController initial-surface production bridge', () => {
  beforeEach(() => {
    rootBridgeContract.blocks = [];
    rootBridgeContract.contentWidth = DEFAULT_PAGE_CONTENT_WIDTH;
    rootBridgeContract.loading = false;
    rootBridgeContract.note = { id: NOTE_ID };
    rootBridgeContract.noteId = NOTE_ID;
    rootBridgeContract.resolverCalls = [];
    rootBridgeContract.layoutPhaseReceipts = [];
  });

  it.each([
    {
      label: 'canvas-only',
      blocks: [canvasOnlySpecimen],
      expectedSurfaceMode: 'canvas',
    },
    {
      label: 'mixed formal and canvas',
      blocks: [formalPageSpecimen, canvasOnlySpecimen],
      expectedSurfaceMode: 'page',
    },
    {
      label: 'empty',
      blocks: [],
      expectedSurfaceMode: 'page',
    },
  ])('G-X3: resolves $label hydration through the root before the later layout observer', ({
    blocks,
    expectedSurfaceMode,
  }) => {
    rootBridgeContract.blocks = blocks;

    render(<RootBridgeHarness />);

    expect(rootBridgeContract.resolverCalls).toHaveLength(1);
    expect(rootBridgeContract.resolverCalls[0]).toEqual({
      blocks,
      contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
      loadedNoteId: NOTE_ID,
      loading: false,
    });
    expect(rootBridgeContract.resolverCalls[0]?.blocks).toBe(blocks);
    expect(rootBridgeContract.layoutPhaseReceipts[0]?.resolverCallCount).toBe(1);
    expect(screen.getByTestId('root-surface-mode').textContent).toBe(expectedSurfaceMode);
  });
});
