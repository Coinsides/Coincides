import { useEffect, useRef, useState } from 'react';
import { useInlineLinks } from '../InlineLinkContext';
import type { InlineLinkTarget } from '../inlineLinkService';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import styles from '../../NoteDetail.module.css';

export function InlineLinkPicker({ onClose, onSelect }: {
  onClose: () => void; onSelect: (target: InlineLinkTarget) => Promise<boolean>;
}) {
  const host = useInlineLinks();
  const root = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    void host?.refreshNotes();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  const choose = async (target: InlineLinkTarget) => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try { if (await onSelect(target)) onClose(); else setError('无法保存链接，请重新选择文字或重试。'); }
    catch { setError('无法保存链接，请重试。'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <FloatingOverlayLayer open placement="free"><div ref={root} className={styles.inlineLinkPicker}
    role="dialog" aria-modal="true" aria-label="链接到…" onMouseDown={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy.current) onClose(); }
      if (event.key === 'Tab') {
        const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (buttons.length && (event.shiftKey ? index <= 0 : index === buttons.length - 1)) {
          event.preventDefault(); buttons[event.shiftKey ? buttons.length - 1 : 0]?.focus();
        }
      }
    }}>
    <header><strong>链接到…</strong><button type="button" onClick={onClose} disabled={saving} aria-label="关闭链接面板">关闭</button></header>
    <div className={styles.inlineLinkColumns}>
      <section aria-label="本笔记章树"><h3>本笔记</h3>
        {host?.chapters.agenda.map((chapter) => <button type="button" key={chapter.id} disabled={saving}
          style={{ paddingInlineStart: `${chapter.level}em` }}
          onClick={() => void choose({ target_kind: 'heading', block_id: chapter.blockId, unit_id: chapter.unitId })}>
          {chapter.title || '无标题章节'}</button>)}
        <h4>内容块</h4>
        {host?.blocks.map((block) => <button type="button" key={block.id} disabled={saving}
          onClick={() => void choose({ target_kind: 'block', block_id: block.id })}>
          {block.title || block.plain_text?.slice(0, 60) || '内容块'}</button>)}
      </section>
      <section aria-label="本项目笔记"><h3>本项目笔记</h3>
        {host?.notesState === 'loading' && <p role="status">正在读取笔记…</p>}
        {host?.notesState === 'error' && <p role="status">笔记列表暂不可用。<button type="button" onClick={() => void host.refreshNotes()}>重试</button></p>}
        {host?.notesState === 'ready' && host.notes.length === 0 && <p>本项目暂无笔记。</p>}
        {host?.notes.map((note) => <button type="button" key={note.id} disabled={saving || host.notesState !== 'ready'}
          onClick={() => void choose({ target_kind: 'note', note_id: note.id })}>{note.title || '无标题笔记'}</button>)}
      </section>
    </div>
    {error && <p role="alert">{error}</p>}
  </div></FloatingOverlayLayer>;
}
