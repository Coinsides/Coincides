/**
 * jsdom has no real layout engine, so this structure lock cannot measure pixels.
 * It locks only the mechanism: no fixed leading row column and an absolutely positioned gutter.
 */
// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { readFileSync } from 'node:fs';
// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

declare const process: { cwd(): string };

const noteDetailCss = readFileSync(
  resolve(process.cwd(), 'src/pages/Notes/NoteDetail.module.css'),
  'utf8',
) as string;

function cssRuleBody(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = noteDetailCss.match(new RegExp(`^\\s*${escapedSelector}\\s*\\{([^}]*)\\}`, 'm'));
  expect(match, `${selector} rule must exist`).not.toBeNull();
  return match?.[1] ?? '';
}

describe('text unit gutter de-occupation structure', () => {
  it('K-1 keeps the text unit row free of a fixed leading column', () => {
    const textUnitRowRule = cssRuleBody('.textUnitRow');

    expect(textUnitRowRule).not.toMatch(/grid-template-columns:\s*\d+px/);
  });

  it('K-2 positions the text unit gutter absolutely', () => {
    const textUnitGutterRule = cssRuleBody('.textUnitGutter');

    expect(textUnitGutterRule).toMatch(/position:\s*absolute\b/);
  });

  it('B10 keeps the handle visible without hover and smaller than the old 24px role control', () => {
    const gutter = cssRuleBody('.textUnitGutter');
    const buttons = [...noteDetailCss.matchAll(/^\s*\.textUnitGutterButton\s*\{([^}]*)\}/gm)]
      .map((match) => match[1]).join('\n');
    expect(gutter).toMatch(/opacity:\s*1\s*;/);
    expect(gutter).not.toMatch(/visibility:\s*hidden|display:\s*none/);
    expect(buttons).toMatch(/width:\s*14px\s*;/);
    expect(buttons).toMatch(/height:\s*20px\s*;/);
    expect(noteDetailCss).not.toMatch(/\.textUnitRoleSelect\b/);
    expect(noteDetailCss).not.toMatch(/\.textUnitRow[^{}]*:hover[^{}]*\.textUnitGutter\s*\{/);
  });
});
