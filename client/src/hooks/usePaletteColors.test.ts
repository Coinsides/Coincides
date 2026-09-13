import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaletteColor } from '@shared/types/palette';
import { useAuthStore } from '@/stores/authStore';
import { resolveSkin } from '@/styles/skinPresets';
import { detachSkinSelection, saveSkinWithPalette, usePaletteColors, usePaletteStore } from './usePaletteColors';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: mocks, getToken: () => null, setToken: vi.fn() }));
const id = '14000000-0000-4000-8000-000000000001';
const color: PaletteColor = { id, user_id: 'palette-test-user', name: '暖调/杏黄', value: '#E8b04B80', sort: 1, origin: 'user', created_at: '2026-09-13' };
const skin = { preset: 'warm-paper' as const, overrides: { paper: `palette:${id}`, ink: '#123456' } };

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: null });
  usePaletteStore.setState({ owner: undefined, colors: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
  mocks.get.mockResolvedValue({ data: [color] });
});

describe('shared palette lifecycle', () => {
  it('waits for an in-flight detach before saving a draft captured before deletion', async () => {
    const { result } = renderHook(() => usePaletteColors());
    await waitFor(() => expect(result.current.colors).toEqual([color]));
    let complete!: (value: unknown) => void;
    mocks.delete.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const save = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      const deletion = result.current.deleteColor(id);
      const saving = saveSkinWithPalette(skin, save);
      expect(save).not.toHaveBeenCalled();
      await Promise.resolve(); await Promise.resolve();
      complete({ data: { id, value: '#aBcDef80' } });
      await Promise.all([deletion, saving]);
    });
    expect(save).toHaveBeenCalledExactlyOnceWith({ ...skin, overrides: { paper: '#aBcDef80', ink: '#123456' } });
  });
  it('shares one mount request and propagates a pool edit to every mounted consumer', async () => {
    const a = renderHook(() => usePaletteColors());
    const b = renderHook(() => usePaletteColors());
    await waitFor(() => expect(a.result.current.colors).toEqual([color]));
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith('/palette-colors');
    mocks.patch.mockResolvedValue({ data: { ...color, value: '#aBcDeF80' } });
    await act(async () => { await a.result.current.updateColor(id, { value: '#aBcDeF80' }); });
    expect(resolveSkin(skin, null, null, b.result.current.values).tokens.paper).toBe('#aBcDeF80');
    expect(b.result.current.colors[0].value).toBe('#aBcDeF80');
  });
  it('deleting a pool color preserves exact consumer bytes and normalizes the next draft save', async () => {
    const { result } = renderHook(() => usePaletteColors());
    await waitFor(() => expect(result.current.colors).toEqual([color]));
    const before = resolveSkin(skin, null, null, result.current.values);
    mocks.delete.mockResolvedValue({ data: { id, value: color.value } });
    await act(async () => { await result.current.deleteColor(id); });
    expect(result.current.colors).toEqual([]);
    expect(resolveSkin(skin, null, null, result.current.values)).toEqual(before);
    const detached = detachSkinSelection(skin, result.current.detached)!;
    expect(detached.overrides).toEqual({ paper: color.value, ink: '#123456' });
    expect(resolveSkin(detached)).toEqual(before);
    expect(JSON.stringify(detached)).not.toContain('palette:');
  });
  it('keeps the pool and consumers unchanged when deletion fails', async () => {
    const { result } = renderHook(() => usePaletteColors());
    await waitFor(() => expect(result.current.colors).toEqual([color]));
    mocks.delete.mockRejectedValue(new Error('Temporary write failure'));
    await act(async () => { await expect(result.current.deleteColor(id)).rejects.toThrow('Temporary write failure'); });
    expect(result.current.colors).toEqual([color]);
    expect(result.current.detached).toEqual({});
  });
  it('serializes color edits and a refresh to prevent an old list response overwriting the edit', async () => {
    const { result } = renderHook(() => usePaletteColors());
    await waitFor(() => expect(result.current.colors).toEqual([color]));
    let complete!: (value: unknown) => void;
    mocks.patch.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    mocks.get.mockResolvedValue({ data: [{ ...color, value: '#112233' }] });
    await act(async () => {
      const edit = result.current.updateColor(id, { value: '#112233' });
      const refresh = result.current.refresh();
      await Promise.resolve();
      await Promise.resolve();
      expect(mocks.get).toHaveBeenCalledTimes(1);
      complete({ data: { ...color, value: '#112233' } });
      await Promise.all([edit, refresh]);
    });
    expect(result.current.values[id]).toBe('#112233');
  });
});
