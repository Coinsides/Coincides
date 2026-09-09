import { useRef, useState, type CSSProperties } from 'react';
import { BOARD_STICKY_TEXT_LIMIT } from '../../../../shared/types/boardSticky';
import type { BoardGeometry } from './boardTypes';
import styles from './Boards.module.css';

export interface ChalkDraft extends BoardGeometry {
  id?: string;
  text: string;
}

/** Only plain text lives here; acquiring an Item identity is a separate board action. */
export function BoardChalkEditor({ draft, onSave, onCancel }: {
  draft: ChalkDraft;
  onSave: (text: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(draft.text);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const finished = useRef(false);
  const composing = useRef(false);
  const tooLong = text.length > BOARD_STICKY_TEXT_LIMIT;

  async function save() {
    if (finished.current || composing.current || tooLong) return;
    if (text === draft.text && draft.id) { finished.current = true; onCancel(); return; }
    finished.current = true;
    setSaving(true);
    const saved = await onSave(text);
    if (!saved) {
      finished.current = false;
      setSaving(false);
      setSaveFailed(true);
    }
  }

  return <div className={`${styles.chalk} ${styles.chalkEditor}`} style={chalkGeometry(draft)}
    onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
    <textarea aria-label="Chalk text" aria-describedby="board-chalk-help" aria-invalid={tooLong || undefined}
      autoFocus value={text} readOnly={saving}
      onChange={(event) => { setText(event.currentTarget.value); setSaveFailed(false); }}
      onBlur={() => { void save(); }}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing || composing.current) return;
        if (event.key === 'Escape' && !saving) {
          event.preventDefault(); finished.current = true; onCancel();
        } else if (event.key === 'Enter') { event.preventDefault(); void save(); }
      }} />
    <small id="board-chalk-help" role={tooLong || saveFailed ? 'alert' : undefined}>
      {tooLong ? `Chalk can contain at most ${BOARD_STICKY_TEXT_LIMIT} characters. Shorten the text to save.`
        : saveFailed ? 'Chalk was not saved. Your draft is here; press Enter to retry.'
          : saving ? 'Saving…' : `${text.length}/${BOARD_STICKY_TEXT_LIMIT} · Enter to save · Escape to discard`}
    </small>
  </div>;
}

export function chalkGeometry(geometry: BoardGeometry): CSSProperties {
  return {
    left: geometry.x, top: geometry.y, width: geometry.w, height: geometry.h,
    transform: `scale(${geometry.scale})`, zIndex: geometry.z_index,
  };
}
