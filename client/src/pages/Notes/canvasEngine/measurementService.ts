import type { CoordinateContract } from './placementContractService';
import {
  BLOCK_VERTICAL_CHROME,
  DEFAULT_BLOCK_HEIGHT,
  MIN_BLOCK_HEIGHT,
  type BlockBoxLayout,
} from './runtimeLayout';
import {
  reflowLayoutsAfterHeightChange,
  resolveStackedLayoutCollisions,
} from './placementService';
import {
  estimateTypographyTextBlockHeight,
} from './typographyMeasurementService';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
} from './typographyProfileService';
import { textFromContent } from './blockContentService';
import type { NoteBlock } from './runtimeDataTypes';
import type {
  DocumentTypographyProfile,
} from './types';

export interface TextBlockHeightEstimate {
  text: string;
  width: number;
  typography?: DocumentTypographyProfile;
  title?: string | null;
  showPreview?: boolean;
  sourceReferenceCount?: number;
}

export interface ApplyMeasuredBlockLayoutInput {
  coordinateContract?: CoordinateContract;
  currentLayouts: Record<string, BlockBoxLayout>;
  baseLayouts: Record<string, BlockBoxLayout>;
  blockId: string;
  fallbackLayout: BlockBoxLayout;
  nextLayout: BlockBoxLayout;
  orderedBlockIds: string[];
  resolveCollisions: boolean;
}

export interface ApplyMeasuredBlockHeightInput extends Omit<ApplyMeasuredBlockLayoutInput, 'nextLayout'> {
  measuredHeight: number;
  tolerance?: number;
}

export function resizeTextareaToContent(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function measureBlockContentHeight(element: HTMLElement | null): number {
  if (!element) return DEFAULT_BLOCK_HEIGHT;
  return Math.max(MIN_BLOCK_HEIGHT, Math.ceil(element.scrollHeight + BLOCK_VERTICAL_CHROME));
}

export function estimateTextBlockHeight({
  text,
  width,
  typography = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  title,
  showPreview = false,
  sourceReferenceCount = 0,
}: TextBlockHeightEstimate): number {
  return estimateTypographyTextBlockHeight({
    text,
    width,
    typography,
    title,
    showPreview,
    sourceReferenceCount,
  }).heightPx;
}

export function isFormulaLikeBlock(block: NoteBlock): boolean {
  const templateKey = typeof block.metadata?.template_key === 'string' ? block.metadata.template_key : '';
  const templateId = typeof block.metadata?.template_id === 'string' ? block.metadata.template_id : '';
  const legacyTemplateId = typeof block.metadata?.legacy_template_id === 'string' ? block.metadata.legacy_template_id : '';
  return block.block_type === 'formula'
    || templateKey.includes('formula')
    || templateId.includes('formula')
    || legacyTemplateId.includes('formula');
}

export function shouldShowFormulaPreview(block: NoteBlock, text: string): boolean {
  return isFormulaLikeBlock(block) && text.trim().length > 0;
}

export function estimateBlockHeightForText(
  block: NoteBlock,
  text: string,
  width: number,
  typography?: DocumentTypographyProfile,
): number {
  return estimateTextBlockHeight({
    text,
    width,
    typography,
    title: block.title,
    showPreview: shouldShowFormulaPreview(block, text),
    sourceReferenceCount: block.source_references?.length || 0,
  });
}

export function estimateBlockHeight(
  block: NoteBlock,
  width: number,
  typography?: DocumentTypographyProfile,
): number {
  return estimateBlockHeightForText(block, textFromContent(block), width, typography);
}

export function applyMeasuredBlockLayoutToLayouts({
  currentLayouts,
  baseLayouts,
  blockId,
  fallbackLayout,
  nextLayout,
  orderedBlockIds,
  resolveCollisions,
  coordinateContract,
}: ApplyMeasuredBlockLayoutInput): Record<string, BlockBoxLayout> {
  const previousLayout = currentLayouts[blockId] || fallbackLayout;
  const baseline = { ...baseLayouts, ...currentLayouts };
  const reflowedLayouts = reflowLayoutsAfterHeightChange(baseline, blockId, previousLayout, nextLayout, coordinateContract);
  return resolveCollisions
    ? resolveStackedLayoutCollisions(reflowedLayouts, orderedBlockIds, coordinateContract)
    : reflowedLayouts;
}

export function applyMeasuredBlockHeightToLayouts({
  currentLayouts,
  measuredHeight,
  tolerance = 2,
  ...input
}: ApplyMeasuredBlockHeightInput): Record<string, BlockBoxLayout> {
  const previousLayout = currentLayouts[input.blockId] || input.fallbackLayout;
  if (Math.abs(measuredHeight - previousLayout.height) <= tolerance) return currentLayouts;
  return applyMeasuredBlockLayoutToLayouts({
    ...input,
    currentLayouts,
    nextLayout: {
      ...previousLayout,
      height: measuredHeight,
    },
  });
}
