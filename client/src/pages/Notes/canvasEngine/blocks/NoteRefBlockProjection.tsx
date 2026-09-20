import { useLayoutEffect, useRef } from 'react';
import { useNoteTruthBinding } from '../NoteTruthBindingContext';
import styles from './NoteRefBlockProjection.module.css';

export function NoteRefBlockProjection({ field, readOnly = false }: {
  field: 'title' | 'description'; readOnly?: boolean;
}) {
  const binding = useNoteTruthBinding();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const text = binding?.[field] ?? '';
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(element.scrollHeight, field === 'title' ? 54 : 28)}px`;
  }, [text, field]);
  const editable = Boolean(binding?.onChange) && !binding?.readOnly && !readOnly;
  const className = `${styles.projection} ${field === 'title' ? styles.title : styles.description}`;
  if (!editable) return <div className={className} data-note-truth-field={field}>{text}</div>;
  return <textarea ref={textarea} className={className} rows={1}
    aria-label={field === 'title' ? '封面题名' : '封面述名'} data-note-truth-field={field}
    maxLength={field === 'title' ? 300 : 2000} value={text}
    placeholder={field === 'title' ? '笔记题名' : '添加述名'}
    onChange={(event) => binding?.onChange?.(field, event.target.value)}
    onBlur={() => { void Promise.resolve(binding?.onSave?.(field)).catch(() => undefined); }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault(); event.currentTarget.blur();
      }
    }} />;
}
