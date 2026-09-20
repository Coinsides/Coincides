import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { AgentUiFocusTarget } from '@shared/types/agentUiCommand';
import { documentKey, useDocumentTabsStore } from '@/stores/documentTabsStore';
import { useAgentUiStore, userOwnsInput } from '@/stores/agentUiStore';
import { scrollPageReadingToRect } from '../pageReadingDomService';
import type { CanvasRect } from '../types';

export function useNoteDocumentShell({ noteId, title, projectId, enabled, blockListRef, resolveTarget, beforeFocus }: {
  noteId: string; title: string; projectId?: string | null; enabled: boolean;
  blockListRef: RefObject<HTMLElement>; beforeFocus?: (target: AgentUiFocusTarget) => void;
  resolveTarget: (target: AgentUiFocusTarget) => { rect: CanvasRect; selector: string; id?: string } | null;
}) {
  const command = useAgentUiStore((state) => state.focusCommand);
  const beforeFocusRef = useRef(beforeFocus);
  beforeFocusRef.current = beforeFocus;
  const resolveRef = useRef(resolveTarget);
  resolveRef.current = resolveTarget;
  useLayoutEffect(() => {
    if (enabled) useDocumentTabsStore.getState().open({ kind: 'note', id: noteId, title: title || 'Untitled note', projectId });
  }, [enabled, noteId, title, projectId]);
  useLayoutEffect(() => {
    if (!enabled) return;
    const key = documentKey('note', noteId);
    const main = blockListRef.current?.closest<HTMLElement>('[data-app-main-scroll="true"]');
    if (!main) return;
    const saved = useDocumentTabsStore.getState().tabs.find((tab) => tab.key === key)?.scroll;
    let restoring = true;
    let frame = requestAnimationFrame(() => {
      main.scrollTop = saved?.top ?? 0;
      main.scrollLeft = saved?.left ?? 0;
      frame = requestAnimationFrame(() => {
        main.scrollTop = saved?.top ?? 0;
        main.scrollLeft = saved?.left ?? 0;
        restoring = false;
      });
    });
    const remember = () => {
      if (!restoring) useDocumentTabsStore.getState().remember(key, { scroll: { top: main.scrollTop, left: main.scrollLeft } });
    };
    main.addEventListener('scroll', remember, { passive: true });
    return () => { cancelAnimationFrame(frame); remember(); main.removeEventListener('scroll', remember); };
  }, [enabled, noteId, blockListRef]);
  useEffect(() => {
    if (!enabled || command?.kind !== 'focus_object' || command.target.type === 'board_member'
      || command.target.note_id !== noteId) return;
    if (userOwnsInput()) { useAgentUiStore.setState({ pending: command, focusCommand: null }); return; }
    const root = blockListRef.current;
    if (!root) return;
    beforeFocusRef.current?.(command.target);
    const marked = new Set<HTMLElement>();
    let positioned = false;
    let restorationFinished = false;
    const present = () => {
      if (!restorationFinished) return;
      if (userOwnsInput()) { useAgentUiStore.setState({ pending: command, focusCommand: null }); return; }
      // Revealing a chapter can repaginate the note. Resolve after the mounted
      // target arrives, using the latest render's existing layout projection.
      const target = resolveRef.current(command.target);
      if (!target) return;
      const elements = [...root.querySelectorAll<HTMLElement>(target.selector)].filter((element) =>
        !target.id || element.dataset.blockId === target.id || element.dataset.pageFrameId === target.id || element.dataset.paperInkLayer === target.id);
      if (!elements.length) return;
      if (!positioned) { scrollPageReadingToRect(root, target.rect); positioned = true; }
      elements.forEach((element) => { element.dataset.agentUiHighlight = 'true'; marked.add(element); });
    };
    // Let restoration finish before applying a newer explicit presentation request.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => { restorationFinished = true; present(); });
    });
    const observer = new MutationObserver(() => {
      if (!restorationFinished) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(present);
    });
    observer.observe(root, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      if (useAgentUiStore.getState().focusCommand?.command_id === command.command_id) useAgentUiStore.setState({ focusCommand: null });
    }, 2200);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect(); marked.forEach((element) => delete element.dataset.agentUiHighlight); };
  }, [enabled, command, noteId, blockListRef]);
}
