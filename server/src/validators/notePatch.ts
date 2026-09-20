import { z } from 'zod';

const id = z.string().trim().min(1).max(180);
export const createNotePatchProposalSchema = z.object({
  note_id: id,
  patches: z.array(z.object({ block_id: id, unit_id: id.optional(), new_text: z.string().max(65536) }).strict()).min(1).max(64),
}).strict();
export const notePatchAcceptanceSchema = z.object({ proposal_id: id, patch_index: z.number().int().min(0).max(63) }).strict();
