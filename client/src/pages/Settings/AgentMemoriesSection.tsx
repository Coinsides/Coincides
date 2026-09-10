import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AgentMemoryRecord } from '@shared/types/agentMemories';
import api from '@/services/api';
import styles from './Settings.module.css';

export default function AgentMemoriesSection() {
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api.get<AgentMemoryRecord[]>('/settings/agent-memories')
      .then(({ data }) => { if (!cancelled) setMemories(data); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadVersion]);

  return (
    <section className={styles.section} aria-labelledby="agent-memories-title">
      <h2 id="agent-memories-title" className={styles.sectionTitle}>Agent memories</h2>
      <div className={styles.card} aria-busy={loading}>
        <div className={styles.memorySummaryHeader}>
          {!loading && !loadError && (
            <p className={styles.rowLabel}>{memories.length} {memories.length === 1 ? 'memory' : 'memories'}</p>
          )}
          <Link to="/agent-memories" className={styles.memoryViewAll} aria-label="View all agent memories">View all</Link>
        </div>
        {loading ? (
          <p className={styles.placeholder} role="status">Loading agent memories...</p>
        ) : loadError ? (
          <div className={styles.memoryStatus}>
            <p className={styles.memoryError} role="alert">Could not load agent memories.</p>
            <button type="button" className={styles.backfillBtn} onClick={() => setLoadVersion((value) => value + 1)}>Retry</button>
          </div>
        ) : memories.length === 0 ? (
          <p className={styles.placeholder}>No agent memories yet.</p>
        ) : (
          <>
            <p className={styles.rowValue}>Recent memories</p>
            <ul className={styles.memoryList}>
              {memories.slice(0, 3).map((memory) => (
                <li key={memory.id} className={styles.memoryRow}>
                  <p className={[styles.memoryContent, styles.memoryPreview].join(' ')}>{memory.content}</p>
                  <div className={styles.memoryMetadata}>
                    <span>Created: <time dateTime={memory.created_at}>{memory.created_at}</time></span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
