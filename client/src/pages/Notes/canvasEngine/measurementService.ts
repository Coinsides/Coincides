import {
  BLOCK_HORIZONTAL_CHROME,
  BLOCK_VERTICAL_CHROME,
  DEFAULT_BLOCK_HEIGHT,
  MIN_BLOCK_HEIGHT,
  TEXT_AVERAGE_CHAR_WIDTH,
  TEXT_LINE_HEIGHT,
} from './runtimeLayout';

export interface TextBlockHeightEstimate {
  text: string;
  width: number;
  title?: string | null;
  showPreview?: boolean;
  sourceReferenceCount?: number;
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
