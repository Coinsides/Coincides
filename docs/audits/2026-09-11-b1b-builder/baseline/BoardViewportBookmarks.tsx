import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkPlus, Pencil, Trash2, X } from 'lucide-react';
import {
  BOARD_VIEWPORT_BOOKMARK_LIMIT, BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT,
  type BoardViewportBookmark,
} from '../../../../shared/types/boardViewportBookmarks';
import { boardErrorMessage, boardRepository } from './boardRepository';
import type { BoardViewport } from './boardTypes';
import styles from './BoardViewportBookmarks.module.css';

interface Props {
  boardId: string;
  getViewport: () => BoardViewport;
  onJump: (viewport: BoardViewport) => void;
  disabled?: boolean;
}

/** Personal camera snapshots only. This surface never reads or writes the board scene. */
export function BoardViewportBookmarks({ boardId, getViewport, onJump, disabled = false }: Props) {
  const [bookmarks, setBookmarks] = useState<BoardViewportBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id?: string; viewport?: BoardViewport } | null>(null);
  const [name, setName] = useState('');
  const alive = useRef(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const saveButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const full = bookmarks.length >= BOARD_VIEWPORT_BOOKMARK_LIMIT;

  async function load() {
    const visit = generation.current;
    const current = () => alive.current && visit === generation.current;
    setLoading(true);
    setError(null);
    try {
      const next = await boardRepository.listViewportBookmarks(boardId);
      if (!Array.isArray(next)) throw new Error('Bookmark list unavailable');
      if (current()) setBookmarks(next);
    } catch (cause) { if (current()) setError(boardErrorMessage(cause)); }
    finally { if (current()) setLoading(false); }
  }
  useEffect(() => {
    alive.current = true;
    generation.current += 1;
    busy.current = false;
    setPending(false);
    setBookmarks([]);
    setEditor(null);
    void load();
    return () => { alive.current = false; generation.current += 1; };
  }, [boardId]);

  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => { if (alive.current) (returnFocus.current || saveButton.current)?.focus(); });
  }

  async function save() {
    const trimmed = name.trim();
    if (!editor || busy.current || !trimmed || trimmed.length > BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT) return;
    busy.current = true;
    const visit = generation.current;
    const current = () => alive.current && visit === generation.current;
    setPending(true);
    setError(null);
    try {
      const bookmark = editor.id
        ? await boardRepository.renameViewportBookmark(boardId, editor.id, trimmed)
        : await boardRepository.createViewportBookmark(boardId, { name: trimmed, ...editor.viewport! });
      if (!current()) return;
      setBookmarks((current) => editor.id
        ? current.map((entry) => entry.id === bookmark.id ? bookmark : entry)
        : [...current, bookmark]);
      closeEditor();
    } catch (cause) { if (current()) setError(boardErrorMessage(cause)); }
    finally { if (current()) { busy.current = false; setPending(false); } }
  }

  async function remove(id: string) {
    if (busy.current) return;
    busy.current = true;
    const visit = generation.current;
    const current = () => alive.current && visit === generation.current;
    setPending(true);
    setError(null);
    try {
      await boardRepository.deleteViewportBookmark(boardId, id);
      if (!current()) return;
      setBookmarks((current) => current.filter((entry) => entry.id !== id));
      requestAnimationFrame(() => { if (current()) saveButton.current?.focus(); });
    } catch (cause) { if (current()) setError(boardErrorMessage(cause)); }
    finally { if (current()) { busy.current = false; setPending(false); } }
  }

  return <aside className={styles.rail} data-board-viewport-bookmarks aria-label="Viewport bookmarks" aria-busy={loading || pending}
    onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}
    onWheel={(event) => event.stopPropagation()} onPaste={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape' && editor && !pending) { event.preventDefault(); closeEditor(); }
    }}>
    <button ref={saveButton} type="button" className={styles.save} aria-label="Save current viewport"
      title={full ? 'All 24 bookmarks are in use' : 'Save current viewport'}
      disabled={disabled || loading || pending}
      onClick={() => {
        returnFocus.current = saveButton.current;
        if (full) { setError('All 24 bookmarks are in use. Delete a bookmark to save another view.'); return; }
        setError(null);
        setName('');
        setEditor({ viewport: { ...getViewport() } });
      }}><BookmarkPlus size={17} /><span>Save current viewport</span></button>
    <ol className={styles.list}>
      {bookmarks.map((bookmark) => <li key={bookmark.id} className={styles.row}>
        <button type="button" className={styles.jump} aria-label={`Go to ${bookmark.name}`}
          disabled={disabled || pending} onClick={() => onJump({ x: bookmark.x, y: bookmark.y, zoom: bookmark.zoom })}>
          <Bookmark size={16} /><span>{bookmark.name}</span>
        </button>
        <div className={styles.actions}>
          <button type="button" aria-label={`Rename bookmark ${bookmark.name}`} disabled={disabled || pending}
            onClick={(event) => {
              returnFocus.current = event.currentTarget.closest('li')?.querySelector('button') || saveButton.current;
              setError(null); setName(bookmark.name); setEditor({ id: bookmark.id });
            }}><Pencil size={13} /></button>
          <button type="button" aria-label={`Delete bookmark ${bookmark.name}`} disabled={disabled || pending}
            onClick={() => { void remove(bookmark.id); }}><Trash2 size={13} /></button>
        </div>
      </li>)}
    </ol>
    {editor && <form className={styles.editor} aria-label={editor.id ? 'Rename viewport bookmark' : 'Save viewport bookmark'}
      onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label htmlFor="viewport-bookmark-name">Bookmark name</label>
      <input id="viewport-bookmark-name" autoFocus required maxLength={BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT}
        placeholder="e.g. Chapter two" value={name} disabled={pending}
        onFocus={(event) => event.currentTarget.select()} onChange={(event) => setName(event.target.value)} />
      <div className={styles.editorActions}>
        <button type="button" disabled={pending} onClick={closeEditor}>Cancel</button>
        <button type="submit" disabled={pending || !name.trim() || name.trim().length > BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT}>
          {pending ? 'Saving…' : editor.id ? 'Save name' : 'Save bookmark'}
        </button>
      </div>
    </form>}
    {error && <div className={styles.error} role="alert">
      <p>{error}</p>
      <button type="button" disabled={pending || loading} onClick={() => { void load(); }}>Reload bookmarks</button>
      <button type="button" aria-label="Dismiss bookmark message" onClick={() => setError(null)}><X size={14} /></button>
    </div>}
  </aside>;
}
