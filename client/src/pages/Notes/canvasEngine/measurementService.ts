import {
  BLOCK_HORIZONTAL_CHROME,
  BLOCK_VERTICAL_CHROME,
  DEFAULT_BLOCK_HEIGHT,
  MIN_BLOCK_HEIGHT,
  TEXT_AVERAGE_CHAR_WIDTH,
  TEXT_LINE_HEIGHT,
  type BlockBoxLayout,
} from './runtimeLayout';
import {
  reflowLayoutsAfterHeightChange,
  resolveStackedLayoutCollisions,
} from './placementService';
import { textFromContent } from './blockContentService';
import type { NoteBlock } from './runtimeDataTypes';

export interface TextBlockHeightEstimate {
  text: string;
  width: number;
  title?: string | null;
  showPreview?: boolean;
  sourceReferenceCount?: number;
}

export interface ApplyMeasuredBlockLayoutInput {
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
  title,
  showPreview = false,
  sourceReferenceCount = 0,
}: TextBlockHeightEstimate): number {
  const titleRows = title ? 1 : 0;
  const textWidth = Math.max(80, width - BLOCK_HORIZONTAL_CHROME);
  const charsPerLine = Math.max(12, Math.floor(textWidth / TEXT_AVERAGE_CHAR_WIDTH));
  const wrappedRows = text
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  const rows = Math.max(1, wrappedRows) + titleRows;
  const previewExtra = showPreview ? 72 : 0;
  const sourceExtra = sourceReferenceCount > 0 ? 34 : 0;

  return Math.max(MIN_BLOCK_HEIGHT, BLOCK_VERTICAL_CHROME + rows * TEXT_LINE_HEIGHT + previewExtra + sourceExtra);
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

export function estimateBlockHeightForText(block: NoteBlock, text: string, width: number): number {
  return estimateTextBlockHeight({
    text,
    width,
    title: block.title,
    showPreview: shouldShowFormulaPreview(block, text),
    sourceReferenceCount: block.source_references?.length || 0,
  });
}

export function estimateBlockHeight(block: NoteBlock, width: number): number {
  return estimateBlockHeightForText(block, textFromContent(block), width);
}

export function applyMeasuredBlockLayoutToLayouts({
  currentLayouts,
  baseLayouts,
  blockId,
  fallbackLayout,
  nextLayout,
  orderedBlockIds,
  resolveCollisions,
}: ApplyMeasuredBlockLayoutInput): Record<string, BlockBoxLayout> {
  const previousLayout = currentLayouts[blockId] || fallbackLayout;
  const baseline = { ...baseLayouts, ...currentLayouts };
  const reflowedLayouts = reflowLayoutsAfterHeightChange(baseline, blockId, previousLayout, nextLayout);
  return resolveCollisions
    ? resolveStackedLayoutCollisions(reflowedLayouts, orderedBlockIds)
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
