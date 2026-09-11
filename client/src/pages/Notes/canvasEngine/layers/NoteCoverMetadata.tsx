import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown, Info, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TrackPendingWrite } from '../inFlightWriteRegistry';
import { subscribeBoardChanges } from '@/pages/Boards/boardEvents';
import { noteMetadataRepository as repository, type NoteMetadata, type NoteSourceSummary, type NoteTag } from '../noteMetadataRepository';
import styles from './NoteCoverMetadata.module.css';

export interface NoteCoverMetadataProps {
  noteId: string;
  readOnly: boolean;
  mode: 'page' | 'canvas';
  blockCount: number;
  sourceCount: number;
  status: string;
  refreshKey?: unknown;
  hidden?: boolean;
  trackPendingWrite?: TrackPendingWrite;
  onOpenSource: (source: NoteSourceSummary) => void | Promise<void>;
}

export function NoteCoverMetadata({ noteId, readOnly, mode, blockCount, sourceCount, status,
  refreshKey, hidden = false, onOpenSource, trackPendingWrite }: NoteCoverMetadataProps) {
  const [tags, setTags] = useState<NoteTag[]>([]);
  const [metadata, setMetadata] = useState<NoteMetadata | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState(false);
  const [writeError, setWriteError] = useState('');
  const [position, setPosition] = useState<CSSProperties>({});
  const row = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const alive = useRef(true);
  const request = useRef(0);
  const tagRevision = useRef(0);
  const mutation = useRef(false);
  const id = useId();

  const refresh = useCallback(async () => {
    const version = ++request.current;
    const tagsAtStart = tagRevision.current;
    setLoading(true);
    const results = await Promise.allSettled([repository.tags(noteId), repository.metadata(noteId)]);
    if (!alive.current || version !== request.current) return;
    if (results[0].status === 'fulfilled' && tagsAtStart === tagRevision.current && !mutation.current) setTags(results[0].value);
    if (results[1].status === 'fulfilled') setMetadata(results[1].value);
    setReadError(results.some((result) => result.status === 'rejected'));
    setLoading(false);
  }, [noteId]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; request.current += 1; };
  }, []);
  useEffect(() => { void refresh(); }, [refresh, refreshKey]);
  useEffect(() => {
    const update = () => { void refresh(); };
    window.addEventListener('focus', update);
    const unsubscribe = subscribeBoardChanges(update);
    return () => { window.removeEventListener('focus', update); unsubscribe(); };
  }, [refresh]);
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);

  const close = useCallback(() => { setOpen(false); opener.current?.focus({ preventScroll: true }); }, []);
  useLayoutEffect(() => {
    if (!open || hidden) return;
    const node = popup.current;
    const measure = () => {
      const rect = row.current?.getBoundingClientRect();
      if (!rect) return;
      const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 64));
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 376)), top,
        maxHeight: Math.max(48, window.innerHeight - top - 8) });
    };
    measure();
    node?.setAttribute('popover', 'manual');
    node?.showPopover?.();
    const dismiss = (event: PointerEvent) => {
      if (!node?.contains(event.target as Node) && !row.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    // Move keyboard focus into the non-modal floating surface.
    (input.current || node)?.focus({ preventScroll: true });
    return () => {
      node?.hidePopover?.();
      document.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, hidden]);

  function show(button: HTMLButtonElement) {
    opener.current = button;
    setOpen(true);
    setWriteError('');
    void refresh();
  }

  async function write(key: string, action: () => Promise<void>) {
    if (readOnly || mutation.current) return;
    mutation.current = true;
    tagRevision.current += 1; // Invalidate stale tags, while keeping live relationship reads.
    setBusy(true); setWriteError('');
    try { await (trackPendingWrite ? trackPendingWrite(`note-tag:${noteId}:${key}`, action) : action()); }
    catch (error) {
      if (alive.current) setWriteError((error as { response?: { data?: { error?: string } } }).response?.data?.error
        || 'Could not save tags. Please try again.');
    } finally {
      mutation.current = false;
      tagRevision.current += 1;
      if (alive.current) {
        setBusy(false);
        // Reconcile tags that had not hydrated before this write began.
        void refresh();
      }
    }
  }

  async function add() {
    const trimmed = label.trim();
    if (!trimmed || trimmed.length > 48) { setWriteError('Use 1–48 characters for a tag.'); return; }
    await write(`add:${trimmed}`, async () => {
      const tag = await repository.addTag(noteId, trimmed);
      if (alive.current) { setTags((current) => [...current.filter((entry) => entry.id !== tag.id), tag]); setLabel(''); }
    });
  }
  const hasReferences = Boolean(metadata && (metadata.upstream.count || metadata.downstream.count));
  const quiet = tags.length === 0 && !hasReferences && !readError;

  return <div ref={row} className={styles.row} data-note-cover-metadata="true" data-empty={quiet}
    data-projection-hidden={hidden} onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape' && open) { event.preventDefault(); close(); }
    }}>
    {tags.length > 0 && <div className={styles.tags} aria-label="Note tags">
      {tags.map((tag) => readOnly ? <span className={styles.chip} key={tag.id}>{tag.label}</span>
        : <button key={tag.id} type="button" className={styles.chip} disabled={busy}
          aria-label={`Remove tag ${tag.label}`} title={`Remove tag ${tag.label}`} onClick={(event) => {
            opener.current = event.currentTarget;
            void write(`delete:${tag.id}`, async () => {
              await repository.deleteTag(noteId, tag.id);
              if (alive.current) setTags((current) => current.filter((entry) => entry.id !== tag.id));
            });
          }}><span>{tag.label}</span><X size={12} aria-hidden="true" /></button>)}
    </div>}
    <button type="button" className={styles.add} aria-label={readOnly ? 'Note metadata' : 'Add tags'} title={readOnly ? 'Note metadata' : 'Add tags'}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={(event) => show(event.currentTarget)}>{readOnly ? <Info size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
      {tags.length === 0 && (readOnly ? 'Note metadata' : 'Add tags')}</button>
    {(hasReferences || readError) && <button type="button" className={styles.disclosure}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={(event) => open ? close() : show(event.currentTarget)}>
      <span>{hasReferences ? `Upstream ${metadata!.upstream.count} · Downstream ${metadata!.downstream.count}` : 'Retry metadata'}</span>
      <ChevronDown size={14} aria-hidden="true" />
    </button>}
    {writeError && !open && <span role="alert" className={styles.rowError}>{writeError}</span>}
    {open && !hidden && <div ref={popup} id={id} className={styles.popup} style={position}
      role="dialog" aria-label="Note metadata" tabIndex={-1} data-note-cover-popup="true">
      <header><strong>Note metadata</strong><button type="button" aria-label="Close note metadata" onClick={close}><X size={16} /></button></header>
      {!readOnly && <form onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <label htmlFor={`${id}-tag`}>Add tags</label>
        <div className={styles.entry}><input ref={input} id={`${id}-tag`} value={label} maxLength={48}
          placeholder="Tag name" autoComplete="off" disabled={busy} onChange={(event) => setLabel(event.target.value)} />
          <button type="submit" disabled={busy || !label.trim()}>{busy ? 'Saving…' : 'Add tag'}</button></div>
      </form>}
      {writeError && <p role="alert">{writeError}</p>}
      {readError && <p role="alert">Could not refresh metadata. <button type="button" onClick={() => void refresh()}>Retry</button></p>}
      <section aria-labelledby={`${id}-upstream`} aria-busy={loading}>
        <h3 id={`${id}-upstream`}>Upstream</h3>
        {metadata?.upstream.sources.length ? <><h4>Source documents</h4><ul>{metadata.upstream.sources.map((source) =>
          <li key={source.source_record_id || source.document_id || source.reference_id}><button type="button" onClick={() => {
            void Promise.resolve(onOpenSource(source)).then(close).catch(() => setWriteError('Could not open this source. Please try again.'));
          }}><span>{source.title}</span><small>{source.count}</small></button></li>)}</ul></> : null}
        {metadata?.upstream.notes.length ? <><h4>Referenced notes</h4><ul>{metadata.upstream.notes.map((note) =>
          <li key={note.note_id}><Link to={`/notes/${encodeURIComponent(note.note_id)}`} onClick={close}><span>{note.title}</span><small>{note.count}</small></Link></li>)}</ul></> : null}
        {!metadata?.upstream.count && <p>{loading ? 'Loading references…' : 'No upstream references.'}</p>}
      </section>
      <section aria-labelledby={`${id}-downstream`} aria-busy={loading}>
        <h3 id={`${id}-downstream`}>Downstream</h3>
        {metadata?.downstream.boards.length ? <><h4>Boards</h4><ul>{metadata.downstream.boards.map((board) =>
          <li key={board.board_id}><Link to={`/boards/${encodeURIComponent(board.board_id)}`} onClick={close}><span>{board.title}</span><small>{board.count}</small></Link></li>)}</ul></> : null}
        {metadata?.downstream.content_groups.length ? <><h4>Content groups</h4><ul>{metadata.downstream.content_groups.map((group) =>
          <li key={group.content_group_id}><Link to={group.note_id
            ? `/group-gallery/editor?${new URLSearchParams({ note_id: group.note_id, group_id: group.content_group_id })}`
            : `/projects/${encodeURIComponent(group.course_id)}`}
            title={group.note_id ? undefined : 'This group has no current note location. Open its project.'}
            onClick={close}><span>{group.title}{!group.note_id && ' · Open project'}</span><small>{group.count}</small></Link></li>)}</ul></> : null}
        {!metadata?.downstream.count && <p>{loading ? 'Loading references…' : 'No downstream references.'}</p>}
      </section>
      <section aria-labelledby={`${id}-stats`}><h3 id={`${id}-stats`}>Statistics</h3><dl className={styles.stats}>
        <div><dt>Mode</dt><dd>{mode === 'page' ? 'Page' : 'Canvas'}</dd></div>
        <div><dt>Blocks</dt><dd>{blockCount}</dd></div>
        <div><dt>Sources</dt><dd>{sourceCount}</dd></div>
        <div><dt>Status</dt><dd>{status}</dd></div>
      </dl></section>
    </div>}
  </div>;
}
