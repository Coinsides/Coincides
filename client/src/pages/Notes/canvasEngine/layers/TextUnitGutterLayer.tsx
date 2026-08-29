import type { MouseEvent } from 'react';
import type {
  TextUnitWritingRole,
} from '../runtimeDataTypes';
import styles from '../../NoteDetail.module.css';

const WRITING_ROLE_OPTIONS: Array<{ value: TextUnitWritingRole; label: string }> = [
  { value: 'paragraph', label: 'Text' },
  { value: 'heading', label: 'Heading' },
  { value: 'quote', label: 'Quote' },
  { value: 'bullet_item', label: 'Bullet' },
  { value: 'numbered_item', label: 'Numbered' },
  { value: 'todo_item', label: 'Todo' },
  { value: 'toggle_item', label: 'Toggle' },
  { value: 'code_line', label: 'Code line' },
];

interface TextUnitGutterLayerProps {
  role: TextUnitWritingRole;
  onSetRole: (role: TextUnitWritingRole) => void;
  onOpenMenu?: (point: { x: number; y: number }) => void;
}

export function TextUnitGutterLayer({
  role,
  onSetRole,
  onOpenMenu,
}: TextUnitGutterLayerProps) {
  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!onOpenMenu) return;
    event.preventDefault();
    event.stopPropagation();
    onOpenMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <div className={styles.textUnitGutter} aria-label="Text unit tools" onContextMenu={handleContextMenu}>
      <select
        className={styles.textUnitRoleSelect}
        value={role}
        onChange={(event) => onSetRole(event.currentTarget.value as TextUnitWritingRole)}
        aria-label="Text unit writing role"
      >
        {WRITING_ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
