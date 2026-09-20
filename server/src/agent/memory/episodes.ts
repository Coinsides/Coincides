import { v4 as uuidv4 } from 'uuid';
import type { AgentEpisodeRecord, EpisodeAnchorManifest } from '../../../../shared/types/agentEpisodes.js';
import { getDb } from '../../db/init.js';

/** Original ledger rows; episode creation never changes any of these fields. */
export interface EpisodeMessage {
  rowid: number;
  id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  tool_results: string | null;
  meta?: string | null;
  created_at: string;
  turn_id?: string | null;
}

type AnchorKind = 'note' | 'board' | 'item' | 'proposal' | 'memory';
type EpisodeRow = Omit<AgentEpisodeRecord, 'message_range' | 'anchor_manifest'> & {
  message_range: string;
  anchor_manifest: string;
};
const columns = 'e.id, e.conversation_id, e.seq, e.summary_text, e.message_range, e.anchor_manifest, e.token_estimate, e.created_at, c.title AS conversation_title';
const kinds = new Set<AnchorKind>(['note', 'board', 'item', 'proposal', 'memory']);

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return undefined; }
}

function kind(value: unknown): AnchorKind | undefined {
  return typeof value === 'string' && kinds.has(value as AnchorKind) ? value as AnchorKind : undefined;
}

const resultKinds: Record<string, AnchorKind> = {
  get_note: 'note', list_notes: 'note', get_item: 'item', list_items: 'item',
  create_proposal: 'proposal', save_memory: 'memory', search_memories: 'memory',
};
const containerKinds: Record<string, AnchorKind> = {
  note: 'note', notes: 'note', board: 'board', boards: 'board', item: 'item',
  proposal: 'proposal', proposals: 'proposal', memory: 'memory', memories: 'memory',
};

/** Only typed IDs in saved tool calls/results and metadata are evidence. No prose parsing. */
export function extractAnchorManifest(messages: readonly EpisodeMessage[]): EpisodeAnchorManifest {
  const found: Record<AnchorKind, Set<string>> = {
    note: new Set(), board: new Set(), item: new Set(), proposal: new Set(), memory: new Set(),
  };
  const add = (anchorKind: AnchorKind | undefined, value: unknown) => {
    if (!anchorKind) return;
    if (Array.isArray(value)) { for (const entry of value) add(anchorKind, entry); return; }
    // Preserve the exact identifier, including non-UUID legacy forms; never truncate.
    if (typeof value === 'string' && value.length > 0) found[anchorKind].add(value);
  };
  const visit = (value: unknown, entityKind?: AnchorKind): void => {
    if (Array.isArray(value)) { for (const entry of value) visit(entry, entityKind); return; }
    const object = record(value);
    if (!object) return;
    const explicitKind = kind(object.kind) ?? kind(object.entity_kind) ?? kind(object.resource_kind);
    // A search_memories episode ID is not an agent_memory ID.
    if (object.kind !== 'episode') {
      const anchorKind = explicitKind ?? entityKind;
      add(anchorKind, explicitKind ? object[`${explicitKind}_id`] ?? object.target_id ?? object.id : object.id);
    }
    add(kind(object.member_kind), object.member_id);
    add(kind(object.target_kind), object.target_id);
    for (const [key, entry] of Object.entries(object)) {
      // The persisted contracts use snake_case IDs. Board layout's camelCase
      // itemIds are diagnostic visual/member IDs, not knowledge Item IDs.
      const typed = key.match(/(?:^|_)(note|board|item|proposal|memory)_ids?$/u);
      if (typed) add(kind(typed[1]), entry);
      // An explicit member kind scopes member_id, never the board-membership row's id.
      visit(entry, containerKinds[key]);
    }
  };
  const previousByTurn = new Map<string, EpisodeMessage>();
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const previous = message.turn_id ? previousByTurn.get(message.turn_id) : messages[index - 1];
    if (message.turn_id) previousByTurn.set(message.turn_id, message);
    visit(parsed(message.meta));
    const calls = parsed(message.tool_calls);
    if (Array.isArray(calls)) for (const callValue of calls) visit(record(callValue)?.arguments);
    const results = parsed(message.tool_results);
    if (!Array.isArray(results)) continue;
    // Same local pairing as turn receipts: named turns may interleave, and
    // reused call IDs never borrow another turn's or later round's tool kind.
    // Legacy rows have no registered ownership and only use global adjacency.
    const priorCalls = parsed(previous?.tool_calls);
    for (const resultValue of results) {
      const result = record(resultValue);
      const matched = Array.isArray(priorCalls) && typeof result?.tool_call_id === 'string'
        ? priorCalls.map(record).filter((call) => call?.id === result.tool_call_id) : [];
      const toolName = matched.length === 1 && typeof matched[0]?.name === 'string' ? matched[0].name : undefined;
      visit(parsed(result?.content), toolName ? resultKinds[toolName] : undefined);
    }
  }
  return { note_ids: [...found.note], board_ids: [...found.board], item_ids: [...found.item],
    proposal_ids: [...found.proposal], memory_ids: [...found.memory] };
}

function fromRow(row: EpisodeRow): AgentEpisodeRecord {
  return { ...row, message_range: JSON.parse(row.message_range), anchor_manifest: JSON.parse(row.anchor_manifest) };
}

export function listConversationMessages(userId: string, conversationId: string): EpisodeMessage[] {
  return getDb().prepare(`SELECT m.rowid, m.id, m.role, m.content, m.tool_calls, m.tool_results,
    m.created_at, m.turn_id, m.meta FROM agent_messages m
    JOIN agent_conversations c ON c.id = m.conversation_id
    WHERE c.user_id = ? AND c.id = ? ORDER BY m.rowid ASC`).all(userId, conversationId) as EpisodeMessage[];
}

/** Chronological sequence within each conversation, for both projection assembly and the human list. */
export function listEpisodes(userId: string, conversationId?: string): AgentEpisodeRecord[] {
  const rows = getDb().prepare(`SELECT ${columns} FROM agent_episodes e
    JOIN agent_conversations c ON c.id = e.conversation_id
    WHERE e.user_id = ? AND c.user_id = ? ${conversationId ? 'AND e.conversation_id = ?' : ''}
    ORDER BY c.updated_at DESC, e.conversation_id, e.seq ASC`)
    .all(userId, userId, ...(conversationId ? [conversationId] : [])) as EpisodeRow[];
  return rows.map(fromRow);
}

/** Immutable projection insertion, with a stable sequence and a transaction covering overlap checks. */
export function insertEpisode(userId: string, conversationId: string, messages: readonly EpisodeMessage[],
  summaryText: string, tokenEstimate: number): AgentEpisodeRecord {
  if (!messages.length || !summaryText.trim() || !Number.isInteger(tokenEstimate) || tokenEstimate < 0) {
    throw new Error('Invalid episode projection');
  }
  const db = getDb();
  return db.transaction(() => {
    const original = listConversationMessages(userId, conversationId);
    const firstIndex = original.findIndex((message) => message.id === messages[0].id);
    const segment = original.slice(firstIndex, firstIndex + messages.length);
    if (firstIndex < 0 || segment.length !== messages.length || segment.some((message, index) => message.id !== messages[index].id)) {
      throw new Error('Episode range must be contiguous original messages in the owned conversation');
    }
    const first = segment[0];
    const last = segment[segment.length - 1];
    const existing = listEpisodes(userId, conversationId);
    const same = existing.find((episode) => episode.message_range.first_message_id === first.id
      && episode.message_range.last_message_id === last.id);
    if (same) return same;
    const positions = new Map(original.map((message) => [message.id, message.rowid]));
    if (existing.some((episode) => (positions.get(episode.message_range.first_message_id) ?? Infinity) <= last.rowid
      && (positions.get(episode.message_range.last_message_id) ?? -Infinity) >= first.rowid)) {
      throw new Error('Episode range overlaps an existing projection');
    }
    const episode: AgentEpisodeRecord = {
      id: uuidv4(), conversation_id: conversationId, seq: first.rowid, summary_text: summaryText,
      message_range: { first_message_id: first.id, last_message_id: last.id,
        started_at: first.created_at, ended_at: last.created_at },
      anchor_manifest: extractAnchorManifest(segment), token_estimate: tokenEstimate, created_at: new Date().toISOString(),
    };
    db.prepare(`INSERT INTO agent_episodes
      (id, user_id, conversation_id, seq, summary_text, message_range, anchor_manifest, token_estimate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(episode.id, userId, conversationId, episode.seq, summaryText,
        JSON.stringify(episode.message_range), JSON.stringify(episode.anchor_manifest), tokenEstimate, episode.created_at);
    return listEpisodes(userId, conversationId).find((entry) => entry.id === episode.id)!;
  }).immediate();
}

/** The older episode lane searches summaries, never eagerly loads their original conversation messages. */
export function searchEpisodes(userId: string, query: string, limit = 10): AgentEpisodeRecord[] {
  const terms = query.match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (!terms.length || limit <= 0) return [];
  const match = terms.map((term) => `"${term}"`).join(' ');
  const rows = getDb().prepare(`SELECT ${columns} FROM agent_episodes_fts fts
    JOIN agent_episodes e ON e.rowid = fts.rowid
    JOIN agent_conversations c ON c.id = e.conversation_id
    WHERE agent_episodes_fts MATCH ? AND e.user_id = ? AND c.user_id = ?
    ORDER BY rank, e.seq DESC LIMIT ?`).all(match, userId, userId, Math.floor(limit)) as EpisodeRow[];
  return rows.map(fromRow);
}

/** Delete the disposable projection only. Original message rows remain available for recompression. */
export function deleteEpisode(userId: string, id: string): boolean {
  return getDb().prepare('DELETE FROM agent_episodes WHERE user_id = ? AND id = ?').run(userId, id).changes > 0;
}
