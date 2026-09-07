import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageReadingViewportController } from './usePageReadingViewportController';

describe('usePageReadingViewportController note scope', () => {
  it('starts at fit_width and preserves manual stepping when switching gears', () => {
    const { result } = renderHook(() => usePageReadingViewportController({ noteId: 'note-a' }));
    expect(result.current.pageReadingViewState).toEqual({ gear: 'fit_width', stepFactor: 1 });

    act(() => result.current.nudgePageReadingStep(1));
    act(() => result.current.setPageReadingGear('physical'));
    expect(result.current.pageReadingViewState).toEqual({ gear: 'physical', stepFactor: 1.1 });
    act(() => result.current.setPageReadingGear('fit_page'));
    expect(result.current.pageReadingViewState).toEqual({ gear: 'fit_page', stepFactor: 1.1 });
    act(() => result.current.resetPageReadingView());
    expect(result.current.pageReadingViewState).toEqual({ gear: 'fit_width', stepFactor: 1 });
  });

  it('resets across same-instance A→B→A navigation without exposing old-note state in any render', () => {
    const renders: Array<{ noteId: string; gear: string; stepFactor: number }> = [];
    const subject = renderHook(({ noteId }) => {
      const controller = usePageReadingViewportController({ noteId });
      renders.push({ noteId, ...controller.pageReadingViewState });
      return controller;
    }, { initialProps: { noteId: 'note-a' } });

    act(() => subject.result.current.setPageReadingGear('physical'));
    act(() => subject.result.current.nudgePageReadingStep(-1));
    renders.length = 0;
    subject.rerender({ noteId: 'note-b' });
    expect(renders.every((render) => render.noteId === 'note-b' && render.gear === 'fit_width' && render.stepFactor === 1)).toBe(true);

    act(() => subject.result.current.setPageReadingGear('fit_page'));
    renders.length = 0;
    subject.rerender({ noteId: 'note-a' });
    expect(renders.every((render) => render.noteId === 'note-a' && render.gear === 'fit_width' && render.stepFactor === 1)).toBe(true);
  });

  it('keeps the same note state on unrelated rerenders and discards it on unmount', () => {
    const first = renderHook(() => usePageReadingViewportController({ noteId: 'note-a' }));
    act(() => first.result.current.setPageReadingGear('physical'));
    first.rerender();
    expect(first.result.current.pageReadingViewState.gear).toBe('physical');
    first.unmount();

    const second = renderHook(() => usePageReadingViewportController({ noteId: 'note-a' }));
    expect(second.result.current.pageReadingViewState).toEqual({ gear: 'fit_width', stepFactor: 1 });
  });
});
