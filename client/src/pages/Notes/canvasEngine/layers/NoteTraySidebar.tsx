import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { useTrayController } from '../hooks/useTrayController';
import { TRAY_DRAG_TYPE } from '../trayService';
import styles from '../../NoteDetail.module.css';

export type NoteTrayState = ReturnType<typeof useTrayController>;
export function NoteTraySidebar({ tray }: { tray: NoteTrayState }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('Untitled note');
  useEffect(() => {
    setSelected((ids) => ids.filter((id) => tray.entries.some((entry) => entry.placement.placementId === id)));
  }, [tray.entries]);
  return <aside className={styles.traySidebar} aria-label="Note tray" data-note-tray="true"
    onMouseDown={(event) => event.stopPropagation()}>
    <div className={styles.trayHeading}><strong>Tray</strong>
      <button type="button" aria-label="Close tray" onClick={() => tray.setOpen(false)}>Close</button></div>
    <button type="button" disabled={!tray.canMoveSelected || tray.busy}
      onMouseDown={(event) => event.preventDefault()} onClick={() => void tray.moveSelectedToTray()}>
      Move selected block to tray
    </button>
    <p className={styles.trayHint}>Drag a block onto the paper, or select blocks to start a new note.</p>
    {tray.entries.length === 0 ? <p role="status">The tray is empty.</p> : <ul className={styles.trayList}>
      {tray.entries.map((entry) => <li key={entry.placement.placementId} data-tray-placement-id={entry.placement.placementId}
        draggable={Boolean(entry.block) && !tray.busy} onDragStart={(event) => {
          event.dataTransfer.setData(TRAY_DRAG_TYPE, entry.placement.placementId);
          event.dataTransfer.effectAllowed = 'move';
        }}>
        <span className={styles.trayCategory}>{entry.category === 'block' ? 'Block' : entry.category === 'mount' ? 'Mount' : 'Object'}</span>
        <label>{entry.block && <input type="checkbox" disabled={tray.busy}
          checked={selected.includes(entry.placement.placementId)} onChange={(event) => setSelected((ids) =>
            event.target.checked ? [...ids, entry.placement.placementId] : ids.filter((id) => id !== entry.placement.placementId))} />}
          {entry.label}</label>
      </li>)}
    </ul>}
    {selected.length > 0 && <form onSubmit={(event) => { event.preventDefault(); void tray.split(selected, title.trim()); }}>
      <label>New note title<input value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} /></label>
      <button type="submit" disabled={tray.busy || !title.trim()}>Create note from selection</button>
    </form>}
    {tray.error && <p role="alert">{tray.error}</p>}
    {tray.createdNoteId && <Link to={`/notes/${tray.createdNoteId}`}>Open new note</Link>}
  </aside>;
}
