import {
  Check,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import styles from '../../NoteDetail.module.css';

interface InlineNamePromptLayerProps {
  prompt: {
    point: { x: number; y: number };
    title: string;
    initialValue: string;
    confirmLabel?: string;
  } | null;
  onCancel: () => void;
  onCommit: (value: string) => void | Promise<void>;
}

function clampPromptPosition(point: { x: number; y: number }) {
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  return {
    left: Math.min(viewportWidth - 276, Math.max(12, point.x)),
    top: Math.min(viewportHeight - 118, Math.max(12, point.y)),
  };
}

export function InlineNamePromptLayer({
  prompt,
  onCancel,
  onCommit,
}: InlineNamePromptLayerProps) {
  const [draft, setDraft] = useState('');
  const position = useMemo(() => (
    prompt ? clampPromptPosition(prompt.point) : { left: 0, top: 0 }
  ), [prompt]);

  useEffect(() => {
    if (!prompt) return undefined;
    setDraft(prompt.initialValue);
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, prompt]);

  if (!prompt) return null;

  const label = draft.trim();
  const commit = () => {
    if (!label) return;
    void onCommit(label);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    commit();
  };

  return (
    <div
      className={styles.inlineNamePrompt}
      data-inline-name-prompt="true"
      role="dialog"
      aria-label={prompt.title}
      style={{ left: position.left, top: position.top }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className={styles.inlineNamePromptTitle}>{prompt.title}</div>
      <input
        className={styles.inlineNamePromptInput}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-label={prompt.title}
      />
      <div className={styles.inlineNamePromptActions}>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
          <X size={13} />
          Cancel
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={commit} disabled={!label}>
          <Check size={13} />
          {prompt.confirmLabel || 'Save'}
        </button>
      </div>
    </div>
  );
}
