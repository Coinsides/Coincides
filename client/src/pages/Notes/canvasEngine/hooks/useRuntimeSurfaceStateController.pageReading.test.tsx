import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRuntimeSurfaceStateController } from './useRuntimeSurfaceStateController';

function animationFrames() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  const request = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    pending.set(id, callback);
    return id;
  });
  const cancel = vi.fn((id: number) => { pending.delete(id); });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return {
    request,
    cancel,
    pending,
    flush: () => act(() => {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(0));
    }),
  };
}

function pageDom() {
  const appMain = document.createElement('main');
  appMain.dataset.appMainScroll = 'true';
  const wrapper = document.createElement('div');
  wrapper.dataset.pageDisplayScale = '0.5';
  const blockList = document.createElement('div');
  wrapper.append(blockList);
  appMain.append(wrapper);
  let committedScrollHeight = 800;
  let committedBlockTop = 100;
  Object.defineProperties(appMain, {
    clientHeight: { value: 600 },
    scrollHeight: { get: () => committedScrollHeight },
  });
  appMain.getBoundingClientRect = () => new DOMRect(0, 40, 1000, 600);
  blockList.getBoundingClientRect = () => new DOMRect(0, committedBlockTop, 380, committedScrollHeight);
  const scroll = vi.fn((options?: ScrollToOptions | number, y?: number) => {
    // Model the browser's scroll-range clamp so an early focus would fail this test.
    const top = typeof options === 'number' ? y || 0 : options?.top || 0;
    appMain.scrollTop = Math.min(top, appMain.scrollHeight - appMain.clientHeight);
  });
  appMain.scrollTo = scroll;
  return {
    appMain,
    blockList,
    scroll,
    commitTallerPage: () => { committedScrollHeight = 3000; committedBlockTop = 180; },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('page reading programmatic focus scheduling', () => {
  it('waits for the taller page DOM before scrolling and preserves reading gear, step and canvas viewport', () => {
    const raf = animationFrames();
    const dom = pageDom();
    const { result } = renderHook(() => useRuntimeSurfaceStateController({ noteId: 'note-a' }));
    result.current.blockListRef.current = dom.blockList;
    act(() => {
      result.current.setPageReadingGear('physical');
      result.current.nudgePageReadingStep(1);
      result.current.nudgePageReadingStep(1);
    });
    const beforeViewport = result.current.viewportTransform;

    act(() => result.current.focusViewportOnRect({ x: 0, y: 2200, width: 300, height: 100 }));
    expect(raf.pending.size).toBe(1);
    expect(dom.scroll).not.toHaveBeenCalled();
    expect(dom.appMain.scrollTop).toBe(0);

    dom.commitTallerPage();
    raf.flush();

    // Uses committed block top 180 and scale .5: 180 - 40 + 2200*.5 - 24.
    expect(dom.scroll).toHaveBeenCalledExactlyOnceWith({ top: 1216, left: 0, behavior: 'auto' });
    expect(dom.appMain.scrollTop).toBe(1216);
    expect(result.current.pageReadingViewState).toEqual({ gear: 'physical', stepFactor: 1.2 });
    expect(result.current.viewportTransform).toEqual(beforeViewport);
  });

  it('cancels pending page focus on note changes and preserves it after a retired mode toggle', () => {
    const raf = animationFrames();
    const dom = pageDom();
    const subject = renderHook(({ noteId }) => useRuntimeSurfaceStateController({ noteId }), {
      initialProps: { noteId: 'note-a' },
    });
    subject.result.current.blockListRef.current = dom.blockList;
    const target = { x: 0, y: 800, width: 300, height: 100 };

    act(() => subject.result.current.focusViewportOnRect(target));
    const firstId = [...raf.pending.keys()][0];
    subject.rerender({ noteId: 'note-b' });
    expect(raf.cancel).toHaveBeenCalledWith(firstId);
    expect(raf.pending.size).toBe(0);
    raf.flush();
    expect(dom.scroll).not.toHaveBeenCalled();

    act(() => subject.result.current.focusViewportOnRect(target));
    const secondId = [...raf.pending.keys()][0];
    act(() => subject.result.current.toggleSurfaceMode());
    expect(subject.result.current.surfaceMode).toBe('page');
    expect(raf.cancel).not.toHaveBeenCalledWith(secondId);
    expect(raf.pending.size).toBe(1);
    raf.flush();
    expect(dom.scroll).toHaveBeenCalledTimes(1);
  });

  it('keeps page focus scheduled and reading state untouched after a retired toggle', () => {
    const raf = animationFrames();
    const dom = pageDom();
    const { result } = renderHook(() => useRuntimeSurfaceStateController({ noteId: 'note-a' }));
    result.current.blockListRef.current = dom.blockList;
    act(() => result.current.setPageReadingGear('fit_page'));
    act(() => result.current.toggleSurfaceMode());
    const world = { origin: { x: 0, y: 0 }, width: 8000, height: 8000 };
    act(() => result.current.setViewportSize(1000, 800, world));
    const beforeZoom = result.current.viewportTransform.zoom;

    act(() => result.current.focusViewportOnRect({ x: 3000, y: 2400, width: 200, height: 160 }, world));

    expect(result.current.viewportTransform).toMatchObject({ x: 0, y: 0, zoom: beforeZoom });
    expect(raf.request).toHaveBeenCalledTimes(1);
    expect(dom.scroll).not.toHaveBeenCalled();
    expect(result.current.pageReadingViewState).toEqual({ gear: 'fit_page', stepFactor: 1 });
  });
});
