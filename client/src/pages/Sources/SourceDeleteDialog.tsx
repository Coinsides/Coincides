import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import {
  getSourceDeletionImpact,
  type SourceDeletionImpact,
} from './sourceApi';
import type { SourceRecordDetail } from './sourceExperienceModel';
import styles from './SourceLibrary.module.css';

interface SourceDeleteDialogProps {
  source: SourceRecordDetail;
  onCancel: () => void;
  onConfirm: (source: SourceRecordDetail) => Promise<void>;
}

export function SourceDeleteDialog({ source, onCancel, onConfirm }: SourceDeleteDialogProps) {
  const [impact, setImpact] = useState<SourceDeletionImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSourceDeletionImpact(source.id)
      .then((next) => {
        if (!active) return;
        setImpact(next);
        setError(null);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError?.response?.data?.error || 'Could not calculate Source deletion impact');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [source.id]);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(source);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'Source deletion failed');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.dialogOverlay} onMouseDown={onCancel}>
      <section className={styles.deleteDialog} role="alertdialog" aria-modal="true" aria-labelledby="source-delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className={styles.deleteWarning}><AlertTriangle size={18} /></div>
          <div>
            <h2 id="source-delete-title">Delete {source.display_name}</h2>
            <p>This permanently deletes the Source identity, original file, extracted projection, and its Project placements.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={16} /></button>
        </header>

        {loading ? <div className={styles.deleteLoading}>Calculating deletion impact...</div> : impact && (
          <div className={styles.deleteImpact}>
            <div><strong>{impact.placement_count}</strong><span>Project placements removed</span></div>
            <div><strong>{impact.projection_note_id ? 1 : 0}</strong><span>extracted projection removed</span></div>
            <div><strong>{impact.retained_receipt_count}</strong><span>external receipts retained as historical evidence</span></div>
            {impact.projection_user_work?.has_user_work && (
              <p>Annotations, purposes, or presentation work attached directly to the extracted projection will be removed. ContentGroup snapshots retain their group-local content but lose their live source target.</p>
            )}
            {impact.deletion_blocked && <p>{impact.blocked_reason}</p>}
          </div>
        )}

        {error && <div className={styles.deleteError}>{error}</div>}
        <footer>
          <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button
            type="button"
            className={styles.deleteDangerButton}
            onClick={() => void confirm()}
            disabled={loading || !impact || impact.deletion_blocked || submitting}
          >
            <Trash2 size={15} />
            {submitting ? 'Deleting...' : 'Delete Source permanently'}
          </button>
        </footer>
      </section>
    </div>
  );
}
