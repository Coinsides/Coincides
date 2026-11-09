// While a heading structure commits, the unit being typed in changes block and its
// editor is remounted, so no editor can take input. This textarea sits over that
// unit and takes it instead: keys, Backspace, arrows and input methods are the
// browser's own, on screen as they happen. It never writes to the note. Its owner
// reads the result once and makes the one edit through the ordinary path.

import { useAuthStore } from '@/stores/authStore';

const COPIED_STYLES = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'textAlign', 'textIndent', 'whiteSpace', 'wordBreak',
  'overflowWrap', 'boxSizing'] as const;
const FOLLOW_MS = 50;
// Shown on the box itself, so short; the full sentence is its title. Discard is the one thing that throws the words away.
const NOT_YET_IN_NOTE = 'Not in the note yet';
const TOO_MANY_KEPT = 'Many kept words waiting, not in the note';
// They go back by themselves when they can: copying them in meanwhile would put them in the note twice.
const NOT_YET_IN_NOTE_FULL = 'These words are not in the note yet. They may go back on their own; if they do not, copy them or discard them. Discard deletes them.';
const TOO_MANY_KEPT_FULL = 'Many kept words are waiting for this note. They are not in it yet and may go back on their own; if they do not, copy them or discard them. Discard deletes them.';
/** Kept entries per note before the notice asks for attention. Nothing is dropped past it. */
export const UNPLACED_WORDS_LIMIT = 20;
// Room the box keeps at its right end for its notice, when the notice cannot be measured.
const NOTICE_RESERVE = 210;
// Kept words that cannot sit on their unit without covering another line go beside the text column instead.
const DOCK_WIDTH = 320;
// Narrower than this, a margin cannot hold the box: it folds to its notice instead.
const DOCK_MIN_WIDTH = 200;
const DOCK_MAX_HEIGHT = 160;
const DOCK_GAP = 16;
const DOCK_EDGE = 8;
const STACK_GAP = 6;
const NOTICE_HEIGHT = 18;

type Rect = { left: number; right: number; top: number; bottom: number };
const overlaps = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
// Every note editor on screen, with where it is.
function noteEditors(): Array<{ editor: HTMLTextAreaElement; rect: DOMRect }> {
  return [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-runtime-textflow-editor="true"]')]
    .filter((editor) => getComputedStyle(editor).visibility !== 'hidden')
    .map((editor) => ({ editor, rect: editor.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0);
}

export interface StructureTypingBuffer {
  readonly element: HTMLTextAreaElement;
  readonly initialText: string;
  text(): string;
  caret(): number;
  changed(): boolean;
  isComposing(): boolean;
  isRetained(): boolean;
  /** Runs once when the current composition ends, so its text is never cut off. */
  afterComposition(callback: () => void): void;
  /** Stops taking focus and stays on screen with its words until someone closes it. */
  retain(options: { onClose?: () => void; noteId?: string; crowded?: boolean }): void;
  close(): void;
}

function isNoteEditor(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement && target.dataset.runtimeTextflowEditor === 'true';
}

// The editor is transparent over its page; the buffer has to hide what is under it.
function opaqueBackground(element: Element): string {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const color = getComputedStyle(current).backgroundColor;
    if (color && color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return 'Canvas';
}

export interface UnplacedWords {
  /** One kept entry. A note can hold several: each window that could not land keeps its own. */
  id: string;
  blockId: string;
  unitId: string;
  initialText: string;
  text: string;
  /**
   * Who kept it: a structure window (the default, older records too), the text history on a departure ('edit'), or the
   * new line of a split that had not been sent when the note was left ('split'): kept with no role and an empty start,
   * so it has no anchor to land on by itself and waits in the box to be put back by hand.
   */
  source?: 'window' | 'edit' | 'split';
}

// Per account: someone else signing in on this browser neither sees these words nor writes them anywhere.
const currentAccount = () => useAuthStore.getState().user?.id ?? 'anonymous';
const unplacedKey = (noteId: string) => `coincides:unplaced-words:${currentAccount()}:${noteId}`;

// A-20 r2 (K3): words kept before the account had loaded went under 'anonymous'. Once the account is known they are
// claimed into its key, so they come back when the note is opened rather than waiting where nothing reads them.
function claimAnonymousWords(noteId: string): void {
  if (currentAccount() === 'anonymous') return;
  const anonymousKey = `coincides:unplaced-words:anonymous:${noteId}`;
  const waiting = localStorage.getItem(anonymousKey);
  if (!waiting) return;
  const parsed = JSON.parse(waiting) as unknown;
  const claimed = (Array.isArray(parsed) ? parsed : [parsed]) as UnplacedWords[];
  const own = localStorage.getItem(unplacedKey(noteId));
  const ownEntries = own ? (JSON.parse(own) as unknown) : [];
  const mine = (Array.isArray(ownEntries) ? ownEntries : [ownEntries]) as UnplacedWords[];
  const ids = new Set(mine.map((entry) => entry?.id));
  localStorage.setItem(unplacedKey(noteId), JSON.stringify([...mine, ...claimed.filter((entry) => !ids.has(entry?.id))]));
  localStorage.removeItem(anonymousKey);
}

/** Every entry kept for the note. An entry written by the single-entry format is read as one entry. */
export function readUnplacedWords(noteId: string): UnplacedWords[] {
  try {
    claimAnonymousWords(noteId);
    const stored = localStorage.getItem(unplacedKey(noteId));
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    return entries.filter((entry): entry is UnplacedWords => Boolean(entry) && typeof (entry as UnplacedWords).text === 'string')
      .map((entry, index) => ({ ...entry, id: entry.id ?? `legacy-${index}` }));
  } catch {
    return [];
  }
}

function writeUnplacedWords(noteId: string, entries: UnplacedWords[]): void {
  try {
    if (entries.length) localStorage.setItem(unplacedKey(noteId), JSON.stringify(entries));
    else localStorage.removeItem(unplacedKey(noteId));
  } catch { /* the on-screen copy remains */ }
}

// Words that could not reach their note wait here, so they are still there when the person comes back.
export function rememberUnplacedWords(noteId: string, words: UnplacedWords): number {
  const entries = readUnplacedWords(noteId).filter((entry) => entry.id !== words.id);
  entries.push(words);
  writeUnplacedWords(noteId, entries);
  return entries.length;
}

/** Only this entry: others kept for the same note stay. */
export function forgetUnplacedWords(noteId: string, id: string): void {
  writeUnplacedWords(noteId, readUnplacedWords(noteId).filter((entry) => entry.id !== id));
}

export function openStructureTypingBuffer(input: {
  /** The editor of the unit being typed in, found by its block and unit together; null while it is not rendered. */
  locate: () => HTMLTextAreaElement | null;
  text: string;
  caret: number;
  initialText?: string;
  /** False when reopening kept words: the person's own focus stays where it is. */
  focus?: boolean;
}): StructureTypingBuffer {
  const element = document.createElement('textarea');
  element.dataset.structureTypingBuffer = 'true';
  element.value = input.text;
  element.setAttribute('aria-label', 'Note text');
  Object.assign(element.style, { position: 'fixed', zIndex: '2147483000', margin: '0', border: '0', outline: 'none',
    resize: 'none', overflow: 'hidden',
    // The page styles every textarea with a transition: on the box it would trail the unit it follows, and the check
    // that it covers nothing would read where it was going, not where it is.
    transition: 'none' });

  // Width kept free at the right end of the first line for the notice of kept words; 0 while the window is live.
  let reserve = 0;
  let notice: HTMLElement | null = null;
  // Where a kept box is: on its unit, beside the text column, or folded to its notice (the words one click away).
  let mode: 'unit' | 'margin' | 'folded' = 'unit';
  let unfolded = false;
  let showButton: HTMLButtonElement | null = null;
  // Height of the unit editor the box sits on: on its unit a kept box is never taller, its words scroll inside.
  let unitHeight = 0;
  const placeNotice = () => {
    if (!notice || mode === 'folded') return;
    const rect = element.getBoundingClientRect();
    if (mode === 'margin') {
      // Across the top of a docked box, inside it.
      notice.style.top = `${rect.top + 1}px`;
      notice.style.left = `${rect.left + 1}px`;
      notice.style.maxWidth = `${Math.max(0, rect.width - 2)}px`;
      return;
    }
    // Placed against the box as it is now: after the box moved, and after its padding changed. Never past its edge.
    notice.style.top = `${rect.top + 2}px`;
    notice.style.left = `${Math.max(rect.left, rect.right - reserve - 2)}px`;
    notice.style.maxWidth = `${Math.max(0, Math.min(reserve || rect.width, rect.width - 4))}px`;
  };
  // The last place the box was put, so an unchanged layout writes nothing.
  let placedAt = '';
  const follow = (anchor: HTMLTextAreaElement): boolean => {
    const rect = anchor.getBoundingClientRect();
    const at = `${rect.left},${rect.top},${rect.width},${rect.height},${reserve}`;
    if (at === placedAt) return false;
    placedAt = at;
    unitHeight = rect.height;
    const style = getComputedStyle(anchor);
    for (const name of COPIED_STYLES) element.style[name] = style[name];
    if (reserve) element.style.paddingRight = `${(parseFloat(style.paddingRight) || 0) + reserve + 4}px`;
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.minHeight = `${rect.height}px`;
    element.style.background = opaqueBackground(anchor);
    return true;
  };
  const resize = () => {
    element.style.height = 'auto';
    const wanted = element.scrollHeight;
    // An open window grows with what is typed. A kept box on its unit stays the unit's height, a docked one at most
    // DOCK_MAX_HEIGHT; both scroll inside rather than cover what is below.
    const cap = !notice ? Infinity : mode === 'unit' ? (unitHeight || Infinity) : DOCK_MAX_HEIGHT;
    element.style.height = `${Math.min(wanted, cap)}px`;
    element.style.overflowY = wanted > cap ? 'auto' : 'hidden';
  };
  // What a kept box must not cover: every note editor but its own unit's, every other box and every other notice.
  const obstacles = (own: Element | null): Rect[] => [
    ...noteEditors().filter(({ editor }) => editor !== own).map(({ rect }) => rect),
    ...[...document.querySelectorAll<HTMLElement>('textarea[data-structure-typing-buffer], [data-structure-typing-notice]')]
      .filter((other) => other !== element && other !== notice && getComputedStyle(other).display !== 'none')
      .map((other) => other.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0),
  ];
  const hits = (rects: Rect[], own: Element | null) => {
    const others = obstacles(own);
    return others.filter((other) => rects.some((rect) => overlaps(rect, other)));
  };
  // Where it is now, as the screen has it: the box (unless folded away) and its notice.
  const footprint = (): Rect[] => [
    ...(element.style.display === 'none' ? [] : [element.getBoundingClientRect()]),
    ...(notice ? [notice.getBoundingClientRect()].filter((rect) => rect.width > 0 && rect.height > 0) : []),
  ];
  const textColumn = () => {
    const editors = noteEditors().map(({ rect }) => rect);
    return editors.length ? { left: Math.min(...editors.map((rect) => rect.left)), right: Math.max(...editors.map((rect) => rect.right)) } : null;
  };
  const outsideColumn = (rect: Rect, column: { left: number; right: number } | null) =>
    !column || rect.right <= column.left || rect.left >= column.right;
  // Folded to its notice: placed at the window's right edge, else its left, as high as it goes without covering
  // anything, below any other notice. Shown words, asked for, sit under it.
  const fold = () => {
    if (!notice) return;
    mode = 'folded';
    placedAt = '';
    if (showButton) {
      showButton.hidden = false;
      showButton.textContent = unfolded ? 'Hide words' : 'Show words';
    }
    element.style.display = 'none';
    notice.style.maxWidth = `${Math.max(0, Math.min(DOCK_WIDTH, window.innerWidth - 2 * DOCK_EDGE))}px`;
    const measured = notice.getBoundingClientRect();
    const width = measured.width || NOTICE_RESERVE;
    const height = measured.height || NOTICE_HEIGHT;
    let spot: { left: number; top: number } | null = null;
    for (const left of [window.innerWidth - width - DOCK_EDGE, DOCK_EDGE]) {
      for (let top = DOCK_EDGE; top + height <= window.innerHeight - DOCK_EDGE && !spot; top += height + STACK_GAP) {
        if (!hits([{ left, top, right: left + width, bottom: top + height }], null).length) spot = { left, top };
      }
      if (spot) break;
    }
    // Nowhere clear (a very narrow, full window): the top right corner; recorded as a known limit.
    spot ??= { left: Math.max(DOCK_EDGE, window.innerWidth - width - DOCK_EDGE), top: DOCK_EDGE };
    notice.style.left = `${spot.left}px`;
    notice.style.top = `${spot.top}px`;
    if (unfolded) {
      Object.assign(element.style, { display: '', boxSizing: 'border-box', left: `${spot.left}px`, top: `${spot.top + height + 2}px`,
        width: `${Math.min(DOCK_WIDTH, window.innerWidth - 2 * DOCK_EDGE)}px`, minHeight: '0px', paddingTop: '4px', paddingRight: '6px',
        background: 'Canvas', color: 'CanvasText' });
      resize();
    }
  };
  // A kept box with no unit to sit on, or one it cannot sit on without covering something, goes beside the text
  // column: right, else left, wholly outside it, below anything it would cover. With no such place it folds.
  // Never removed: on screen it may be the only copy of the words.
  const dock = () => {
    const column = textColumn();
    // Already docked, still clear and still outside the column: left where it is.
    if (mode === 'margin' && footprint().every((rect) => outsideColumn(rect, column)) && !hits(footprint(), null).length) return;
    placedAt = '';
    const sides: Array<{ left: number; width: number }> = [];
    if (column) {
      const right = window.innerWidth - DOCK_EDGE - (column.right + DOCK_GAP);
      const left = column.left - DOCK_GAP - DOCK_EDGE;
      if (right >= DOCK_MIN_WIDTH) sides.push({ left: column.right + DOCK_GAP, width: Math.min(DOCK_WIDTH, right) });
      if (left >= DOCK_MIN_WIDTH) { const width = Math.min(DOCK_WIDTH, left); sides.push({ left: column.left - DOCK_GAP - width, width }); }
    } else {
      sides.push({ left: DOCK_EDGE, width: Math.min(DOCK_WIDTH, window.innerWidth - 2 * DOCK_EDGE) });
    }
    const preferred = parseFloat(element.style.top) || DOCK_EDGE;
    for (const side of sides) {
      mode = 'margin';
      if (showButton) showButton.hidden = true;
      Object.assign(element.style, { display: '', boxSizing: 'border-box', left: `${side.left}px`, width: `${side.width}px`,
        minHeight: '0px', paddingTop: `${NOTICE_HEIGHT + 4}px`, paddingRight: '6px', background: 'Canvas', color: 'CanvasText' });
      let top = Math.max(DOCK_EDGE, preferred);
      for (let tries = 0; tries < 40; tries += 1) {
        element.style.top = `${top}px`;
        resize();
        if (element.getBoundingClientRect().bottom > window.innerHeight - DOCK_EDGE) {
          // Too low: start again from the top of the window, once.
          if (top === DOCK_EDGE) break;
          top = DOCK_EDGE;
          continue;
        }
        placeNotice();
        const placed = footprint();
        if (!placed.every((rect) => outsideColumn(rect, column))) break;
        const hit = hits(placed, null);
        if (!hit.length) return;
        top = Math.max(...hit.map((rect) => rect.bottom)) + STACK_GAP;
      }
    }
    fold();
  };
  // Placed over its unit again on every layout change, kept or not, for as long as it is on screen: a banner above
  // the note, a scroll, a resize or a late font moves the unit, and the box must never be left over another line.
  // A timer catches what raises no event (content pushed down); scroll and resize place it at once.
  const place = () => {
    // A hidden page has no layout to follow; it is placed again on the next tick once shown.
    if (document.hidden) return;
    const anchor = input.locate();
    // An open window stays over its unit while the structure moves it; it is never docked.
    if (!notice) {
      // Its unit not rendered (remounting): the box stays where it was last put.
      if (!anchor || !follow(anchor)) return;
      resize();
      placeNotice();
      return;
    }
    if (anchor) {
      const wasAway = mode !== 'unit';
      if (wasAway) {
        mode = 'unit';
        placedAt = '';
        element.style.display = '';
        if (showButton) showButton.hidden = true;
      }
      if (follow(anchor) || wasAway) { resize(); placeNotice(); }
      // Checked after every placement: on its unit, box and notice cover nothing but that unit.
      if (!hits(footprint(), anchor).length) return;
    }
    if (mode === 'folded' && !anchor) {
      // Folded: stays folded while its strip is clear; shown words follow it.
      if (!hits(footprint(), null).length) return;
      fold();
      return;
    }
    dock();
  };
  // The unit is usually still the focused editor here; a request may name a unit not rendered yet.
  const start = input.locate() ?? (isNoteEditor(document.activeElement) ? document.activeElement as HTMLTextAreaElement : null);
  if (start) follow(start);
  // Reopened on a note whose editor is not there yet: somewhere it can be read.
  else Object.assign(element.style, { left: '25%', top: '20%', width: '50%', background: 'Canvas', color: 'CanvasText' });
  document.body.appendChild(element);
  resize();
  const caret = Math.min(input.caret, input.text.length);
  if (input.focus !== false) {
    element.focus({ preventScroll: true });
    element.setSelectionRange(caret, caret);
  }

  let held = input.focus !== false;
  // Editors re-take focus as they remount and the structure settles; input stays here until the handoff.
  const keepFocus = (event: FocusEvent) => { if (held && isNoteEditor(event.target)) element.focus({ preventScroll: true }); };
  const keepFromBody = () => {
    setTimeout(() => {
      if (held && (document.activeElement === document.body || document.activeElement === null)) element.focus({ preventScroll: true });
    }, 0);
  };
  if (held) {
    document.addEventListener('focusin', keepFocus, true);
    element.addEventListener('focusout', keepFromBody);
  }
  element.addEventListener('input', resize);
  const follower = setInterval(place, FOLLOW_MS);
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
  void document.fonts?.ready.then(() => { if (element.isConnected) place(); });

  let composing = false;
  let composed: Array<() => void> = [];
  element.addEventListener('compositionstart', () => { composing = true; });
  element.addEventListener('compositionend', () => {
    composing = false;
    const waiting = composed;
    composed = [];
    waiting.forEach((callback) => callback());
  });

  let stopWatchingAccount: (() => void) | null = null;
  // Kept words stop taking focus but keep following their unit; only closing stops that.
  const stopHolding = () => {
    held = false;
    document.removeEventListener('focusin', keepFocus, true);
    element.removeEventListener('focusout', keepFromBody);
  };
  return {
    element,
    initialText: input.initialText ?? input.text,
    text: () => element.value,
    caret: () => element.selectionEnd,
    changed: () => element.value !== (input.initialText ?? input.text),
    isComposing: () => composing,
    isRetained: () => notice !== null,
    afterComposition: (callback) => { composed.push(callback); },
    retain({ onClose, noteId, crowded }) {
      if (notice) return;
      stopHolding();
      notice = document.createElement('div');
      notice.dataset.structureTypingNotice = noteId ?? 'true';
      if (element.dataset.structureTypingEntry) notice.dataset.structureTypingEntry = element.dataset.structureTypingEntry;
      notice.setAttribute('role', 'alert');
      // On the box itself, at the right end of its first line; the box keeps that width free for it. Over no line
      // of the note: the box covers only the unit it stands in for. Clicks other than Discard pass through it.
      const rect = element.getBoundingClientRect();
      Object.assign(notice.style, { position: 'fixed', zIndex: '2147483001', top: `${rect.top + 2}px`,
        display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap', fontSize: '11px', lineHeight: '16px',
        padding: '0 4px', background: 'Canvas', color: 'CanvasText', border: '1px solid currentColor',
        pointerEvents: 'none' });
      const label = document.createElement('span');
      label.textContent = crowded ? TOO_MANY_KEPT : NOT_YET_IN_NOTE;
      notice.title = crowded ? TOO_MANY_KEPT_FULL : NOT_YET_IN_NOTE_FULL;
      notice.setAttribute('aria-label', notice.title);
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Discard';
      close.title = 'Discard these words. They are not in the note.';
      close.style.pointerEvents = 'auto';
      close.addEventListener('click', () => { this.close(); onClose?.(); });
      // Only when the words are folded away for want of room: one click shows them.
      showButton = document.createElement('button');
      showButton.type = 'button';
      showButton.hidden = true;
      showButton.textContent = 'Show words';
      showButton.style.pointerEvents = 'auto';
      showButton.addEventListener('click', () => { unfolded = !unfolded; fold(); });
      notice.append(label, close, showButton);
      document.body.appendChild(notice);
      reserve = Math.ceil(notice.getBoundingClientRect().width) || NOTICE_RESERVE;
      element.style.paddingRight = `${(parseFloat(getComputedStyle(element).paddingRight) || 0) + reserve + 4}px`;
      resize();
      placeNotice();
      place();
      // Off the screen for the next person; the words stay stored for this account.
      const owner = currentAccount();
      stopWatchingAccount = useAuthStore.subscribe(() => { if (currentAccount() !== owner) this.close(); });
    },
    close() {
      stopWatchingAccount?.();
      stopHolding();
      clearInterval(follower);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      composed = [];
      notice?.remove();
      element.remove();
    },
  };
}
