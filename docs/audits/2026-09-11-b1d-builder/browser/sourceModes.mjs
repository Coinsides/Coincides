import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const headerFiles = new Set([
  'client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.tsx',
  'client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.module.css',
  'client/src/pages/Notes/canvasEngine/layers/NoteCoverMetadata.module.css',
  'client/src/styles/skinComponentStyles.ts',
]);
export function baselinePlugin(root, audit, mode) {
  return { name: `b1d-${mode}-original-module-source`, enforce: 'pre', load(id) {
    const normalized = id.split('?')[0].replaceAll('\\', '/');
    const normalizedRoot = root.replaceAll('\\', '/') + '/';
    if (!normalized.startsWith(normalizedRoot + 'client/')) return null;
    const relative = normalized.slice(normalizedRoot.length);
    const source = resolve(audit, '../baseline-source', relative);
    if (mode === 'header-baseline' && relative.endsWith('/hooks/useNoteSkin.ts')) {
      // Keep every current material call; roll back ONLY the old title-weight override.
      const current = readFileSync(id.split('?')[0], 'utf8');
      const needle = '...buildSkinComponentStyles(resolved.components),';
      if (!current.includes(needle) || !current.includes('...buildPaperMaterialStyles(')) {
        throw new Error('Header compensation requires review: skin spread or material call changed.');
      }
      return current.replace(needle, needle + " '--sk-paper-title-weight': resolved.preset === 'quiet-ink' ? '400' : '700',");
    }
    if (existsSync(source) && (mode === 'baseline' || headerFiles.has(relative))) return readFileSync(source, 'utf8');
    return null;
  } };
}
