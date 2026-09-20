import type { CSSProperties } from 'react';
import styles from './NoteHeaderSeparator.module.css';

/** Shared by the live paper header and its print/export projection. */
export function NoteHeaderSeparator({ left, right }: { left?: CSSProperties['paddingLeft']; right?: CSSProperties['paddingRight'] }) {
  const cssLength = (value: CSSProperties['paddingLeft']) => typeof value === 'number' ? `${value}px` : value ?? '0px';
  return <span aria-hidden="true" data-note-header-separator="true" className={styles.separator} style={{
    '--note-header-inset-left': cssLength(left), '--note-header-inset-right': cssLength(right),
  } as CSSProperties} />;
}
