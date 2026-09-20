import { z } from 'zod';
import type { ToolRegistryEntry } from './registry.js';
import {
  mountBoardMemberSchema, updateBoardMemberSchema, createBoardEdgeSchema,
  createBoardStickySchema, updateBoardStickySchema, updateBoardVisualSchema,
} from '../validators/boards.js';

const id = z.string().trim().min(1).max(180);
const nonempty = <T extends z.AnyZodObject>(schema: T) => schema.refine(value => Object.keys(value).length > 0, 'No changes provided');
const geometry = updateBoardMemberSchema.innerType();
const sticky = updateBoardStickySchema.innerType();
// The manifest's 2020-12 subset rejects Zod's boolean exclusiveMinimum.
// For finite JS numbers, MIN_VALUE is exactly the smallest positive value.
const visual = nonempty(updateBoardVisualSchema.innerType().extend({
  scale: z.number().finite().min(Number.MIN_VALUE).optional(),
}));
const output = z.object({
  id, board_id: id, batch_id: id, receipt_id: id, message: z.string(), entity: z.record(z.unknown()),
  layout_report: z.object({ board_id: id, batch_id: id,
    report: z.object({ issues: z.array(z.object({ kind: z.string(), severity: z.enum(['warning', 'error']), itemIds: z.array(z.string()),
      coordinate: z.object({ x: z.number(), y: z.number() }), bounds: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }) })),
      counts: z.record(z.number()) }).nullable(), diagnostic_error: z.string().optional() }),
}).strict();
function tool(name: string, description: string, input: z.ZodTypeAny, route: string, method: string): ToolRegistryEntry {
  return { name, description, input_schema: input, output_schema: output,
    truth: 'spatial', tier: 'immediate', exposure: 'internal', scopes: ['boards:write'],
    human_entry: { route, client_call_site: `client/src/pages/Boards/boardRepository.ts#boardRepository.${method}` } };
}

/** C1's entire write boundary. Validators are projections of the human board door. */
export const BOARD_ACTION_TOOLS: ToolRegistryEntry[] = [
  tool('board_mount_member', 'Mount an existing note, content_group or item into board Staging. A human places it on the board; this never writes source content.',
    z.object({ board_id: id, input: mountBoardMemberSchema.pick({ member_kind: true, member_id: true, x: true, y: true, w: true, h: true })
      .extend({ member_kind: z.enum(['note', 'content_group', 'item']) }) }).strict(),
    'POST /api/boards/:boardId/members', 'mount'),
  tool('board_move_member', 'Move or resize an existing board member. Adopted members may be arranged; Staging membership stays unchanged.',
    z.object({ board_id: id, member_id: id, input: nonempty(geometry.pick({ x: true, y: true, w: true, h: true })) }).strict(),
    'PATCH /api/boards/:boardId/members/:memberId', 'updateMember'),
  tool('board_set_member_layer', 'Set an existing member layer and/or integer z_index. Null layer is Base.',
    z.object({ board_id: id, member_id: id, input: nonempty(geometry.pick({ layer_id: true, z_index: true })) }).strict(),
    'PATCH /api/boards/:boardId/members/:memberId', 'updateMember'),
  tool('board_create_edge', 'Create a purely visual board edge between member, sticky or point endpoints. Supports v1 anchors, bend, dash, weight, caps and label. Does not create a Relation.',
    z.object({ board_id: id, input: createBoardEdgeSchema }).strict(),
    'POST /api/boards/:boardId/edges', 'createEdge'),
  tool('board_create_sticky', 'Create plain board text in Staging, using v1 sticky width, weight and color. A human drags it onto the board to adopt it.',
    z.object({ board_id: id, input: createBoardStickySchema.pick({ text: true, x: true, y: true, w: true, weight: true, color_index: true }) }).strict(),
    'POST /api/boards/:boardId/stickies', 'createSticky'),
  tool('board_update_sticky', 'Update board sticky text or geometry/style with a reversible receipt. Does not adopt a Staging sticky.',
    z.object({ board_id: id, sticky_id: id, input: nonempty(sticky.pick({ text: true, x: true, y: true, w: true, weight: true, color_index: true })) }).strict(),
    'PATCH /api/boards/:boardId/stickies/:stickyId', 'updateSticky'),
  tool('board_patch_visual', 'Patch an existing board chalk, shape or freehand decoration through the human visual API, with reversible history.',
    z.object({ board_id: id, visual_id: id, input: visual }).strict(),
    'PATCH /api/boards/:boardId/visuals/:visualId', 'updateVisual'),
];
