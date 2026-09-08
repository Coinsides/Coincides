import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { applyCanvasLayoutsToBlocks } from './canvasObjectRepository';
import type { CoordinateContract } from './placementContractService';
import { createSurfaceModePolicy } from './modePolicyService';
import { useNoteCanvasFrameModel, useNoteCanvasResolvedLayoutModel } from './hooks/useNoteCanvasLayoutModel';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';
import type { PageFrameCollectionModel, PageFrameModel } from './types';

const frames: PageFrameModel[] = [
  { id: 'frame-one', role: 'primary_page_frame', exportable: true, pageSize: 'Custom',
    x: 80, y: 80, width: 904, height: 1079,
    contentInset: { left: 72, right: 72, top: 96, bottom: 96 } },
  { id: 'frame-two', role: 'secondary_page_frame', exportable: true, pageSize: 'Custom',
    x: 220, y: 1239, width: 904, height: 1079,
    contentInset: { left: 54, right: 72, top: 112, bottom: 96 } },
];
const collection: PageFrameCollectionModel = {
  pageFrames: frames, primaryFrameId: frames[0].id, primaryStackId: 'synthetic-stack',
  pageStacks: [{ id: 'synthetic-stack', displayName: 'Synthetic two-page stack',
    frameIds: frames.map((frame) => frame.id), primaryFrameId: frames[0].id,
    collapsed: false, numbering: { enabled: true, startAt: 1 },
    layout: { direction: 'vertical', gap: 80, collapsedPreviewPages: 1 }, createdFrom: 'user_created' }],
};
const blocks: NoteBlock[] = ['One', 'Two'].map((text, index) => ({
  id: `block-${index}`, placement_id: `placement-${index}`, order_index: index,
  display_overrides_json: {}, canvas_layout: null, block_type: 'text', title: null,
  content_json: { body: text }, plain_text: text, metadata: {}, source_references: [],
}));
// These are manually normalized synthetic values, never migrated user rows.
const localLayouts: BlockBoxLayout[] = [
  { x: 20, y: 30, width: 320, height: 140, width_mode: 'manual',
    coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: 'frame-one' },
  { x: 35, y: 44, width: 360, height: 150, width_mode: 'manual',
    coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: 'frame-two' },
];
const mixedLayouts: BlockBoxLayout[] = [
  { ...localLayouts[0], y: 206 },
  { ...localLayouts[1], y: 1395 },
];

type EditorProps = ComponentProps<typeof BlockEditorLayer>;
function editorProps(block: NoteBlock, layout: BlockBoxLayout): EditorProps {
  const noop = vi.fn();
  return {
    block, layout, text: block.plain_text || '', contentReadOnly: true,
    annotations: [], selectedAnnotationIds: [], blockControlAnchor: null, affiliationOutline: null,
    layoutMode: false, pageOffsetX: 0, saving: false, active: false, autoFocus: false,
    onFocused: noop, onFocusReleased: noop, onAnnotationSelect: noop,
    onAnnotationContextMenu: noop, onAnnotationStackSelect: noop, onTextUnitSelection: noop,
    onTextUnitContextMenu: noop, onBlockContextMenu: noop, onTextChange: noop,
    onTextFlowChange: noop, onFieldDraftChange: noop,
    onSave: async () => ({ status: 'saved', block, recoveryReceipt: null, reconciliation: 'not_needed' }),
    onTrash: noop, onSelect: noop, onBeginMove: noop, onBeginResize: noop,
    onToggleExportRole: noop, onToggleAIVisibility: noop, onAnnotateBlock: noop,
    showBlockTypeBadge: false, showAIStatusBadge: false, showExportStatusBadge: false,
    showLabelOverlay: false, onKeyDown: noop, onMeasuredHeight: noop,
    anchorsBySourceRef: {}, sourceJumpBusy: null, onViewSource: noop,
  };
}

function CanvasSubject({ contract, layouts }: { contract?: CoordinateContract; layouts: BlockBoxLayout[] }) {
  const hydrated = applyCanvasLayoutsToBlocks(blocks, layouts.map((layout, index) => ({
    block_id: blocks[index].id, placement_id: blocks[index].placement_id!,
    layout: { ...layout },
  })), { pageFrameCollection: collection, coordinateContract: contract });
  const resolved = useNoteCanvasResolvedLayoutModel({
    coordinateContract: contract, contentWidth: 760, documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    layoutDrafts: {}, sortedBlocks: hydrated, pageFrames: frames,
    surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page'),
  });
  const frameModel = useNoteCanvasFrameModel({
    coordinateContract: contract, ...resolved, documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    draftActive: false, draftLayout: null, pageFrameCollection: collection,
    persistedCanvasObjects: [], persistedCanvasPlacements: [], persistedContentMounts: [],
    persistedVisualConnectors: [], persistedImageObjects: [], persistedStructuredObjects: [],
    pageOffsetX: 0, surfaceMode: 'page', viewportTransform: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 },
  });
  return <section data-content-height={frameModel.pageContentHeight}>
    {resolved.visibleBlocks.map((block) => {
      const layout = resolved.blockLayouts[block.id];
      return <BlockEditorLayer key={block.id} {...editorProps(block, layout)}
        coordinateContract={contract} pageFrame={frames.find((frame) => frame.id === layout.frame_id)} />;
    })}
    <output data-runtime-receipt={JSON.stringify({
      blocks: frameModel.canvasBlockPlacements.map(({ x, y, width, height }) => [x, y, width, height]),
      fragments: frameModel.noteCanvasRuntime.blockFragmentProjections.map((fragment) => ({
        blockId: fragment.blockId, frameId: fragment.pageFrameId,
      })),
    })} />
  </section>;
}

function sample(contract: CoordinateContract | undefined, layouts: BlockBoxLayout[]) {
  const subject = render(<CanvasSubject contract={contract} layouts={layouts} />);
  // jsdom has no layout engine. Sample actual committed DOM style values; do not
  // stub getBoundingClientRect and call its invented numbers a browser measurement.
  const styles = Array.from(subject.container.querySelectorAll<HTMLElement>('[data-note-block-shell]'))
    .map((article) => [article.style.left, article.style.top, article.style.width, article.style.minHeight]);
  const contentHeight = Number(subject.container.querySelector('section')?.dataset.contentHeight);
  const runtime = JSON.parse(subject.container.querySelector('output')!.dataset.runtimeReceipt!);
  subject.unmount();
  return { styles, contentHeight, runtime };
}

describe('dual coordinate contract DOM integration', () => {
  it('preserves the pre-contract v1 screen values for the same two-frame mixed rows', () => {
    const implicitV1 = sample(undefined, mixedLayouts);
    const explicitV1 = sample('v1', mixedLayouts);
    expect(explicitV1).toEqual(implicitV1);
    expect(explicitV1.styles).toEqual([
      ['20px', '206px', '320px', '140px'],
      ['35px', '1395px', '360px', '150px'],
    ]);
  });

  it('keeps every block DOM style and paper content height equal after manual v2 normalization', () => {
    const v1 = sample('v1', mixedLayouts);
    const v2 = sample('v2', localLayouts);
    expect(v2.styles).toEqual(v1.styles);
    expect(v2.contentHeight).toBe(v1.contentHeight);
    expect(v2.contentHeight).toBe(1641);
    expect(v2.runtime.blocks).toEqual([[172, 206, 320, 140], [309, 1395, 360, 150]]);
    expect(v2.runtime.fragments).toEqual([
      { blockId: 'block-0', frameId: 'frame-one' },
      { blockId: 'block-1', frameId: 'frame-two' },
    ]);
  });
});
