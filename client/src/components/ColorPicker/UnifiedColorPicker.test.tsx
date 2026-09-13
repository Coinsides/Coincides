import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaletteColor } from '@shared/types/palette';
import { UnifiedColorPicker } from './UnifiedColorPicker';
import { RECENT_COLORS_KEY } from './paletteUtils';

const palette = vi.hoisted(() => ({ colors: [] as PaletteColor[], detached: {} as Record<string, string>, loading: false, error: null as string | null,
  createColor: vi.fn(), updateColor: vi.fn(), deleteColor: vi.fn(), refresh: vi.fn() }));
vi.mock('@/hooks/usePaletteColors', () => ({ usePaletteColors: () => palette }));
const factory: PaletteColor = { id: '00000000-0000-4000-8000-000000000001', user_id: 'user', name: '暖调/杏黄', value: '#E8B04B', sort: 1000, origin: 'factory', created_at: '2026-09-13' };
const userColor: PaletteColor = { ...factory, id: '00000000-0000-4000-8000-000000000002', name: '暖调/晨光', value: '#aAbBcC80', sort: 2000, origin: 'user' };
const coolColor: PaletteColor = { ...factory, id: '00000000-0000-4000-8000-000000000003', name: '冷调/湖蓝', value: '#5B9BB5', sort: 3000 };
const openPicker = (value = '#123456', resolvedValue = '#123456') => {
  const onChange = vi.fn();
  const result = render(<UnifiedColorPicker label="纸面" value={value} resolvedValue={resolvedValue} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: '纸面' }));
  return { onChange, ...result };
};

describe('UnifiedColorPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    palette.colors = [factory, userColor, coolColor]; palette.detached = {}; palette.loading = false; palette.error = null;
    palette.createColor.mockResolvedValue({ ...userColor, id: 'created', name: '我的/晨光', value: '#ABCDEF80' });
    palette.updateColor.mockResolvedValue(userColor); palette.deleteColor.mockResolvedValue({ id: userColor.id, value: userColor.value });
  });

  it('opens all four sections in order and keeps grouped palette colors on the first screen', () => {
    openPicker();
    const panel = screen.getByRole('dialog', { name: '纸面颜色' });
    expect(within(panel).getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['调色板', '标准色', '最近使用', '自由取色']);
    expect(screen.getByRole('button', { name: '暖调/杏黄 #E8B04B' }).title).toContain('出厂色');
    expect(screen.getByRole('button', { name: '把当前颜色入池' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '向暖调添加颜色' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '暖调 2' }));
    expect(screen.queryByRole('button', { name: '暖调/杏黄 #E8B04B' })).toBeNull();
    expect(screen.getByRole('button', { name: '把当前颜色入池' })).toBeTruthy();
  });

  it('stores a palette reference and labels its named source', () => {
    const { onChange, rerender } = openPicker();
    fireEvent.click(screen.getByRole('button', { name: '暖调/杏黄 #E8B04B' }));
    expect(onChange).toHaveBeenLastCalledWith(`palette:${factory.id}`);
    expect(JSON.parse(localStorage.getItem(RECENT_COLORS_KEY)!)[0]).toBe(factory.value);
    rerender(<UnifiedColorPicker label="纸面" value={`palette:${factory.id}`} resolvedValue={factory.value} onChange={onChange} />);
    expect(screen.getAllByText('引用·暖调/杏黄')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '纸面颜色入池' })).toBeNull();
  });

  it('stores standard, recent, gamut, and hex selections as literals including alpha', () => {
    const { onChange } = openPicker(`palette:${factory.id}`, factory.value);
    fireEvent.click(screen.getByRole('button', { name: '标准色 白 #FFFFFF' }));
    expect(onChange).toHaveBeenLastCalledWith('#FFFFFF');
    fireEvent.click(screen.getByRole('button', { name: '最近使用 #FFFFFF' }));
    expect(onChange).toHaveBeenLastCalledWith('#FFFFFF');
    fireEvent.change(screen.getByLabelText('颜色色域'), { target: { value: '#556677' } });
    expect(onChange).toHaveBeenLastCalledWith('#556677');
    fireEvent.change(screen.getByRole('textbox', { name: 'Hex 颜色' }), { target: { value: '#abcdef80' } });
    expect(onChange).toHaveBeenLastCalledWith('#abcdef80');
    onChange.mockClear();
    fireEvent.change(screen.getByRole('textbox', { name: 'Hex 颜色' }), { target: { value: '#abc' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByRole('textbox', { name: 'Hex 颜色' }));
    expect((screen.getByRole('textbox', { name: 'Hex 颜色' }) as HTMLInputElement).value).toBe(factory.value);
  });

  it('adds a hex color inline and immediately binds the newly named asset', async () => {
    const { onChange } = openPicker();
    fireEvent.click(screen.getByRole('button', { name: '向暖调添加颜色' }));
    expect((screen.getByRole('textbox', { name: '新颜色名称' }) as HTMLInputElement).value).toBe('暖调/');
    fireEvent.change(screen.getByRole('textbox', { name: '新颜色名称' }), { target: { value: '我的/晨光' } });
    fireEvent.change(screen.getByRole('textbox', { name: '新颜色 Hex' }), { target: { value: '#ABCDEF80' } });
    fireEvent.click(screen.getByRole('button', { name: '加入并使用' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('palette:created'));
    expect(palette.createColor).toHaveBeenCalledWith({ name: '我的/晨光', value: '#ABCDEF80' });
    expect(screen.queryByRole('textbox', { name: '新颜色名称' })).toBeNull();
  });

  it('promotes the current literal through the always-available source action', () => {
    render(<UnifiedColorPicker label="纸面" value="#abcdef80" resolvedValue="#abcdef80" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '纸面颜色入池' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: '新颜色 Hex' }) as HTMLInputElement).value).toBe('#abcdef80');
  });

  it('protects factory colors and edits user names and values in place without a save step', async () => {
    openPicker(); fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    expect((screen.getByRole('textbox', { name: '暖调/杏黄名称' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '删除暖调/杏黄' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: '暖调/晨光名称' }), { target: { value: '晨光/新色' } });
    fireEvent.blur(screen.getByRole('textbox', { name: '暖调/晨光名称' }));
    await waitFor(() => expect(palette.updateColor).toHaveBeenCalledWith(userColor.id, { name: '晨光/新色' }));
    await waitFor(() => expect((screen.getByRole('textbox', { name: '暖调/晨光 Hex' }) as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(screen.getByRole('textbox', { name: '暖调/晨光 Hex' }), { target: { value: '#01020304' } });
    fireEvent.blur(screen.getByRole('textbox', { name: '暖调/晨光 Hex' }));
    await waitFor(() => expect(palette.updateColor).toHaveBeenCalledWith(userColor.id, { value: '#01020304' }));
  });

  it('deletes a selected user asset without confirmation and preserves the server-returned bytes', async () => {
    const { onChange } = openPicker(`palette:${userColor.id}`, userColor.value);
    palette.deleteColor.mockResolvedValue({ id: userColor.id, value: '#dDeEfF99' });
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.click(screen.getByRole('button', { name: '删除暖调/晨光' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('#dDeEfF99'));
    expect(palette.deleteColor).toHaveBeenCalledWith(userColor.id);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('moves user colors by keyboard-accessible controls and derives new groups by renaming', async () => {
    openPicker(); fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.click(screen.getByRole('button', { name: '上移暖调/晨光' }));
    await waitFor(() => expect(palette.updateColor).toHaveBeenCalledWith(userColor.id, { name: userColor.name, sort: 499 }));
    await waitFor(() => expect((screen.getByRole('combobox', { name: '移动暖调/晨光到分组' }) as HTMLSelectElement).disabled).toBe(false));
    fireEvent.change(screen.getByRole('combobox', { name: '移动暖调/晨光到分组' }), { target: { value: '冷调' } });
    await waitFor(() => expect(palette.updateColor).toHaveBeenCalledWith(userColor.id, { name: '冷调/晨光', sort: 4000 }));
  });

  it('dragging into a collapsed group changes the slash prefix', async () => {
    openPicker(); fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    const dataTransfer = { setData: vi.fn(), getData: () => userColor.id, effectAllowed: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: '暖调/晨光 #aAbBcC80' }), { dataTransfer });
    fireEvent.click(screen.getByRole('button', { name: '冷调 1' }));
    fireEvent.drop(screen.getByRole('button', { name: '冷调 1' }), { dataTransfer });
    await waitFor(() => expect(palette.updateColor).toHaveBeenCalledWith(userColor.id, { name: '冷调/晨光', sort: 4000 }));
  });

  it('Esc closes only the picker and restores trigger focus', () => {
    openPicker();
    const parentEscape = vi.fn(); document.addEventListener('keydown', parentEscape);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Hex 颜色' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '纸面' }));
    expect(parentEscape).not.toHaveBeenCalled(); document.removeEventListener('keydown', parentEscape);
  });

  it('keeps loading and failure states actionable without hiding literal choices', () => {
    palette.error = '调色板未加载，请重试。';
    const { onChange } = openPicker();
    fireEvent.click(screen.getByRole('button', { name: '重试' })); expect(palette.refresh).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '标准色 黑 #000000' })); expect(onChange).toHaveBeenLastCalledWith('#000000');
  });

  it('flushes a valid pending user edit when Escape closes the card', async () => {
    openPicker(); fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    const input = screen.getByRole('textbox', { name: '暖调/晨光 Hex' }); input.focus();
    fireEvent.change(input, { target: { value: '#aabbcc77' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(palette.updateColor).toHaveBeenCalledWith(userColor.id, { value: '#aabbcc77' }));
  });

  it('does not overwrite a newer selection when an earlier color deletion finishes', async () => {
    let finishDelete!: (value: { id: string; value: string }) => void;
    palette.deleteColor.mockImplementation(() => new Promise((resolve) => { finishDelete = resolve; }));
    const { onChange, rerender } = openPicker(`palette:${userColor.id}`, userColor.value);
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.click(screen.getByRole('button', { name: '删除暖调/晨光' }));
    fireEvent.click(screen.getByRole('button', { name: '标准色 黑 #000000' }));
    rerender(<UnifiedColorPicker label="纸面" value="#000000" resolvedValue="#000000" onChange={onChange} />);
    finishDelete({ id: userColor.id, value: '#deadbeef' });
    await waitFor(() => expect(screen.getByText('颜色已删除，使用处保留原色。')).toBeTruthy());
    expect(onChange).toHaveBeenCalledTimes(1); expect(onChange).toHaveBeenLastCalledWith('#000000');
  });
});
