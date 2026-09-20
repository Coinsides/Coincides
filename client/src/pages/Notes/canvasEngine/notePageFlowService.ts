import { presentationKindForBlock, textFromContent } from './blockContentService';
import { getTextFlowContent } from './textFlowService';
import { resolveWorldRect } from './placementContractService';
import { getPageFrameContentRect } from './pageFrameService';
import { resolvePageStackContext } from './pageStackCollectionService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import type { DocumentPageFlowPlan, PageFlowBlock } from './documentPageFlowService';
import type { PageStackBlockFragmentProjection } from './types';
import { pageFlowSourceReferenceHeight } from './pageFlowSourceReferenceService';

/** Adapt the existing content truth; no fragment text is ever written back. */
export function noteBlocksToPageFlow(
  blocks: readonly NoteBlock[], layouts: Record<string, BlockBoxLayout>,
  textDrafts: Record<string, string>, flowDrafts: Record<string, TextBlockContentV1>,
): PageFlowBlock[] {
  return blocks.flatMap((block) => {
    const layout = layouts[block.id];
    if (!layout) return [];
    const flow = flowDrafts[block.id] || getTextFlowContent(block.content_json);
    const text = textDrafts[block.id] ?? (flow ? flow.units.map((unit) => unit.text).join('\n') : textFromContent(block));
    const kind = block.block_type === 'media' || block.block_type === 'table' || block.block_type === 'component' ? 'media' : block.block_type === 'item_ref' ? 'projection'
      : presentationKindForBlock(block) === 'paragraph' ? 'text' : 'component';
    // Legacy plain-text drafts can update one render before their TextFlow draft.
    // Align by row just as TextBlockProjection does, so new text is never outside
    // the measurement ranges and the existing indentation/roles remain in use.
    const measurementUnits = flow && flow.units.map((unit) => unit.text).join('\n') !== text
      ? text.split('\n').map((unitText, index) => ({ ...flow.units[index], text: unitText }))
      : flow?.units;
    let offset = 0;
    let collapsedIndent: number | null = null;
    const units = measurementUnits?.map((unit, index) => {
      const startOffset = offset;
      offset += unit.text.length + (index < measurementUnits.length - 1 ? 1 : 0);
      const indentLevel = unit.indent_level ?? 0;
      const hidden = collapsedIndent !== null && indentLevel > collapsedIndent;
      if (!hidden) {
        collapsedIndent = unit.writing_role === 'toggle_item' && unit.metadata?.collapsed === true ? indentLevel : null;
      }
      return { id: unit.id, startOffset, endOffset: offset,
        indentLevel, writingRole: unit.writing_role, hidden };
    });
    return [{ blockId: block.id, layout, kind, text, units,
      firstFragmentExtraHeight: kind === 'text' ? pageFlowSourceReferenceHeight(block.source_references?.length ?? 0) : 0 }];
  });
}

/** Compatibility projection: every view receives the exact same line plan. */
export function pageFlowFragmentProjections(plan: DocumentPageFlowPlan): PageStackBlockFragmentProjection[] {
  return plan.fragments.map((fragment) => {
    const frame = plan.collection.pageFrames.find((entry) => entry.id === fragment.frameId)!;
    const context = resolvePageStackContext(plan.collection, frame.id)!;
    const fragments = plan.fragments.filter((entry) => entry.blockId === fragment.blockId);
    const rect = resolveWorldRect(fragment.layout, frame, 'v2');
    return {
      blockId: fragment.blockId, blockRect: rect, visibleRect: rect,
      pageContentRect: getPageFrameContentRect(frame),
      pageStackId: context.stack.id, pageFrameId: frame.id, pageIndex: context.index, pageTotal: context.total,
      fragmentIndex: fragment.fragmentIndex, fragmentTotal: fragments.length,
      role: fragments.length === 1 ? 'single' : fragment.isFirst ? 'start' : fragment.isLast ? 'end' : 'middle',
      clippedTop: !fragment.isFirst, clippedBottom: !fragment.isLast, flowFragment: fragment,
    };
  });
}

export function pageFlowFirstLayouts(plan: DocumentPageFlowPlan, layouts: Record<string, BlockBoxLayout>) {
  const projected = { ...layouts };
  for (const fragment of plan.fragments) if (fragment.isFirst) projected[fragment.blockId] = fragment.layout;
  return projected;
}
