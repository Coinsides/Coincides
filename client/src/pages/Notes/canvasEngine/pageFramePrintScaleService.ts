import type {
  DocumentTypographyProfile,
  PageFrameModel,
  PageFramePageSize,
  PageFramePrintProfile,
  PageFrameTemplateId,
} from './types';
import {
  createDefaultDocumentTypographyProfile,
  normalizeDocumentTypographyProfile,
} from './typographyProfileService';

export {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  createDefaultDocumentTypographyProfile,
  documentTypographyToCssVars,
} from './typographyProfileService';

export const DEFAULT_PAGE_FRAME_PAGE_SIZE: Exclude<PageFramePageSize, 'Custom'> = 'A4';

const DEFAULT_CONTENT_WIDTH = 760;
const DEFAULT_HORIZONTAL_MARGIN = 72;
const DEFAULT_BOTTOM_MARGIN = 96;

export const PAGE_FRAME_PRINT_PRESETS: Record<Exclude<PageFramePageSize, 'Custom'>, Omit<PageFramePrintProfile, 'documentTypography' | 'physicalWidthMm' | 'physicalScale'>> = {
  A4: {
    pageSize: 'A4',
    width: DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2,
    height: Math.round((DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2) * Math.SQRT2),
    contentInset: {
      top: 0,
      right: DEFAULT_HORIZONTAL_MARGIN,
      bottom: DEFAULT_BOTTOM_MARGIN,
      left: DEFAULT_HORIZONTAL_MARGIN,
    },
    contentWidth: DEFAULT_CONTENT_WIDTH,
    contentHeight: Math.round((DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2) * Math.SQRT2)
      - DEFAULT_BOTTOM_MARGIN,
  },
  Letter: {
    pageSize: 'Letter',
    width: DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2,
    height: Math.round((DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2) * (11 / 8.5)),
    contentInset: {
      top: 0,
      right: DEFAULT_HORIZONTAL_MARGIN,
      bottom: DEFAULT_BOTTOM_MARGIN,
      left: DEFAULT_HORIZONTAL_MARGIN,
    },
    contentWidth: DEFAULT_CONTENT_WIDTH,
    contentHeight: Math.round((DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2) * (11 / 8.5))
      - DEFAULT_BOTTOM_MARGIN,
  },
};

export function getPageFramePhysicalMapping(
  pageSize: PageFramePageSize,
  internalWidth: number,
  templateId?: PageFrameTemplateId,
): Pick<PageFramePrintProfile, 'physicalWidthMm' | 'physicalScale'> {
  const physicalWidthMm = pageSize === 'Custom'
    ? null
    : pageSize === 'Letter' ? 215.9 : 210;
  return {
    physicalWidthMm,
    // Continuous presentation scale: only derived typography is quantized.
    physicalScale: physicalWidthMm === null || templateId === 'screen_note'
      ? 1
      : (physicalWidthMm / 25.4 * 96) / internalWidth,
  };
}

export function createPageFramePrintProfile(
  pageSize: PageFramePageSize = DEFAULT_PAGE_FRAME_PAGE_SIZE,
  typography: DocumentTypographyProfile = createDefaultDocumentTypographyProfile(),
): PageFramePrintProfile {
  const preset = pageSize === 'Custom'
    ? PAGE_FRAME_PRINT_PRESETS[DEFAULT_PAGE_FRAME_PAGE_SIZE]
    : PAGE_FRAME_PRINT_PRESETS[pageSize] || PAGE_FRAME_PRINT_PRESETS[DEFAULT_PAGE_FRAME_PAGE_SIZE];
  return {
    ...preset,
    pageSize,
    ...getPageFramePhysicalMapping(pageSize, preset.width),
    documentTypography: normalizeDocumentTypographyProfile(typography),
  };
}

export function normalizePageFramePrintBaseline(pageFrame: PageFrameModel): PageFrameModel {
  const pageSize = pageFrame.pageSize || DEFAULT_PAGE_FRAME_PAGE_SIZE;
  if (pageSize === 'Custom') {
    return {
      ...pageFrame,
      pageSize,
      contentInset: pageFrame.contentInset,
    };
  }

  const profile = createPageFramePrintProfile(pageSize);
  const shouldApplyPresetGeometry = !pageFrame.pageSize;
  return {
    ...pageFrame,
    pageSize,
    width: shouldApplyPresetGeometry ? profile.width : pageFrame.width,
    height: Math.max(shouldApplyPresetGeometry ? profile.height : pageFrame.height, profile.height),
    contentInset: shouldApplyPresetGeometry ? profile.contentInset : pageFrame.contentInset,
  };
}
