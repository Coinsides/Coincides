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

const interpretationText = z.string().max(4000);

// The hypothesis layer. Machine bookkeeping fields are written by the service.
export const purposeInterpretationDraftSchema = z.object({
  true_goal: interpretationText.optional(),
  territory: interpretationText.optional(),
  behavior_pattern: interpretationText.optional(),
  time_window: interpretationText.optional(),
  draft_status: z.enum(['pending', 'ready', 'failed']).optional(),
}).strict();

export type PurposeInterpretationDraft = z.infer<typeof purposeInterpretationDraftSchema>;

// A person edits the wording only; null clears a field.
const humanInterpretationPatchSchema = z.object({
  true_goal: interpretationText.nullable().optional(),
  territory: interpretationText.nullable().optional(),
  behavior_pattern: interpretationText.nullable().optional(),
  time_window: interpretationText.nullable().optional(),
}).strict();

export const amendPurposeInputSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  intent: z.string().max(4000).nullable().optional(),
  scope_note: z.string().max(4000).nullable().optional(),
  // The person's own words: stored byte for byte, never trimmed.
  user_verbatim: z.string().max(20000).nullable().optional(),
  interpretation: humanInterpretationPatchSchema.optional(),
  // A visibility switch, not retirement: it can be flipped back at any time.
  status: z.enum(['active', 'archived']).optional(),
}).strict();

export type AmendPurposeInput = z.input<typeof amendPurposeInputSchema>;

export const amendPurposeRequestSchema = amendPurposeInputSchema.extend({
  interpretation_locked: z.boolean().optional(),
  summary: z.string().max(8000).optional(),
}).strict().superRefine((value, context) => {
  const { summary: _summary, ...change } = value;
  if (Object.keys(change).length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'No purpose change was provided' });
  }
  if (value.interpretation && value.interpretation_locked === false) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['interpretation_locked'],
      message: 'A person editing the interpretation locks it',
    });
  }
});

// The constraint lives here by convention; the column has no CHECK.
export const purposeMemberKindSchema = z.enum(['content_group', 'item', 'source']);

export const addPurposeMemberInputSchema = z.object({
  member_kind: purposeMemberKindSchema,
  member_id: z.string().trim().min(1).max(180),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export type AddPurposeMemberInput = z.input<typeof addPurposeMemberInputSchema>;

export const listPurposesQuerySchema = z.object({
  project_id: purposeIdSchema.optional(),
  status: z.enum(['active', 'sealed', 'archived', 'all']).optional(),
}).strict();
