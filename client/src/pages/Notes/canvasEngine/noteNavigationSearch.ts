import {
  formulaFieldsFromBlock,
  presentationKindForBlock,
  textFromContent,
  type FieldValueRecord,
} from './blockContentService';
import { projectPageFrameToReadingSurface } from './pageFramePresentationService';
import { readStoredLayout } from './placementService';
import { projectTextFlowContent, TEXT_FLOW_CONTENT_KEY } from './textFlowService';
import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import type { CanvasRect, NoteCanvasRuntimeModel, PageStackBlockFragmentProjection } from './types';

export interface NoteNavigationSearchInput {
  noteId: string;
  visibleBlocks: readonly NoteBlock[];
  blockTextDrafts: Readonly<Record<string, string>>;
  blockTextFlowDrafts: Readonly<Record<string, TextBlockContentV1>>;
  blockFieldDrafts: Readonly<Record<string, FieldValueRecord>>;
  paperHeader?: { titleDraft: string; descriptionDraft: string };
  noteCanvasRuntime: Pick<NoteCanvasRuntimeModel,
    'pageFrames' | 'blockFragmentProjections' | 'coordinateContract'>
    & Partial<Pick<NoteCanvasRuntimeModel, 'blockPlacements'>>;
  pageOffsetX?: number;
}

export interface NoteNavigationResult {
  id: string;
  noteId: string;
  target: 'block' | 'header';
  blockId: string | null;
  before: string;
  match: string;
  after: string;
  frameId: string;
  /** One-based mechanical page positions, shared with Page overview. */
  pageNumbers: number[];
  /** First visible fragment in reading coordinates; header navigation uses the existing header DOM. */
  rect: CanvasRect;
}

function loadedBlockText(block: NoteBlock, input: NoteNavigationSearchInput): string {
  // Item references own a separately loaded projection; their identifiers are not paper text.
  if (block.block_type === 'item_ref' || block.block_type === 'media') return '';
  const draftText = input.blockTextDrafts[block.id];
  if (presentationKindForBlock(block) === 'formula') {
    const fields = formulaFieldsFromBlock(block, draftText, input.blockFieldDrafts[block.id]);
    return [fields.formula_name, fields.latex_input, fields.explanation].filter(Boolean).join('\n');
  }
  // TextBlockProjection aligns its flow to this text draft, including intentional clears.
  if (draftText !== undefined) return draftText;
  const flowDraft = input.blockTextFlowDrafts[block.id];
  if (flowDraft) return projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: flowDraft }).plain_text;
  return textFromContent(block);
}

function intersectRects(a: CanvasRect, b: CanvasRect): CanvasRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

/** Search only the caller's already-loaded note text; this function owns no fetch or cache. */
export function buildNoteNavigationResults(
  input: NoteNavigationSearchInput,
  query: string,
): NoteNavigationResult[] {
  const needle = query.trim();
  if (!needle) return [];
  const matcher = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
  const { pageFrames, blockFragmentProjections, coordinateContract, blockPlacements = [] } = input.noteCanvasRuntime;
  const pageNumbers = new Map(pageFrames.map((frame, index) => [frame.id, index + 1]));
  const placements = new Map(blockPlacements.map((placement) => [placement.blockId, placement]));
  const fragmentsByBlock = new Map<string, PageStackBlockFragmentProjection[]>();
  for (const fragment of blockFragmentProjections) {
    if (!pageNumbers.has(fragment.pageFrameId)) continue;
    const fragments = fragmentsByBlock.get(fragment.blockId) ?? [];
    fragments.push(fragment);
    fragmentsByBlock.set(fragment.blockId, fragments);
  }

  const results: NoteNavigationResult[] = [];
  const appendMatches = (text: string, target: Omit<NoteNavigationResult, 'id' | 'before' | 'match' | 'after'>) => {
    for (const occurrence of text.matchAll(matcher)) {
      const start = occurrence.index!;
      const end = start + occurrence[0].length;
      // Bound excerpt work per occurrence, including when a short query has many matches.
      const prefix = Array.from(text.slice(Math.max(0, start - 90), start)).slice(-45).join('');
      const suffix = Array.from(text.slice(end, end + 130)).slice(0, 65).join('');
      results.push({
        ...target,
        id: `${input.noteId}:${target.target}:${target.blockId ?? ''}:${start}`,
        before: `${prefix.length < start ? '…' : ''}${prefix}`,
        match: occurrence[0],
        after: `${suffix}${end + suffix.length < text.length ? '…' : ''}`,
      });
    }
  };
  const firstPage = pageFrames[0];
  if (input.paperHeader && firstPage) {
    appendMatches([input.paperHeader.titleDraft, input.paperHeader.descriptionDraft].join('\n'), {
      noteId: input.noteId, target: 'header', blockId: null,
      frameId: firstPage.id, pageNumbers: [1],
      rect: { x: 0, y: firstPage.y, width: firstPage.width, height: 0 },
    });
  }
  for (const block of input.visibleBlocks) {
    const placement = placements.get(block.id);
    if (readStoredLayout(block)?.surface === 'tray' || placement?.surface === 'tray') continue;
    const fragments = fragmentsByBlock.get(block.id) ?? [];
    let locations = fragments.map(({ pageFrameId, visibleRect }) => ({ pageFrameId, visibleRect }));
    if (!locations.length && placement) {
      // Reading admits paper-margin blocks using the frame's outer boundary. Content
      // fragments omit those margins; use the existing hydrated world placement here.
      locations = pageFrames.flatMap((frame) => {
        const visibleRect = intersectRects(placement, frame);
        return visibleRect ? [{ pageFrameId: frame.id, visibleRect }] : [];
      });
    }
    if (!locations.length) continue;
    locations.sort((a, b) => pageNumbers.get(a.pageFrameId)! - pageNumbers.get(b.pageFrameId)!);
    const first = locations[0]!;
    const frame = pageFrames.find((candidate) => candidate.id === first.pageFrameId)!;
    const readingFrame = projectPageFrameToReadingSurface(frame, coordinateContract, input.pageOffsetX ?? 0);
    const rect = { ...first.visibleRect, x: first.visibleRect.x + readingFrame.x - frame.x };
    // Fragments have geometric clips but no character offsets. Report the block's real
    // page range and jump to its first fragment instead of inventing word-to-page precision.
    const blockPages = [...new Set(locations.map((location) => pageNumbers.get(location.pageFrameId)!))];
    appendMatches(loadedBlockText(block, input), {
      noteId: input.noteId, target: 'block', blockId: block.id,
      frameId: frame.id, pageNumbers: blockPages, rect,
    });
  }
  return results.sort((a, b) => a.pageNumbers[0]! - b.pageNumbers[0]!
    || a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}
