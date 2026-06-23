import {
  GripVertical,
  Tag,
  Plus,
} from 'lucide-react';
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
  onInsertBelow: () => void;
  selected?: boolean;
  onToggleRowSelection?: () => void;
  onSetRole: (role: TextUnitWritingRole) => void;
  onAnnotateUnit: () => void;
  onOpenMenu?: (point: { x: number; y: number }) => void;
}

export function TextUnitGutterLayer({
  role,
  onInsertBelow,
  selected = false,
  onToggleRowSelection,
  onSetRole,
  onAnnotateUnit,
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
      <button
        type="button"
        className={[
          styles.textUnitGutterButton,
          selected ? styles.textUnitGutterButtonSelected : '',
        ].filter(Boolean).join(' ')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggleRowSelection}
        aria-label={selected ? 'Deselect text unit row' : 'Select text unit row'}
        title={selected ? 'Deselect row' : 'Select row'}
      >
        <GripVertical size={13} />
      </button>
      <button
        type="button"
        className={styles.textUnitGutterButton}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onInsertBelow}
        aria-label="Insert text unit below"
      >
        <Plus size={13} />
      </button>
      <button
        type="button"
        className={styles.textUnitGutterButton}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onAnnotateUnit}
        aria-label="Label this text unit"
        title="Label this row"
      >
        <Tag size={12} />
      </button>
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
