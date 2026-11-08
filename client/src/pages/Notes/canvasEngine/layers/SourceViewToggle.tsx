import { useTranslation } from 'react-i18next';
import type { SourcePageViewController } from '../hooks/useSourcePageViewController';
import styles from '../../NoteDetail.module.css';

/** Stays out of the note toolbar: the toolbar hides with the writing surface and folds its groups on a narrow window. */
export function SourceViewToggle({ view }: { view: SourcePageViewController }) {
  const { t } = useTranslation();
  // Nothing to switch between when the Source is only its pages.
  if (!view.textAvailable) return null;
  return <span className={styles.sourceViewToggle} role="group" aria-label={t('sourcePages.toggleLabel')} data-source-view-toggle="true">
    <button type="button" className={!view.active ? styles.sourceViewToggleActive : ''} aria-pressed={!view.active}
      onClick={() => view.setMode('text')}>{t('sourcePages.textView')}</button>
    <button type="button" className={view.active ? styles.sourceViewToggleActive : ''} aria-pressed={view.active}
      onClick={() => view.setMode('pages')}>{t('sourcePages.pagesView')}</button>
  </span>;
}
