import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import type { SkinSelection } from '@shared/types';
import type { Note } from '../runtimeDataTypes';
import { useNoteSkin } from './useNoteSkin';
import { useSkinSuiteStore } from '@/hooks/useSkinSuites';
import { usePaletteStore } from '@/hooks/usePaletteColors';
import { SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from '@/styles/skinPresets';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), save: vi.fn() }));
vi.mock('@/services/api', () => ({
  default: { get: (url: string) => (url === '/palette-colors' || url === '/skin-suites') ? Promise.resolve({ data: [] }) : mocks.get(url), put: mocks.put }, getToken: () => null, setToken: vi.fn(),
}));

function note(courseId = 'project-a', skin?: SkinSelection | null): Note {
  return { id: `paper-${courseId}`, course_id: courseId, title: 'Synthetic skin paper',
    description: null, status: 'active', metadata: skin === undefined ? {} : { skin } };
}

function setGlobal(skin: SkinSelection | null) {
  useAuthStore.setState({ user: {
    id: 'synthetic-user', email: 'b1a@example.invalid', name: 'Skin fixture', settings: { skin },
    onboarding_completed: true, created_at: '2026-09-11', updated_at: '2026-09-11',
  } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}

function summary(skin: SkinSelection | null) { return { data: { course: { skin } } }; }

describe('B1a note skin mounting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockReset();
    mocks.put.mockReset();
    mocks.save.mockResolvedValue(undefined);
    useSkinSuiteStore.setState({ owner: undefined, loaded: false, loading: false, suites: [], values: {}, detached: {}, error: null });
    usePaletteStore.setState({ owner: undefined, loaded: false, loading: false, colors: [], values: {}, detached: {}, error: null });
    setGlobal({ preset: 'quiet-ink', overrides: { accent: '#334455' } });
  });
  afterEach(() => useAuthStore.setState({ user: null }));

  it.each(['global', 'project', 'local'])('freezes %s suite palette deviations at deletion despite later pool edits', async (mount) => {
    const id = '14000000-0000-4000-8000-000000000023';
    const colorId = '14000000-0000-4000-8000-000000000024';
    const selection: SkinSelection = { preset: `suite:${id}`, overrides: { ink: `palette:${colorId}` } };
    const snapshot = { tokens: SKIN_PRESETS['warm-paper'], components: SKIN_PRESET_COMPONENTS['warm-paper'] };
    setGlobal(mount === 'global' ? selection : null);
    mocks.get.mockResolvedValue(summary(mount === 'project' ? selection : null));
    const { result } = renderHook(() => useNoteSkin(note('project-a', mount === 'local' ? selection : null), mocks.save));
    await act(async () => {});
    act(() => {
      useSkinSuiteStore.setState({ values: { [id]: snapshot } });
      usePaletteStore.setState({ values: { [colorId]: '#aBcDeF80' } });
    });
    expect(result.current.tokens.ink).toBe('#aBcDeF80');
    act(() => {
      useSkinSuiteStore.setState({ values: { [id]: snapshot }, detached: { [id]: { ...snapshot, palette: { [colorId]: '#aBcDeF80' } } } });
      usePaletteStore.setState({ values: { [colorId]: '#000000' } });
    });
    expect(result.current.tokens.ink).toBe('#aBcDeF80');
    expect(result.current.preset).toBe('default');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('previews the actual paper style without persisting or replacing the committed selection, and clears on route change', async () => {
    mocks.get.mockResolvedValue(summary(null));
    const { result, rerender } = renderHook(({ current }) => useNoteSkin(current, mocks.save), { initialProps: { current: note() } });
    await act(async () => {});
    const before = result.current.style;
    act(() => result.current.preview({ preset: 'warm-paper' }));
    expect(result.current.style['--sk-paper' as keyof typeof before]).toBe('#F7F3EA');
    expect(result.current.tokens.paper).toBe('#17181C');
    expect(result.current.selection).toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    act(() => result.current.preview(null));
    expect(result.current.style).toEqual(before);
    act(() => result.current.preview({ preset: 'warm-paper' }));
    rerender({ current: note('project-b') });
    expect(result.current.style).toEqual(before);
    expect(result.current.renderedResolved).toBe(result.current.committedResolved);
    await act(async () => { await result.current.save({ preset: 'workbench' }); });
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ preset: 'workbench' });
  });

  it('reads the existing project summary once and uses it above global settings', async () => {
    mocks.get.mockResolvedValue(summary({ preset: 'warm-paper', overrides: { ink: '#123456' } }));
    const { result, rerender } = renderHook(({ current }) => useNoteSkin(current, mocks.save), { initialProps: { current: note() } });
    await waitFor(() => expect(result.current.preset).toBe('warm-paper'));
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith('/courses/project-a/summary');
    expect(result.current.tokens.ink).toBe('#123456');
    expect(result.current.tokens.accent).toBe('#33604F');
    expect(result.current.error).toBeNull();
    rerender({ current: { ...note(), title: 'A different title' } });
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });

  it('route changes discard both the old project palette and its late response', async () => {
    const oldRead = deferred<ReturnType<typeof summary>>();
    const newRead = deferred<ReturnType<typeof summary>>();
    mocks.get.mockImplementation((url: string) => url === '/courses/project-a/summary' ? oldRead.promise : newRead.promise);
    const { result, rerender } = renderHook(({ current }) => useNoteSkin(current, mocks.save), { initialProps: { current: note() } });
    rerender({ current: note('project-b') });
    expect(result.current.preset).toBe('quiet-ink');
    await act(async () => { newRead.resolve(summary({ preset: 'workbench' })); });
    expect(result.current.preset).toBe('workbench');
    await act(async () => { oldRead.resolve(summary({ preset: 'warm-paper' })); });
    expect(result.current.preset).toBe('workbench');
    expect(mocks.get.mock.calls.map(([url]) => url)).toEqual(['/courses/project-a/summary', '/courses/project-b/summary']);
  });

  it('an already loaded project is not applied to the next route while its summary is pending', async () => {
    const nextRead = deferred<ReturnType<typeof summary>>();
    mocks.get.mockResolvedValueOnce(summary({ preset: 'warm-paper' })).mockReturnValueOnce(nextRead.promise);
    const { result, rerender } = renderHook(({ current }) => useNoteSkin(current, mocks.save), { initialProps: { current: note() } });
    await waitFor(() => expect(result.current.preset).toBe('warm-paper'));
    rerender({ current: note('project-b') });
    expect(result.current.preset).toBe('quiet-ink');
    await act(async () => { nextRead.resolve(summary(null)); });
    expect(result.current.preset).toBe('quiet-ink');
  });

  it('a summary failure leaves global colors usable and retry loads the project skin', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Synthetic summary unavailable'))
      .mockResolvedValueOnce(summary({ preset: 'warm-paper' }));
    const { result } = renderHook(() => useNoteSkin(note(), mocks.save));
    await waitFor(() => expect(result.current.error).toBe('项目外观未加载，暂用全局外观。'));
    expect(result.current.preset).toBe('quiet-ink');
    expect(result.current.tokens.accent).toBe('#334455');
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.preset).toBe('warm-paper'));
    expect(result.current.error).toBeNull();
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });

  it('global settings changes recompute inheriting paper immediately without refetching its project', async () => {
    mocks.get.mockResolvedValue(summary(null));
    const { result } = renderHook(() => useNoteSkin(note(), mocks.save));
    await act(async () => {});
    expect(result.current.preset).toBe('quiet-ink');
    act(() => setGlobal({ preset: 'warm-paper', overrides: { paper: '#EFEAD0' } }));
    expect(result.current.preset).toBe('warm-paper');
    expect(result.current.tokens.paper).toBe('#EFEAD0');
    expect(mocks.get).toHaveBeenCalledTimes(1);
    act(() => setGlobal(null));
    expect(result.current.preset).toBe('default');
  });

  it('note metadata overrides project and global; clearing the paper restores project and delegates saves', async () => {
    mocks.get.mockResolvedValue(summary({ preset: 'workbench' }));
    const paper = { preset: 'warm-paper' as const, overrides: { ink: '#332211' } };
    const { result, rerender } = renderHook(({ current }) => useNoteSkin(current, mocks.save), { initialProps: { current: note('project-a', paper) } });
    await act(async () => {});
    expect(result.current.selection).toEqual(paper);
    expect(result.current.tokens.ink).toBe('#332211');
    act(() => setGlobal({ preset: 'default' }));
    expect(result.current.preset).toBe('warm-paper');
    await act(async () => { await result.current.save(null); });
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith(null);
    rerender({ current: note('project-a', null) });
    expect(result.current.selection).toBeNull();
    expect(result.current.preset).toBe('workbench');
    expect(result.current.tokens.ink).toBe('#DEE3EA');
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('an absent note has no summary request and uses only global settings', () => {
    const { result } = renderHook(() => useNoteSkin(null, mocks.save));
    expect(result.current.preset).toBe('quiet-ink');
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
