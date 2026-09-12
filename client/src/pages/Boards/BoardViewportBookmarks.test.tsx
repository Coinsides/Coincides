import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardViewportBookmark } from '@shared/types/boardViewportBookmarks';
import { BoardViewportBookmarks } from './BoardViewportBookmarks';
import type { BoardViewport } from './boardTypes';

// Exercise the production component and repository; only HTTP transport is synthetic.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));
const path = '/boards/board-a/viewport-bookmarks';
const date = '2026-09-11T12:00:00.000Z';
const bookmark = (id: string, name: string, input: Partial<BoardViewportBookmark> = {}): BoardViewportBookmark => ({
  id, board_id: 'board-a', user_id: 'user-a', name, x: -124.5, y: 86.25, zoom: 0.375, created_at: date, ...input,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
let entries: BoardViewportBookmark[];
const response = <T,>(data: T) => ({ data: structuredClone(data) });
const currentViewport = () => ({ x: 100, y: -200, zoom: 1.25 });
const rail = () => screen.getByRole('complementary', { name: 'Viewport bookmarks' });
const jumpNames = () => within(rail()).queryAllByRole('button', { name: /^Go to / }).map((button) => button.getAttribute('aria-label'));
const ready = () => waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save current viewport' }).disabled).toBe(false));
function enterName(name: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Bookmark name' }), { target: { value: name } });
}
function open(boardId = 'board-a', getViewport = currentViewport, onJump = vi.fn()) {
  return render(<BoardViewportBookmarks boardId={boardId} getViewport={getViewport} onJump={onJump} />);
}

beforeEach(() => {
  vi.resetAllMocks();
  entries = [];
  http.get.mockImplementation(async () => response({ bookmarks: entries }));
  http.post.mockImplementation(async (_url: string, input: { name: string } & BoardViewport) => {
    const added = bookmark(`added-${entries.length}`, input.name, input);
    entries.push(added);
    return response({ bookmark: added });
  });
  http.patch.mockImplementation(async (url: string, input: { name: string }) => {
    const updated = entries.find(({ id }) => url.endsWith(`/${id}`))!;
    updated.name = input.name;
    return response({ bookmark: updated });
  });
  http.delete.mockImplementation(async (url: string) => {
    entries = entries.filter(({ id }) => !url.endsWith(`/${id}`));
    return response({});
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('B4v personal viewport bookmark rail', () => {
  it('waits for loading, retains creation order and jumps with the exact saved camera', async () => {
    const held = deferred<{ data: { bookmarks: BoardViewportBookmark[] } }>();
    entries = [bookmark('first', 'Zebra'), bookmark('second', 'Apple', { x: 999, zoom: 2 })];
    http.get.mockReturnValueOnce(held.promise);
    const onJump = vi.fn();
    open('board-a', currentViewport, onJump);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save current viewport' }).disabled).toBe(true);
    expect(rail().getAttribute('aria-busy')).toBe('true');
    await act(async () => held.resolve(response({ bookmarks: entries })));
    await ready();
    expect(http.get).toHaveBeenCalledWith(path);
    expect(jumpNames()).toEqual(['Go to Zebra', 'Go to Apple']);
    expect(rail().querySelector('[draggable="true"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Zebra' }));
    expect(onJump).toHaveBeenCalledExactlyOnceWith({ x: -124.5, y: 86.25, zoom: 0.375 });
    expect(http.post).not.toHaveBeenCalled();
    expect(http.patch).not.toHaveBeenCalled();
  });

  it('captures when Save current viewport is clicked, then creates, renames and deletes without changing order', async () => {
    entries = [bookmark('first', 'Zebra')];
    const live = { x: 113.5, y: -48.25, zoom: 0.625 };
    const getViewport = vi.fn(() => live);
    open('board-a', getViewport);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    Object.assign(live, { x: 700, y: 850, zoom: 3 });
    enterName('  Apple  ');
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    await screen.findByRole('button', { name: 'Go to Apple' });
    expect(getViewport).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledExactlyOnceWith(path, { name: 'Apple', x: 113.5, y: -48.25, zoom: 0.625 });
    expect(jumpNames()).toEqual(['Go to Zebra', 'Go to Apple']);
    fireEvent.click(screen.getByRole('button', { name: 'Rename bookmark Zebra' }));
    enterName('  Beginning  ');
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await screen.findByRole('button', { name: 'Go to Beginning' });
    expect(http.patch).toHaveBeenCalledExactlyOnceWith(`${path}/first`, { name: 'Beginning' });
    expect(jumpNames()).toEqual(['Go to Beginning', 'Go to Apple']);
    expect(entries[0]).toMatchObject({ x: -124.5, y: 86.25, zoom: 0.375, created_at: date });
    fireEvent.click(screen.getByRole('button', { name: 'Delete bookmark Beginning' }));
    await waitFor(() => expect(jumpNames()).toEqual(['Go to Apple']));
    expect(http.delete).toHaveBeenCalledExactlyOnceWith(`${path}/first`);
  });

  it('retains the submitted name and camera when persistence fails, allowing a retry', async () => {
    const live = { x: 72, y: -13, zoom: 0.75 };
    http.post.mockRejectedValueOnce(new Error('offline'));
    open('board-a', () => live);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    enterName('Chapter two');
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not complete the board action. Try again.');
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Bookmark name' }).value).toBe('Chapter two');
    expect(jumpNames()).toEqual([]);
    live.x = 900;
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    await screen.findByRole('button', { name: 'Go to Chapter two' });
    expect(http.post.mock.calls).toEqual([
      [path, { name: 'Chapter two', x: 72, y: -13, zoom: 0.75 }],
      [path, { name: 'Chapter two', x: 72, y: -13, zoom: 0.75 }],
    ]);
  });

  it('returns focus to the renamed bookmark jump button after saving its name', async () => {
    entries = [bookmark('first', 'Original')];
    open(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Rename bookmark Original' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Bookmark name' }));
    enterName('Renamed');
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    const jump = await screen.findByRole('button', { name: 'Go to Renamed' });
    await waitFor(() => expect(document.activeElement).toBe(jump));
    expect(screen.queryByRole('textbox', { name: 'Bookmark name' })).toBeNull();
  });

  it('returns focus to Save current viewport after a pending deletion completes', async () => {
    entries = [bookmark('first', 'Remove me')];
    const deletion = deferred<{ data: object }>();
    http.delete.mockReturnValueOnce(deletion.promise);
    open(); await ready();
    const remove = screen.getByRole('button', { name: 'Delete bookmark Remove me' });
    const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save current viewport' });
    remove.focus();
    fireEvent.click(remove);
    expect(save.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Go to Remove me' })).toBeTruthy();
    await act(async () => deletion.resolve(response({})));
    await waitFor(() => expect(document.activeElement).toBe(save));
    expect(save.disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Go to Remove me' })).toBeNull();
  });

  it('keeps existing entries on rename or delete failure', async () => {
    entries = [bookmark('first', 'Original')];
    http.patch.mockRejectedValueOnce(new Error('offline'));
    http.delete.mockRejectedValueOnce(new Error('offline'));
    open(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Rename bookmark Original' }));
    enterName('New name');
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await screen.findByRole('alert');
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Bookmark name' }).value).toBe('New name');
    expect(jumpNames()).toEqual(['Go to Original']);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete bookmark Original' }));
    await screen.findByRole('alert');
    expect(jumpNames()).toEqual(['Go to Original']);
  });

  it('shows a readable 24-bookmark limit and can create after deleting one', async () => {
    entries = Array.from({ length: 24 }, (_, index) => bookmark(`b-${index}`, `Chapter ${index + 1}`));
    open(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    expect(screen.getByRole('alert').textContent).toContain('All 24 bookmarks are in use. Delete a bookmark to save another view.');
    expect(screen.queryByRole('textbox', { name: 'Bookmark name' })).toBeNull();
    expect(http.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete bookmark Chapter 1' }));
    await waitFor(() => expect(jumpNames()).toHaveLength(23));
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    enterName('Replacement');
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    await screen.findByRole('button', { name: 'Go to Replacement' });
    expect(jumpNames()).toHaveLength(24);
  });

  it('explains a server limit response without discarding the draft', async () => {
    http.post.mockRejectedValueOnce({ response: { status: 409, data: { error: 'board_viewport_bookmark_limit_reached' } } });
    open(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    enterName('Awaiting space');
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    expect((await screen.findByRole('alert')).textContent).toContain('All 24 bookmarks are in use');
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Bookmark name' }).value).toBe('Awaiting space');
    expect(jumpNames()).toEqual([]);
  });

  it('keeps blank names unsaved and accepts a 32-character name', async () => {
    open(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Bookmark name' });
    expect(input.maxLength).toBe(32);
    enterName('   ');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save bookmark' }).disabled).toBe(true);
    expect(http.post).not.toHaveBeenCalled();
    enterName('章'.repeat(32));
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    await screen.findByRole('button', { name: `Go to ${'章'.repeat(32)}` });
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('reloads after a list failure', async () => {
    entries = [bookmark('first', 'Recovered')];
    http.get.mockRejectedValueOnce(new Error('offline'));
    open();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload bookmarks' }));
    await screen.findByRole('button', { name: 'Go to Recovered' });
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ignores a previous board list response after switching boards', async () => {
    const oldList = deferred<{ data: { bookmarks: BoardViewportBookmark[] } }>();
    http.get.mockReturnValueOnce(oldList.promise).mockResolvedValueOnce(response({ bookmarks: [bookmark('new', 'New board', { board_id: 'board-b' })] }));
    const view = open();
    view.rerender(<BoardViewportBookmarks boardId="board-b" getViewport={currentViewport} onJump={vi.fn()} />);
    await screen.findByRole('button', { name: 'Go to New board' });
    await act(async () => oldList.resolve(response({ bookmarks: [bookmark('old', 'Old board')] })));
    expect(jumpNames()).toEqual(['Go to New board']);
  });

  it('resets a previous board editor and ignores its delayed create response', async () => {
    const oldCreate = deferred<{ data: { bookmark: BoardViewportBookmark } }>();
    http.post.mockReturnValueOnce(oldCreate.promise);
    const view = open(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Save current viewport' }));
    enterName('Old draft');
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    view.rerender(<BoardViewportBookmarks boardId="board-b" getViewport={currentViewport} onJump={vi.fn()} />);
    await ready();
    expect(screen.queryByRole('textbox', { name: 'Bookmark name' })).toBeNull();
    await act(async () => oldCreate.resolve(response({ bookmark: bookmark('old', 'Old draft') })));
    expect(jumpNames()).toEqual([]);
    expect(http.get).toHaveBeenLastCalledWith('/boards/board-b/viewport-bookmarks');
  });
});
