import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AgentMemoryRecord } from '@shared/types/agentMemories';
import api from '@/services/api';
import styles from '../Settings/Settings.module.css';
import pageStyles from './AgentMemories.module.css';

const memoriesPath = '/settings/agent-memories';

const pageSize = 25;

export default function AgentMemoriesPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api.get<AgentMemoryRecord[]>(memoriesPath)
      .then(({ data }) => {
        if (!cancelled) setMemories(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [loadVersion]);

  const saveMemory = async (id: string) => {
    if (busyId || !draft.trim()) return;
    setBusyId(id);
    setActionError(null);
    try {
      const { data } = await api.put<AgentMemoryRecord>(`${memoriesPath}/${encodeURIComponent(id)}`, {
        content: draft,
      });
      setMemories((current) => current.map((memory) => memory.id === id ? data : memory));
      setEditingId(null);
    } catch {
      setActionError({ id, message: 'Could not save this memory. Your edit is still here; try saving again.' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteMemory = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    setActionError(null);
    try {
      await api.delete(`${memoriesPath}/${encodeURIComponent(id)}`);
      setMemories((current) => current.filter((memory) => memory.id !== id));
      setConfirmingId(null);
    } catch {
      setActionError({ id, message: 'Could not delete this memory. Try deleting again.' });
    } finally {
      setBusyId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(memories.length / pageSize));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const firstIndex = currentPage * pageSize;
  const visibleMemories = memories.slice(firstIndex, firstIndex + pageSize);
  const changePage = (nextPage: number) => {
    setPageIndex(nextPage);
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView?.({ block: 'start' });
  };
  const pagination = (label: string) => (
    <nav className={pageStyles.pagination} aria-label={label}>
      <span className={styles.rowValue} aria-live="polite">Page {currentPage + 1} of {pageCount}</span>
      <div className={styles.memoryActions}>
        <button type="button" className={styles.backfillBtn}
          disabled={currentPage === 0 || editingId !== null || confirmingId !== null || busyId !== null}
          onClick={() => changePage(currentPage - 1)}>Previous</button>
        <button type="button" className={styles.backfillBtn}
          disabled={currentPage === pageCount - 1 || editingId !== null || confirmingId !== null || busyId !== null}
          onClick={() => changePage(currentPage + 1)}>Next</button>
      </div>
    </nav>
  );

  return (
    <section className={pageStyles.page} aria-labelledby="agent-memories-title">
      <Link to="/settings" className={pageStyles.backLink}>Back to Settings</Link>
      <h1 id="agent-memories-title" className={styles.title} ref={headingRef} tabIndex={-1}>Agent memories</h1>
      {!loading && !loadError && (
        <p className={pageStyles.count}>
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          {memories.length > 0 && <> · Showing {firstIndex + 1}–{Math.min(firstIndex + pageSize, memories.length)}</>}
        </p>
      )}
      {!loading && !loadError && memories.length > pageSize && pagination('Memory pages')}
      <div className={styles.card} aria-busy={loading}>
        {loading ? (
          <p className={styles.placeholder} role="status">Loading agent memories...</p>
        ) : loadError ? (
          <div className={styles.memoryStatus}>
            <p className={styles.memoryError} role="alert">Could not load agent memories.</p>
            <button type="button" className={styles.backfillBtn} onClick={() => setLoadVersion((value) => value + 1)}>
              Retry
            </button>
          </div>
        ) : memories.length === 0 ? (
          <p className={styles.placeholder}>No agent memories yet.</p>
        ) : (
          <ul className={styles.memoryList}>
            {visibleMemories.map((memory) => (
              <li key={memory.id} className={styles.memoryRow} aria-busy={busyId === memory.id}>
                {editingId === memory.id ? (
                  <form onSubmit={(event) => { event.preventDefault(); void saveMemory(memory.id); }}>
                    <label className={styles.rowLabel} htmlFor={`memory-content-${memory.id}`}>Memory content</label>
                    <textarea
                      id={`memory-content-${memory.id}`}
                      className={`${styles.inlineInput} ${styles.memoryInput}`}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={4}
                      disabled={busyId !== null}
                      autoFocus
                    />
                    <div className={styles.memoryActions}>
                      <button type="submit" className={styles.saveProviderBtn} disabled={busyId !== null || !draft.trim()}>
                        {busyId === memory.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className={styles.backfillBtn}
                        disabled={busyId !== null}
                        onClick={() => { setEditingId(null); setActionError(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className={styles.memoryContent}>{memory.content}</p>
                )}
                <div className={styles.memoryMetadata}>
                  <span>Created: <time dateTime={memory.created_at}>{memory.created_at}</time></span>
                  {memory.last_accessed && (
                    <span>Last accessed: <time dateTime={memory.last_accessed}>{memory.last_accessed}</time></span>
                  )}
                  {memory.source_conversation_id && <span>Source conversation: {memory.source_conversation_id}</span>}
                </div>
                {confirmingId === memory.id ? (
                  <div className={styles.memoryConfirmation} role="group" aria-label="Confirm memory deletion">
                    <p className={styles.rowValue}>Delete this memory permanently? This cannot be undone.</p>
                    <div className={styles.memoryActions}>
                      <button
                        type="button"
                        className={`${styles.backfillBtn} ${styles.memoryDeleteBtn}`}
                        disabled={busyId !== null}
                        onClick={() => void deleteMemory(memory.id)}
                        autoFocus
                      >
                        {busyId === memory.id ? 'Deleting...' : 'Confirm delete'}
                      </button>
                      <button
                        type="button"
                        className={styles.backfillBtn}
                        disabled={busyId !== null}
                        onClick={() => { setConfirmingId(null); setActionError(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : editingId !== memory.id ? (
                  <div className={styles.memoryActions}>
                    <button
                      type="button"
                      className={styles.backfillBtn}
                      disabled={busyId !== null || editingId !== null || confirmingId !== null}
                      onClick={() => { setEditingId(memory.id); setDraft(memory.content); setActionError(null); }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.backfillBtn}
                      disabled={busyId !== null || editingId !== null || confirmingId !== null}
                      onClick={() => { setConfirmingId(memory.id); setActionError(null); }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
                {actionError?.id === memory.id && <p className={styles.memoryError} role="alert">{actionError.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!loading && !loadError && memories.length > pageSize && pagination('Memory pages (bottom)')}
    </section>
  );
}
