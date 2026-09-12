import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import styles from './NotePaperHeader.module.css';
import { NoteCoverMetadata, type NoteCoverMetadataProps } from './NoteCoverMetadata';

export interface NotePaperHeaderProps {
  titleDraft: string;
  descriptionDraft: string;
  contentReadOnly: boolean;
  onTitleDraftChange: (value: string) => void;
  onDescriptionDraftChange: (value: string) => void;
  onSaveTitle: () => void | Promise<void>;
  onSaveDescription: () => void | Promise<void>;
  metadata?: NoteCoverMetadataProps;
}

export const NOTE_HEADER_MAX_HEIGHT = 244;
export const NOTE_HEADER_INITIAL_HEIGHT = 156;

/** A display-only band before the existing paper coordinate origin. */
export function NotePaperHeader({
  titleDraft, descriptionDraft, contentReadOnly, onTitleDraftChange,
  onDescriptionDraftChange, onSaveTitle, onSaveDescription,
  onHeightChange, style, metadata, metadataHidden,
}: NotePaperHeaderProps & {
  onHeightChange: (height: number) => void;
  style?: CSSProperties;
  metadataHidden?: boolean;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => {
      for (const [field, maxHeight] of [[titleRef.current, 80], [descriptionRef.current, 72]] as const) {
        if (!field) continue;
        field.style.height = '0px';
        field.style.height = `${Math.min(maxHeight, Math.max(field === titleRef.current ? 40 : 24, field.scrollHeight))}px`;
      }
      onHeightChange(Math.min(NOTE_HEADER_MAX_HEIGHT, header.offsetHeight || NOTE_HEADER_INITIAL_HEIGHT));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(header);
    return () => observer?.disconnect();
  }, [titleDraft, descriptionDraft, onHeightChange]);

  const commit = (save: () => void | Promise<void>) => {
    // The adapter owns error feedback and the pending-write failure receipt.
    void Promise.resolve().then(save).catch(() => undefined);
  };
  return <header ref={headerRef} className={styles.header} style={style} data-note-paper-header="true"
    onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}>
    <textarea ref={titleRef} className={styles.title} rows={1} aria-label="Note title"
      value={titleDraft} placeholder="Untitled note" readOnly={contentReadOnly} maxLength={300}
      onChange={(event) => onTitleDraftChange(event.target.value)}
      onBlur={(event) => { event.currentTarget.scrollTop = 0; if (!contentReadOnly) commit(onSaveTitle); }}
      onKeyDown={(event) => {
        if (!contentReadOnly && event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault(); event.currentTarget.blur();
        }
      }} />
    <textarea ref={descriptionRef} className={styles.description} rows={1} aria-label="Note description"
      data-empty={descriptionDraft.length === 0 ? 'true' : 'false'}
      value={descriptionDraft} placeholder={contentReadOnly ? '' : 'Add a description'} readOnly={contentReadOnly}
      maxLength={2000} onChange={(event) => onDescriptionDraftChange(event.target.value)}
      onBlur={(event) => { event.currentTarget.scrollTop = 0; if (!contentReadOnly) commit(onSaveDescription); }}
      onKeyDown={(event) => {
        if (!contentReadOnly && event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault(); event.currentTarget.blur();
        }
      }} />
    {metadata && <NoteCoverMetadata key={metadata.noteId} {...metadata} hidden={metadataHidden} />}
  </header>;
}
