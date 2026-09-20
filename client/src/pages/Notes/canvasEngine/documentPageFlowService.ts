import { getPageFrameContentRect } from './pageFrameService';
import { appendPageFrameToStack, normalizePageStacksWithFrameCoverage } from './pageStackCollectionService';
import { deriveFrameLocalAutoWidth, type CoordinateContract } from './placementContractService';
import { DEFAULT_BLOCK_GAP, type BlockBoxLayout } from './runtimeLayout';
import type { TextUnitWritingRole } from './runtimeDataTypes';
import {
  measureTypographyTextLines, TYPOGRAPHY_TEXT_BLOCK_MIN_HEIGHT, TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME,
  type TypographyLineMeasurementInput,
} from './typographyMeasurementService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';
import type { DocumentTypographyProfile, PageFrameCollectionModel, PageFrameModel } from './types';

/** Read-side ranges use the same UTF-16 offsets as TextFlow and DOM selections. */
export interface PageFlowTextRange { start: number; end: number }

export interface PageFlowTextUnit {
  id?: string;
  startOffset: number;
  endOffset: number;
  indentLevel?: number;
  writingRole?: TextUnitWritingRole;
  hidden?: boolean;
}

export interface PageFlowBlock {
  blockId: string;
  kind: 'text' | 'media' | 'projection' | 'component';
  layout: BlockBoxLayout;
  text?: string;
  indentLevel?: number;
  writingRole?: TextUnitWritingRole;
  units?: PageFlowTextUnit[];
  typography?: DocumentTypographyProfile;
  /** Existing first-fragment furniture (for example the source-reference row). */
  firstFragmentExtraHeight?: number;
  /** Coverage citizens do not become flow merely because their width is auto. */
  flow?: boolean;
  presentation?: 'in_flow' | 'underlay' | 'overlay' | 'viewport';
}

export interface PageFlowLine {
  startOffset: number;
  endOffset: number;
  widthPx: number;
  heightPx: number;
  lineHeightPx?: number;
  indentLevel?: number;
  writingRole?: TextUnitWritingRole;
}

export interface PageFlowFragment {
  id: string;
  blockId: string;
  frameId: string;
  /** The logical block's first fragment affiliation, never the old persisted page. */
  startFrameId: string;
  fragmentIndex: number;
  isFirst: boolean;
  isLast: boolean;
  textRange: PageFlowTextRange | null;
  lineRange: PageFlowTextRange | null;
  lines: PageFlowLine[];
  /** Ephemeral page_frame_local projection; never a second content/placement row. */
  layout: BlockBoxLayout;
}

export interface PageFlowOverflow {
  kind: 'indivisible_block_exceeds_page' | 'text_line_exceeds_page';
  blockId: string;
  frameId: string;
  fragmentId: string;
  requiredHeight: number;
  availableHeight: number;
  overflowPx: number;
}

export interface DocumentPageFlowPlan {
  collection: PageFrameCollectionModel;
  frames: Array<{ frame: PageFrameModel; fragments: PageFlowFragment[] }>;
  fragments: PageFlowFragment[];
  /** Only affiliation changes may be persisted through existing placement APIs.
   * Stored x/y/width stay unchanged: wall edits move origins, not coordinates. */
  placementUpdates: Array<{ blockId: string; frameId: string; layout: BlockBoxLayout }>;
  appendedFrameIds: string[];
  excludedBlockIds: string[];
  overflows: PageFlowOverflow[];
}

export interface ResolveDocumentPageFlowPlanInput {
  collection: PageFrameCollectionModel;
  /** Binding-owned cover identity. Its page and residents never enter content flow. */
  coverFrameId?: string | null;
  blocks: PageFlowBlock[];
  documentTypography?: DocumentTypographyProfile;
  coordinateContract?: CoordinateContract;
  blockGap?: number;
  /** The callback is a snapshot of a shared measurement source, not a DOM read.
   * Callers may replace estimated rows with measured rows without a second plan. */
  measureTextLines?: (input: TypographyLineMeasurementInput) => { lines: PageFlowLine[] };
}

function isWebFrame(frame: PageFrameModel): boolean {
  return frame.templateId === 'screen_note' || frame.background?.kind === 'screen';
}

function isFlowBlock(block: PageFlowBlock, contract: CoordinateContract): boolean {
  return contract === 'v2' && block.flow !== false
    && (!block.presentation || block.presentation === 'in_flow')
    && block.layout.width_mode !== 'manual'
    && block.layout.coordinate_space === 'page_frame_local'
    && block.layout.surface !== 'canvas_workspace' && block.layout.surface !== 'tray';
}

/** Deterministic pagination of logical blocks. Trees, text, ink and manual boxes
 * are never mutated. Existing per-frame geometry is used on every continuation. */
export function resolveDocumentPageFlowPlan({
  collection: originalCollection,
  coverFrameId,
  blocks,
  documentTypography = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  coordinateContract = 'v2',
  blockGap = DEFAULT_BLOCK_GAP,
  measureTextLines = measureTypographyTextLines,
}: ResolveDocumentPageFlowPlanInput): DocumentPageFlowPlan {
  let collection: PageFrameCollectionModel = {
    ...originalCollection,
    pageFrames: originalCollection.pageFrames.map((frame) => ({ ...frame, contentInset: { ...frame.contentInset } })),
    pageStacks: normalizePageStacksWithFrameCoverage(originalCollection),
  };
  const fragments: PageFlowFragment[] = [];
  const placementUpdates: DocumentPageFlowPlan['placementUpdates'] = [];
  const appendedFrameIds: string[] = [];
  const excludedBlockIds: string[] = [];
  const overflows: PageFlowOverflow[] = [];
  const primaryFrameId = collection.primaryFrameId !== coverFrameId && collection.primaryFrameId
    || collection.pageFrames.find((frame) => frame.id !== coverFrameId)?.id;
  const blocksByStack = new Map<string, PageFlowBlock[]>();
  for (const block of blocks) {
    const frameId = block.layout.frame_id || primaryFrameId;
    const stack = collection.pageStacks!.find((candidate) => candidate.frameIds.includes(frameId || ''));
    if (frameId === coverFrameId || !isFlowBlock(block, coordinateContract) || !stack) {
      excludedBlockIds.push(block.blockId);
      continue;
    }
    const stackBlocks = blocksByStack.get(stack.id) || [];
    stackBlocks.push(block);
    blocksByStack.set(stack.id, stackBlocks);
  }

  for (const [stackId, stackBlocks] of blocksByStack) {
    let frameIndex = 0;
    let cursorY = 0;
    const contentFrameIds = () => collection.pageStacks!.find((candidate) => candidate.id === stackId)!
      .frameIds.filter((frameId) => frameId !== coverFrameId);
    const currentFrame = (): PageFrameModel => {
      return collection.pageFrames.find((frame) => frame.id === contentFrameIds()[frameIndex])!;
    };
    const advanceFrame = (): void => {
      const stack = collection.pageStacks!.find((candidate) => candidate.id === stackId)!;
      if (frameIndex + 1 >= contentFrameIds().length) {
        // appendPageFrameToStack derives IDs from the input collection, no clock/randomness.
        const next = appendPageFrameToStack(collection, stackId, currentFrame().id);
        const added = next.pageFrames.find((frame) => !collection.pageFrames.some((previous) => previous.id === frame.id))!;
        // The stack owns its gap; the lower-level helper retains its legacy
        // default. Existing pages keep their explicitly authored positions.
        added.y = currentFrame().y + currentFrame().height + stack.layout.gap;
        appendedFrameIds.push(added.id);
        collection = { ...next, selectedFrameId: originalCollection.selectedFrameId, selectedStackId: originalCollection.selectedStackId };
      }
      frameIndex += 1;
      cursorY = 0;
    };

    for (const block of stackBlocks) {
      const blockFragments: PageFlowFragment[] = [];
      let offset = 0;
      let lineIndex = 0;
      let complete = false;
      while (!complete) {
        const frame = currentFrame();
        const content = getPageFrameContentRect(frame);
        const web = isWebFrame(frame);
        const width = deriveFrameLocalAutoWidth(block.layout, frame, 'v2')!;
        const text = block.text || '';
        const lines = block.kind === 'text' ? measureTextLines({
          text, width, typography: block.typography || documentTypography,
          indentLevel: block.indentLevel, writingRole: block.writingRole,
          units: block.units, startOffset: offset,
        }).lines : [];
        const available = web ? Infinity : Math.max(0, content.height - cursorY);
        const firstFragmentExtraHeight = blockFragments.length === 0
          ? Math.max(0, block.firstFragmentExtraHeight || 0) : 0;
        let takenLines: PageFlowLine[] = [];
        let height = Math.max(0, block.layout.height);
        if (block.kind === 'text') {
          let rowHeight = 0;
          for (const line of lines) {
            const nextHeight = Math.max(TYPOGRAPHY_TEXT_BLOCK_MIN_HEIGHT,
              TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME + rowHeight + line.heightPx + firstFragmentExtraHeight);
            if (nextHeight > available) break;
            takenLines.push(line);
            rowHeight += line.heightPx;
          }
          if (takenLines.length === 0 && cursorY > 0) {
            advanceFrame();
            continue;
          }
          // A physically taller-than-paper row remains visible and terminates.
          if (takenLines.length === 0) takenLines = lines.slice(0, 1);
          height = Math.max(TYPOGRAPHY_TEXT_BLOCK_MIN_HEIGHT, TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME
            + takenLines.reduce((sum, line) => sum + line.heightPx, 0) + firstFragmentExtraHeight);
          complete = takenLines.length === lines.length;
        } else {
          if (height > available && cursorY > 0) {
            advanceFrame();
            continue;
          }
          complete = true;
        }

        const nextOffset = takenLines[takenLines.length - 1]?.endOffset ?? text.length;
        const fragment: PageFlowFragment = {
          id: `${block.blockId}@${frame.id}:${blockFragments.length}`,
          blockId: block.blockId, frameId: frame.id,
          startFrameId: blockFragments[0]?.frameId || frame.id,
          fragmentIndex: blockFragments.length, isFirst: blockFragments.length === 0, isLast: complete,
          textRange: block.kind === 'text' ? { start: offset, end: nextOffset } : null,
          lineRange: block.kind === 'text' ? { start: lineIndex, end: lineIndex + takenLines.length } : null,
          lines: takenLines,
          layout: { ...block.layout, x: block.layout.x, y: cursorY, width, height,
            frame_id: frame.id, coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside',
            surface_authority: { coordinateSpace: 'page_frame_local', pageBoundary: { left: 0, right: content.width, frameId: frame.id } },
          },
        };
        blockFragments.push(fragment);
        fragments.push(fragment);
        if (!web && height > content.height) {
          overflows.push({ kind: block.kind === 'text' ? 'text_line_exceeds_page' : 'indivisible_block_exceeds_page',
            blockId: block.blockId, frameId: frame.id, fragmentId: fragment.id,
            requiredHeight: height, availableHeight: content.height, overflowPx: height - content.height });
        }
        cursorY += height + Math.max(0, blockGap);
        if (web && cursorY > content.height) {
          collection = { ...collection, pageFrames: collection.pageFrames.map((candidate) => candidate.id === frame.id
            ? { ...candidate, height: cursorY + candidate.contentInset.top + candidate.contentInset.bottom }
            : candidate) };
        }
        offset = nextOffset;
        lineIndex += takenLines.length;
        if (!complete) advanceFrame();
      }
      const first = blockFragments[0]!;
      if (block.layout.frame_id !== first.frameId) {
        placementUpdates.push({ blockId: block.blockId, frameId: first.frameId,
          layout: { ...block.layout, frame_id: first.frameId } });
      }
    }
  }
  return {
    collection, fragments, placementUpdates, appendedFrameIds, excludedBlockIds, overflows,
    frames: collection.pageFrames.map((frame) => ({ frame, fragments: fragments.filter((fragment) => fragment.frameId === frame.id) })),
  };
}
