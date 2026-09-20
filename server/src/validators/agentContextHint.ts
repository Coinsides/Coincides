import { z } from 'zod';
import type { AgentContextHint, AgentContextHintType } from '../../../shared/types/agentContextHint.js';

// A3a: shared owns only the type contract; runtime schemas stay on this end.
const contextHintSchemas = {
  l1_onboarding: z.object({
    type: z.literal('l1_onboarding'),
    data: z.object({ isNewUser: z.boolean() }).strict(),
  }).strict(),
  calendar: z.object({
    type: z.literal('calendar'),
    data: z.object({ date: z.string().min(1) }).strict(),
  }).strict(),
  deck: z.object({
    type: z.literal('deck'),
    data: z.object({ deck_id: z.string().min(1), deck_name: z.string().optional() }).strict(),
  }).strict(),
  note_view: z.object({
    type: z.literal('note_view'),
    data: z.object({ note_id: z.string().min(1), page_index: z.number().int().min(0).optional(),
      selection: z.object({ note_id: z.string().min(1), block_ids: z.array(z.string().min(1)).min(1).max(32) }).strict().optional(),
    }).strict().refine(data => !data.selection || data.selection.note_id === data.note_id, 'Selection must belong to the viewed note'),
  }).strict(),
  board_view: z.object({
    type: z.literal('board_view'),
    data: z.object({ board_id: z.string().min(1) }).strict(),
  }).strict(),
} satisfies { [Type in AgentContextHintType]: z.ZodType<Extract<AgentContextHint, { type: Type }>> };

export const agentContextHintSchema = z.discriminatedUnion('type', [
  contextHintSchemas.l1_onboarding,
  contextHintSchemas.calendar,
  contextHintSchemas.deck,
  contextHintSchemas.note_view,
  contextHintSchemas.board_view,
]);

// Check both directions so a missing variant or required/optional field drift fails tsc.
type AssertTrue<Value extends true> = Value;
type SchemaMatchesContract = AssertTrue<
  [z.infer<typeof agentContextHintSchema>] extends [AgentContextHint]
    ? [AgentContextHint] extends [z.infer<typeof agentContextHintSchema>] ? true : false
    : false
>;
