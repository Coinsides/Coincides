/**
 * This is a source-text lock for the absent page-mode CSS class reference.
 * It verifies only that the source no longer references that nonexistent class;
 * it does not verify the runtime DOM class list, which would require rendering the full canvas tree.
 */
// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { readFileSync } from 'node:fs';
// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

declare const process: { cwd(): string };

const writingSurfaceSource = readFileSync(
  resolve(process.cwd(), 'src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx'),
  'utf8',
) as string;

describe('writing surface class-name source contract', () => {
  it('K-1 does not reference the nonexistent page-mode CSS class', () => {
    expect(writingSurfaceSource).not.toContain('styles.writingSurfacePage');
  });
});
