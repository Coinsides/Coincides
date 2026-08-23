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
  requestedTier: LoadedToolFaceManifestEntry['tier'],
  envelope: RequestEnvelope,
): LoadedToolFaceManifestEntry['tier'] {
  if (requestedTier === 'confirm' && !supportsFormElicitation(envelope)) {
    return 'propose';
  }
  return requestedTier;
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
