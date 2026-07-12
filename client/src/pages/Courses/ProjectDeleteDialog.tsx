import { useEffect, useState } from 'react';
import { AlertTriangle, ArchiveRestore, Trash2, X } from 'lucide-react';
import api from '@/services/api';
import type { ProjectProjectionAction } from '@/stores/courseStore';
import styles from './ProjectDeleteDialog.module.css';

export interface ProjectDeletionImpact {
  project: { id: string; name: string };
  source_placement_count: number;
  source_projection_count: number;
  projection_user_work_count: number;
  other_placement_source_count: number;
  recommended_action: ProjectProjectionAction;
}

interface ProjectDeleteDialogProps {
  projectId: string;
  projectName: string;
  onCancel: () => void;
  onConfirm: (action: ProjectProjectionAction) => Promise<void>;
}

export function ProjectDeleteDialog({
  projectId,
  projectName,
  onCancel,
  onConfirm,
}: ProjectDeleteDialogProps) {
  const [impact, setImpact] = useState<ProjectDeletionImpact | null>(null);
  const [action, setAction] = useState<ProjectProjectionAction>('delete_projection');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api.get<ProjectDeletionImpact>(`/courses/${projectId}/delete-impact`)
      .then(({ data }) => {
        if (!active) return;
        setImpact(data);
        setAction(data.recommended_action);
        setError(null);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError?.response?.data?.error || 'Could not calculate deletion impact');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [projectId]);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(action);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'Project deletion failed');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={onCancel}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="project-delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className={styles.warningIcon}><AlertTriangle size={18} /></div>
          <div>
            <h2 id="project-delete-title">Delete {projectName}</h2>
            <p>The Project will be removed permanently. Source identities and original files stay in the Source Library.</p>
          </div>
          <button className={styles.closeButton} type="button" onClick={onCancel} aria-label="Close"><X size={16} /></button>
        </header>

        {loading ? <div className={styles.loading}>Calculating Source and projection impact...</div> : impact && (
          <>
            <div className={styles.impactLine}>
              <strong>{impact.source_placement_count}</strong> Source placements
              <span>{impact.source_projection_count} projections in this Project</span>
              <span>{impact.projection_user_work_count} with user work</span>
            </div>
            <fieldset className={styles.options}>
              <legend>SourceProjection handling</legend>
              <label className={action === 'move_to_home' ? styles.selected : undefined}>
                <input type="radio" name="projection-action" checked={action === 'move_to_home'} onChange={() => setAction('move_to_home')} />
                <ArchiveRestore size={16} />
                <span><strong>Move projections to Home</strong><small>Keep their blocks, layout, annotations, ContentGroups, purposes, and images.</small></span>
                {impact.recommended_action === 'move_to_home' && <em>Recommended</em>}
              </label>
              <label className={action === 'delete_projection' ? styles.selected : undefined}>
                <input type="radio" name="projection-action" checked={action === 'delete_projection'} onChange={() => setAction('delete_projection')} />
                <Trash2 size={16} />
                <span><strong>Delete projections in this Project</strong><small>The original Sources remain. Any projection work in this Project is discarded.</small></span>
                {impact.recommended_action === 'delete_projection' && <em>Recommended</em>}
              </label>
            </fieldset>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
        <footer>
          <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button type="button" className={styles.dangerButton} onClick={() => void confirm()} disabled={loading || !impact || submitting}>
            <Trash2 size={15} />
            {submitting ? 'Deleting...' : 'Delete Project'}
          </button>
        </footer>
      </section>
    </div>
  );
}
