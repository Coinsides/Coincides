import { useState } from 'react';
import type { ParagraphFurniture } from '../paragraphFurniture';
import styles from './ParagraphFurniture.module.css';
import noteStyles from '../../NoteDetail.module.css';

export function ParagraphFurnitureControl({ value, onSave }: {
  value: ParagraphFurniture | null; onSave: (value: ParagraphFurniture | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  return <div style={{ position: 'relative' }}>
    <button type="button" className={noteStyles.iconBtn} aria-label="段落样式" title="段落样式" aria-expanded={open}
      onClick={() => setOpen(!open)}>引</button>
    {open && <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1 }}>
      <ParagraphFurnitureEditor value={value} onSave={onSave} onClose={() => setOpen(false)} />
    </div>}
  </div>;
}

export function ParagraphFurnitureEditor({ value, onSave, onClose }: {
  value: ParagraphFurniture | null; onSave: (value: ParagraphFurniture | null) => Promise<boolean>; onClose: () => void;
}) {
  const [variant, setVariant] = useState(value?.variant ?? 'plain');
  const [source, setSource] = useState(value?.variant === 'quote' ? value.source : '');
  const [label, setLabel] = useState(value?.variant === 'callout' ? value.label : '注');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const save = async () => {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const saved = await onSave(variant === 'quote' ? { variant, source } : variant === 'callout' ? { variant, label: label.trim() || '注' } : null);
      if (saved) onClose(); else setError(true);
    } catch { setError(true); } finally { setBusy(false); }
  };
  return <div role="dialog" aria-label="段落样式" className={styles.editor} onKeyDown={(event) => {
    event.stopPropagation();
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void save(); }
  }} onMouseDown={(event) => event.stopPropagation()}>
    <label>段落样式<select aria-label="段落样式" value={variant} disabled={busy} onChange={(event) => setVariant(event.target.value as typeof variant)}>
      <option value="plain">正文</option><option value="quote">引文</option><option value="callout">提示框</option>
    </select></label>
    {variant === 'quote' && <label>出处<textarea aria-label="引文出处" value={source} maxLength={1000} disabled={busy} onChange={(event) => setSource(event.target.value)} /></label>}
    {variant === 'callout' && <label>标签<input aria-label="提示标签" value={label} maxLength={32} disabled={busy} onChange={(event) => setLabel(event.target.value)} /></label>}
    {error && <p role="alert" className={styles.error}>样式未能保存，请重试。</p>}
    <footer><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="button" disabled={busy} onClick={() => void save()}>保存样式</button></footer>
  </div>;
}
