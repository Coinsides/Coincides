import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import styles from './PaperSizeControls.module.css';

export interface PaperSizeControlsProps {
  presets: readonly { value: string; label: string }[];
  selectedPreset: string;
  /** Notebook default dimensions; conversion from stored geometry belongs to the owner. */
  widthMm: number;
  heightMm: number;
  onPresetChange: (value: string) => void | Promise<void>;
  layoutMode: boolean;
  page?: { id: string; label?: string; widthMm: number; heightMm: number; isOverride: boolean };
  onResize: (widthMm: number, heightMm: number) => void | Promise<void>;
  onRestore: () => void | Promise<void>;
  disabled?: boolean;
  isWebLongPage?: boolean;
}

type PhysicalUnit = 'cm' | 'mm';
const formatDimension = (millimetres: number, unit: PhysicalUnit) =>
  Number((millimetres / (unit === 'cm' ? 10 : 1)).toFixed(unit === 'cm' ? 4 : 3)).toString();
const readMillimetres = (value: string, unit: PhysicalUnit) => Number(value) * (unit === 'cm' ? 10 : 1);

/** UI only: the note owner applies preset changes and selected-page overrides through history. */
export function PaperSizeControls({
  presets, selectedPreset, widthMm, heightMm, onPresetChange, layoutMode, page,
  onResize, onRestore, disabled = false, isWebLongPage = false,
}: PaperSizeControlsProps) {
  const [unit, setUnit] = useState<PhysicalUnit>('cm');
  const [width, setWidth] = useState(() => formatDimension(page?.widthMm ?? widthMm, unit));
  const [height, setHeight] = useState(() => formatDimension(page?.heightMm ?? heightMm, unit));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const committedSize = useRef({ widthMm: page?.widthMm ?? widthMm, heightMm: page?.heightMm ?? heightMm });
  const currentPageId = useRef(page?.id);
  currentPageId.current = page?.id;
  const web = isWebLongPage || selectedPreset === 'screen_note';
  const unitLabel = unit === 'cm' ? '厘米' : '毫米';
  const paperPresets = presets.filter((preset) => preset.value !== 'screen_note');

  useEffect(() => {
    const nextWidth = page?.widthMm ?? widthMm;
    const nextHeight = page?.heightMm ?? heightMm;
    setWidth(formatDimension(nextWidth, unit));
    setHeight(formatDimension(nextHeight, unit));
    committedSize.current = { widthMm: nextWidth, heightMm: nextHeight };
    setError('');
  }, [page?.id, page?.widthMm, page?.heightMm, widthMm, heightMm, unit, layoutMode]);

  const runChange = async (change: () => void | Promise<void>, failure: string) => {
    if (disabled || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const pageId = currentPageId.current;
    try {
      await change();
    } catch {
      if (currentPageId.current === pageId) setError(failure);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const commitSize = () => {
    if (!layoutMode || !page || web || disabled || pending.current) return;
    const nextWidth = readMillimetres(width, unit);
    const nextHeight = readMillimetres(height, unit);
    if (!width.trim() || !height.trim() || !Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) {
      setError('请输入大于 0 的宽度和高度。');
      return;
    }
    const previous = committedSize.current;
    if (Math.abs(previous.widthMm - nextWidth) < 0.001 && Math.abs(previous.heightMm - nextHeight) < 0.001) return;
    const pageId = page.id;
    void runChange(async () => {
      await onResize(nextWidth, nextHeight);
      if (currentPageId.current === pageId) committedSize.current = { widthMm: nextWidth, heightMm: nextHeight };
    }, '页面尺寸未能保存，请重试。');
  };

  const sizeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      commitSize();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setWidth(formatDimension(page?.widthMm ?? widthMm, unit));
      setHeight(formatDimension(page?.heightMm ?? heightMm, unit));
      setError('');
    }
  };

  return <section className={styles.section} aria-label="纸型" data-paper-size-controls>
    <div className={styles.heading}>
      <h3>纸型</h3>
      {!web && <label className={styles.unit}>
        <span className={styles.unitLabel}>单位</span>
        <select aria-label="纸张尺寸单位" value={unit} disabled={disabled || busy} onChange={(event) => setUnit(event.target.value as PhysicalUnit)}>
          <option value="cm">厘米 cm</option><option value="mm">毫米 mm</option>
        </select>
      </label>}
    </div>
    {web ? <p className={styles.hint} role="status">Web 长页随内容生长。</p> : <>
      <label className={styles.preset}>
        <span>整本纸型</span>
        <select aria-label="整本纸型" value={selectedPreset} disabled={disabled || busy} onChange={(event) => {
          const value = event.target.value;
          if (value !== selectedPreset) void runChange(() => onPresetChange(value), '纸型未能保存，请重试。');
        }}>
          {!paperPresets.some((preset) => preset.value === selectedPreset) && <option value={selectedPreset} disabled>自定义纸型</option>}
          {paperPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
        </select>
      </label>
      <p className={styles.readout} aria-label="笔记默认尺寸">{formatDimension(widthMm, unit)} × {formatDimension(heightMm, unit)} {unit}<span>宽 × 高 · 整本默认</span></p>
      {layoutMode && page ? <div className={styles.page} data-paper-size-page={page.id}>
        <div className={styles.pageHeading}><strong>{page.label ?? '当前页'}</strong><span>{page.isOverride ? '异形尺寸' : '默认尺寸'}</span></div>
        <div className={styles.dimensions}>
          <label><span>宽度（{unit}）</span><input type="number" inputMode="decimal" min="0" step="any" aria-label={`当前页宽度（${unitLabel}）`} value={width} disabled={disabled || busy} onChange={(event) => { setWidth(event.target.value); setError(''); }} onBlur={commitSize} onKeyDown={sizeKeyDown} /></label>
          <label><span>高度（{unit}）</span><input type="number" inputMode="decimal" min="0" step="any" aria-label={`当前页高度（${unitLabel}）`} value={height} disabled={disabled || busy} onChange={(event) => { setHeight(event.target.value); setError(''); }} onBlur={commitSize} onKeyDown={sizeKeyDown} /></label>
        </div>
        <div className={styles.pageActions}><span className={styles.hint}>仅调整这一页</span><button type="button" disabled={disabled || busy || !page.isOverride} onClick={() => { void runChange(onRestore, '页面默认尺寸未能恢复，请重试。'); }}>恢复默认</button></div>
      </div> : <p className={styles.hint}>{layoutMode ? '在纸上选中要调整的页面。' : '进入 Layout 可逐页调整尺寸。'}</p>}
      {busy && <p className={styles.hint} role="status">正在更新纸张…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </>}
  </section>;
}
