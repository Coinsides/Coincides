import type { Note, NoteBlock } from '../../src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameModel } from '../../src/pages/Notes/canvasEngine/types';
import { createPageFrameTemplate } from '../../src/pages/Notes/canvasEngine/pageFrameTemplateService';
import { createPageStackFromFrame, DEFAULT_PAGE_STACK_GAP } from '../../src/pages/Notes/canvasEngine/pageStackCollectionService';

export type PrintSpecimenPaper = 'A4' | 'Letter' | 'web';
export const PRINT_NOTE_ID = 'page-print-smoke-note';
export const PRINT_CROSS_BLOCK_ID = 'print-cross-frame-block';
export const PRINT_EXCLUDED_BLOCK_IDS = ['print-workspace-block', 'print-canvas-backing-block'];

export function createPrintSpecimen(paper: PrintSpecimenPaper) {
  const template = createPageFrameTemplate(paper === 'web' ? 'screen_note' : paper === 'Letter' ? 'letter_portrait' : 'a4_portrait');
  const frames: PageFrameModel[] = [0, 1].map((index) => ({
    id: `print-${paper}-frame-${index + 1}`,
    role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
    templateId: template.templateId,
    pageSize: template.pageSize,
    exportable: template.exportable,
    x: 0,
    y: index * (template.height + DEFAULT_PAGE_STACK_GAP),
    width: template.width,
    height: template.height,
    contentInset: { ...template.contentInset },
    background: { ...template.background },
  }));
  const firstFrame = frames[0]!;
  const secondFrame = frames[1]!;
  const contentWidth = template.width - template.contentInset.left - template.contentInset.right;
  const createBlock = (id: string, text: string, frame: PageFrameModel, y: number, height: number, order: number): NoteBlock => ({
    id,
    placement_id: `${id}-placement`,
    display_overrides_json: {},
    block_type: 'text',
    title: null,
    content_json: { body: text },
    plain_text: text,
    metadata: { template_id: 'text.paragraph' },
    order_index: order,
    source_references: [],
    canvas_layout: {
      x: 0, y, width: contentWidth, height,
      coordinate_space: 'page_frame_local', frame_id: frame.id,
      surface: 'formal_page', boundary_role: 'inside',
      surface_authority: {
        coordinateSpace: 'page_frame_local',
        pageBoundary: { left: 0, right: contentWidth, frameId: frame.id },
      },
    },
  });
  const crossText = Array.from({ length: 22 }, (_, index) => (
    `CROSS FRAME line ${String(index + 1).padStart(2, '0')} — crop this same block at each frozen frame boundary.`
  )).join('\n');
  const crossBlock = createBlock(PRINT_CROSS_BLOCK_ID, crossText, firstFrame, template.height - template.contentInset.top - 260, 680, 1);
  crossBlock.metadata = { template_id: 'code.snippet' };
  crossBlock.content_json = { body: crossText, language: 'text' };
  const workspaceBlock = createBlock(PRINT_EXCLUDED_BLOCK_IDS[0]!, 'MUST NOT PRINT: workspace-only block', firstFrame, 100, 120, 3);
  workspaceBlock.canvas_layout = {
    x: template.width + 400, y: 100, width: 500, height: 120,
    coordinate_space: 'canvas_world', surface: 'canvas_workspace', boundary_role: 'outside',
  };
  const backingBlock = createBlock(PRINT_EXCLUDED_BLOCK_IDS[1]!, 'MUST NOT PRINT: canvas object backing block', firstFrame, 230, 100, 4);
  backingBlock.metadata = { ...backingBlock.metadata, render_scope: 'canvas_object_backing', projection_kind: 'block_backed_shape' };
  const blocks = [
    createBlock('print-first-frame-block', `PAGE ONE — ${paper} synthetic print specimen. Paper text is visible; controls and workspace assets are absent.`, firstFrame, 40, 150, 0),
    crossBlock,
    createBlock('print-second-frame-block', `PAGE TWO — ${paper} synthetic print specimen. This label belongs to the second frozen frame.`, secondFrame, 420, 120, 2),
    workspaceBlock,
    backingBlock,
  ];
  const stack = {
    ...createPageStackFromFrame(firstFrame, { id: 'print-smoke-stack', displayName: 'Synthetic two-page print stack' }),
    frameIds: frames.map((frame) => frame.id),
  };
  const note: Note = {
    id: PRINT_NOTE_ID, course_id: 'page-print-smoke-project',
    title: `13.1 print preview — ${paper} isolated specimen`, description: null,
    status: 'active', note_class: 'user', source_kind: 'manual', metadata: {},
  };
  return {
    paper, note, blocks, frames,
    canvas: {
      canvasObjects: [], canvasPlacements: [], contentMounts: [], visualConnectors: [],
      imageObjects: [], structuredObjects: [],
      pageFrameCollection: {
        pageFrames: frames, pageStacks: [stack],
        primaryFrameId: firstFrame.id, selectedFrameId: firstFrame.id,
        primaryStackId: stack.id, selectedStackId: stack.id,
      },
      blockLayouts: blocks.map((block) => ({ block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout })),
    },
  };
}
