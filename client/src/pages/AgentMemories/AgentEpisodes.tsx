import { useEffect, useRef, useState } from 'react';
import type { AgentEpisodeRecord } from '@shared/types/agentEpisodes';
import api from '@/services/api';
import styles from '../Settings/Settings.module.css';
import pageStyles from './AgentMemories.module.css';

const episodesPath = '/settings/agent-episodes';
const pageSize = 25;
const anchorKinds = [
  ['note_ids', 'Notes'], ['board_ids', 'Boards'], ['item_ids', 'Items'],
  ['proposal_ids', 'Proposals'], ['memory_ids', 'Memories'],
] as const;

export default function AgentEpisodes({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [episodes, setEpisodes] = useState<AgentEpisodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api.get<AgentEpisodeRecord[]>(episodesPath)
      .then(({ data }) => { if (!cancelled) setEpisodes(data); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadVersion]);

  const deleteEpisode = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    onBusyChange(true);
    setActionError(null);
    try {
      await api.delete(`${episodesPath}/${encodeURIComponent(id)}`);
      setEpisodes((current) => current.filter((episode) => episode.id !== id));
      setConfirmingId(null);
    } catch {
      setActionError({ id, message: 'Could not delete this episode. Try deleting again.' });
    } finally {
      setBusyId(null);
      onBusyChange(false);
    }
  };

  const search = query.trim().toLocaleLowerCase();
  const groups = new Map<string, AgentEpisodeRecord[]>();
  for (const episode of episodes) {
    const searchable = [
      episode.id, episode.conversation_id, episode.conversation_title ?? '', episode.summary_text,
      ...Object.values(episode.anchor_manifest).flat(),
    ].join('\n').toLocaleLowerCase();
    if (search && !searchable.includes(search)) continue;
    const group = groups.get(episode.conversation_id) ?? [];
    group.push(episode);
    groups.set(episode.conversation_id, group);
  }
  const matchingEpisodes = [...groups.values()].flatMap((group) => group.sort((a, b) => b.seq - a.seq));
  const pageCount = Math.max(1, Math.ceil(matchingEpisodes.length / pageSize));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const firstIndex = currentPage * pageSize;
  const visibleGroups = new Map<string, AgentEpisodeRecord[]>();
  for (const episode of matchingEpisodes.slice(firstIndex, firstIndex + pageSize)) {
    const group = visibleGroups.get(episode.conversation_id) ?? [];
    group.push(episode);
    visibleGroups.set(episode.conversation_id, group);
  }
  const interactionLocked = confirmingId !== null || busyId !== null;
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
          disabled={currentPage === 0 || interactionLocked}
          onClick={() => changePage(currentPage - 1)}>Previous</button>
        <button type="button" className={styles.backfillBtn}
          disabled={currentPage === pageCount - 1 || interactionLocked}
          onClick={() => changePage(currentPage + 1)}>Next</button>
      </div>
    </nav>
  );

  return (
    <>
      <h2 className={pageStyles.episodeHeading} ref={headingRef} tabIndex={-1}>Conversation episodes</h2>
      <p className={pageStyles.count}>
        Summaries of earlier conversation turns. Original messages are kept in full.
        Episodes cannot be edited; deleted summaries may be recreated during later conversation compression.
      </p>
      <label className={pageStyles.searchLabel} htmlFor="episode-search">Search episodes</label>
      <input id="episode-search" type="search" className={`${styles.inlineInput} ${pageStyles.searchInput}`}
        placeholder="Summary, conversation, or anchor ID" value={query} disabled={interactionLocked}
        onChange={(event) => { setQuery(event.target.value); setPageIndex(0); }} />
      {!loading && !loadError && (
        <p className={pageStyles.count} aria-live="polite">
          {matchingEpisodes.length} {matchingEpisodes.length === 1 ? 'episode' : 'episodes'}
          {matchingEpisodes.length > 0 && <> · Showing {firstIndex + 1}–{Math.min(firstIndex + pageSize, matchingEpisodes.length)}</>}
        </p>
      )}
      {!loading && !loadError && matchingEpisodes.length > pageSize && pagination('Episode pages')}
      <div className={styles.card} aria-busy={loading}>
        {loading ? (
          <p className={styles.placeholder} role="status">Loading conversation episodes...</p>
        ) : loadError ? (
          <div className={styles.memoryStatus}>
            <p className={styles.memoryError} role="alert">Could not load conversation episodes.</p>
            <button type="button" className={styles.backfillBtn} onClick={() => setLoadVersion((value) => value + 1)}>Retry</button>
          </div>
        ) : episodes.length === 0 ? (
          <p className={styles.placeholder}>No conversation episodes yet.</p>
        ) : matchingEpisodes.length === 0 ? (
          <p className={styles.placeholder}>No episodes match your search.</p>
        ) : [...visibleGroups.entries()].map(([conversationId, group]) => (
          <section className={pageStyles.episodeGroup} key={conversationId} aria-label={`Conversation ${conversationId}`}>
            <h3 className={pageStyles.conversationHeading}>{group[0].conversation_title || 'Untitled conversation'}</h3>
            <p className={pageStyles.conversationId}>Conversation: {conversationId}</p>
            <ul className={styles.memoryList}>
              {group.map((episode) => (
                <li key={episode.id} className={styles.memoryRow} aria-busy={busyId === episode.id}>
                  <h4 className={pageStyles.episodeHeading}>Episode {episode.seq}</h4>
                  <p className={styles.memoryContent}>{episode.summary_text}</p>
                  <div className={styles.memoryMetadata}>
                    <span>Time range: <time dateTime={episode.message_range.started_at}>{episode.message_range.started_at}</time>
                      {' – '}<time dateTime={episode.message_range.ended_at}>{episode.message_range.ended_at}</time></span>
                    <span>Messages: {episode.message_range.first_message_id} → {episode.message_range.last_message_id}</span>
                    <span>Created: <time dateTime={episode.created_at}>{episode.created_at}</time></span>
                  </div>
                  <h5 className={pageStyles.anchorHeading}>Anchor manifest</h5>
                  <dl className={pageStyles.anchorManifest}>
                    {anchorKinds.map(([key, label]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{episode.anchor_manifest[key].length > 0
                          ? episode.anchor_manifest[key].map((id) => <code key={id}>{id}</code>) : 'None'}</dd>
                      </div>
                    ))}
                  </dl>
                  {confirmingId === episode.id ? (
                    <div className={styles.memoryConfirmation} role="group" aria-label="Confirm episode deletion">
                      <p className={styles.rowValue}>
                        Permanently delete this episode summary? Original conversation messages and referenced objects will be kept.
                        The summary may be recreated during later conversation compression.
                      </p>
                      <div className={styles.memoryActions}>
                        <button type="button" className={`${styles.backfillBtn} ${styles.memoryDeleteBtn}`}
                          disabled={busyId !== null} onClick={() => void deleteEpisode(episode.id)} autoFocus>
                          {busyId === episode.id ? 'Deleting...' : 'Confirm delete'}
                        </button>
                        <button type="button" className={styles.backfillBtn} disabled={busyId !== null}
                          onClick={() => { setConfirmingId(null); setActionError(null); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.memoryActions}>
                      <button type="button" className={styles.backfillBtn} disabled={interactionLocked}
                        onClick={() => { setConfirmingId(episode.id); setActionError(null); }}>Delete</button>
                    </div>
                  )}
                  {actionError?.id === episode.id && <p className={styles.memoryError} role="alert">{actionError.message}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {!loading && !loadError && matchingEpisodes.length > pageSize && pagination('Episode pages (bottom)')}
    </>
  );
}
