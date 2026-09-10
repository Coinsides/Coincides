import { GripVertical } from 'lucide-react';
import type { MouseEvent, PointerEvent } from 'react';
import type {
  TextUnitWritingRole,
} from '../runtimeDataTypes';
import styles from '../../NoteDetail.module.css';

interface TextUnitGutterLayerProps {
  unitId: string;
  role: TextUnitWritingRole;
  disabled?: boolean;
  menuOpen?: boolean;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClickMenu?: (point: { x: number; y: number }) => void;
  onOpenMenu?: (point: { x: number; y: number }) => void;
}

export function TextUnitGutterLayer({
  unitId,
  role,
  disabled,
  menuOpen,
  onPointerDown,
  onClickMenu,
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
        className={styles.textUnitGutterButton}
        data-text-unit-handle={unitId}
        title="Drag to reorder or move out; click for unit menu"
        aria-label="Text unit handle"
        aria-description={role}
        aria-haspopup="menu"
        aria-expanded={menuOpen || false}
        disabled={disabled}
        onPointerDown={onPointerDown}
        onMouseDown={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          onClickMenu?.(event.detail === 0 ? { x: rect.right, y: rect.bottom } : { x: event.clientX, y: event.clientY });
        }}
      >
        <GripVertical size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
