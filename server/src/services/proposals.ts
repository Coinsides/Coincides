import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { ProposalType } from '../../../shared/types/index.js';
import { recordEvent } from '../db/recordEvent.js';
import { AppError } from '../middleware/errorHandler.js';
import { proposalTypeSchema } from '../validators/index.js';
import type { AgentActionContext } from './recordAgentAction.js';

/** Supplied by the entry point, separate from the proposal's data. */
export type ProposalCreationContext = { actor: 'human'; channel: 'ui' } | AgentActionContext;

export const HUMAN_PROPOSAL_CONTEXT = { actor: 'human', channel: 'ui' } as const;

export function createProposal<T>(
  db: Database.Database,
  userId: string,
  input: { type: ProposalType; data: T; context: ProposalCreationContext },
) {
  const type = proposalTypeSchema.parse(input.type);
  const { context } = input;
  if (!context || (context.actor === 'agent'
    ? context.channel !== 'chat' || !context.conversationId?.trim()
    : context.actor !== 'human' || context.channel !== 'ui')) {
    throw new AppError(400, 'Proposal creation context is required');
  }

  // Issuing a pending proposal records speech, not execution or an undo receipt.
  return db.transaction(() => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const conversationId = context.actor === 'agent' ? context.conversationId : null;
    db.prepare(`
      INSERT INTO proposals (id, user_id, conversation_id, type, status, data, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, userId, conversationId, type, JSON.stringify(input.data), now);
    recordEvent(db, {
      user_id: userId,
      actor_kind: context.actor,
      channel: context.channel,
      verb: 'proposal_issued',
      objects: [{ kind: 'proposal', id }],
      summary: 'Issued a proposal',
      meta: { proposal_type: type, conversation_id: conversationId },
    });
    return {
      id, user_id: userId, type, status: 'pending' as const,
      data: input.data, created_at: now, resolved_at: null,
    };
  }).immediate();
}
