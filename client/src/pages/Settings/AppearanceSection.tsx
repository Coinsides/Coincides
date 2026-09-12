import { SkinEditor } from '@/components/Skin/SkinEditor';
import { useAuthStore } from '@/stores/authStore';
import { readSkin } from '@/styles/skinPresets';
import styles from './Settings.module.css';

export default function AppearanceSection() {
  const skin = useAuthStore((s) => s.user?.settings.skin);
  const updateSettings = useAuthStore((s) => s.updateSettings);
  const pending = useRef(Promise.resolve());
  const save = (next: SkinSelection | null) => {
    const write = pending.current.then(() => updateSettings({ skin: next }));
    pending.current = write.catch(() => undefined);
    return write;
  };
  return <section className={styles.section} aria-label="纸面外观">
    <h2 className={styles.sectionTitle}>纸面外观</h2>
    <p>预设与部件样式用于纸和板；项目、单张纸和单板可以分别覆写。</p>
    <SkinEditor value={readSkin(skin)} save={save} advanced preview surface="all" />
  </section>;
}
import { useRef } from 'react';
import type { SkinSelection } from '@shared/types';
