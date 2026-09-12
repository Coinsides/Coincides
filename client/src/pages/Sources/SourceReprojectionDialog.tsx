import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  previewSourceReprojection,
  type SourceProjectionUserWork,
} from './sourceApi';
import type { SourceRecordDetail } from './sourceExperienceModel';
import styles from './SourceLibrary.module.css';

interface SourceReprojectionDialogProps {
  source: SourceRecordDetail;
  onCancel: () => void;
  onConfirm: (source: SourceRecordDetail) => Promise<void>;
}

const USER_WORK_FIELDS = [
  'annotation_count',
  'note_tag_count',
  'content_group_count',
  'purpose_count',
  'display_override_count',
  'external_block_placement_count',
] as const;

function reprojectionErrorKey(error: unknown): string {
  const data = (error as { response?: { data?: { details?: { code?: string }; code?: string } } })?.response?.data;
  switch (data?.details?.code ?? data?.code) {
    case 'reprojection_blocked_external_refs': return 'sources.reprojection.blockedExternalRefs';
    case 'reprojection_in_progress': return 'sources.reprojection.inProgress';
    case 'reprojection_not_ready': return 'sources.reprojection.notReady';
    default: return 'sources.reprojection.failed';
  }
}

export function SourceReprojectionDialog({ source, onCancel, onConfirm }: SourceReprojectionDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const [userWork, setUserWork] = useState<SourceProjectionUserWork | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const blocked = Boolean(userWork && userWork.external_block_placement_count > 0);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUserWork(null);
    setErrorKey(null);
    void previewSourceReprojection(source.id)
      .then(({ user_work }) => {
        if (active) setUserWork(user_work);
      })
      .catch((error: unknown) => {
        if (active) setErrorKey(reprojectionErrorKey(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [source.id, previewAttempt]);

  const cancel = () => {
    if (!submittingRef.current) onCancel();
  };

  const confirm = async () => {
    if (!userWork || loading || blocked || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setErrorKey(null);
    try {
      await onConfirm(source);
    } catch (error: unknown) {
      setErrorKey(reprojectionErrorKey(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={styles.dialogOverlay} onMouseDown={cancel}>
      <section
        ref={dialogRef}
        className={`${styles.deleteDialog} ${styles.reprojectionDialog}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={loading || submitting}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          }
          if (event.key !== 'Tab') return;
          const controls = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
          if (!controls?.length) { event.preventDefault(); return; }
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header>
          <div className={styles.deleteWarning}><AlertTriangle size={18} aria-hidden="true" /></div>
          <div>
            <h2 id={titleId}>{t('sources.reprojection.title', { name: source.display_name })}</h2>
            <p id={descriptionId}>{t('sources.reprojection.description')}</p>
          </div>
          <button ref={closeRef} type="button" onClick={cancel} disabled={submitting} aria-label={t('common.close')}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {loading ? <div className={styles.deleteLoading} role="status">{t('sources.reprojection.loading')}</div> : userWork && (
          <div className={styles.deleteImpact}>
            <dl className={styles.reprojectionCounts}>
              {USER_WORK_FIELDS.map((field) => (
                <div key={field}>
                  <dt>{t(`sources.reprojection.counts.${field}`)}</dt>
                  <dd>{userWork[field]}</dd>
                </div>
              ))}
            </dl>
            <p>{t('sources.reprojection.annotationWarning')}</p>
            <p>{t('sources.reprojection.otherWorkWarning')}</p>
          </div>
        )}

        {(blocked || errorKey) && (
          <div className={styles.deleteError} role="alert">
            {t(blocked ? 'sources.reprojection.blockedExternalRefs' : errorKey!)}
          </div>
        )}
        <footer>
          <button type="button" onClick={cancel} disabled={submitting}>{t('common.cancel')}</button>
          {!loading && !userWork ? (
            <button type="button" onClick={() => setPreviewAttempt((attempt) => attempt + 1)}>
              {t('sources.reprojection.retryPreview')}
            </button>
          ) : (
            <button
              type="button"
              className={styles.deleteDangerButton}
              onClick={() => void confirm()}
              disabled={loading || !userWork || blocked || submitting || errorKey === 'sources.reprojection.blockedExternalRefs'}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {t(submitting ? 'sources.reprojection.submitting' : 'sources.reprojection.confirm')}
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
