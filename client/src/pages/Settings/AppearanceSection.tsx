import { useRef, useState } from 'react';
import type { SkinSelection } from '@shared/types';
import { SkinControls } from '@/components/Skin/SkinControls';
import { useAuthStore } from '@/stores/authStore';
import { readSkin } from '@/styles/skinPresets';
import styles from './Settings.module.css';

export default function AppearanceSection() {
  const skin = useAuthStore((s) => s.user?.settings.skin);
  const updateSettings = useAuthStore((s) => s.updateSettings);
  const pending = useRef(Promise.resolve());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const save = (next: SkinSelection | null) => {
    setSaving(true);
    setFailed(false);
    const write = pending.current.then(() => updateSettings({ skin: next }));
    pending.current = write.catch(() => undefined);
    void write.catch(() => setFailed(true)).finally(() => setSaving(false));
  };
  return <section className={styles.section} aria-label="默认外观">
    <SkinControls value={readSkin(skin)} onChange={save} advanced={false} surface="all"
      presetLabel="默认外观" showComponents={false} disabled={saving} />
    {failed && <p role="alert" className={styles.memoryError}>外观未保存，请重新选择。</p>}
  </section>;
}
