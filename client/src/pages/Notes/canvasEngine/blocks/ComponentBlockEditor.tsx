import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CHART_MAX_POINTS, CHART_MAX_SERIES, TIMELINE_MAX_ENTRIES, cloneComponentBlockPayload,
  componentBlockValidationError, type ChartComponentParams, type ComponentBlockPayload,
  type TimelineComponentParams,
} from '../componentBlockService';
import styles from './ComponentBlockEditor.module.css';

export interface ComponentBlockEditorProps {
  initialPayload: ComponentBlockPayload;
  onSave: (payload: ComponentBlockPayload) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}

/** As in B1, the dialog owns one local draft; only Save crosses the history boundary. */
export function ComponentBlockEditor({ initialPayload, onSave, onCancel, busy = false, error }: ComponentBlockEditorProps) {
  const [draft, setDraft] = useState(() => cloneComponentBlockPayload(initialPayload));
  // Keep incomplete numeric keystrokes (for example '-' or '1e') in the local draft UI.
  const [numberInputs, setNumberInputs] = useState<string[][]>(() =>
    initialPayload.component_kind === 'chart_bar' || initialPayload.component_kind === 'chart_line'
      ? (initialPayload.params as ChartComponentParams).series.map((series) => series.values.map(String)) : []);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  const titleId = useId();
  const hintId = useId();
  const blocked = busy || saving;
  const timeline = draft.component_kind === 'timeline' ? draft.params as TimelineComponentParams : null;
  const chart = draft.component_kind === 'chart_bar' || draft.component_kind === 'chart_line' ? draft.params as ChartComponentParams : null;
  const validationError = componentBlockValidationError(draft);
  const supported = !!timeline || !!chart;
  const save = async () => {
    if (blocked || savingRef.current || validationError || !supported) return;
    savingRef.current = true; setSaving(true); setLocalError(null);
    try { await onSave(cloneComponentBlockPayload(draft)); }
    catch (saveError) { setLocalError(saveError instanceof Error ? saveError.message : 'Component could not be saved. Try again.'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const callbacks = useRef({ blocked, onCancel, save });
  callbacks.current = { blocked, onCancel, save };
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLElement>('textarea, input, button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!callbacks.current.blocked) callbacks.current.onCancel();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); event.stopPropagation(); void callbacks.current.save();
      } else if (event.key === 'Tab') {
        const targets = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []);
        const first = targets[0]; const last = targets[targets.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement as HTMLElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !targets.includes(document.activeElement as HTMLElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const updateTimeline = (change: (params: TimelineComponentParams) => void) => {
    const next = cloneComponentBlockPayload(draft); change(next.params as TimelineComponentParams);
    setLocalError(null); setDraft(next);
  };
  const updateChart = (change: (params: ChartComponentParams) => void) => {
    const next = cloneComponentBlockPayload(draft); change(next.params as ChartComponentParams);
    setLocalError(null); setDraft(next);
  };
  const moveEntry = (index: number, direction: -1 | 1) => updateTimeline((params) => {
    const [entry] = params.entries.splice(index, 1); params.entries.splice(index + direction, 0, entry);
  });
  return createPortal(<div className={styles.overlay} onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}>
    <section className={styles.dialog} ref={dialog} role="dialog" aria-modal="true" tabIndex={-1}
      aria-labelledby={titleId} aria-describedby={hintId} aria-busy={blocked}>
      <header className={styles.header}>
        <h2 id={titleId}>{timeline ? 'Edit timeline' : chart ? 'Edit chart' : 'Unregistered component'}</h2>
        <p id={hintId}>Changes stay in this draft until saved. Ctrl+Enter saves; Esc cancels.</p>
      </header>
      <div className={styles.body}>
        {timeline && <>
          <label className={styles.field}>Title<textarea aria-label="Timeline title" rows={2} value={timeline.title ?? ''} disabled={blocked}
            onChange={(event) => updateTimeline((params) => { params.title = event.target.value; })} /></label>
          <div className={styles.toolbar}>
            <button type="button" disabled={blocked || timeline.entries.length >= TIMELINE_MAX_ENTRIES}
              onClick={() => updateTimeline((params) => { params.entries.push({ year: '', label: '' }); })}>Add entry</button>
            <span>{timeline.entries.length} / {TIMELINE_MAX_ENTRIES} entries</span>
          </div>
          <ol className={styles.entries}>{timeline.entries.map((entry, index) => <li key={index}>
            <div className={styles.entryHeading}><strong>Entry {index + 1}</strong><div className={styles.actions}>
              <button type="button" aria-label={`Move entry ${index + 1} up`} disabled={blocked || index === 0} onClick={() => moveEntry(index, -1)}>Move up</button>
              <button type="button" aria-label={`Move entry ${index + 1} down`} disabled={blocked || index === timeline.entries.length - 1} onClick={() => moveEntry(index, 1)}>Move down</button>
              <button type="button" aria-label={`Delete entry ${index + 1}`} disabled={blocked || timeline.entries.length === 1}
                onClick={() => updateTimeline((params) => { params.entries.splice(index, 1); })}>Delete</button>
            </div></div>
            <div className={styles.entryFields}>
              <label className={styles.field}>Year<input aria-label={`Entry ${index + 1} year`} value={entry.year} disabled={blocked}
                onChange={(event) => updateTimeline((params) => { params.entries[index].year = event.target.value; })} /></label>
              <label className={styles.field}>Label<textarea aria-label={`Entry ${index + 1} label`} rows={2} value={entry.label} disabled={blocked}
                onChange={(event) => updateTimeline((params) => { params.entries[index].label = event.target.value; })} /></label>
              <label className={`${styles.field} ${styles.detail}`}>Detail<textarea aria-label={`Entry ${index + 1} detail`} rows={2} value={entry.detail ?? ''} disabled={blocked}
                onChange={(event) => updateTimeline((params) => { params.entries[index].detail = event.target.value; })} /></label>
            </div>
          </li>)}</ol>
        </>}
        {chart && <>
          <div className={styles.chartFields}>
            <label className={styles.field}>Title<textarea aria-label="Chart title" rows={2} value={chart.title ?? ''} disabled={blocked}
              onChange={(event) => updateChart((params) => { params.title = event.target.value; })} /></label>
            <label className={styles.field}>Y-axis label<textarea aria-label="Chart y-axis label" rows={2} value={chart.y_label ?? ''} disabled={blocked}
              onChange={(event) => updateChart((params) => { params.y_label = event.target.value; })} /></label>
          </div>
          <div className={styles.toolbar}>
            <button type="button" disabled={blocked || chart.x_labels.length >= CHART_MAX_POINTS} onClick={() => { updateChart((params) => {
              params.x_labels.push(''); params.series.forEach((series) => series.values.push(0));
            }); setNumberInputs((rows) => rows.map((row) => [...row, '0'])); }}>Add column</button>
            <button type="button" disabled={blocked || chart.series.length >= CHART_MAX_SERIES} onClick={() => { updateChart((params) => {
              params.series.push({ name: '', values: Array<number>(params.x_labels.length).fill(0) });
            }); setNumberInputs((rows) => [...rows, Array<string>(chart.x_labels.length).fill('0')]); }}>Add series</button>
            <span>{chart.x_labels.length} / {CHART_MAX_POINTS} columns · {chart.series.length} / {CHART_MAX_SERIES} series</span>
          </div>
          <div className={styles.grid}><table aria-label="Chart data"><thead><tr>
            <th scope="col">Series / X label</th>
            {chart.x_labels.map((label, column) => <th scope="col" key={column}>
              <textarea aria-label={`X label ${column + 1}`} rows={2} value={label} disabled={blocked}
                onChange={(event) => updateChart((params) => { params.x_labels[column] = event.target.value; })} />
              <button type="button" aria-label={`Delete column ${column + 1}`} disabled={blocked || chart.x_labels.length === 1}
                onClick={() => { updateChart((params) => { params.x_labels.splice(column, 1); params.series.forEach((series) => series.values.splice(column, 1)); });
                  setNumberInputs((rows) => rows.map((row) => row.filter((_, index) => index !== column))); }}>Delete column</button>
            </th>)}<th scope="col">Series</th>
          </tr></thead><tbody>{chart.series.map((series, seriesIndex) => <tr key={seriesIndex}>
            <th scope="row"><textarea aria-label={`Series ${seriesIndex + 1} name`} rows={2} value={series.name} disabled={blocked}
              onChange={(event) => updateChart((params) => { params.series[seriesIndex].name = event.target.value; })} /></th>
            {series.values.map((_, column) => <td key={column}>
              <input type="text" inputMode="decimal" aria-label={`Series ${seriesIndex + 1}, column ${column + 1}`} disabled={blocked}
                value={numberInputs[seriesIndex][column]} onChange={(event) => {
                  const text = event.target.value;
                  setNumberInputs((rows) => rows.map((row, rowIndex) => rowIndex === seriesIndex
                    ? row.map((cell, columnIndex) => columnIndex === column ? text : cell) : row));
                  updateChart((params) => {
                    params.series[seriesIndex].values[column] = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()) ? Number(text) : Number.NaN;
                  });
                }} />
            </td>)}<td><button type="button" aria-label={`Delete series ${seriesIndex + 1}`} disabled={blocked || chart.series.length === 1}
              onClick={() => { updateChart((params) => { params.series.splice(seriesIndex, 1); });
                setNumberInputs((rows) => rows.filter((_, index) => index !== seriesIndex)); }}>Delete series</button></td>
          </tr>)}</tbody></table></div>
        </>}
        {!supported && <p role="status">{draft.component_kind} · 未注册组件</p>}
        {(localError || validationError || error) && <p role="alert" className={styles.error}>{localError || validationError || error}</p>}
      </div>
      <footer className={styles.footer}>
        <button type="button" disabled={blocked} onClick={onCancel}>Cancel</button>
        {supported && <button type="button" className={styles.save} disabled={blocked || !!validationError} onClick={() => void save()}>
          {blocked ? 'Saving…' : timeline ? 'Save timeline' : 'Save chart'}
        </button>}
      </footer>
    </section>
  </div>, document.body);
}
