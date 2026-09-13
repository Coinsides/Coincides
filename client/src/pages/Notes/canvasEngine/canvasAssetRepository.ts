import api from '@/services/api';
import type { CanvasImageAsset } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(raw: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return fallback;
}

function readOptionalString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  const value = readString(raw, keys, '');
  return value || undefined;
}

function readNumber(raw: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return fallback;
}

function readOptionalNumber(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function normalizeCanvasImageAsset(raw: unknown): CanvasImageAsset {
  const payload = isRecord(raw) ? raw : {};
  const assetId = readString(payload, ['assetId', 'asset_id', 'id']);
  return {
    assetId,
    kind: 'image',
    filename: readString(payload, ['filename'], 'image'),
    mimeType: readString(payload, ['mimeType', 'mime_type'], 'image/png'),
    byteSize: readNumber(payload, ['byteSize', 'byte_size']),
    width: readOptionalNumber(payload, ['width']),
    height: readOptionalNumber(payload, ['height']),
    sha256: readOptionalString(payload, ['sha256']),
    blobUrl: readString(payload, ['blobUrl', 'blob_url'], `/api/canvas-assets/${assetId}/blob`),
    metadata: isRecord(payload.metadata) ? payload.metadata : {},
  };
}

export async function uploadCanvasImageAsset(input: {
  noteId: string;
  file: File;
  width?: number;
  height?: number;
  source?: 'note_cover_upload';
}): Promise<CanvasImageAsset> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('note_id', input.noteId);
  if (input.source) form.append('source', input.source);
  if (input.width !== undefined) form.append('width', String(Math.max(0, Math.round(input.width))));
  if (input.height !== undefined) form.append('height', String(Math.max(0, Math.round(input.height))));
  const response = await api.post('/canvas-assets/images', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return normalizeCanvasImageAsset(response.data);
}

export async function loadCanvasImageAssetBlobUrl(assetId: string): Promise<string> {
  const response = await api.get(`/canvas-assets/${assetId}/blob`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
}
