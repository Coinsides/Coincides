import {
  createPageFramePrintProfile,
  getPageFramePhysicalMapping,
} from './pageFramePrintScaleService';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  hasDocumentTypographyProfileOverride,
  normalizeDocumentTypographyProfile,
} from './typographyProfileService';
import type {
  DocumentTypographyProfile,
  NoteCanvasMode,
  PageFrameModel,
} from './types';

export function getPageFrameTypographyFamily(
  frame?: Pick<PageFrameModel, 'templateId' | 'pageSize'>,
): 'paper' | 'web' {
  if (frame?.templateId === 'screen_note') return 'web';
  if (frame?.templateId === 'a4_portrait' || frame?.templateId === 'letter_portrait') return 'paper';
  return frame?.pageSize === 'Custom' ? 'web' : 'paper';
}

export function createPageFrameDefaultTypographyProfile(
  frame?: Partial<PageFrameModel>,
): DocumentTypographyProfile {
  const family = getPageFrameTypographyFamily(frame);
  const baseline = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE;
  const pageSize = frame?.pageSize
    ?? (frame?.templateId === 'letter_portrait' ? 'Letter' : 'A4');
  const printProfile = createPageFramePrintProfile(pageSize);
  const { physicalScale } = getPageFramePhysicalMapping(
    pageSize,
    frame?.width ?? printProfile.width,
    frame?.templateId,
    frame?.paperSizeReferenceWidth,
  );
  // Paper defaults use 10pt; reading gears affect presentation scale only.
  // Physical mapping and the single normalization pass stay shared with print.
  const fontSizePx = family === 'paper' ? (10 * 96 / 72) / physicalScale : 16;
  const ratio = fontSizePx / baseline.fontSizePx;
  return normalizeDocumentTypographyProfile({
    ...baseline,
    profileId: family === 'paper' ? 'paper-document' : 'web-document',
    fontSizePx,
    lineHeightPx: family === 'paper' ? fontSizePx * 1.65 : baseline.lineHeightPx * ratio,
    paragraphSpacingPx: baseline.paragraphSpacingPx * ratio,
    averageCharWidthPx: baseline.averageCharWidthPx * ratio,
  });
}

export function resolveEffectiveDocumentTypographyProfile({
  metadata,
  pageFrames,
  hydratedProfile,
}: {
  surfaceMode: NoteCanvasMode;
  metadata: Record<string, unknown> | null | undefined;
  pageFrames: PageFrameModel[] | undefined;
  hydratedProfile: DocumentTypographyProfile;
}): DocumentTypographyProfile {
  if (hasDocumentTypographyProfileOverride(metadata)) {
    return hydratedProfile;
  }
  // A note has one effective profile: selection changes never change the family.
  return createPageFrameDefaultTypographyProfile(pageFrames?.[0]);
}
