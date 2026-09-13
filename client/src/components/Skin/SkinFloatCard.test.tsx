import { useRef, useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkinSelection, SkinSuite } from '@shared/types';
import { SkinFloatCard } from './SkinFloatCard';
import { clampFloatCard, readFloatCardPosition, SKIN_FLOAT_CARD_STORAGE_KEY } from './skinFloatCardGeometry';
import { useNoteSkin } from '@/pages/Notes/canvasEngine/hooks/useNoteSkin';
import type { Note } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import { usePaletteStore } from '@/hooks/usePaletteColors';
import { useSkinSuiteStore } from '@/hooks/useSkinSuites';
import { useAuthStore } from '@/stores/authStore';
import { SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from '@/styles/skinPresets';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), remove: vi.fn(), save: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get: mocks.get, post: mocks.post, patch: mocks.patch, delete: mocks.remove }, getToken: () => null, setToken: vi.fn() }));
const suiteId = '91000000-0000-4000-8000-000000000001';
const colorId = '91000000-0000-4000-8000-000000000002';
const fixtureSuite = (name = '阅读套装'): SkinSuite => ({ id: suiteId, user_id: 'synthetic', name, tokens: { ...SKIN_PRESETS['warm-paper'] }, components: { ...SKIN_PRESET_COMPONENTS['warm-paper'] }, materialPreset: 'warm-paper', created_at: '2026-09-13' });

function Harness({ initial = { preset: 'default' }, firstId = 'paper-a' }: { initial?: SkinSelection; firstId?: string }) {
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState<Note>({ id: firstId, course_id: 'project-synth', title: 'Synthetic paper', description: null, status: 'active', metadata: { skin: initial } });
  const anchor = useRef<HTMLButtonElement>(null);
  const skin = useNoteSkin(note, async (selection) => {
    await mocks.save(note.id, selection);
    setNote((current) => current.id === note.id ? { ...current, metadata: { ...current.metadata, skin: selection } } : current);
  });
  return <><button ref={anchor} onClick={() => setOpen(!open)}>外观开关</button><button onClick={() => setNote({ ...note, id: 'paper-b', metadata: { skin: { preset: 'quiet-ink' } } })}>切纸</button>
    <div data-testid="paper" data-note-skin-preset={skin.materialPreset ?? skin.preset} style={skin.style}><textarea aria-label="纸上输入" /><button>纸上选区</button></div>
    <SkinFloatCard noteId={note.id} skin={skin} open={open} onClose={() => setOpen(false)} anchorRef={anchor} /></>;
}

describe('skin float card contract', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); useAuthStore.setState({ user: null });
    usePaletteStore.setState({ owner: null, loaded: true, loading: false, error: null, colors: [], values: {}, detached: {} });
    useSkinSuiteStore.setState({ owner: null, loaded: true, loading: false, error: null, suites: [], values: {}, detached: {} });
    mocks.get.mockImplementation(async (url: string) => { if (url === '/skin-suites' || url === '/palette-colors') return { data: [] }; if (url === '/courses/project-synth/summary') return { data: { course: { skin: null } } }; throw new Error(`Unexpected fixture GET: ${url}`); });
    mocks.post.mockImplementation(async (url: string, input) => { if (url !== '/skin-suites') throw new Error(`Unexpected fixture POST: ${url}`); return { data: { ...fixtureSuite(), ...input } }; });
    mocks.patch.mockImplementation(async (url: string, input) => { if (url !== `/skin-suites/${suiteId}`) throw new Error(`Unexpected fixture PATCH: ${url}`); return { data: { ...fixtureSuite(), ...input } }; });
    mocks.remove.mockImplementation(async (url: string) => { if (url !== `/skin-suites/${suiteId}`) throw new Error(`Unexpected fixture DELETE: ${url}`); return { data: { ...fixtureSuite(), palette: {} } }; });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', { configurable: true, value: () => false });
    if (!window.PointerEvent) window.PointerEvent = MouseEvent as typeof PointerEvent;
  });
  afterEach(() => { vi.useRealTimers(); });

  it('clamps every edge and snaps only within 16px of viewport edges', () => {
    const size = { width: 280, height: 400 }; const viewport = { width: 1000, height: 800 };
    expect(clampFloatCard({ x: -900, y: 2000, collapsed: false }, size, viewport)).toEqual({ x: 8, y: 392, collapsed: false });
    expect(clampFloatCard({ x: 15, y: 390, collapsed: false }, size, viewport, true)).toEqual({ x: 8, y: 392, collapsed: false });
    expect(clampFloatCard({ x: 20, y: 20, collapsed: false }, size, viewport, true)).toEqual({ x: 20, y: 20, collapsed: false });
  });

  it('stays a single nonmodal tool across paper clicks and note changes; X and Escape close', () => {
    render(<Harness />);
    const card = screen.getByRole('dialog', { name: '笔记外观浮卡' });
    expect(card.getAttribute('aria-modal')).toBe('false');
    fireEvent.pointerDown(screen.getByRole('button', { name: '纸上选区' }));
    expect(screen.getByRole('dialog', { name: '笔记外观浮卡' })).toBe(card);
    fireEvent.click(screen.getByRole('button', { name: '切纸' }));
    expect(screen.getAllByRole('dialog', { name: '笔记外观浮卡' })).toEqual([card]);
    expect(card.querySelector('[data-skin-float-content]')?.getAttribute('data-skin-float-content')).toBe('paper-b');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '笔记外观浮卡' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '外观开关' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭外观' }));
    expect(screen.queryByRole('dialog', { name: '笔记外观浮卡' })).toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('only drags by header, clamps on release, folds by double click, and restores UI memory', () => {
    localStorage.setItem(SKIN_FLOAT_CARD_STORAGE_KEY, JSON.stringify({ x: 100, y: 100, collapsed: false }));
    const view = render(<Harness />);
    const card = screen.getByRole('dialog', { name: '笔记外观浮卡' });
    const body = card.querySelector('[data-skin-float-content]')!;
    fireEvent.pointerDown(body, { clientX: 110, clientY: 110, button: 0 });
    fireEvent.pointerMove(body, { clientX: 500, clientY: 500 });
    expect(card.style.left).toBe('100px');
    const header = card.querySelector('[data-skin-float-drag-handle]')!;
    fireEvent.pointerDown(header, { clientX: 110, clientY: 110, button: 0 });
    fireEvent.pointerMove(header, { clientX: -400, clientY: -400 });
    fireEvent.pointerUp(header, { clientX: -400, clientY: -400 });
    expect(card.style.left).toBe('8px'); expect(card.style.top).toBe('8px');
    fireEvent.doubleClick(header);
    expect(card.getAttribute('data-collapsed')).toBe('true');
    expect(card.querySelector('[data-skin-float-content]')).toBeNull();
    expect(readFloatCardPosition()).toEqual({ x: 8, y: 8, collapsed: true });
    view.unmount();
    render(<Harness />);
    expect(screen.getByRole('dialog', { name: '笔记外观浮卡' }).getAttribute('data-collapsed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '展开外观浮卡' }));
    expect(screen.getByRole('button', { name: '存为套装…' })).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('restores remembered positions inside a smaller viewport and rejects malformed memory', () => {
    localStorage.setItem(SKIN_FLOAT_CARD_STORAGE_KEY, JSON.stringify({ x: 8000, y: 9000, collapsed: false }));
    render(<Harness />);
    const card = screen.getByRole('dialog', { name: '笔记外观浮卡' });
    expect(parseFloat(card.style.left)).toBeLessThanOrEqual(window.innerWidth - 280 - 8);
    expect(parseFloat(card.style.top)).toBeLessThan(window.innerHeight - 8);
    localStorage.setItem(SKIN_FLOAT_CARD_STORAGE_KEY, '{broken');
    expect(readFloatCardPosition()).toBeNull();
  });

  it('hover debounces real paper style for all four presets, restores on leave, never saves until click', async () => {
    vi.useFakeTimers(); render(<Harness />);
    const paper = screen.getByTestId('paper');
    for (const [id, name] of [['default', '默认'], ['quiet-ink', '静墨'], ['warm-paper', '暖纸'], ['workbench', '工作台']] as const) {
      const button = screen.getByRole('button', { name });
      fireEvent.mouseEnter(button);
      act(() => { vi.advanceTimersByTime(299); });
      expect(paper.style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS.default.paper);
      act(() => { vi.advanceTimersByTime(1); });
      expect(paper.style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS[id].paper);
      expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.post).not.toHaveBeenCalled(); expect(mocks.patch).not.toHaveBeenCalled();
      fireEvent.mouseLeave(button);
      expect(paper.style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS.default.paper);
    }
    fireEvent.click(screen.getByRole('button', { name: '暖纸' }));
    await act(async () => {});
    expect(mocks.save).toHaveBeenLastCalledWith('paper-a', { preset: 'warm-paper' });
    expect(paper.style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS['warm-paper'].paper);
  });

  it('clears a pending hover when switching note or collapsing', () => {
    vi.useFakeTimers(); render(<Harness />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: '暖纸' }));
    fireEvent.click(screen.getByRole('button', { name: '切纸' }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByTestId('paper').style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS['quiet-ink'].paper);
    fireEvent.mouseEnter(screen.getByRole('button', { name: '工作台' }));
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.click(screen.getByRole('button', { name: '折叠外观浮卡' }));
    expect(screen.getByTestId('paper').style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS['quiet-ink'].paper);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('touch holds preview without saving, releases to restore, and long-holds a Custom menu', () => {
    vi.useFakeTimers();
    const suite = fixtureSuite();
    useSkinSuiteStore.setState({ suites: [suite], values: { [suite.id]: suite } });
    render(<Harness />);
    const touch = (element: HTMLElement, type: string, x = 30) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { pointerType: 'touch', clientX: x, clientY: 30, button: 0 });
      fireEvent(element, event);
    };
    const warm = screen.getByRole('button', { name: '暖纸' });
    touch(warm, 'pointerdown');
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('paper').style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS['warm-paper'].paper);
    touch(warm, 'pointerup'); fireEvent.click(warm);
    expect(screen.getByTestId('paper').style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS.default.paper);
    expect(mocks.save).not.toHaveBeenCalled();
    const custom = screen.getByRole('button', { name: '阅读套装' });
    touch(custom, 'pointerdown');
    act(() => vi.advanceTimersByTime(650));
    expect(screen.getByRole('menu', { name: '套装操作' })).toBeTruthy();
    touch(custom, 'pointerup'); fireEvent.click(custom);
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    touch(warm, 'pointerdown'); touch(warm, 'pointermove', 50);
    act(() => vi.advanceTimersByTime(700));
    touch(warm, 'pointerup'); fireEvent.click(warm);
    expect(screen.getByTestId('paper').style.getPropertyValue('--sk-paper')).toBe(SKIN_PRESETS.default.paper);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('preserves paper focus on commands and shared picker opening, while text fields take focus', async () => {
    render(<Harness />);
    const paperInput = screen.getByRole('textbox', { name: '纸上输入' }); paperInput.focus();
    const trigger = screen.getByRole('button', { name: '正文' });
    fireEvent.pointerDown(trigger); fireEvent.click(trigger);
    expect(document.activeElement).toBe(paperInput);
    const hex = screen.getByRole('textbox', { name: 'Hex 颜色' }); fireEvent.pointerDown(hex); hex.focus();
    expect(document.activeElement).toBe(hex);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '正文颜色' })).toBeNull();
    expect(screen.getByRole('dialog', { name: '笔记外观浮卡' })).toBeTruthy();
  });

  it('opens only one shared picker and lets document outside listeners close it', () => {
    render(<Harness />);
    const ink = screen.getByRole('button', { name: '正文' }); fireEvent.pointerDown(ink); fireEvent.click(ink);
    expect(screen.getByRole('dialog', { name: '正文颜色' })).toBeTruthy();
    const paper = screen.getByRole('button', { name: '纸面' }); fireEvent.pointerDown(paper); fireEvent.click(paper);
    expect(screen.queryByRole('dialog', { name: '正文颜色' })).toBeNull();
    expect(screen.getByRole('dialog', { name: '纸面颜色' })).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole('button', { name: '工作台' }));
    expect(screen.queryByRole('dialog', { name: '纸面颜色' })).toBeNull();
  });

  it('lets native picker controls borrow focus, commits grouping, and returns paper focus after commit or cancel', async () => {
    const color = { id: colorId, user_id: 'synthetic', name: '阅读/蓝', value: '#123456', sort: 0, origin: 'user' as const, created_at: '2026-09-13' };
    const other = { ...color, id: '91000000-0000-4000-8000-000000000003', name: '其他/绿', value: '#654321', sort: 1000 };
    usePaletteStore.setState({ colors: [color, other], values: { [color.id]: color.value, [other.id]: other.value } });
    mocks.patch.mockImplementation(async (url: string, input) => {
      if (url !== `/palette-colors/${colorId}`) throw new Error(`Unexpected fixture PATCH: ${url}`);
      return { data: { ...color, ...input } };
    });
    render(<Harness />);
    const paperInput = screen.getByRole('textbox', { name: '纸上输入' }); paperInput.focus();
    const trigger = screen.getByRole('button', { name: '正文' }); fireEvent.pointerDown(trigger); fireEvent.click(trigger);
    const edit = screen.getByRole('button', { name: '编辑' }); fireEvent.pointerDown(edit); fireEvent.click(edit);
    expect(document.activeElement).toBe(paperInput);
    const select = screen.getByRole('combobox', { name: '移动阅读/蓝到分组' });
    expect(fireEvent.pointerDown(select, { button: 0 })).toBe(true);
    expect(fireEvent.mouseDown(select, { button: 0 })).toBe(true);
    select.focus(); // jsdom does not implement the browser's native popup default.
    expect(document.activeElement).toBe(select);
    fireEvent(window, new Event('focus'));
    fireEvent.keyDown(select, { key: 'ArrowDown' });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement, 'Window activation must not commit an open select').toBe(select);
    expect(mocks.patch).not.toHaveBeenCalled();
    fireEvent(window, new Event('blur'));
    fireEvent(window, new Event('focus'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement, 'Even an actual window return cannot commit a select').toBe(select);
    fireEvent.change(select, { target: { value: '其他' } });
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith(`/palette-colors/${colorId}`, expect.objectContaining({ name: '其他/蓝' })));
    await waitFor(() => expect(document.activeElement).toBe(paperInput));

    const nativeColor = screen.getByLabelText('颜色色域');
    expect(fireEvent.pointerDown(nativeColor, { button: 0 })).toBe(true);
    nativeColor.focus();
    fireEvent.input(nativeColor, { target: { value: '#abcdef' } });
    await act(async () => {});
    expect(document.activeElement, 'Live color input must not dismiss the native popup').toBe(nativeColor);
    fireEvent.keyDown(nativeColor, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(paperInput));
    expect(screen.getByRole('dialog', { name: '正文颜色' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: '笔记外观浮卡' })).toBeTruthy();

    fireEvent.pointerDown(nativeColor, { button: 0 }); nativeColor.focus();
    fireEvent(window, new Event('focus'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement, 'Color input needs a preceding window blur to count as OS picker return').toBe(nativeColor);
    fireEvent(window, new Event('blur'));
    fireEvent(window, new Event('focus')); // OS picker cancellation can return the window without change.
    await waitFor(() => expect(document.activeElement).toBe(paperInput));
    const hex = screen.getByRole('textbox', { name: 'Hex 颜色' }); fireEvent.pointerDown(hex); hex.focus();
    expect(document.activeElement).toBe(hex);
  });

  it('retries binding an already created suite without creating a duplicate', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Synthetic save fail')).mockResolvedValue(undefined);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '存为套装…' }));
    fireEvent.change(screen.getByRole('textbox', { name: '套装名字' }), { target: { value: '阅读套装' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(within(screen.getByRole('dialog', { name: '存为套装' })).getByRole('alert')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '存为套装' })).toBeNull());
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: '阅读套装' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('keyboard context menu takes focus and arrow navigation reaches its actions', () => {
    const suite = fixtureSuite();
    useSkinSuiteStore.setState({ suites: [suite], values: { [suite.id]: suite } });
    render(<Harness />);
    const card = screen.getByRole('button', { name: '阅读套装' }); card.focus();
    fireEvent.keyDown(card, { key: 'F10', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '重命名' }));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '更新套装为当前样子' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('dialog', { name: '笔记外观浮卡' })).toBeTruthy();
  });

  it('edits via the real shared picker, persists palette identity, shows deviations and restores individually/all', async () => {
    usePaletteStore.setState({ colors: [{ id: colorId, user_id: 'synthetic', name: '阅读蓝', value: '#123456', sort: 0, origin: 'user', created_at: '2026-09-13' }], values: { [colorId]: '#123456' } });
    render(<Harness initial={{ preset: 'warm-paper' }} />);
    fireEvent.click(screen.getByRole('button', { name: '正文' }));
    fireEvent.click(screen.getByRole('button', { name: '阅读蓝 #123456' }));
    await act(async () => {});
    expect(mocks.save).toHaveBeenLastCalledWith('paper-a', { preset: 'warm-paper', overrides: { ink: `palette:${colorId}` } });
    expect(screen.getByTestId('paper').style.getPropertyValue('--sk-ink')).toBe('#123456');
    fireEvent.click(screen.getByRole('button', { name: '关闭取色器' }));
    fireEvent.click(screen.getByRole('button', { name: '工作台' }));
    await act(async () => {});
    expect(mocks.save).toHaveBeenLastCalledWith('paper-a', { preset: 'workbench', overrides: { ink: `palette:${colorId}` } });
    expect(screen.getByRole('button', { name: '还原正文到套装' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '还原正文到套装' })); await act(async () => {});
    expect(screen.getByTestId('paper').style.getPropertyValue('--sk-ink')).toBe(SKIN_PRESETS.workbench.ink);
    fireEvent.click(within(screen.getByRole('group', { name: '表头分隔线' })).getByRole('button', { name: '隐藏' })); await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: '全部还原' })); await act(async () => {});
    expect(mocks.save).toHaveBeenLastCalledWith('paper-a', { preset: 'workbench' });
  });

  it('saves the complete resolved appearance, immediately shows and selects Custom, then renames/updates/deletes', async () => {
    render(<Harness initial={{ preset: 'warm-paper', overrides: { ink: '#123456' }, components: { headerRule: 'hidden' } }} />);
    fireEvent.click(screen.getByRole('button', { name: '存为套装…' }));
    const dialog = screen.getByRole('dialog', { name: '存为套装' });
    expect(within(dialog).getByRole('button', { name: '保存' }).hasAttribute('disabled')).toBe(true);
    expect(dialog.querySelector('[data-skin-sample]')).toBeTruthy();
    fireEvent.change(within(dialog).getByRole('textbox', { name: '套装名字' }), { target: { value: '我的阅读' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '存为套装' })).toBeNull());
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/skin-suites', { name: '我的阅读', tokens: { ...SKIN_PRESETS['warm-paper'], ink: '#123456' }, components: { ...SKIN_PRESET_COMPONENTS['warm-paper'], headerRule: 'hidden' }, materialPreset: 'warm-paper' });
    const custom = within(screen.getByRole('region', { name: 'Custom 套装' })).getByRole('button', { name: '我的阅读' });
    expect(custom.getAttribute('aria-pressed')).toBe('true');
    expect(mocks.save).toHaveBeenLastCalledWith('paper-a', { preset: `suite:${suiteId}` });
    fireEvent.contextMenu(custom, { clientX: 100, clientY: 120 });
    fireEvent.click(screen.getByRole('menuitem', { name: '更新套装为当前样子' }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledOnce());
    expect(mocks.patch.mock.calls[0][1]).toEqual({ tokens: { ...SKIN_PRESETS['warm-paper'], ink: '#123456' }, components: { ...SKIN_PRESET_COMPONENTS['warm-paper'], headerRule: 'hidden' }, materialPreset: 'warm-paper' });
    await waitFor(() => expect(screen.getByRole('button', { name: '存为套装…' }).hasAttribute('disabled')).toBe(false));
    fireEvent.contextMenu(screen.getByRole('button', { name: '阅读套装' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }));
    fireEvent.change(screen.getByRole('textbox', { name: '套装名字' }), { target: { value: '长文阅读' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '重命名套装' })).toBeNull());
    expect(mocks.patch).toHaveBeenLastCalledWith(`/skin-suites/${suiteId}`, { name: '长文阅读' });
    fireEvent.contextMenu(screen.getByRole('button', { name: '长文阅读' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '删除套装' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '长文阅读' })).toBeNull());
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(`/skin-suites/${suiteId}`);
  });

  it('暖纸保存切换删除后完整外观不变', async () => {
    mocks.remove.mockImplementation(async () => ({ data: { ...useSkinSuiteStore.getState().suites[0], palette: {} } }));
    render(<Harness initial={{ preset: 'warm-paper', overrides: { ink: '#123456' }, components: { headerRule: 'hidden' } }} />);
    await act(async () => {});
    const paper = screen.getByTestId('paper');
    const original = paper.getAttribute('style');
    const expectWarm = () => {
      expect(paper.getAttribute('style')).toBe(original);
      expect(paper.dataset.noteSkinPreset).toBe('warm-paper');
    };
    fireEvent.click(screen.getByRole('button', { name: '存为套装…' }));
    fireEvent.change(screen.getByRole('textbox', { name: '套装名字' }), { target: { value: '暖纸副本' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '存为套装' })).toBeNull());
    expectWarm();
    const custom = screen.getByRole('button', { name: '暖纸副本' });
    expect(custom.querySelector<HTMLElement>('[data-skin-sample]')?.dataset.skinSampleMaterial).toBe('warm-paper');
    const writes = mocks.save.mock.calls.length;
    vi.useFakeTimers();
    fireEvent.mouseEnter(screen.getByRole('button', { name: '工作台' }));
    act(() => vi.advanceTimersByTime(300));
    expect(paper.dataset.noteSkinPreset).toBe('workbench');
    expect(paper.style.getPropertyValue('--paper-material-shadow')).toBe('initial');
    expect(mocks.save).toHaveBeenCalledTimes(writes);
    fireEvent.mouseLeave(screen.getByRole('button', { name: '工作台' }));
    expectWarm();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: '静墨' }));
    await act(async () => {});
    expect(paper.dataset.noteSkinPreset).toBe('quiet-ink');
    fireEvent.click(custom);
    await act(async () => {});
    expectWarm();
    fireEvent.contextMenu(custom);
    fireEvent.click(screen.getByRole('menuitem', { name: '删除套装' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '暖纸副本' })).toBeNull());
    expectWarm();
    fireEvent.click(within(screen.getByRole('group', { name: '表头分隔线' })).getByRole('button', { name: '显示' }));
    await act(async () => {});
    expect(mocks.save.mock.calls[mocks.save.mock.calls.length - 1][1].materialPreset).toBe('warm-paper');
    fireEvent.click(screen.getByRole('button', { name: '工作台' }));
    await act(async () => {});
    expect(paper.dataset.noteSkinPreset).toBe('workbench');
    expect(mocks.save.mock.calls[mocks.save.mock.calls.length - 1][1]).not.toHaveProperty('materialPreset');
  });

  it('更新套装自动替换当前材质谱系', async () => {
    const suite = fixtureSuite();
    useSkinSuiteStore.setState({ suites: [suite], values: { [suite.id]: suite } });
    render(<Harness initial={{ preset: 'workbench' }} />);
    fireEvent.contextMenu(screen.getByRole('button', { name: '阅读套装' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '更新套装为当前样子' }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledOnce());
    expect(mocks.patch.mock.calls[0][1].materialPreset).toBe('workbench');
    await waitFor(() => expect(screen.getByRole('button', { name: '存为套装…' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '阅读套装' }));
    await act(async () => {});
    expect(screen.getByTestId('paper').dataset.noteSkinPreset).toBe('workbench');
  });
});
