import { useCallback, useEffect, useState } from 'react';
import { Check, ListChecks, MapPin, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import {
  applyToolReceipt,
  dismissToolReceipt,
  listProposedToolReceipts,
  type ToolReceiptQueueItem,
} from './toolReceiptsApi';
import styles from './ToolReceipts.module.css';

type ReceiptAction = 'apply' | 'dismiss';

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

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

export default function ToolReceiptsPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);
  const [receipts, setReceipts] = useState<ToolReceiptQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; action: ReceiptAction } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReceipts(await listProposedToolReceipts());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (receipt: ToolReceiptQueueItem, action: ReceiptAction) => {
    if (pending) return;
    setPending({ id: receipt.id, action });
    setError(null);
    try {
      if (action === 'apply') {
        await applyToolReceipt(receipt.id);
      } else {
        await dismissToolReceipt(receipt.id);
      }
      setReceipts((current) => current.filter((candidate) => candidate.id !== receipt.id));
      addToast('success', action === 'apply' ? 'Receipt applied' : 'Receipt dismissed');
    } catch (actionError) {
      const message = errorMessage(actionError);
      setError(message);
      addToast('error', message);
    } finally {
      setPending(null);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="tool-receipts-title">
      <header className={styles.header}>
        <div>
          <h1 id="tool-receipts-title">Tool Receipts</h1>
          <p>Review proposed changes before they are executed.</p>
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

      <div className={styles.queueHeader}>
        <span>{receipts.length} proposed</span>
        <span>Only receipts owned by your account are shown</span>
      </div>

      {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}

      {loading ? (
        <div className={styles.emptyState}>Loading proposed receipts…</div>
      ) : receipts.length === 0 ? (
        <div className={styles.emptyState}>
          <ListChecks size={22} />
          <strong>Queue clear</strong>
          <span>There are no proposed tool changes to review.</span>
        </div>
      ) : (
        <div className={styles.receiptList}>
          {receipts.map((receipt) => {
            const noteId = firstNoteId(receipt);
            const rowPending = pending?.id === receipt.id;
            return (
              <article key={receipt.id} className={styles.receiptRow}>
                <div className={styles.receiptIdentity}>
                  <span className={styles.toolName}>{receipt.tool}</span>
                  <strong>{receipt.intended_input_summary}</strong>
                  <span className={styles.timestamp}>{formatTimestamp(receipt.created_at)}</span>
                </div>
                <span className={styles.resourceCount}>
                  {receipt.resources.length} resource{receipt.resources.length === 1 ? '' : 's'}
                </span>
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
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
