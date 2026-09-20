import { useContext, useEffect, useRef } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';

function DataBoundary({ flush }: { flush: () => Promise<void> }) {
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let current = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const page = document.querySelector<HTMLElement>('section[aria-label="Board workspace"]');
    const alreadyInert = page?.hasAttribute('inert');
    page?.setAttribute('inert', '');
    const hold = (event: Event) => {
      if (event.target instanceof Node && page?.contains(event.target)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    const events = ['beforeinput', 'pointerdown', 'click', 'keydown', 'paste', 'drop'];
    events.forEach((name) => document.addEventListener(name, hold, true));
    const release = () => {
      if (!alreadyInert) page?.removeAttribute('inert');
      events.forEach((name) => document.removeEventListener(name, hold, true));
    };
    void Promise.resolve().then(() => flushRef.current()).then(() => {
      release();
      if (current) blocker.proceed();
    }, () => { release(); if (current) blocker.reset(); });
    return () => { current = false; release(); };
  }, [blocker]);
  return null;
}

export function DocumentLeaveBoundary(props: { flush: () => Promise<void> }) {
  return useContext(UNSAFE_DataRouterContext) ? <DataBoundary {...props}/> : null;
}
