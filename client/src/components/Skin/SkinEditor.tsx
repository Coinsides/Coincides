import { useEffect, useRef, useState } from 'react';
import type { SkinSelection } from '@shared/types/skin';
import { SkinControls } from './SkinControls';
import { resolveSkin } from '@/styles/skinPresets';
import styles from './SkinControls.module.css';

/** Dispatch immediately so the owner can bind and track each intent before navigation. */
export function SkinEditor({ value, save, inheritLabel, advanced, preview = false, failed = false }: {
  value: SkinSelection | null; save: (skin: SkinSelection | null) => Promise<void>;
  inheritLabel?: string; advanced?: boolean; preview?: boolean; failed?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  const pending = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!pending.current && !error && !failed) setDraft(value); }, [value, error, failed]);
  const change = (next: SkinSelection | null) => {
    setDraft(next); setError(false); pending.current += 1;
    void save(next).then(() => {
      if (mounted.current) setError(false);
    }, () => { if (mounted.current) setError(true); }).finally(() => { pending.current -= 1; });
  };
  const { tokens } = resolveSkin(draft);
  return <>
    <SkinControls value={draft} onChange={change} inheritLabel={inheritLabel} advanced={advanced} />
    {preview && <div className={styles.preview} aria-label="纸面颜色预览" style={{ background: tokens.paper, color: tokens.ink }}>
      <strong>纸面预览</strong>
      <p style={{ color: tokens['ink-muted'] }}>正文、弱字与强调色随选择更新。</p>
      <span style={{ color: tokens.accent }}>强调文字</span>
    </div>}
    {(error || failed) && <p role="alert" className={styles.error}>外观未保存。<button type="button" onClick={() => change(draft)}>重试保存</button></p>}
  </>;
}
