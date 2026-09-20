import type { createPageGapPresentation } from '../pageFramePresentationService';
import styles from './NotePageGapLayer.module.css';

export function NotePageGapLayer({ gap, folded, left, width, onToggle }: {
  gap: ReturnType<typeof createPageGapPresentation>['gaps'][number];
  folded: boolean; left: number; width: number; onToggle: () => void;
}) {
  return <button type="button" className={styles.gap}
    data-note-page-gap={gap.afterFrameId} data-page-gap-folded={folded ? 'true' : 'false'}
    aria-label={folded ? 'Show page gaps' : 'Fold page gaps'} aria-pressed={folded}
    title={folded ? 'Show page gaps' : 'Fold page gaps'}
    style={{ left, top: gap.y - (folded ? 5 : 0), width, height: folded ? 10 : gap.height }}
    onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
    onDoubleClick={(event) => event.stopPropagation()} onClick={onToggle}>
    <span aria-hidden="true">{folded ? 'Show page gaps' : 'Fold page gaps'}</span>
  </button>;
}
