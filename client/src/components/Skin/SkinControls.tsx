import { useEffect, useId, useState } from 'react';
import { SKIN_PRESET_IDS, SKIN_TOKEN_NAMES, type SkinSelection, type SkinTokenName } from '@shared/types';
import { SKIN_LABELS, resolveSkin } from '@/styles/skinPresets';
import styles from './SkinControls.module.css';

const labels: Record<SkinTokenName, string> = { desk: '桌面', paper: '纸面', ink: '正文', 'ink-muted': '弱字', accent: '强调', annotation: '批注', hairline: '分隔线', danger: '危险操作', wall: '页边距墙' };

export function SkinControls({ value, onChange, inheritLabel, advanced = false, disabled = false }: {
  value: SkinSelection | null; onChange: (value: SkinSelection | null) => void;
  inheritLabel?: string; advanced?: boolean; disabled?: boolean;
}) {
  const id = useId();
  const { tokens } = resolveSkin(value);
  return <div className={styles.controls} data-skin-controls>
    <label className={styles.row} htmlFor={id}>
      <span>纸面预设</span>
      <select id={id} aria-label="纸面预设" value={value?.preset || (inheritLabel ? '' : 'default')} disabled={disabled}
        onChange={(event) => onChange(event.target.value ? { preset: event.target.value as SkinSelection['preset'] } : null)}>
        {inheritLabel && <option value="">{inheritLabel}</option>}
        {SKIN_PRESET_IDS.map((preset) => <option key={preset} value={preset}>{SKIN_LABELS[preset]}</option>)}
      </select>
    </label>
    {inheritLabel && value && <button type="button" className={styles.clear} disabled={disabled} onClick={() => onChange(null)}>清除覆写</button>}
    {advanced && <details className={styles.advanced}>
      <summary>高级颜色</summary>
      {SKIN_TOKEN_NAMES.map((key) => <ColorField key={`${value?.preset}:${key}`} name={key} value={tokens[key]} disabled={disabled}
        overridden={!!value?.overrides?.[key]} onChange={(color) => {
          const overrides = { ...value?.overrides };
          if (color === null) delete overrides[key]; else overrides[key] = color;
          onChange({ preset: value?.preset || 'default', ...(Object.keys(overrides).length ? { overrides } : {}) });
        }} />)}
    </details>}
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
