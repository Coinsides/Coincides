import { useEffect, useId, useState } from 'react';
import { SKIN_COMPONENT_OPTIONS, SKIN_PRESET_IDS, SKIN_TOKEN_NAMES, type SkinComponents, type SkinSelection, type SkinTokenName } from '@shared/types';
import { SKIN_LABELS, resolveSkin } from '@/styles/skinPresets';
import styles from './SkinControls.module.css';

const labels: Record<SkinTokenName, string> = { desk: '桌面', paper: '纸面', ink: '正文', 'ink-muted': '弱字', accent: '强调', annotation: '批注', hairline: '分隔线', danger: '危险操作', wall: '页边距墙', 'board-desk': '板台面', card: '板卡面', edge: '连线', chalk: '粉笔' };
const componentLabels: Record<keyof SkinComponents, string> = { titleFont: '标题字', labelFont: '标签与刻度字', menuDensity: '菜单密度', handleStyle: '把手样式' };
const optionLabels: Record<string, string> = { sans: '无衬线', serif: '衬线', system: '系统', mono: '等宽', comfortable: '舒适', compact: '紧凑', capsule: '胶囊', rivet: '铆钉' };

export function SkinControls({ value, onChange, inheritLabel, inheritedValue, advanced = false, disabled = false, surface = 'paper' }: {
  value: SkinSelection | null; onChange: (value: SkinSelection | null) => void;
  inheritLabel?: string; advanced?: boolean; disabled?: boolean;
  surface?: 'paper' | 'board' | 'all';
  inheritedValue?: SkinSelection | null;
}) {
  const id = useId();
  const base = value ?? inheritedValue ?? { preset: 'default' as const };
  const { tokens, components } = resolveSkin(base);
  const presetLabel = surface === 'board' ? '板面预设' : '纸面预设';
  const tokenNames = SKIN_TOKEN_NAMES.filter((key) => surface === 'all' || (surface === 'board'
    ? !['desk', 'paper', 'wall'].includes(key) : !['board-desk', 'card', 'edge', 'chalk'].includes(key)));
  return <div className={styles.controls} data-skin-controls>
    <label className={styles.row} htmlFor={id}>
      <span>{presetLabel}</span>
      <select id={id} aria-label={presetLabel} value={value?.preset || (inheritLabel ? '' : 'default')} disabled={disabled}
        onChange={(event) => onChange(event.target.value ? { preset: event.target.value as SkinSelection['preset'] } : null)}>
        {inheritLabel && <option value="">{inheritLabel}</option>}
        {SKIN_PRESET_IDS.map((preset) => <option key={preset} value={preset}>{SKIN_LABELS[preset]}</option>)}
      </select>
    </label>
    {inheritLabel && value && <button type="button" className={styles.clear} disabled={disabled} onClick={() => onChange(null)}>清除覆写</button>}
    {advanced && <details className={styles.advanced}>
      <summary>高级颜色</summary>
      {tokenNames.map((key) => <ColorField key={`${value?.preset}:${key}`} name={key} value={tokens[key]} disabled={disabled}
        overridden={!!value?.overrides?.[key]} onChange={(color) => {
          const overrides = { ...base.overrides };
          if (color === null) delete overrides[key]; else overrides[key] = color;
          onChange({ ...base, overrides });
        }} />)}
    </details>}
    <details className={styles.advanced}>
      <summary>部件样式</summary>
      {(Object.keys(SKIN_COMPONENT_OPTIONS) as Array<keyof SkinComponents>).map((key) => <div className={styles.row} key={key}>
        <label htmlFor={`${id}-${key}`}>{componentLabels[key]}</label>
        <select id={`${id}-${key}`} value={components[key]} disabled={disabled} onChange={(event) => onChange({
          ...base, components: { ...base.components, [key]: event.target.value },
        })}>
          {SKIN_COMPONENT_OPTIONS[key].map((option) => <option key={option} value={option}>{optionLabels[option]}</option>)}
        </select>
        <button type="button" disabled={disabled || !value?.components?.[key]} onClick={() => {
          const next = { ...base.components }; delete next[key];
          onChange({ ...base, components: next });
        }}>重置</button>
      </div>)}
    </details>
  </div>;
}

function ColorField({ name, value, disabled, overridden, onChange }: { name: SkinTokenName; value: string; disabled: boolean; overridden: boolean; onChange: (color: string | null) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const valid = /^#[\da-f]{6}([\da-f]{2})?$/i.test(draft);
  return <div className={styles.row}>
    <label htmlFor={id}>{labels[name]}</label>
    <input id={id} type="text" aria-label={labels[name]} spellCheck={false} value={draft}
      aria-invalid={!valid} maxLength={9} disabled={disabled} onChange={(event) => {
        const next = event.target.value; setDraft(next);
        if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(next)) onChange(next);
      }} onBlur={() => { if (!valid) setDraft(value); }} />
    <button type="button" disabled={disabled || !overridden} onClick={() => onChange(null)}>重置</button>
  </div>;
}
