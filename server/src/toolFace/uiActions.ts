import { z } from 'zod';
import type { ToolRegistryEntry } from './registry.js';

const id = z.string().trim().min(1);
export const uiFocusTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('note_block'), note_id: id, block_id: id }).strict(),
  z.object({ type: z.literal('note_page'), note_id: id, page_index: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal('board_member'), board_id: id, member_id: id }).strict(),
]);
const noteTargetSchema = z.object({ type: z.literal('note'), note_id: id }).strict();
const commandIdentity = { command_id: id, turn_id: id, conversation_id: id };
export const agentUiCommandSchema = z.discriminatedUnion('kind', [
  z.object({ ...commandIdentity, kind: z.literal('open_note'), target: noteTargetSchema }).strict(),
  z.object({ ...commandIdentity, kind: z.literal('focus_object'), target: uiFocusTargetSchema }).strict(),
]);
const outputSchema = z.object({
  dispatched: z.boolean(),
  message: z.string(),
  reason: z.literal('debounced').optional(),
  command: agentUiCommandSchema.optional(),
}).strict();

/** C4a: channel presentation only. Keep separate from domain writes and readers. */
export const AGENT_UI_TOOLS: ToolRegistryEntry[] = [
  {
    name: 'ui_open_note',
    description: 'Ask the current client to open an owned note in a document tab. No content is written. At most 8 UI commands per turn; repeated identical targets within 1 second are debounced. Success means issued, not displayed: the client may defer while the human types.',
    input_schema: z.object({ note_id: id }).strict(), output_schema: outputSchema,
    truth: 'content', tier: 'immediate', exposure: 'internal', scopes: ['notes:read'],
    human_entry: { route: 'GET /api/notes/:id', client_call_site: 'client/src/components/Layout/DocumentTabs.tsx' },
  },
  {
    name: 'ui_focus_object',
    description: 'Ask the current client to locate and briefly highlight a note block, zero-based note page, or placed board member. Pass target.type and its owned IDs. Never changes content, selection text, or saved viewport. Shares the 8-per-turn UI budget; identical targets within 1 second are debounced. Issued is not applied; do not claim the client has displayed it.',
    input_schema: z.object({ target: uiFocusTargetSchema }).strict(), output_schema: outputSchema,
    truth: 'spatial', tier: 'immediate', exposure: 'internal', scopes: ['notes:read', 'boards:read'],
    human_entry: { route: 'UI document navigation', client_call_site: 'client/src/components/Layout/DocumentTabs.tsx' },
  },
];
