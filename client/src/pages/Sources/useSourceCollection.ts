import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import {
  isActiveSourceState,
  type SourceRecordDetail,
} from './sourceExperienceModel';
import {
  listSources,
  materializeSource,
  precheckSource,
  retrySourceMaterialization,
  sha256File,
  uploadSource,
  type SourceIntakeTarget,
} from './sourceApi';

interface UseSourceCollectionOptions {
  courseId?: string;
  originEntryKind: SourceIntakeTarget['originEntryKind'];
}

function errorMessage(error: unknown, fallback: string): string {
  const responseMessage = (error as any)?.response?.data?.error;
  const detailMessage = (error as any)?.response?.data?.details?.message;
  return typeof responseMessage === 'string'
    ? responseMessage
    : typeof detailMessage === 'string'
      ? detailMessage
      : fallback;
}

export function useSourceCollection({ courseId, originEntryKind }: UseSourceCollectionOptions) {
  const addToast = useUIStore((state) => state.addToast);
  const [sources, setSources] = useState<SourceRecordDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const refreshRef = useRef<(silent?: boolean) => Promise<SourceRecordDetail[]>>(async () => []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const nextSources = await listSources(courseId);
      setSources(nextSources);
      setError(null);
      return nextSources;
    } catch (requestError) {
      const message = errorMessage(requestError, 'Failed to load Sources');
      setError(message);
      if (!silent) addToast('error', message);
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, [addToast, courseId]);

  refreshRef.current = refresh;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasActiveMaterialization = useMemo(
    () => sources.some(isActiveSourceState),
    [sources],
  );

  useEffect(() => {
    if (!hasActiveMaterialization) return undefined;

    const poll = () => {
      if (document.visibilityState === 'visible') void refreshRef.current(true);
    };
    const timer = window.setInterval(poll, 3_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hasActiveMaterialization]);

  const intake = useCallback(async (file: File) => {
    const target: SourceIntakeTarget = { courseId, originEntryKind };
    setUploading(true);
    setUploadProgress(0);
    try {
      const contentHash = await sha256File(file);
      const precheck = await precheckSource(contentHash, target);
      let source: SourceRecordDetail;
      if (precheck.exists && precheck.source) {
        source = precheck.source;
        addToast(
          'success',
          precheck.placement_created
            ? 'Source already existed and was added to this Project'
            : 'Source already exists in the library',
        );
      } else {
        const result = await uploadSource(file, target, setUploadProgress);
        source = result.source;
        addToast('success', result.deduplicated ? 'Existing Source reused' : 'Source received');
      }

      if (
        source.file.capability === 'materializable'
        && source.materialization.status === 'received'
      ) {
        await materializeSource(source.id);
      }
      await refresh(true);
      return source;
    } catch (requestError) {
      const message = errorMessage(requestError, 'Source upload failed');
      addToast('error', message);
      throw requestError;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [addToast, courseId, originEntryKind, refresh]);

  const retry = useCallback(async (sourceId: string) => {
    try {
      await retrySourceMaterialization(sourceId);
      addToast('info', 'Extraction retry started');
      await refresh(true);
    } catch (requestError) {
      addToast('error', errorMessage(requestError, 'Could not retry extraction'));
      throw requestError;
    }
  }, [addToast, refresh]);

  return {
    sources,
    loading,
    error,
    uploading,
    uploadProgress,
    hasActiveMaterialization,
    intake,
    refresh,
    retry,
  };
}
