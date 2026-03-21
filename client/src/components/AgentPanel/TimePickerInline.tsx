import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import styles from './TimePickerInline.module.css';

interface TimePickerInlineProps {
  value: string;            // "HH:MM" or ""
  onChange: (time: string) => void;
  placeholder?: string;
  label?: string;
}

/**
 * Inline time picker — click to open HH:MM editor.
 * Displays as a compact badge when collapsed.
 */
export default function TimePickerInline({
  value,
  onChange,
  placeholder = '--:--',
  label,
}: TimePickerInlineProps) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);

  // Sync local state from prop
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHours(h);
      setMinutes(m);
    } else {
      setHours('');
      setMinutes('');
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!editing) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitAndClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editing, hours, minutes]);

  const commitAndClose = useCallback(() => {
    if (hours && minutes) {
      const h = Math.min(23, Math.max(0, parseInt(hours, 10)));
      const m = Math.min(59, Math.max(0, parseInt(minutes, 10)));
      onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    setEditing(false);
  }, [hours, minutes, onChange]);

  const openEditor = () => {
    setEditing(true);
    setTimeout(() => hourRef.current?.focus(), 0);
  };

  const handleHourChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setHours(clean);
    // Auto-advance to minutes when 2 digits entered
    if (clean.length === 2) {
      const nextSibling = hourRef.current?.nextElementSibling?.nextElementSibling as HTMLInputElement;
      nextSibling?.focus();
    }
  };

  const handleMinuteChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setMinutes(clean);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitAndClose();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  const display = value || placeholder;

  return (
    <div ref={containerRef} className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}

      {!editing ? (
        <button
          className={`${styles.badge} ${value ? styles.badgeSet : styles.badgeEmpty}`}
          onClick={openEditor}
          type="button"
        >
          <Clock size={11} />
          <span>{display}</span>
        </button>
      ) : (
        <div className={styles.editor} onKeyDown={handleKeyDown}>
          <input
            ref={hourRef}
            className={styles.timeInput}
            type="text"
            inputMode="numeric"
            value={hours}
            onChange={(e) => handleHourChange(e.target.value)}
            placeholder="HH"
            maxLength={2}
          />
          <span className={styles.colon}>:</span>
          <input
            className={styles.timeInput}
            type="text"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => handleMinuteChange(e.target.value)}
            placeholder="MM"
            maxLength={2}
          />
          <button className={styles.confirmBtn} onClick={commitAndClose} type="button">
            ✓
          </button>
        </div>
      )}
    </div>
  );
}
