import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import type { NoteCanvasRuntimeHandle } from '../NoteCanvasRuntime';

interface NoteRouteSaveBoundaryProps {
  noteId?: string;
  runtimeRef: RefObject<NoteCanvasRuntimeHandle>;
}

const SAVE_FAILURE = 'Changes could not be saved. Please retry before leaving the note.';

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
  const scope = useMemo(() => ({
    mounted: false,
    released: false,
    pending: null as Promise<void> | null,
    releaseInput: null as (() => void) | null,
  }), [noteId]);

  const flushForLeave = useCallback((runtime: NoteCanvasRuntimeHandle, unloading = false): Promise<void> => {
    if (scope.pending) return scope.pending;
    const input = unloading ? null : holdPageInput();
    scope.releaseInput = input?.release ?? null;
    const run = async () => {
      try {
        flushSync(() => runtime.dismissTransientUI());
        // Slash rollback restores editor focus in a microtask. Ordinary route
        // changes must let it settle before releasing the text owner.
        if (!unloading) await Promise.resolve();
        flushSync(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        // Preserve the required blur save before removing focusability.
        input?.makeInert();
        await runtime.flushPendingSaves();
      } finally {
        input?.release();
        scope.releaseInput = null;
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
    // Enter outside React's effect commit before calling flushSync.
    const pending = runtime ? Promise.resolve().then(() => flushForLeave(runtime)) : Promise.resolve();
    void pending.then(() => {
      if (!current) return;
      scope.released = true;
      blocker.proceed();
    }, () => {
      if (!current) return;
      addToast('error', SAVE_FAILURE);
      blocker.reset();
    });
    return () => { current = false; };
  }, [addToast, blocker, flushForLeave, runtimeRef, scope]);

  useLayoutEffect(() => {
    scope.mounted = true;
    return () => {
      scope.mounted = false;
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

  return null;
}

export function NoteRouteSaveBoundary(props: NoteRouteSaveBoundaryProps) {
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  // Production App always supplies createHashRouter. Isolated legacy runtime
  // fixtures use MemoryRouter and have no data-router navigation to intercept.
  return dataRouter ? <DataRouterNoteSaveBoundary {...props} /> : null;
}
