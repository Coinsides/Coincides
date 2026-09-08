import api from '@/services/api';
import {
  normalizePurposeCompiledScope,
  normalizePurposeFrames,
} from './purposeService';
import type {
  Note,
  PurposeCompiledScopeV1,
  PurposeFrameV1,
} from './runtimeDataTypes';

function responsePurposes(data: unknown): PurposeFrameV1[] {
  if (Array.isArray(data)) return normalizePurposeFrames(data as PurposeFrameV1[]);
  if (data && typeof data === 'object' && Array.isArray((data as { purposes?: unknown }).purposes)) {
    return normalizePurposeFrames((data as { purposes: PurposeFrameV1[] }).purposes);
  }
  return [];
}

export async function loadPurposeFramesForNote(input: {
  note: Note;
}): Promise<PurposeFrameV1[]> {
  const response = await api.get(`/purposes/by-note/${input.note.id}`);
  return responsePurposes(response.data);
}

/** Library souls are independent of notes; legacy note/default fields are read-only history. */
export async function loadLibraryPurposes(): Promise<PurposeFrameV1[]> {
  const response = await api.get('/purposes');
  return responsePurposes(response.data);
}

export async function loadPurposeCompiledScope(input: {
  purposeId: string;
  query?: string;
  limit?: number;
}): Promise<PurposeCompiledScopeV1> {
  const response = await api.get(`/purposes/${input.purposeId}/compiled-scope`, {
    params: {
      ...(input.query?.trim() ? { q: input.query.trim() } : {}),
      ...(Number.isFinite(input.limit) ? { limit: input.limit } : {}),
    },
  });
  return normalizePurposeCompiledScope(response.data || {});
}
