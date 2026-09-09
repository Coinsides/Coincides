import { useEffect, useRef, useState } from 'react';
import { boardErrorMessage, boardRepository } from './boardRepository';
import type { Board, BoardDetail } from './boardTypes';
import styles from './Boards.module.css';

/** Read the saved board before displaying the actual deletion scope. */
export function BoardDeleteDialog({ board, onCancel, onDeleted }: {
  board: Board;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const alive = useRef(false);
  const [detail, setDetail] = useState<BoardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal();
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    void boardRepository.get(board.id).then((value) => {
      if (active) setDetail(value);
    }).catch((cause) => { if (active) setError(boardErrorMessage(cause)); });
    return () => { active = false; };
  }, [board.id, attempt]);

  async function remove() {
    if (!detail || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await boardRepository.delete(board.id);
      if (alive.current) onDeleted();
    } catch (cause) { if (alive.current) setError(boardErrorMessage(cause)); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }

  return <dialog ref={dialog} className={styles.deleteDialog} aria-labelledby="delete-board-title"
    aria-describedby="delete-board-scope" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="delete-board-title">Delete board “{detail?.board.title || board.title}”?</h2>
    <p id="delete-board-scope">{detail
      ? `This permanently deletes this board, ${detail.visuals.length} drawings, ${detail.edges.length} connections, and all ${detail.members.length} placements. Notes and knowledge content are unaffected. Drawings moved here from the tray are deleted with the board. The purpose is kept.`
      : 'Loading the board’s deletion scope…'}</p>
    {error && <p role="alert">{error}</p>}
    {!detail && error && <button className={styles.button} onClick={() => setAttempt(attempt + 1)}>Retry</button>}
    <div className={styles.dialogActions}>
      <button className={styles.button} disabled={busy} autoFocus onClick={onCancel}>Cancel</button>
      <button className={styles.button} disabled={!detail || busy} onClick={() => { void remove(); }}>
        {busy ? 'Deleting…' : 'Delete board'}
      </button>
    </div>
  </dialog>;
}
