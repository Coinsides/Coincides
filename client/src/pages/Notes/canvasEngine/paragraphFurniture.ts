import type { NoteBlock } from './runtimeDataTypes';
import { presentationKindForBlock } from './blockContentService';
import { measureTypographyTextLines } from './typographyMeasurementService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';

/** Placement appearance only: the paragraph and its TextFlow remain unchanged. */
export const PARAGRAPH_FURNITURE_KEY = 'paragraph_furniture_v1';
export type ParagraphFurniture = { variant: 'quote'; source: string } | { variant: 'callout'; label: string };
export const FURNITURE_INSET = 24;
export const FURNITURE_TOP = 24;
export const FURNITURE_SOURCE_TYPOGRAPHY = {
  ...DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, fontSizePx: 13, lineHeightPx: 20, averageCharWidthPx: 7,
};

export function canStyleParagraph(block: NoteBlock): boolean {
  return (block.block_type === 'paragraph' || block.block_type === 'text')
    && presentationKindForBlock(block) === 'paragraph';
}

export function readParagraphFurniture(block: NoteBlock): ParagraphFurniture | null {
  if (!canStyleParagraph(block)) return null;
  const value = block.display_overrides_json?.[PARAGRAPH_FURNITURE_KEY];
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.variant === 'quote') return { variant: 'quote', source: typeof data.source === 'string' ? data.source : '' };
  if (data.variant === 'callout') return { variant: 'callout', label: typeof data.label === 'string' && data.label.trim() ? data.label : '注' };
  return null;
}

export function writeParagraphFurniture(block: NoteBlock, value: ParagraphFurniture | null): Record<string, unknown> {
  const overrides = { ...block.display_overrides_json };
  if (value) overrides[PARAGRAPH_FURNITURE_KEY] = { ...value };
  else delete overrides[PARAGRAPH_FURNITURE_KEY];
  return overrides;
}

/** Display-space additions; never written into a placement's coordinates. */
export function paragraphFurnitureGeometry(value: ParagraphFurniture | null | undefined, width: number) {
  const sourceHeight = value?.variant === 'quote' && value.source
    ? measureTypographyTextLines({ text: value.source, width: Math.max(21, width - FURNITURE_INSET),
      typography: FURNITURE_SOURCE_TYPOGRAPHY }).heightPx : 0;
  return { inset: value ? FURNITURE_INSET : 0, top: value ? FURNITURE_TOP : 0,
    sourceHeight, extraHeight: value ? FURNITURE_TOP + sourceHeight : 0 };
}
