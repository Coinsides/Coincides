import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkinSelection, SkinSuite } from '@shared/types';
import { useAuthStore } from '@/stores/authStore';
import { SKIN_PRESETS, SKIN_PRESET_COMPONENTS, resolveSkin } from '@/styles/skinPresets';
import { usePaletteStore } from './usePaletteColors';
import { detachSuiteSelection, normalizeSkinSelection, saveSkinWithSuites, useSkinSuiteStore, useSkinSuites } from './useSkinSuites';
import { buildPaperMaterialStyles, buildPaperSkinStyles } from '@/pages/Notes/canvasEngine/paperSkinStyles';
import { buildSkinComponentStyles } from '@/styles/skinComponentStyles';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: mocks, getToken: () => null, setToken: vi.fn() }));
const id = '14000000-0000-4000-8000-000000000021';
const suite: SkinSuite = { id, user_id: 'suite-user', name: '我的纸', tokens: { ...SKIN_PRESETS['warm-paper'] },
  components: { ...SKIN_PRESET_COMPONENTS['warm-paper'] }, materialPreset: 'warm-paper', created_at: '2026-09-13' };
const selection: SkinSelection = { preset: `suite:${id}`, overrides: { ink: '#aBcDef80' }, components: { headerRule: 'hidden' } };

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: null });
  useSkinSuiteStore.setState({ owner: undefined, suites: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
  usePaletteStore.setState({ detached: {}, values: {} });
  mocks.get.mockResolvedValue({ data: [suite] });
});

describe('skin suite shared lifecycle', () => {
  it('loads once, publishes newly saved cards and updates all bindings while retaining individual deviations', async () => {
    const a = renderHook(() => useSkinSuites());
    const b = renderHook(() => useSkinSuites());
    await waitFor(() => expect(b.result.current.suites).toEqual([suite]));
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith('/skin-suites');
    const created = { ...suite, id: '14000000-0000-4000-8000-000000000022', name: '新套装' };
    mocks.post.mockResolvedValue({ data: created });
    await act(async () => { await a.result.current.createSuite({ name: created.name, tokens: created.tokens, components: created.components }); });
    expect(b.result.current.suites).toEqual([suite, created]);
    const updated = { ...suite, tokens: { ...suite.tokens, paper: '#123456', ink: '#445566' }, components: { ...suite.components, titleFont: 'sans' as const } };
    mocks.patch.mockResolvedValue({ data: updated });
    await act(async () => { await a.result.current.updateSuite(id, { tokens: updated.tokens, components: updated.components }); });
    const resolved = resolveSkin(selection, null, null, {}, b.result.current.values);
    expect(resolved.tokens.paper).toBe('#123456');
    expect(resolved.tokens.ink).toBe('#aBcDef80');
    expect(resolved.components).toMatchObject({ titleFont: 'sans', headerRule: 'hidden' });
  });

  it('retains the latest deleted snapshot for mounted consumers and normalizes old draft writes', async () => {
    const { result } = renderHook(() => useSkinSuites());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const snapshot = { tokens: { ...suite.tokens, paper: '#AbCdEf80' }, components: { ...suite.components, handleStyle: 'rivet' as const }, materialPreset: 'warm-paper' as const };
    mocks.delete.mockResolvedValue({ data: { id, ...snapshot, palette: {} } });
    await act(async () => { await result.current.deleteSuite(id); });
    expect(result.current.suites).toEqual([]);
    const beforeDetach = resolveSkin(selection, null, null, {}, result.current.values);
    const detached = detachSuiteSelection(selection, result.current.detached)!;
    const afterDetach = resolveSkin(detached);
    expect(afterDetach.tokens).toEqual(beforeDetach.tokens);
    expect(afterDetach.components).toEqual(beforeDetach.components);
    expect(afterDetach.materialPreset).toBe(beforeDetach.materialPreset);
    const appearance = (skin: ReturnType<typeof resolveSkin>) => ({ ...buildPaperSkinStyles(skin.tokens), ...buildPaperMaterialStyles(skin.tokens, skin.materialPreset ?? skin.preset), ...buildSkinComponentStyles(skin.components) });
    expect(appearance(afterDetach)).toEqual(appearance(beforeDetach));
    expect(detached.preset).toBe('default');
    expect(detached.overrides?.paper).toBe('#AbCdEf80');
    const save = vi.fn().mockResolvedValue(undefined);
    await saveSkinWithSuites(selection, save);
    expect(save).toHaveBeenCalledExactlyOnceWith(detached);
  });

  it('跨页刷新消失套装仍保留完整材质', async () => {
    const { result } = renderHook(() => useSkinSuites());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    mocks.get.mockResolvedValue({ data: [] });
    await act(async () => { await result.current.refresh(); });
    expect(normalizeSkinSelection(selection)?.materialPreset).toBe('warm-paper');
    const own = { ...selection, materialPreset: 'workbench' as const };
    expect(normalizeSkinSelection(own)?.materialPreset).toBe('workbench');
  });

  it('waits for an in-flight detach, freezes palette deviations, and keeps a failed delete unchanged', async () => {
    const { result } = renderHook(() => useSkinSuites());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let complete!: (value: unknown) => void;
    mocks.delete.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const colorId = '14000000-0000-4000-8000-000000000031';
    usePaletteStore.setState({ values: { [colorId]: '#aBcDeF80' } });
    const draft: SkinSelection = { ...selection, overrides: { ink: `palette:${colorId}` } };
    const save = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      const deletion = result.current.deleteSuite(id);
      const saving = saveSkinWithSuites(draft, save);
      expect(save).not.toHaveBeenCalled();
      await Promise.resolve(); await Promise.resolve();
      complete({ data: { id, tokens: suite.tokens, components: suite.components, materialPreset: suite.materialPreset, palette: { [colorId]: '#aBcDeF80' } } });
      await Promise.all([deletion, saving]);
    });
    expect(save.mock.calls[0][0].overrides.ink).toBe('#aBcDeF80');
    expect(save.mock.calls[0][0].materialPreset).toBe('warm-paper');
    expect(JSON.stringify(save.mock.calls[0][0])).not.toContain('palette:');
    usePaletteStore.setState({ values: { [colorId]: '#000000' }, detached: { [colorId]: '#222222' } });
    expect(normalizeSkinSelection(draft)?.overrides?.ink).toBe('#aBcDeF80');
    mocks.delete.mockRejectedValue(new Error('Temporary failure'));
    const before = result.current.values;
    await act(async () => { await expect(result.current.deleteSuite(id)).rejects.toThrow('Temporary failure'); });
    expect(result.current.values).toBe(before);
  });

  it('preserves pool colors deleted before the suite while freezing colors deleted after it', () => {
    const beforeId = '14000000-0000-4000-8000-000000000041';
    const afterId = '14000000-0000-4000-8000-000000000042';
    usePaletteStore.setState({ values: {}, detached: { [beforeId]: '#aAbBcC80', [afterId]: '#111111' } });
    useSkinSuiteStore.setState({ detached: { [id]: { tokens: suite.tokens, components: suite.components, palette: { [afterId]: '#123456' } } } });
    expect(normalizeSkinSelection({ ...selection, overrides: { paper: `palette:${beforeId}`, ink: `palette:${afterId}` } })?.overrides)
      .toMatchObject({ paper: '#aAbBcC80', ink: '#123456' });
  });

  it('waits for already dispatched skin writes before deleting, then releases later normalized skin writes', async () => {
    const { result } = renderHook(() => useSkinSuites());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let completeFirst!: () => void;
    const firstSave = vi.fn(() => new Promise<void>((resolve) => { completeFirst = resolve; }));
    const laterSave = vi.fn().mockResolvedValue(undefined);
    mocks.delete.mockResolvedValue({ data: { id, tokens: suite.tokens, components: suite.components, materialPreset: suite.materialPreset, palette: {} } });
    await act(async () => {
      const first = saveSkinWithSuites(selection, firstSave);
      const deletion = result.current.deleteSuite(id);
      const later = saveSkinWithSuites(selection, laterSave);
      await Promise.resolve(); await Promise.resolve();
      expect(firstSave).toHaveBeenCalledOnce();
      expect(mocks.delete).not.toHaveBeenCalled();
      expect(laterSave).not.toHaveBeenCalled();
      completeFirst();
      await Promise.all([first, deletion, later]);
    });
    expect(mocks.delete).toHaveBeenCalledExactlyOnceWith(`/skin-suites/${id}`);
    expect(laterSave.mock.calls[0][0].preset).toBe('default');
    expect(laterSave.mock.calls[0][0].overrides.ink).toBe('#aBcDef80');
    expect(laterSave.mock.calls[0][0].materialPreset).toBe('warm-paper');
  });

  it('serializes refreshes after edits and rejects obsolete account responses', async () => {
    const { result } = renderHook(() => useSkinSuites());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let complete!: (value: unknown) => void;
    mocks.patch.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const updated = { ...suite, name: '改名' };
    mocks.get.mockResolvedValue({ data: [updated] });
    await act(async () => {
      const edit = result.current.updateSuite(id, { name: updated.name });
      const refresh = result.current.refresh();
      await Promise.resolve(); await Promise.resolve();
      expect(mocks.get).toHaveBeenCalledTimes(1);
      complete({ data: updated });
      await Promise.all([edit, refresh]);
    });
    expect(result.current.suites[0].name).toBe('改名');
    mocks.get.mockResolvedValue({ data: [] });
    mocks.patch.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    let edit!: Promise<SkinSuite>;
    await act(async () => { edit = result.current.updateSuite(id, { name: '旧账户' }); });
    act(() => useAuthStore.setState({ user: { id: 'next-user', settings: {} } as never }));
    await act(async () => { complete({ data: { ...suite, name: '旧账户' } }); await edit; });
    await waitFor(() => expect(result.current.suites).toEqual([]));
    expect(result.current.owner).toBe('next-user');
  });
});
