import type {
  DocumentTypographyProfile,
} from './types';

export const NOTE_TYPOGRAPHY_PROFILE_METADATA_KEY = 'text_flow_typography_profile_v1';
export const DOCUMENT_TYPOGRAPHY_METADATA_VERSION = 'DocumentTypographyMetadataV1';

export const DOCUMENT_TYPOGRAPHY_LIMITS = {
  minFontSizePx: 10,
  maxFontSizePx: 28,
  minLineHeightPx: 14,
  maxLineHeightPx: 48,
  minParagraphSpacingPx: 0,
  maxParagraphSpacingPx: 32,
  minAverageCharWidthPx: 4,
  maxAverageCharWidthPx: 20,
} as const;

export const DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE: DocumentTypographyProfile = {
  profileId: 'default-document',
  fontFamily: 'Aptos, Calibri, "Segoe UI", Arial, sans-serif',
  fontSizePx: 15,
  lineHeightPx: 22,
  paragraphSpacingPx: 0,
  averageCharWidthPx: 7.2,
};

export const DOCUMENT_FONT_FAMILY_OPTIONS = [
  {
    id: 'system-sans',
    label: 'System Sans',
    value: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily,
  },
  {
    id: 'arial',
    label: 'Arial',
    value: 'Arial, sans-serif',
  },
  {
    id: 'georgia',
    label: 'Georgia',
    value: 'Georgia, serif',
  },
  {
    id: 'times-new-roman',
    label: 'Times New Roman',
    value: '"Times New Roman", Times, serif',
  },
  {
    id: 'cambria',
    label: 'Cambria',
    value: 'Cambria, Georgia, serif',
  },
  {
    id: 'consolas',
    label: 'Consolas',
    value: 'Consolas, "Courier New", monospace',
  },
  {
    id: 'inter',
    label: 'Inter',
    value: 'Inter, "Segoe UI", Arial, sans-serif',
  },
] as const;

export interface DocumentTypographyMetadataV1 {
  version: typeof DOCUMENT_TYPOGRAPHY_METADATA_VERSION;
  activeProfile: DocumentTypographyProfile;
}

const ALLOWED_FONT_FAMILY_VALUES = new Set(
  DOCUMENT_FONT_FAMILY_OPTIONS.map((option) => option.value),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeProfileId(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.profileId;
  const trimmed = value.trim();
  return trimmed || DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.profileId;
}

function normalizeFontFamily(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily;
  return ALLOWED_FONT_FAMILY_VALUES.has(trimmed)
    ? trimmed
    : DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily;
}

function isValidAverageCharWidth(value: number): boolean {
  return Number.isFinite(value)
    && value >= DOCUMENT_TYPOGRAPHY_LIMITS.minAverageCharWidthPx
    && value <= DOCUMENT_TYPOGRAPHY_LIMITS.maxAverageCharWidthPx;
}

export function estimateAverageCharWidthForTypography(
  profile: Pick<DocumentTypographyProfile, 'fontSizePx'>,
): number {
  return roundOne(clamp(
    profile.fontSizePx * 0.48,
    DOCUMENT_TYPOGRAPHY_LIMITS.minAverageCharWidthPx,
    DOCUMENT_TYPOGRAPHY_LIMITS.maxAverageCharWidthPx,
  ));
}

export function normalizeDocumentTypographyProfile(input: unknown): DocumentTypographyProfile {
  const rawProfile = isRecord(input) ? input : {};
  const fontSizePx = roundOne(clamp(
    finiteNumber(rawProfile.fontSizePx, DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontSizePx),
    DOCUMENT_TYPOGRAPHY_LIMITS.minFontSizePx,
    DOCUMENT_TYPOGRAPHY_LIMITS.maxFontSizePx,
  ));
  const minLineHeight = Math.max(fontSizePx + 2, DOCUMENT_TYPOGRAPHY_LIMITS.minLineHeightPx);
  const lineHeightPx = roundOne(clamp(
    finiteNumber(rawProfile.lineHeightPx, DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.lineHeightPx),
    minLineHeight,
    DOCUMENT_TYPOGRAPHY_LIMITS.maxLineHeightPx,
  ));
  const paragraphSpacingPx = roundOne(clamp(
    finiteNumber(rawProfile.paragraphSpacingPx, DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.paragraphSpacingPx),
    DOCUMENT_TYPOGRAPHY_LIMITS.minParagraphSpacingPx,
    DOCUMENT_TYPOGRAPHY_LIMITS.maxParagraphSpacingPx,
  ));
  const rawAverageCharWidth = finiteNumber(rawProfile.averageCharWidthPx, Number.NaN);
  const averageCharWidthPx = isValidAverageCharWidth(rawAverageCharWidth)
    ? roundOne(rawAverageCharWidth)
    : estimateAverageCharWidthForTypography({ fontSizePx });

  return {
    profileId: normalizeProfileId(rawProfile.profileId),
    fontFamily: normalizeFontFamily(rawProfile.fontFamily),
    fontSizePx,
    lineHeightPx,
    paragraphSpacingPx,
    averageCharWidthPx,
  };
}

export function createDefaultDocumentTypographyProfile(
  overrides: Partial<DocumentTypographyProfile> = {},
): DocumentTypographyProfile {
  const shouldDeriveAverageCharWidth = overrides.fontSizePx !== undefined
    && overrides.averageCharWidthPx === undefined;
  return normalizeDocumentTypographyProfile({
    ...DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    ...overrides,
    averageCharWidthPx: shouldDeriveAverageCharWidth
      ? undefined
      : overrides.averageCharWidthPx ?? DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.averageCharWidthPx,
  });
}

export function typographyProfileFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): DocumentTypographyProfile {
  const rawMetadata = metadata?.[NOTE_TYPOGRAPHY_PROFILE_METADATA_KEY];
  if (!isRecord(rawMetadata)) return createDefaultDocumentTypographyProfile();
  if (rawMetadata.version !== DOCUMENT_TYPOGRAPHY_METADATA_VERSION) {
    return normalizeDocumentTypographyProfile(rawMetadata);
  }
  return normalizeDocumentTypographyProfile(rawMetadata.activeProfile);
}

export function writeTypographyProfileMetadata(
  metadata: Record<string, unknown> | null | undefined,
  profile: DocumentTypographyProfile,
): Record<string, unknown> {
  const normalizedProfile = normalizeDocumentTypographyProfile(profile);
  return {
    ...(metadata || {}),
    [NOTE_TYPOGRAPHY_PROFILE_METADATA_KEY]: {
      version: DOCUMENT_TYPOGRAPHY_METADATA_VERSION,
      activeProfile: normalizedProfile,
    } satisfies DocumentTypographyMetadataV1,
  };
}

export function patchDocumentTypographyProfile(
  current: DocumentTypographyProfile,
  patch: Partial<DocumentTypographyProfile>,
): DocumentTypographyProfile {
  const shouldDeriveAverageCharWidth = patch.fontSizePx !== undefined
    && patch.averageCharWidthPx === undefined;
  return normalizeDocumentTypographyProfile({
    ...current,
    ...patch,
    averageCharWidthPx: shouldDeriveAverageCharWidth
      ? undefined
      : patch.averageCharWidthPx ?? current.averageCharWidthPx,
  });
}

export function documentTypographyToCssVars(
  typography: DocumentTypographyProfile = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
): Record<string, string> {
  const normalized = normalizeDocumentTypographyProfile(typography);
  return {
    '--document-font-family': normalized.fontFamily,
    '--document-font-size': `${normalized.fontSizePx}px`,
    '--document-line-height': `${normalized.lineHeightPx}px`,
    '--document-paragraph-spacing': `${normalized.paragraphSpacingPx}px`,
  };
}
