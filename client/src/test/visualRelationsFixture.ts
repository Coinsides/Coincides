import { listNoteBlockTemplates } from '../../../shared/types';
import { createDefaultNoteBindingSettings, NOTE_BINDING_SLOT_NAMES } from '../../../shared/types/noteBinding';
import { createPrimaryPageFrame, buildNoteCanvasRuntimeModel } from '../pages/Notes/canvasEngine/engineModel';
import { createPageStackFromFrame } from '../pages/Notes/canvasEngine/pageStackCollectionService';
import { addNoteCoverPage } from '../pages/Notes/canvasEngine/noteCoverPageCollection';
import { coverPresetPlacements } from '../pages/Notes/canvasEngine/noteCoverPresets';
import { estimateBlockHeight } from '../pages/Notes/canvasEngine/measurementService';
import { resolveDocumentPageFlowPlan } from '../pages/Notes/canvasEngine/documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts, pageFlowFragmentProjections } from '../pages/Notes/canvasEngine/notePageFlowService';
import { buildRuntimeBlockPlacement } from '../pages/Notes/canvasEngine/placementService';
import { createDefaultDocumentTypographyProfile } from '../pages/Notes/canvasEngine/typographyProfileService';
import type { NoteBlock } from '../pages/Notes/canvasEngine/runtimeDataTypes';
import type { BlockBoxLayout } from '../pages/Notes/canvasEngine/runtimeLayout';
import { NOTE_INSERT_COMMANDS } from '../pages/Notes/noteSlashCommands';

function populateEmptyText(value: unknown): unknown {
  if (typeof value === 'string') return value || 'Relation sample';
  if (Array.isArray(value)) return value.map(populateEmptyText);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, populateEmptyText(entry)]));
  return value;
}

/** Project the current registry; adding a template automatically extends this fixture. */
export function createVisualRelationBlocks(): NoteBlock[] {
  const blocks = listNoteBlockTemplates().map((template, index): NoteBlock => {
    const content = populateEmptyText(template.default_content) as Record<string, unknown>;
    for (const field of template.fields) {
      const value = field.kind === 'latex' ? 'x=1' : `${template.label} relation sample`;
      if (Object.prototype.hasOwnProperty.call(content, field.key)) content[field.key] = value;
      else content.field_values = { ...(content.field_values as Record<string, unknown> || {}), [field.key]: value };
    }
    return { id: `relation-${template.template_id}`, placement_id: `relation-place-${index}`,
      block_type: template.legacy_block_type, title: null, plain_text: null, content_json: content,
      metadata: { template_id: template.template_id, template_key: template.template_id },
      source_references: [], order_index: index, canvas_layout: null, display_overrides_json: {} };
  });
  // TOC is an insertion command, not a stored-content template. Project the
  // actual command vocabulary so removal of that door removes its fixture.
  for (const command of NOTE_INSERT_COMMANDS.filter((entry) => entry.insertAction === 'toc')) {
    blocks.push({ ...blocks[0], id: `relation-${command.id}`, placement_id: `relation-${command.id}-place`,
      block_type: command.insertAction!, content_json: {}, metadata: {}, order_index: blocks.length });
  }
  // Item-reference has no authoritative enumerable registry: this sole
  // supplemental fixture mirrors NoteWritingSurfaceLayer's existing drop door.
  blocks.push({ ...blocks[0], id: 'relation-item-ref', placement_id: 'relation-item-ref-place',
    block_type: 'item_ref', content_json: { item_id: 'relation-item' }, metadata: {}, order_index: blocks.length });
  return blocks;
}

export function createVisualRelationFixture(pageSize: 'A4' | 'Letter', withCover: boolean, options: { persistedTopInset?: number } = {}) {
  const first = createPrimaryPageFrame({ id: 'relation-body',
    templateId: pageSize === 'A4' ? 'a4_portrait' : 'letter_portrait' });
  const typography = createDefaultDocumentTypographyProfile();
  if (options.persistedTopInset !== undefined) first.contentInset = { ...first.contentInset, top: options.persistedTopInset };
  let collection = { pageFrames: [first], primaryFrameId: first.id, pageStacks: [createPageStackFromFrame(first)] };
  if (withCover) collection = addNoteCoverPage(collection, 'relation-cover') as typeof collection;
  const binding = createDefaultNoteBindingSettings();
  if (withCover) binding.coverPage.frameId = 'relation-cover';
  // Exercise actual readable furniture in every authoritative position, even
  // though defaults leave five strings empty. The folio keeps its own producer.
  for (const position of NOTE_BINDING_SLOT_NAMES) binding.sections[0]!.slots[position].text = position;
  const blocks = createVisualRelationBlocks();
  const layouts: Record<string, BlockBoxLayout> = {};
  const width = first.width - first.contentInset.left - first.contentInset.right;
  for (const block of blocks) layouts[block.id] = { x: 0, y: 0, width,
    height: estimateBlockHeight(block, width, typography), frame_id: first.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };
  if (withCover) {
    const cover = collection.pageFrames.find((frame) => frame.id === 'relation-cover')!;
    for (const [field, layout] of Object.entries(coverPresetPlacements('concise', cover))) {
      const id = `relation-cover-${field}`;
      blocks.push({ id, placement_id: `${id}-place`, block_type: 'note_ref', title: null,
        plain_text: null, content_json: { field }, metadata: {}, source_references: [],
        order_index: blocks.length, canvas_layout: { ...layout }, display_overrides_json: {} });
      layouts[id] = layout;
    }
  }
  const plan = resolveDocumentPageFlowPlan({ collection, blocks: noteBlocksToPageFlow(blocks, layouts, {}, {}),
    coverFrameId: withCover ? 'relation-cover' : undefined, documentTypography: typography });
  const firstLayouts = pageFlowFirstLayouts(plan, layouts);
  const runtime = buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: first,
    pageFrames: plan.collection.pageFrames, pageStacks: plan.collection.pageStacks,
    viewport: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 }, bindingSettings: binding,
    documentTypography: typography,
    blockPlacements: blocks.map((block, index) => buildRuntimeBlockPlacement({ block,
      canvasId: 'relation-canvas', layout: firstLayouts[block.id], pageFrame: first,
      pageFrames: plan.collection.pageFrames, pageOffsetX: 0, contract: 'v2', zIndex: index })) });
  const fragments = [...pageFlowFragmentProjections(plan), ...runtime.blockFragmentProjections
    .filter((fragment) => plan.excludedBlockIds.includes(fragment.blockId))];
  return { blocks, layouts: firstLayouts, plan, frames: plan.collection.pageFrames,
    fragments, runtime, binding, typography };
}
