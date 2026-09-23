import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from '../runtimeDataTypes';
import type { UseRuntimePresentationControllerOptions } from './useRuntimePresentationController';
import { DEFAULT_PAGE_CONTENT_WIDTH, type BlockBoxLayout } from '../runtimeLayout';
import { createPageFramePrintProfile } from '../pageFramePrintScaleService';
import { createDefaultDocumentTypographyProfile, documentTypographyToCssVars } from '../typographyProfileService';
import { estimateTypographyTextBlockHeight } from '../typographyMeasurementService';
import { buildExportPreviewModel } from '../exportPreviewService';
import type { DocumentTypographyProfile, PageFrameCollectionModel, PageFrameModel } from '../types';
import { createDefaultNoteBindingSettings, type NoteBindingSettings } from '../../../../../../shared/types/noteBinding';
import { createPageFrameCollectionSeed } from '../pageFrameCollectionService';
import { addNoteCoverPage } from '../noteCoverPageCollection';
import { createDefaultComponentBlockPayload } from '../componentBlockService';

vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(),
  default: { get: vi.fn(async (url: string) => {
    if (url === '/palette-colors' || url === '/skin-suites') return { data: [] };
    throw new Error(`Unexpected synthetic GET: ${url}`);
  }) },
}));

const rootBridgeContract = vi.hoisted(() => ({
  blocks: [] as NoteBlock[],
  contentWidth: 0,
  loading: true,
  layoutMode: false,
  contentReadOnly: false,
  wallOptions: null as { enabled: boolean; boundary: () => boolean } | null,
  note: undefined as { id: string; metadata?: Record<string, unknown> } | undefined,
  noteId: undefined as string | undefined,
  pageFrameCollection: null as PageFrameCollectionModel | null,
  hydratedProfile: undefined as DocumentTypographyProfile | undefined,
  dispatchedProfiles: {} as Record<string, DocumentTypographyProfile>,
  blockLayouts: {} as Record<string, BlockBoxLayout>,
  surfaceMode: 'page',
  presentationOptions: null as UseRuntimePresentationControllerOptions | null,
  bindingSettings: undefined as NoteBindingSettings | undefined,
  coordinateContract: 'v1' as 'v1' | 'v2',
  createBlock: vi.fn<(...args: unknown[]) => Promise<NoteBlock | null>>(),
  pushHistoryEntry: vi.fn(() => true),
  enqueueRuntimeHistoryOperation: vi.fn(async (operation: () => Promise<boolean>) => operation()),
  markBlockSelected: vi.fn(),
  setFocusBlockId: vi.fn(),
  noop: () => undefined,
}));

vi.mock('./useNoteCanvasRuntime', () => ({
  useNoteCanvasRuntime: () => ({ noteId: rootBridgeContract.noteId }),
}));

vi.mock('./useRuntimeSurfaceStateController', async () => {
  const surfaceModule = await vi.importActual<typeof import('./useSurfaceModeController')>(
    './useSurfaceModeController',
  );
  const blockListRef = { current: null };
  const movingBlockIdRef = { current: null };
  const suppressMeasuredReflowUntilRef = { current: 0 };

  return {
    useRuntimeSurfaceStateController: () => {
      const surface = surfaceModule.useSurfaceModeController();

      return new Proxy({
        ...surface,
        layoutMode: rootBridgeContract.layoutMode,
        markBlockSelected: rootBridgeContract.markBlockSelected,
        setFocusBlockId: rootBridgeContract.setFocusBlockId,
        blockListRef,
        movingBlockIdRef,
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
    pageFrameCollection: rootBridgeContract.pageFrameCollection,
    documentTypographyProfile: rootBridgeContract.hydratedProfile,
    sourceProjectionPolicy: { contentReadOnly: rootBridgeContract.contentReadOnly },
    sourceReferenceCount: 0,
    sortedBlocks: rootBridgeContract.blocks,
    persistedCanvasObjects: [],
    persistedCanvasPlacements: [],
    persistedContentMounts: [],
    coordinateContract: rootBridgeContract.coordinateContract,
    createBlock: rootBridgeContract.createBlock,
  }, {
    get(target, property, receiver) {
      return Reflect.has(target, property)
        ? Reflect.get(target, property, receiver)
        : rootBridgeContract.noop;
    },
  }),
}));

vi.mock('./useNoteBinding', () => ({
  useNoteBinding: () => ({ value: rootBridgeContract.bindingSettings, loading: false, error: null,
    save: rootBridgeContract.noop, retry: rootBridgeContract.noop }),
}));

vi.mock('./usePageFrameWalls', async () => {
  const actual = await vi.importActual<typeof import('./usePageFrameWalls')>('./usePageFrameWalls');
  return {
    usePageFrameWalls: (options: Parameters<typeof actual.usePageFrameWalls>[0]) => {
      rootBridgeContract.wallOptions = options;
      return actual.usePageFrameWalls(options);
    },
  };
});

vi.mock('./useRuntimeLayoutModelController', async () => {
  const { useNoteCanvasResolvedLayoutModel } = await vi.importActual<typeof import('./useNoteCanvasLayoutModel')>(
    './useNoteCanvasLayoutModel',
  );
  return {
    useRuntimeLayoutModelController: (options: Parameters<typeof useNoteCanvasResolvedLayoutModel>[0]) => {
      rootBridgeContract.dispatchedProfiles.layout = options.documentTypographyProfile;
      const pageFrames = rootBridgeContract.pageFrameCollection?.pageFrames || [];
      const resolved = useNoteCanvasResolvedLayoutModel({
        ...options,
        contentWidth: rootBridgeContract.contentWidth,
        layoutDrafts: {},
        pageFrames,
      });
      rootBridgeContract.blockLayouts = resolved.blockLayouts;
      return {
        ...resolved,
        pageFrames,
        contentWidth: rootBridgeContract.contentWidth,
        persistChangedBlockLayouts: rootBridgeContract.noop,
        persistLayoutSnapshot: rootBridgeContract.noop,
      };
    },
  };
});

vi.mock('./useRuntimeBlockOperationsController', () => ({
  useRuntimeBlockOperationsController: ({ documentTypographyProfile }: { documentTypographyProfile: DocumentTypographyProfile }) => {
    rootBridgeContract.dispatchedProfiles.operations = documentTypographyProfile;
    return new Proxy({ pushHistoryEntry: rootBridgeContract.pushHistoryEntry,
      enqueueRuntimeHistoryOperation: rootBridgeContract.enqueueRuntimeHistoryOperation,
    }, { get: (target, property, receiver) => Reflect.has(target, property)
      ? Reflect.get(target, property, receiver) : rootBridgeContract.noop });
  },
}));

vi.mock('./useRuntimePresentationController', () => ({
  useRuntimePresentationController: (options: UseRuntimePresentationControllerOptions) => {
    const { surfaceMode, documentTypographyProfile } = options;
    rootBridgeContract.presentationOptions = options;
    rootBridgeContract.surfaceMode = surfaceMode;
    rootBridgeContract.dispatchedProfiles.presentation = documentTypographyProfile;
    return { layerProps: { surfaceMode } };
  },
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
  useNoteCanvasRuntimeController();
  const surfaceMode = rootBridgeContract.surfaceMode;

  return <output data-testid="root-surface-mode">{surfaceMode}</output>;
}

describe('useNoteCanvasRuntimeController Page runtime assembly after bridge removal', () => {
  beforeEach(() => {
    rootBridgeContract.blocks = [];
    rootBridgeContract.contentWidth = DEFAULT_PAGE_CONTENT_WIDTH;
    rootBridgeContract.loading = false;
    rootBridgeContract.layoutMode = false;
    rootBridgeContract.contentReadOnly = false;
    rootBridgeContract.wallOptions = null;
    rootBridgeContract.note = { id: NOTE_ID };
    rootBridgeContract.noteId = NOTE_ID;
    rootBridgeContract.pageFrameCollection = null;
    rootBridgeContract.hydratedProfile = createDefaultDocumentTypographyProfile();
    rootBridgeContract.dispatchedProfiles = {};
    rootBridgeContract.blockLayouts = {};
    rootBridgeContract.bindingSettings = undefined;
    rootBridgeContract.coordinateContract = 'v1';
    rootBridgeContract.createBlock.mockReset();
    rootBridgeContract.pushHistoryEntry.mockClear();
    rootBridgeContract.enqueueRuntimeHistoryOperation.mockClear();
    rootBridgeContract.markBlockSelected.mockClear();
    rootBridgeContract.setFocusBlockId.mockClear();
  });

  it('assembles Page without a surface toggle prop', () => {
    render(<RootBridgeHarness />);
    expect(rootBridgeContract.presentationOptions).not.toBeNull();
    expect(rootBridgeContract.presentationOptions).not.toHaveProperty('onToggleSurfaceMode');
    expect(screen.getByTestId('root-surface-mode').textContent).toBe('page');
  });

  it.each(['timeline', 'chart_bar', 'chart_line'] as const)('B2 creates %s through its existing block template and history lane', async (kind) => {
    const payload = createDefaultComponentBlockPayload(kind);
    const component = { ...formalPageSpecimen, id: `new-${kind}`, block_type: 'component', content_json: payload };
    rootBridgeContract.createBlock.mockResolvedValue(component);
    render(<RootBridgeHarness />);
    const create = rootBridgeContract.presentationOptions?.onCreateComponent;
    expect(create).toBeTypeOf('function');
    await act(async () => { expect(await create!(payload)).toBe(true); });
    expect(rootBridgeContract.createBlock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ template_key: `component.${kind}`, legacy_block_type: 'component' }), '',
      expect.objectContaining({ contentJson: payload }),
    );
    expect(rootBridgeContract.markBlockSelected).toHaveBeenCalledExactlyOnceWith(component.id);
    expect(rootBridgeContract.enqueueRuntimeHistoryOperation).toHaveBeenCalledOnce();
    expect(rootBridgeContract.pushHistoryEntry).toHaveBeenCalledWith({ type: 'createdBlock', block: component }, { skipBoundary: true });
  });

  it('T1 creates an empty toc block at the existing insertion layout and records its creation for undo', async () => {
    const toc = { ...formalPageSpecimen, id: 'new-toc', block_type: 'toc', content_json: {}, plain_text: '' };
    rootBridgeContract.createBlock.mockResolvedValue(toc);
    render(<RootBridgeHarness />);
    const create = rootBridgeContract.presentationOptions?.onCreateToc;
    expect(create).toBeTypeOf('function');
    await act(async () => { expect(await create!()).toBe(true); });
    expect(rootBridgeContract.createBlock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ legacy_block_type: 'toc' }), '',
      { contentJson: {}, layout: rootBridgeContract.presentationOptions!.defaultDraftLayout },
    );
    expect(rootBridgeContract.markBlockSelected).toHaveBeenCalledExactlyOnceWith(toc.id);
    expect(rootBridgeContract.enqueueRuntimeHistoryOperation).toHaveBeenCalledOnce();
    expect(rootBridgeContract.pushHistoryEntry).toHaveBeenCalledExactlyOnceWith(
      { type: 'createdBlock', block: toc }, { skipBoundary: true },
    );
  });

  it('T1 leaves selection and history unchanged when toc creation does not finish', async () => {
    rootBridgeContract.createBlock.mockResolvedValue(null);
    render(<RootBridgeHarness />);
    await act(async () => { expect(await rootBridgeContract.presentationOptions!.onCreateToc!()).toBe(false); });
    expect(rootBridgeContract.createBlock).toHaveBeenCalledOnce();
    expect(rootBridgeContract.markBlockSelected).not.toHaveBeenCalled();
    expect(rootBridgeContract.pushHistoryEntry).not.toHaveBeenCalled();
  });

  function coverBindingCase(field: 'title' | 'description') {
    const content = createPageFrameCollectionSeed();
    rootBridgeContract.pageFrameCollection = addNoteCoverPage(content, 'rebuilt-cover');
    const settings = createDefaultNoteBindingSettings();
    settings.coverPage.frameId = 'rebuilt-cover';
    rootBridgeContract.bindingSettings = settings;
    rootBridgeContract.coordinateContract = 'v2';
    const projection = (id: string, frameId: string): NoteBlock => ({ ...formalPageSpecimen,
      id, placement_id: `placement-${id}`, block_type: 'note_ref', content_json: { field }, plain_text: '',
      canvas_layout: { x: 40, y: 80, width: 400, height: 100, width_mode: 'manual',
        frame_id: frameId, coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside' },
    });
    return { old: projection('retained-binding', content.primaryFrameId!),
      current: projection('current-binding', 'rebuilt-cover') };
  }

  it.each(['manual', 'concise'] as const)('T7 wires %s through the real runtime history lane and ordinary note_ref creation', async (id) => {
    coverBindingCase('title');
    rootBridgeContract.createBlock.mockImplementation(async (_template, _text, options) => {
      const { contentJson, layout } = options as { contentJson: { field: string }; layout: BlockBoxLayout };
      return { ...formalPageSpecimen, id: contentJson.field, block_type: 'note_ref', content_json: contentJson, canvas_layout: { ...layout } };
    });
    render(<RootBridgeHarness />);
    await act(async () => { await rootBridgeContract.presentationOptions!.onApplyCoverPreset!(id); });
    expect(rootBridgeContract.createBlock).toHaveBeenCalledTimes(2);
    for (const [template, text, options] of rootBridgeContract.createBlock.mock.calls) {
      expect(template).toMatchObject({ legacy_block_type: 'note_ref' }); expect(text).toBe('');
      expect(options).toMatchObject({ layout: { frame_id: 'rebuilt-cover', width_mode: 'manual', coordinate_space: 'page_frame_local' } });
    }
    expect(rootBridgeContract.enqueueRuntimeHistoryOperation).toHaveBeenCalledOnce();
    expect(rootBridgeContract.pushHistoryEntry).toHaveBeenCalledWith(expect.objectContaining({ type: 'reversibleEdit' }), { skipBoundary: true });
    expect(rootBridgeContract.markBlockSelected).toHaveBeenCalledWith('title');
  });

  it.each(['title', 'description'] as const)('focuses the current cover %s projection even when the content page retains an earlier one', async (field) => {
    const specimens = coverBindingCase(field);
    rootBridgeContract.blocks = [specimens.old, specimens.current];
    render(<RootBridgeHarness />);
    const add = rootBridgeContract.presentationOptions?.onAddNoteBinding;
    expect(add).toBeTypeOf('function');
    await act(async () => { await add!(field); });
    expect(rootBridgeContract.createBlock).not.toHaveBeenCalled();
    expect(rootBridgeContract.markBlockSelected).toHaveBeenCalledExactlyOnceWith('current-binding');
    expect(rootBridgeContract.setFocusBlockId).toHaveBeenCalledExactlyOnceWith('current-binding');
  });

  it.each(['title', 'description'] as const)('creates a fresh cover %s projection after the former one was handed to the content page', async (field) => {
    const specimens = coverBindingCase(field);
    rootBridgeContract.blocks = [specimens.old];
    rootBridgeContract.createBlock.mockResolvedValue(specimens.current);
    const before = structuredClone(specimens.old);
    render(<RootBridgeHarness />);
    const add = rootBridgeContract.presentationOptions?.onAddNoteBinding;
    expect(add).toBeTypeOf('function');
    await act(async () => { await add!(field); });
    expect(rootBridgeContract.createBlock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ legacy_block_type: 'note_ref' }), '',
      expect.objectContaining({ contentJson: { field }, layout: expect.objectContaining({
        frame_id: 'rebuilt-cover', width_mode: 'manual', coordinate_space: 'page_frame_local', surface: 'formal_page',
      }) }),
    );
    expect(rootBridgeContract.markBlockSelected).toHaveBeenCalledExactlyOnceWith('current-binding');
    expect(rootBridgeContract.setFocusBlockId).toHaveBeenCalledExactlyOnceWith('current-binding');
    expect(specimens.old).toEqual(before);
  });

  it.each(['title', 'description'] as const)('creates a current-cover %s projection when an earlier one is in the tray with a retained frame id', async (field) => {
    const specimens = coverBindingCase(field);
    const tray = { ...specimens.current, id: 'tray-binding', placement_id: 'tray-placement',
      canvas_layout: { ...specimens.current.canvas_layout, surface: 'tray' as const } };
    rootBridgeContract.blocks = [tray];
    rootBridgeContract.createBlock.mockResolvedValue(specimens.current);
    render(<RootBridgeHarness />);
    const add = rootBridgeContract.presentationOptions?.onAddNoteBinding;
    expect(add).toBeTypeOf('function');
    await act(async () => { await add!(field); });
    expect(rootBridgeContract.createBlock).toHaveBeenCalledOnce();
    expect(rootBridgeContract.markBlockSelected).toHaveBeenCalledExactlyOnceWith('current-binding');
    expect(rootBridgeContract.setFocusBlockId).toHaveBeenCalledExactlyOnceWith('current-binding');
    expect(tray.canvas_layout).toMatchObject({ surface: 'tray', frame_id: 'rebuilt-cover' });
  });

  it('gates both wall hook and runtime boundary with the current Layout state', () => {
    const view = render(<RootBridgeHarness />);
    expect(rootBridgeContract.wallOptions?.enabled).toBe(false);
    expect(rootBridgeContract.wallOptions?.boundary()).toBe(false);
    const previousBoundary = rootBridgeContract.wallOptions!.boundary;

    rootBridgeContract.layoutMode = true;
    view.rerender(<RootBridgeHarness />);
    expect(rootBridgeContract.wallOptions?.enabled).toBe(true);
    expect(rootBridgeContract.wallOptions?.boundary()).toBe(true);

    rootBridgeContract.loading = true;
    view.rerender(<RootBridgeHarness />);
    expect(rootBridgeContract.wallOptions?.enabled).toBe(false);
    rootBridgeContract.loading = false;
    rootBridgeContract.contentReadOnly = true;
    view.rerender(<RootBridgeHarness />);
    expect(rootBridgeContract.wallOptions?.enabled).toBe(false);

    rootBridgeContract.contentReadOnly = false;
    rootBridgeContract.layoutMode = false;
    view.rerender(<RootBridgeHarness />);
    expect(rootBridgeContract.wallOptions?.enabled).toBe(false);
    expect(rootBridgeContract.wallOptions?.boundary()).toBe(false);
    expect(previousBoundary()).toBe(false);
  });

  it('13.1/S5 smoke: same-note A4 to Letter follows quantized 10pt across repeated Page rerenders', () => {
    const frameFor = (pageSize: 'A4' | 'Letter'): PageFrameModel => {
      const print = createPageFramePrintProfile(pageSize);
      return {
        id: 'same-note-paper-frame',
        role: 'primary_page_frame',
        templateId: pageSize === 'A4' ? 'a4_portrait' : 'letter_portrait',
        pageSize,
        exportable: true,
        x: 0,
        y: 0,
        width: print.width,
        height: print.height,
        contentInset: { ...print.contentInset },
      };
    };
    const a4 = frameFor('A4');
    const letter = frameFor('Letter');
    const framesBefore = structuredClone([a4, letter]);
    const specimen = {
      ...formalPageSpecimen,
      canvas_layout: undefined,
      // Straddle A4/Letter wrapping at 10pt: A4 fits 101 ASCII characters per line; Letter fits 104.
      plain_text: 'x'.repeat(103),
      content_json: { body: 'x'.repeat(103) },
    };
    rootBridgeContract.blocks = [specimen];
    const setFrame = (frame: PageFrameModel) => {
      rootBridgeContract.pageFrameCollection = {
        pageFrames: [frame], primaryFrameId: frame.id, selectedFrameId: frame.id,
      };
    };
    setFrame(a4);
    const { rerender } = render(<RootBridgeHarness />);

    const snapshot = (frame: PageFrameModel) => {
      const profile = rootBridgeContract.dispatchedProfiles.layout;
      expect(rootBridgeContract.dispatchedProfiles.operations).toBe(profile);
      expect(rootBridgeContract.dispatchedProfiles.presentation).toBe(profile);
      const layout = rootBridgeContract.blockLayouts[specimen.id];
      const measurement = estimateTypographyTextBlockHeight({
        text: specimen.plain_text,
        width: layout.width,
        typography: profile,
      });
      const preview = buildExportPreviewModel([specimen], { [specimen.id]: layout }, {
        pageFrames: [frame], primaryPageFrameId: frame.id, documentTypography: profile,
      });
      expect(preview.pageFrames[0].documentTypography).toEqual(profile);
      expect(documentTypographyToCssVars(profile)['--document-font-size']).toBe(`${profile.fontSizePx}px`);
      expect(layout.height).toBe(measurement.heightPx);
      return { profile, measurement, layout: { ...layout } };
    };

    const a4Page = snapshot(a4);
    setFrame(letter);
    rerender(<RootBridgeHarness />);
    const letterPage = snapshot(letter);
    expect(screen.getByTestId('root-surface-mode').textContent).toBe('page');
    expect(rootBridgeContract.noteId).toBe(NOTE_ID);
    expect(a4Page.profile.fontSizePx).toBe(15.2);
    expect(letterPage.profile.fontSizePx).toBe(14.8);
    expect(a4Page.measurement.lineCount).toBeGreaterThan(letterPage.measurement.lineCount);
    expect(a4Page.layout.height).toBeGreaterThan(letterPage.layout.height);
    expect(a4Page.layout.width).toBe(letterPage.layout.width);
    for (const [pageSize, sample] of [['A4', a4Page], ['Letter', letterPage]] as const) {
      const { physicalScale } = createPageFramePrintProfile(pageSize);
      const physicalPt = sample.profile.fontSizePx * physicalScale * 72 / 96;
      expect(Math.abs(physicalPt - 10) / 10).toBeLessThanOrEqual(0.005);
    }

    rerender(<RootBridgeHarness />);
    const letterCanvas = snapshot(letter);
    expect(screen.getByTestId('root-surface-mode').textContent).toBe('page');
    setFrame(a4);
    rerender(<RootBridgeHarness />);
    const a4Canvas = snapshot(a4);
    expect(a4Canvas.profile).toEqual(a4Page.profile);
    expect(letterCanvas.profile).toEqual(letterPage.profile);
    expect(a4Canvas.measurement).toEqual(a4Page.measurement);
    expect(letterCanvas.layout).toEqual(letterPage.layout);
    expect([a4, letter]).toEqual(framesBefore);
  });
});
