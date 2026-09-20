import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/services/api';
import type { NoteBindingSettings } from '@shared/types/noteBinding';
import { createDefaultNoteBindingSettings } from '../../../../../../shared/types/noteBinding';

const awaitingSettings = { ...createDefaultNoteBindingSettings(), enabled: false };

/** Binding is a human note subresource; the generic Note/tool response stays stable. */
export function useNoteBinding(noteId: string | undefined, persist: (value: NoteBindingSettings) => Promise<void>) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ noteId?: string; value: NoteBindingSettings | null; loading: boolean; error: string | null }>(
    { value: null, loading: true, error: null });
  const generation = useRef(0);
  const saveSequence = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    setState({ noteId, value: null, loading: true, error: null });
    if (noteId) void api.get<{ binding_settings: NoteBindingSettings | null }>(`/notes/${noteId}/binding-settings`)
      .then((response) => { if (generation.current === request) setState({ noteId, value: response.data.binding_settings, loading: false, error: null }); })
      .catch(() => { if (generation.current === request) setState({ noteId, value: null, loading: false, error: '装订设置加载失败' }); });
    return () => { generation.current += 1; };
  }, [noteId, revision]);
  const save = useCallback(async (value: NoteBindingSettings) => {
    const request = generation.current;
    const sequence = ++saveSequence.current;
    await persist(value);
    if (request === generation.current && sequence === saveSequence.current) setState({ noteId, value, loading: false, error: null });
  }, [persist, noteId]);
  const current = state.noteId === noteId ? state : { value: null, loading: true, error: null };
  return { ...current, value: current.loading || current.error ? awaitingSettings : current.value,
    save, retry: () => setRevision((value) => value + 1) };
}
