import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { loadLibraryPurposes } from '@/pages/Notes/canvasEngine/purposeRepository';
import type { PurposeFrameV1 } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import { boardErrorMessage, boardRepository } from './boardRepository';
import type { Board } from './boardTypes';
import { BoardDeleteDialog } from './BoardDeleteDialog';
import styles from './Boards.module.css';

export default function BoardList() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [souls, setSouls] = useState<PurposeFrameV1[]>([]);
  const [boardName, setBoardName] = useState('');
  const [soulId, setSoulId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occupied, setOccupied] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState<Board | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextBoards, nextSouls] = await Promise.all([boardRepository.list(), loadLibraryPurposes()]);
      setBoards(nextBoards);
      setSouls(nextSouls);
    } catch (cause) { setError(boardErrorMessage(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function createBoard(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !boardName.trim()) return;
    setBusy(true);
    setError(null);
    setOccupied(null);
    try {
      const title = boardName.trim();
      const board = await boardRepository.create(soulId
        ? { title, soul_id: soulId }
        : { title, purpose: { title } });
      navigate(`/boards/${encodeURIComponent(board.id)}`);
    } catch (cause) {
      const conflict = (cause as { response?: { status?: number; data?: { error?: string } } })?.response;
      if (conflict?.status === 409 && conflict.data?.error === 'purpose_already_has_board') {
        setError('This purpose already has a board. Choose another purpose or open its board.');
        try {
          const current = await boardRepository.list();
          setBoards(current);
          setOccupied(current.find((board) => board.soul_id === soulId) || null);
        } catch { /* Keep the conflict visible; the list can be refreshed explicitly. */ }
      } else setError(boardErrorMessage(cause));
    } finally { setBusy(false); }
  }

  return <section className={styles.library}>
    <header className={styles.libraryHeader}>
      <h1>Boards</h1>
      <p>Bring notes together, arrange them, and draw connections.</p>
    </header>
    <form className={styles.createForm} onSubmit={(event) => { void createBoard(event); }}>
      <label htmlFor="board-name">Board name</label>
      <div className={styles.createRow}>
        <input id="board-name" value={boardName} maxLength={80} required
          placeholder="e.g. Exam revision"
          onChange={(event) => setBoardName(event.currentTarget.value)} />
        <button className={styles.primaryButton} type="submit" disabled={loading || busy || !boardName.trim()}>
          <Plus size={16} />{busy ? 'Opening…' : 'Open board'}
        </button>
      </div>
      <details className={styles.existingPurpose}>
        <summary>Advanced: use an existing purpose</summary>
        <label htmlFor="board-existing-purpose">Existing purpose</label>
        <select id="board-existing-purpose" value={soulId} disabled={loading || busy}
          onChange={(event) => {
            const id = event.currentTarget.value;
            setSoulId(id);
            setOccupied(null);
            setError(null);
          }}>
          <option value="">Create a new purpose with this board name</option>
          {souls.map((soul) => <option key={soul.id} value={soul.id}>
            {soul.title}{soul.status !== 'active' ? ` (${soul.status})` : ''}
          </option>)}
        </select>
      </details>
    </form>
    {error && <div className={styles.error} role="alert">
      <span>{error}</span>
      {occupied ? <Link to={`/boards/${encodeURIComponent(occupied.id)}`}>Open {occupied.title}</Link>
        : <button type="button" onClick={() => { void load(); }}>Refresh boards</button>}
    </div>}
    {loading ? <p role="status">Loading boards…</p> : <>
      <div className={styles.listHeading}><h2>Your boards</h2><span>{boards.length}</span></div>
      {boards.length === 0 ? <p className={styles.empty}>Name your board above, then add your notes.</p>
        : <ul className={styles.boardList}>{boards.map((board) => <li key={board.id}>
          <Link to={`/boards/${encodeURIComponent(board.id)}`}>
            <strong>{board.title}</strong>
            <span className={styles.listEnd}><time dateTime={board.updated_at}>
              {new Date(board.updated_at).toLocaleDateString()}
            </time><ArrowRight size={18} /></span>
          </Link>
          <details className={styles.boardMenu}>
            <summary aria-label={`Board menu for ${board.title}`}>More</summary>
            <button className={styles.button} onClick={() => setDeleting(board)}>Delete board</button>
          </details>
        </li>)}</ul>}
    </>}
    {deleting && <BoardDeleteDialog key={deleting.id} board={deleting} onCancel={() => setDeleting(null)}
      onDeleted={() => {
        setBoards((current) => current.filter(({ id }) => id !== deleting.id));
        if (occupied?.id === deleting.id) { setOccupied(null); setError(null); }
        setDeleting(null);
      }} />}
  </section>;
}
