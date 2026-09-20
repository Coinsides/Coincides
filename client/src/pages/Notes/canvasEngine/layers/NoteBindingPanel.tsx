import { useEffect, useRef, useState } from 'react';
import { createDefaultNoteBindingSettings, NOTE_BINDING_SLOT_NAMES,
  type NoteBindingSettings, type NoteBindingSection, type NoteBindingSlotName } from '../../../../../../shared/types/noteBinding';
import styles from './NoteBindingPanel.module.css';
import { NoteCoverPageControls, type NoteCoverPageControlsProps } from './NoteCoverPageControls';
import type { PageFrameCollectionModel } from '../types';

export const bindingSlotLabels: Record<NoteBindingSlotName, string> = {
  'header-left': '眉左', 'header-center': '眉中', 'header-right': '眉右',
  'footer-left': '脚左', 'footer-center': '脚中', 'footer-right': '脚右',
};

export function NoteBindingPanel({ value, pageCount, onSave, onClose, coverControls }: {
  value?: NoteBindingSettings | null; pageCount: number;
  onSave: (value: NoteBindingSettings, collection?: PageFrameCollectionModel) => Promise<void>; onClose: () => void;
  coverControls?: Omit<NoteCoverPageControlsProps, 'value' | 'onChange' | 'onSave'>;
}) {
  const [draft, setDraft] = useState(() => structuredClone(value ?? createDefaultNoteBindingSettings()));
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const saving = useRef(false);
  const coverSaving = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const section = draft.sections[selected];
  const update = (patch: Partial<NoteBindingSection>) => setDraft((previous) => ({ ...previous,
    sections: previous.sections.map((entry, index) => index === selected ? { ...entry, ...patch } : entry) }));
  const number = (patch: Partial<NoteBindingSection['pageNumber']>) => update({ pageNumber: { ...section.pageNumber, ...patch } });
  const addSection = () => {
    const last = draft.sections[draft.sections.length - 1];
    const next = structuredClone(last);
    next.id = `section-${Date.now()}`;
    next.startPage = last.startPage + 1;
    next.pageNumber.startAt = 1;
    setDraft({ ...draft, sections: [...draft.sections, next] });
    setSelected(draft.sections.length);
  };
  return <form className={styles.panel} aria-label="装订设置" onSubmit={async (event) => {
    event.preventDefault();
    if (saving.current || coverSaving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { await onSave(draft); if (mounted.current) onClose(); }
    catch { if (mounted.current) setError('装订设置未保存，请重试。'); }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
  }}>
    <header><strong>装订</strong><button type="button" disabled={busy || coverBusy} onClick={onClose}>取消</button></header>
    <fieldset disabled={busy || coverBusy}>
      {coverControls && <NoteCoverPageControls {...coverControls} value={draft} onChange={setDraft} onSave={onSave}
        onBusyChange={(next) => {
          coverSaving.current = next;
          if (mounted.current) setCoverBusy(next);
          coverControls.onBusyChange?.(next);
        }} />}
      <label><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />显示装订</label>
      <p>设置应用到整段页面；机械页序保持不变。当前共 {pageCount} 页。</p>
      <label>装订段<select value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
        {draft.sections.map((entry, index) => <option key={entry.id} value={index}>第 {entry.startPage} 页 — {draft.sections[index + 1] ? `第 ${draft.sections[index + 1].startPage - 1} 页` : '末页'}</option>)}
      </select></label>
      <div className={styles.actions}><button type="button" onClick={addSection} disabled={draft.sections.length >= 1000 || draft.sections[draft.sections.length - 1].startPage >= 999999}>新增段</button>
        {selected > 0 && <button type="button" onClick={() => { setDraft({ ...draft, sections: draft.sections.filter((_, index) => index !== selected) }); setSelected(selected - 1); }}>删除本段</button>}</div>
      <label>起始机械页<input type="number" required min={selected ? draft.sections[selected - 1].startPage + 1 : 1}
        max={draft.sections[selected + 1]?.startPage ? draft.sections[selected + 1].startPage - 1 : 999999}
        disabled={selected === 0} value={section.startPage} onChange={(event) => update({ startPage: Number(event.target.value) })} /></label>
      <label><input type="checkbox" checked={section.headerFooterEnabled} onChange={(event) => update({ headerFooterEnabled: event.target.checked })} />显示手填页眉与页脚</label>
      <label><input type="checkbox" checked={section.pageNumber.enabled} onChange={(event) => number({ enabled: event.target.checked })} />显示页码</label>
      <label>显示起始数<input type="number" required min={1} max={999999} value={section.pageNumber.startAt} onChange={(event) => number({ startAt: Number(event.target.value) })} /></label>
      <label>页码制式<select value={section.pageNumber.format} onChange={(event) => number({ format: event.target.value as typeof section.pageNumber.format })}>
        <option value="arabic">1, 2, 3</option><option value="roman-lower">i, ii, iii</option><option value="roman-upper">I, II, III</option>
      </select></label>
      <div className={styles.template}><input aria-label="页码前缀" maxLength={200} placeholder="前缀" value={section.pageNumber.prefix} onChange={(event) => number({ prefix: event.target.value })} />
        <span aria-label="必留页码">N</span><input aria-label="页码后缀" maxLength={200} placeholder="后缀" value={section.pageNumber.suffix} onChange={(event) => number({ suffix: event.target.value })} /></div>
      <label>页码槽<select value={section.pageNumber.slot} onChange={(event) => number({ slot: event.target.value as NoteBindingSlotName })}>
        {NOTE_BINDING_SLOT_NAMES.map((name) => <option key={name} value={name}>{bindingSlotLabels[name]}</option>)}
      </select></label>
      <p>页码占用所选槽；关闭或移走页码后，该槽恢复手填文案。</p>
      {NOTE_BINDING_SLOT_NAMES.map((name) => {
        const slot = section.slots[name];
        const patch = (change: Partial<typeof slot>) => update({ slots: { ...section.slots, [name]: { ...slot, ...change } } });
        return <details key={name}><summary>{bindingSlotLabels[name]}{slot.text ? ` · ${slot.text}` : ''}</summary>
          <label>手填文案<input aria-label={`${bindingSlotLabels[name]}文案`} maxLength={2000} value={slot.text} onChange={(event) => patch({ text: event.target.value })} /></label>
          <div className={styles.template}>{(['offsetX', 'offsetY'] as const).map((axis) => <label key={axis}>{axis === 'offsetX' ? '横移' : '纵移'}<input type="number" step="any" required min={-1000} max={1000} value={slot[axis]} onChange={(event) => patch({ [axis]: Number(event.target.value) })} /></label>)}</div>
          <label>字族<select value={slot.style.fontFamily ?? 'skin'} onChange={(event) => patch({ style: { ...slot.style, fontFamily: event.target.value as typeof slot.style.fontFamily } })}>
            <option value="skin">跟随皮</option><option value="serif">衬线</option><option value="sans">无衬线</option><option value="mono">等宽</option>
          </select></label>
          <label>字号<input type="number" step="any" min={1} max={200} placeholder="跟随皮" value={slot.style.fontSize ?? ''} onChange={(event) => patch({ style: { ...slot.style, fontSize: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>字重<select value={slot.style.fontWeight ?? ''} onChange={(event) => patch({ style: { ...slot.style, fontWeight: event.target.value ? Number(event.target.value) : undefined } })}>
            <option value="">跟随皮</option><option value="400">常规</option><option value="700">粗体</option></select></label>
          <label>颜色<select value={slot.style.colorToken ?? ''} onChange={(event) => patch({ style: { ...slot.style, colorToken: event.target.value ? event.target.value as typeof slot.style.colorToken : undefined } })}>
            <option value="">跟随皮</option><option value="ink">正文</option><option value="ink-muted">弱字</option><option value="accent">强调</option></select></label>
          <label><input type="checkbox" checked={slot.style.italic ?? false} onChange={(event) => patch({ style: { ...slot.style, italic: event.target.checked } })} />斜体</label>
          <button type="button" onClick={() => patch({ style: {} })}>恢复皮样式</button>
        </details>;
      })}
      {error && <p role="alert">{error}</p>}
      <button type="submit">{busy ? '保存中…' : '保存装订'}</button>
    </fieldset>
  </form>;
}
