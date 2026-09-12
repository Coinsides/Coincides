import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { readSkin, resolveSkin } from '@/styles/skinPresets';
import { buildPaperSkinStyles } from '../paperSkinStyles';
import { buildSkinComponentStyles } from '@/styles/skinComponentStyles';
import type { Course } from '@shared/types';
import type { SkinSelection } from '@shared/types/skin';
import type { Note } from '../runtimeDataTypes';

export function useNoteSkin(note: Note | null, save: (skin: SkinSelection | null) => Promise<void>, saveError = false) {
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
  const selection = useMemo(() => readSkin(note?.metadata?.skin), [note?.metadata?.skin]);
  const inheritedSelection = (project && project.id === courseId ? project.skin : null) ?? readSkin(global);
  const resolved = useMemo(() => resolveSkin(readSkin(global), project && project.id === courseId ? project.skin : null, selection), [global, project, courseId, selection]);
  const style = useMemo(() => ({ ...buildPaperSkinStyles(resolved.tokens), ...buildSkinComponentStyles(resolved.components),
    '--sk-paper-title-weight': resolved.preset === 'quiet-ink' ? '400' : '700',
  }), [resolved.tokens, resolved.components, resolved.preset]);
  return { ...resolved, style, selection, inheritedSelection, save, saveError, error, retry: () => setAttempt((n) => n + 1) };
}
