import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentUiStore } from '@/stores/agentUiStore';
import { documentKey, useDocumentTabsStore } from '@/stores/documentTabsStore';
import type { SourcePageRegister } from '@/pages/Sources/sourceApi';
import { useSourcePageViewController, type SourcePageViewController } from '../hooks/useSourcePageViewController';
import { SourcePageJumpProvider } from '../SourcePageJumpContext';
import { BlockSourceReferenceLayer } from './BlockSourceReferenceLayer';
import { NoteSourcePagesLayer } from './NoteSourcePagesLayer';

const api = vi.hoisted(() => ({ read: vi.fn(), generate: vi.fn() }));
vi.mock('@/pages/Sources/sourceApi', () => ({
  getSourcePagesByProjectionNote: api.read,
  generateSourcePages: api.generate,
}));
vi.mock('../hooks/useMediaImageAsset', () => ({
  useMediaImageAsset: (assetId: string) => ({ read: { status: 'loaded', url: `blob:${assetId}` }, onError: vi.fn() }),
}));

const page = (page_number: number) => ({
  page_number, asset_id: `asset-${page_number}`, image_width: 1240, image_height: 1754, pdf_width: 595, pdf_height: 842,
});
const register = (input: Partial<SourcePageRegister> = {}): SourcePageRegister => ({
  source_id: 'source', supported: true, status: 'complete', expected: 0, completed: 0, failed_pages: [], pages: [], ...input,
});
const complete = (count: number) => register({
  expected: count, completed: count, pages: Array.from({ length: count }, (_, index) => page(index + 1)),
});

function view(input: Partial<SourcePageViewController> = {}): SourcePageViewController {
  return {
    noteId: 'note', available: true, active: true, textAvailable: true, register: complete(3), loadFailed: false, jump: null,
    generating: false, generateFailed: false, initialPage: () => 1, setMode: vi.fn(), jumpToPage: vi.fn(), clearJump: vi.fn(),
    rememberPage: vi.fn(), takeTextScroll: () => null, generate: vi.fn(), reload: vi.fn(), ...input,
  };
}

beforeEach(() => {
  api.read.mockReset();
  api.generate.mockReset();
  useAgentUiStore.setState({ pending: null, focusCommand: null });
  useDocumentTabsStore.getState().reset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('original page view', () => {
  it('draws only the pages near the viewport, in order', () => {
    const { container } = render(<NoteSourcePagesLayer view={view({ register: complete(40) })} />);
    const shells = container.querySelectorAll('[data-source-page-number]');
    expect(shells).toHaveLength(40);
    expect(shells[0].getAttribute('data-source-page-number')).toBe('1');
    const images = container.querySelectorAll('[data-source-page-number] img');
    expect(images.length).toBeGreaterThan(0);
    expect(images.length).toBeLessThan(40);
    expect(images[0].getAttribute('src')).toBe('blob:asset-1');
  });

  it('shows missing pages as generating and failed pages as failed', () => {
    const { container } = render(<NoteSourcePagesLayer view={view({
      register: register({ status: 'partial', expected: 3, completed: 1, pages: [page(1)] }),
    })} />);
    expect(container.querySelector('[data-source-page-number="2"]')?.textContent).toContain('sourcePages.pageGenerating');
    expect(container.querySelector('[data-source-pages-progress]')).not.toBeNull();
    cleanup();
    const failed = render(<NoteSourcePagesLayer view={view({
      register: register({ status: 'failed', expected: 2, completed: 1, failed_pages: [2], pages: [page(1)] }),
    })} />);
    expect(failed.container.querySelector('[data-source-page-number="2"]')?.textContent).toContain('sourcePages.pageFailed');
    expect(failed.container.querySelector('[data-source-pages-generate]')).not.toBeNull();
  });

  it('an image Source shows its page with no text switch, and still offers generate when it has no page yet', () => {
    const image = register({ text_view: false, expected: 1, completed: 1, pages: [{ ...page(1), image_width: 300, image_height: 200 }] });
    const shown = render(<NoteSourcePagesLayer view={view({ register: image, textAvailable: false })} />);
    expect(shown.container.querySelector('[data-source-view-toggle]')).toBeNull();
    const article = shown.container.querySelector<HTMLElement>('[data-source-page-number="1"]')!;
    // A small picture keeps its own pixels instead of filling the page width.
    expect(article.style.width).toBe('300px');
    expect(article.style.height).toBe('200px');
    shown.unmount();
    const generate = vi.fn();
    const old = render(<NoteSourcePagesLayer view={view({ register: register({ text_view: false, status: 'none' }), textAvailable: false, generate })} />);
    expect(old.container.querySelector('[data-source-view-toggle]')).toBeNull();
    old.container.querySelector<HTMLButtonElement>('[data-source-pages-generate]')!.click();
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('offers the generate entry to a PDF without images', () => {
    const generate = vi.fn();
    const { container } = render(<NoteSourcePagesLayer view={view({ register: register({ status: 'none' }), generate })} />);
    expect(container.querySelector('[data-source-pages-none]')).not.toBeNull();
    fireEvent.click(container.querySelector('[data-source-pages-generate]')!);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('answers a page focus for this note and leaves other commands alone', () => {
    const jumpToPage = vi.fn();
    const { container } = render(<NoteSourcePagesLayer view={view({ jumpToPage })} />);
    const focus = (note_id: string, page_index: number) => ({
      kind: 'focus_object' as const, command_id: 'c', turn_id: 't', conversation_id: 'x',
      target: { type: 'note_page' as const, note_id, page_index },
    });
    act(() => useAgentUiStore.setState({ focusCommand: focus('other', 1) }));
    expect(jumpToPage).not.toHaveBeenCalled();
    expect(useAgentUiStore.getState().focusCommand).not.toBeNull();
    act(() => useAgentUiStore.setState({ focusCommand: focus('note', 1) }));
    expect(jumpToPage).toHaveBeenCalledWith(2);
    expect(useAgentUiStore.getState().focusCommand).toBeNull();
    expect(container.querySelector('[data-source-page-number="2"]')?.getAttribute('data-agent-ui-highlight')).toBe('true');
  });
});

describe('failure states', () => {
  it('offers a retry for a failed run that names no pages, and words its pages as failed', () => {
    const generate = vi.fn();
    const { container } = render(<NoteSourcePagesLayer view={view({ generate,
      register: register({ status: 'failed', expected: 2, completed: 1, failed_pages: [], pages: [page(1)] }),
    })} />);
    expect(screen.getByRole('alert').textContent).toBe('sourcePages.failedTitle');
    expect(container.querySelector('[data-source-page-number="2"]')?.textContent).toContain('sourcePages.pageFailed');
    fireEvent.click(container.querySelector('[data-source-pages-generate]')!);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('reports a failed retry from the header', () => {
    render(<NoteSourcePagesLayer view={view({ generateFailed: true,
      register: register({ status: 'failed', expected: 2, completed: 1, failed_pages: [2], pages: [page(1)] }),
    })} />);
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain('sourcePages.generateFailed');
  });

  it('keeps pages on screen and offers a refresh when loading has given up', () => {
    const reload = vi.fn();
    const { container } = render(<NoteSourcePagesLayer view={view({ loadFailed: true, reload,
      register: register({ status: 'partial', expected: 2, completed: 1, pages: [page(1)] }),
    })} />);
    expect(screen.getByRole('alert').textContent).toBe('sourcePages.loadFailed');
    expect(container.querySelectorAll('[data-source-page-number]')).toHaveLength(2);
    fireEvent.click(container.querySelector('[data-source-pages-reload]')!);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('original pages as the default reading view', () => {
  const stored = () => useDocumentTabsStore.getState().tabs.find((tab) => tab.key === documentKey('note', 'note'))?.sourceView;
  const openHook = () => {
    useDocumentTabsStore.getState().open({ kind: 'note', id: 'note', title: 'Note' });
    return renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
  };

  it('opens a Source with pages on its pages, and the choice is the tab\'s memory from then on', async () => {
    api.read.mockResolvedValue(complete(3));
    const { result } = openHook();
    await waitFor(() => expect(result.current.active).toBe(true));
    expect(stored()).toEqual({ mode: 'pages', page: 1 });
  });

  it('never overrides a remembered text view, and switching back and forth holds', async () => {
    api.read.mockResolvedValue(complete(3));
    useDocumentTabsStore.getState().open({ kind: 'note', id: 'note', title: 'Note' });
    useDocumentTabsStore.getState().remember(documentKey('note', 'note'), { sourceView: { mode: 'text', page: 2 } });
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.active).toBe(false);
    act(() => result.current.setMode('pages'));
    expect(result.current.active).toBe(true);
    act(() => result.current.setMode('text'));
    expect(result.current.active).toBe(false);
    act(() => result.current.reload());
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.active).toBe(false);
  });

  it('leaves the reader in the text once they chose it, even as a later reload brings pages', async () => {
    api.read.mockResolvedValue(complete(3));
    const { result } = openHook();
    await waitFor(() => expect(result.current.active).toBe(true));
    act(() => result.current.setMode('text'));
    act(() => result.current.reload());
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.active).toBe(false);
    expect(stored()?.mode).toBe('text');
  });

  it('stays in the text with no pages, unsupported or failed, and writes no memory', async () => {
    for (const next of [
      register({ status: 'none' }),
      register({ supported: false, status: 'none' }),
      register({ status: 'failed', expected: 2 }),
    ]) {
      useDocumentTabsStore.getState().reset();
      api.read.mockResolvedValue(next);
      const { result, unmount } = openHook();
      await waitFor(() => expect(result.current.register).not.toBeNull());
      expect(result.current.active).toBe(false);
      expect(stored()).toBeUndefined();
      unmount();
    }
  });

  it('moves to the pages when the first one arrives, if the reader has not moved', async () => {
    vi.useFakeTimers();
    api.read.mockResolvedValueOnce(register({ status: 'pending' }))
      .mockResolvedValue(register({ status: 'partial', expected: 3, completed: 1, pages: [page(1)] }));
    const { result } = openHook();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.active).toBe(false);
    expect(stored()).toBeUndefined();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.active).toBe(true);
  });

  it('does not pull away a reader who has scrolled the text while pages were being made', async () => {
    vi.useFakeTimers();
    const main = document.createElement('div');
    main.setAttribute('data-app-main-scroll', 'true');
    document.body.append(main);
    api.read.mockResolvedValueOnce(register({ status: 'pending' }))
      .mockResolvedValue(register({ status: 'partial', expected: 3, completed: 1, pages: [page(1)] }));
    const { result } = openHook();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    main.scrollTop = 300;
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.active).toBe(false);
    expect(stored()?.mode).toBe('text');
    main.remove();
  });

  it('leaves a queued focus request its text too', async () => {
    useAgentUiStore.setState({ pending: { kind: 'focus_object', target: { type: 'note_block', note_id: 'note', block_id: 'b' } } as never });
    api.read.mockResolvedValue(complete(3));
    const { result } = openHook();
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.active).toBe(false);
    expect(stored()?.mode).toBe('text');
  });

  it('leaves a waiting focus request its text', async () => {
    useAgentUiStore.setState({ focusCommand: { kind: 'focus_object', target: { type: 'note_block', note_id: 'note', block_id: 'b' } } as never });
    api.read.mockResolvedValue(complete(3));
    const { result } = openHook();
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.active).toBe(false);
    expect(stored()?.mode).toBe('text');
  });
});

describe('page position', () => {
  const harness = {} as { controller: SourcePageViewController };
  function Harness() {
    const controller = useSourcePageViewController({ noteId: 'note', enabled: true });
    harness.controller = controller;
    return controller.active ? <NoteSourcePagesLayer view={controller} /> : null;
  }
  const memory = () => useDocumentTabsStore.getState().tabs.find((tab) => tab.key === documentKey('note', 'note'))?.sourceView;
  const viewport = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-note-source-pages-viewport]')!;
  const topOf = (container: HTMLElement, number: number) => {
    const height = Number.parseFloat(container.querySelector<HTMLElement>('[data-source-page-number="1"]')!.style.height);
    return (height + 40) * (number - 1) + 24;
  };
  async function open() {
    api.read.mockResolvedValue(complete(12));
    useDocumentTabsStore.getState().open({ kind: 'note', id: 'note', title: 'Note' });
    const rendered = render(<Harness />);
    await waitFor(() => expect(harness.controller.available).toBe(true));
    return rendered;
  }
  const scrollTo = (element: HTMLElement, top: number) => {
    element.scrollTop = top;
    fireEvent.scroll(element);
  };

  it('applies a jump once: after scrolling away and switching views, the scrolled page wins', async () => {
    const { container } = await open();
    act(() => harness.controller.jumpToPage(3));
    expect(harness.controller.jump).toBeNull();
    expect(memory()).toEqual({ mode: 'pages', page: 3 });
    expect(viewport(container).scrollTop).toBeCloseTo(topOf(container, 3));

    const atPage10 = topOf(container, 10);
    act(() => scrollTo(viewport(container), atPage10));
    expect(memory()?.page).toBe(10);

    for (let round = 0; round < 2; round += 1) {
      act(() => harness.controller.setMode('text'));
      expect(container.querySelector('[data-note-source-pages]')).toBeNull();
      act(() => harness.controller.setMode('pages'));
      expect(viewport(container).scrollTop).toBeCloseTo(atPage10);
      expect(memory()).toEqual({ mode: 'pages', page: 10 });
    }
  });

  it('still honours a new jump after that, and one made from the text view', async () => {
    const { container } = await open();
    act(() => harness.controller.setMode('pages'));
    act(() => harness.controller.jumpToPage(4));
    expect(viewport(container).scrollTop).toBeCloseTo(topOf(container, 4));
    act(() => harness.controller.setMode('text'));
    act(() => harness.controller.jumpToPage(6));
    expect(viewport(container).scrollTop).toBeCloseTo(topOf(container, 6));
    expect(memory()?.page).toBe(6);
  });

  it('lands a page past the end on the last page and keeps remembering afterwards', async () => {
    const { container } = await open();
    act(() => harness.controller.jumpToPage(99));
    expect(viewport(container).scrollTop).toBeCloseTo(topOf(container, 12));
    expect(memory()?.page).toBe(12);
    act(() => scrollTo(viewport(container), topOf(container, 3)));
    expect(memory()?.page).toBe(3);
  });

  it('survives a remembered page beyond a Source that has shrunk', async () => {
    useDocumentTabsStore.getState().open({ kind: 'note', id: 'note', title: 'Note' });
    useDocumentTabsStore.getState().remember(documentKey('note', 'note'), { sourceView: { mode: 'pages', page: 30 } });
    api.read.mockResolvedValue(complete(12));
    const { container } = render(<Harness />);
    await waitFor(() => expect(container.querySelectorAll('[data-source-page-number]')).toHaveLength(12));
    await waitFor(() => expect(memory()?.page).toBe(12));
    expect(viewport(container).scrollTop).toBeCloseTo(topOf(container, 12));
  });
});

describe('source strip jump', () => {
  const sources = [{ id: 'with-page', source_page_start: 2 }, { id: 'no-page-image', source_page_start: 9 }];
  const anchor = { id: 'anchor', source_snapshot_id: 's', source_snapshot_page_id: null, anchor_kind: 'page', page_start: 9, page_end: 9, metadata: {} };

  it('prefers the original page, and keeps the old action where only an anchor exists', () => {
    const viewPage = vi.fn();
    const onViewSource = vi.fn();
    const { container } = render(<SourcePageJumpProvider value={{ hasPage: (value) => value === 2, viewPage }}>
      <BlockSourceReferenceLayer sourceReferences={sources} anchorsBySourceRef={{ 'no-page-image': anchor as never }}
        sourceJumpBusy={null} onViewSource={onViewSource} />
    </SourcePageJumpProvider>);
    fireEvent.click(container.querySelector('[data-source-page-jump="2"]')!);
    expect(viewPage).toHaveBeenCalledWith(2);
    expect(container.querySelector('[data-source-page-jump="9"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(onViewSource).toHaveBeenCalledWith('anchor');
  });

  it('shows no action when there is neither a page image nor an anchor, or no provider', () => {
    const { container } = render(<BlockSourceReferenceLayer sourceReferences={sources} anchorsBySourceRef={{}}
      sourceJumpBusy={null} onViewSource={vi.fn()} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});

describe('source page controller', () => {
  it('asks nothing for a note that is not a Source projection', () => {
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: false }));
    expect(api.read).not.toHaveBeenCalled();
    expect(result.current.available).toBe(false);
    expect(result.current.active).toBe(false);
  });

  it('hides the view for a Source without page images', async () => {
    api.read.mockResolvedValue(register({ supported: false, status: 'none' }));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await waitFor(() => expect(result.current.register).not.toBeNull());
    expect(result.current.available).toBe(false);
    act(() => result.current.setMode('pages'));
    expect(result.current.active).toBe(false);
  });

  it('polls while pages are generating, then stops', async () => {
    vi.useFakeTimers();
    api.read.mockResolvedValueOnce(register({ status: 'partial', expected: 2, completed: 1, pages: [page(1)] }))
      .mockResolvedValue(complete(2));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.register?.status).toBe('partial');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.register?.status).toBe('complete');
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(api.read).toHaveBeenCalledTimes(2);
  });

  it('keeps polling through a failed request and finishes normally', async () => {
    vi.useFakeTimers();
    api.read.mockResolvedValueOnce(register({ status: 'partial', expected: 2, completed: 1, pages: [page(1)] }))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(complete(2));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.register?.status).toBe('partial');
    expect(result.current.loadFailed).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.register?.status).toBe('complete');
    expect(result.current.loadFailed).toBe(false);
  });

  it('gives up after repeated failures, keeps what it has, and a refresh starts again', async () => {
    vi.useFakeTimers();
    const partial = register({ status: 'partial', expected: 2, completed: 1, pages: [page(1)] });
    api.read.mockResolvedValueOnce(partial).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(result.current.loadFailed).toBe(true);
    expect(result.current.register).toEqual(partial);
    const calls = api.read.mock.calls.length;
    expect(calls).toBe(7);
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(api.read.mock.calls.length).toBe(calls);

    api.read.mockReset();
    api.read.mockResolvedValue(complete(2));
    act(() => result.current.reload());
    expect(result.current.loadFailed).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.register?.status).toBe('complete');
  });

  it('opens the door with an error when the first load never succeeds', async () => {
    vi.useFakeTimers();
    api.read.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.available).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(result.current.loadFailed).toBe(true);
    expect(result.current.available).toBe(true);
  });

  it('stops at once and offers nothing when the note has no Source', async () => {
    vi.useFakeTimers();
    api.read.mockRejectedValue(Object.assign(new Error('missing'), { response: { status: 404 } }));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(api.read).toHaveBeenCalledTimes(1);
    expect(result.current.available).toBe(false);
    expect(result.current.loadFailed).toBe(false);
    act(() => result.current.setMode('pages'));
    expect(result.current.active).toBe(false);
  });

  it('starts generating from the entry and resumes polling', async () => {
    api.read.mockResolvedValueOnce(register({ status: 'none' })).mockResolvedValue(complete(1));
    api.generate.mockResolvedValue(register({ status: 'pending' }));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await waitFor(() => expect(result.current.register?.status).toBe('none'));
    act(() => result.current.generate());
    expect(api.generate).toHaveBeenCalledWith('source');
    await waitFor(() => expect(result.current.register?.status).toBe('complete'));
    expect(result.current.generating).toBe(false);
  });

  it('reports a failed start without losing the entry', async () => {
    api.read.mockResolvedValue(register({ status: 'none' }));
    api.generate.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useSourcePageViewController({ noteId: 'note', enabled: true }));
    await waitFor(() => expect(result.current.register).not.toBeNull());
    act(() => result.current.generate());
    await waitFor(() => expect(result.current.generateFailed).toBe(true));
    expect(result.current.register?.status).toBe('none');
  });

  it('remembers the view per tab and restores it for that note only', async () => {
    api.read.mockResolvedValue(complete(3));
    const tabs = useDocumentTabsStore.getState();
    tabs.open({ kind: 'note', id: 'a', title: 'A' });
    tabs.open({ kind: 'note', id: 'b', title: 'B' });
    const { result, rerender } = renderHook(({ noteId }) => useSourcePageViewController({ noteId, enabled: true }), { initialProps: { noteId: 'a' } });
    await waitFor(() => expect(result.current.available).toBe(true));
    act(() => result.current.jumpToPage(3));
    expect(result.current.active).toBe(true);
    expect(useDocumentTabsStore.getState().tabs.find((tab) => tab.key === documentKey('note', 'a'))?.sourceView).toEqual({ mode: 'pages', page: 3 });
    tabs.remember(documentKey('note', 'b'), { sourceView: { mode: 'text', page: 1 } });
    rerender({ noteId: 'b' });
    await waitFor(() => expect(result.current.noteId).toBe('b'));
    expect(result.current.active).toBe(false);
    rerender({ noteId: 'a' });
    expect(result.current.active).toBe(true);
    expect(result.current.initialPage()).toBe(3);
  });
});
