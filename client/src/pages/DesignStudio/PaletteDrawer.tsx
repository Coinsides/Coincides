import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, X } from 'lucide-react';
import type { PaletteColor } from '@shared/types/palette';
import { usePaletteColors } from '@/hooks/usePaletteColors';
import { groupPaletteColors, isHexColor, nameInGroup, planPaletteMove, splitPaletteName } from '@/components/ColorPicker/paletteUtils';
import styles from './PaletteDrawer.module.css';

const DRAG_COLOR_TYPE = 'application/x-coincides-palette-color';
const isComposing = (event: KeyboardEvent) => event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;

export default function PaletteDrawer({ search }: { search: string }) {
  const { colors, loading, error, createColor, updateColor, deleteColor, refresh } = usePaletteColors();
  const groups = useMemo(() => groupPaletteColors(colors), [colors]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'hex' } | null>(null);
  const [addDraft, setAddDraft] = useState<{ groupKey: string; name: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const dragRef = useRef<string | null>(null);
  const pendingRef = useRef(0);
  const query = search.trim().toLocaleLowerCase();
  const sections = (['user', 'factory'] as const).map((origin) => ({
    origin,
    label: origin === 'user' ? '我的颜色' : '出厂颜色',
    groups: groups.map((group) => ({ ...group, colors: group.colors.filter((color) => color.origin === origin && color.name.toLocaleLowerCase().includes(query)) })).filter((group) => group.colors.length),
  }));
  if (!sections[0].groups.length && !query) sections[0].groups.push({ name: '', colors: [] });

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    pendingRef.current += 1; setBusy(true); setActionError('');
    try { await action(); setMessage(success); }
    catch (failure) { setActionError(failure instanceof Error ? failure.message : '颜色未能更新，请重试。'); }
    finally { pendingRef.current -= 1; setBusy(pendingRef.current > 0); }
  };
  const beginAdd = (groupKey: string, group: string) => {
    setEditing(null); setActionError('');
    setAddDraft({ groupKey, name: group ? `${group}/` : '', value: '#4A6FA5' });
  };
  const addColor = (event: FormEvent) => {
    event.preventDefault();
    if (!addDraft?.name.trim() || !isHexColor(addDraft.value)) return;
    void mutate(async () => { await createColor({ name: addDraft.name.trim(), value: addDraft.value }); setAddDraft(null); }, '颜色已加入调色板。');
  };
  const moveColor = (color: PaletteColor, group: string, beforeId?: string) => {
    if (color.origin !== 'user' || pendingRef.current) return;
    if (nameInGroup(color.name, group).length > 64) { setActionError('分组后的名称不能超过 64 个字。'); return; }
    try {
      const changes = planPaletteMove(color, groups.find((entry) => entry.name === group)?.colors ?? [], group, beforeId);
      void mutate(async () => { for (const { id, ...patch } of changes) await updateColor(id, patch); }, '颜色顺序已更新。');
    } catch (failure) { setActionError(failure instanceof Error ? failure.message : '颜色未能移动。'); }
  };
  const dropColor = (event: DragEvent, group: string, beforeId?: string) => {
    event.preventDefault(); event.stopPropagation();
    const color = colors.find((entry) => entry.id === (dragRef.current || event.dataTransfer.getData(DRAG_COLOR_TYPE)));
    dragRef.current = null;
    if (color && color.id !== beforeId) moveColor(color, group, beforeId);
  };

  return <div className={styles.drawer} aria-label="调色板库存" aria-busy={loading || busy}>
    <p className={styles.intro}>在这里整理颜色；取色器中也能随手增改，使用的是同一份调色板。</p>
    {loading && <p className={styles.feedback} role="status">正在读取调色板…</p>}
    {error && <p className={styles.feedback} role="alert">{error}<button type="button" disabled={busy} onClick={() => void refresh()}>重试</button></p>}
    {!loading && !error && query && sections.every((section) => !section.groups.length) && <p className={styles.feedback}>没有找到“{search.trim()}”对应的颜色。试试其他名称。</p>}
    {sections.map((section) => section.groups.length > 0 && <section key={section.origin} className={styles.section} aria-label={section.label}>
      <h3>{section.label}</h3>
      {section.groups.map((group) => {
        const groupKey = `${section.origin}:${group.name}`;
        const label = group.name || '未分组';
        const editorColor = group.colors.find((color) => color.id === editing?.id);
        return <section key={groupKey} className={styles.group} aria-label={`${section.label}·${label}`}
          onDragOver={(event) => { if (dragRef.current && !busy) event.preventDefault(); }} onDrop={(event) => dropColor(event, group.name)}>
          <button type="button" className={styles.groupToggle} aria-expanded={!collapsed.has(groupKey)} onClick={() => setCollapsed((previous) => {
            const next = new Set(previous); if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey); return next;
          })}>{collapsed.has(groupKey) ? <ChevronRight size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}<span>{label}</span><span className={styles.count}>{group.colors.length}</span></button>
          {!collapsed.has(groupKey) && <>
            {group.colors.length === 0 && <p className={styles.hint}>从一个颜色开始。用“分组/颜色名”命名，就会自动成组。</p>}
            <div className={styles.grid}>
              {group.colors.map((color, index) => <ColorTile key={color.id} color={color} busy={busy} selected={editing?.id === color.id}
                onEdit={(field) => { setAddDraft(null); setEditing({ id: color.id, field }); }}
                onDelete={() => void mutate(async () => { await deleteColor(color.id); if (editing?.id === color.id) setEditing(null); }, '颜色已删除，使用处保留原色。')}
                canMoveUp={index > 0} canMoveDown={index < group.colors.length - 1}
                onMove={(direction) => moveColor(color, group.name, direction < 0 ? group.colors[index - 1]?.id : group.colors[index + 2]?.id)}
                onDragStart={(event) => { dragRef.current = color.id; event.dataTransfer.setData(DRAG_COLOR_TYPE, color.id); event.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { dragRef.current = null; }} onDrop={(event) => dropColor(event, group.name, color.id)} />)}
              <button type="button" className={styles.addTile} aria-label={`向${section.label}·${label}添加颜色`} disabled={loading || busy} onClick={() => beginAdd(groupKey, group.name)}><Plus size={22} aria-hidden /><span>添加颜色</span></button>
            </div>
            {editorColor && editing && <ColorEditor key={editorColor.id} color={editorColor} field={editing.field} busy={busy} groups={groups.map((entry) => entry.name)}
              onUpdate={(patch) => void mutate(() => updateColor(editorColor.id, patch), '颜色已更新。')}
              onMoveGroup={(target) => moveColor(editorColor, target)} onClose={() => setEditing(null)} />}
            {addDraft?.groupKey === groupKey && <form className={styles.editor} aria-label="添加调色板颜色" onSubmit={addColor} onKeyDown={(event) => { if (event.key === 'Enter' && isComposing(event)) event.preventDefault(); }}>
              <label>颜色名称<input autoFocus aria-label="新颜色名称" value={addDraft.name} maxLength={64} placeholder="例如：暖调/杏黄" disabled={busy} onChange={(event) => setAddDraft({ ...addDraft, name: event.target.value })} /></label>
              <label>Hex<input aria-label="新颜色 Hex" value={addDraft.value} maxLength={9} spellCheck={false} aria-invalid={!isHexColor(addDraft.value)} disabled={busy} onChange={(event) => setAddDraft({ ...addDraft, value: event.target.value })} /></label>
              <p className={styles.hint}>支持 6 位颜色和 8 位透明度色值。名称中的 / 自动分组。</p>
              <div className={styles.actions}><button type="submit" disabled={busy || !addDraft.name.trim() || !isHexColor(addDraft.value)}>加入调色板</button><button type="button" disabled={busy} onClick={() => setAddDraft(null)}>收起</button></div>
            </form>}
          </>}
        </section>;
      })}
    </section>)}
    {actionError && <p className={styles.feedback} role="alert">{actionError}</p>}
    <p className={styles.status} role="status">{busy ? '正在更新颜色…' : message}</p>
  </div>;
}

function ColorTile({ color, busy, selected, canMoveUp, canMoveDown, onEdit, onDelete, onMove, onDragStart, onDragEnd, onDrop }: {
  color: PaletteColor; busy: boolean; selected: boolean; canMoveUp: boolean; canMoveDown: boolean;
  onEdit: (field: 'name' | 'hex') => void; onDelete: () => void; onMove: (direction: number) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void; onDragEnd: () => void; onDrop: (event: DragEvent) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 8, top: 8 });
  const menuRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const locked = color.origin === 'factory';
  const closeMenu = () => { setMenuOpen(false); triggerRef.current?.focus(); };
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = menuRef.current?.offsetWidth || 140;
      const height = menuRef.current?.offsetHeight || 192;
      setMenuPosition({ left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - height - 8)) });
    };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [menuOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !tileRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen]);
  const menuKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(); return; }
    if (event.key === 'Tab') { closeMenu(); return; }
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index + buttons.length - 1) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
  };
  const edit = (field: 'name' | 'hex') => { setMenuOpen(false); onEdit(field); };
  return <div ref={tileRef} className={styles.tile} data-selected={selected || undefined} onContextMenu={(event) => { event.preventDefault(); if (!locked && !busy) setMenuOpen(true); }}>
    <button type="button" className={styles.swatch} style={{ backgroundColor: color.value }} aria-label={`${color.name} ${color.value}`} title={`${color.name} · ${color.value}${locked ? ' · 出厂色' : ''}`}
      draggable={!locked && !busy} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event) => { if (!busy) event.preventDefault(); }} onDrop={onDrop}
      onClick={() => { if (!locked && !busy) edit('hex'); }} onKeyDown={(event) => { if (!locked && !busy && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) { event.preventDefault(); setMenuOpen(true); } }}>
      <span className={styles.hoverLabel}>{color.name}<span>{color.value}</span></span>
    </button>
    <span className={styles.colorName} title={color.name}>{splitPaletteName(color.name).label}</span>
    <button ref={triggerRef} type="button" className={styles.manage} aria-label={`管理${color.name}`} title={locked ? '出厂色不能修改或删除' : `管理${color.name}`}
      disabled={locked || busy} aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={menuOpen ? id : undefined} onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={18} aria-hidden /></button>
    {menuOpen && createPortal(<div ref={menuRef} id={id} className={styles.menu} style={menuPosition} role="menu" aria-label={`${color.name}管理`} onKeyDown={menuKey}>
      <button type="button" role="menuitem" onClick={() => edit('name')}>重命名</button>
      <button type="button" role="menuitem" onClick={() => edit('hex')}>编辑色值</button>
      <button type="button" role="menuitem" disabled={!canMoveUp} onClick={() => { closeMenu(); onMove(-1); }}>上移</button>
      <button type="button" role="menuitem" disabled={!canMoveDown} onClick={() => { closeMenu(); onMove(1); }}>下移</button>
      <button type="button" role="menuitem" className={styles.delete} onClick={() => { setMenuOpen(false); onDelete(); }}>删除颜色</button>
    </div>, document.body)}
  </div>;
}

function ColorEditor({ color, field, busy, groups, onUpdate, onMoveGroup, onClose }: {
  color: PaletteColor; field: 'name' | 'hex'; busy: boolean; groups: string[];
  onUpdate: (patch: { name?: string; value?: string }) => void; onMoveGroup: (group: string) => void; onClose: () => void;
}) {
  const [name, setName] = useState(color.name);
  const [hex, setHex] = useState(color.value);
  const nameRef = useRef<HTMLInputElement>(null);
  const hexRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setName(color.name); }, [color.name]);
  useEffect(() => { setHex(color.value); }, [color.value]);
  useEffect(() => { (field === 'name' ? nameRef : hexRef).current?.focus(); }, [field]);
  const commitName = () => { if (name.trim() && name.trim() !== color.name) onUpdate({ name: name.trim() }); else setName(color.name); };
  const commitHex = () => { if (isHexColor(hex) && hex !== color.value) onUpdate({ value: hex }); else setHex(color.value); };
  return <div className={styles.editor} role="group" aria-label={`编辑${color.name}`} onKeyDown={(event) => {
    if (event.key === 'Escape') { (document.activeElement as HTMLElement)?.blur(); onClose(); }
  }}>
    <label>颜色名称<input ref={nameRef} aria-label={`${color.name}名称`} value={name} maxLength={64} disabled={busy} onChange={(event) => setName(event.target.value)} onBlur={commitName} onKeyDown={(event) => { if (event.key === 'Enter' && !isComposing(event)) event.currentTarget.blur(); }} /></label>
    <label>Hex<input ref={hexRef} aria-label={`${color.name} Hex`} value={hex} maxLength={9} spellCheck={false} aria-invalid={!isHexColor(hex)} disabled={busy} onChange={(event) => setHex(event.target.value)} onBlur={commitHex} onKeyDown={(event) => { if (event.key === 'Enter' && !isComposing(event)) event.currentTarget.blur(); }} /></label>
    <label>移动到<select aria-label={`移动${color.name}到分组`} value="" disabled={busy} onChange={(event) => { if (event.target.value) onMoveGroup(event.target.value === '__ungrouped__' ? '' : event.target.value); }}><option value="">选择分组…</option>{[...new Set(['', ...groups])].map((group) => <option key={group} value={group || '__ungrouped__'}>{group || '未分组'}</option>)}</select></label>
    <p className={styles.hint}>改动会自动同步。名称中的 / 自动分组。</p>
    <button type="button" className={styles.closeEditor} aria-label="收起颜色编辑" onClick={onClose}><X size={16} aria-hidden /></button>
  </div>;
}
