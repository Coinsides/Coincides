import { z } from 'zod';
import { mountBoardMemberSchema } from './boards.js';

const id = z.string().trim().min(1).max(180);
const offset = z.number().int().nonnegative();
const address = {
  block_id: id,
  text_flow_id: id,
  text_unit_id: id,
  start_offset: offset,
  end_offset: offset,
  excerpt: z.string().max(200000),
};

export const boardTextRangeSelectionSchema = z.object({
  note_id: id,
  ...address,
  at: z.string().datetime({ offset: true }),
}).strict().refine((value) => value.end_offset > value.start_offset && value.excerpt.length > 0,
  'A board reference requires a nonempty text range');

export const updateBoardTextRangesSchema = z.object({
  text_ranges: z.array(z.object({
    id,
    ...address,
    start_offset: offset.nullable(),
    end_offset: offset.nullable(),
    status: z.enum(['active', 'drifted', 'lost']),
    pre_edit_offsets: z.object({ start_offset: offset.nullable(), end_offset: offset.nullable() }).strict().nullable(),
  }).strict().refine((value) => value.start_offset === null || value.end_offset === null
    || value.end_offset >= value.start_offset, 'Invalid range offsets')).max(10000),
}).strict();

export const mountBoardTextRangeSchema = mountBoardMemberSchema
  .omit({ id: true, member_kind: true, member_id: true })
  .extend({ text_range: boardTextRangeSelectionSchema });
