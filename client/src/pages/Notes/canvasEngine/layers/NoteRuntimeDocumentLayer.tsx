import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  NoteFloatingPanelLayer,
  type NoteFloatingPanelLayerProps,
} from './NoteChromeLayer';
import {
  NoteWritingSurfaceLayer,
  type NoteWritingSurfaceLayerProps,
} from './NoteWritingSurfaceLayer';
import styles from '../../NoteDetail.module.css';

interface NoteRuntimeDocumentLayerProps {
  floatingPanelProps: NoteFloatingPanelLayerProps;
  onSurfacePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  surfaceMode: 'page' | 'canvas';
  templateWarning: string | null;
  writingSurfaceProps: NoteWritingSurfaceLayerProps;
}

export function NoteRuntimeDocumentLayer({
  floatingPanelProps,
  onSurfacePointerDown,
  surfaceMode,
  templateWarning,
  writingSurfaceProps,
}: NoteRuntimeDocumentLayerProps) {
  return (
    <div
      className={`${styles.documentShell} ${surfaceMode === 'canvas' ? styles.documentShellCanvas : ''}`}
      onMouseDown={onSurfacePointerDown}
    >
      {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}

      <NoteFloatingPanelLayer {...floatingPanelProps} />
      <NoteWritingSurfaceLayer {...writingSurfaceProps} />
    </div>
  );
}
