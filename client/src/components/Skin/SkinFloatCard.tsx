import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { SKIN_COMPONENT_OPTIONS, SKIN_PRESET_IDS, type SkinComponents, type SkinPresetId, type SkinSelection, type SkinSuite, type SkinTokens } from '@shared/types';
import { UnifiedColorPicker } from '@/components/ColorPicker/UnifiedColorPicker';
import { usePaletteColors } from '@/hooks/usePaletteColors';
import { normalizeSkinSelection, useSkinSuites } from '@/hooks/useSkinSuites';
import { resolveSkin, SKIN_LABELS } from '@/styles/skinPresets';
import { buildPaperMaterialStyles, buildPaperSkinStyles } from '@/pages/Notes/canvasEngine/paperSkinStyles';
import { clampFloatCard, readFloatCardPosition, rememberFloatCardPosition, type FloatCardPosition } from './skinFloatCardGeometry';
import styles from './SkinFloatCard.module.css';

interface FloatCardSkin {
  selection: SkinSelection | null;
  inheritedSelection?: SkinSelection | null;
  save: (skin: SkinSelection | null) => Promise<void>;
  saveError?: boolean;
  preview?: (skin: SkinSelection | null) => void;
}
export interface SkinFloatCardProps {
  noteId: string;
  skin: FloatCardSkin;
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement>;
  disabled?: boolean;
}

const paperTokens = [
  ['desk', '桌面'], ['paper', '纸面'], ['ink', '正文'], ['ink-muted', '弱字'], ['accent', '强调'],
  ['annotation', '批注'], ['hairline', '分隔线'], ['danger', '危险操作'], ['wall', '页边距墙'],
] as const;
const componentLabels: Record<keyof SkinComponents, string> = { titleFont: '标题字', labelFont: '标签与刻度字', menuDensity: '菜单密度', handleStyle: '把手样式', headerRule: '表头分隔线' };
const optionLabels: Record<string, string> = { sans: '无衬线', serif: '衬线', system: '系统', mono: '等宽', comfortable: '舒适', compact: '紧凑', capsule: '胶囊', rivet: '铆钉', visible: '显示', hidden: '隐藏' };
const isTextInput = (target: EventTarget | null) => target instanceof HTMLElement && (target.matches('textarea,input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="range"])') || target.isContentEditable);
const nativeControlFor = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof HTMLElement)) return null;
  const control = target.closest<HTMLElement>('select,input[type="color"],input[type="range"]')
    ?? target.closest('label')?.control;
  return control instanceof HTMLElement && control.matches('select,input[type="color"],input[type="range"]') ? control : null;
};
const needsNativePointer = (target: EventTarget | null) => !!nativeControlFor(target) || (target instanceof HTMLElement && !!target.closest('[draggable="true"]'));

/** The shell owns only viewport geometry. Selection and note identity never close it. */
export function SkinFloatCard({ open, ...props }: SkinFloatCardProps) {
  return open ? <FloatCardShell {...props} /> : null;
}

function FloatCardShell({ noteId, skin, onClose, anchorRef, disabled = false }: Omit<SkinFloatCardProps, 'open'>) {
  const panel = useRef<HTMLDivElement>(null);
  const initial = useRef(readFloatCardPosition());
  const [position, setPosition] = useState<FloatCardPosition>(initial.current ?? { x: 8, y: 8, collapsed: false });
  const positionRef = useRef(position);
  positionRef.current = position;
  const drag = useRef<{ pointerId: number; x: number; y: number; start: FloatCardPosition } | null>(null);
  const preservedFocus = useRef<HTMLElement | null>(null);
  const pointerMode = useRef(false);
  const nativeInteraction = useRef<HTMLElement | null>(null);
  const externalColorPicker = useRef<HTMLElement | null>(null);
  const nativeReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnNativeFocus = useCallback((control: HTMLElement) => {
    if (nativeReturnTimer.current) clearTimeout(nativeReturnTimer.current);
    // Let the browser finish the native commit/cancel and the picker consume its
    // change first. In particular, input events while dragging a color are not done.
    nativeReturnTimer.current = setTimeout(() => {
      nativeReturnTimer.current = null;
      if (nativeInteraction.current !== control) return;
      nativeInteraction.current = null;
      externalColorPicker.current = null;
      const active = document.activeElement;
      if (preservedFocus.current?.isConnected && (active === control || active === document.body || !active)) {
        preservedFocus.current.focus({ preventScroll: true });
      }
    }, 0);
  }, []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const fit = useCallback((next: FloatCardPosition, snap = false) => clampFloatCard(next, {
    width: panel.current?.offsetWidth || Math.min(280, window.innerWidth - 16),
    height: next.collapsed ? (panel.current?.dataset.collapsed === 'true' ? panel.current.offsetHeight : 42) : panel.current?.offsetHeight || Math.min(560, window.innerHeight * .6),
  }, { width: window.innerWidth, height: window.innerHeight }, snap), []);
  const settle = useCallback((next: FloatCardPosition, snap = false) => {
    const fitted = fit(next, snap);
    positionRef.current = fitted; setPosition(fitted); rememberFloatCardPosition(fitted);
  }, [fit]);
  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    settle(initial.current ?? { x: rect ? rect.right - 280 : 8, y: rect ? rect.top - Math.min(560, window.innerHeight * .6) - 8 : 8, collapsed: false });
    const resize = () => settle(positionRef.current);
    window.addEventListener('resize', resize);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (panel.current) observer?.observe(panel.current);
    return () => { window.removeEventListener('resize', resize); observer?.disconnect(); };
  }, [anchorRef, settle]);
  useEffect(() => {
    const completed = (event: Event) => {
      if (nativeInteraction.current && event.target === nativeInteraction.current) returnNativeFocus(nativeInteraction.current);
    };
    const nativeEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !nativeInteraction.current) return;
      if (!nativeInteraction.current.isConnected) { nativeInteraction.current = null; return; }
      // Leave the native Escape default intact, but the same key must not close
      // the shared picker or its floating-card owner.
      event.stopImmediatePropagation();
      returnNativeFocus(nativeInteraction.current);
    };
    const nextPointer = (event: PointerEvent) => {
      if (nativeInteraction.current && nativeControlFor(event.target) !== nativeInteraction.current) nativeInteraction.current = null;
    };
    const windowLeft = () => {
      const control = nativeInteraction.current;
      externalColorPicker.current = control instanceof HTMLInputElement && control.type === 'color' ? control : null;
    };
    const windowReturned = () => {
      // A window can be activated while a select is still open. Only an OS
      // color picker that actually took window focus may finish this way.
      const control = externalColorPicker.current;
      externalColorPicker.current = null;
      if (control && nativeInteraction.current === control) returnNativeFocus(control);
    };
    document.addEventListener('change', completed);
    document.addEventListener('cancel', completed, true);
    document.addEventListener('keydown', nativeEscape, true);
    document.addEventListener('pointerdown', nextPointer, true);
    window.addEventListener('blur', windowLeft);
    window.addEventListener('focus', windowReturned);
    return () => {
      document.removeEventListener('change', completed);
      document.removeEventListener('cancel', completed, true);
      document.removeEventListener('keydown', nativeEscape, true);
      document.removeEventListener('pointerdown', nextPointer, true);
      window.removeEventListener('blur', windowLeft);
      window.removeEventListener('focus', windowReturned);
      if (nativeReturnTimer.current) clearTimeout(nativeReturnTimer.current);
    };
  }, [returnNativeFocus]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      pointerMode.current = false;
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open][data-skin-suite-dialog]')) {
        event.preventDefault(); event.stopPropagation(); onCloseRef.current();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  const collapse = () => settle({ ...positionRef.current, collapsed: !positionRef.current.collapsed });
  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: positionRef.current };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const next = { ...gesture.start, x: gesture.start.x + event.clientX - gesture.x, y: gesture.start.y + event.clientY - gesture.y };
    positionRef.current = next; setPosition(next);
  };
  const stopDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null; settle(positionRef.current, true);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return createPortal(<div ref={panel} className={styles.card} style={{ left: position.x, top: position.y }} role="dialog" aria-label="笔记外观浮卡" aria-modal="false" data-skin-float-card data-collapsed={position.collapsed} data-canvas-layer="floating-overlay"
    onClick={(event) => event.stopPropagation()}
    onPointerDownCapture={(event) => {
      pointerMode.current = !isTextInput(event.target);
      if (pointerMode.current) {
        const active = document.activeElement;
        if (active instanceof HTMLElement && !nativeControlFor(active) && !panel.current?.contains(active) && !active.closest('[data-skin-suite-dialog]')) preservedFocus.current = active;
        if (!needsNativePointer(event.target)) event.preventDefault();
      }
      // Native controls temporarily own focus; cancelling their default or
      // focusing paper while their popup is open makes the native UI unusable.
      nativeInteraction.current = nativeControlFor(event.target);
      externalColorPicker.current = null;
    }}
    onPointerUpCapture={() => { const control = nativeInteraction.current; if (control instanceof HTMLInputElement && control.type === 'range') returnNativeFocus(control); }}
    onMouseDown={(event) => { if (!isTextInput(event.target) && !needsNativePointer(event.target)) event.preventDefault(); }}
    onFocusCapture={(event) => {
      // The shared picker portals through this React owner. Preserve paper focus for
      // pointer commands, including its automatic button focus; text fields opt in.
      if (nativeControlFor(event.target)) return;
      if (pointerMode.current && !isTextInput(event.target) && preservedFocus.current?.isConnected && event.target !== preservedFocus.current) preservedFocus.current.focus({ preventScroll: true });
    }}>
    <header className={styles.header} data-skin-float-drag-handle onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}
      onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest('button')) collapse(); }}>
      <strong>笔记外观</strong>
      <button type="button" aria-label={position.collapsed ? '展开外观浮卡' : '折叠外观浮卡'} aria-expanded={!position.collapsed} onClick={collapse}>{position.collapsed ? <ChevronRight size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}</button>
      <button type="button" aria-label="关闭外观" onClick={onClose}><X size={15} aria-hidden /></button>
    </header>
    {!position.collapsed && <div className={styles.body}>{disabled ? <p role="status">正在读取当前笔记…</p> : <FloatCardContent key={noteId} noteId={noteId} skin={skin} />}</div>}
  </div>, document.body);
}

type SampleSkin = { tokens: SkinTokens; components: SkinComponents; preset?: SkinSelection['preset']; materialPreset?: SkinPresetId };
export function SkinSample({ tokens, components, preset = 'default', materialPreset }: SampleSkin) {
  const material = materialPreset ?? preset;
  return <span className={styles.sample} aria-hidden="true" data-skin-sample data-skin-sample-material={material} style={{ ...buildPaperSkinStyles(tokens), ...buildPaperMaterialStyles(tokens, material), backgroundColor: tokens.paper, color: tokens.ink, borderBottom: components.headerRule === 'visible' ? `1px solid ${tokens.hairline}` : undefined }}>
    <span className={styles.sampleTitle} style={{ background: tokens.accent, borderRadius: components.titleFont === 'serif' ? 0 : 1 }} />
    <span className={styles.sampleLine} style={{ background: tokens.ink }} />
    <span className={styles.sampleLine} style={{ background: tokens['ink-muted'] }} />
    <span className={styles.sampleLine} style={{ background: tokens.ink }} />
  </span>;
}

function FloatCardContent({ noteId, skin }: { noteId: string; skin: FloatCardSkin }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const palette = usePaletteColors();
  const suites = useSkinSuites();
  const [draft, setDraft] = useState<SkinSelection | null>(skin.selection);
  const draftRef = useRef(draft); draftRef.current = draft;
  const [saveFailed, setSaveFailed] = useState(false);
  const pending = useRef(0);
  const revision = useRef(0);
  const mounted = useRef(true);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef(skin.preview); previewRef.current = skin.preview;
  const [dialog, setDialog] = useState<{ kind: 'save' } | { kind: 'rename'; suite: SkinSuite } | null>(null);
  const createdForDialog = useRef<SkinSuite | null>(null);
  const [revealPreset, setRevealPreset] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ suite: SkinSuite; x: number; y: number; keyboard: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const clearPreview = useCallback(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = null; previewRef.current?.(null);
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearPreview(); }; }, [clearPreview]);
  useEffect(() => {
    if (!pending.current && !saveFailed && !skin.saveError) { draftRef.current = skin.selection; setDraft(skin.selection); }
  }, [skin.selection, saveFailed, skin.saveError]);
  useEffect(() => {
    if (!revealPreset || dialog) return;
    // Wait for the native dialog to release focus and the scroll container to
    // finish layout before revealing the newly selected card.
    const frame = requestAnimationFrame(() => {
      contentRef.current?.querySelector<HTMLElement>(`[data-appearance-preset="${revealPreset}"]`)?.scrollIntoView?.({ block: 'nearest' });
      setRevealPreset(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [revealPreset, dialog]);
  const base = normalizeSkinSelection(draft ?? skin.inheritedSelection ?? null) ?? { preset: 'default' as const };
  const resolved = resolveSkin(base, null, null, palette.values, suites.values);
  const binding = resolveSkin({ preset: base.preset }, null, null, palette.values, suites.values);
  const boundSuite = suites.suites.find((suite) => `suite:${suite.id}` === base.preset);
  const name = boundSuite?.name ?? (base.preset.startsWith('suite:') ? '自定义外观' : SKIN_LABELS[base.preset as keyof typeof SKIN_LABELS]);
  const deviations = paperTokens.filter(([key]) => resolved.tokens[key].toLowerCase() !== binding.tokens[key].toLowerCase());
  const componentDeviations = (Object.keys(SKIN_COMPONENT_OPTIONS) as Array<keyof SkinComponents>).filter((key) => resolved.components[key] !== binding.components[key]);
  const change = (next: SkinSelection | null) => {
    clearPreview();
    const ownRevision = ++revision.current;
    draftRef.current = next; setDraft(next); setSaveFailed(false); pending.current += 1;
    // Dispatch synchronously: the note owner captures identity before navigation.
    const write = skin.save(next);
    void write.then(() => { if (mounted.current && ownRevision === revision.current) setSaveFailed(false); }, () => {
      if (mounted.current && ownRevision === revision.current) setSaveFailed(true);
    }).finally(() => { pending.current -= 1; });
    return write;
  };
  const selectionFor = (preset: SkinSelection['preset']): SkinSelection => {
    const next = { ...base, preset };
    // Switching bindings selects that binding's material while retaining color
    // and component deviations; a detached lineage must not stick to the next card.
    delete next.materialPreset;
    return next;
  };
  const hover = (preset: SkinSelection['preset']) => {
    clearPreview();
    previewTimer.current = setTimeout(() => { previewTimer.current = null; previewRef.current?.(selectionFor(preset)); }, 300);
  };
  const mutate = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setActionError(''); clearPreview();
    try { await action(); } catch { if (mounted.current) setActionError('套装未能更新，请重试。'); }
    finally { if (mounted.current) setBusy(false); }
  };
  const openMenu = (suite: SkinSuite, x: number, y: number, keyboard = false) => {
    clearPreview(); setMenu({ suite, x: Math.max(8, Math.min(x, window.innerWidth - 208)), y: Math.max(8, Math.min(y, window.innerHeight - 128)), keyboard });
  };
  return <div ref={contentRef} data-skin-float-content={noteId}>
    <div className={styles.binding}>
      <span className={styles.bindingName}>基于 <strong>{name}</strong></span>
      {deviations.length + componentDeviations.length > 0 && <><span className={styles.deviation}>{deviations.length + componentDeviations.length} 项偏差</span><button type="button" onClick={() => { void change({ preset: base.preset, ...(base.materialPreset ? { materialPreset: base.materialPreset } : {}) }).catch(() => undefined); }}>全部还原</button></>}
    </div>
    <section className={styles.section} aria-label="出厂外观">
      <div className={styles.presets} role="group" aria-label="外观预设快选">{SKIN_PRESET_IDS.map((preset) => <PresetCard key={preset} name={SKIN_LABELS[preset]} preset={preset} resolved={resolveSkin({ preset }, null, null, palette.values, suites.values)} selected={base.preset === preset}
        hover={() => hover(preset)} clearPreview={clearPreview} apply={() => { void change(selectionFor(preset)).catch(() => undefined); }} />)}</div>
    </section>
    <section className={styles.section} aria-label="Custom 套装">
      <h3>Custom</h3>
      {suites.loading && <p className={styles.hint} role="status">正在读取套装…</p>}
      {suites.error && <p className={styles.error} role="alert">{suites.error}<button type="button" onClick={() => void suites.refresh()}>重试</button></p>}
      {!suites.loading && !suites.error && !suites.suites.length && <p className={styles.hint}>调好后，存为自己的套装。</p>}
      <div className={styles.custom}>{suites.suites.map((suite) => <PresetCard key={suite.id} name={suite.name} preset={`suite:${suite.id}`} resolved={resolveSkin({ preset: `suite:${suite.id}` }, null, null, palette.values, suites.values)} selected={base.preset === `suite:${suite.id}`}
        hover={() => hover(`suite:${suite.id}`)} clearPreview={clearPreview} apply={() => { void change(selectionFor(`suite:${suite.id}`)).catch(() => undefined); }} menu={(x, y, keyboard) => openMenu(suite, x, y, keyboard)} />)}</div>
    </section>
    <section className={styles.section} aria-label="纸面颜色"><h3>颜色</h3>
      {paperTokens.map(([key, label]) => <div key={key} className={styles.token} data-skin-token={key}>
        <UnifiedColorPicker label={label} value={base.overrides?.[key] ?? resolved.tokens[key]} resolvedValue={resolved.tokens[key]} onChange={(color) => { void change({ ...base, overrides: { ...base.overrides, [key]: color } }).catch(() => undefined); }} />
        <div className={styles.tokenActions}>{deviations.some(([name]) => name === key) && <><span className={styles.deviation}>已偏离套装</span><button type="button" aria-label={`还原${label}到套装`} onClick={() => {
          const overrides = { ...base.overrides }; delete overrides[key]; void change({ ...base, overrides }).catch(() => undefined);
        }}>还原</button></>}</div>
      </div>)}
    </section>
    <section className={styles.section} aria-label="部件样式"><h3>部件</h3>
      {(Object.keys(SKIN_COMPONENT_OPTIONS) as Array<keyof SkinComponents>).map((key) => <div className={styles.component} key={key}>
        <span>{componentLabels[key]}</span><div className={styles.options} role="group" aria-label={componentLabels[key]}>{SKIN_COMPONENT_OPTIONS[key].map((option) => <button type="button" key={option} aria-pressed={resolved.components[key] === option} onClick={() => { void change({ ...base, components: { ...base.components, [key]: option } }).catch(() => undefined); }}>{optionLabels[option]}</button>)}</div>
        {componentDeviations.includes(key) && <div className={styles.tokenActions}><span className={styles.deviation}>已偏离套装</span><button type="button" aria-label={`还原${componentLabels[key]}到套装`} onClick={() => { const components = { ...base.components }; delete components[key]; void change({ ...base, components }).catch(() => undefined); }}>还原</button></div>}
      </div>)}
    </section>
    <button className={styles.save} type="button" disabled={busy || suites.loading || !!suites.error} onClick={() => { clearPreview(); createdForDialog.current = null; setDialog({ kind: 'save' }); }}>存为套装…</button>
    {(saveFailed || skin.saveError) && <p className={styles.error} role="alert">外观未保存。<button type="button" onClick={() => { void change(draftRef.current).catch(() => undefined); }}>重试保存</button></p>}
    {actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {menu && <SuiteMenu {...menu} close={() => setMenu(null)} rename={() => { setDialog({ kind: 'rename', suite: menu.suite }); setMenu(null); }} update={() => {
      const id = menu.suite.id; setMenu(null); void mutate(async () => { await suites.updateSuite(id, { tokens: resolved.tokens, components: resolved.components, materialPreset: resolved.materialPreset }); });
    }} remove={() => { const id = menu.suite.id; setMenu(null); void mutate(async () => { await suites.deleteSuite(id); }); }} />}
    {dialog && <SuiteDialog name={dialog.kind === 'rename' ? dialog.suite.name : ''} title={dialog.kind === 'rename' ? '重命名套装' : '存为套装'} resolved={resolved} busy={busy} error={actionError} cancel={() => { if (!busy) { setDialog(null); setActionError(''); } }} submit={(newName) => {
      void mutate(async () => {
        if (dialog.kind === 'rename') await suites.updateSuite(dialog.suite.id, { name: newName });
        else {
          let suite = createdForDialog.current;
          if (!suite) {
            suite = await suites.createSuite({ name: newName, tokens: resolved.tokens, components: resolved.components, materialPreset: resolved.materialPreset });
            createdForDialog.current = suite;
          } else if (suite.name !== newName) {
            suite = await suites.updateSuite(suite.id, { name: newName });
            createdForDialog.current = suite;
          }
          if (mounted.current) {
            await change({ preset: `suite:${suite.id}` });
            if (mounted.current) setRevealPreset(`suite:${suite.id}`);
          }
        }
        if (mounted.current) setDialog(null);
      });
    }} />}
  </div>;
}

function PresetCard({ name, preset, resolved, selected, hover, clearPreview, apply, menu }: {
  name: string; preset: SkinSelection['preset']; resolved: SampleSkin; selected: boolean;
  hover: () => void; clearPreview: () => void; apply: () => void; menu?: (x: number, y: number, keyboard?: boolean) => void;
}) {
  const touch = useRef<{ timer: ReturnType<typeof setTimeout>; menuTimer?: ReturnType<typeof setTimeout>; held: boolean; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const endTouch = () => {
    if (!touch.current) return;
    clearTimeout(touch.current.timer); clearTimeout(touch.current.menuTimer);
    suppressClick.current = touch.current.held; touch.current = null; clearPreview();
  };
  useEffect(() => () => { if (touch.current) { clearTimeout(touch.current.timer); clearTimeout(touch.current.menuTimer); } }, []);
  return <button type="button" className={styles.preset} data-appearance-preset={preset} aria-label={name} aria-pressed={selected} aria-haspopup={menu ? 'menu' : undefined}
    onMouseEnter={hover} onMouseLeave={clearPreview} onFocus={hover} onBlur={clearPreview}
    onContextMenu={(event) => { if (menu) { event.preventDefault(); menu(event.clientX, event.clientY); } }}
    onKeyDown={(event) => { if (menu && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); menu(rect.left, rect.bottom, true); } }}
    onPointerDown={(event) => {
      if (event.pointerType !== 'touch') return;
      suppressClick.current = false;
      hover();
      const gesture = { timer: setTimeout(() => { if (touch.current) touch.current.held = true; }, 300), held: false, x: event.clientX, y: event.clientY, menuTimer: undefined as ReturnType<typeof setTimeout> | undefined };
      if (menu) gesture.menuTimer = setTimeout(() => { gesture.held = true; menu(gesture.x, gesture.y); }, 650);
      touch.current = gesture;
    }} onPointerMove={(event) => { if (touch.current && Math.hypot(event.clientX - touch.current.x, event.clientY - touch.current.y) > 10) { touch.current.held = true; endTouch(); } }}
    onPointerUp={endTouch} onPointerCancel={() => { if (touch.current) touch.current.held = true; endTouch(); }}
    onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } apply(); }}>
    <SkinSample {...resolved} /><span className={styles.presetName}>{name}</span>
  </button>;
}

function SuiteMenu({ x, y, keyboard, close, rename, update, remove }: { suite: SkinSuite; x: number; y: number; keyboard: boolean; close: () => void; rename: () => void; update: () => void; remove: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (keyboard) ref.current?.querySelector('button')?.focus(); }, [keyboard]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !ref.current?.contains(event.target)) close(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key, true); };
  }, [close]);
  return createPortal(<div ref={ref} className={styles.menu} style={{ left: x, top: y }} role="menu" aria-label="套装操作" data-canvas-layer="floating-overlay" onKeyDown={(event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length]?.focus();
  }}><button role="menuitem" type="button" onClick={rename}>重命名</button><button role="menuitem" type="button" onClick={update}>更新套装为当前样子</button><button role="menuitem" type="button" onClick={remove}>删除套装</button></div>, document.body);
}

function SuiteDialog({ title, name: initialName, resolved, busy, error, cancel, submit }: {
  title: string; name: string; resolved: SampleSkin; busy: boolean; error: string; cancel: () => void; submit: (name: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initialName);
  useEffect(() => { ref.current?.showModal(); }, []);
  const onSubmit = (event: FormEvent) => { event.preventDefault(); if (name.trim() && !busy) submit(name.trim()); };
  return createPortal(<dialog ref={ref} className={styles.dialog} aria-label={title} data-skin-suite-dialog data-canvas-layer="floating-overlay" onCancel={(event) => { event.preventDefault(); cancel(); }}>
    <form onSubmit={onSubmit}><h2>{title}</h2><label>名字<input autoFocus aria-label="套装名字" value={name} maxLength={64} required disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
      <SkinSample {...resolved} />{error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.dialogActions}><button type="button" disabled={busy} onClick={cancel}>取消</button><button type="submit" disabled={busy || !name.trim()}>{busy ? '正在保存…' : '保存'}</button></div>
    </form>
  </dialog>, document.body);
}
