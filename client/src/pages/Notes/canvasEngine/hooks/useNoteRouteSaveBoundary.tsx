import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import type { NoteCanvasRuntimeHandle } from '../NoteCanvasRuntime';

interface NoteRouteSaveBoundaryProps {
  noteId?: string;
  runtimeRef: RefObject<NoteCanvasRuntimeHandle>;
}

const SAVE_FAILURE = 'Changes could not be saved. Please retry before leaving the note.';
// A-20 r3d (N2): the path a hash address leads to, read as the router reads it: without the query or a second '#',
// decoded, without a trailing slash. '#/notes/A/', '#/notes/A#x' and '#/notes/A?q' all lead to /notes/A.
// A-20 r3e (P4): decoded segment by segment, a '/' inside a segment staying '%2F' (the router's decodePath): '#/notes%2FA'
// is one segment, not this note; '#/notes/A%2F' is note 'A/', not this note.
export function hashRoutePath(hash: string): string {
  const path = hash.replace(/^#/, '');
  const end = path.search(/[?#]/);
  let pathname = end < 0 ? path : path.slice(0, end);
  try {
    pathname = pathname.split('/').map((segment) => decodeURIComponent(segment).replace(/\//g, '%2F')).join('/');
  } catch { /* left as it is, as the router leaves it */ }
  // A-20b (Q4): a path without its leading '/' ('#notes/A', '#login') leads where it would with one, as in the router.
  // A-20b r2 (R4): except a path starting with '.' ('#./notes/A'), which the router resolves without adding '/': the two
  // read different strings, but both read it as elsewhere.
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  return pathname.replace(/\/+$/, '') || '/';
}
// A-20 r3e (P3): the routes match without regard to case ('notes/:noteId', 'login', 'register' have no caseSensitive),
// and a route parameter is taken as written. '#/Notes/A' is this note; '#/notes/a' is another note when this one is 'A'.
export function isNoteRoutePath(path: string, noteId: string | undefined): boolean {
  const match = /^\/notes\/([^/]+)$/i.exec(path);
  return !!noteId && !!match && match[1] === noteId;
}
export function isSignInPath(path: string): boolean {
  return /^\/(login|register)$/i.test(path);
}
// Said after the note is already gone, so it cannot ask for a retry first. The failed save left its recovery
// receipt on this device; the note offers it again when it is opened.
// Shown for as long as a departure waits for its saves: the note is held then, and says why.
export const SAVING_BEFORE_LEAVING = 'Saving before leaving…';
export const LEFT_UNSAVED = 'Your last edit did not reach the server. It is kept on this device: open the note again to recover it.';

function holdPageInput() {
  const page = document.querySelector<HTMLElement>('[data-note-host-mode="page"]');
  const alreadyInert = page?.hasAttribute('inert') ?? false;
  const events = ['pointerdown', 'mousedown', 'click', 'keydown', 'beforeinput', 'paste', 'cut', 'drop'] as const;
  const block = (event: Event) => {
    const target = event.target;
    const insideNote = target instanceof Element && (
      page?.contains(target) || target.closest('[data-canvas-layer="floating-overlay"]')
    );
    // Document-level editor shortcuts can run even after blur has moved focus
    // to the body. Keep them paused along with direct editor/portal input.
    if (event.type !== 'keydown' && !insideNote) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  events.forEach((name) => window.addEventListener(name, block, true));
  let released = false;
  return {
    makeInert: () => { if (!released) page?.setAttribute('inert', ''); },
    release: () => {
      if (released) return;
      released = true;
      events.forEach((name) => window.removeEventListener(name, block, true));
      if (!alreadyInert) page?.removeAttribute('inert');
    },
  };
}

function DataRouterNoteSaveBoundary({ noteId, runtimeRef }: NoteRouteSaveBoundaryProps) {
  const addToast = useUIStore((state) => state.addToast);
  const [savingBeforeLeaving, setSavingBeforeLeaving] = useState(false);
  const scope = useMemo(() => ({
    mounted: false,
    released: false,
    pending: null as Promise<void> | null,
    releaseInput: null as (() => void) | null,
    // A-20 r2 (TWICE): where a held departure goes once its saves are in. A later step that can be held too only
    // changes this, so the note leaves once, to the newest destination.
    heldTo: null as { url: string; destination: string; replace: boolean } | null,
    // A-20 r3 (M2): released by keepAndLeave, whose records are frozen only if the departure really happens.
    kept: false,
    // A-20 r3 (S3): a kept departure's save failed while the note is still here. Said only once the note is really
    // left (this scope unmounts); taken back with the departure when the router holds the person.
    leftUnsaved: false,
    // A-20 r3d (N3): leave saves whose failure has been said. One pending save is one failure notice, however many
    // departures waited on it (a held hash step and the router's blocker after a Back both get the same pending).
    failureSaid: new WeakSet<Promise<void>>(),
  }), [noteId]);

  // Go on to the newest held destination, as the same kind of step it was held from (K6: a replace stays a replace).
  const goHeld = useCallback(() => {
    const to = scope.heldTo;
    scope.heldTo = null;
    if (!to) return false;
    scope.released = true;
    if (to.replace) window.location.replace(to.url);
    else window.location.hash = to.destination;
    return true;
  }, [scope]);

  // A-20 r3d (N3): say a leave save failed once per pending save.
  const sayLeaveFailure = useCallback((flushed: Promise<void> | null) => {
    if (flushed) {
      if (scope.failureSaid.has(flushed)) return;
      scope.failureSaid.add(flushed);
    }
    addToast('error', SAVE_FAILURE);
  }, [addToast, scope]);

  const flushForLeave = useCallback((runtime: NoteCanvasRuntimeHandle, unloading = false): Promise<void> => {
    if (scope.pending) return scope.pending;
    const input = unloading ? null : holdPageInput();
    scope.releaseInput = input?.release ?? null;
    const run = async () => {
      try {
        flushSync(() => {
          if (!unloading) setSavingBeforeLeaving(true);
          runtime.dismissTransientUI();
        });
        // Slash rollback restores editor focus in a microtask. Ordinary route
        // changes must let it settle before releasing the text owner.
        if (!unloading) await Promise.resolve();
        flushSync(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        // Preserve the required blur save before removing focusability.
        input?.makeInert();
        await runtime.flushPendingSaves();
        // A-20 r2 (LATEBACK): asked again before the departure goes on. Anything that reached the editor meanwhile is
        // saved too (at most two more rounds), and what still is not is kept in the kept-words archive: it never
        // leaves with the note unsaved.
        for (let round = 0; round < 2 && runtime.hasUnsavedEdit?.(); round += 1) {
          flushSync(() => {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          });
          await runtime.flushPendingSaves();
        }
        if (runtime.hasUnsavedEdit?.()) runtime.keepOpenEdit?.();
      } finally {
        input?.release();
        scope.releaseInput = null;
        if (!unloading) setSavingBeforeLeaving(false);
      }
    };
    const pending = run();
    scope.pending = pending;
    void pending.then(
      () => { if (scope.pending === pending) scope.pending = null; },
      () => { if (scope.pending === pending) scope.pending = null; },
    );
    return pending;
  }, [scope]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    currentLocation.pathname !== nextLocation.pathname
  ));

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let current = true;
    const runtime = runtimeRef.current;
    // A-20 r3 (M2): a step keepAndLeave let go (Back to an entry the router knows, say) that the router holds after all:
    // the person is still on the note, so nothing it kept is frozen and the note is not released. It leaves like any
    // in-app link now, through flushForLeave; if that save fails the person stays and is told to retry.
    if (scope.kept) {
      scope.kept = false;
      scope.leftUnsaved = false;
      scope.released = false;
      runtime?.withdrawKeptEdit?.();
    }
    // Enter outside React's effect commit before calling flushSync.
    let flushed: Promise<void> | null = null;
    const pending = runtime ? Promise.resolve().then(() => (flushed = flushForLeave(runtime))) : Promise.resolve();
    void pending.then(() => {
      if (!current) return;
      // A later hash step was held meanwhile (TWICE): that is where the person asked to go last.
      if (scope.heldTo) { blocker.reset(); goHeld(); return; }
      scope.released = true;
      blocker.proceed();
    }, () => {
      if (!current) return;
      scope.heldTo = null;
      // The note was already left by a step that could not be held: that departure reports for itself.
      if (!scope.released) sayLeaveFailure(flushed);
      blocker.reset();
    });
    return () => { current = false; };
  }, [addToast, blocker, flushForLeave, goHeld, runtimeRef, sayLeaveFailure, scope]);

  useLayoutEffect(() => {
    scope.mounted = true;
    return () => {
      scope.mounted = false;
      // A-20 r3 (S3): the departure happened: a failure it met while the note was still here is said now.
      if (scope.leftUnsaved && scope.kept) addToast('error', LEFT_UNSAVED);
      scope.leftUnsaved = false;
      scope.releaseInput?.();
      scope.releaseInput = null;
      const runtime = runtimeRef.current;
      // SPA departure has already drained before unmount. An external forced
      // teardown can only drain best-effort; defer to skip StrictMode's probe.
      queueMicrotask(() => {
        if (scope.mounted || scope.released || scope.pending || !runtime) return;
        void runtime.flushPendingSaves().catch(() => addToast('error', SAVE_FAILURE));
      });
    };
  }, [addToast, runtimeRef, scope]);

  // A-20: a hash change the router did not make (a script, the address bar, the 401 redirect) is a POP with no
  // known step, and useBlocker lets those through without asking. The browser's navigate event comes first,
  // before the address changes:
  // - when it can be held (a script set the hash), it is held and the note leaves exactly as an in-app link
  //   leaves, through flushForLeave, then the same address is opened; if the save fails the person stays;
  // - when it cannot be held (the address bar), or it goes to sign-in after a 401 (no save can succeed then),
  //   what is still open is kept in the kept-words archive first, then the blur sends it on its way.
  // Without a navigate event, popstate is the late fallback for the same keep-and-blur.
  useEffect(() => {
    const leaving = (nextHash: string) => {
      const runtime = runtimeRef.current;
      if (!runtime || !scope.mounted || scope.released || scope.pending) return null;
      const nextPath = hashRoutePath(nextHash);
      if (isNoteRoutePath(nextPath, noteId)) return null;
      return { runtime, toSignIn: isSignInPath(nextPath) };
    };
    const keepAndLeave = (runtime: NoteCanvasRuntimeHandle) => {
      scope.released = true;
      scope.kept = true;
      runtime.keepOpenEdit?.();
      flushSync(() => runtime.dismissTransientUI());
      flushSync(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      // Said only if the person did leave (A-20 r3, S3). The save may fail before the router has decided: a failure
      // already on screen when Back is pressed rejects in the next microtask, before the router's blocker holds the
      // person. So while the note is still mounted the notice waits for the note to go (unmount, above); the blocker
      // taking the departure back drops it.
      void (runtime.whenLeaveSettled?.() ?? Promise.resolve()).catch(() => {
        if (!scope.kept) return;
        if (scope.mounted) scope.leftUnsaved = true;
        else addToast('error', LEFT_UNSAVED);
      });
    };
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
    const beforeHashChange = (event: Event) => {
      const navigate = event as Event & { hashChange?: boolean; navigationType?: string; destination?: { url?: string } };
      if (!navigate.destination?.url) return;
      const destination = new URL(navigate.destination.url).hash;
      const nextPath = hashRoutePath(destination);
      // A-20 r3 (M2): a step onto this note is never a departure. The router's blocker, holding a Back, takes the
      // person back to the note with a traverse of its own while the held departure saves: that traverse must not
      // release the note or keep anything (it did, as a second step that cannot be held: BACKIN-fail on the kit).
      if (isNoteRoutePath(nextPath, noteId)) return;
      // A-20 r2 (TWICE): a second step while a departure waits for its saves.
      const waiting = runtimeRef.current;
      if (scope.pending && !scope.released && scope.mounted && waiting) {
        if (navigate.navigationType !== 'traverse' && navigate.hashChange && navigate.cancelable
          && !isSignInPath(nextPath)) {
          // It can be held too: the departure goes on to this newest destination once the saves are in.
          event.preventDefault();
          scope.heldTo = { url: navigate.destination.url, destination, replace: navigate.navigationType === 'replace' };
          return;
        }
        // It cannot be held (Back, the address bar, sign-in): the note goes now, keeping what is not on the server.
        scope.heldTo = null;
        keepAndLeave(waiting);
        return;
      }
      // Back and forward (A-20 r2, GONEFAIL-back): never held and never a failure notice for nothing; what is not on
      // the server is kept first and the blur sends it once, best effort. The router's own blocker still asks too.
      if (navigate.navigationType === 'traverse') {
        // A-20 r3 (M2): kept first even when it is an entry the router pushed (the navigate event cannot tell: its
        // getState() is the Navigation API's state, never the router's idx in history.state). If the router's blocker
        // then holds the person on the note, the blocker effect above takes the departure back.
        const leave = leaving(destination);
        if (leave) keepAndLeave(leave.runtime);
        return;
      }
      if (!navigate.hashChange) return;
      const leave = leaving(destination);
      if (!leave) return;
      if (!navigate.cancelable || leave.toSignIn) { keepAndLeave(leave.runtime); return; }
      event.preventDefault();
      scope.heldTo = { url: navigate.destination.url, destination, replace: navigate.navigationType === 'replace' };
      const flushed = flushForLeave(leave.runtime);
      void flushed.then(() => { goHeld(); }, () => {
        scope.heldTo = null;
        // The note was already left by a step that could not be held: that departure reports for itself.
        if (!scope.released) sayLeaveFailure(flushed);
      });
    };
    const afterPop = (event: PopStateEvent) => {
      // A step the router made itself is known to it, and its blocker above asks first.
      if (typeof (event.state as { idx?: unknown } | null)?.idx === 'number') return;
      const leave = leaving(window.location.hash);
      if (leave) keepAndLeave(leave.runtime);
    };
    navigation?.addEventListener('navigate', beforeHashChange);
    window.addEventListener('popstate', afterPop, true);
    return () => {
      navigation?.removeEventListener('navigate', beforeHashChange);
      window.removeEventListener('popstate', afterPop, true);
    };
  }, [addToast, flushForLeave, goHeld, noteId, runtimeRef, sayLeaveFailure, scope]);

  useEffect(() => {
    const unload = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      // A physical refresh/close cannot await a Promise. Start the existing
      // barrier synchronously, without an unconditional leave-confirm dialog.
      void flushForLeave(runtime, true).catch(() => addToast('error', SAVE_FAILURE));
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [addToast, flushForLeave, runtimeRef]);

  // The fixed placement is on a wrapper: the status itself is an ordinary box inside it, so it is measured like any
  // other visible element (a fixed element reports no offset parent).
  return savingBeforeLeaving ? (
    <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
      <div role="status" data-note-leave-status="saving" style={{
        padding: '6px 14px', borderRadius: 6, background: 'var(--color-surface-raised, #1f2937)',
        color: 'var(--color-text-inverse, #fff)', fontSize: 13,
      }}>{SAVING_BEFORE_LEAVING}</div>
    </div>
  ) : null;
}

export function NoteRouteSaveBoundary(props: NoteRouteSaveBoundaryProps) {
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  // Production App always supplies createHashRouter. Isolated legacy runtime
  // fixtures use MemoryRouter and have no data-router navigation to intercept.
  return dataRouter ? <DataRouterNoteSaveBoundary {...props} /> : null;
}
