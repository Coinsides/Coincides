/** Audit-only recorder. It observes the native print lifecycle without synthesizing it. */
type PrintCapture = {
  trigger: 'window.print';
  beforeprintSeen: boolean;
  afterprintSeen: boolean;
  capturedAt?: string;
  printMediaAtCapture?: boolean;
  noteId?: string;
  error?: string;
  persistenceError?: string;
  restoredFromLocalStorage?: boolean;
  pages?: unknown[];
};

const CAPTURE_STORAGE_KEY = 'coincides.audit.b1c.native-print-capture.v1';
let latest: PrintCapture | null = null;
let frozenOuterHTML = '';
let removeListeners: (() => void) | null = null;

function publish() {
  // Synchronous storage inside beforeprint survives cancelling the native
  // dialog with a reload. A restored capture never invents afterprint evidence.
  if (latest) {
    try {
      localStorage.setItem(CAPTURE_STORAGE_KEY, JSON.stringify({ version: 1, receipt: latest, outerHTML: frozenOuterHTML }));
    } catch {
      latest.persistenceError = 'Could not persist this audit capture across reload.';
    }
  }
  const receipt = document.querySelector<HTMLElement>('[data-b1c-print-receipt]');
  if (receipt) receipt.textContent = JSON.stringify(latest, null, 2);
  const html = document.querySelector<HTMLTextAreaElement>('[data-b1c-print-html]');
  if (html) html.value = frozenOuterHTML;
  const status = document.querySelector<HTMLOutputElement>('[data-b1c-print-status]');
  if (status) status.textContent = latest?.error ?? (latest?.beforeprintSeen
    ? `Native beforeprint captured: ${latest.pages?.length ?? 0} pages; afterprint ${latest.afterprintSeen ? 'seen' : 'unconfirmed'}${latest.restoredFromLocalStorage ? ' · restored after reload' : ''}${latest.persistenceError ? ' · storage failed' : ''}`
    : 'Waiting for native beforeprint');
}

export function restorePrintCapture() {
  if (latest) return;
  try {
    const stored = localStorage.getItem(CAPTURE_STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as { version?: number; receipt?: PrintCapture; outerHTML?: string };
    if (parsed.version !== 1 || parsed.receipt?.trigger !== 'window.print' || typeof parsed.outerHTML !== 'string') return;
    latest = { ...parsed.receipt, restoredFromLocalStorage: true };
    frozenOuterHTML = parsed.outerHTML;
    publish();
  } catch {
    const status = document.querySelector<HTMLOutputElement>('[data-b1c-print-status]');
    if (status) status.textContent = 'Stored audit print capture could not be restored.';
  }
}

function box(element: Element) {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height, x: rect.x, y: rect.y };
}

export function closeFrozenPrintCapture() {
  document.querySelector('[data-b1c-print-preview]')?.remove();
}

export function printNoteWithCapture() {
  closeFrozenPrintCapture();
  removeListeners?.();
  latest = { trigger: 'window.print', beforeprintSeen: false, afterprintSeen: false };
  frozenOuterHTML = '';
  const before = () => {
    const root = document.querySelector<HTMLElement>('body > [data-note-print-root]');
    if (!root) {
      latest = { ...latest!, beforeprintSeen: true, error: 'Native beforeprint fired without a mounted print root.' };
      publish();
      return;
    }
    frozenOuterHTML = root.outerHTML;
    latest = {
      ...latest!, beforeprintSeen: true, capturedAt: new Date().toISOString(),
      printMediaAtCapture: window.matchMedia('print').matches,
      noteId: root.dataset.noteId,
      pages: Array.from(root.querySelectorAll<HTMLElement>('[data-note-print-page]')).map((page) => {
        const canvas = page.querySelector<HTMLElement>('[data-note-print-canvas]')!;
        const computed = getComputedStyle(page);
        return {
          frameId: page.dataset.pageFrameId,
          sliceIndex: Number(page.dataset.printSliceIndex),
          sliceOffset: Number(page.dataset.printSliceOffset),
          paperSize: page.dataset.paperSize,
          scale: Number(page.dataset.printScale),
          box: box(page),
          css: { width: computed.width, height: computed.height, overflow: computed.overflow, breakAfter: computed.breakAfter, page: computed.getPropertyValue('page') },
          canvas: { width: canvas.style.width, height: canvas.style.height, top: canvas.style.top, transform: canvas.style.transform },
          fragments: Array.from(page.querySelectorAll<HTMLElement>('[data-note-print-fragment]')).map((fragment) => ({
            blockId: fragment.dataset.blockId,
            box: box(fragment),
            css: { left: fragment.style.left, top: fragment.style.top, width: fragment.style.width, height: fragment.style.height },
            text: Array.from(fragment.querySelectorAll<HTMLTextAreaElement>('textarea')).map((field) => ({
              length: field.value.length, first: field.value.slice(0, 100), last: field.value.slice(-100),
            })),
          })),
        };
      }),
    };
    publish();
  };
  const after = () => {
    latest = { ...latest!, afterprintSeen: true };
    publish();
  };
  // This handler is attached only on the button click, after the mounted
  // NotePrintLayer registered its own synchronous beforeprint renderer.
  window.addEventListener('beforeprint', before, { once: true });
  window.addEventListener('afterprint', after, { once: true });
  removeListeners = () => {
    window.removeEventListener('beforeprint', before);
    window.removeEventListener('afterprint', after);
  };
  publish();
  window.print();
}

export function showFrozenPrintCapture() {
  closeFrozenPrintCapture();
  if (!frozenOuterHTML || !latest?.beforeprintSeen) {
    const status = document.querySelector<HTMLOutputElement>('[data-b1c-print-status]');
    if (status) status.textContent = 'No native print capture yet. Use Print note first.';
    return;
  }
  const overlay = document.createElement('section');
  overlay.dataset.b1cPrintPreview = 'true';
  overlay.setAttribute('aria-label', 'Frozen native beforeprint capture');
  Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2147483647', overflow: 'auto', background: '#777', padding: '16px' });
  const heading = document.createElement('header');
  Object.assign(heading.style, { position: 'sticky', top: '0', zIndex: '1', background: '#fff', color: '#111', padding: '12px', marginBottom: '16px' });
  heading.textContent = `Frozen native beforeprint capture · ${latest.pages?.length ?? 0} physical pages · afterprint ${latest.afterprintSeen ? 'seen' : 'unconfirmed'}${latest.restoredFromLocalStorage ? ' · restored after reload' : ''} · Screen visualization, not a PDF or native preview screenshot. `;
  const close = document.createElement('button');
  close.textContent = 'Close frozen print capture';
  close.onclick = closeFrozenPrintCapture;
  heading.append(close);
  const style = document.createElement('style');
  // The root presentation below repeats only NotePrintLayer.css's print-root
  // visibility/position/color rules, scoped to this audit-only overlay. Its
  // existing page/canvas/fragment CSS and captured inline geometry are reused.
  style.textContent = `[data-b1c-print-preview] [data-note-print-root] {
    position: static; left: auto; top: auto; visibility: visible;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }`;
  const capture = document.createElement('div');
  capture.innerHTML = frozenOuterHTML;
  overlay.append(style, heading, capture);
  document.body.append(overlay);
}
