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

export interface PurposeInterpretation {
  true_goal?: string;
  territory?: string;
  behavior_pattern?: string;
  time_window?: string;
  draft_status?: 'pending' | 'ready' | 'failed';
}

export interface PurposeCard {
  id: string;
  title: string;
  intent: string | null;
  status: PurposeFrameV1['status'];
  created_by: PurposeFrameV1['created_by'];
  user_verbatim: string | null;
  interpretation: PurposeInterpretation;
  interpretation_locked: boolean;
  locked_at: string | null;
  member_count: number;
  updated_at: string;
}

export interface PurposeTrace {
  seq: number;
  ts: string;
  actor_kind: string;
  verb: string;
  summary: string;
}

export interface PurposeCardPatch {
  title?: string;
  intent?: string | null;
  user_verbatim?: string | null;
  interpretation?: Partial<Record<'true_goal' | 'territory' | 'behavior_pattern' | 'time_window', string | null>>;
  interpretation_locked?: boolean;
  status?: 'active' | 'archived';
}

export async function loadProjectPurposeCards(projectId: string): Promise<PurposeCard[]> {
  const response = await api.get('/purposes', { params: { project_id: projectId, status: 'active' } });
  return Array.isArray(response.data?.purposes) ? response.data.purposes as PurposeCard[] : [];
}

export async function loadPurposeCard(purposeId: string): Promise<PurposeCard> {
  const response = await api.get(`/purposes/${purposeId}`);
  return response.data.purpose as PurposeCard;
}

export async function amendPurposeCard(purposeId: string, patch: PurposeCardPatch): Promise<PurposeCard> {
  const response = await api.patch(`/purposes/${purposeId}`, patch);
  return response.data.purpose as PurposeCard;
}

export async function redraftPurposeCard(purposeId: string): Promise<PurposeCard> {
  const response = await api.post(`/purposes/${purposeId}/redraft`);
  return response.data.purpose as PurposeCard;
}

export async function loadPurposeTraces(purposeId: string, limit: number): Promise<PurposeTrace[]> {
  const response = await api.get(`/purposes/${purposeId}/traces`, { params: { limit } });
  return Array.isArray(response.data?.events) ? response.data.events as PurposeTrace[] : [];
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
