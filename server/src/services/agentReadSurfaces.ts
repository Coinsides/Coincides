import { getDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import { getBoard } from './boards.js';
import { getCanvasAsset } from './canvasAssets.js';
import { getNoteCanvasPersistence } from './canvasObjects.js';
import { getNote, listNoteBlocks } from './notes.js';
import { validTextFlowUnits } from './textFlowUnits.js';
import { tableBlockPlainText } from './tableBlocks.js';
import { componentBlockPlainText } from './componentBlocks.js';

export const AGENT_NOTE_BLOCK_LIMIT = 200;
export const AGENT_BOARD_ENTRY_LIMIT = 200;

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function placementKey(value: unknown): string {
  // The human note/canvas DTOs use bare and prefixed IDs for the same placement.
  return text(value).replace(/^canvas-placement:/, '');
}

interface ReadPageFrame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  contentInset: { top: number; right: number; bottom: number; left: number };
}

function readPageFrames(value: unknown): ReadPageFrame[] {
  const frames = record(value).pageFrames;
  if (!Array.isArray(frames)) return [];
  const seen = new Set<string>();
  return frames.map(record).filter((frame) => {
    const id = text(frame.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((frame) => {
    const inset = record(frame.contentInset);
    return { id: text(frame.id), x: number(frame.x), y: number(frame.y),
      width: number(frame.width), height: number(frame.height),
      contentInset: { top: number(inset.top), right: number(inset.right),
        bottom: number(inset.bottom), left: number(inset.left) } };
  });
}

function frameForLayout(layout: RecordValue, frames: ReadPageFrame[], fallback: ReadPageFrame | undefined) {
  if (text(layout.frame_id)) return frames.find((frame) => frame.id === layout.frame_id);
  if (layout.coordinate_space !== 'canvas_world') return fallback;
  if (![layout.x, layout.y, layout.width, layout.height]
    .every((value) => typeof value === 'number' && Number.isFinite(value))) return fallback;
  // The human selectPlacementFrame -> derivePlacementPageFrameAffiliation rule:
  // first content rectangle containing the center, then first intersection.
  const x = number(layout.x); const y = number(layout.y);
  const width = number(layout.width); const height = number(layout.height);
  const bounds = frames.map((frame) => ({ frame,
    left: frame.x + frame.contentInset.left, top: frame.y + frame.contentInset.top,
    right: frame.x + frame.width - frame.contentInset.right,
    bottom: frame.y + frame.height - frame.contentInset.bottom }));
  const centerX = x + width / 2; const centerY = y + height / 2;
  return (bounds.find((box) => centerX >= box.left && centerX <= box.right
    && centerY >= box.top && centerY <= box.bottom)
    ?? bounds.find((box) => x < box.right && x + width > box.left
      && y < box.bottom && y + height > box.top))?.frame;
}

function projectNoteBlock(userId: string, block: RecordValue) {
  const content = record(block.content_json);
  const metadata = record(block.metadata);
  const units = validTextFlowUnits(content);
  const kind = text(block.block_type);
  const role = text(units?.[0]?.writing_role) || text(content.writing_role)
    || (kind === 'heading' ? 'heading' : ['text', 'paragraph'].includes(kind) ? 'paragraph' : null);
  const projected = {
    id: text(block.id),
    placement_id: text(block.placement_id),
    kind,
    role,
    text: kind === 'table' ? tableBlockPlainText(content)
      : kind === 'component' ? componentBlockPlainText(content) : text(block.plain_text),
    ...(units ? { text_units: units.map((unit) => ({
      id: text(unit.id) || null,
      role: text(unit.writing_role) || null,
      text: unit.text,
    })) } : {}),
  };
  if (kind === 'item_ref') {
    return { ...projected, item_ref: { item_id: text(content.item_id) } };
  }
  if (kind === 'media') {
    const assetId = text(record(metadata.media).asset_id);
    try {
      const asset = getCanvasAsset(getDb(), userId, assetId);
      return { ...projected, media: { asset_id: assetId, type: asset.kind } };
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode !== 404) throw error;
      // Missing media stays visible as an unresolved reference, as in the human reader.
      return { ...projected, media: { asset_id: assetId, type: null, state: 'missing' as const } };
    }
  }
  return projected;
}

/** A bounded projection of the existing human note, block and placement readers. */
export function readNoteForAgent({ userId, noteId, pageIndex = 0 }: {
  userId: string;
  noteId: string;
  pageIndex?: number;
}) {
  const note = getNote({ userId, noteId });
  const blocks = listNoteBlocks({ userId, noteId }) as RecordValue[];
  const canvas = getNoteCanvasPersistence(getDb(), userId, noteId);
  const collection = canvas.pageFrameCollection
    ?? record(note.metadata).canvas_engine_page_frames_v1;
  const persistedFrames = readPageFrames(collection);
  // The current paper reader places frames by persisted y, independently of
  // page-stack membership/numbering and the storage z-index.
  const frames = [...persistedFrames].sort((left, right) => left.y - right.y || left.x - right.x);
  const pageCount = Math.max(1, frames.length);
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
    throw new AppError(400, 'page_index_out_of_range');
  }
  const layoutsByPlacement = new Map(canvas.blockLayouts.map((entry) => [
    placementKey(entry.placement_id), entry.layout,
  ]));
  const layoutsByBlock = new Map(canvas.blockLayouts.map((entry) => [entry.block_id, entry.layout]));
  const frameId = frames[pageIndex]?.id ?? null;
  let outsidePage = 0;
  const pageBlocks = blocks.map((block, index) => {
    const persisted = block.placement_id
      ? layoutsByPlacement.get(placementKey(block.placement_id))
      : layoutsByBlock.get(text(block.id));
    const legacy = record(block.display_overrides_json).better_notebook_layout;
    const layout = record(persisted ?? legacy);
    const frame = frameForLayout(layout, persistedFrames, frames[0]);
    const needsFrame = text(layout.frame_id) !== '' || layout.coordinate_space === 'canvas_world';
    const outside = (layout.surface !== undefined && layout.surface !== 'formal_page')
      || layout.boundary_role === 'outside' || layout.boundary_role === 'crossing'
      || (needsFrame && !frame);
    if (outside) outsidePage += 1;
    const world = layout.coordinate_space === 'canvas_world' && frame;
    return { block, index, layout, outside, frameId: frame?.id ?? null,
      x: number(layout.x) - (world ? world.x + world.contentInset.left : 0),
      y: number(layout.y) - (world ? world.y + world.contentInset.top : 0) };
  }).filter((entry) => !entry.outside && entry.frameId === frameId)
    .sort((left, right) => {
      const positioned = typeof left.layout.y === 'number' && typeof right.layout.y === 'number';
      return (positioned ? left.y - right.y || left.x - right.x : 0)
        || number(left.block.order_index) - number(right.block.order_index) || left.index - right.index;
    });
  const truncated = pageBlocks.length > AGENT_NOTE_BLOCK_LIMIT;
  const nextPageIndex = pageIndex + 1 < pageCount ? pageIndex + 1 : null;
  return {
    note: {
      id: text(note.id), title: text(note.title), course_id: text(note.course_id),
      page_format: text(note.page_format), page_count: pageCount,
    },
    page_index: pageIndex,
    frame_id: frameId,
    blocks: pageBlocks.slice(0, AGENT_NOTE_BLOCK_LIMIT).map(({ block }) => projectNoteBlock(userId, block)),
    has_more: nextPageIndex !== null || truncated,
    next_page_index: nextPageIndex,
    truncated,
    total_blocks: pageBlocks.length,
    omitted_blocks: { outside_page: outsidePage },
  };
}

/** Board reference resolution and text-range health remain owned by getBoard. */
export function readBoardForAgent({ userId, boardId }: { userId: string; boardId: string }) {
  const { board, members, edges, visuals } = getBoard(getDb(), userId, boardId);
  const truncated = {
    members: members.length > AGENT_BOARD_ENTRY_LIMIT,
    edges: edges.length > AGENT_BOARD_ENTRY_LIMIT,
    visuals: visuals.length > AGENT_BOARD_ENTRY_LIMIT,
  };
  return {
    board: { id: board.id, title: board.title, viewport: board.viewport },
    members: members.slice(0, AGENT_BOARD_ENTRY_LIMIT).map((member) => ({
      id: member.id, member_kind: member.member_kind, member_id: member.member_id,
      x: member.x, y: member.y, scale: member.scale, pinned: member.pinned,
      title_or_summary: member.reference.summary || member.reference.title || null,
      placed: member.placed, state: member.reference.state,
    })),
    edges: edges.slice(0, AGENT_BOARD_ENTRY_LIMIT).map((edge) => ({
      id: edge.id, from_member: edge.from_member_id, to_member: edge.to_member_id, label: edge.label,
    })),
    visuals: visuals.slice(0, AGENT_BOARD_ENTRY_LIMIT).map((visual) => ({
      id: visual.id, type: visual.visual_kind,
      geometry: { x: visual.x, y: visual.y, w: visual.w, h: visual.h,
        scale: visual.scale, rotation: visual.rotation, pinned: visual.pinned },
      ...(typeof visual.data.text === 'string' ? { text: visual.data.text } : {}),
    })),
    has_more: Object.values(truncated).some(Boolean),
    truncated,
    total_counts: { members: members.length, edges: edges.length, visuals: visuals.length },
  };
}
