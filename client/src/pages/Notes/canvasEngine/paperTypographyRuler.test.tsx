import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TableBlockProjection } from './blocks/TableBlockProjection';
import tableCss from './blocks/TableBlockProjection.module.css?raw';
import tableClasses from './blocks/TableBlockProjection.module.css';
import noteCss from '../NoteDetail.module.css?raw';
import { createPageFramePrintProfile } from './pageFramePrintScaleService';
import { createPageFrameDefaultTypographyProfile } from './pageFrameTypographyService';
import { derivePageReadingViewport, type PageReadingGear } from './pageReadingViewportService';
import { documentTypographyToCssVars } from './typographyProfileService';
import { typographyTextCssProperties, typographyTextMetrics } from './typographyMeasurementService';

const print = createPageFramePrintProfile('A4');
const profile = createPageFrameDefaultTypographyProfile({ ...print, templateId: 'a4_portrait' });
const variables = documentTypographyToCssVars(profile);
let sheet: HTMLStyleElement | undefined;

afterEach(() => { cleanup(); sheet?.remove(); });

function mountProductionStyles() {
  // jsdom 26 does not substitute custom properties. Expand only production
  // document variables; its CSSOM still parses and simplifies the real calc().
  // No expected font sizes, layout rectangles or getComputedStyle mocks.
  let css = tableCss.replace(/var\((--document-[\w-]+)(?:,[^()]*)?\)/g,
    (expression, key: string) => variables[key] ?? expression);
  // Vitest's CSS module proxy exposes names on lookup, not enumeration.
  for (const name of new Set([...tableCss.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(match => match[1]))) {
    css = css.replace(new RegExp(`\\.${name}\\b`, 'g'), `.${tableClasses[name]}`);
  }
  const slot = noteCss.match(/\.pageFrameSlot\s*\{([^}]+)\}/);
  expect(slot).not.toBeNull();
  sheet = document.createElement('style');
  sheet.textContent = `${css}\n.ruler-slot {${slot![1]}}`;
  document.head.append(sheet);
}

function inheritedFontPx(element: Element): number {
  // jsdom leaves inherited table fonts and absolute calc(px) serialized.
  // Walk the actual computed cascade, then unwrap only a reduced pixel value.
  const value = getComputedStyle(element).fontSize;
  if ((!value || value === 'inherit') && element.parentElement) {
    return inheritedFontPx(element.parentElement);
  }
  const pixels = value.match(/^(?:calc\()?([\d.]+)px\)?$/);
  expect(pixels, `computed font must resolve to pixels: ${value}`).not.toBeNull();
  return Number(pixels![1]);
}

describe('T3 paper typography ruler (same layout scale, computed / 904 * 900)', () => {
  it.each((['A4', 'Letter'] as const).flatMap(pageSize =>
    (['fit_width', 'fit_page', 'physical'] as PageReadingGear[])
      .flatMap(gear => [0.5, 1, 1.5, 2].map(stepFactor => ({ pageSize, gear, stepFactor })))))(
    '$pageSize / $gear at step $stepFactor keeps the body ruler and open line rhythm', ({ pageSize, gear, stepFactor }) => {
      const print = createPageFramePrintProfile(pageSize);
      const profile = createPageFrameDefaultTypographyProfile({ ...print,
        templateId: pageSize === 'A4' ? 'a4_portrait' : 'letter_portrait' });
      const reading = derivePageReadingViewport({
        viewState: { gear, stepFactor }, availableWidth: 665, availableHeight: 720,
        paperWidth: print.width, paperHeight: print.height, physicalScale: print.physicalScale,
      });
      const { getByTestId } = render(<div data-testid="paper" style={{
        width: print.width, transform: `scale(${reading.displayScale})`,
      }}><p data-testid="body" style={typographyTextCssProperties(typographyTextMetrics({
        text: 'Paper typography 标尺', width: print.contentWidth, typography: profile,
      }))}>Paper typography 标尺</p></div>);
      const paper = getByTestId('paper');
      const body = getByTestId('body');
      const font = inheritedFontPx(body);
      expect(getComputedStyle(paper).width).toBe('904px');
      const equivalent = font / 904 * 900;
      // Independent physical ruler: 10pt at this paper width, with the existing
      // single 0.1px quantization (never a wider shared A4/Letter tolerance band).
      const physicalWidthMm = pageSize === 'A4' ? 210 : 215.9;
      const exactFont = (10 * 96 / 72) / ((physicalWidthMm / 25.4 * 96) / 904);
      const roundedFont = Math.round(exactFont * 10) / 10;
      expect(font).toBe(roundedFont);
      expect(Math.abs(equivalent - exactFont / 904 * 900)).toBeLessThanOrEqual(0.05 / 904 * 900);
      expect(equivalent).toBeCloseTo(pageSize === 'A4' ? 15.13274336 : 14.73451327, 7);
      const lineRatio = Number.parseFloat(getComputedStyle(body).lineHeight) / font;
      expect(lineRatio).toBeGreaterThanOrEqual(1.60);
      expect(lineRatio).toBeLessThanOrEqual(1.75);
      // Both operands must use the display scale if normalized after scaling.
      expect(font * reading.displayScale / (904 * reading.displayScale) * 900).toBeCloseTo(equivalent, 10);
    });

  it.each([3, 8])('keeps a %i-column table content-sized, centered and bounded with the 0.85 cell tier', columns => {
    mountProductionStyles();
    const { container, getByRole } = render(<div style={{ width: print.contentWidth }}>
      <TableBlockProjection block={{ block_type: 'table', content_json: {
        headers: [], rows: [Array.from({ length: columns }, (_, i) => `Column ${i + 1}`)],
      } }} />
    </div>);
    const table = getByRole('table');
    const cell = container.querySelector('td')!;
    const style = getComputedStyle(table);
    expect(style.width).toBe('fit-content');
    expect(style.maxWidth).toBe('100%');
    expect(style.minWidth).not.toBe('100%');
    expect(style.marginLeft).toBe('auto');
    expect(style.marginRight).toBe('auto');
    expect(getComputedStyle(cell).minWidth).toBe('0');
    expect(getComputedStyle(cell).overflowWrap).toBe('anywhere');
    const cellRatio = inheritedFontPx(cell) / profile.fontSizePx;
    expect(cellRatio).toBeGreaterThanOrEqual(0.82);
    expect(cellRatio).toBeLessThanOrEqual(0.88);
    expect(cellRatio).toBeCloseTo(0.85, 8);
  });

  it('keeps the existing binding furniture at 12px layout / 11.94690px normalized', () => {
    mountProductionStyles();
    const { getByText } = render(<span className="ruler-slot">1</span>);
    expect(inheritedFontPx(getByText('1'))).toBe(12);
    expect(inheritedFontPx(getByText('1')) / 904 * 900).toBeCloseTo(11.94690265, 7);
  });
});
