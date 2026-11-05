import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAgentUiStore } from '@/stores/agentUiStore';
import { documentKey, useDocumentTabsStore } from '@/stores/documentTabsStore';
import {
  generateSourcePages,
  getSourcePagesByProjectionNote,
  type SourcePageRegister,
} from '@/pages/Sources/sourceApi';

const POLL_INTERVAL_MS = 2000;
const MAX_RETRY_DELAY_MS = 30_000;
// About a minute of backoff before asking the reader instead.
const MAX_LOAD_FAILURES = 6;

export type SourceViewMode = 'text' | 'pages';

// A note with no Source behind it will not start having one on retry.
const NOT_A_SOURCE: SourcePageRegister = {
  source_id: '', supported: false, status: 'none', expected: 0, completed: 0, failed_pages: [], pages: [],
};

function storedView(noteId?: string) {
  return useDocumentTabsStore.getState().tabs.find((tab) => tab.key === documentKey('note', noteId ?? ''))?.sourceView;
}

function rememberedView(noteId?: string) {
  return storedView(noteId) ?? { mode: 'text' as SourceViewMode, page: 1 };
}

export interface SourcePageViewController {
  noteId: string;
  /** False until this Source is known to have an original page view. */
  available: boolean;
  active: boolean;
  register: SourcePageRegister | null;
  loadFailed: boolean;
  jump: { page: number; nonce: number } | null;
  generating: boolean;
  generateFailed: boolean;
  initialPage: () => number;
  setMode: (mode: SourceViewMode) => void;
  jumpToPage: (page: number) => void;
  /** A jump applies once; the tab's remembered page owns every later entry. */
  clearJump: () => void;
  rememberPage: (page: number) => void;
  takeTextScroll: () => { top: number; left: number } | null;
  generate: () => void;
  reload: () => void;
}

export function useSourcePageViewController({ noteId, enabled }: {
  noteId: string | undefined;
  enabled: boolean;
}): SourcePageViewController {
  const [scoped, setScoped] = useState(() => ({ noteId, mode: rememberedView(noteId).mode }));
  const mode = scoped.noteId === noteId ? scoped.mode : rememberedView(noteId).mode;
  const [read, setRead] = useState<{ noteId: string | undefined; register: SourcePageRegister | null; failed: boolean }>(
    { noteId, register: null, failed: false });
  const [jump, setJump] = useState<SourcePageViewController['jump']>(null);
  const [generating, setGenerating] = useState(false);
  const [generateFailed, setGenerateFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const nonce = useRef(0);
  const textScroll = useRef<{ top: number; left: number } | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Read before the switch commits: hiding the text shortens the scroll host,
  // and the browser clamps its offset as soon as layout sees that.
  const keepTextScroll = useCallback(() => {
    if (modeRef.current === 'pages') return;
    const main = document.querySelector<HTMLElement>('[data-app-main-scroll="true"]');
    textScroll.current = main ? { top: main.scrollTop, left: main.scrollLeft } : null;
  }, []);
  const register = read.noteId === noteId ? read.register : null;
  const loadFailed = read.noteId === noteId && read.failed;

  useLayoutEffect(() => {
    setScoped((current) => current.noteId === noteId ? current : { noteId, mode: rememberedView(noteId).mode });
    setJump(null);
    setGenerateFailed(false);
  }, [noteId]);

  const remember = useCallback((view: Partial<{ mode: SourceViewMode; page: number }>) => {
    if (!noteId) return;
    useDocumentTabsStore.getState().remember(documentKey('note', noteId), {
      sourceView: { ...rememberedView(noteId), ...view },
    });
  }, [noteId]);

  useEffect(() => {
    if (!enabled || !noteId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const load = async () => {
      try {
        const next = await getSourcePagesByProjectionNote(noteId);
        if (cancelled) return;
        failures = 0;
        setRead({ noteId, register: next, failed: false });
        if (next.status === 'pending' || next.status === 'partial') timer = setTimeout(load, POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) return;
        if ((error as { response?: { status?: number } }).response?.status === 404) {
          setRead({ noteId, register: NOT_A_SOURCE, failed: false });
          return;
        }
        failures += 1;
        if (failures < MAX_LOAD_FAILURES) {
          timer = setTimeout(load, Math.min(POLL_INTERVAL_MS * 2 ** (failures - 1), MAX_RETRY_DELAY_MS));
          return;
        }
        setRead((current) => ({ noteId, register: current.noteId === noteId ? current.register : null, failed: true }));
      }
    };
    void load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [enabled, noteId, reloadKey]);

  // A Source opens on its original pages when the tab has no say of its own. Settled
  // once per note, so it never overrides the reader: while pages are still being
  // made it keeps waiting, but a reader who has moved on stays in the text.
  const defaultSettledFor = useRef<string | undefined>();
  useEffect(() => {
    if (!enabled || !noteId || !register || defaultSettledFor.current === noteId) return;
    if (storedView(noteId) || !register.supported) {
      defaultSettledFor.current = noteId;
      return;
    }
    if (!register.pages.length) {
      if (register.status !== 'pending' && register.status !== 'partial') defaultSettledFor.current = noteId;
      return;
    }
    defaultSettledFor.current = noteId;
    const { focusCommand, pending } = useAgentUiStore.getState();
    const main = document.querySelector<HTMLElement>('[data-app-main-scroll="true"]');
    if (focusCommand || pending || (main?.scrollTop ?? 0) > 0) {
      remember({ mode: 'text' });
      return;
    }
    keepTextScroll();
    setScoped({ noteId, mode: 'pages' });
    remember({ mode: 'pages' });
  }, [enabled, noteId, register, remember, keepTextScroll]);

  const setMode = useCallback((next: SourceViewMode) => {
    if (next === 'pages') keepTextScroll();
    setJump(null);
    setScoped({ noteId, mode: next });
    remember({ mode: next });
  }, [noteId, remember, keepTextScroll]);

  const jumpToPage = useCallback((page: number) => {
    keepTextScroll();
    nonce.current += 1;
    setJump({ page, nonce: nonce.current });
    setScoped({ noteId, mode: 'pages' });
    remember({ mode: 'pages', page });
  }, [noteId, remember, keepTextScroll]);

  const clearJump = useCallback(() => setJump(null), []);

  const generate = useCallback(() => {
    if (!register) return;
    setGenerating(true);
    setGenerateFailed(false);
    void generateSourcePages(register.source_id).then((next) => {
      setRead({ noteId, register: next, failed: false });
      setReloadKey((key) => key + 1);
    }).catch(() => setGenerateFailed(true)).finally(() => setGenerating(false));
  }, [noteId, register]);

  return {
    noteId: noteId ?? '',
    // An unknown Source keeps its door open once loading has given up, so the
    // reader gets the error and a retry instead of a control that never appears.
    available: enabled && (register ? register.supported : loadFailed),
    // A remembered original-page tab stays there while its register reloads.
    active: enabled && mode === 'pages' && (register === null || register.supported),
    register,
    loadFailed,
    jump,
    generating,
    generateFailed,
    initialPage: () => rememberedView(noteId).page,
    setMode,
    jumpToPage,
    clearJump,
    rememberPage: (page) => remember({ page }),
    takeTextScroll: () => {
      const saved = textScroll.current;
      textScroll.current = null;
      return saved;
    },
    generate,
    reload: () => {
      setRead((current) => ({ ...current, failed: false }));
      setReloadKey((key) => key + 1);
    },
  };
}
