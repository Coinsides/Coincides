import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { useTrayController } from '../hooks/useTrayController';
import { TRAY_DRAG_TYPE } from '../trayService';
import styles from '../../NoteDetail.module.css';

export type NoteTrayState = ReturnType<typeof useTrayController>;
export function NoteTraySidebar({ tray }: { tray: NoteTrayState }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedForBoard, setSelectedForBoard] = useState<string[]>([]);
  const [boardId, setBoardId] = useState('');
  const [title, setTitle] = useState('Untitled note');
  useEffect(() => {
    setSelected((ids) => ids.filter((id) => tray.entries.some((entry) => entry.placement.placementId === id)));
    setSelectedForBoard((ids) => ids.filter((id) => tray.entries.some((entry) => entry.placement.placementId === id && entry.boardKind)));
  }, [tray.entries]);
  useEffect(() => {
    setBoardId((id) => tray.boards.some((board) => board.id === id) ? id : '');
  }, [tray.boards]);
  return <aside className={styles.traySidebar} aria-label="Note tray" data-note-tray="true"
    onMouseDown={(event) => event.stopPropagation()}>
    <div className={styles.trayHeading}><strong>Tray</strong>
      <button type="button" aria-label="Close tray" onClick={() => tray.setOpen(false)}>Close</button></div>
    <button type="button" disabled={!tray.canMoveSelected || tray.busy}
      onMouseDown={(event) => event.preventDefault()} onClick={() => void tray.moveSelectedToTray()}>
      Move selected block to tray
    </button>
    <p className={styles.trayHint}>Drag a block onto the paper, or select blocks to start a new note.</p>
    {tray.entries.some((entry) => entry.boardKind) && <p className={styles.trayHint}>Select drawings or group mounts to move them to a board.</p>}
    {tray.entries.length === 0 ? <p role="status">The tray is empty.</p> : <ul className={styles.trayList}>
      {tray.entries.map((entry) => <li key={entry.placement.placementId} data-tray-placement-id={entry.placement.placementId}
        draggable={Boolean(entry.block) && !tray.busy} onDragStart={(event) => {
          event.dataTransfer.setData(TRAY_DRAG_TYPE, entry.placement.placementId);
          event.dataTransfer.effectAllowed = 'move';
        }}>
        <span className={styles.trayCategory}>{entry.category === 'block' ? 'Block' : entry.category === 'mount' ? 'Mount' : 'Object'}</span>
        <label>{entry.block && <input type="checkbox" disabled={tray.busy}
          checked={selected.includes(entry.placement.placementId)} onChange={(event) => {
            const checked = event.currentTarget.checked;
            setSelected((ids) => checked ? [...ids, entry.placement.placementId] : ids.filter((id) => id !== entry.placement.placementId));
          }} />}
          {entry.boardKind && <input type="checkbox" disabled={tray.busy || !tray.boardActionsEnabled}
            aria-label={`Select ${entry.label} for board`} checked={selectedForBoard.includes(entry.placement.placementId)}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setSelectedForBoard((ids) => checked ? [...ids, entry.placement.placementId] : ids.filter((id) => id !== entry.placement.placementId));
            }} />}
          {entry.label}</label>
      </li>)}
    </ul>}
    {selected.length > 0 && <form onSubmit={(event) => { event.preventDefault(); void tray.split(selected, title.trim()); }}>
      <label>New note title<input value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} /></label>
      <button type="submit" disabled={tray.busy || !title.trim()}>Create note from selection</button>
    </form>}
    {selectedForBoard.length > 0 && <form onSubmit={(event) => {
      event.preventDefault();
      void tray.relocateToBoard(selectedForBoard, boardId).then((saved) => { if (saved) setSelectedForBoard([]); });
    }}>
      <label>Target board<select value={boardId} disabled={tray.busy || tray.boardsLoading || !tray.boardActionsEnabled}
        onChange={(event) => setBoardId(event.currentTarget.value)}>
        <option value="">Choose a board</option>
        {tray.boards.map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}
      </select></label>
      {tray.boardsLoading && <p role="status">Loading boards…</p>}
      {tray.boardsError && <p role="alert">{tray.boardsError}{' '}
        <button type="button" disabled={tray.busy} onClick={tray.reloadBoards}>Retry boards</button></p>}
      {!tray.boardsLoading && !tray.boardsError && tray.boards.length === 0 && <p>No boards yet. {tray.navigationDisabled
        ? <button type="button" disabled title="Open full page to use this">Create a board</button>
        : <Link to="/boards">Create a board</Link>}</p>}
      <button type="submit" disabled={tray.busy || tray.boardsLoading || !boardId || !tray.boardActionsEnabled}>
        Move selection to board
      </button>
    </form>}
    {tray.latestRelocation && <div className={styles.trayRelocation}>
      {tray.navigationDisabled
        ? <button type="button" disabled title="Open full page to use this">Open board</button>
        : <Link to={`/boards/${tray.latestRelocation.board_id}`}>Open board</Link>}
      <button type="button" disabled={tray.busy || !tray.boardActionsEnabled} onClick={() => void tray.undoBoardRelocation()}>
        Undo move to board
      </button>
    </div>}
    {tray.error && <p role="alert">{tray.error}</p>}
    {tray.createdNoteId && (tray.navigationDisabled
      ? <button type="button" disabled title="Open full page to use this">Open new note</button>
      : <Link to={`/notes/${tray.createdNoteId}`}>Open new note</Link>)}
  </aside>;
}
