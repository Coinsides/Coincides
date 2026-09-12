import { describe, expect, it } from 'vitest';
import {
  createPageFramePrintProfile,
  getPageFramePhysicalMapping,
} from './pageFramePrintScaleService';
import {
  createPageFrameDefaultTypographyProfile,
  getPageFrameTypographyFamily,
  resolveEffectiveDocumentTypographyProfile,
} from './pageFrameTypographyService';
import {
  createDefaultDocumentTypographyProfile,
  documentTypographyToCssVars,
  writeTypographyProfileMetadata,
} from './typographyProfileService';
import type { PageFrameModel, PageFramePageSize, PageFrameTemplateId } from './types';

function frameFixture(pageSize: 'A4' | 'Letter'): PageFrameModel {
  const print = createPageFramePrintProfile(pageSize);
  return {
    id: `frame-${pageSize}`,
    role: 'primary_page_frame',
    templateId: pageSize === 'A4' ? 'a4_portrait' : 'letter_portrait',
    pageSize,
    exportable: true,
    x: 0,
    y: 0,
    width: print.width,
    height: print.height,
    contentInset: { ...print.contentInset },
  };
}

describe('page-frame typography families and physical baseline', () => {
  const pageSizes: PageFramePageSize[] = ['A4', 'Letter', 'Custom'];
  const templateIds: PageFrameTemplateId[] = ['a4_portrait', 'letter_portrait', 'screen_note', 'custom'];

  it.each(templateIds.flatMap((templateId) => pageSizes.map((pageSize) => ({
    templateId,
    pageSize,
    expected: templateId === 'screen_note' || (templateId === 'custom' && pageSize === 'Custom')
      ? 'web' : 'paper',
  }))))('$templateId / $pageSize selects $expected by template identity', ({ templateId, pageSize, expected }) => {
    expect(getPageFrameTypographyFamily({ templateId, pageSize })).toBe(expected);
  });

  it.each([
    { pageSize: 'A4' as const, physicalWidthMm: 210 },
    { pageSize: 'Letter' as const, physicalWidthMm: 215.9 },
  ])('$pageSize keeps full-precision mapping and quantizes derived 11pt metrics only', ({ pageSize, physicalWidthMm }) => {
    const frame = frameFixture(pageSize);
    const geometryBefore = structuredClone(frame);
    const print = createPageFramePrintProfile(pageSize);
    const scale = (physicalWidthMm / 25.4 * 96) / print.width;
    expect(print.physicalWidthMm).toBe(physicalWidthMm);
    expect(print.physicalScale).toBe(scale);

    const profile = createPageFrameDefaultTypographyProfile(frame);
    const exactFontSize = (11 * 96 / 72) / scale;
    const exactMetrics = {
      fontSizePx: exactFontSize,
      lineHeightPx: exactFontSize * 22 / 15,
      paragraphSpacingPx: 0,
      averageCharWidthPx: exactFontSize * 0.48,
    };
    for (const metric of Object.keys(exactMetrics) as Array<keyof typeof exactMetrics>) {
      // Add only floating-point epsilon to the frozen single-rounding bound.
      expect(Math.abs(profile[metric] - exactMetrics[metric])).toBeLessThanOrEqual(0.05 + Number.EPSILON * 32);
      expect(profile[metric]).toBe(Math.round(exactMetrics[metric] * 10) / 10);
    }
    expect(Math.abs(profile.fontSizePx * scale * 72 / 96 - 11) / 11).toBeLessThanOrEqual(0.005);
    expect(documentTypographyToCssVars(profile)['--document-font-size']).toBe(`${profile.fontSizePx}px`);
    expect(frame).toEqual(geometryBefore);
  });

  it('reads an existing frame width for mapping without replacing its geometry', () => {
    const frame = { ...frameFixture('A4'), width: 1000 };
    const geometryBefore = structuredClone(frame);
    const mapping = getPageFramePhysicalMapping('A4', frame.width, frame.templateId);
    expect(mapping.physicalScale).toBe((210 / 25.4 * 96) / 1000);
    const profile = createPageFrameDefaultTypographyProfile(frame);
    expect(Math.abs(profile.fontSizePx - (11 * 96 / 72) / mapping.physicalScale)).toBeLessThanOrEqual(0.05);
    expect(frame).toEqual(geometryBefore);
  });

  it('keeps Custom and screen-note physical scale at 1 and supplies the 16px web family', () => {
    expect(createPageFramePrintProfile('Custom')).toMatchObject({ physicalWidthMm: null, physicalScale: 1 });
    expect(getPageFramePhysicalMapping('A4', 1120, 'screen_note')).toEqual({ physicalWidthMm: 210, physicalScale: 1 });
    for (const frame of [
      { templateId: 'screen_note' as const, pageSize: 'A4' as const, width: 1120 },
      { templateId: 'custom' as const, pageSize: 'Custom' as const, width: 904 },
    ]) {
      expect(createPageFrameDefaultTypographyProfile(frame)).toMatchObject({
        fontSizePx: 16,
        lineHeightPx: Math.round((16 * 22 / 15) * 10) / 10,
        paragraphSpacingPx: 0,
        averageCharWidthPx: Math.round((16 * 0.48) * 10) / 10,
      });
    }
  });

  it('preserves active user overrides even when they reuse the legacy default profile ID', () => {
    const hydratedProfile = createDefaultDocumentTypographyProfile({ fontSizePx: 20, lineHeightPx: 29 });
    const metadata = writeTypographyProfileMetadata({}, hydratedProfile);
    for (const surfaceMode of ['page'] as const) {
      for (const pageSize of ['A4', 'Letter'] as const) {
        expect(resolveEffectiveDocumentTypographyProfile({
          surfaceMode,
          metadata,
          pageFrames: [frameFixture(pageSize)],
          hydratedProfile,
        })).toBe(hydratedProfile);
      }
    }
  });

  it('uses the first frame only as the page default', () => {
    const hydratedProfile = createDefaultDocumentTypographyProfile();
    const a4 = frameFixture('A4');
    const letter = frameFixture('Letter');
    for (const pageFrames of [[a4, letter], [letter, a4]]) {
      expect(resolveEffectiveDocumentTypographyProfile({
        surfaceMode: 'page', metadata: {}, pageFrames, hydratedProfile,
      })).toEqual(createPageFrameDefaultTypographyProfile(pageFrames[0]));
    }
    expect(hydratedProfile).toMatchObject({ fontSizePx: 15, lineHeightPx: 22, averageCharWidthPx: 7.2 });
  });
});
