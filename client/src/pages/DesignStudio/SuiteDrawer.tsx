import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, MoreHorizontal, X } from 'lucide-react';
import { SKIN_PRESET_IDS, SKIN_TOKEN_NAMES, type SkinSelection, type SkinSuite } from '@shared/types';
import { SkinSample } from '@/components/Skin/SkinFloatCard';
import { usePaletteColors } from '@/hooks/usePaletteColors';
import { useSkinSuites } from '@/hooks/useSkinSuites';
import { resolveSkin, SKIN_LABELS } from '@/styles/skinPresets';
import styles from './SuiteDrawer.module.css';

type GallerySuite = { id: SkinSelection['preset']; name: string; suite?: SkinSuite };
type MenuState = { suite: SkinSuite; anchor: HTMLElement; x: number; y: number };

export default function SuiteDrawer({ search }: { search: string }) {
  const suites = useSkinSuites();
  const palette = usePaletteColors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const customHeading = useRef<HTMLElement>(null);
  const custom: GallerySuite[] = suites.suites.map((suite) => ({ id: `suite:${suite.id}`, name: suite.name, suite }));
  const factory: GallerySuite[] = SKIN_PRESET_IDS.map((id) => ({ id, name: SKIN_LABELS[id] }));
  const selected = [...custom, ...factory].find((entry) => entry.id === selectedId);
  const query = search.trim().toLocaleLowerCase();
  const matches = (entry: GallerySuite) => entry.name.toLocaleLowerCase().includes(query);
  const resolved = selected ? resolveSkin({ preset: selected.id }, null, null, palette.values, suites.values) : null;

  const openMenu = (suite: SkinSuite, anchor: HTMLElement, x?: number, y?: number) => {
    if (busy || renaming) return;
    const rect = anchor.getBoundingClientRect();
    setMenu({ suite, anchor, x: x ?? rect.right, y: y ?? rect.bottom });
    setActionError('');
  };
  const closeMenu = (restoreFocus = false) => {
    if (restoreFocus) menu?.anchor.focus();
    setMenu(null);
  };
  const rename = async (suite: SkinSuite, name: string) => {
    if (name === suite.name) { setRenaming(null); return; }
    setBusy(true); setActionError('');
    try {
      await suites.updateSuite(suite.id, { name });
      setRenaming(null); setNotice(`已重命名为「${name}」。`);
    } catch {
      setActionError('重命名未完成，请重试。');
    } finally { setBusy(false); }
  };
  const remove = async (suite: SkinSuite) => {
    setMenu(null); setBusy(true); setActionError('');
    customHeading.current?.focus();
    try {
      await suites.deleteSuite(suite.id);
      setSelectedId((current) => current === `suite:${suite.id}` ? null : current);
      setNotice(`已删除「${suite.name}」，使用它的纸保留原有外观。`);
    } catch {
      setActionError('套装未删除，请重试。');
    } finally { setBusy(false); }
  };
  const renderCard = (entry: GallerySuite) => {
    const sample = resolveSkin({ preset: entry.id }, null, null, palette.values, suites.values);
    return <li key={entry.id} className={styles.card} data-suite-card={entry.id}
      onContextMenu={(event) => {
        if (!entry.suite) return;
        event.preventDefault();
        const anchor = event.currentTarget.querySelector<HTMLButtonElement>('[data-suite-menu-trigger]');
        if (anchor) openMenu(entry.suite, anchor, event.clientX, event.clientY);
      }}>
      <button type="button" className={styles.select} aria-label={`查看套装：${entry.name}`} aria-pressed={selectedId === entry.id}
        onClick={() => setSelectedId(entry.id)} title={entry.name}>
        <span className={styles.preview}><SkinSample {...sample} /></span>
        <span className={styles.name}>{entry.name}</span>
        <span className={styles.lineage}>{SKIN_LABELS[sample.materialPreset]}材质</span>
      </button>
      {entry.suite && <button type="button" data-suite-menu-trigger className={styles.manage} aria-label={`管理套装：${entry.name}`}
        aria-haspopup="menu" aria-expanded={menu?.suite.id === entry.suite.id} disabled={busy || renaming !== null}
        onClick={(event) => openMenu(entry.suite!, event.currentTarget)}><MoreHorizontal size={17} aria-hidden /></button>}
      {entry.suite && renaming === entry.suite.id && <InlineRename key={entry.suite.id} suite={entry.suite} busy={busy}
        save={(name) => void rename(entry.suite!, name)} cancel={() => { setRenaming(null); setActionError(''); }} />}
    </li>;
  };

  return <div className={styles.drawer} aria-busy={busy}>
    {suites.loading && !suites.loaded && <p role="status" className={styles.message}>正在读取我的套装…</p>}
    {suites.error && <p role="alert" className={styles.message}>{suites.error} <button type="button" disabled={suites.loading || busy} onClick={() => void suites.refresh()}>重试套装</button></p>}
    {palette.error && <p role="alert" className={styles.message}>{palette.error} <button type="button" disabled={palette.loading || busy} onClick={() => void palette.refresh()}>重试池色</button></p>}
    {actionError && <p role="alert" className={styles.message}>{actionError}</p>}
    <p role="status" className={notice ? styles.message : styles.visuallyHidden}>{notice}</p>
    <details open className={styles.group}>
      <summary ref={customHeading}><ChevronRight size={15} aria-hidden /><span>我的套装</span><span className={styles.count}>{custom.filter(matches).length}</span></summary>
      <ul className={styles.grid} aria-label="我的套装">{custom.filter(matches).map(renderCard)}</ul>
      {!custom.some(matches) && !suites.loading && <p className={styles.empty}>{query ? '没有匹配的套装。' : '在笔记外观浮卡中将喜欢的外观存为套装，它会出现在这里。'}</p>}
    </details>
    <details open className={styles.group}>
      <summary><ChevronRight size={15} aria-hidden /><span>出厂套装</span><span className={styles.count}>{factory.filter(matches).length}</span></summary>
      <ul className={styles.grid} aria-label="出厂套装">{factory.filter(matches).map(renderCard)}</ul>
      {!factory.some(matches) && <p className={styles.empty}>没有匹配的出厂套装。</p>}
    </details>
    {selected && resolved && <section className={styles.detail} aria-label="套装详情">
      <header><div><h3>{selected.name}</h3><p>{selected.suite ? '我的套装' : '出厂套装'} · 材质谱系：{SKIN_LABELS[resolved.materialPreset]}</p></div>
        <button type="button" aria-label="关闭套装详情" onClick={() => setSelectedId(null)}><X size={16} aria-hidden /></button></header>
      <h4>Token 摘要</h4>
      <dl className={styles.tokens}>{SKIN_TOKEN_NAMES.map((token) => <div key={token}><dt>{token}</dt><dd><span className={styles.swatch} style={{ backgroundColor: resolved.tokens[token] }} aria-hidden /><code>{resolved.tokens[token]}</code></dd></div>)}</dl>
    </section>}
    {menu && <SuiteMenu state={menu} close={closeMenu}
      rename={() => { setRenaming(menu.suite.id); setMenu(null); }} remove={() => void remove(menu.suite)} />}
  </div>;
}

function InlineRename({ suite, busy, save, cancel }: { suite: SkinSuite; busy: boolean; save: (name: string) => void; cancel: () => void }) {
  const [name, setName] = useState(suite.name);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  const commit = () => {
    if (cancelled.current || busy) return;
    if (!name.trim()) { setInvalid(true); return; }
    save(name.trim());
  };
  return <div className={styles.rename}>
    <input ref={input} aria-label="套装新名字" value={name} maxLength={64} disabled={busy} aria-invalid={invalid}
      onChange={(event) => { setName(event.target.value); setInvalid(false); }} onBlur={commit}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter') { event.preventDefault(); if (name.trim()) event.currentTarget.blur(); else setInvalid(true); }
        if (event.key === 'Escape') { event.preventDefault(); cancelled.current = true; cancel(); }
      }} />
    <span>{invalid ? '名字不能为空。' : busy ? '正在保存…' : '回车或移开焦点即保存'}</span>
  </div>;
}

function SuiteMenu({ state, close, rename, remove }: { state: MenuState; close: (restoreFocus?: boolean) => void; rename: () => void; remove: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close); closeRef.current = close;
  const [position, setPosition] = useState({ x: state.x, y: state.y });
  useLayoutEffect(() => {
    const rect = panel.current?.getBoundingClientRect();
    setPosition({ x: Math.max(8, Math.min(state.x, window.innerWidth - (rect?.width || 168) - 8)), y: Math.max(8, Math.min(state.y, window.innerHeight - (rect?.height || 90) - 8)) });
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [state]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node)) closeRef.current(); };
    const dismiss = () => closeRef.current(true);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true); };
  }, []);
  return createPortal(<div ref={panel} className={styles.menu} role="menu" aria-label="套装操作" style={{ left: position.x, top: position.y }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      if (event.key === 'Tab') { close(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const items = Array.from(event.currentTarget.querySelectorAll('button'));
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length]?.focus();
    }}>
    <button type="button" role="menuitem" onClick={rename}>重命名</button>
    <button type="button" role="menuitem" onClick={remove}>删除套装</button>
  </div>, document.body);
}
