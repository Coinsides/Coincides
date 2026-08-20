import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note, NoteBlock } from '../runtimeDataTypes';
import {
  DRAFT_RECOVERY_STORAGE_KEY_V1,
  DRAFT_RECOVERY_STORAGE_KEY_V2,
} from '../draftBlockPersistence';
import { useDraftBlockController } from './useDraftBlockController';
import { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    delete: mocks.delete,
  },
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: { addToast: typeof mocks.addToast }) => unknown) => (
    selector({ addToast: mocks.addToast })
  ),
}));

const note: Note = {
  id: 'note-1',
  course_id: '',
  title: 'Adapter seam',
  description: null,
  status: 'active',
  metadata: {},
};

const stableAdapterOptions = {
  noteId: note.id,
  onNoteLoaded: vi.fn(),
  clearLayoutDraftForBlock: vi.fn(),
  setLayoutDraftForBlock: vi.fn(),
};

const stableControllerCallbacks = {
  onDraftFocusReceipt: vi.fn(),
  setActiveBlockId: vi.fn(),
  setFocusBlockId: vi.fn(),
  setInteractionState: vi.fn(),
  setSelectedBlockId: vi.fn(),
};

const defaultDraftLayout = {
  x: 20,
  y: 40,
  width: 540,
  height: 80,
  surface: 'canvas_workspace' as const,
  coordinate_space: 'canvas_world' as const,
  boundary_role: 'outside' as const,
};

const recoveryTemplate = {
  template_id: 'text.paragraph',
  template_key: 'text.paragraph',
  template_version: '1.0.0',
  label: 'Text',
  description: 'Text',
  system_type: 'text',
  learning_role: 'note',
  legacy_block_type: 'text',
  default_content: {},
  origin: 'test',
  status: 'active',
  isRuntime: false,
};

let canvasPersistenceResponse: Record<string, unknown> = {};

function contradictoryCrossingReceipt(version: 1 | 2, key: string) {
  return {
    version,
    noteId: 'old-note',
    clientCreateKey: key,
    text: 'queued text',
    layout: {
      x: 20,
      y: 40,
      width: 760,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
      frame_id: null,
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: null,
      },
    },
    template: recoveryTemplate,
    queuedAt: '2026-08-20T00:00:00.000Z',
  };
}

type GeometryContradiction = 'inside-as-outside' | 'crossing-as-inside';

function geometryContradictionReceipt(
  version: 1 | 2,
  key: string,
  contradiction: GeometryContradiction,
) {
  const layout = contradiction === 'inside-as-outside'
    ? {
      x: 300,
      y: 40,
      width: 10,
      height: 72,
      surface: 'formal_page',
      coordinate_space: 'canvas_world',
      boundary_role: 'inside',
      frame_id: 'frame-a',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: { left: 100, right: 200, frameId: 'frame-a' },
      },
    }
    : {
      x: 120,
      y: 40,
      width: 20,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
      frame_id: 'frame-a',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: { left: 100, right: 200, frameId: 'frame-a' },
      },
    };
  return {
    version,
    noteId: 'old-note',
    clientCreateKey: key,
    text: 'queued text',
    layout,
    template: recoveryTemplate,
    queuedAt: '2026-08-20T00:00:00.000Z',
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function serverBlock(text: string, reused: boolean, clientCreateKey = 'retry-key'): NoteBlock & {
  client_create_receipt: Record<string, unknown>;
} {
  return {
    id: 'block-1',
    placement_id: 'placement-1',
    display_overrides_json: {},
    canvas_layout: null,
    block_type: 'text',
    title: null,
    content_json: { body: text },
    plain_text: text,
    metadata: {},
    order_index: 0,
    source_references: [],
    client_create_receipt: {
      client_create_key: clientCreateKey,
      status: 'applied',
      reused,
    },
  };
}

describe('useNoteCanvasDataAdapter draft create receipt seam', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    canvasPersistenceResponse = {};
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: [] };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: canvasPersistenceResponse };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === `/annotation-truths/by-note/${note.id}`
        || url === `/purposes/by-note/${note.id}`
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
  });

  afterEach(() => consoleError.mockRestore());

  it('passes reused=true through from the authoritative API receipt', async () => {
    mocks.post.mockResolvedValueOnce({ data: serverBlock('ab', true) });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));

    let created: Awaited<ReturnType<typeof subject.result.current.createDraftBlock>> = null;
    await act(async () => {
      created = await subject.result.current.createDraftBlock(
        subject.result.current.defaultTextTemplate,
        'ab',
        { clientCreateKey: 'retry-key' },
      );
    });

    expect(created).toEqual(expect.objectContaining({
      block: expect.objectContaining({ id: 'block-1' }),
      clientCreateKey: 'retry-key',
      placementPersisted: true,
      reused: true,
    }));
    expect(mocks.post).toHaveBeenCalledWith(
      `/notes/${note.id}/blocks`,
      expect.objectContaining({ client_create_key: 'retry-key', plain_text: 'ab' }),
    );
  });

  it('drives response-loss replay through adapter and controller to a latest PUT', async () => {
    let durableText = '';
    const createPayloads: Array<Record<string, unknown>> = [];
    mocks.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/notes/${note.id}/blocks`) throw new Error(`Unexpected POST ${url}`);
      createPayloads.push(payload);
      if (createPayloads.length === 1) {
        durableText = String(payload.plain_text);
        throw new Error('response lost after commit');
      }
      return {
        data: serverBlock('a', true, String(payload.client_create_key)),
      };
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, any>) => {
      if (url.includes('/block-placements/')) {
        return {
          data: {
            placement_id: 'placement-1',
            block_id: 'block-1',
            layout: payload.layout,
          },
        };
      }
      if (url === '/note-blocks/block-1') {
        durableText = payload.plain_text;
        return { data: serverBlock(durableText, true) };
      }
      throw new Error(`Unexpected PUT ${url}`);
    });

    const subject = renderHook(() => {
      const adapter = useNoteCanvasDataAdapter(stableAdapterOptions);
      const controller = useDraftBlockController({
        createBlock: adapter.createDraftBlock,
        defaultDraftLayout,
        defaultTextTemplate: adapter.defaultTextTemplate,
        discardDraftBlock: adapter.discardDraftBlock,
        finalizeDraftBlock: adapter.finalizeDraftBlock,
        note: adapter.note,
        onDraftFocusReceipt: stableControllerCallbacks.onDraftFocusReceipt,
        saveBlock: adapter.saveBlock,
        saveDraftBlockPlacement: adapter.saveDraftBlockPlacement,
        setActiveBlockId: stableControllerCallbacks.setActiveBlockId,
        setFocusBlockId: stableControllerCallbacks.setFocusBlockId,
        setInteractionState: stableControllerCallbacks.setInteractionState,
        setSelectedBlockId: stableControllerCallbacks.setSelectedBlockId,
      });
      return { adapter, controller };
    }, { wrapper });
    await waitFor(() => expect(subject.result.current.adapter.note?.id).toBe(note.id));

    act(() => {
      subject.result.current.controller.activateDraft();
      subject.result.current.controller.setDraftText('a');
    });
    await act(async () => {
      await subject.result.current.controller.persistDraft('a');
    });
    expect(durableText).toBe('a');

    act(() => subject.result.current.controller.setDraftText('ab'));
    await act(async () => {
      await subject.result.current.controller.persistDraft('ab');
    });

    expect(createPayloads).toHaveLength(2);
    expect(createPayloads.map((payload) => payload.plain_text)).toEqual(['a', 'ab']);
    expect(createPayloads[1]?.client_create_key).toBe(createPayloads[0]?.client_create_key);
    const latestPuts = mocks.put.mock.calls.filter(([url]) => url === '/note-blocks/block-1');
    expect(latestPuts).toHaveLength(1);
    expect(latestPuts[0]?.[1]).toEqual(expect.objectContaining({ plain_text: 'ab' }));
    expect(durableText).toBe('ab');
  });

  it('notifies once and performs no recovery write for an ownerless v1 receipt', async () => {
    const rawV1 = {
      version: 1,
      noteId: 'old-note',
      clientCreateKey: 'legacy-ownerless-key',
      text: 'queued text',
      layout: { x: 0, y: 48, width: 540, height: 80 },
      template: recoveryTemplate,
      queuedAt: '2026-08-20T00:00:00.000Z',
    };
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, JSON.stringify([rawV1]));
    canvasPersistenceResponse = {
      pageFrameCollection: {
        pageFrames: [],
        pageStacks: [],
        primaryFrameId: null,
      },
    };

    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => {
      expect(subject.result.current.pageFrameCollection).not.toBeNull();
      expect(mocks.addToast).toHaveBeenCalledTimes(1);
    });

    expect(mocks.addToast).toHaveBeenCalledWith(
      'error',
      'A previous-note draft needs attention and remains queued',
    );
    expect(mocks.addToast).toHaveBeenCalledTimes(1);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1))
      .toBe(JSON.stringify([rawV1]));
  });

  it.each([
    [1, DRAFT_RECOVERY_STORAGE_KEY_V1],
    [2, DRAFT_RECOVERY_STORAGE_KEY_V2],
  ] as const)(
    'performs no POST or PUT for a contradictory crossing raw v%s tuple',
    async (version, storageKey) => {
      const raw = contradictoryCrossingReceipt(version, `adapter-contradictory-v${version}`);
      const rawBytes = JSON.stringify([raw]);
      sessionStorage.setItem(storageKey, rawBytes);

      renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
      await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith(
        'error',
        'A previous-note draft needs attention and remains queued',
      ));

      expect(mocks.post).not.toHaveBeenCalled();
      expect(mocks.put).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBe(rawBytes);
    },
  );

  it.each([
    ['inside claimed over outside geometry', 1, 'inside-as-outside'],
    ['inside claimed over outside geometry', 2, 'inside-as-outside'],
    ['crossing claimed over inside geometry', 1, 'crossing-as-inside'],
    ['crossing claimed over inside geometry', 2, 'crossing-as-inside'],
  ] as const)(
    'performs no POST or PUT for %s in raw v%s',
    async (_label, version, contradiction) => {
      const storageKey = version === 1
        ? DRAFT_RECOVERY_STORAGE_KEY_V1
        : DRAFT_RECOVERY_STORAGE_KEY_V2;
      const raw = geometryContradictionReceipt(
        version,
        `adapter-geometry-${contradiction}-v${version}`,
        contradiction,
      );
      const rawBytes = JSON.stringify([raw]);
      sessionStorage.setItem(storageKey, rawBytes);
      canvasPersistenceResponse = {
        pageFrameCollection: {
          pageFrames: [],
          pageStacks: [],
          primaryFrameId: null,
        },
      };

      const subject = renderHook(
        () => useNoteCanvasDataAdapter(stableAdapterOptions),
        { wrapper },
      );
      await waitFor(() => {
        expect(subject.result.current.pageFrameCollection).not.toBeNull();
        expect(mocks.addToast).toHaveBeenCalledTimes(1);
      });

      expect(mocks.addToast).toHaveBeenCalledWith(
        'error',
        'A previous-note draft needs attention and remains queued',
      );
      expect(mocks.addToast).toHaveBeenCalledTimes(1);
      expect(mocks.post).not.toHaveBeenCalled();
      expect(mocks.put).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBe(rawBytes);
    },
  );
});
