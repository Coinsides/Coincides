import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordRecentProject, useRecentProjectIds, useRecordLoadedProject } from './recentProjects';

function Probe() {
  return <output>{useRecentProjectIds().join(',')}</output>;
}

describe('recent projects', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts empty and keeps the real opening order, newest first, without duplicates', () => {
    render(<Probe />);
    expect(screen.getByRole('status').textContent).toBe('');
    act(() => recordRecentProject('a'));
    act(() => recordRecentProject('b'));
    expect(screen.getByRole('status').textContent).toBe('b,a');
    act(() => recordRecentProject('a'));
    expect(screen.getByRole('status').textContent).toBe('a,b');
  });

  it('records a project only once the route\'s own project has loaded', () => {
    render(<Probe />);
    const { rerender } = renderHook(({ route, loaded }) => useRecordLoadedProject(route, loaded), {
      initialProps: { route: 'bad-id' as string | undefined, loaded: undefined as string | undefined },
    });
    expect(screen.getByRole('status').textContent).toBe('');
    rerender({ route: 'b', loaded: 'a' });
    expect(screen.getByRole('status').textContent).toBe('');
    rerender({ route: 'b', loaded: 'b' });
    expect(screen.getByRole('status').textContent).toBe('b');
  });

  it('keeps five', () => {
    render(<Probe />);
    act(() => { for (const id of ['1', '2', '3', '4', '5', '6']) recordRecentProject(id); });
    expect(screen.getByRole('status').textContent).toBe('6,5,4,3,2');
  });

  it('reads as empty when storage throws, on both read and write', () => {
    window.localStorage.setItem('coincides.recentProjects.v1', JSON.stringify([{ id: 'x', opened_at: 'then' }]));
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<Probe />);
    expect(() => recordRecentProject('a')).not.toThrow();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('reads as empty over a malformed record', () => {
    window.localStorage.setItem('coincides.recentProjects.v1', '{not json');
    render(<Probe />);
    expect(screen.getByRole('status').textContent).toBe('');
    window.localStorage.setItem('coincides.recentProjects.v1', JSON.stringify([{ id: 1 }, 'x', null]));
    act(() => recordRecentProject('a'));
    expect(screen.getByRole('status').textContent).toBe('a');
  });
});
