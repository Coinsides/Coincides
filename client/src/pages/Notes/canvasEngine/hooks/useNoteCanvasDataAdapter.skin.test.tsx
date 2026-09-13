import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkinSelection } from '@shared/types';
import type { Note } from '../runtimeDataTypes';
import { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, writeTypographyProfileMetadata } from '../typographyProfileService';
import { usePaletteColors, usePaletteStore } from '@/hooks/usePaletteColors';
import { useSkinSuites, useSkinSuiteStore } from '@/hooks/useSkinSuites';
import { SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from '@/styles/skinPresets';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn(), addToast: vi.fn() }));
vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(), default: { get: mocks.get, put: mocks.put, post: mocks.post, delete: mocks.delete } }));
vi.mock('@/stores/uiStore', () => ({ useUIStore: (select: (state: { addToast: typeof mocks.addToast }) => unknown) => select({ addToast: mocks.addToast }) }));

const callbacks = { onNoteLoaded: vi.fn(), clearLayoutDraftForBlock: vi.fn(), setLayoutDraftForBlock: vi.fn() };
const warm: SkinSelection = { preset: 'warm-paper' };
const workbench: SkinSelection = { preset: 'workbench', overrides: { accent: '#EEAA44' } };
let storedNotes: Record<string, Note>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}
function wrapper({ children }: { children: ReactNode }) { return <MemoryRouter>{children}</MemoryRouter>; }
function renderAdapter() {
  return renderHook(({ noteId }) => useNoteCanvasDataAdapter({ noteId, ...callbacks }), {
    initialProps: { noteId: 'paper-a' }, wrapper,
  });
}
async function loaded(subject: ReturnType<typeof renderAdapter>, id = 'paper-a') {
  await waitFor(() => {
    expect(subject.result.current.loading).toBe(false);
    expect(subject.result.current.loadError).toBeNull();
    expect(subject.result.current.note?.id).toBe(id);
  });
}

describe('B1a adapter paper skin write intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.put.mockReset();
    usePaletteStore.setState({ owner: undefined, colors: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
    useSkinSuiteStore.setState({ owner: undefined, suites: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
    sessionStorage.clear();
    storedNotes = Object.fromEntries(['paper-a', 'paper-b'].map((id) => [id, {
      id, course_id: '', title: id, description: null, status: 'active',
      metadata: { document_property: id, skin: { preset: 'default' } },
    }]));
    mocks.get.mockImplementation(async (url: string) => {
      if (url === '/palette-colors' || url === '/skin-suites') return { data: [] };
      if (url === '/canvas-objects/coordinate-contract') return { data: { coordinate_contract: 'v1' } };
      const noteId = /^\/notes\/([^/]+)$/.exec(url)?.[1];
      if (noteId && storedNotes[noteId]) return { data: structuredClone(storedNotes[noteId]) };
      if (/^\/notes\/[^/]+\/blocks$/.test(url)) return { data: [] };
      if (url.startsWith('/canvas-objects/by-note/')) return { data: {} };
      if (url.startsWith('/annotation-truths/by-note/')) return { data: [] };
      if (url.startsWith('/boards/text-ranges/by-note/')) return { data: { text_ranges: [] } };
      if (['/content-groups', '/group-folders', '/purposes', '/templates'].includes(url)) return { data: [] };
      throw new Error(`Unexpected skin fixture GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: { skin: SkinSelection | null }) => {
      const id = url.split('/').pop()!;
      storedNotes[id] = { ...storedNotes[id], metadata: { ...storedNotes[id].metadata, skin: payload.skin } };
      return { data: structuredClone(storedNotes[id]) };
    });
  });

  it('publishes successive choices immediately, sends them serially and drains the entire queued intent', async () => {
    const first = deferred<{ data: Note }>();
    const second = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const subject = renderAdapter(); await loaded(subject);
    let firstSave!: Promise<void>; let secondSave!: Promise<void>;
    act(() => {
      firstSave = subject.result.current.saveSkin(warm);
      secondSave = subject.result.current.saveSkin(workbench);
    });
    expect(subject.result.current.note?.metadata?.skin).toEqual(workbench);
    expect(subject.result.current.note?.metadata?.document_property).toBe('paper-a');
    let drained = false;
    const idle = subject.result.current.whenIdle().then(() => { drained = true; });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put).toHaveBeenNthCalledWith(1, '/notes/paper-a', { skin: warm });
    expect(drained).toBe(false);
    await act(async () => { first.resolve({ data: storedNotes['paper-a'] }); await firstSave; });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2));
    expect(mocks.put).toHaveBeenNthCalledWith(2, '/notes/paper-a', { skin: workbench });
    expect(drained).toBe(false);
    expect(subject.result.current.note?.metadata?.skin).toEqual(workbench);
    await act(async () => { second.resolve({ data: storedNotes['paper-a'] }); await secondSave; await idle; });
    expect(drained).toBe(true);
  });

  it('queued choices keep their original note ID after a route switch and late writes leave the new paper alone', async () => {
    const first = deferred<{ data: Note }>();
    const second = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const subject = renderAdapter(); await loaded(subject);
    let firstSave!: Promise<void>; let secondSave!: Promise<void>;
    const oldWhenIdle = subject.result.current.whenIdle;
    act(() => {
      firstSave = subject.result.current.saveSkin(warm);
      secondSave = subject.result.current.saveSkin(workbench);
    });
    let oldDrained = false;
    const oldIdle = oldWhenIdle().then(() => { oldDrained = true; });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    subject.rerender({ noteId: 'paper-b' }); await loaded(subject, 'paper-b');
    expect(subject.result.current.note?.metadata?.skin).toEqual({ preset: 'default' });
    await act(async () => { first.resolve({ data: storedNotes['paper-a'] }); await firstSave; });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2));
    expect(mocks.put.mock.calls).toEqual([
      ['/notes/paper-a', { skin: warm }], ['/notes/paper-a', { skin: workbench }],
    ]);
    expect(oldDrained).toBe(false);
    await act(async () => { second.resolve({ data: storedNotes['paper-a'] }); await secondSave; await oldIdle; });
    expect(oldDrained).toBe(true);
    expect(subject.result.current.note?.metadata).toEqual(storedNotes['paper-b'].metadata);
  });

  it('keeps a pending suite-detach save bound to its original paper after navigation', async () => {
    const id = '14000000-0000-4000-8000-000000000029';
    const skin: SkinSelection = { preset: `suite:${id}`, overrides: { ink: '#112233' } };
    const snapshot = { id, tokens: { ...SKIN_PRESETS['warm-paper'], paper: '#aBcDeF80' }, components: SKIN_PRESET_COMPONENTS['warm-paper'], materialPreset: 'warm-paper' as const, palette: {} };
    const deletionResponse = deferred<{ data: typeof snapshot }>();
    mocks.delete.mockReturnValueOnce(deletionResponse.promise);
    const suites = renderHook(() => useSkinSuites());
    await waitFor(() => expect(suites.result.current.loaded).toBe(true));
    const subject = renderAdapter(); await loaded(subject);
    const oldWhenIdle = subject.result.current.whenIdle;
    let deletion!: Promise<unknown>; let saving!: Promise<void>;
    act(() => {
      deletion = suites.result.current.deleteSuite(id);
      saving = subject.result.current.saveSkin(skin);
    });
    let drained = false;
    const idle = oldWhenIdle().then(() => { drained = true; });
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith(`/skin-suites/${id}`));
    expect(mocks.put).not.toHaveBeenCalled();
    expect(drained).toBe(false);
    subject.rerender({ noteId: 'paper-b' }); await loaded(subject, 'paper-b');
    await act(async () => {
      deletionResponse.resolve({ data: snapshot });
      await Promise.all([deletion, saving, idle]);
    });
    expect(mocks.put).toHaveBeenCalledExactlyOnceWith('/notes/paper-a', {
      skin: { preset: 'default', materialPreset: 'warm-paper', overrides: { ...snapshot.tokens, ink: '#112233' }, components: snapshot.components },
    });
    expect(drained).toBe(true);
    expect(subject.result.current.note?.id).toBe('paper-b');
    expect(subject.result.current.note?.metadata?.skin).toEqual({ preset: 'default' });
  });

  it('binds a skin intent before waiting for palette deletion so navigation cannot apply it to the next note', async () => {
    const id = '14000000-0000-4000-8000-000000000019';
    const skin: SkinSelection = { preset: 'warm-paper', overrides: { paper: `palette:${id}`, ink: '#112233' } };
    const deletionResponse = deferred<{ data: { id: string; value: string } }>();
    mocks.delete.mockReturnValueOnce(deletionResponse.promise);
    const palette = renderHook(() => usePaletteColors());
    await waitFor(() => expect(palette.result.current.loaded).toBe(true));
    const subject = renderAdapter(); await loaded(subject);
    const oldWhenIdle = subject.result.current.whenIdle;
    let deletion!: Promise<unknown>; let saving!: Promise<void>;
    act(() => {
      deletion = palette.result.current.deleteColor(id);
      saving = subject.result.current.saveSkin(skin);
    });
    let drained = false;
    const idle = oldWhenIdle().then(() => { drained = true; });
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith(`/palette-colors/${id}`));
    expect(mocks.put).not.toHaveBeenCalled();
    expect(drained).toBe(false);
    subject.rerender({ noteId: 'paper-b' }); await loaded(subject, 'paper-b');
    await act(async () => {
      deletionResponse.resolve({ data: { id, value: '#aBcDeF80' } });
      await Promise.all([deletion, saving, idle]);
    });
    expect(mocks.put).toHaveBeenCalledExactlyOnceWith('/notes/paper-a', {
      skin: { preset: 'warm-paper', overrides: { paper: '#aBcDeF80', ink: '#112233' } },
    });
    expect(drained).toBe(true);
    expect(subject.result.current.note?.id).toBe('paper-b');
    expect(subject.result.current.note?.metadata?.skin).toEqual({ preset: 'default' });
    expect(storedNotes['paper-a'].metadata?.skin).toEqual({ preset: 'warm-paper', overrides: { paper: '#aBcDeF80', ink: '#112233' } });
  });

  it('failed persistence keeps the latest local skin and the route drain rejects until a successful retry', async () => {
    const failed = deferred<{ data: Note }>();
    const retried = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(failed.promise).mockReturnValueOnce(retried.promise);
    const subject = renderAdapter(); await loaded(subject);
    let save!: Promise<void>;
    act(() => { save = subject.result.current.saveSkin(workbench); void save.catch(() => {}); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    const failure = new Error('Synthetic skin save interrupted');
    await act(async () => { failed.reject(failure); await expect(save).rejects.toBe(failure); });
    expect(subject.result.current.note?.metadata?.skin).toEqual(workbench);
    await expect(subject.result.current.whenIdle()).rejects.toBe(failure);
    let retry!: Promise<void>;
    act(() => { retry = subject.result.current.saveSkin(workbench); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2));
    expect(mocks.put).toHaveBeenLastCalledWith('/notes/paper-a', { skin: workbench });
    await act(async () => { retried.resolve({ data: storedNotes['paper-a'] }); await retry; });
    await expect(subject.result.current.whenIdle()).resolves.toBeUndefined();
  });

  it('a source paper can save or clear its presentation without touching content properties', async () => {
    storedNotes['paper-a'] = { ...storedNotes['paper-a'], note_class: 'source_projection', source_kind: 'source_projection' };
    const subject = renderAdapter(); await loaded(subject);
    expect(subject.result.current.sourceProjectionPolicy.contentReadOnly).toBe(true);
    await act(async () => { await subject.result.current.saveSkin(warm); });
    expect(subject.result.current.note?.metadata?.skin).toEqual(warm);
    await act(async () => { await subject.result.current.saveSkin(null); });
    expect(mocks.put.mock.calls).toEqual([
      ['/notes/paper-a', { skin: warm }], ['/notes/paper-a', { skin: null }],
    ]);
    expect(subject.result.current.note?.metadata?.document_property).toBe('paper-a');
    expect(subject.result.current.note?.metadata?.skin).toBeNull();
    expect(mocks.addToast).not.toHaveBeenCalled();
  });

  it.each(['success', 'failure'] as const)('late typography %s preserves a newer saved skin', async (outcome) => {
    const typographyResponse = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(typographyResponse.promise);
    const subject = renderAdapter(); await loaded(subject);
    const profile = { ...DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, fontSizePx: 20 };
    const staleNote = {
      ...storedNotes['paper-a'],
      metadata: writeTypographyProfileMetadata(storedNotes['paper-a'].metadata, profile),
    };
    let typographySave!: Promise<void>;
    act(() => { typographySave = subject.result.current.saveDocumentTypographyProfile(profile); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    await act(async () => { await subject.result.current.saveSkin(warm); });
    expect(subject.result.current.note?.metadata?.skin).toEqual(warm);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        if (outcome === 'success') typographyResponse.resolve({ data: staleNote });
        else typographyResponse.reject(new Error('Synthetic delayed typography failure'));
        await typographySave;
      });
      expect(subject.result.current.note?.metadata?.skin).toEqual(warm);
      expect(storedNotes['paper-a'].metadata?.skin).toEqual(warm);
      expect(subject.result.current.documentTypographyProfile.fontSizePx).toBe(
        outcome === 'success' ? 20 : DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontSizePx,
      );
    } finally { consoleError.mockRestore(); }
  });

  it.each(['reading', 'annotation'] as const)('late %s metadata response cannot replace a newer skin', async (kind) => {
    const metadataResponse = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(metadataResponse.promise);
    const subject = renderAdapter(); await loaded(subject);
    const staleNote = structuredClone(storedNotes['paper-a']);
    let metadataSave!: Promise<void>;
    act(() => {
      metadataSave = kind === 'reading'
        ? subject.result.current.saveReadingInterpretations([])
        : subject.result.current.saveAnnotationProposals([]);
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    await act(async () => { await subject.result.current.saveSkin(workbench); });
    await act(async () => { metadataResponse.resolve({ data: staleNote }); await metadataSave; });
    expect(subject.result.current.note?.metadata?.skin).toEqual(workbench);
  });

  it.each(['success', 'failure'] as const)('late typography %s after switching notes leaves the new paper alone', async (outcome) => {
    const typographyResponse = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(typographyResponse.promise);
    const subject = renderAdapter(); await loaded(subject);
    let typographySave!: Promise<void>;
    act(() => { typographySave = subject.result.current.saveDocumentTypographyProfile({ ...DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, fontSizePx: 20 }); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    subject.rerender({ noteId: 'paper-b' }); await loaded(subject, 'paper-b');
    await act(async () => { await subject.result.current.saveSkin(workbench); });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        if (outcome === 'success') typographyResponse.resolve({ data: storedNotes['paper-a'] });
        else typographyResponse.reject(new Error('Synthetic old-route typography failure'));
        await typographySave;
      });
      expect(subject.result.current.note?.id).toBe('paper-b');
      expect(subject.result.current.note?.metadata?.skin).toEqual(workbench);
      expect(mocks.addToast).not.toHaveBeenCalled();
    } finally { consoleError.mockRestore(); }
  });
});
