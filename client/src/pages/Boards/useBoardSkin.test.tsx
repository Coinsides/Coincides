import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { useBoardSkin } from './useBoardSkin';
import type { Board } from './boardTypes';
import type { SkinSelection } from '@shared/types';
import { useSkinSuiteStore } from '@/hooks/useSkinSuites';
import { usePaletteStore } from '@/hooks/usePaletteColors';
import { SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from '@/styles/skinPresets';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', async (importOriginal) => ({ ...await importOriginal<typeof import('@/services/api')>(), default: {
  get: (url: string) => (url === '/palette-colors' || url === '/skin-suites') ? Promise.resolve({ data: [] }) : http.get(url),
} }));
const board = (id: string, project_id: string | null, skin: Board['skin'] = null) => ({ id, project_id, skin } as Board);
beforeEach(() => {
  vi.clearAllMocks();
  useSkinSuiteStore.setState({ owner: undefined, loaded: false, loading: false, suites: [], values: {}, detached: {}, error: null });
  usePaletteStore.setState({ owner: undefined, loaded: false, loading: false, colors: [], values: {}, detached: {}, error: null });
  useAuthStore.setState({ user: { settings: { skin: { preset: 'warm-paper' } } } as never });
});

it.each(['global', 'project', 'local'])('freezes %s board suite deviations using the deletion palette snapshot', async (mount) => {
  const id = '14000000-0000-4000-8000-000000000033';
  const colorId = '14000000-0000-4000-8000-000000000034';
  const selection: SkinSelection = { preset: `suite:${id}`, overrides: { edge: `palette:${colorId}` } };
  const snapshot = { tokens: SKIN_PRESETS.workbench, components: SKIN_PRESET_COMPONENTS.workbench };
  useAuthStore.setState({ user: { settings: { skin: mount === 'global' ? selection : null } } as never });
  http.get.mockResolvedValue({ data: { course: { skin: mount === 'project' ? selection : null } } });
  const update = vi.fn().mockResolvedValue(true);
  const { result } = renderHook(() => useBoardSkin(board('b1', 'project', mount === 'local' ? selection : null), update));
  await act(async () => {});
  act(() => {
    useSkinSuiteStore.setState({ values: { [id]: snapshot } });
    usePaletteStore.setState({ values: { [colorId]: '#aBcDeF80' } });
  });
  expect(result.current.tokens.edge).toBe('#aBcDeF80');
  act(() => {
    useSkinSuiteStore.setState({ values: { [id]: snapshot }, detached: { [id]: { ...snapshot, palette: { [colorId]: '#aBcDeF80' } } } });
    usePaletteStore.setState({ values: { [colorId]: '#000000' } });
  });
  expect(result.current.tokens.edge).toBe('#aBcDeF80');
  expect(result.current.preset).toBe('default');
  expect(update).not.toHaveBeenCalled();
});

it('loads the board project, honors local components and clears through the owner write path', async () => {
  http.get.mockResolvedValue({ data: { course: { skin: { preset: 'workbench' } } } });
  const update = vi.fn().mockResolvedValue(true);
  const hook = renderHook(({ value }) => useBoardSkin(value, update), { initialProps: { value: board('b1', 'project') } });
  await waitFor(() => expect(hook.result.current.preset).toBe('workbench'));
  expect(http.get).toHaveBeenCalledWith('/courses/project/summary');
  expect(hook.result.current.components.labelFont).toBe('mono');
  hook.rerender({ value: board('b1', 'project', { preset: 'quiet-ink', components: { handleStyle: 'rivet' }, overrides: { edge: '#123456' } }) });
  expect(hook.result.current.tokens.edge).toBe('#123456');
  expect(hook.result.current.components.handleStyle).toBe('rivet');
  await act(() => hook.result.current.save(null));
  expect(update).toHaveBeenLastCalledWith({ skin: null });
  hook.rerender({ value: board('b1', 'project') });
  expect(hook.result.current.preset).toBe('workbench');
  hook.rerender({ value: board('b2', null) });
  expect(hook.result.current.preset).toBe('warm-paper');
  expect(http.get).toHaveBeenCalledTimes(1);
});

it('ignores the previous project response after board navigation and exposes retry after failure', async () => {
  let finish!: (value: unknown) => void;
  http.get.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: { course: { skin: { preset: 'quiet-ink' } } } });
  const hook = renderHook(({ value }) => useBoardSkin(value, vi.fn().mockResolvedValue(true)), { initialProps: { value: board('a', 'old') } });
  hook.rerender({ value: board('b', 'new') });
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  await act(async () => { finish({ data: { course: { skin: { preset: 'workbench' } } } }); });
  expect(hook.result.current.preset).toBe('warm-paper');
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.preset).toBe('quiet-ink'));
  expect(hook.result.current.error).toBeNull();
});

it('surfaces a rejected owner write to the editor instead of claiming it saved', async () => {
  const hook = renderHook(() => useBoardSkin(board('b', null), vi.fn().mockResolvedValue(false)));
  await expect(hook.result.current.save({ preset: 'default' })).rejects.toThrow('not saved');
});
