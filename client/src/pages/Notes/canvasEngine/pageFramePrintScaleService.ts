import type {
  DocumentTypographyProfile,
  PageFrameModel,
  PageFramePageSize,
  PageFramePrintProfile,
  PageFrameTemplateId,
} from './types';
import { A4_PAGE_GEOMETRY } from '../../../../../shared/types/pageGeometry';
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
// New A4/Letter pages reserve the existing 18..48 px binding header lane.
// Explicit persisted insets, including top: 0, remain unchanged by normalization.
const DEFAULT_BINDING_TOP_MARGIN = 72;

export const PAPER_PHYSICAL_SIZES_MM = {
  A5: { width: 148, height: 210 },
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
} as const;

function additionalPrintPreset(pageSize: 'A5' | 'A3' | 'Legal') {
  const physical = PAPER_PHYSICAL_SIZES_MM[pageSize];
  const pixelsPerMm = A4_PAGE_GEOMETRY.width / (pageSize === 'Legal' ? 215.9 : 210);
  const width = physical.width * pixelsPerMm;
  const height = physical.height * pixelsPerMm;
  return { pageSize, width, height, contentInset: { ...A4_PAGE_GEOMETRY.contentInset },
    contentWidth: width - DEFAULT_HORIZONTAL_MARGIN * 2, contentHeight: height - DEFAULT_BOTTOM_MARGIN };
}

export const PAGE_FRAME_PRINT_PRESETS: Record<Exclude<PageFramePageSize, 'Custom'>, Omit<PageFramePrintProfile, 'documentTypography' | 'physicalWidthMm' | 'physicalScale'>> = {
  A5: additionalPrintPreset('A5'),
  A4: {
    pageSize: 'A4',
    width: A4_PAGE_GEOMETRY.width,
    height: A4_PAGE_GEOMETRY.height,
    contentInset: { ...A4_PAGE_GEOMETRY.contentInset, top: DEFAULT_BINDING_TOP_MARGIN },
    contentWidth: A4_PAGE_GEOMETRY.contentWidth,
    contentHeight: A4_PAGE_GEOMETRY.height - DEFAULT_BINDING_TOP_MARGIN - A4_PAGE_GEOMETRY.contentInset.bottom,
  },
  Letter: {
    pageSize: 'Letter',
    width: DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2,
    height: Math.round((DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2) * (11 / 8.5)),
    contentInset: {
      top: DEFAULT_BINDING_TOP_MARGIN,
      right: DEFAULT_HORIZONTAL_MARGIN,
      bottom: DEFAULT_BOTTOM_MARGIN,
      left: DEFAULT_HORIZONTAL_MARGIN,
    },
    contentWidth: DEFAULT_CONTENT_WIDTH,
    contentHeight: Math.round((DEFAULT_CONTENT_WIDTH + DEFAULT_HORIZONTAL_MARGIN * 2) * (11 / 8.5))
      - DEFAULT_BINDING_TOP_MARGIN - DEFAULT_BOTTOM_MARGIN,
  },
  A3: additionalPrintPreset('A3'),
  Legal: additionalPrintPreset('Legal'),
};

export function getPageFramePhysicalMapping(
  pageSize: PageFramePageSize,
  internalWidth: number,
  templateId?: PageFrameTemplateId,
  referenceWidth?: number,
): Pick<PageFramePrintProfile, 'physicalWidthMm' | 'physicalScale'> {
  const physical = pageSize === 'Custom' ? null : PAPER_PHYSICAL_SIZES_MM[pageSize];
  const nominalWidthMm = pageSize === 'Custom'
    ? null
    : templateId?.endsWith('_landscape') ? physical!.height : physical!.width;
  const anchoredWidth = referenceWidth && Number.isFinite(referenceWidth) && referenceWidth > 0
    ? referenceWidth : internalWidth;
  const physicalWidthMm = nominalWidthMm === null ? null : anchoredWidth === internalWidth
    ? nominalWidthMm : nominalWidthMm * internalWidth / anchoredWidth;
  return {
    physicalWidthMm,
    // Continuous presentation scale: only derived typography is quantized.
    physicalScale: physicalWidthMm === null || templateId === 'screen_note'
      ? 1
      : (nominalWidthMm! / 25.4 * 96) / anchoredWidth,
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
    // A4/Letter identify the paper family, not a minimum-height constraint.
    // Explicit per-frame geometry (including shorter variant pages) is truth.
    height: shouldApplyPresetGeometry ? profile.height : pageFrame.height,
    // A missing historical pageSize does not make its live walls disposable.
    // Fill missing inset edges only; in particular a stored top of 0 is valid.
    contentInset: {
      top: pageFrame.contentInset?.top ?? profile.contentInset.top,
      right: pageFrame.contentInset?.right ?? profile.contentInset.right,
      bottom: pageFrame.contentInset?.bottom ?? profile.contentInset.bottom,
      left: pageFrame.contentInset?.left ?? profile.contentInset.left,
    },
  };
}
