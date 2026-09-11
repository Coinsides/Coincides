import { useId, useRef, useState, type MouseEvent } from 'react';
import type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { getTextFlowContent } from '../textFlowService';
import documentStyles from '../../NoteDetail.module.css';
import styles from './BlockEditRecoveryQueue.module.css';

interface BlockEditRecoveryQueueProps {
  receipts: BlockEditRecoveryReceipt[];
  conflicts?: Record<string, boolean>;
  onApply: (recoveryKey: string) => void | Promise<boolean>;
  onDismiss: (recoveryKey: string) => boolean;
  onInspect?: (recoveryKey: string) => Promise<NoteBlock | null>;
  onReplay?: (recoveryKey: string) => Promise<boolean>;
}

// Preserve the editor's focus until the chosen recovery action has captured its receipt.
function protectRecoveryAction(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

interface ComparisonUnit {
  id: string;
  text: string;
  deleted: boolean;
}

function comparisonUnits(flow: TextBlockContentV1 | null, fallback: string): ComparisonUnit[] {
  if (!flow) return [{ id: 'body', text: fallback, deleted: false }];
  return [...flow.units]
    .sort((a, b) => a.order_index - b.order_index)
    .map((unit) => ({ id: unit.id, text: unit.text, deleted: unit.status === 'deleted' }));
}

function UnitText({ unit, absent }: { unit?: ComparisonUnit; absent: string }) {
  if (!unit) return <p className={styles.unitState}>{absent}</p>;
  return <>
    {unit.deleted && <p className={styles.unitState}>Deleted unit</p>}
    <p className={styles.unitText}>{unit.text || <em>Empty text unit</em>}</p>
  </>;
}

function RecoveryComparison({ receipt, current, id }: {
  receipt: BlockEditRecoveryReceipt;
  current: NoteBlock;
  id: string;
}) {
  const draftUnits = comparisonUnits(getTextFlowContent(receipt.contentJson) ?? receipt.textFlow ?? null,
    typeof receipt.contentJson.body === 'string' ? receipt.contentJson.body : receipt.plainText);
  const currentUnits = comparisonUnits(getTextFlowContent(current.content_json),
    typeof current.content_json.body === 'string' ? current.content_json.body : current.plain_text ?? '');
  const draftPositions = new Map(draftUnits.map((unit, index) => [unit.id, index]));
  const currentPositions = new Map(currentUnits.map((unit, index) => [unit.id, index]));
  const unitIds = [...new Set([...draftUnits.map((unit) => unit.id), ...currentUnits.map((unit) => unit.id)])];
  return <section className={styles.comparison} id={id} aria-label="Draft and current text comparison">
    <p className={styles.explanation}>
      Text comparison{current.text_save_revision !== undefined ? `, current version ${current.text_save_revision}` : ''}.
      {' '}Current text can change again before replay.
    </p>
    {unitIds.length === 0 && <p className={styles.unitState}>Both versions contain no text units.</p>}
    {unitIds.map((unitId) => {
      const draftIndex = draftPositions.get(unitId) ?? -1;
      const currentIndex = currentPositions.get(unitId) ?? -1;
      return <div className={styles.comparisonRow} key={unitId}>
        <div className={styles.comparisonCell}>
          <h4>Recovery draft{draftIndex >= 0 ? ` · unit ${draftIndex + 1}` : ''}</h4>
          <UnitText unit={draftUnits[draftIndex]} absent="Not present in the recovery draft" />
        </div>
        <div className={styles.comparisonCell}>
          <h4>Current text{currentIndex >= 0 ? ` · unit ${currentIndex + 1}` : ''}</h4>
          <UnitText unit={currentUnits[currentIndex]} absent="Not present in the current version" />
        </div>
      </div>;
    })}
  </section>;
}

function ConflictedRecoveryItem({ receipt, onInspect, onReplay, onDismiss }: {
  receipt: BlockEditRecoveryReceipt;
  onInspect: BlockEditRecoveryQueueProps['onInspect'];
  onReplay: BlockEditRecoveryQueueProps['onReplay'];
  onDismiss: BlockEditRecoveryQueueProps['onDismiss'];
}) {
  const id = useId();
  const pending = useRef(false);
  const [busy, setBusy] = useState<'inspect' | 'replay' | null>(null);
  const [current, setCurrent] = useState<NoteBlock | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function inspect() {
    if (pending.current || !onInspect) return;
    pending.current = true;
    setBusy('inspect');
    setError(null);
    setCurrent(null);
    try {
      const block = await onInspect(receipt.recoveryKey);
      if (block) setCurrent(block);
      else setError('Could not load the current text. Your draft is still available. Choose View differences to try again.');
    } catch {
      setError('Could not load the current text. Your draft is still available. Choose View differences to try again.');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  async function replay() {
    if (pending.current || !onReplay) return;
    pending.current = true;
    setBusy('replay');
    setError(null);
    setCurrent(null);
    try {
      if (!await onReplay(receipt.recoveryKey)) {
        setError('The draft was not saved and is still available. View differences or try replaying again.');
      }
    } catch {
      setError('The draft was not saved and is still available. View differences or try replaying again.');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  function discard() {
    if (pending.current) return;
    setError(null);
    if (!onDismiss(receipt.recoveryKey)) setError('The draft could not be discarded. Please try again.');
  }

  return <div className={styles.conflictItem} data-block-edit-recovery-conflict={receipt.recoveryKey}
    aria-busy={busy !== null} onMouseDown={(event) => event.stopPropagation()}>
    <p className={styles.explanation} id={`${id}-explanation`}>
      <strong>This draft is based on an older version.</strong> The content has changed elsewhere.
      {' '}Replaying will replace the current block text with this draft, using the latest version as its starting point.
    </p>
    <p className={styles.draftPreview}><strong>Recovery draft: </strong>{receipt.text.trim() || 'Empty block edit'}</p>
    <div className={`${documentStyles.blockEditRecoveryActions} ${styles.actions}`} aria-describedby={`${id}-explanation`}>
      <button type="button" disabled={busy !== null || !onInspect} onMouseDown={protectRecoveryAction}
        aria-expanded={current !== null} aria-controls={`${id}-comparison`} onClick={() => { void inspect(); }}>
        {busy === 'inspect' ? 'Loading differences…' : 'View differences'}
      </button>
      <button type="button" disabled={busy !== null || !onReplay} onMouseDown={protectRecoveryAction}
        aria-describedby={`${id}-explanation`} onClick={() => { void replay(); }}>
        {busy === 'replay' ? 'Replaying draft…' : 'Replay draft on current version'}
      </button>
      <button type="button" disabled={busy !== null} onMouseDown={protectRecoveryAction} onClick={discard}>
        Discard this draft
      </button>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {current && <RecoveryComparison receipt={receipt} current={current} id={`${id}-comparison`} />}
  </div>;
}

export function BlockEditRecoveryQueue({ receipts, conflicts, onApply, onDismiss, onInspect, onReplay }: BlockEditRecoveryQueueProps) {
  if (receipts.length === 0) return null;
  return <div className={documentStyles.blockEditRecoveryQueue} role="status">
    <div className={documentStyles.blockEditRecoveryTitle}>
      {receipts.length === 1 ? 'A block edit is waiting for recovery' : `${receipts.length} block edits are waiting for recovery`}
    </div>
    {receipts.map((receipt) => conflicts?.[receipt.recoveryKey]
      ? <ConflictedRecoveryItem key={receipt.recoveryKey} receipt={receipt} onInspect={onInspect} onReplay={onReplay} onDismiss={onDismiss} />
      : <div className={`${documentStyles.blockEditRecoveryItem} ${styles.recoveryItem}`} key={receipt.recoveryKey}>
        <span className={documentStyles.blockEditRecoveryPreview}>{receipt.text.trim() || 'Empty block edit'}</span>
        <div className={documentStyles.blockEditRecoveryActions}>
          <button type="button" onMouseDown={protectRecoveryAction} onClick={() => { void onApply(receipt.recoveryKey); }}>Apply</button>
          <button type="button" onMouseDown={protectRecoveryAction} onClick={() => { onDismiss(receipt.recoveryKey); }}>Dismiss</button>
        </div>
      </div>)}
  </div>;
}
