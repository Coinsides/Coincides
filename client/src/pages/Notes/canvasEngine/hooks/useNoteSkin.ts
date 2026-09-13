import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { readSkin, resolveSkin } from '@/styles/skinPresets';
import { buildPaperMaterialStyles, buildPaperSkinStyles } from '../paperSkinStyles';
import { buildSkinComponentStyles } from '@/styles/skinComponentStyles';
import type { Course } from '@shared/types';
import type { SkinSelection } from '@shared/types/skin';
import type { Note } from '../runtimeDataTypes';
import { usePaletteColors } from '@/hooks/usePaletteColors';
import { normalizeSkinSelection, useSkinSuites } from '@/hooks/useSkinSuites';

export function useNoteSkin(note: Note | null, save: (skin: SkinSelection | null) => Promise<void>, saveError = false) {
  const palette = usePaletteColors();
  const suites = useSkinSuites();
  const [previewState, setPreviewState] = useState<{ noteId: string; selection: SkinSelection } | null>(null);
  const noteId = note?.id;
  useEffect(() => { setPreviewState(null); }, [noteId]);
  const preview = useCallback((selection: SkinSelection | null) => {
    setPreviewState(noteId && selection ? { noteId, selection } : null);
  }, [noteId]);
  const global = useAuthStore((s) => s.user?.settings.skin);
  const [project, setProject] = useState<{ id: string; skin: SkinSelection | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const courseId = note?.course_id;
  useEffect(() => {
    if (!courseId) return;
    let active = true;
    setError(null);
    void api.get<{ course: Course }>(`/courses/${courseId}/summary`).then(({ data }) => {
      if (active) setProject({ id: courseId, skin: readSkin(data.course.skin) });
    }, () => { if (active) setError('项目外观未加载，暂用全局外观。'); });
    return () => { active = false; };
  }, [courseId, attempt]);
  const selection = useMemo(() => normalizeSkinSelection(readSkin(note?.metadata?.skin)), [note?.metadata?.skin, suites.detached, palette.detached]);
  const inheritedSelection = normalizeSkinSelection((project && project.id === courseId ? project.skin : null) ?? readSkin(global));
  const resolved = useMemo(() => resolveSkin(normalizeSkinSelection(readSkin(global)), normalizeSkinSelection(project && project.id === courseId ? project.skin : null), selection, palette.values, suites.values), [global, project, courseId, selection, palette.values, suites.values, suites.detached]);
  const renderedResolved = useMemo(() => previewState && previewState.noteId === noteId
    ? resolveSkin(null, null, previewState.selection, palette.values, suites.values) : resolved,
  [previewState, noteId, palette.values, suites.values, resolved]);
  const style = useMemo(() => ({ ...buildPaperSkinStyles(renderedResolved.tokens),
    ...buildPaperMaterialStyles(renderedResolved.tokens, renderedResolved.materialPreset ?? renderedResolved.preset), ...buildSkinComponentStyles(renderedResolved.components),
  }), [renderedResolved.tokens, renderedResolved.components, renderedResolved.materialPreset, renderedResolved.preset]);
  return { ...resolved, materialPreset: renderedResolved.materialPreset, style, selection, inheritedSelection, preview, committedResolved: resolved, renderedResolved,
    save: (skin: SkinSelection | null) => save(normalizeSkinSelection(skin)), saveError, error, retry: () => setAttempt((n) => n + 1) };
}
