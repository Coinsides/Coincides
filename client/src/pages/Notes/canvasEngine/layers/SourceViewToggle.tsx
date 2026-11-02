import { useTranslation } from 'react-i18next';
import type { SourcePageViewController } from '../hooks/useSourcePageViewController';
import styles from '../../NoteDetail.module.css';

/** The toolbar hides with the writing surface, so the pages header carries the same control. */
export function SourceViewToggle({ view, pagesDisabled = false }: { view: SourcePageViewController; pagesDisabled?: boolean }) {
  const { t } = useTranslation();
  return <span className={styles.sourceViewToggle} role="group" aria-label={t('sourcePages.toggleLabel')} data-source-view-toggle="true">
    <button type="button" className={!view.active ? styles.sourceViewToggleActive : ''} aria-pressed={!view.active}
      onClick={() => view.setMode('text')}>{t('sourcePages.textView')}</button>
    <button type="button" className={view.active ? styles.sourceViewToggleActive : ''} aria-pressed={view.active}
      disabled={pagesDisabled} onClick={() => view.setMode('pages')}>{t('sourcePages.pagesView')}</button>
  </span>;
}
