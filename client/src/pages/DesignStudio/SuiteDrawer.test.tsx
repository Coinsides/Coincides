import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaletteColor, SkinSelection, SkinSuite } from '@shared/types';
import { SkinSample } from '@/components/Skin/SkinFloatCard';
import { useAuthStore } from '@/stores/authStore';
import { usePaletteColors, usePaletteStore } from '@/hooks/usePaletteColors';
import { normalizeSkinSelection, useSkinSuiteStore, useSkinSuites } from '@/hooks/useSkinSuites';
import { resolveSkin, SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from '@/styles/skinPresets';
import { buildPaperMaterialStyles, buildPaperSkinStyles } from '@/pages/Notes/canvasEngine/paperSkinStyles';
import { buildSkinComponentStyles } from '@/styles/skinComponentStyles';
import SuiteDrawer from './SuiteDrawer';

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api, getToken: () => null, setToken: vi.fn() }));
const suiteId = '14000000-0000-4000-8000-000000000051';
const colorId = '14000000-0000-4000-8000-000000000052';
const suite: SkinSuite = {
  id: suiteId, user_id: 'studio-test', name: '读书纸', created_at: '2026-09-13', materialPreset: 'warm-paper',
  tokens: { ...SKIN_PRESETS['warm-paper'], accent: `palette:${colorId}` }, components: { ...SKIN_PRESET_COMPONENTS['warm-paper'] },
};
const color: PaletteColor = { id: colorId, user_id: 'studio-test', name: '点缀/松绿', value: '#225544', sort: 0, origin: 'user', created_at: '2026-09-13' };
const selection: SkinSelection = { preset: `suite:${suiteId}`, overrides: { ink: '#aBcDef80' }, components: { headerRule: 'hidden' } };
const appearance = (skin: ReturnType<typeof resolveSkin>) => ({
  ...buildPaperSkinStyles(skin.tokens), ...buildPaperMaterialStyles(skin.tokens, skin.materialPreset), ...buildSkinComponentStyles(skin.components),
});

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: null });
  useSkinSuiteStore.setState({ owner: undefined, suites: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
  usePaletteStore.setState({ owner: undefined, colors: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
  api.get.mockImplementation(async (url: string) => {
    if (url === '/skin-suites') return { data: [suite] };
    if (url === '/palette-colors') return { data: [color] };
    throw new Error(`Unexpected request: ${url}`);
  });
});

describe('design studio suite inventory', () => {
  it('renders custom first and four factories with the exact shared token/material sample', async () => {
    const view = render(<SuiteDrawer search="" />);
    await screen.findByRole('button', { name: '查看套装：读书纸' });
    await waitFor(() => expect(usePaletteStore.getState().loaded).toBe(true));
    const groups = screen.getAllByRole('list');
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['我的套装', '出厂套装']);
    expect(within(groups[1]).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      '查看套装：默认', '查看套装：静墨', '查看套装：暖纸', '查看套装：工作台',
    ]);
    expect(within(groups[1]).queryByRole('button', { name: /管理/ })).toBeNull();
    expect(view.container.querySelectorAll('details[open]')).toHaveLength(2);
    expect(view.container.querySelectorAll('[data-skin-sample]')).toHaveLength(5);
    const resolved = resolveSkin({ preset: `suite:${suiteId}` }, null, null, { [colorId]: color.value }, { [suiteId]: suite });
    const reference = render(<SkinSample {...resolved} />);
    const actual = groups[0].querySelector('[data-skin-sample]')!;
    expect(actual.outerHTML).toBe(reference.container.querySelector('[data-skin-sample]')!.outerHTML);
    expect(actual.getAttribute('data-skin-sample-material')).toBe('warm-paper');
    expect(api.get.mock.calls.map(([url]) => url).sort()).toEqual(['/palette-colors', '/skin-suites']);
  });

  it('only selects and reveals token/material details, and filters names without any writes', async () => {
    const view = render(<SuiteDrawer search="" />);
    const card = await screen.findByRole('button', { name: '查看套装：读书纸' });
    fireEvent.mouseEnter(card);
    fireEvent.click(card);
    expect(card.getAttribute('aria-pressed')).toBe('true');
    const detail = screen.getByRole('region', { name: '套装详情' });
    expect(within(detail).getByText('Token 摘要')).toBeTruthy();
    expect(within(detail).getByText(/材质谱系：暖纸/)).toBeTruthy();
    expect(within(detail).getAllByRole('term')).toHaveLength(13);
    expect(screen.queryByRole('button', { name: /应用|更新套装为当前/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '关闭套装详情' }));
    expect(screen.queryByRole('region', { name: '套装详情' })).toBeNull();
    view.rerender(<SuiteDrawer search="静墨" />);
    expect(screen.getByRole('button', { name: '查看套装：静墨' })).toBeTruthy();
    fireEvent.contextMenu(screen.getByRole('button', { name: '查看套装：静墨' }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('button', { name: '查看套装：读书纸' })).toBeNull();
    expect(screen.getByText('没有匹配的套装。')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled(); expect(api.delete).not.toHaveBeenCalled();
  });

  it('renames through the shared hook and updates the other consumer while preserving appearance', async () => {
    const consumer = renderHook(() => ({ suites: useSkinSuites(), palette: usePaletteColors() }));
    render(<SuiteDrawer search="" />);
    await screen.findByRole('button', { name: '查看套装：读书纸' });
    await waitFor(() => expect(consumer.result.current.palette.loaded).toBe(true));
    const before = appearance(resolveSkin(selection, null, null, consumer.result.current.palette.values, consumer.result.current.suites.values));
    api.patch.mockResolvedValue({ data: { ...suite, name: '长夜读书纸' } });
    fireEvent.click(screen.getByRole('button', { name: '管理套装：读书纸' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }));
    const input = screen.getByRole('textbox', { name: '套装新名字' });
    fireEvent.change(input, { target: { value: '长夜读书纸' } });
    fireEvent.blur(input);
    await screen.findByRole('button', { name: '查看套装：长夜读书纸' });
    expect(api.patch).toHaveBeenCalledExactlyOnceWith(`/skin-suites/${suiteId}`, { name: '长夜读书纸' });
    expect(consumer.result.current.suites.suites[0].name).toBe('长夜读书纸');
    expect(appearance(resolveSkin(selection, null, null, consumer.result.current.palette.values, consumer.result.current.suites.values))).toEqual(before);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('deletes last in the context menu without a dialog and silently detaches consumers with complete appearance', async () => {
    const consumer = renderHook(() => ({ suites: useSkinSuites(), palette: usePaletteColors() }));
    render(<SuiteDrawer search="" />);
    const card = await screen.findByRole('button', { name: '查看套装：读书纸' });
    await waitFor(() => expect(consumer.result.current.palette.loaded).toBe(true));
    const before = appearance(resolveSkin(selection, null, null, consumer.result.current.palette.values, consumer.result.current.suites.values));
    const snapshot = { tokens: { ...suite.tokens, accent: color.value }, components: suite.components, materialPreset: suite.materialPreset };
    api.delete.mockResolvedValue({ data: { id: suiteId, ...snapshot, palette: { [colorId]: color.value } } });
    fireEvent.click(card);
    fireEvent.contextMenu(card, { clientX: 40, clientY: 50 });
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['重命名', '删除套装']);
    fireEvent.click(screen.getByRole('menuitem', { name: '删除套装' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '查看套装：读书纸' })).toBeNull());
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(`/skin-suites/${suiteId}`);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('region', { name: '套装详情' })).toBeNull();
    expect(consumer.result.current.suites.suites).toEqual([]);
    const detached = normalizeSkinSelection(selection)!;
    expect(detached.preset).toBe('default');
    expect(detached.overrides?.ink).toBe('#aBcDef80');
    expect(appearance(resolveSkin(detached))).toEqual(before);
    expect(screen.getByText(/使用它的纸保留原有外观/)).toBeTruthy();
  });

  it('supports keyboard menus, Escape rename cancellation and blank-name validation', async () => {
    render(<SuiteDrawer search="" />);
    const trigger = await screen.findByRole('button', { name: '管理套装：读书纸' });
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '重命名' }));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '删除套装' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }));
    const input = screen.getByRole('textbox', { name: '套装新名字' });
    fireEvent.change(input, { target: { value: '输入法' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(document.activeElement).toBe(input);
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.blur(input);
    expect(screen.getByText('名字不能为空。')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: '套装新名字' })).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('keeps a failed rename editable and retries with Enter without losing its draft', async () => {
    render(<SuiteDrawer search="" />);
    fireEvent.click(await screen.findByRole('button', { name: '管理套装：读书纸' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }));
    api.patch.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ data: { ...suite, name: '夜读' } });
    const input = screen.getByRole('textbox', { name: '套装新名字' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '夜读' } });
    fireEvent.blur(input);
    await screen.findByText('重命名未完成，请重试。');
    expect(input.value).toBe('夜读');
    expect(screen.getByRole('button', { name: '查看套装：读书纸' })).toBeTruthy();
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByRole('button', { name: '查看套装：夜读' });
    expect(api.patch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('textbox', { name: '套装新名字' })).toBeNull();
  });

  it('keeps a failed deletion available for retry and refreshes a failed initial load', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === '/palette-colors') return { data: [color] };
      throw new Error('Unavailable');
    });
    render(<SuiteDrawer search="" />);
    await screen.findByText('套装未加载，请重试。');
    api.get.mockResolvedValue({ data: [suite] });
    fireEvent.click(screen.getByRole('button', { name: '重试套装' }));
    await screen.findByRole('button', { name: '查看套装：读书纸' });
    api.delete.mockRejectedValue(new Error('Unavailable'));
    fireEvent.click(screen.getByRole('button', { name: '管理套装：读书纸' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '删除套装' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: '查看套装：读书纸' })).toBeTruthy();
    expect(useSkinSuiteStore.getState().detached).toEqual({});
  });
});
