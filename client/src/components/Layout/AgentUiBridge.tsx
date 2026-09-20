import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAgentUiStore, userOwnsInput } from '@/stores/agentUiStore';

/** A single latest pending presentation, never an editor focus or a domain action. */
export function AgentUiBridge() {
  const pending = useAgentUiStore((state) => state.pending);
  const location = useLocation();
  const navigate = useNavigate();
  const composing = useRef(false);
  const pointerBusy = useRef(false);
  const [idleRevision, setIdleRevision] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reconsider = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIdleRevision((value) => value + 1), 150);
    };
    const start = () => { composing.current = true; };
    const end = () => { composing.current = false; reconsider(); };
    const pointerStart = () => { pointerBusy.current = true; };
    const pointerEnd = () => { pointerBusy.current = false; reconsider(); };
    document.addEventListener('focusout', reconsider);
    document.addEventListener('compositionstart', start);
    document.addEventListener('compositionend', end);
    document.addEventListener('pointerdown', pointerStart, true);
    document.addEventListener('pointerup', pointerEnd, true);
    document.addEventListener('pointercancel', pointerEnd, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('focusout', reconsider);
      document.removeEventListener('compositionstart', start);
      document.removeEventListener('compositionend', end);
      document.removeEventListener('pointerdown', pointerStart, true);
      document.removeEventListener('pointerup', pointerEnd, true);
      document.removeEventListener('pointercancel', pointerEnd, true);
    };
  }, []);
  useEffect(() => {
    if (!pending || composing.current || pointerBusy.current || userOwnsInput()) return;
    const target = pending.target;
    const path = target.type === 'board_member' ? `/boards/${encodeURIComponent(target.board_id)}`
      : `/notes/${encodeURIComponent(target.note_id)}`;
    if (location.pathname !== path) { navigate(path); return; }
    useAgentUiStore.setState({ pending: null, focusCommand: pending.kind === 'focus_object' ? pending : null });
  }, [pending, location.pathname, navigate, idleRevision]);
  return null;
}
