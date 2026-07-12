import api from '@/services/api';
import type { SourceRecordDetail } from './sourceExperienceModel';

export interface SourceIntakeTarget {
  courseId?: string;
  originEntryKind: 'project_upload' | 'library_upload';
}

export interface SourcePrecheckResult {
  exists: boolean;
  placement_created?: boolean;
  source?: SourceRecordDetail;
}

export interface SourceUploadResult {
  created: boolean;
  deduplicated: boolean;
  source: SourceRecordDetail;
}

export interface SourceDeletionImpact {
  source: { id: string; display_name: string };
  placement_count: number;
  receipt_count: number;
  projection_receipt_count: number;
  retained_receipt_count: number;
  projection_note_id: string | null;
  projection_user_work: {
    annotation_count: number;
    content_group_count: number;
    purpose_count: number;
    display_override_count: number;
    external_block_placement_count: number;
    has_user_work: boolean;
  } | null;
  materialization_status: string;
  deletion_blocked: boolean;
  blocked_reason: string | null;
}

export async function listSources(courseId?: string): Promise<SourceRecordDetail[]> {
  const response = await api.get<SourceRecordDetail[]>('/sources', {
    params: courseId ? { course_id: courseId } : undefined,
  });
  return response.data;
}

export async function getSource(sourceId: string): Promise<SourceRecordDetail> {
  const response = await api.get<SourceRecordDetail>(`/sources/${sourceId}`);
  return response.data;
}

export async function sha256File(file: File): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function precheckSource(
  contentHash: string,
  target: SourceIntakeTarget,
): Promise<SourcePrecheckResult> {
  const response = await api.post<SourcePrecheckResult>('/sources/precheck', {
    content_hash: contentHash,
    course_id: target.courseId,
    origin_entry_kind: target.originEntryKind,
  });
  return response.data;
}

export async function uploadSource(
  file: File,
  target: SourceIntakeTarget,
  onProgress?: (percent: number) => void,
): Promise<SourceUploadResult> {
  const payload = new FormData();
  payload.append('file', file);
  payload.append('origin_entry_kind', target.originEntryKind);
  if (target.courseId) payload.append('course_id', target.courseId);
  payload.append('file_mtime', new Date(file.lastModified).toISOString());

  const response = await api.post<SourceUploadResult>('/sources/upload', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!event.total || !onProgress) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    },
  });
  return response.data;
}

export async function materializeSource(sourceId: string): Promise<void> {
  await api.post(`/sources/${sourceId}/materialize`);
}

export async function retrySourceMaterialization(sourceId: string): Promise<void> {
  await api.post(`/sources/${sourceId}/retry`);
}

export async function getSourceDeletionImpact(sourceId: string): Promise<SourceDeletionImpact> {
  const response = await api.get<SourceDeletionImpact>(`/sources/${sourceId}/delete-impact`);
  return response.data;
}

export async function deleteSource(sourceId: string): Promise<void> {
  await api.delete(`/sources/${sourceId}`);
}

export async function openAuthenticatedSourceBlob(
  source: SourceRecordDetail,
  mode: 'preview' | 'download',
): Promise<void> {
  const previewWindow = mode === 'preview' ? window.open('about:blank', '_blank') : null;
  try {
    const response = await api.get<Blob>(source.file.blob_url, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(response.data);
    if (mode === 'download') {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = source.file.original_filename || source.display_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } else if (previewWindow) {
      previewWindow.opener = null;
      previewWindow.location.replace(objectUrl);
    } else {
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}
