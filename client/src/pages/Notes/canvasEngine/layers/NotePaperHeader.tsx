import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import styles from './NotePaperHeader.module.css';
import { NoteCoverMetadata, type NoteCoverMetadataProps } from './NoteCoverMetadata';
import { usePaperSkin } from '../PaperSkinContext';

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

export const NOTE_HEADER_MAX_HEIGHT = 240;
export const NOTE_HEADER_INITIAL_HEIGHT = 197;

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
  const skin = usePaperSkin();
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => {
      let titleHeight = 40.8;
      for (const [field, fallbackLineHeight] of [[titleRef.current, 40.8], [descriptionRef.current, 19.5]] as const) {
        if (!field) continue;
        const lineHeight = parseFloat(getComputedStyle(field).lineHeight) || fallbackLineHeight;
        // Keep complete lines within the compact display band. A two-line title
        // leaves one description line; overflow remains scrollable while editing.
        const available = field === titleRef.current ? lineHeight * 2
          : NOTE_HEADER_MAX_HEIGHT - 56 - 28 - 10 - (metadata ? 12 + 28 : 0) - titleHeight;
        const maxLines = Math.max(1, Math.min(2, Math.floor(available / lineHeight)));
        field.style.height = '0px';
        // Chromium rounds scrollHeight and can add a pixel of glyph overflow;
        // rounding to the nearest line avoids inventing a blank second line.
        const lines = Math.min(maxLines, Math.max(1, Math.round(field.scrollHeight / lineHeight)));
        const height = lines * lineHeight;
        field.style.height = `${height}px`;
        if (field === titleRef.current) titleHeight = height;
      }
      onHeightChange(Math.min(NOTE_HEADER_MAX_HEIGHT, header.offsetHeight || NOTE_HEADER_INITIAL_HEIGHT));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(header);
    return () => observer?.disconnect();
  }, [titleDraft, descriptionDraft, onHeightChange, Boolean(metadata), skin?.style]);

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
