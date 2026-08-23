import { readFileSync } from 'node:fs';
import type { ToolBinding } from './bindings.js';
// The server project references shared as a composite project, while its
// standalone no-emit gate intentionally does not build referenced outputs.
// This import is type-only/runtime-free; keep the shared declaration as the
// single manifest contract despite TS6305 in that standalone mode.
// @ts-ignore TS6305 -- shared composite output is not emitted by server --noEmit
import type { ToolFaceManifest, ToolFaceManifestEntry } from '../../../shared/types/toolFaceManifest.js';

export type LoadedToolFaceManifestEntry = ToolFaceManifestEntry;
export type LoadedToolFaceManifest = ToolFaceManifest;

/**
 * Both src/mcp and dist/mcp resolve this URL to server/dist. Development
 * commands prepare the same artifact before starting; production never falls
 * back to cwd, docs, or the runtime registry.
 */
export const TOOL_FACE_MANIFEST_URL = new URL(
  '../../dist/tool-face-manifest.json',
  import.meta.url,
);

export function loadToolFaceManifest(
  manifestUrl: URL = TOOL_FACE_MANIFEST_URL,
): LoadedToolFaceManifest {
  const parsed = JSON.parse(readFileSync(manifestUrl, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Tool-face manifest artifact must contain a JSON array');
  }
  return parsed as LoadedToolFaceManifest;
}

export function publicToolFaceEntries(
  manifest: readonly LoadedToolFaceManifestEntry[],
): LoadedToolFaceManifestEntry[] {
  return manifest
    .filter((entry) => entry.exposure === 'public')
    .filter((entry) => !entry.name.startsWith('__'));
}

export function assertToolBindingParity(
  entries: readonly LoadedToolFaceManifestEntry[],
  bindings: ReadonlyMap<string, ToolBinding>,
): void {
  const manifestNames = entries.map((entry) => entry.name);
  const uniqueManifestNames = new Set(manifestNames);
  if (uniqueManifestNames.size !== manifestNames.length) {
    throw new Error('Filtered tool-face manifest contains duplicate names');
  }

  const bindingNames = [...bindings.keys()];
  const missing = manifestNames.filter((name) => !bindings.has(name));
  const extra = bindingNames.filter((name) => !uniqueManifestNames.has(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Tool binding parity mismatch (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`,
    );
  }
}
