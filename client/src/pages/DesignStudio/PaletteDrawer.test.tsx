import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaletteColor } from '@shared/types/palette';
import { UnifiedColorPicker } from '@/components/ColorPicker/UnifiedColorPicker';
import { usePaletteStore } from '@/hooks/usePaletteColors';
import { useAuthStore } from '@/stores/authStore';
import PaletteDrawer from './PaletteDrawer';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api, getToken: () => null, setToken: vi.fn() }));
const factory: PaletteColor = { id: 'factory-color', user_id: 'ds-user', name: '暖调/杏黄', value: '#E8B04B', sort: 1000, origin: 'factory', created_at: '2026-09-13' };
const userColor: PaletteColor = { ...factory, id: 'user-color', name: '我的/晨光', value: '#aAbBcC80', sort: 2000, origin: 'user' };
const second: PaletteColor = { ...userColor, id: 'second-color', name: '我的/薄雾', value: '#667788', sort: 3000 };
let rows: PaletteColor[];
const drawer = () => within(screen.getByLabelText('调色板库存'));
const openMenu = (name = userColor.name) => fireEvent.click(drawer().getByRole('button', { name: `管理${name}` }));
const ready = async () => { await waitFor(() => expect(drawer().getByRole('button', { name: `${userColor.name} ${userColor.value}` })).toBeTruthy()); };

beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  useAuthStore.setState({ user: null });
  usePaletteStore.setState({ owner: undefined, colors: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
  rows = [factory, userColor, second].map((color) => ({ ...color }));
  api.get.mockImplementation(async () => ({ data: rows.map((color) => ({ ...color })) }));
  api.patch.mockImplementation(async (path: string, patch: Partial<PaletteColor>) => {
    const index = rows.findIndex((color) => path.endsWith(`/${color.id}`));
    rows[index] = { ...rows[index], ...patch };
    return { data: rows[index] };
  });
  api.post.mockImplementation(async (_path: string, input: Partial<PaletteColor>) => {
    const color = { ...userColor, id: 'created-color', sort: 4000, ...input };
    rows.push(color); return { data: color };
  });
  api.delete.mockImplementation(async (path: string) => {
    const color = rows.find((entry) => path.endsWith(`/${entry.id}`))!;
    rows = rows.filter((entry) => entry.id !== color.id);
    return { data: { id: color.id, value: color.value } };
  });
});

describe('design studio shared palette drawer', () => {
  it('puts custom slash groups first, locks factory management, and supports collapse and name search', async () => {
    const view = render(<PaletteDrawer search="" />); await ready();
    expect(drawer().getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['我的颜色', '出厂颜色']);
    expect((drawer().getByRole('button', { name: '管理暖调/杏黄' }) as HTMLButtonElement).disabled).toBe(true);
    const factoryTile = drawer().getByRole('button', { name: '暖调/杏黄 #E8B04B' });
    expect(factoryTile.draggable).toBe(false);
    expect(factoryTile.title).toContain('暖调/杏黄 · #E8B04B');
    fireEvent.contextMenu(factoryTile); expect(screen.queryByRole('menu')).toBeNull();
    expect(drawer().getByRole('button', { name: '向我的颜色·我的添加颜色' })).toBeTruthy();
    fireEvent.click(drawer().getByRole('button', { name: '我的 2' }));
    expect(drawer().queryByRole('button', { name: `${userColor.name} ${userColor.value}` })).toBeNull();
    fireEvent.click(drawer().getByRole('button', { name: '我的 2' }));
    view.rerender(<PaletteDrawer search="晨光" />);
    expect(drawer().getByRole('button', { name: `${userColor.name} ${userColor.value}` })).toBeTruthy();
    expect(drawer().queryByRole('button', { name: '暖调/杏黄 #E8B04B' })).toBeNull();
    view.rerender(<PaletteDrawer search="不存在" />);
    expect(drawer().getByText('没有找到“不存在”对应的颜色。试试其他名称。')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled(); expect(api.delete).not.toHaveBeenCalled();
  });

  it('renames and changes hex through the existing hook and publishes both to the real picker', async () => {
    const onChange = vi.fn();
    render(<><PaletteDrawer search="" /><UnifiedColorPicker label="纸面" value={`palette:${userColor.id}`} resolvedValue={userColor.value} onChange={onChange} /></>); await ready();
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/palette-colors');
    openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }));
    const name = drawer().getByRole('textbox', { name: '我的/晨光名称' });
    fireEvent.change(name, { target: { value: '我的/晨曦' } }); fireEvent.blur(name);
    await waitFor(() => expect(drawer().getByRole('textbox', { name: '我的/晨曦 Hex' })).toBeTruthy());
    await waitFor(() => expect((drawer().getByRole('textbox', { name: '我的/晨曦 Hex' }) as HTMLInputElement).disabled).toBe(false));
    const hex = drawer().getByRole('textbox', { name: '我的/晨曦 Hex' });
    fireEvent.change(hex, { target: { value: '#01020380' } }); fireEvent.blur(hex);
    await waitFor(() => expect(usePaletteStore.getState().values[userColor.id]).toBe('#01020380'));
    fireEvent.click(screen.getByRole('button', { name: '纸面' }));
    const picker = within(screen.getByRole('dialog', { name: '纸面颜色' }));
    expect(picker.getByRole('button', { name: '我的/晨曦 #01020380' })).toBeTruthy();
    expect(api.patch).toHaveBeenNthCalledWith(1, '/palette-colors/user-color', { name: '我的/晨曦' });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/palette-colors/user-color', { value: '#01020380' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds an alpha hex color at a group tail and makes it visible in the picker without applying it', async () => {
    const onChange = vi.fn();
    render(<><PaletteDrawer search="" /><UnifiedColorPicker label="纸面" value="#123456" resolvedValue="#123456" onChange={onChange} /></>); await ready();
    fireEvent.click(drawer().getByRole('button', { name: '向出厂颜色·暖调添加颜色' }));
    expect((drawer().getByRole('textbox', { name: '新颜色名称' }) as HTMLInputElement).value).toBe('暖调/');
    fireEvent.change(drawer().getByRole('textbox', { name: '新颜色名称' }), { target: { value: '暖调/微光' } });
    fireEvent.change(drawer().getByRole('textbox', { name: '新颜色 Hex' }), { target: { value: '#123' } });
    expect((drawer().getByRole('button', { name: '加入调色板' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(drawer().getByRole('textbox', { name: '新颜色 Hex' }), { target: { value: '#abcdef80' } });
    fireEvent.click(drawer().getByRole('button', { name: '加入调色板' }));
    await waitFor(() => expect(within(drawer().getByRole('region', { name: '我的颜色' })).getByRole('button', { name: '暖调/微光 #abcdef80' })).toBeTruthy());
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/palette-colors', { name: '暖调/微光', value: '#abcdef80' });
    fireEvent.click(screen.getByRole('button', { name: '纸面' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: '暖调/微光 #abcdef80' })).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('deletes immediately from the shared inventory and preserves exact detached consumer bytes', async () => {
    render(<><PaletteDrawer search="" /><UnifiedColorPicker label="纸面" value={`palette:${userColor.id}`} resolvedValue={userColor.value} onChange={vi.fn()} /></>); await ready();
    openMenu();
    const menuItems = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(menuItems[menuItems.length - 1]?.textContent).toBe('删除颜色');
    fireEvent.click(screen.getByRole('menuitem', { name: '删除颜色' }));
    await waitFor(() => expect(drawer().queryByRole('button', { name: `${userColor.name} ${userColor.value}` })).toBeNull());
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/palette-colors/user-color');
    expect(usePaletteStore.getState().detached[userColor.id]).toBe('#aAbBcC80');
    expect(usePaletteStore.getState().values[userColor.id]).toBe('#aAbBcC80');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '纸面' }));
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: `${userColor.name} ${userColor.value}` })).toBeNull();
  });

  it('moves user colors with keyboard menu controls and accepts drops into a collapsed slash group', async () => {
    render(<PaletteDrawer search="" />); await ready();
    openMenu(second.name); fireEvent.click(screen.getByRole('menuitem', { name: '上移' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/palette-colors/second-color', { name: '我的/薄雾', sort: 999 }));
    await waitFor(() => expect((drawer().getByRole('button', { name: `管理${userColor.name}` }) as HTMLButtonElement).disabled).toBe(false));
    const dataTransfer = { setData: vi.fn(), getData: () => userColor.id, effectAllowed: '' };
    fireEvent.dragStart(drawer().getByRole('button', { name: `${userColor.name} ${userColor.value}` }), { dataTransfer });
    fireEvent.click(drawer().getByRole('button', { name: '暖调 1' }));
    fireEvent.drop(drawer().getByRole('button', { name: '暖调 1' }), { dataTransfer });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/palette-colors/user-color', { name: '暖调/晨光', sort: 2000 }));
    await waitFor(() => expect(within(drawer().getByRole('region', { name: '我的颜色' })).getByRole('button', { name: '暖调/晨光 #aAbBcC80' })).toBeTruthy());
    expect(api.patch.mock.calls.every(([path]) => !path.includes('factory-color'))).toBe(true);
  });

  it('supports the keyboard context menu, focus navigation and inline edit dismissal', async () => {
    render(<PaletteDrawer search="" />); await ready();
    const swatch = drawer().getByRole('button', { name: `${userColor.name} ${userColor.value}` });
    fireEvent.keyDown(swatch, { key: 'F10', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '重命名' }));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '删除颜色' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(drawer().getByRole('button', { name: `管理${userColor.name}` }));
    fireEvent.click(swatch);
    const hex = drawer().getByRole('textbox', { name: '我的/晨光 Hex' });
    expect(document.activeElement).toBe(hex);
    fireEvent.change(hex, { target: { value: '#112233' } });
    fireEvent.keyDown(hex, { key: 'Escape' });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/palette-colors/user-color', { value: '#112233' }));
    expect(drawer().queryByRole('textbox', { name: '我的/晨光 Hex' })).toBeNull();
  });

  it('keeps read failures retryable and reports a failed mutation without removing the color', async () => {
    api.get.mockRejectedValueOnce(new Error('暂时离线'));
    render(<PaletteDrawer search="" />);
    await waitFor(() => expect(drawer().getByRole('alert').textContent).toContain('调色板未加载'));
    fireEvent.click(drawer().getByRole('button', { name: '重试' })); await ready();
    api.delete.mockRejectedValueOnce(new Error('稍后重试'));
    openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '删除颜色' }));
    await waitFor(() => expect(drawer().getByRole('alert').textContent).toBe('稍后重试'));
    expect(drawer().getByRole('button', { name: `${userColor.name} ${userColor.value}` })).toBeTruthy();
    expect(usePaletteStore.getState().detached).toEqual({});
  });

  it('offers a first-color entry for an empty inventory and rejects invalid inline hex drafts', async () => {
    rows = [];
    render(<PaletteDrawer search="" />);
    await waitFor(() => expect(usePaletteStore.getState().loaded).toBe(true));
    fireEvent.click(drawer().getByRole('button', { name: '向我的颜色·未分组添加颜色' }));
    fireEvent.change(drawer().getByRole('textbox', { name: '新颜色名称' }), { target: { value: '首色' } });
    fireEvent.click(drawer().getByRole('button', { name: '加入调色板' }));
    await waitFor(() => expect(drawer().getByRole('button', { name: '首色 #4A6FA5' })).toBeTruthy());
    fireEvent.click(drawer().getByRole('button', { name: '首色 #4A6FA5' }));
    const hex = drawer().getByRole('textbox', { name: '首色 Hex' });
    fireEvent.change(hex, { target: { value: '#bad' } }); fireEvent.blur(hex);
    expect((hex as HTMLInputElement).value).toBe('#4A6FA5');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('keeps composition Enter inside the name field and suppresses composition form submission', async () => {
    render(<PaletteDrawer search="" />); await ready();
    openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }));
    const name = drawer().getByRole('textbox', { name: '我的/晨光名称' });
    fireEvent.change(name, { target: { value: '我的/晨曦' } });
    fireEvent.keyDown(name, { key: 'Enter', isComposing: true });
    expect(document.activeElement).toBe(name);
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.keyDown(name, { key: 'Enter', keyCode: 229 });
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.keyDown(name, { key: 'Enter' });
    await waitFor(() => expect(api.patch).toHaveBeenCalledExactlyOnceWith('/palette-colors/user-color', { name: '我的/晨曦' }));
    await waitFor(() => expect((drawer().getByRole('button', { name: '向我的颜色·我的添加颜色' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(drawer().getByRole('button', { name: '向我的颜色·我的添加颜色' }));
    const newName = drawer().getByRole('textbox', { name: '新颜色名称' });
    fireEvent.change(newName, { target: { value: '我的/新色' } });
    expect(fireEvent.keyDown(newName, { key: 'Enter', isComposing: true })).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });
});
