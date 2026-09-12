import type { SourceArtifact, SourceArtifactBlock } from './sourceArtifact.js';

// Native PDF has no bounding boxes. Repetition needs at least three distinct
// pages and 60% of the document, within the first/last two blocks of each page.
const FURNITURE_MIN_REPEATED_PAGES = 3;
const FURNITURE_REPEATED_PAGE_RATIO = 0.6;
const FURNITURE_EDGE_BLOCK_COUNT = 2;
const PAGE_NUMBER_DECORATION_LIMIT = 3;
const PAGE_NUMBER_BODY = '(?:\\d{1,4}|page\\s+\\d+\\s+of\\s+\\d+|第\\s*\\d+\\s*页(?:\\s*[/／]\\s*共?\\s*\\d+\\s*页)?)';
const PAGE_NUMBER_PATTERN = new RegExp(
  `^[\\s\\-–—·•.()（）\\[\\]【】]{0,${PAGE_NUMBER_DECORATION_LIMIT}}${PAGE_NUMBER_BODY}[\\s\\-–—·•.()（）\\[\\]【】]{0,${PAGE_NUMBER_DECORATION_LIMIT}}$`,
  'i',
);

export interface SourcePageFurnitureReceipt {
  original_text: string;
  artifact_block_id: string;
  line_index: number;
  rules: Array<'repeated_page_edge' | 'page_number'>;
}

export function sourceArtifactPageCount(artifact: SourceArtifact): number | null {
  const value = artifact.metadata.page_count;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function normalizedLine(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}

export function stripSourcePageFurniture(artifact: SourceArtifact): {
  blocks: SourceArtifactBlock[];
  furnitureByPage: Map<number, SourcePageFurnitureReceipt[]>;
} {
  const furnitureByPage = new Map<number, SourcePageFurnitureReceipt[]>();
  if (artifact.parser_key !== 'native-pdf') return { blocks: artifact.blocks, furnitureByPage };

  const blocksByPage = new Map<number, SourceArtifactBlock[]>();
  for (const block of artifact.blocks) {
    if (block.page_index === null) continue;
    const pageBlocks = blocksByPage.get(block.page_index) || [];
    pageBlocks.push(block);
    blocksByPage.set(block.page_index, pageBlocks);
  }
  const pageCount = sourceArtifactPageCount(artifact) ?? blocksByPage.size;
  // A one-page document has no cross-page evidence: strip absolutely nothing.
  if (pageCount <= 1) return { blocks: artifact.blocks, furnitureByPage };

  const edgeBlocks = new Set<SourceArtifactBlock>();
  const linePages = new Map<string, Set<number>>();
  for (const [pageIndex, pageBlocks] of blocksByPage) {
    const candidates = new Set([
      ...pageBlocks.slice(0, FURNITURE_EDGE_BLOCK_COUNT),
      ...pageBlocks.slice(-FURNITURE_EDGE_BLOCK_COUNT),
    ]);
    for (const block of candidates) {
      edgeBlocks.add(block);
      for (const rawLine of block.text.split(/\r\n?|\n/)) {
        const line = normalizedLine(rawLine);
        if (!line) continue;
        const pages = linePages.get(line) || new Set<number>();
        pages.add(pageIndex);
        linePages.set(line, pages);
      }
    }
  }
  const repeatedPageThreshold = Math.max(
    FURNITURE_MIN_REPEATED_PAGES,
    Math.ceil(pageCount * FURNITURE_REPEATED_PAGE_RATIO),
  );

  const blocks = artifact.blocks.flatMap((block): SourceArtifactBlock[] => {
    if (block.page_index === null) return [block];
    const keptLines: string[] = [];
    let changed = false;
    block.text.split(/\r\n?|\n/).forEach((originalText, lineIndex) => {
      const normalized = normalizedLine(originalText);
      const rules: SourcePageFurnitureReceipt['rules'] = [];
      if (normalized && edgeBlocks.has(block)
        && (linePages.get(normalized)?.size ?? 0) >= repeatedPageThreshold) {
        rules.push('repeated_page_edge');
      }
      if (PAGE_NUMBER_PATTERN.test(normalized)) rules.push('page_number');
      if (rules.length === 0) {
        keptLines.push(originalText);
        return;
      }
      changed = true;
      const receipts = furnitureByPage.get(block.page_index!) || [];
      receipts.push({
        original_text: originalText,
        artifact_block_id: block.artifact_block_id,
        line_index: lineIndex,
        rules,
      });
      furnitureByPage.set(block.page_index!, receipts);
    });
    if (!changed) return [block];
    const text = keptLines.join('\n');
    return text.trim() ? [{ ...block, text }] : [];
  });
  return { blocks, furnitureByPage };
}
