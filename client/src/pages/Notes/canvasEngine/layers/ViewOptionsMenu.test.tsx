import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFloatingOverlayController } from '../hooks/useFloatingOverlayController';
import { useRuntimeSurfaceStateController } from '../hooks/useRuntimeSurfaceStateController';
import { ViewOptionsMenu } from './ViewOptionsMenu';

afterEach(cleanup);

function ViewFixture({ disabled = false }: { disabled?: boolean }) {
  const surface = useRuntimeSurfaceStateController({ noteId: 'synthetic-view-options-note' });
  return <>
    <ViewOptionsMenu open={surface.showViewOptions} disabled={disabled}
      activeGear={surface.pageReadingViewState.gear}
      onToggle={surface.toggleViewOptions} onClose={surface.closeOverlay}
      onSelect={surface.setPageReadingGear} />
    <output data-reading-state="true">{JSON.stringify(surface.pageReadingViewState)}</output>
    <button type="button">Outside</button>
  </>;
}

describe('page view options menu', () => {
  it('collapses the three labels behind one named icon and applies each existing reading gear with a check', () => {
    const view = render(<ViewFixture />);
    const trigger = view.getByRole('button', { name: 'View options' });
    expect(trigger.title).toBe('View options');
    expect(view.queryByRole('menu')).toBeNull();
    expect(view.queryByText('Fit width')).toBeNull();
    for (const [gear, label] of [['fit_page', 'Fit page'], ['physical', '100% physical'], ['fit_width', 'Fit width']]) {
      fireEvent.click(trigger);
      expect(view.getAllByRole('menuitemradio')).toHaveLength(3);
      fireEvent.click(view.getByRole('menuitemradio', { name: label }));
      expect(view.queryByRole('menu')).toBeNull();
      expect(view.container.querySelector('[data-reading-state]')?.textContent).toBe(JSON.stringify({ gear, stepFactor: 1 }));
      expect(document.activeElement).toBe(trigger);
      fireEvent.click(trigger);
      const selected = view.getByRole('menuitemradio', { name: label });
      expect(selected.getAttribute('aria-checked')).toBe('true');
      expect(selected.querySelector('svg')).not.toBeNull();
      expect(view.getAllByRole('menuitemradio').filter((item) => item.getAttribute('aria-checked') === 'true')).toHaveLength(1);
      fireEvent.click(trigger);
    }
  });

  it('supports arrow navigation and Escape without selecting a different gear', () => {
    const view = render(<ViewFixture />);
    const trigger = view.getByRole('button', { name: 'View options' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = view.getByRole('menu', { name: 'View options' });
    expect(document.activeElement).toBe(view.getByRole('menuitemradio', { name: 'Fit width' }));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(view.getByRole('menuitemradio', { name: 'Fit page' }));
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(view.getByRole('menuitemradio', { name: '100% physical' }));
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(view.getByRole('menuitemradio', { name: 'Fit width' }));
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(view.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(view.container.querySelector('[data-reading-state]')?.textContent).toBe('{"gear":"fit_width","stepFactor":1}');
  });

  it('dismisses on outside pointer or focus without changing the reading gear', () => {
    const view = render(<ViewFixture />);
    const trigger = view.getByRole('button', { name: 'View options' });
    fireEvent.click(trigger);
    fireEvent.pointerDown(view.getByRole('button', { name: 'Outside' }));
    expect(view.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.blur(view.getByRole('menu'), { relatedTarget: view.getByRole('button', { name: 'Outside' }) });
    expect(view.queryByRole('menu')).toBeNull();
  });

  it('keeps the view control unavailable while overview is active and dismisses its open menu', () => {
    const view = render(<ViewFixture />);
    fireEvent.click(view.getByRole('button', { name: 'View options' }));
    expect(view.queryByRole('menu')).not.toBeNull();
    view.rerender(<ViewFixture disabled />);
    expect((view.getByRole('button', { name: 'View options' }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.queryByRole('menu')).toBeNull();
    view.rerender(<ViewFixture />);
    expect(view.getByRole('button', { name: 'View options' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('shares one mutually exclusive overlay state in both directions with all existing panels', () => {
    const setInteractionState = vi.fn();
    const { result } = renderHook(() => useFloatingOverlayController({ setInteractionState }));
    const panels = [
      ['openLayoutPanel', 'showLayoutPanel'],
      ['toggleNoteInfo', 'showNoteInfo'],
      ['toggleMoreActions', 'showMoreActions'],
      ['openBlockTrash', 'showBlockTrash'],
      ['toggleExportPreview', 'showExportPreview'],
    ] as const;
    for (const [open, shown] of panels) {
      act(() => result.current[open]());
      expect(result.current[shown]).toBe(true);
      act(() => result.current.toggleViewOptions());
      expect(result.current.showViewOptions).toBe(true);
      expect(result.current[shown]).toBe(false);
      expect(setInteractionState).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'openingMenu', panel: 'viewOptions' }));
      act(() => result.current[open]());
      expect(result.current[shown]).toBe(true);
      expect(result.current.showViewOptions).toBe(false);
      act(() => result.current.closeOverlay());
    }
    act(() => result.current.toggleViewOptions());
    act(() => result.current.toggleViewOptions());
    expect(result.current.showViewOptions).toBe(false);
    expect(setInteractionState).toHaveBeenLastCalledWith({ mode: 'idle', target: 'surface' });
  });
});
