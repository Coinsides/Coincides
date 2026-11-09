import { useCallback, useImperativeHandle, useRef, useState } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteCanvasRuntimeHandle } from '../NoteCanvasRuntime';
import { hashRoutePath, isNoteRoutePath, isSignInPath, LEFT_UNSAVED, NoteRouteSaveBoundary, SAVING_BEFORE_LEAVING } from './useNoteRouteSaveBoundary';
import { createHashRouter, createRoutesFromElements, Route } from 'react-router-dom';

// A-20: a hash change the router did not make (a script, the address bar, the 401 redirect) is a POP with no
// known step; useBlocker lets it through without asking. These pin what the boundary does instead.

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/stores/uiStore', () => ({ useUIStore: (selector: (value: { addToast: typeof toast }) => unknown) => selector({ addToast: toast }) }));

const SAVE_FAILURE = 'Changes could not be saved. Please retry before leaving the note.';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

let order: string[];
let gate: ReturnType<typeof deferred>;
let leaveSettled: ReturnType<typeof deferred>;
let currentNote: string;
let switchNote: (noteId: string) => void;
// How many more times the note answers that something on screen is still not on the server.
let unsavedAnswers: number;
let statusWhileFlushing: string[];

function NoteFixture({ noteId }: { noteId: string }) {
  const runtimeRef = useRef<NoteCanvasRuntimeHandle | null>(null);
  const retainRuntime = useCallback((handle: NoteCanvasRuntimeHandle | null) => {
    if (handle) runtimeRef.current = handle;
  }, []);
  useImperativeHandle(retainRuntime, () => ({
    dismissTransientUI: () => { order.push(`dismiss:${noteId}`); },
    // As the real one does once its note is no longer current (useTextFlowHistory flush, boundary() false).
    flushPendingSaves: async () => {
      order.push(`flush:${noteId}`);
      statusWhileFlushing.push(document.querySelector('[data-note-leave-status]')?.textContent ?? '');
      if (currentNote !== noteId) throw new Error('Text composition is still active');
      await gate.promise;
    },
    hasUnsavedEdit: () => { if (unsavedAnswers > 0) { unsavedAnswers -= 1; return true; } return false; },
    whenLeaveSettled: () => { order.push(`settle:${noteId}`); return leaveSettled.promise; },
    keepOpenEdit: () => { order.push(`keep:${noteId}`); },
    withdrawKeptEdit: () => { order.push(`withdraw:${noteId}`); },
    refreshBoardTextRanges: async () => {},
  }), [noteId]);
  return <div data-note-host-mode="page">
    <textarea aria-label="Note text" defaultValue="typed, not yet saved" onBlur={() => order.push(`blur:${noteId}`)} />
    <NoteRouteSaveBoundary noteId={noteId} runtimeRef={runtimeRef} />
  </div>;
}

// The note id changes the way the router changes it after an unasked POP: no blocker, the same page instance.
function Host() {
  const [noteId, setNoteId] = useState('note-a');
  switchNote = (next) => { currentNote = next; setNoteId(next); };
  return <NoteFixture noteId={noteId} />;
}

function host() {
  const router = createMemoryRouter([
    { path: '/', element: <Host /> },
    { path: '/other', element: <span>Other page</span> },
  ], { initialEntries: ['/'] });
  return { router, ...render(<RouterProvider router={router} />) };
}

let navigation: EventTarget | null = null;
function withNavigateEvents() {
  navigation = new EventTarget();
  Object.defineProperty(window, 'navigation', { value: navigation, configurable: true });
}
function navigate(hash: string, cancelable: boolean, navigationType = 'push') {
  const event = new Event('navigate', { cancelable });
  Object.assign(event, { hashChange: true, navigationType, destination: { url: `${window.location.origin}${window.location.pathname}${hash}` } });
  act(() => { navigation!.dispatchEvent(event); });
  return event;
}
function focusEditor() {
  act(() => screen.getByRole('textbox', { name: 'Note text' }).focus());
}

beforeEach(() => {
  order = [];
  gate = deferred();
  leaveSettled = deferred();
  currentNote = 'note-a';
  unsavedAnswers = 0;
  statusWhileFlushing = [];
  toast.mockReset();
  window.history.replaceState(null, '', '#/notes/note-a');
});
afterEach(async () => {
  gate.resolve();
  leaveSettled.resolve();
  cleanup();
  if (navigation) { delete (window as unknown as { navigation?: EventTarget }).navigation; navigation = null; }
  await act(async () => {});
});

describe('A-20 departures the router did not ask about', () => {
  it('a hash change made by a script is held, leaves through the same flush as an in-app link, then opens that address', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate('#/notes/note-b', true);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(order).toEqual(['dismiss:note-a', 'blur:note-a', 'flush:note-a']));
    expect(window.location.hash).toBe('#/notes/note-a');
    await act(async () => gate.resolve());
    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-b'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('if that save fails the person stays on the note, told to retry, as with an in-app link', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    navigate('#/notes/note-b', true);
    await waitFor(() => expect(order).toContain('flush:note-a'));
    await act(async () => gate.reject(new Error('offline')));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', SAVE_FAILURE));
    expect(window.location.hash).toBe('#/notes/note-a');
  });

  it('an address-bar change that cannot be held keeps the open text first, then blurs, with no false failure after', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate('#/notes/note-b', false);
    expect(event.defaultPrevented).toBe(false);
    expect(order.slice(0, 3)).toEqual(['keep:note-a', 'dismiss:note-a', 'blur:note-a']);
    act(() => switchNote('note-b'));
    await act(async () => leaveSettled.resolve());
    await act(async () => {});
    expect(toast).not.toHaveBeenCalled();
  });

  it('the 401 redirect to sign-in is not held: the open text is kept, and the redirect goes on', () => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate('#/login', true);
    expect(event.defaultPrevented).toBe(false);
    expect(order.slice(0, 3)).toEqual(['keep:note-a', 'dismiss:note-a', 'blur:note-a']);
  });

  it('a departure whose save then fails says so truthfully, without asking for a retry it can no longer give', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    navigate('#/notes/note-b', false);
    act(() => switchNote('note-b'));
    await act(async () => leaveSettled.reject(new Error('offline')));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', LEFT_UNSAVED));
    expect(toast).not.toHaveBeenCalledWith('error', SAVE_FAILURE);
  });

  it('without the navigate event, popstate is the fallback: keep, blur, and no false "could not be saved" when the note changes', async () => {
    host();
    focusEditor();
    window.history.replaceState(null, '', '#/notes/note-b');
    act(() => { window.dispatchEvent(new PopStateEvent('popstate', { state: null })); });
    expect(order.slice(0, 3)).toEqual(['keep:note-a', 'dismiss:note-a', 'blur:note-a']);
    act(() => switchNote('note-b'));
    await act(async () => leaveSettled.resolve());
    await act(async () => {});
    expect(toast).not.toHaveBeenCalled();
  });

  it('B-81: between two empty notes, a note change nobody announced no longer reports a failed save', async () => {
    host();
    window.history.replaceState(null, '', '#/notes/note-b');
    act(() => { window.dispatchEvent(new PopStateEvent('popstate', { state: null })); });
    act(() => switchNote('note-b'));
    await act(async () => leaveSettled.resolve());
    await act(async () => {});
    expect(toast).not.toHaveBeenCalledWith('error', SAVE_FAILURE);
  });

  it('a step the router made itself (its history state has an index) is left to the router blocker', () => {
    host();
    focusEditor();
    window.history.replaceState({ idx: 1 }, '', '#/notes/note-b');
    act(() => { window.dispatchEvent(new PopStateEvent('popstate', { state: { idx: 1 } })); });
    expect(order).toEqual([]);
  });
});

// A-20 r2 (K6): a held navigation is opened again as the same kind of step it was.
describe('A-20 r2 a held navigation keeps its kind', () => {
  it('a replace is opened again as a replace, so Back does not come to the same note twice', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    const before = window.history.length;
    const event = navigate('#/notes/note-b', true, 'replace');
    expect(event.defaultPrevented).toBe(true);
    await act(async () => gate.resolve());
    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-b'));
    expect(window.history.length).toBe(before);
  });
});

// A-20 r2 (LATEBACK): while a departure waits for its saves the note says so, and before it goes on it asks again.
// The in-app link (router PUSH) and the held hash change go through the same flushForLeave.
describe('A-20 r2 nothing leaves with the note unsaved', () => {
  it('a held hash change shows "Saving before leaving" while it waits, and saves again what reached the editor meanwhile', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    unsavedAnswers = 1;
    navigate('#/notes/note-b', true);
    await act(async () => gate.resolve());
    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-b'));
    expect(order.filter((step) => step === 'flush:note-a')).toHaveLength(2);
    expect(order).not.toContain('keep:note-a');
    expect(statusWhileFlushing[0]).toBe(SAVING_BEFORE_LEAVING);
    expect(document.querySelector('[data-note-leave-status]')).toBeNull();
  });

  it('what still is not saved after two more rounds is kept before the note is left', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    unsavedAnswers = 10;
    navigate('#/notes/note-b', true);
    await act(async () => gate.resolve());
    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-b'));
    expect(order.filter((step) => step === 'flush:note-a')).toHaveLength(3);
    expect(order.indexOf('keep:note-a')).toBeGreaterThan(order.lastIndexOf('flush:note-a'));
  });

  it('an in-app link takes the same path: saves again what is left, then goes', async () => {
    const { router } = host();
    focusEditor();
    unsavedAnswers = 1;
    act(() => { void router.navigate('/other'); });
    await waitFor(() => expect(order).toContain('flush:note-a'));
    expect(screen.getByRole('status').textContent).toBe(SAVING_BEFORE_LEAVING);
    await act(async () => gate.resolve());
    await screen.findByText('Other page');
    expect(order.filter((step) => step === 'flush:note-a')).toHaveLength(2);
  });
});

// A-20 r2 (GONEFAIL-back): Back is never held, never reports a failure that did not happen, and keeps first.
describe('A-20 r2 the browser Back button', () => {
  it('keeps what is not on the server, sends it once, and shows no failure when the note changes', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate('#/notes/note-b', false, 'traverse');
    expect(event.defaultPrevented).toBe(false);
    expect(order.slice(0, 3)).toEqual(['keep:note-a', 'dismiss:note-a', 'blur:note-a']);
    act(() => switchNote('note-b'));
    await act(async () => leaveSettled.resolve());
    await act(async () => {});
    expect(toast).not.toHaveBeenCalled();
  });
});

// A-20 r2 (TWICE): a second step while a held departure waits for its saves.
describe('A-20 r2 a second step while a departure waits', () => {
  it('a second hash change that can be held is held too, and the note leaves once, to the newest destination', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    navigate('#/notes/note-b', true);
    await waitFor(() => expect(order).toContain('flush:note-a'));
    const second = navigate('#/notes/note-c', true);
    expect(second.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe('#/notes/note-a');
    await act(async () => gate.resolve());
    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-c'));
    expect(order.filter((step) => step === 'flush:note-a')).toHaveLength(1);
    expect(toast).not.toHaveBeenCalled();
  });

  it('a second step that cannot be held lets the note go now, keeping what is open, with no retry notice for the held save', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    navigate('#/notes/note-b', true);
    await waitFor(() => expect(order).toContain('flush:note-a'));
    const second = navigate('#/notes/note-c', false);
    expect(second.defaultPrevented).toBe(false);
    expect(order).toContain('keep:note-a');
    expect(order).toContain('settle:note-a');
    // The held flush ends without its note (the route moved on); the save itself answered.
    await act(async () => gate.reject(new Error('Text composition is still active')));
    await act(async () => leaveSettled.resolve());
    expect(toast).not.toHaveBeenCalled();
  });
});

// A-20 r3 (M2): a kept record belongs only to a session that has ended. Back to an entry the router pushed is held like
// an in-app link (A); a departure the router holds after all is taken back (B).
describe('A-20 r3 Back to an entry the router knows', () => {
  function traverse(hash: string, state: unknown) {
    const event = new Event('navigate', { cancelable: false });
    Object.assign(event, { hashChange: true, navigationType: 'traverse',
      destination: { url: `${window.location.origin}${window.location.pathname}${hash}`, getState: () => state } });
    act(() => { navigation!.dispatchEvent(event); });
    return event;
  }

  it('BACKIN (A): the router taking the person back onto the note while the held departure saves is not a second departure', async () => {
    withNavigateEvents();
    const { router } = host();
    focusEditor();
    traverse('#/notes/note-b', null);
    act(() => { void router.navigate('/other'); });
    await waitFor(() => expect(order).toContain('withdraw:note-a'));
    // The blocker's own traverse back onto the note (the browser goes forward again to undo the held Back).
    traverse('#/notes/note-a', null);
    expect(order.filter((step) => step === 'keep:note-a')).toHaveLength(1);
    expect(order.filter((step) => step === 'settle:note-a')).toHaveLength(1);
    await act(async () => gate.reject(new Error('Text changes could not be saved')));
    await act(async () => leaveSettled.reject(new Error('A block edit is still pending')));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', SAVE_FAILURE));
    expect(toast).not.toHaveBeenCalledWith('error', LEFT_UNSAVED);
    // Not released: the next in-app step is held again.
    order.length = 0;
    act(() => { void router.navigate('/other'); });
    await waitFor(() => expect(order).toContain('flush:note-a'));
    expect(screen.queryByText('Other page')).toBeNull();
  });

  it('BACKIN-fail (B): when the router holds the person after a keep, the keep is taken back and a failed save says retry, not "did not reach"', async () => {
    withNavigateEvents();
    const { router } = host();
    focusEditor();
    traverse('#/notes/note-b', null);
    expect(order).toContain('keep:note-a');
    act(() => { void router.navigate('/other'); });
    await waitFor(() => expect(order).toContain('withdraw:note-a'));
    expect(order.indexOf('withdraw:note-a')).toBeLessThan(order.lastIndexOf('flush:note-a'));
    await act(async () => gate.reject(new Error('Text changes could not be saved')));
    await act(async () => leaveSettled.reject(new Error('A block edit is still pending')));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', SAVE_FAILURE));
    expect(toast).not.toHaveBeenCalledWith('error', LEFT_UNSAVED);
    expect(screen.queryByText('Other page')).toBeNull();
  });
});

// A-20 r3 (S3, Tester's read of the r3 dist): the "did not reach the server" notice is said only when the departure
// happened. A save that already failed before Back rejects at once, before the router's blocker holds the person.
describe('A-20 r3 a save that failed before Back', () => {
  function traverse(hash: string) {
    const event = new Event('navigate', { cancelable: false });
    Object.assign(event, { hashChange: true, navigationType: 'traverse',
      destination: { url: `${window.location.origin}${window.location.pathname}${hash}`, getState: () => undefined } });
    act(() => { navigation!.dispatchEvent(event); });
  }

  it('BACKIN-fail-sealed: rejected before the router holds the person: no "did not reach", the person stays, retry is asked', async () => {
    withNavigateEvents();
    const { router } = host();
    focusEditor();
    traverse('#/notes/note-b');
    await act(async () => leaveSettled.reject(new Error('A block edit is still pending')));
    act(() => { void router.navigate('/other'); });
    await waitFor(() => expect(order).toContain('withdraw:note-a'));
    await act(async () => gate.reject(new Error('Text changes could not be saved')));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', SAVE_FAILURE));
    expect(toast).not.toHaveBeenCalledWith('error', LEFT_UNSAVED);
    expect(screen.queryByText('Other page')).toBeNull();
  });

  it('rejected before the note goes, and then it does go: "did not reach" is said once, when it goes', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    traverse('#/notes/note-b');
    await act(async () => leaveSettled.reject(new Error('A block edit is still pending')));
    expect(toast).not.toHaveBeenCalledWith('error', LEFT_UNSAVED);
    act(() => switchNote('note-b'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', LEFT_UNSAVED));
    expect(toast.mock.calls.filter(([, text]) => text === LEFT_UNSAVED)).toHaveLength(1);
  });
});

// A-20 r3d (N2): a step onto this note is recognised the way the router reads the address (trailing slash, a second
// '#', a query): none of them is a departure, held or kept.
describe('A-20 r3d this note under another spelling of its address (N2)', () => {
  it.each(['#/notes/note-a/', '#/notes/note-a#x', '#/notes/note-a?q'])('%s is not a departure', async (hash) => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate(hash, true);
    expect(event.defaultPrevented).toBe(false);
    await act(async () => {});
    expect(order.filter((step) => step.startsWith('flush') || step.startsWith('keep'))).toEqual([]);
  });
});

// A-20 r3d (N3): a held hash departure, then Back: the router holds the Back and asks the same pending save. If it
// fails, the person is told once.
describe('A-20 r3d one failed leave save, one notice (N3)', () => {
  it('a held hash step, then a Back the router holds, then the save fails: "Please retry" once', async () => {
    withNavigateEvents();
    const { router } = host();
    focusEditor();
    expect(navigate('#/notes/note-b', true).defaultPrevented).toBe(true);
    await waitFor(() => expect(order).toContain('flush:note-a'));
    // Back while the held step waits: it cannot be held, so the note is let go and kept...
    navigate('#/other', false, 'traverse');
    expect(order).toContain('keep:note-a');
    // ...and the router holds the Back after all: the departure is taken back, the same pending save is asked.
    act(() => { void router.navigate('/other'); });
    await waitFor(() => expect(order).toContain('withdraw:note-a'));
    await act(async () => gate.reject(new Error('Text changes could not be saved')));
    await act(async () => leaveSettled.reject(new Error('A block edit is still pending')));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', SAVE_FAILURE));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(toast.mock.calls.filter(([, message]) => message === SAVE_FAILURE)).toHaveLength(1);
    expect(toast).not.toHaveBeenCalledWith('error', LEFT_UNSAVED);
    expect(screen.queryByText('Other page')).toBeNull();
  });

  // The router blocks each further step while one is held, with a new blocker each time (the effect runs again and
  // asks flushForLeave, which hands back the same pending save). Still one notice for that one save.
  it('a step the router holds, then a second step it holds again, then the save fails: "Please retry" once', async () => {
    const { router } = host();
    focusEditor();
    act(() => { void router.navigate('/other'); });
    await waitFor(() => expect(order).toContain('flush:note-a'));
    act(() => { void router.navigate('/other'); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(order.filter((entry) => entry === 'flush:note-a')).toHaveLength(1);
    await act(async () => gate.reject(new Error('Text changes could not be saved')));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('error', SAVE_FAILURE));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(toast.mock.calls.filter(([, message]) => message === SAVE_FAILURE)).toHaveLength(1);
    expect(screen.queryByText('Other page')).toBeNull();
  });
});

// A-20 r3e (P3): the router matches 'notes/:noteId' without regard to case: '#/Notes/<id>' is this note, not a departure.
// (P4): the router decodes segment by segment and keeps a '/' inside a segment as '%2F': '#/notes%2F<id>' and
// '#/notes/<id>%2F' are not this note, so they are departures (held, saved first).
describe('A-20 r3e the predicate reads the address as the router does (P3, P4)', () => {
  it.each(['#/Notes/note-a', '#/NOTES/note-a/'])('%s is this note: not a departure (P3)', async (hash) => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate(hash, true);
    expect(event.defaultPrevented).toBe(false);
    await act(async () => {});
    expect(order.filter((step) => step.startsWith('flush') || step.startsWith('keep'))).toEqual([]);
  });

  it.each(['#/notes%2Fnote-a', '#/notes/note-a%2F'])('%s is not this note: a departure, held and saved first (P4)', async (hash) => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate(hash, true);
    expect(event.defaultPrevented).toBe(true);
    await act(async () => {});
    expect(order.some((step) => step.startsWith('flush'))).toBe(true);
  });

  it('the predicate itself (P3, P4)', () => {
    expect(hashRoutePath('#/notes%2Fnote-a')).toBe('/notes%2Fnote-a');
    expect(hashRoutePath('#/notes/note-a%2F')).toBe('/notes/note-a%2F');
    expect(hashRoutePath('#/notes/note%20a/')).toBe('/notes/note a');
    expect(isNoteRoutePath('/Notes/note-a', 'note-a')).toBe(true);
    expect(isNoteRoutePath('/notes/NOTE-A', 'note-a')).toBe(false);
    expect(isNoteRoutePath('/notes%2Fnote-a', 'note-a')).toBe(false);
  });
});

// A-20b (Q4): the router reads '#notes/<id>' as '/notes/<id>' (a missing leading '/' is added): this note, no departure.
describe('A-20b a hash path without its leading slash is read as the router reads it (Q4)', () => {
  it('#notes/note-a is this note: not a departure', async () => {
    withNavigateEvents();
    host();
    focusEditor();
    const event = navigate('#notes/note-a', true);
    expect(event.defaultPrevented).toBe(false);
    await act(async () => {});
    expect(order.filter((step) => step.startsWith('flush') || step.startsWith('keep'))).toEqual([]);
  });
});

// A-20b (Q5 b): one table of addresses, read by the router (the app's route shape, App.tsx) and by the predicate. They
// must say the same thing for every address: this note, sign-in, or elsewhere.
describe('A-20b the predicate and the router read every address alike (Q5 b)', () => {
  const routerReads = (hash: string, noteId: string) => {
    // A-20b r2 (R4): '' is an address with no hash ('…/#' and '…/' both read '' from location.hash).
    window.history.replaceState(null, '', hash || window.location.pathname);
    const router = createHashRouter(createRoutesFromElements(
      <Route>
        <Route path="/login" />
        <Route path="/register" />
        <Route path="/"><Route path="notes/:noteId" /></Route>
        <Route path="*" />
      </Route>,
    ));
    const leaf = router.state.matches[router.state.matches.length - 1];
    const read = leaf?.route.path === 'notes/:noteId'
      ? (leaf.params.noteId === noteId ? 'this note' : 'elsewhere')
      : leaf?.route.path === '/login' || leaf?.route.path === '/register' ? 'sign-in' : 'elsewhere';
    router.dispose();
    return read;
  };
  const predicateReads = (hash: string, noteId: string) => {
    const path = hashRoutePath(hash);
    return isNoteRoutePath(path, noteId) ? 'this note' : isSignInPath(path) ? 'sign-in' : 'elsewhere';
  };
  const addresses = [
    '#/notes/note-a', '#/notes/note-a/', '#/notes/note-a?view=1', '#/notes/note-a#part', '#/Notes/note-a', '#/NOTES/note-a/',
    '#notes/note-a', '#notes/note-a/', '#/notes/note%2Da', '#/notes/NOTE-A', '#/notes/note-b', '#/notes/', '#/notes',
    '#/notes%2Fnote-a', '#/notes/note-a%2F', '#/notes/note-a/more', '#/', '#', '#/login', '#login', '#/LOGIN', '#/register/',
    '#register', '#/login/x', '#/boards/note-a', '',
  ];
  afterEach(() => { window.history.replaceState(null, '', '#/'); });

  it.each(addresses)('%s', (hash) => {
    expect(predicateReads(hash, 'note-a')).toBe(routerReads(hash, 'note-a'));
  });
});
