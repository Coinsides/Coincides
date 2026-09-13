import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { readSkin, resolveSkin } from '@/styles/skinPresets';
import type { Course, SkinSelection } from '@shared/types';
import type { Board, PatchBoardInput } from './boardTypes';
import { buildBoardSkinStyles } from './boardSkinStyles';
import { saveSkinWithPalette, usePaletteColors } from '@/hooks/usePaletteColors';

export function useBoardSkin(board: Board | null, update: (input: PatchBoardInput) => Promise<boolean>) {
  const palette = usePaletteColors();
  const global = useAuthStore((state) => state.user?.settings.skin);
  const [project, setProject] = useState<{ id: string; skin: SkinSelection | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const projectId = board?.project_id;
  useEffect(() => {
    setError(null);
    if (!projectId) return;
    let active = true;
    void api.get<{ course: Course }>(`/courses/${projectId}/summary`).then(({ data }) => {
      if (active) setProject({ id: projectId, skin: readSkin(data.course.skin) });
    }).catch(() => { if (active) setError('项目外观未加载，暂用全局外观。'); });
    return () => { active = false; };
  }, [projectId, attempt]);
  const selection = useMemo(() => readSkin(board?.skin), [board?.skin]);
  const inheritedSelection = (project && project.id === projectId ? project.skin : null) ?? readSkin(global);
  const resolved = useMemo(() => resolveSkin(readSkin(global), project && project.id === projectId ? project.skin : null, selection, palette.values),
    [global, project, projectId, selection, palette.values]);
  const style = useMemo(() => buildBoardSkinStyles(resolved), [resolved]);
  // useBoard owns intent identity, write ordering, error reporting and navigation.
  const save = (skin: SkinSelection | null) => saveSkinWithPalette(skin, async (normalized) => {
    if (!await update({ skin: normalized })) throw new Error('Board appearance was not saved');
  });
  return { ...resolved, style, selection, inheritedSelection, save, error, retry: () => setAttempt((value) => value + 1) };
}
