import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ListChecks, MapPin, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import {
  applyToolReceipt,
  dismissToolReceipt,
  listToolReceipts,
  revertToolReceipt,
  type ToolReceiptQueueItem,
  type ToolReceiptStatus,
} from './toolReceiptsApi';
import styles from './ToolReceipts.module.css';

type ReceiptAction = 'apply' | 'dismiss' | 'revert';
type ReceiptView = 'proposed' | 'executed';

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function emptyReceiptState(): Record<ToolReceiptStatus, ToolReceiptQueueItem[]> {
  return {
    proposed: [],
    applied: [],
    reverted: [],
    dismissed: [],
  };
}

function errorMessage(error: unknown): string {
  const responseMessage = (error as {
    response?: { data?: { error?: unknown; message?: unknown } };
  })?.response?.data;
  if (typeof responseMessage?.error === 'string') return responseMessage.error;
  if (typeof responseMessage?.message === 'string') return responseMessage.message;
  if (error instanceof Error && error.message) return error.message;
  return 'The receipt action could not be completed';
}

function firstNoteId(receipt: ToolReceiptQueueItem): string | null {
  const resource = receipt.resources.find((candidate) => (
    candidate.kind === 'note' && typeof candidate.id === 'string'
  ));
  return resource?.id ?? null;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : timestampFormatter.format(date);
}

function receiptTimestamp(receipt: ToolReceiptQueueItem): string {
  if (receipt.status === 'reverted') return receipt.reverted_at ?? receipt.applied_at ?? receipt.created_at;
  if (receipt.status === 'applied') return receipt.applied_at ?? receipt.created_at;
  return receipt.created_at;
}

function statusLabel(status: ToolReceiptStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ToolReceiptsPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);
  const [view, setView] = useState<ReceiptView>('proposed');
  const [receiptsByStatus, setReceiptsByStatus] = useState(emptyReceiptState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; action: ReceiptAction } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proposed, applied, reverted, dismissed] = await Promise.all([
        listToolReceipts('proposed'),
        listToolReceipts('applied'),
        listToolReceipts('reverted'),
        listToolReceipts('dismissed'),
      ]);
      setReceiptsByStatus({ proposed, applied, reverted, dismissed });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const executedReceipts = useMemo(() => (
    [
      ...receiptsByStatus.applied,
      ...receiptsByStatus.reverted,
      ...receiptsByStatus.dismissed,
    ].sort((left, right) => right.created_at.localeCompare(left.created_at))
  ), [receiptsByStatus]);

  const runAction = async (receipt: ToolReceiptQueueItem, action: ReceiptAction) => {
    if (pending) return;
    setPending({ id: receipt.id, action });
    setError(null);
    try {
      if (action === 'apply') {
        await applyToolReceipt(receipt.id);
      } else if (action === 'dismiss') {
        await dismissToolReceipt(receipt.id);
      } else {
        await revertToolReceipt(receipt.id);
      }
      await refresh();
      const successMessage = action === 'apply'
        ? 'Receipt applied'
        : action === 'dismiss'
          ? 'Receipt dismissed'
          : 'Receipt reverted';
      addToast('success', successMessage);
    } catch (actionError) {
      const message = errorMessage(actionError);
      setError(message);
      addToast('error', message);
    } finally {
      setPending(null);
    }
  };

  const visibleReceipts = view === 'proposed' ? receiptsByStatus.proposed : executedReceipts;

  return (
    <section className={styles.page} aria-labelledby="tool-receipts-title">
      <header className={styles.header}>
        <div>
          <h1 id="tool-receipts-title">Tool Receipts</h1>
          <p>Review proposed changes and inspect executed receipts.</p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void refresh()}
          disabled={loading || pending !== null}
        >
          <RefreshCw size={15} className={loading ? styles.spinning : undefined} />
          Refresh
        </button>
      </header>

      <div className={styles.viewTabs} role="tablist" aria-label="Tool receipt views">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'proposed'}
          className={view === 'proposed' ? styles.activeViewTab : undefined}
          onClick={() => setView('proposed')}
        >
          Proposed <span>{receiptsByStatus.proposed.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'executed'}
          className={view === 'executed' ? styles.activeViewTab : undefined}
          onClick={() => setView('executed')}
        >
          Executed <span>{executedReceipts.length}</span>
        </button>
      </div>

      <div className={styles.queueHeader}>
        {view === 'proposed' ? (
          <span>{receiptsByStatus.proposed.length} proposed</span>
        ) : (
          <div className={styles.statusCounts} aria-label="Executed receipt counts">
            <span>Applied {receiptsByStatus.applied.length}</span>
            <span>Reverted {receiptsByStatus.reverted.length}</span>
            <span>Dismissed {receiptsByStatus.dismissed.length}</span>
          </div>
        )}
        <span>Only receipts owned by your account are shown</span>
      </div>

      {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}

      {loading ? (
        <div className={styles.emptyState}>Loading {view === 'proposed' ? 'proposed' : 'executed'} receipts…</div>
      ) : visibleReceipts.length === 0 ? (
        <div className={styles.emptyState}>
          <ListChecks size={22} />
          <strong>{view === 'proposed' ? 'Queue clear' : 'No executed receipts'}</strong>
          <span>
            {view === 'proposed'
              ? 'There are no proposed tool changes to review.'
              : 'Applied, reverted, and dismissed receipts will remain visible here.'}
          </span>
        </div>
      ) : (
        <div className={styles.receiptList}>
          {visibleReceipts.map((receipt) => {
            const noteId = firstNoteId(receipt);
            const rowPending = pending?.id === receipt.id;
            return (
              <article key={receipt.id} className={styles.receiptRow}>
                <div className={styles.receiptIdentity}>
                  <div className={styles.receiptLabels}>
                    <span className={styles.toolName}>{receipt.tool}</span>
                    {view === 'executed' ? (
                      <span className={`${styles.statusChip} ${styles[`status${statusLabel(receipt.status)}`]}`}>
                        {statusLabel(receipt.status)}
                      </span>
                    ) : null}
                  </div>
                  <strong>{receipt.intended_input_summary}</strong>
                  <span className={styles.timestamp}>{formatTimestamp(receiptTimestamp(receipt))}</span>
                </div>
                <span className={styles.resourceCount}>
                  {receipt.resources.length} resource{receipt.resources.length === 1 ? '' : 's'}
                </span>
                {receipt.status === 'proposed' ? (
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.sceneButton}
                      onClick={() => noteId && navigate(`/notes/${noteId}`)}
                      disabled={!noteId || rowPending}
                      title={noteId ? 'Jump to the first note' : 'No note scene is available'}
                    >
                      <MapPin size={14} />
                      Jump to scene
                    </button>
                    <button
                      type="button"
                      className={styles.dismissButton}
                      onClick={() => void runAction(receipt, 'dismiss')}
                      disabled={pending !== null}
                    >
                      <X size={14} />
                      {rowPending && pending.action === 'dismiss' ? 'Dismissing…' : 'Dismiss'}
                    </button>
                    <button
                      type="button"
                      className={styles.applyButton}
                      onClick={() => void runAction(receipt, 'apply')}
                      disabled={pending !== null}
                    >
                      <Check size={14} />
                      {rowPending && pending.action === 'apply' ? 'Applying…' : 'Apply'}
                    </button>
                  </div>
                ) : receipt.status === 'applied' ? (
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.revertButton}
                      onClick={() => void runAction(receipt, 'revert')}
                      disabled={pending !== null}
                    >
                      <RotateCcw size={14} />
                      {rowPending && pending.action === 'revert' ? 'Reverting…' : 'Revert'}
                    </button>
                  </div>
                ) : (
                  <span className={styles.readOnlyLabel}>Read only</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
