import { useEffect, useRef, useState, type RefObject } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { useNoteAgentHumanEditor } from '@/lib/noteAgentHumanBridge';
import type { AgentMessage } from '@shared/types';
import styles from './NoteAnswerCards.module.css';

function AnswerCard({ message, noteId, surfaceRef, dismissed, onDismiss }: {
  message: AgentMessage; noteId: string; surfaceRef: RefObject<HTMLElement>;
  dismissed: boolean; onDismiss: () => void;
}) {
  const editor = useNoteAgentHumanEditor(noteId);
  const [point, setPoint] = useState<{ left: number; top: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inserting = useRef(false);
  const card = message.meta?.answer_card;
  const anchorId = card?.selection.block_ids[0];
  useEffect(() => {
    if (dismissed || !anchorId) return;
    const surface = surfaceRef.current;
    let frame = 0;
    const measure = () => {
      const anchor = Array.from(surface?.querySelectorAll<HTMLElement>('[data-note-block-shell="true"]') ?? [])
        .find((element) => element.dataset.blockId === anchorId);
      if (!anchor) { setPoint(null); return; }
      const rect = anchor.getBoundingClientRect();
      // Use the rendered paper edge even when a selected block is narrow.
      const paper = Array.from(surface?.querySelectorAll<HTMLElement>('[data-flow-page-paper], [data-note-header-band]') ?? [])
        .map((element) => element.getBoundingClientRect())
        .find((candidate) => candidate.top <= rect.top && candidate.bottom >= rect.top);
      const paperRight = paper?.right ?? anchor.closest<HTMLElement>('[data-page-display-scale]')?.getBoundingClientRect().right ?? rect.right;
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;
      setPoint(visible ? { left: Math.max(8, Math.min(window.innerWidth - 304, paperRight + 16)),
        top: Math.max(12, Math.min(window.innerHeight - 180, rect.top)) } : null);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    if (surface) resize?.observe(surface);
    const mutation = typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null;
    if (surface) mutation?.observe(surface, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['style', 'data-page-display-scale'] });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule); resize?.disconnect(); mutation?.disconnect(); };
  }, [anchorId, dismissed, surfaceRef]);
  if (!card || dismissed || !point) return null;
  const insert = async () => {
    if (!editor || !anchorId || inserting.current) return;
    inserting.current = true; setBusy(true); setError('');
    try {
      if (await editor.insertAnswer(anchorId, message.content)) onDismiss();
      else setError('尚未插入，请先完成当前编辑后重试。');
    } catch { setError('插入失败，请重试。'); }
    finally { inserting.current = false; setBusy(false); }
  };
  return <aside className={styles.card} style={point} aria-label="页边答卡" data-answer-anchor={anchorId}>
    <p className={styles.question}>{card.question}</p>
    <div className={styles.answer}>{message.content}</div>
    {error && <p role="alert">{error}</p>}
    <div className={styles.actions}>
      <button type="button" onClick={onDismiss} disabled={busy}>散去</button>
      <button type="button" onClick={() => void insert()} disabled={!editor || busy}>{busy ? '插入中…' : '插入为块'}</button>
    </div>
  </aside>;
}

/** A projection of conversation messages; closing it never deletes the answer. */
export function NoteAnswerCards({ noteId, surfaceRef }: { noteId: string; surfaceRef: RefObject<HTMLElement> }) {
  const messages = useAgentStore((state) => state.messages);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  return <>{messages.filter((message) => message.role === 'assistant' && message.content.trim()
    && message.meta?.answer_card?.selection.note_id === noteId).map((message) => <AnswerCard
      key={message.id} message={message} noteId={noteId} surfaceRef={surfaceRef} dismissed={dismissed.has(message.id)}
      onDismiss={() => setDismissed((current) => new Set(current).add(message.id))} />)}</>;
}
