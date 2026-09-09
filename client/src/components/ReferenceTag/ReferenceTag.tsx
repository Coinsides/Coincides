import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ExternalLink, X } from 'lucide-react';
import api from '@/services/api';
import { ANNOTATION_COLOR_OPTIONS } from '@/pages/Notes/canvasEngine/annotationColorService';
import styles from './ReferenceTag.module.css';

export type ReferenceHealth = 'active' | 'drifted' | 'lost';

/** FNV-1a over note identity, independent of session and encounter order. */
export function referenceColor(noteId: string) {
  let hash = 2166136261;
  for (let index = 0; index < noteId.length; index += 1) hash = Math.imul(hash ^ noteId.charCodeAt(index), 16777619);
  return ANNOTATION_COLOR_OPTIONS[(hash >>> 0) % ANNOTATION_COLOR_OPTIONS.length];
}

export interface ReferenceTagProps {
  noteId?: string | null;
  noteTitle?: string | null;
  blockId?: string | null;
  startOffset?: number | null;
  endOffset?: number | null;
  originBoardTitle?: string | null;
  health: ReferenceHealth;
  retired?: boolean;
  onOpenSource?: () => void;
}

/** Shared by board cards, staging and the note's Item reference projection. */
export function ReferenceTag({ noteId, noteTitle, blockId, startOffset, endOffset, originBoardTitle,
  health, retired, onOpenSource }: ReferenceTagProps) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<{ title: string; status: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const color = noteId ? referenceColor(noteId).accent : 'var(--text-secondary)';

  useEffect(() => {
    setSource(null);
    setFailed(false);
    if (!open || !noteId) return;
    let active = true;
    void api.get<{ title: string; status: string }>(`/notes/${encodeURIComponent(noteId)}`).then(({ data }) => {
      if (active) setSource(data);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [open, noteId, attempt]);

  useEffect(() => {
    if (!open) return;
    const node = popover.current;
    node?.setAttribute('popover', 'manual');
    node?.showPopover?.();
    const dismiss = (event: PointerEvent) => {
      if (!node?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => { node?.hidePopover?.(); document.removeEventListener('pointerdown', dismiss, true); };
  }, [open]);

  function close() { setOpen(false); button.current?.focus(); }
  const resolvedHealth = source?.status && source.status !== 'active' ? 'lost' : health;
  const status = resolvedHealth === 'active' ? 'Live' : resolvedHealth === 'drifted' ? 'Drifted' : 'Lost';
  return <span className={styles.wrapper} onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape' && open) { event.preventDefault(); close(); } }}>
    <button ref={button} type="button" className={styles.tag} aria-label="Reference details"
      aria-disabled={false} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      data-reference-health={health} data-reference-color={noteId ? referenceColor(noteId).token : 'unavailable'}
      style={{ '--reference-color': color } as CSSProperties} onClick={() => {
        const rect = button.current!.getBoundingClientRect();
        const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 300));
        setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 312)),
          top, maxHeight: window.innerHeight - top - 8 });
        setOpen((current) => !current);
      }}><span aria-hidden="true" className={styles.mark} /></button>
    {open && <div ref={popover} id={id} role="dialog" aria-label="Reference details" aria-disabled={false}
      className={styles.details} style={position}>
      <header><strong>Reference details</strong><button type="button" aria-label="Close reference details" onClick={close}><X size={16}/></button></header>
      <dl>
        <dt>Source</dt><dd>{source?.title || noteTitle || (noteId ? failed ? 'Source note unavailable' : 'Loading source…'
          : originBoardTitle ? `Board chalk · ${originBoardTitle}` : 'Birthplace unavailable')}</dd>
        <dt>Location</dt><dd>{blockId ? `Block ${blockId}${startOffset != null && endOffset != null ? ` · characters ${startOffset + 1}–${endOffset}` : ''}`
          : noteId ? 'Origin note; no exact text location recorded.' : originBoardTitle ? 'Born on this board.' : 'No source location available.'}</dd>
        <dt>Status</dt><dd>{status}: {resolvedHealth === 'active' ? 'Current content is available.'
          : resolvedHealth === 'drifted' ? 'The source changed. The last valid snapshot is shown.'
            : 'The source is unavailable. Any retained content stays visible.'}{retired ? ' This item is retired.' : ''}</dd>
      </dl>
      {failed && <p role="alert">Could not load the source details. <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
      {noteId && (!source?.status || source.status === 'active') && (onOpenSource
        ? <button className={styles.openSource} type="button" onClick={() => { close(); onOpenSource(); }}><ExternalLink size={14}/>Open source note</button>
        : <a className={styles.openSource} href={`#/notes/${encodeURIComponent(noteId)}`} onClick={close}><ExternalLink size={14}/>Open source note</a>)}
    </div>}
  </span>;
}
