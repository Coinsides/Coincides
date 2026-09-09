import { FileText, Layers, Quote, Square, X } from 'lucide-react';
import type { BoardCandidate, BoardMember } from './boardTypes';
import styles from './BoardStaging.module.css';
import { BOARD_STAGING_MIME } from './boardStagingDrag';

export { BOARD_STAGING_MIME } from './boardStagingDrag';

const kinds = {
  note: { label: 'Note', Icon: FileText },
  content_group: { label: 'Group', Icon: Layers },
  item: { label: 'Item', Icon: Square },
  text_range: { label: 'Text range', Icon: Quote },
};

interface BoardStagingProps {
  boardId: string;
  members: BoardMember[];
  candidates: BoardCandidate[];
  busy: boolean;
  onClose: () => void;
  onPlace: (member: BoardMember) => void;
  onRemove: (member: BoardMember) => void;
}

export function BoardStaging({ boardId, members, candidates, busy, onClose, onPlace, onRemove }: BoardStagingProps) {
  const notes = new Map(candidates.filter((candidate) => candidate.member_kind === 'note')
    .map((candidate) => [candidate.member_id, candidate.title]));
  const candidateById = new Map(candidates.map((candidate) => [`${candidate.member_kind}:${candidate.member_id}`, candidate]));

  return <aside id="board-staging" data-board-staging="true" className={styles.staging} aria-label="Staging">
    <header className={styles.header}>
      <h2>Staging <span>({members.length})</span></h2>
      <button type="button" aria-label="Close staging" onClick={onClose}><X size={16} /></button>
    </header>
    <p className={styles.hint}>Drag a row onto the board, or choose Place. Drag items into an open note to reference them.</p>
    {members.length === 0 ? <p className={styles.empty}>Nothing in staging. Stage something from the picker or an open note.</p>
      : <ul className={styles.list}>{members.map((member) => {
        const { label, Icon } = kinds[member.member_kind];
        const candidate = candidateById.get(`${member.member_kind}:${member.member_id}`);
        const title = ((member.member_kind === 'item' || member.member_kind === 'text_range')
          ? member.reference.summary || candidate?.summary : '')
          || member.reference.title || candidate?.title || `Unavailable ${label.toLowerCase()}`;
        const source = member.reference.origin_board_id ? 'Board chalk'
          : (member.reference.note_id && notes.get(member.reference.note_id))
            || (member.member_kind === 'text_range' ? member.reference.title : null) || label;
        return <li key={member.id} data-testid={`staging-member-${member.id}`} className={styles.row}
          draggable={!busy} onDragStart={(event) => {
            if (busy) { event.preventDefault(); return; }
            event.stopPropagation();
            event.dataTransfer.setData(BOARD_STAGING_MIME, JSON.stringify({ boardId, memberId: member.id }));
            event.dataTransfer.effectAllowed = member.member_kind === 'item' ? 'copyMove' : 'move';
          }}>
          <div className={styles.name}><Icon size={15} aria-label={label} /><span>{title.replace(/\s+/g, ' ').trim()}</span></div>
          <div className={styles.source}><span>{source}</span>
            {member.mounted_actor && member.mounted_actor !== 'human' && <span className={styles.actor}>{member.mounted_actor}</span>}
          </div>
          <div className={styles.actions}>
            <button type="button" disabled={busy} onClick={() => onPlace(member)}>Place on board</button>
            <button type="button" disabled={busy} onClick={() => onRemove(member)}>Remove</button>
          </div>
        </li>;
      })}</ul>}
  </aside>;
}
