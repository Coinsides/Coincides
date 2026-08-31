/**
 * jsdom has no layout engine, so numeric cases lock the centering formula while
 * source assertions lock its page-only wiring and the canvas zero-offset override.
 */
// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { readFileSync } from 'node:fs';
// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPageViewportCenteringOffsetX } from './viewportService';

declare const process: { cwd(): string };

const layerSource = readFileSync(
  resolve(process.cwd(), 'src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx'),
  'utf8',
) as string;
const cssSource = readFileSync(
  resolve(process.cwd(), 'src/pages/Notes/NoteDetail.module.css'),
  'utf8',
) as string;

function cssRuleBody(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = cssSource.match(new RegExp(`^\\s*${escapedSelector}\\s*\\{([^}]*)\\}`, 'm'));
  expect(match, `${selector} rule must exist`).not.toBeNull();
  return match?.[1] ?? '';
}

describe('page viewport centering contract', () => {
  it('computes the inverse offset from the post-sidebar main center', () => {
    expect(getPageViewportCenteringOffsetX(270, 1650, 1920)).toBe(-135);
    expect(getPageViewportCenteringOffsetX(60, 1860, 1920)).toBe(-30);
    expect(getPageViewportCenteringOffsetX(270, 1633, 1920)).toBe(-126.5);
  });

  it('wires the correction only in page mode', () => {
    expect(layerSource).toContain("surfaceMode !== 'page'");
    expect(layerSource).toContain('getPageViewportCenteringOffsetX(appMain.getBoundingClientRect().left, appMain.clientWidth, window.innerWidth)');
    expect(layerSource).toContain("surface.style.setProperty(\n      '--page-centering-offset-x'");
  });

  it('keeps canvas at zero presentation offset', () => {
    expect(cssRuleBody('.writingSurface')).toMatch(/left:\s*var\(--page-centering-offset-x,\s*0px\)/);
    expect(cssRuleBody('.writingSurfaceCanvas')).toMatch(/left:\s*0\b/);
  });
});
