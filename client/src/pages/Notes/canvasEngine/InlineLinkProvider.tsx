import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useInRouterContext, useNavigate, type NavigateFunction } from 'react-router-dom';
import api from '@/services/api';
import { documentPath, useDocumentTabsStore } from '@/stores/documentTabsStore';
import { InlineLinkContext, type InlineLinkNote } from './InlineLinkContext';
import type { ChapterProjection } from './chapterProjectionService';
import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import type { InlineLinkTarget } from './inlineLinkService';
import { getTextFlowContent } from './textFlowService';

function RouterBridge({ navigation }: { navigation: React.MutableRefObject<NavigateFunction | null> }) {
  const navigate = useNavigate();
  useEffect(() => { navigation.current = navigate; return () => { navigation.current = null; }; }, [navigate, navigation]);
  return null;
}

export function InlineLinkProvider({ noteId, projectId, chapters, blocks, drafts, onSelectChapter, onSelectBlock, children }: {
  noteId: string; projectId: string; chapters: ChapterProjection; blocks: readonly NoteBlock[];
  drafts: Record<string, TextBlockContentV1>; onSelectChapter: (id: string) => void;
  onSelectBlock: (id: string) => void; children: ReactNode;
}) {
  const inRouter = useInRouterContext();
  const navigation = useRef<NavigateFunction | null>(null);
  const [list, setList] = useState<{ scope: string; notes: InlineLinkNote[]; state: 'loading' | 'ready' | 'error' }>(
    { scope: projectId, notes: [], state: 'loading' });
  const scope = useRef({ noteId, projectId });
  scope.current = { noteId, projectId };
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  const refreshNotes = useCallback(async () => {
    const version = ++request.current;
    try {
      const { data } = await api.get<InlineLinkNote[]>('/notes', { params: { course_id: projectId, status: 'active' } });
      if (scope.current.projectId !== projectId || scope.current.noteId !== noteId || version !== request.current) return null;
      const notes = data.filter((note) => note.course_id === projectId && note.status === 'active');
      setList({ scope: projectId, notes, state: 'ready' });
      return notes;
    } catch {
      if (scope.current.projectId === projectId && scope.current.noteId === noteId && version === request.current) {
        setList({ scope: projectId, notes: [], state: 'error' });
      }
      return null;
    }
  }, [noteId, projectId]);
  const hasNoteLinks = blocks.some((block) => (drafts[block.id] ?? getTextFlowContent(block.content_json))
    ?.inline_structures.some((record) => record.semantic_kind === 'inline_link' && record.status !== 'deleted'
      && record.field_values.target_kind === 'note'));
  useEffect(() => {
    if (!hasNoteLinks) return;
    void refreshNotes();
    const refresh = () => { void refreshNotes(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [hasNoteLinks, refreshNotes]);
  const notes = list.scope === projectId ? list.notes : [];
  const notesState = list.scope === projectId ? list.state : 'loading';
  const resolve = (target: InlineLinkTarget) => target.target_kind === 'heading'
    ? chapters.agenda.some((chapter) => chapter.blockId === target.block_id && chapter.unitId === target.unit_id)
    : target.target_kind === 'block' ? blocks.some((block) => block.id === target.block_id)
      : notesState === 'ready' && notes.some((note) => note.id === target.note_id);
  const navigate = async (target: InlineLinkTarget) => {
    if (!resolve(target)) return;
    if (target.target_kind === 'heading') {
      const chapter = chapters.agenda.find((entry) => entry.blockId === target.block_id && entry.unitId === target.unit_id);
      if (chapter) onSelectChapter(chapter.id);
    } else if (target.target_kind === 'block') onSelectBlock(target.block_id);
    else {
      // Re-read the same project list before opening: a deletion since render stays inert.
      const current = await refreshNotes();
      const note = current?.find((entry) => entry.id === target.note_id);
      if (!note || !navigation.current || scope.current.noteId !== noteId || scope.current.projectId !== projectId) return;
      const tab = { kind: 'note' as const, id: note.id, title: note.title, projectId };
      useDocumentTabsStore.getState().open(tab);
      navigation.current(documentPath(tab));
    }
  };
  return <InlineLinkContext.Provider value={{ chapters, blocks, notes, notesState, refreshNotes, resolve, navigate }}>
    {inRouter && <RouterBridge navigation={navigation} />}{children}
  </InlineLinkContext.Provider>;
}
