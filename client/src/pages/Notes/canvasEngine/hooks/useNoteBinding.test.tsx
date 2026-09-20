import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultNoteBindingSettings } from '../../../../../../shared/types/noteBinding';
import { useNoteBinding } from './useNoteBinding';
const get = vi.hoisted(() => vi.fn());
vi.mock('@/services/api', () => ({ default: { get } }));
beforeEach(() => { get.mockReset(); });
describe('A2 binding subresource hydration and save', () => {
  it('publishes the persisted canonical cover, including the card frame supplied by storage', async () => {
    get.mockResolvedValue({ data: { binding_settings: null } });
    const submitted = createDefaultNoteBindingSettings();
    const page = { crop: { x: 10, y: 5, width: 50, height: 80 }, zoom: 1.5 };
    submitted.cover = { assetId: 'cover-image', page };
    const canonical = { ...submitted, cover: { ...submitted.cover, card: {
      crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1,
    } } };
    const subject = renderHook(() => useNoteBinding('paper', async () => canonical));
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => subject.result.current.save(submitted));
    expect(subject.result.current.value).toEqual(canonical);
    expect(submitted.cover).toEqual({ assetId: 'cover-image', page });
  });
  it('loads settings separately from Note and republishes a completed save', async () => {
    const stored = createDefaultNoteBindingSettings(); stored.enabled = false;
    get.mockResolvedValue({ data: { binding_settings: stored } });
    const persist = vi.fn(async () => {});
    const subject = renderHook(() => useNoteBinding('paper', persist));
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    expect(get).toHaveBeenCalledWith('/notes/paper/binding-settings');
    expect(subject.result.current.value).toEqual(stored);
    const next = createDefaultNoteBindingSettings(); next.sections[0].pageNumber.startAt = 7;
    await act(async () => subject.result.current.save(next));
    expect(persist).toHaveBeenCalledWith(next);
    expect(subject.result.current.value).toEqual(next);
  });
  it('keeps the current note when a previous load completes late', async () => {
    let resolveFirst!: (value: unknown) => void;
    get.mockImplementation((url: string) => url.includes('/first/')
      ? new Promise((resolve) => { resolveFirst = resolve; })
      : Promise.resolve({ data: { binding_settings: null } }));
    const persist = vi.fn(async () => {});
    const subject = renderHook(({ id }) => useNoteBinding(id, persist), { initialProps: { id: 'first' } });
    subject.rerender({ id: 'second' });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => resolveFirst({ data: { binding_settings: createDefaultNoteBindingSettings() } }));
    expect(subject.result.current.value).toBeNull();
  });
  it('shows read failure and retries instead of treating it as an empty default', async () => {
    get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { binding_settings: null } });
    const subject = renderHook(() => useNoteBinding('paper', async () => {}));
    await waitFor(() => expect(subject.result.current.error).toBe('装订设置加载失败'));
    expect(subject.result.current.value?.enabled).toBe(false);
    act(() => subject.result.current.retry());
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    expect(subject.result.current.error).toBeNull(); expect(subject.result.current.value).toBeNull();
  });

  it('does not publish an older save over a later choice', async () => {
    get.mockResolvedValue({ data: { binding_settings: null } });
    const resolves: (() => void)[] = [];
    const persist = () => new Promise<void>((resolve) => { resolves.push(resolve); });
    const subject = renderHook(() => useNoteBinding('paper', persist));
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const first = createDefaultNoteBindingSettings(), second = createDefaultNoteBindingSettings();
    second.enabled = false;
    let saveFirst!: Promise<void>, saveSecond!: Promise<void>;
    act(() => { saveFirst = subject.result.current.save(first); saveSecond = subject.result.current.save(second); });
    await act(async () => { resolves[1](); await saveSecond; });
    await act(async () => { resolves[0](); await saveFirst; });
    expect(subject.result.current.value).toEqual(second);
  });
});
