import type { Note, NoteBlock } from '../../src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameModel } from '../../src/pages/Notes/canvasEngine/types';
import { createPageFrameTemplate } from '../../src/pages/Notes/canvasEngine/pageFrameTemplateService';
import { createPageStackFromFrame, DEFAULT_PAGE_STACK_GAP } from '../../src/pages/Notes/canvasEngine/pageStackCollectionService';

export const OVERVIEW_NOTE_ID = 'overview-smoke-note';
export const OVERVIEW_CROSS_BLOCK_ID = 'overview-cross-frame';
export const OVERVIEW_TRAY_BLOCK_ID = 'overview-tray-only';

/** Entirely synthetic rows: no server, database, credentials or saved user state. */
export function createOverviewSpecimen(pageCount: 1 | 4 | 9, longPage = false, blankLastPage = false) {
  const template = createPageFrameTemplate(longPage ? 'screen_note' : 'a4_portrait');
  const frameHeight = longPage ? template.width * 4 : template.height;
  const frames: PageFrameModel[] = Array.from({ length: pageCount }, (_, index) => ({
    ...template,
    id: `overview-frame-${index + 1}`,
    role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
    x: 0, y: index * (frameHeight + DEFAULT_PAGE_STACK_GAP),
    height: frameHeight,
    contentInset: { ...template.contentInset },
    background: { ...template.background },
  }));
  const width = template.width - template.contentInset.left - template.contentInset.right;
  const makeBlock = (id: string, text: string, frameIndex: number, y: number, height: number): NoteBlock => ({
    id, placement_id: `${id}-placement`, display_overrides_json: {},
    block_type: 'text', title: null, content_json: { body: text }, plain_text: text,
    metadata: { template_id: 'text.paragraph' }, order_index: frameIndex, source_references: [],
    canvas_layout: {
      x: 0, y, width, height, coordinate_space: 'page_frame_local', frame_id: frames[frameIndex]!.id,
      surface: 'formal_page', boundary_role: 'inside',
      surface_authority: { coordinateSpace: 'page_frame_local', pageBoundary: { left: 0, right: width, frameId: frames[frameIndex]!.id } },
    },
  });
  const blocks = frames.flatMap((_frame, index) => blankLastPage && index === frames.length - 1 ? [] : [makeBlock(
    `overview-label-${index + 1}`,
    `PAGE ${index + 1} — synthetic overview specimen. This label belongs to page ${index + 1}.`,
    index, 40, 140,
  )]);
  if (pageCount > 1) {
    const crossing = makeBlock(OVERVIEW_CROSS_BLOCK_ID,
      Array.from({ length: 22 }, (_, index) => `CROSS FRAME line ${index + 1} — the same block has two clipped page fragments.`).join('\n'),
      0, frameHeight - template.contentInset.top - 260, 680);
    crossing.metadata = { template_id: 'code.snippet' };
    crossing.content_json = { body: crossing.plain_text, language: 'text' };
    blocks.push(crossing);
  }
  const tray = makeBlock(OVERVIEW_TRAY_BLOCK_ID, 'TRAY ONLY — must never appear in a page thumbnail.', 0, 220, 120);
  tray.canvas_layout = {
    x: 0, y: 220, width, height: 120, coordinate_space: 'canvas_world',
    surface: 'tray', boundary_role: 'outside',
  };
  blocks.push(tray);
  const stack = {
    ...createPageStackFromFrame(frames[0]!, { id: 'overview-stack', displayName: 'Synthetic overview pages' }),
    frameIds: frames.map((frame) => frame.id),
  };
  const note: Note = {
    id: OVERVIEW_NOTE_ID, course_id: 'overview-smoke-project', title: `Overview — ${pageCount} synthetic page(s)`,
    description: null, status: 'active', note_class: 'user', source_kind: 'manual', metadata: {},
  };
  return {
    note, frames, blocks, pageCount, longPage, blankLastPage,
    canvas: {
      coordinate_contract: 'v2', canvasObjects: [], canvasPlacements: [], contentMounts: [], visualConnectors: [],
      imageObjects: [], structuredObjects: [],
      pageFrameCollection: {
        pageFrames: frames, pageStacks: [stack], primaryFrameId: frames[0]!.id, selectedFrameId: frames[0]!.id,
        primaryStackId: stack.id, selectedStackId: stack.id,
      },
      blockLayouts: blocks.map((block) => ({ block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout })),
    },
  };
}
