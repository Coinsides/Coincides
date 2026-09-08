import { z } from 'zod';

const purposeIdSchema = z.string().trim().min(1).max(180);

// New souls are library citizens. Legacy note/default/member fields, identity
// claims, parent trees, and stored status changes have no creation contract.
export const createPurposeInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  project_id: purposeIdSchema.nullable().optional(),
  intent: z.string().max(4000).nullable().optional(),
  scope_note: z.string().max(4000).nullable().optional(),
  created_by: z.enum(['human', 'ai', 'system', 'ai_proposal', 'importer']).optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export type CreatePurposeInput = z.input<typeof createPurposeInputSchema>;

export const createPurposeRequestSchema = createPurposeInputSchema.extend({
  // This is executor prose: preserve its bytes, including leading whitespace.
  summary: z.string().max(8000).optional(),
}).strict();

export const listPurposesQuerySchema = z.object({
  project_id: purposeIdSchema.optional(),
  status: z.enum(['active', 'sealed', 'archived', 'all']).optional(),
}).strict();
