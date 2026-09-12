import { useEffect, useRef, useState, type CSSProperties } from 'react';
import api from '@/services/api';
import type { Course } from '@shared/types';
import type { Note } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import { createPageFrameCollectionSeed } from '@/pages/Notes/canvasEngine/pageFrameCollectionService';
import boardStyles from './Boards.module.css';
import styles from './BoardNewNoteDialog.module.css';

const NEW_PROJECT = '__new_project__';

export function BoardNewNoteDialog({ boardId, initialProjectId, onCancel, onCreated, skinStyle }: {
  skinStyle?: CSSProperties;
  boardId: string;
  initialProjectId: string | null;
  onCancel: () => void;
  onCreated: (noteId: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(false);
  const inFlight = useRef(false);
  const [projects, setProjects] = useState<Course[]>([]);
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal();
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    void api.get<Course[]>('/courses').then(({ data }) => {
      if (!active) return;
      setProjects(data);
      setProjectId((current) => current || (data.some(({ id }) => id === initialProjectId) ? initialProjectId! : ''));
    }).catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, initialProjectId]);

  const creatingProject = projectId === NEW_PROJECT;
  const validProject = creatingProject ? Boolean(projectName.trim()) : projects.some(({ id }) => id === projectId);

  async function createNote(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || loading || loadError || !title.trim() || !validProject) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ note: Note }>(`/boards/${encodeURIComponent(boardId)}/ceremony-note`, {
        ...(creatingProject ? { project: { name: projectName.trim() } } : { project_id: projectId }),
        title: title.trim(),
        collection: createPageFrameCollectionSeed(),
      });
      if (alive.current) onCreated(data.note.id);
    } catch {
      if (alive.current) setError('Could not create the note. Your entries are kept. Try again.');
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return <dialog ref={dialog} className={`${boardStyles.deleteDialog} ${styles.dialog}`} style={skinStyle}
    aria-labelledby="board-new-note-title" onCancel={(event) => {
      event.preventDefault();
      if (!inFlight.current) onCancel();
    }}>
    <h2 id="board-new-note-title">New note</h2>
    <form className={styles.form} onSubmit={(event) => { void createNote(event); }}>
      <label htmlFor="board-new-note-project">Project</label>
      <select id="board-new-note-project" value={projectId} required disabled={loading || loadError || busy}
        autoFocus onChange={(event) => { setProjectId(event.currentTarget.value); setError(null); }}>
        <option value="">{loading ? 'Loading projects…' : 'Choose a project'}</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        <option value={NEW_PROJECT}>New project…</option>
      </select>
      {loadError && <div role="alert">
        <p>Could not load projects.</p>
        <button type="button" className={boardStyles.button} onClick={() => setAttempt((current) => current + 1)}>Retry projects</button>
      </div>}
      {creatingProject && <>
        <label htmlFor="board-new-project-name">Project name</label>
        <input id="board-new-project-name" value={projectName} required maxLength={200} disabled={busy}
          onChange={(event) => setProjectName(event.currentTarget.value)} />
      </>}
      <label htmlFor="board-new-note-name">Note title</label>
      <input id="board-new-note-name" value={title} required maxLength={300} disabled={busy}
        onChange={(event) => setTitle(event.currentTarget.value)} />
      {error && <p role="alert">{error}</p>}
      <div className={boardStyles.dialogActions}>
        <button type="button" className={boardStyles.button} disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="submit" className={boardStyles.primaryButton}
          disabled={loading || loadError || busy || !title.trim() || !validProject}>
          {busy ? 'Creating…' : error ? 'Retry creating note' : 'Create note'}
        </button>
      </div>
    </form>
  </dialog>;
}
