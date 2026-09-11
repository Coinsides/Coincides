import { useLayoutEffect, type RefObject } from 'react';
import { measureTextareaSelection } from './textareaNavigation';
import { placeAnnotationStamp, type StampRect } from './annotationStampPlacement';

const STAMP = '[data-annotation-stamp]';
const SCOPE = '[data-canvas-engine-version], [data-annotation-stamp-scope]';
const coordinators = new WeakMap<HTMLElement, { schedule: () => void; release: () => void; users: number }>();

function box(rect: DOMRect): StampRect {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function union(rects: StampRect[]): StampRect | null {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  return { left, top,
    width: Math.max(...rects.map((rect) => rect.left + rect.width)) - left,
    height: Math.max(...rects.map((rect) => rect.top + rect.height)) - top };
}

/** Browser layout only. Read the existing painted range, never annotation offsets. */
function highlightBounds(stamp: HTMLElement): StampRect | null {
  if (stamp.dataset.annotationStampKind === 'block') {
    const content = stamp.parentElement?.querySelector<HTMLElement>('[data-annotation-stamp-block-content]');
    return content ? union(annotationStampTextRects(content)) || box(content.getBoundingClientRect()) : null;
  }
  const row = stamp.closest('[data-text-unit-row]');
  if (!row) return null;
  const id = stamp.dataset.annotationStamp;
  const rects = [...row.querySelectorAll<HTMLElement>('mark[data-annotation-highlight-ids]')]
    .filter((mark) => (JSON.parse(mark.dataset.annotationHighlightIds || '[]') as string[]).includes(id || ''))
    .flatMap((mark) => [...mark.getClientRects()].map(box))
    .filter((rect) => rect.width > 0 && rect.height > 0);
  // All painted segments in this text unit, including wrapped and disjoint ranges.
  return union(rects);
}

/** Conservative line-fragment boxes contain every body glyph (including unmarked rows). */
export function annotationStampTextRects(scope: HTMLElement): StampRect[] {
  const rects: StampRect[] = [];
  if (typeof document.createRange().getClientRects !== 'function') return rects;
  // KaTeX draws some characters (e.g. radical signs) as SVG paths, not text nodes.
  for (const math of scope.querySelectorAll<HTMLElement>('.katex')) {
    const bounds = math.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) rects.push(box(bounds));
  }
  for (const textarea of scope.querySelectorAll<HTMLTextAreaElement>('textarea')) {
    const bounds = textarea.getBoundingClientRect();
    if (!bounds.width || !bounds.height || getComputedStyle(textarea).visibility === 'hidden') continue;
    const scaleX = bounds.width / (textarea.offsetWidth || bounds.width);
    const scaleY = bounds.height / (textarea.offsetHeight || bounds.height);
    rects.push(...measureTextareaSelection(textarea, 0, textarea.value.length).map((rect) => ({
      left: bounds.left + rect.left * scaleX, top: bounds.top + rect.top * scaleY,
      width: rect.width * scaleX, height: rect.height * scaleY,
    })));
  }
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!node.textContent?.trim() || !parent || parent.closest(`${STAMP}, textarea, script, style`)) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    range.selectNodeContents(node);
    rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).map(box));
  }
  return rects;
}

/** Shared by all blocks in a surface, so DOM order also gives stable cross-block avoidance. */
export function layoutAnnotationStamps(scope: HTMLElement): void {
  const stamps = [...scope.querySelectorAll<HTMLElement>(STAMP)];
  if (!stamps.length) return;
  const obstacles = annotationStampTextRects(scope);
  const occupied: StampRect[] = [];
  const frames = [...scope.querySelectorAll<HTMLElement>('[data-page-frame-index], [data-paper-ink-layer]')]
    .map((frame) => box(frame.getBoundingClientRect())).filter((rect) => rect.width > 0 && rect.height > 0);
  const fallback = box((scope.closest<HTMLElement>('[data-page-display-scale]') || scope).getBoundingClientRect());
  for (const stamp of stamps) {
    const anchor = highlightBounds(stamp);
    const parent = stamp.offsetParent as HTMLElement | null;
    const stampRect = stamp.getBoundingClientRect();
    const bounds = anchor && (frames.find((frame) => anchor.left >= frame.left && anchor.top >= frame.top
      && anchor.left + anchor.width <= frame.left + frame.width
      && anchor.top + anchor.height <= frame.top + frame.height) || (frames.length ? null : fallback));
    const parentRect = parent?.getBoundingClientRect();
    const scaleX = parentRect && parent ? parentRect.width / (parent.offsetWidth || parentRect.width) : 1;
    const scaleY = parentRect && parent ? parentRect.height / (parent.offsetHeight || parentRect.height) : 1;
    // Include the selected child's 1px outline in both collision and frame tests.
    const inset = Math.max(scaleX, scaleY);
    const placement = anchor && bounds && parent && parentRect && stampRect.width > 0 && stampRect.height > 0
      ? placeAnnotationStamp({ anchor, bounds, obstacles, occupied, gap: 2 * inset,
        size: { width: stampRect.width + 2 * inset, height: stampRect.height + 2 * inset } }) : null;
    if (!placement || !parent || !parentRect) {
      delete stamp.dataset.stampSide;
      stamp.dataset.stampLayout = anchor ? 'no-space' : 'unmeasured';
      continue;
    }
    occupied.push(placement);
    stamp.style.setProperty('--annotation-badge-left', `${(placement.left + inset - parentRect.left) / scaleX - parent.clientLeft + parent.scrollLeft}px`);
    stamp.style.setProperty('--annotation-badge-top', `${(placement.top + inset - parentRect.top) / scaleY - parent.clientTop + parent.scrollTop}px`);
    stamp.dataset.stampSide = placement.side;
    stamp.dataset.stampLayout = 'placed';
  }
}

/** One observer/measurement batch per surface; no persistent model or React geometry state. */
export function useAnnotationStampLayout(ref: RefObject<HTMLElement>): void {
  useLayoutEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    const scope = editor.closest<HTMLElement>(SCOPE) || editor;
    let coordinator = coordinators.get(scope);
    if (!coordinator) {
      let frame = 0;
      let disposed = false;
      const schedule = () => {
        if (!frame && !disposed) frame = requestAnimationFrame(() => {
          frame = 0;
          layoutAnnotationStamps(scope);
        });
      };
      const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
      const observed = new Set<HTMLElement>();
      const observeSizes = () => {
        const current = new Set([scope, ...scope.querySelectorAll<HTMLElement>('textarea, [data-text-unit-row], [data-page-frame-index], [data-paper-ink-layer]')]);
        for (const node of observed) if (!current.has(node)) { resize?.unobserve(node); observed.delete(node); }
        for (const node of current) if (!observed.has(node)) { resize?.observe(node); observed.add(node); }
      };
      const mutations = new MutationObserver((records) => {
        if (!records.some((record) => !(record.target instanceof Element && record.target.closest(STAMP)))) return;
        observeSizes();
        schedule();
      });
      mutations.observe(scope, { childList: true, subtree: true, characterData: true, attributes: true });
      const scaledSurface = scope.closest<HTMLElement>('[data-page-display-scale]');
      if (scaledSurface && scaledSurface !== scope) mutations.observe(scaledSurface, { attributes: true });
      observeSizes();
      // Ancestor/document scroll translates the entire solution. Only internal
      // text scroll changes a glyph's position relative to its stamp.
      const scroll = (event: Event) => {
        if (event.target instanceof HTMLElement && scope.contains(event.target)) schedule();
      };
      window.addEventListener('resize', schedule);
      window.addEventListener('scroll', scroll, true);
      document.fonts?.addEventListener('loadingdone', schedule);
      coordinator = { schedule, users: 0, release: () => {
        disposed = true;
        cancelAnimationFrame(frame);
        mutations.disconnect();
        resize?.disconnect();
        window.removeEventListener('resize', schedule);
        window.removeEventListener('scroll', scroll, true);
        document.fonts?.removeEventListener('loadingdone', schedule);
        coordinators.delete(scope);
      } };
      coordinators.set(scope, coordinator);
    }
    coordinator.users++;
    coordinator.schedule();
    return () => { if (--coordinator.users === 0) coordinator.release(); };
  }, [ref]);
  useLayoutEffect(() => {
    const editor = ref.current;
    if (editor) coordinators.get(editor.closest<HTMLElement>(SCOPE) || editor)?.schedule();
  });
}
