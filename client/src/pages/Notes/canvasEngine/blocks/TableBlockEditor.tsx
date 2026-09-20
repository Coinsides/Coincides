import { useEffect, useId, useRef, useState, type ClipboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  TABLE_MAX_COLUMNS, TABLE_MAX_ROWS, cloneTableBlockPayload, isTableDelimitedPaste,
  parseTableDelimitedText, tableBlockValidationError, type TableBlockPayload,
} from '../tableBlockService';
import styles from './TableBlockEditor.module.css';

export interface TableBlockEditorProps {
  initialPayload: TableBlockPayload;
  onSave: (payload: TableBlockPayload) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}

/** One local draft per mounted dialog; only Save crosses the caller's undo boundary. */
export function TableBlockEditor({ initialPayload, onSave, onCancel, busy = false, error }: TableBlockEditorProps) {
  const [draft, setDraft] = useState(() => cloneTableBlockPayload(initialPayload));
  const [importText, setImportText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  const titleId = useId();
  const hintId = useId();
  const blocked = busy || saving;
  const validationError = tableBlockValidationError(draft);
  const columns = draft.headers.length || draft.rows[0]?.length || 1;

  const save = async () => {
    if (blocked || savingRef.current || validationError) return;
    savingRef.current = true;
    setSaving(true);
    setLocalError(null);
    try { await onSave(cloneTableBlockPayload(draft)); }
    catch (saveError) { setLocalError(saveError instanceof Error ? saveError.message : 'Table could not be saved. Try again.'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const callbacks = useRef({ blocked, onCancel, save });
  callbacks.current = { blocked, onCancel, save };
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLElement>('textarea')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!callbacks.current.blocked) callbacks.current.onCancel();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); event.stopPropagation();
        void callbacks.current.save();
      } else if (event.key === 'Tab') {
        const targets = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
        ) ?? []).filter((element) => element.tagName === 'SUMMARY' || !element.closest('details:not([open])'));
        const first = targets[0];
        const last = targets[targets.length - 1];
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

  const update = (next: TableBlockPayload) => { setLocalError(null); setDraft(next); };
  const updateCell = (row: number, column: number, value: string) => {
    const next = cloneTableBlockPayload(draft);
    if (row === -1) next.headers[column] = value;
    else next.rows[row][column] = value;
    update(next);
  };
  const toggleHeaders = () => {
    if (draft.headers.length) {
      if (draft.rows.length >= TABLE_MAX_ROWS) {
        setLocalError('Remove a data row before turning off the header; the maximum is 64 data rows.');
        return;
      }
      update({ ...draft, headers: [], rows: [[...draft.headers], ...draft.rows] });
    } else update({ ...draft, headers: [...draft.rows[0]], rows: draft.rows.slice(1) });
  };
  const importGrid = (text: string) => {
    if (blocked) return;
    try {
      const imported = parseTableDelimitedText(text, draft.headers.length > 0);
      const next = { ...imported, ...(draft.caption !== undefined ? { caption: draft.caption } : {}) };
      const issue = tableBlockValidationError(next);
      if (issue) throw new Error(issue);
      update(next);
      setImportText('');
    } catch (importError) {
      setLocalError(importError instanceof Error ? importError.message : 'Table import failed.');
    }
  };
  const pasteGrid = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData('text/plain') || event.clipboardData.getData('text');
    if (!isTableDelimitedPaste(text)) return;
    event.preventDefault(); event.stopPropagation();
    importGrid(text);
  };
  const removeColumn = (index: number) => update({ ...draft,
    headers: draft.headers.filter((_, column) => column !== index),
    rows: draft.rows.map((row) => row.filter((_, column) => column !== index)),
  });

  return createPortal(<div className={styles.overlay} onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}>
    <section className={styles.dialog} ref={dialog} role="dialog" aria-modal="true" tabIndex={-1}
      aria-labelledby={titleId} aria-describedby={hintId} aria-busy={blocked}>
      <header className={styles.header}>
        <h2 id={titleId}>Edit table</h2>
        <p id={hintId}>Plain text cells. Paste multiple CSV or TSV rows into a cell to replace the grid. Ctrl+Enter saves; Esc cancels.</p>
      </header>
      <div className={styles.body}>
        <label className={styles.caption}>Caption
          <textarea aria-label="Table caption" rows={2} value={draft.caption ?? ''} disabled={blocked}
            onChange={(event) => update({ ...draft, caption: event.target.value })} />
        </label>
        <div className={styles.toolbar}>
          <label><input type="checkbox" checked={draft.headers.length > 0} disabled={blocked} onChange={toggleHeaders} />Header row</label>
          <button type="button" disabled={blocked || draft.rows.length >= TABLE_MAX_ROWS}
            onClick={() => update({ ...draft, rows: [...draft.rows, Array<string>(columns).fill('')] })}>Add row</button>
          <button type="button" disabled={blocked || columns >= TABLE_MAX_COLUMNS} onClick={() => update({ ...draft,
            headers: draft.headers.length ? [...draft.headers, ''] : [], rows: draft.rows.map((row) => [...row, '']),
          })}>Add column</button>
          <span>{draft.rows.length} data rows × {columns} columns</span>
        </div>
        <div className={styles.grid}>
          <table aria-label="Table cells"><thead>
            <tr>{Array.from({ length: columns }, (_, column) => <th key={column} scope="col">
              <span>Column {column + 1}</span>
              <button type="button" aria-label={`Delete column ${column + 1}`} disabled={blocked || columns === 1}
                onClick={() => removeColumn(column)}>Delete</button>
            </th>)}<th scope="col">Rows</th></tr>
            {draft.headers.length > 0 && <tr>{draft.headers.map((cell, column) => <th scope="col" key={column}>
              <textarea aria-label={`Header ${column + 1}`} rows={2} value={cell} disabled={blocked} onPaste={pasteGrid}
                onChange={(event) => updateCell(-1, column, event.target.value)} />
            </th>)}<td>Header</td></tr>}
          </thead><tbody>{draft.rows.map((row, rowIndex) => <tr key={rowIndex}>
            {row.map((cell, column) => <td key={column}><textarea rows={2} value={cell} disabled={blocked}
              aria-label={`Row ${rowIndex + 1}, column ${column + 1}`} onPaste={pasteGrid}
              onChange={(event) => updateCell(rowIndex, column, event.target.value)} /></td>)}
            <td><button type="button" aria-label={`Delete row ${rowIndex + 1}`}
              disabled={blocked || (!draft.headers.length && draft.rows.length === 1)}
              onClick={() => update({ ...draft, rows: draft.rows.filter((_, index) => index !== rowIndex) })}>Delete row</button></td>
          </tr>)}</tbody></table>
        </div>
        <details className={styles.import}>
          <summary>Import CSV / TSV</summary>
          <p>Import replaces the grid and keeps the caption. The header switch decides whether the first row is a header. Quoted commas, tabs, new lines and doubled quotes are supported; shorter rows receive empty cells.</p>
          <textarea aria-label="Paste CSV or TSV" rows={3} value={importText} disabled={blocked}
            onChange={(event) => setImportText(event.target.value)} onPaste={pasteGrid} />
          <button type="button" disabled={blocked || !importText} onClick={() => importGrid(importText)}>Import grid</button>
        </details>
        {(localError || validationError || error) && <p role="alert" className={styles.error}>{localError || validationError || error}</p>}
      </div>
      <footer className={styles.footer}>
        <button type="button" disabled={blocked} onClick={onCancel}>Cancel</button>
        <button type="button" className={styles.save} disabled={blocked || !!validationError} onClick={() => void save()}>
          {blocked ? 'Saving…' : 'Save table'}
        </button>
      </footer>
    </section>
  </div>, document.body);
}
