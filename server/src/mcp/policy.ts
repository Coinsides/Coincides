import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from '@modelcontextprotocol/server';
import type { LoadedToolFaceManifestEntry } from './manifest.js';

const MODERN_PROTOCOL_VERSION = '2026-07-28';

type RequestEnvelope = Record<string, unknown> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function supportsFormElicitation(envelope: RequestEnvelope): boolean {
  if (envelope?.[PROTOCOL_VERSION_META_KEY] !== MODERN_PROTOCOL_VERSION) return false;
  const capabilities = envelope[CLIENT_CAPABILITIES_META_KEY];
  if (!isRecord(capabilities)) return false;
  const elicitation = capabilities.elicitation;
  return isRecord(elicitation) && isRecord(elicitation.form);
}

export function resolveEffectiveTier(
  entry: LoadedToolFaceManifestEntry,
  envelope: RequestEnvelope,
  input: Record<string, unknown>,
): LoadedToolFaceManifestEntry['tier'] {
  if (entry.tier !== 'confirm') return entry.tier;

  const batchField = entry.threshold?.batch_field;
  if (
    typeof batchField === 'string'
    && Array.isArray(input[batchField])
    && input[batchField].length === 1
  ) {
    return 'immediate';
  }

  if (!supportsFormElicitation(envelope)) return 'propose';

  // b-2b-2 接 MRTR 前的声明性降级
  return 'propose';
}

export function requestHarness(envelope: RequestEnvelope): string {
  const clientInfo = envelope?.[CLIENT_INFO_META_KEY];
  if (!isRecord(clientInfo)) return 'mcp-client';
  const name = typeof clientInfo.name === 'string' && clientInfo.name.trim()
    ? clientInfo.name.trim()
    : 'mcp-client';
  const version = typeof clientInfo.version === 'string' && clientInfo.version.trim()
    ? clientInfo.version.trim()
    : null;
  return version ? `${name}/${version}` : name;
}
