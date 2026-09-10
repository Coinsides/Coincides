import { useLayoutEffect, useState } from 'react';
import { measureTextareaSelection, type TextareaSelectionRect } from '../textareaNavigation';
import styles from './TextFlowSelectionLayer.module.css';

interface Props {
  textarea: HTMLTextAreaElement | null;
  start: number;
  end: number;
  includeBreak?: boolean;
}

/** Mount beside the textarea inside its positioned wrapper. */
export function TextFlowSelectionLayer({ textarea, start, end, includeBreak = false }: Props) {
  const [rectangles, setRectangles] = useState<TextareaSelectionRect[]>([]);
  const [frame, setFrame] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!textarea) {
      setRectangles([]);
      return;
    }
    const measure = () => {
      setRectangles(measureTextareaSelection(textarea, start, end, includeBreak));
      setFrame({ left: textarea.offsetLeft, top: textarea.offsetTop, width: textarea.offsetWidth, height: textarea.offsetHeight });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(textarea);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    textarea.addEventListener('input', measure);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      textarea.removeEventListener('input', measure);
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [textarea, start, end, includeBreak]);

  if (!textarea) return null;
  return (
    <div className={styles.layer} style={frame} aria-hidden="true" data-textflow-selection-layer="true">
      {rectangles.map((rectangle, index) => (
        <span key={index} className={styles.rectangle} style={rectangle} />
      ))}
    </div>
  );
}
