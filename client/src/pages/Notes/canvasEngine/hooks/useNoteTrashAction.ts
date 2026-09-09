import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import type { Note } from '../runtimeDataTypes';

export function useNoteTrashAction(note: Note | null): () => Promise<void> {
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);
  const noteId = note?.id;
  const courseId = note?.course_id;
  const actionScopeRef = useRef({ active: true });

  useEffect(() => {
    const scope = { active: true };
    actionScopeRef.current = scope;
    return () => { scope.active = false; };
  }, [courseId, noteId]);

  return useCallback(async () => {
    if (!noteId || !courseId) return;
    const scope = actionScopeRef.current;
    await api.delete(`/notes/${noteId}`);
    if (!scope.active) return;
    addToast('success', 'Note moved to Trash. You can restore it from the Project Trash tab.');
    navigate(`/projects/${courseId}`, { replace: true });
  }, [addToast, courseId, navigate, noteId]);
}
