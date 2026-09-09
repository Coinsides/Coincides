import { createRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardNoteModal, { type BoardNoteModalHandle } from './BoardNoteModal';

const runtime = vi.hoisted(() => ({
  dismiss: vi.fn(), idle: vi.fn(), order: [] as string[], mounts: [] as string[], live: 0, peakLive: 0,
}));
vi.mock('../Notes/canvasEngine/NoteCanvasRuntimeProvider', () => ({
  NoteCanvasRuntimeProvider: ({ noteId, hostMode, children }: any) =>
    <section data-testid="runtime-provider" data-note-id={noteId} data-host-mode={hostMode}>{children}</section>,
}));
vi.mock('../Notes/canvasEngine/NoteCanvasRuntime', async () => {
  const React = await import('react');
  return { default: React.forwardRef(function RuntimeProbe(_props: unknown, ref: any) {
    const element = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => ({ dismissTransientUI: runtime.dismiss, flushPendingSaves: runtime.idle }));
    React.useEffect(() => {
      runtime.live += 1; runtime.peakLive = Math.max(runtime.peakLive, runtime.live);
      runtime.mounts.push(element.current!.closest('[data-note-id]')!.getAttribute('data-note-id')!);
      return () => { runtime.live -= 1; };
    }, []);
    return <textarea ref={element} aria-label="Runtime editor" defaultValue="Synthetic note text"
      onBlur={() => runtime.order.push('blur')} />;
  }) };
});

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
type ClosePath = 'X' | 'Escape' | 'switch' | 'full page';
function renderHost() {
  const handle = createRef<BoardNoteModalHandle>();
  const closed = vi.fn();
  const switched = vi.fn();
  const page = vi.fn();
  function Host() {
    const [noteId, setNoteId] = useState<string | null>('note-a');
    return <>
      <span>Board remains mounted</span>
      {noteId && <BoardNoteModal key={noteId} ref={handle} noteId={noteId}
        onClosed={() => { closed(); setNoteId(null); }}
        onSwitchNote={(next) => { switched(next); setNoteId(next); }}
        onOpenFullPage={(next) => { page(next); setNoteId(null); }} />}
    </>;
  }
  return { ...render(<Host />), handle, closed, switched, page };
}
type Host = ReturnType<typeof renderHost>;
function request(path: ClosePath, host: Host) {
  if (path === 'X') fireEvent.click(screen.getByRole('button', { name: 'Close note' }));
  else if (path === 'Escape') fireEvent.keyDown(screen.getByRole('textbox', { name: 'Runtime editor' }), { key: 'Escape' });
  else if (path === 'full page') fireEvent.click(screen.getByRole('button', { name: 'Open full page' }));
  else void host.handle.current!.requestClose({ kind: 'note', noteId: 'note-b' });
}
function expectDestination(path: ClosePath, host: Host) {
  expect(host.closed.mock.calls).toEqual(path === 'X' || path === 'Escape' ? [[]] : []);
  expect(host.switched.mock.calls).toEqual(path === 'switch' ? [['note-b']] : []);
  expect(host.page.mock.calls).toEqual(path === 'full page' ? [['note-a']] : []);
  if (path === 'switch') {
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('runtime-provider').getAttribute('data-note-id')).toBe('note-b');
    expect(runtime.mounts).toEqual(['note-a', 'note-b']);
    expect(runtime.peakLive).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
  } else {
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  runtime.order = []; runtime.mounts = []; runtime.live = 0; runtime.peakLive = 0;
  runtime.dismiss.mockImplementation(() => { runtime.order.push('dismiss'); });
  runtime.idle.mockImplementation(async () => { runtime.order.push('idle'); });
  document.body.style.overflow = 'scroll';
});
afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('Open note modal close protocol', () => {
  it.each<ClosePath>(['X', 'Escape', 'switch', 'full page'])('%s waits for runtime writes before completing its destination', async (path) => {
    const saving = deferred();
    runtime.idle.mockImplementation(() => { runtime.order.push('idle'); return saving.promise; });
    const host = renderHost();
    expect(screen.getByTestId('runtime-provider').getAttribute('data-host-mode')).toBe('modal');
    expect(document.body.style.overflow).toBe('hidden');
    screen.getByRole('textbox', { name: 'Runtime editor' }).focus();
    await act(async () => { request(path, host); });

    expect(runtime.order).toEqual(['dismiss', 'blur', 'idle']);
    expect(runtime.dismiss).toHaveBeenCalledOnce();
    expect(runtime.idle).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toContain('Saving');
    expect((screen.getByRole('button', { name: 'Close note' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Open full page' }) as HTMLButtonElement).disabled).toBe(true);
    expect(host.closed).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
    expect(host.page).not.toHaveBeenCalled();
    expect(runtime.mounts).toEqual(['note-a']);

    await act(async () => { saving.resolve(); await saving.promise; });
    expectDestination(path, host);
    host.unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it.each<ClosePath>(['X', 'Escape', 'switch', 'full page'])('%s preserves the failed editor until Close anyway uses that same destination', async (path) => {
    const saving = deferred();
    runtime.idle.mockReturnValue(saving.promise);
    const host = renderHost();
    screen.getByRole('textbox', { name: 'Runtime editor' }).focus();
    await act(async () => { request(path, host); });
    await act(async () => { saving.reject(new Error('Synthetic save rejected')); });

    expect(screen.getByRole('alert').textContent).toContain('Changes could not be saved');
    expect((screen.getByRole('textbox', { name: 'Runtime editor' }) as HTMLTextAreaElement).value).toBe('Synthetic note text');
    expect(screen.getByRole('status').textContent).not.toContain('Saving');
    expect(document.body.style.overflow).toBe('hidden');
    expect(host.closed).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
    expect(host.page).not.toHaveBeenCalled();
    expect(runtime.mounts).toEqual(['note-a']);

    fireEvent.click(screen.getByRole('button', { name: 'Close anyway' }));
    expectDestination(path, host);
    expect(runtime.idle).toHaveBeenCalledOnce();
  });

  it('shares one request promise and keeps the first destination through nested Escape and duplicate requests', async () => {
    const saving = deferred();
    runtime.idle.mockReturnValue(saving.promise);
    const host = renderHost();
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    await act(async () => {
      first = host.handle.current!.requestClose();
      second = host.handle.current!.requestClose({ kind: 'page', noteId: 'note-b' });
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(first).toBe(second);
    expect(runtime.dismiss).toHaveBeenCalledOnce();
    expect(runtime.idle).toHaveBeenCalledOnce();
    await act(async () => { saving.resolve(); expect(await first).toBe(true); });
    expect(host.closed).toHaveBeenCalledOnce();
    expect(host.page).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
  });

  it('waits for slash focus restoration before blur and waits for the write that blur starts', async () => {
    const saving = deferred();
    runtime.dismiss.mockImplementation(() => {
      runtime.order.push('dismiss');
      queueMicrotask(() => {
        runtime.order.push('slash focus restored');
        screen.getByRole('textbox', { name: 'Runtime editor' }).focus();
      });
    });
    runtime.idle.mockImplementation(() => { runtime.order.push('idle'); return saving.promise; });
    const host = renderHost();
    await act(async () => { request('X', host); });
    expect(runtime.order).toEqual(['dismiss', 'slash focus restored', 'blur', 'idle']);
    expect(host.closed).not.toHaveBeenCalled();
    await act(async () => { saving.resolve(); await saving.promise; });
    expect(host.closed).toHaveBeenCalledOnce();
  });

  it('retries after a failed save and clears the explicit discard exit on success', async () => {
    runtime.idle.mockRejectedValueOnce(new Error('Synthetic initial failure')).mockResolvedValueOnce(undefined);
    const host = renderHost();
    await act(async () => { request('X', host); });
    expect(screen.getByRole('button', { name: 'Close anyway' })).toBeTruthy();
    await act(async () => { request('X', host); });
    expect(runtime.idle).toHaveBeenCalledTimes(2);
    expect(host.closed).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('restores original focus and overflow and removes host listeners when unmounted during a save', async () => {
    const origin = document.createElement('button');
    document.body.appendChild(origin); origin.focus();
    const saving = deferred();
    runtime.idle.mockReturnValue(saving.promise);
    const host = renderHost();
    await act(async () => { request('X', host); });
    host.unmount();
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.activeElement).toBe(origin);
    fireEvent.keyDown(window, { key: 'Escape' });
    const key = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    window.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
    const pointer = new Event('pointerdown', { bubbles: true, cancelable: true });
    window.dispatchEvent(pointer);
    expect(pointer.defaultPrevented).toBe(false);
    await act(async () => { saving.resolve(); await saving.promise; });
    expect(runtime.idle).toHaveBeenCalledOnce();
    expect(host.closed).not.toHaveBeenCalled();
    expect(host.page).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
    origin.remove();
  });
});
