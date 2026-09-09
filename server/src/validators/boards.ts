import { z } from 'zod';
import { createPurposeInputSchema } from './purposes.js';

const idSchema = z.string().trim().min(1).max(180);
const objectSchema = z.record(z.unknown());
const finiteNumber = z.number().finite();

export const boardViewportSchema = z.object({
  x: finiteNumber,
  y: finiteNumber,
  zoom: finiteNumber.positive(),
}).strict();

export const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(500),
  soul_id: idSchema.optional(),
  purpose: createPurposeInputSchema.optional(),
  project_id: idSchema.nullable().optional(),
  viewport: boardViewportSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (Boolean(value.soul_id) === Boolean(value.purpose)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide either soul_id or purpose' });
  }
});

export const updateBoardSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  viewport: boardViewportSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'No board changes provided');

export const relocateTraySchema = z.object({
  placement_ids: z.array(idSchema).min(1).max(500),
}).strict();

const memberGeometry = {
  x: finiteNumber.optional(),
  y: finiteNumber.optional(),
  w: finiteNumber.nonnegative().optional(),
  h: finiteNumber.nonnegative().optional(),
  scale: finiteNumber.positive().optional(),
  z_index: finiteNumber.int().optional(),
  pinned: z.boolean().optional(),
};

// text_range uses a board-owned anchor, minted with its projection in one transaction.
export const mountBoardMemberSchema = z.object({
  id: idSchema.optional(),
  member_kind: z.enum(['note', 'content_group', 'item', 'text_range']),
  member_id: idSchema,
  placed: z.boolean().optional(),
  ...memberGeometry,
  metadata: objectSchema.optional(),
}).strict();

export const updateBoardMemberSchema = z.object({ ...memberGeometry, placed: z.boolean().optional() }).strict()
  .refine((value) => Object.keys(value).length > 0, 'No member placement changes provided');

export const createBoardEdgeSchema = z.object({
  from_member_id: idSchema,
  to_member_id: idSchema,
  style: objectSchema.optional(),
  label: z.string().max(4000).nullable().optional(),
}).strict();

export const updateBoardEdgeSchema = createBoardEdgeSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'No edge changes provided');

export const boardVisualKindSchema = z.enum(['freehand', 'shape', 'image', 'table', 'connector', 'sticky']);
// Mirrored in shared/types/boardSticky.ts; the cross-end test locks equality.
// Server product runtime imports from shared are intentionally forbidden.
export const BOARD_STICKY_TEXT_LIMIT = 280;
export const boardStickyDataSchema = z.object({
  text: z.string().max(BOARD_STICKY_TEXT_LIMIT, `Board chalk is limited to ${BOARD_STICKY_TEXT_LIMIT} characters`),
}).strict();
const visualGeometry = { ...memberGeometry, rotation: finiteNumber.optional() };

export const createBoardVisualSchema = z.object({
  visual_kind: boardVisualKindSchema,
  ...visualGeometry,
  data: objectSchema,
  metadata: objectSchema.optional(),
}).strict();

export const updateBoardVisualSchema = z.object({
  ...visualGeometry,
  data: objectSchema.optional(),
  metadata: objectSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'No visual changes provided');

// Extra data remains intact for future tray transfers, including connector raw endpoints.
export const boardFreehandDataSchema = z.object({
  points: z.array(z.object({
    x: finiteNumber,
    y: finiteNumber,
    pressure: finiteNumber.nonnegative().optional(),
  }).passthrough()).min(1).optional(),
  path: z.string().min(1).optional(),
  style: objectSchema.optional(),
}).passthrough().refine((value) => value.points !== undefined || value.path !== undefined,
  'Freehand data requires points or path');

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type MountBoardMemberInput = z.infer<typeof mountBoardMemberSchema>;
export type UpdateBoardMemberInput = z.infer<typeof updateBoardMemberSchema>;
export type CreateBoardEdgeInput = z.infer<typeof createBoardEdgeSchema>;
export type UpdateBoardEdgeInput = z.infer<typeof updateBoardEdgeSchema>;
export type CreateBoardVisualInput = z.infer<typeof createBoardVisualSchema>;
export type UpdateBoardVisualInput = z.infer<typeof updateBoardVisualSchema>;
export type BoardVisualKind = z.infer<typeof boardVisualKindSchema>;
