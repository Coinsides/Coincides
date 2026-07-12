import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { openAuthenticatedSourceBlob } from './sourceApi';
import { sourceOpenBehavior, type SourceRecordDetail } from './sourceExperienceModel';

function actionError(error: unknown): string {
  return (error as any)?.response?.data?.error || 'Could not open the Source original';
}

export function useSourceActions(onShowDetails: (source: SourceRecordDetail) => void) {
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  const open = useCallback((source: SourceRecordDetail) => {
    const behavior = sourceOpenBehavior(source);
    if (behavior.primary === 'projection' && behavior.projectionNoteId) {
      navigate(`/notes/${behavior.projectionNoteId}`);
      return;
    }
    onShowDetails(source);
  }, [navigate, onShowDetails]);

  const original = useCallback(async (source: SourceRecordDetail) => {
    try {
      await openAuthenticatedSourceBlob(source, 'preview');
    } catch (error) {
      addToast('error', actionError(error));
    }
  }, [addToast]);

  const download = useCallback(async (source: SourceRecordDetail) => {
    try {
      await openAuthenticatedSourceBlob(source, 'download');
    } catch (error) {
      addToast('error', actionError(error));
    }
  }, [addToast]);

  return { open, original, download };
}
