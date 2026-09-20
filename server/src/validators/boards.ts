import { z } from 'zod';
import { createPurposeInputSchema } from './purposes.js';
import { skinSelectionSchema } from './skin.js';

const idSchema = z.string().trim().min(1).max(180);
const objectSchema = z.record(z.unknown());
const finiteNumber = z.number().finite();
// Mirrored in shared/types/boardLayers.ts; Base counts toward the limit.
export const BOARD_LAYER_LIMIT = 12;
const layerNameSchema = z.string().trim().min(1).max(120);

export const createBoardLayerSchema = z.object({ name: layerNameSchema }).strict();
export const updateBoardLayerSchema = z.object({
  name: layerNameSchema.optional(),
  visible: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'No layer changes provided');
export const reorderBoardLayersSchema = z.object({
  layer_ids: z.array(idSchema).max(BOARD_LAYER_LIMIT - 1),
}).strict();

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
  skin: skinSelectionSchema.nullable().optional(),
  title: z.string().trim().min(1).max(500).optional(),
  viewport: boardViewportSchema.optional(),
  base_layer_visible: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'No board changes provided');

export const relocateTraySchema = z.object({
  placement_ids: z.array(idSchema).min(1).max(500),
  layer_id: idSchema.nullable().optional(),
}).strict();

const memberGeometry = {
  layer_id: idSchema.nullable().optional(),
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

export const boardAnchorSchema = z.enum(['auto', 'n', 'e', 's', 'w']);
export const boardEdgeEndpointSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('member'), id: idSchema, anchor: boardAnchorSchema.default('auto') }).strict(),
  z.object({ kind: z.literal('sticky'), id: idSchema, anchor: boardAnchorSchema.default('auto') }).strict(),
  z.object({ kind: z.literal('point'), x: finiteNumber, y: finiteNumber }).strict(),
]);
const weightSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const colorIndexSchema = z.literal(1).nullable();
const edgeFields = z.object({
  from_member_id: idSchema.optional(),
  to_member_id: idSchema.optional(),
  from: boardEdgeEndpointSchema.optional(),
  to: boardEdgeEndpointSchema.optional(),
  bend: finiteNumber.optional(),
  dash: z.enum(['solid', 'dashed']).optional(),
  weight: weightSchema.optional(),
  cap_start: z.enum(['none', 'arrow', 'dot']).optional(),
  cap_end: z.enum(['none', 'arrow', 'dot']).optional(),
  color_index: colorIndexSchema.optional(),
  label_position: finiteNumber.min(0).max(1).optional(),
  visual_version: z.union([z.literal(0), z.literal(1)]).optional(),
  style: objectSchema.optional(),
  label: z.string().max(4000).nullable().optional(),
}).strict();

function unambiguousEndpoints(value: z.infer<typeof edgeFields>, ctx: z.RefinementCtx): void {
  for (const end of ['from', 'to'] as const) {
    if (value[end] !== undefined && value[`${end}_member_id`] !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Provide only one ${end} endpoint representation` });
    }
  }
}
export const createBoardEdgeSchema = edgeFields.superRefine((value, ctx) => {
  unambiguousEndpoints(value, ctx);
  for (const end of ['from', 'to'] as const) {
    if (value[end] === undefined && value[`${end}_member_id`] === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Missing ${end} endpoint` });
    }
  }
});
export const updateBoardEdgeSchema = edgeFields.superRefine(unambiguousEndpoints)
  .refine((value) => Object.keys(value).length > 0, 'No edge changes provided');

const stickyFields = {
  placed: z.boolean().optional(),
  text: z.string().max(12000).optional(),
  x: finiteNumber.optional(), y: finiteNumber.optional(),
  w: z.union([z.literal(240), z.literal(416)]).optional(),
  h: finiteNumber.min(120).optional(),
  color_index: colorIndexSchema.optional(), weight: weightSchema.optional(),
  layer_id: idSchema.nullable().optional(),
  z_index: finiteNumber.int().optional(), pinned: z.boolean().optional(),
};
export const createBoardStickySchema = z.object(stickyFields).strict();
export const updateBoardStickySchema = z.object(stickyFields).strict()
  .refine((value) => Object.keys(value).length > 0, 'No sticky changes provided');
export type BoardEdgeEndpoint = z.infer<typeof boardEdgeEndpointSchema>;

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
