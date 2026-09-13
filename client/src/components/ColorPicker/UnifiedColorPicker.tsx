import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, GripVertical, Plus, X } from 'lucide-react';
import type { PaletteColor } from '@shared/types/palette';
import { usePaletteColors } from '@/hooks/usePaletteColors';
import { groupPaletteColors, isHexColor, nameInGroup, planPaletteMove, readRecentColors, rememberColor } from './paletteUtils';
import styles from './UnifiedColorPicker.module.css';

const STANDARD_COLORS = [
  ['红', '#D14B3A'], ['橙', '#E89438'], ['黄', '#E8C84B'], ['绿', '#4E8D7C'],
  ['蓝', '#4A6FA5'], ['紫', '#6E5E8E'], ['黑', '#000000'], ['灰', '#808080'], ['白', '#FFFFFF'],
] as const;
const DRAG_COLOR_TYPE = 'application/x-coincides-palette-color';

export interface UnifiedColorPickerProps {
  label: string;
  value: string;
  resolvedValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** A single reference-aware picker. Palette assets are edited here in place; other sections emit literals. */
export function UnifiedColorPicker({ label, value, resolvedValue, onChange, disabled = false }: UnifiedColorPickerProps) {
  const id = useId();
  const { colors, detached, loading, error, createColor, updateColor, deleteColor, refresh } = usePaletteColors();
  const groups = useMemo(() => groupPaletteColors(colors), [colors]);
  const selected = colors.find((color) => value === `palette:${color.id}`);
  const currentHex = selected?.value ?? (isHexColor(resolvedValue) ? resolvedValue : '#000000');
  const source = selected ? `引用·${selected.name}` : value.startsWith('palette:') && !detached[value.slice(8)] ? '引用·调色板颜色' : '一次性色';
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [draftHex, setDraftHex] = useState(currentHex);
  const [recent, setRecent] = useState(readRecentColors);
  const [addDraft, setAddDraft] = useState<{ name: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [position, setPosition] = useState<CSSProperties>({ left: 8, top: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<string | null>(null);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const close = useCallback((restoreFocus = true) => {
    // Blur before unmount so a valid in-place name/hex edit also persists on Escape.
    if (document.activeElement instanceof HTMLElement && panelRef.current?.contains(document.activeElement)) document.activeElement.blur();
    setOpen(false); setAddDraft(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => { setDraftHex(currentHex); }, [currentHex]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!rect || !panel) return;
      const width = panel.offsetWidth || Math.min(344, window.innerWidth - 16);
      const height = panel.offsetHeight || 540;
      const below = window.innerHeight - rect.bottom - 8;
      const top = below >= Math.min(height, 240) ? Math.min(rect.bottom + 6, window.innerHeight - height - 8) : rect.top - height - 6;
      setPosition({ left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: Math.max(8, top) });
    };
    place();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    if (panelRef.current) observer?.observe(panelRef.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { observer?.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    setRecent(readRecentColors());
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); close();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !fieldRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey, true); document.removeEventListener('pointerdown', onPointer); };
  }, [open, close]);

  const choose = (next: string, hex: string) => {
    latestValueRef.current = next;
    onChange(next); setDraftHex(hex); setRecent(rememberColor(hex)); setMessage('');
  };
  const beginAdd = (group = '') => {
    setOpen(true); setEditing(true); setActionError('');
    setAddDraft({ name: group ? `${group}/` : '', value: currentHex });
  };
  const mutate = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await action(); setMessage(success); } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : '颜色未能更新，请重试。');
    } finally { setBusy(false); }
  };
  const addColor = (event: FormEvent) => {
    event.preventDefault();
    if (!addDraft?.name.trim() || !isHexColor(addDraft.value)) return;
    void mutate(async () => {
      const created = await createColor({ name: addDraft.name.trim(), value: addDraft.value });
      setAddDraft(null); choose(`palette:${created.id}`, created.value);
    }, '已加入调色板并使用。');
  };

  const moveColor = (color: PaletteColor, group: string, beforeId?: string) => {
    if (color.origin === 'factory' || busy) return;
    const name = nameInGroup(color.name, group);
    if (name.length > 64) { setActionError('分组后的名称不能超过 64 个字。'); return; }
    const entries = groups.find((entry) => entry.name === group)?.colors ?? [];
    try {
      const changes = planPaletteMove(color, entries, group, beforeId);
      void mutate(async () => { for (const { id: colorId, ...patch } of changes) await updateColor(colorId, patch); }, `已移动${color.name}。`);
    } catch (failure) { setActionError(failure instanceof Error ? failure.message : '颜色未能移动。'); }
  };
  const onDropColor = (event: DragEvent, group: string, beforeId?: string) => {
    event.preventDefault(); event.stopPropagation();
    const color = colors.find((entry) => entry.id === (dragRef.current || event.dataTransfer.getData(DRAG_COLOR_TYPE)));
    dragRef.current = null;
    if (color && color.id !== beforeId) moveColor(color, group, beforeId);
  };

  return <div className={styles.field} ref={fieldRef} data-unified-color-picker>
    <span className={styles.fieldLabel}>{label}</span>
    <div className={styles.current}>
      <button ref={triggerRef} type="button" className={styles.trigger} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-panel` : undefined}
        disabled={disabled} onClick={() => { if (open) close(); else setOpen(true); setActionError(''); }}>
        <span className={styles.currentSwatch} style={{ backgroundColor: currentHex }} />
        <span className={styles.currentText}><span className={styles.hex}>{currentHex}</span><span className={styles.source}>{source}</span></span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {!selected && <button type="button" className={styles.quickAdd} title="把当前颜色入池" aria-label={`${label}颜色入池`} disabled={disabled || loading} onClick={() => beginAdd()}><Plus size={14} aria-hidden /><span>入池</span></button>}
    </div>
    {open && createPortal(<div ref={panelRef} id={`${id}-panel`} className={styles.panel} role="dialog" aria-label={`${label}颜色`} style={position}
      onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <header className={styles.header}><strong>{label}颜色</strong><button type="button" aria-label="关闭取色器" onClick={() => close()}><X size={16} aria-hidden /></button></header>
      <div className={styles.sections}>
        <section aria-labelledby={`${id}-palette`} className={styles.section}>
          <div className={styles.sectionHeading}><h3 id={`${id}-palette`}>调色板</h3><div className={styles.actions}>
            <button type="button" disabled={loading || busy} aria-pressed={editing} onClick={() => { setEditing(!editing); setAddDraft(null); }}>{editing ? '完成编辑' : '编辑'}</button>
            <button type="button" title="把当前颜色入池" aria-label="把当前颜色入池" disabled={loading || busy} onClick={() => beginAdd()}><Plus size={16} aria-hidden /></button>
          </div></div>
          <div className={styles.currentSource}>{source}{!selected && <button type="button" disabled={loading || busy} onClick={() => beginAdd()}>入池</button>}</div>
          {loading && <div className={styles.loading} role="status">正在读取调色板…</div>}
          {error && <p className={styles.error} role="alert">{error}<button type="button" onClick={() => void refresh()}>重试</button></p>}
          {!loading && !error && groups.length === 0 && <p className={styles.hint}>给当前颜色命名，开始你的调色板。</p>}
          {groups.map((group) => <div key={group.name} className={styles.group} onDragOver={(event) => { if (editing) event.preventDefault(); }} onDrop={(event) => onDropColor(event, group.name)}>
            <button type="button" className={styles.groupToggle} aria-expanded={!collapsed.has(group.name)} onClick={() => setCollapsed((previous) => {
              const next = new Set(previous); if (next.has(group.name)) next.delete(group.name); else next.add(group.name); return next;
            })}>{collapsed.has(group.name) ? <ChevronRight size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}<span>{group.name || '未分组'}</span><span className={styles.count}>{group.colors.length}</span></button>
            {!collapsed.has(group.name) && <>
              <div className={styles.swatches}>
                {group.colors.map((color) => <button key={color.id} type="button" className={styles.swatch} style={{ backgroundColor: color.value }} title={`${color.name} · ${color.value}${color.origin === 'factory' ? ' · 出厂色' : ''}`}
                  aria-label={`${color.name} ${color.value}`} aria-pressed={value === `palette:${color.id}`} draggable={editing && color.origin === 'user' && !busy}
                  onDragStart={(event) => { dragRef.current = color.id; event.dataTransfer.setData(DRAG_COLOR_TYPE, color.id); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { dragRef.current = null; }}
                  onDragOver={(event) => { if (editing) event.preventDefault(); }} onDrop={(event) => onDropColor(event, group.name, color.id)} onClick={() => choose(`palette:${color.id}`, color.value)} />)}
                <button type="button" className={styles.addSwatch} aria-label={`向${group.name || '未分组'}添加颜色`} title="添加当前颜色" disabled={busy} onClick={() => beginAdd(group.name)}><Plus size={16} aria-hidden /></button>
              </div>
              {editing && <div className={styles.colorEditors}>{group.colors.map((color, index) => <PaletteColorEditor key={color.id} color={color} busy={busy} groups={groups.map((entry) => entry.name)}
                canMoveUp={index > 0} canMoveDown={index < group.colors.length - 1}
                onUpdate={(patch) => void mutate(() => updateColor(color.id, patch), '颜色已更新。')}
                onDelete={() => void mutate(async () => { const deleted = await deleteColor(color.id); if (latestValueRef.current === `palette:${color.id}`) onChange(deleted.value); }, '颜色已删除，使用处保留原色。')}
                onMoveGroup={(target) => moveColor(color, target)} onMove={(direction) => moveColor(color, group.name, direction < 0 ? group.colors[index - 1]?.id : group.colors[index + 2]?.id)} />)}</div>}
            </>}
          </div>)}
          {addDraft && <form className={styles.addForm} onSubmit={addColor}>
            <label>颜色名称<input autoFocus aria-label="新颜色名称" value={addDraft.name} maxLength={64} placeholder="例如：暖调/杏黄" disabled={busy} onChange={(event) => setAddDraft({ ...addDraft, name: event.target.value })} /></label>
            <label>Hex<input aria-label="新颜色 Hex" value={addDraft.value} maxLength={9} spellCheck={false} aria-invalid={!isHexColor(addDraft.value)} disabled={busy} onChange={(event) => setAddDraft({ ...addDraft, value: event.target.value })} /></label>
            <p className={styles.hint}>名称中的 / 自动分组。</p>
            <div className={styles.actions}><button type="submit" disabled={busy || !addDraft.name.trim() || !isHexColor(addDraft.value)}>加入并使用</button><button type="button" disabled={busy} onClick={() => setAddDraft(null)}>收起</button></div>
          </form>}
        </section>
        <section aria-labelledby={`${id}-standard`} className={styles.section}><h3 id={`${id}-standard`}>标准色</h3><div className={styles.swatches}>{STANDARD_COLORS.map(([name, hex]) => <button key={hex} type="button" className={styles.swatch} style={{ backgroundColor: hex }} aria-label={`标准色 ${name} ${hex}`} aria-pressed={value.toUpperCase() === hex} title={`${name} · ${hex}`} onClick={() => choose(hex, hex)} />)}</div></section>
        <section aria-labelledby={`${id}-recent`} className={styles.section}><h3 id={`${id}-recent`}>最近使用</h3>{recent.length ? <div className={styles.swatches}>{recent.map((hex) => <button key={hex} type="button" className={styles.swatch} style={{ backgroundColor: hex }} aria-label={`最近使用 ${hex}`} title={hex} onClick={() => choose(hex, hex)} />)}</div> : <p className={styles.hint}>选过的颜色会留在这里。</p>}</section>
        <section aria-labelledby={`${id}-free`} className={styles.section}><h3 id={`${id}-free`}>自由取色</h3><div className={styles.freeColor}>
          <label className={styles.nativeColor} title="打开颜色色域"><input type="color" aria-label="颜色色域" value={currentHex.slice(0, 7)} onChange={(event) => choose(event.target.value, event.target.value)} /><span>色域</span></label>
          <label className={styles.hexField}>Hex<input aria-label="Hex 颜色" type="text" value={draftHex} maxLength={9} spellCheck={false} aria-invalid={!isHexColor(draftHex)} onChange={(event) => {
            const next = event.target.value; setDraftHex(next); if (isHexColor(next)) choose(next, next);
          }} onBlur={() => { if (!isHexColor(draftHex)) setDraftHex(currentHex); }} /></label>
        </div><p className={styles.hint}>支持 6 位颜色和 8 位透明度色值。</p></section>
        {actionError && <p className={styles.error} role="alert">{actionError}</p>}
        <p className={styles.status} role="status">{busy ? '正在更新颜色…' : message}</p>
      </div>
    </div>, document.body)}
  </div>;
}

function PaletteColorEditor({ color, busy, groups, canMoveUp, canMoveDown, onUpdate, onDelete, onMove, onMoveGroup }: {
  color: PaletteColor; busy: boolean; groups: string[]; canMoveUp: boolean; canMoveDown: boolean;
  onUpdate: (patch: { name?: string; value?: string }) => void; onDelete: () => void;
  onMove: (direction: number) => void; onMoveGroup: (group: string) => void;
}) {
  const [name, setName] = useState(color.name);
  const [hex, setHex] = useState(color.value);
  const locked = color.origin === 'factory';
  useEffect(() => { setName(color.name); }, [color.name]);
  useEffect(() => { setHex(color.value); }, [color.value]);
  const commitName = () => { if (name.trim() && name.trim() !== color.name) onUpdate({ name: name.trim() }); else setName(color.name); };
  const commitHex = () => { if (isHexColor(hex) && hex !== color.value) onUpdate({ value: hex }); else setHex(color.value); };
  return <div className={styles.colorEditor}>
    <div className={styles.editorFields}><GripVertical size={14} aria-hidden /><input aria-label={`${color.name}名称`} value={name} maxLength={64} disabled={locked || busy} title={locked ? '出厂色不能修改' : '名称中的 / 自动分组'} onChange={(event) => setName(event.target.value)} onBlur={commitName} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
      <input className={styles.editHex} aria-label={`${color.name} Hex`} value={hex} maxLength={9} spellCheck={false} aria-invalid={!isHexColor(hex)} disabled={locked || busy} onChange={(event) => setHex(event.target.value)} onBlur={commitHex} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></div>
    <div className={styles.editorActions}>
      {locked ? <span className={styles.hint}>出厂色</span> : <select aria-label={`移动${color.name}到分组`} value="" disabled={busy} onChange={(event) => { if (event.target.value) onMoveGroup(event.target.value === '__ungrouped__' ? '' : event.target.value); }}><option value="">移到分组…</option>{[...new Set(['', ...groups])].map((group) => <option key={group} value={group || '__ungrouped__'}>{group || '未分组'}</option>)}</select>}
      <button type="button" aria-label={`上移${color.name}`} disabled={locked || busy || !canMoveUp} onClick={() => onMove(-1)}>↑</button>
      <button type="button" aria-label={`下移${color.name}`} disabled={locked || busy || !canMoveDown} onClick={() => onMove(1)}>↓</button>
      <button type="button" aria-label={`删除${color.name}`} disabled={locked || busy} title={locked ? '出厂色不能删除' : '删除后使用处保留原色'} onClick={onDelete}>删除</button>
    </div>
  </div>;
}
