import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import styles from './ShortcutsPanel.module.css';

const shortcuts = [
  { keys: 'Ctrl+J', label: 'Open AI Agent' },
  { keys: 'Ctrl+T', label: 'New Task' },
  { keys: 'Ctrl+K', label: 'New Card' },
  { keys: '?', label: 'Show this panel' },
];

export default function ShortcutsPanel() {
  const open = useUIStore((s) => s.shortcutsPanelOpen);
  const toggle = useUIStore((s) => s.toggleShortcutsPanel);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, toggle]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={toggle}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Keyboard Shortcuts</div>
        {shortcuts.map((s) => (
          <div key={s.keys} className={styles.row}>
            <span className={styles.label}>{s.label}</span>
            <span className={styles.keys}>{s.keys}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
