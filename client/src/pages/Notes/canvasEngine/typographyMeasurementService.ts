import {
  normalizeDocumentTypographyProfile,
} from './typographyProfileService';
import type {
  DocumentTypographyProfile,
} from './types';

const TYPOGRAPHY_TEXT_BLOCK_MIN_HEIGHT = 42;
const TYPOGRAPHY_TEXT_BLOCK_HORIZONTAL_CHROME = 18;
const TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME = 16;

export interface TypographyMeasurementInput {
  text: string;
  width: number;
  typography: DocumentTypographyProfile;
  title?: string | null;
  showPreview?: boolean;
  sourceReferenceCount?: number;
}

export interface TypographyTextBlockMeasurement {
  text: string;
  width: number;
  textWidth: number;
  charsPerLine: number;
  lineCount: number;
  heightPx: number;
  averageCharWidthPx: number;
  lineHeightPx: number;
  paragraphSpacingPx: number;
}

export function estimateAverageCharWidth(profile: DocumentTypographyProfile): number {
  return normalizeDocumentTypographyProfile(profile).averageCharWidthPx;
}

export function estimateTypographyTextBlockHeight({
  text,
  width,
  typography,
  title,
  showPreview = false,
  sourceReferenceCount = 0,
}: TypographyMeasurementInput): TypographyTextBlockMeasurement {
  const normalized = normalizeDocumentTypographyProfile(typography);
  const textWidth = Math.max(80, width - TYPOGRAPHY_TEXT_BLOCK_HORIZONTAL_CHROME);
  const averageCharWidthPx = estimateAverageCharWidth(normalized);
  const charsPerLine = Math.max(12, Math.floor(textWidth / averageCharWidthPx));
  const paragraphs = text.split('\n');
  const wrappedRows = paragraphs.reduce(
    (total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  );
  const titleRows = title ? 1 : 0;
  const lineCount = Math.max(1, wrappedRows) + titleRows;
  const paragraphSpacingPx = Math.max(0, paragraphs.length - 1) * normalized.paragraphSpacingPx;
  const previewExtra = showPreview ? 72 : 0;
  const sourceExtra = sourceReferenceCount > 0 ? 34 : 0;
  const heightPx = Math.max(
    TYPOGRAPHY_TEXT_BLOCK_MIN_HEIGHT,
    TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME
      + lineCount * normalized.lineHeightPx
      + paragraphSpacingPx
      + previewExtra
      + sourceExtra,
  );

  return {
    text,
    width,
    textWidth,
    charsPerLine,
    lineCount,
    heightPx,
    averageCharWidthPx,
    lineHeightPx: normalized.lineHeightPx,
    paragraphSpacingPx: normalized.paragraphSpacingPx,
  };
}

export function estimatePageFrameLineCapacity({
  contentHeight,
  typography,
}: {
  contentHeight: number;
  typography: DocumentTypographyProfile;
}): number {
  const normalized = normalizeDocumentTypographyProfile(typography);
  return Math.max(1, Math.floor(contentHeight / normalized.lineHeightPx));
}
