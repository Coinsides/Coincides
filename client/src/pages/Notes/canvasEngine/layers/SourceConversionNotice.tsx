import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Note } from '../runtimeDataTypes';
import styles from './SourceConversionNotice.module.css';

export function SourceConversionNotice({ note }: { note: Note }) {
  const { t } = useTranslation();
  const messages = note.metadata?.parser_messages;
  if (note.note_class !== 'source_projection' || !Array.isArray(messages) || messages.length === 0) return null;
  return (
    <div className={styles.notice} role="note" data-source-conversion-notice>
      <TriangleAlert size={14} />
      <span>{t('sources.conversionIncomplete')}</span>
    </div>
  );
}
