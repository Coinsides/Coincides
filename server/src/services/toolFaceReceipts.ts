import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';
import { getDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import type { ToolRegistryHumanEntry, ToolTier } from '../toolFace/registry.js';

const TOOL_FACE_RECEIPT_SOURCE_TYPE = 'mcp';
export const AGENT_CHAT_RECEIPT_SOURCE_TYPE = 'agent_chat';
type ReceiptSource = typeof TOOL_FACE_RECEIPT_SOURCE_TYPE | typeof AGENT_CHAT_RECEIPT_SOURCE_TYPE;

export type ToolFaceReceiptTier = Extract<ToolTier, 'immediate' | 'propose'>;
export type ToolFaceReceiptStatus = 'applied' | 'proposed' | 'dismissed' | 'reverted';
export type ToolFaceRevertOutcome = 'complete' | 'partial';
export type ToolFaceReceiptResource = Record<string, unknown>;

export interface WriteToolFaceReceiptInput {
  sourceType?: ReceiptSource;
  agentContext?: { actor: 'agent'; channel: 'chat'; conversation_id: string; event_seq: number; batch_id?: string; board_id?: string };
  userId: string;
  courseId?: string | null;
  callId: string;
  tool: string;
  tier: ToolFaceReceiptTier;
  harness: string;
  inputDigest: string;
  humanEntry: ToolRegistryHumanEntry;
  resources: ToolFaceReceiptResource[];
  intendedInput?: Record<string, unknown>;
}

export interface RevertToolFaceReceiptInput {
  outcome: ToolFaceRevertOutcome;
  details: Record<string, unknown>;
}

export interface MarkToolFaceReceiptAppliedInput {
  resources?: ToolFaceReceiptResource[];
}

export interface DismissToolFaceReceiptInput {
  userId: string;
  receiptId: string;
}

export interface ListToolFaceReceiptsInput {
  userId: string;
  status: ToolFaceReceiptStatus;
}

export interface ToolFaceReceiptMetadata {
  agent_context?: WriteToolFaceReceiptInput['agentContext'];
  tool: string;
  tier: ToolFaceReceiptTier;
  harness: string;
  input_digest: string;
  human_entry: ToolRegistryHumanEntry;
  resources: ToolFaceReceiptResource[];
  intended_input?: Record<string, unknown>;
  revert_outcome?: ToolFaceRevertOutcome;
  revert_details?: Record<string, unknown>;
}

export interface ToolFaceReceipt {
  id: string;
  user_id: string;
  course_id: string | null;
  source_type: ReceiptSource;
  source_id: string;
  label: string | null;
  status: ToolFaceReceiptStatus;
  metadata: ToolFaceReceiptMetadata;
  created_at: string;
  applied_at: string | null;
  reverted_at: string | null;
}

interface ToolFaceReceiptRow extends Omit<ToolFaceReceipt, 'source_type' | 'metadata'> {
  source_type: string;
  metadata: string;
}

function receiptTimestamp(): string {
  return new Date().toISOString();
}

function statusForTier(tier: string): Extract<ToolFaceReceiptStatus, 'applied' | 'proposed'> {
  if (tier === 'immediate') return 'applied';
  if (tier === 'propose') return 'proposed';
  throw new AppError(400, 'Tool face receipt tier must be immediate or propose');
}

function requiredText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new AppError(400, `${label} is required`);
  return normalized;
}

function parseMetadata(value: string): ToolFaceReceiptMetadata {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ToolFaceReceiptMetadata;
    }
  } catch {
    // Fall through to the explicit receipt-corruption error.
  }
  throw new AppError(409, 'Tool face receipt metadata is invalid');
}

function hydrateReceipt(row: ToolFaceReceiptRow): ToolFaceReceipt {
  if (row.source_type !== TOOL_FACE_RECEIPT_SOURCE_TYPE && row.source_type !== AGENT_CHAT_RECEIPT_SOURCE_TYPE) {
    throw new AppError(409, 'Operation batch is not a tool face receipt');
  }
  return {
    ...row,
    source_type: row.source_type,
    metadata: parseMetadata(row.metadata),
  };
}

export function readToolFaceReceipt(id: string, db: Database.Database = getDb()): ToolFaceReceipt {
  const row = db.prepare(`
    SELECT id, user_id, course_id, source_type, source_id, label, status, metadata,
           created_at, applied_at, reverted_at
    FROM operation_batches
    WHERE id = ?
  `).get(id) as ToolFaceReceiptRow | undefined;
  if (!row) throw new AppError(404, 'Tool face receipt not found');
  return hydrateReceipt(row);
}

export function listToolFaceReceipts({
  userId,
  status,
}: ListToolFaceReceiptsInput): ToolFaceReceipt[] {
  const resolvedUserId = requiredText(userId, 'userId');
  return (getDb().prepare(`
    SELECT id, user_id, course_id, source_type, source_id, label, status, metadata,
           created_at, applied_at, reverted_at
    FROM operation_batches
    WHERE user_id = ? AND source_type IN ('mcp', 'agent_chat') AND status = ?
    ORDER BY created_at DESC, id DESC
  `).all(resolvedUserId, status) as ToolFaceReceiptRow[]).map(hydrateReceipt);
}

function assertOwnedCourse(db: Database.Database, userId: string, courseId: string | null): void {
  if (!courseId) return;
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

export function writeToolFaceReceipt(input: WriteToolFaceReceiptInput, db: Database.Database = getDb()): ToolFaceReceipt {
  const userId = requiredText(input.userId, 'userId');
  const callId = requiredText(input.callId, 'callId');
  const tool = requiredText(input.tool, 'tool');
  const harness = requiredText(input.harness, 'harness');
  const inputDigest = requiredText(input.inputDigest, 'inputDigest');
  const courseId = input.courseId == null ? null : requiredText(input.courseId, 'courseId');
  const status = statusForTier(input.tier);
  const appliedAt = status === 'applied' ? receiptTimestamp() : null;
  const id = uuidv4();
  const metadata: ToolFaceReceiptMetadata = {
    ...(input.agentContext && { agent_context: { ...input.agentContext } }),
    tool,
    tier: input.tier,
    harness,
    input_digest: inputDigest,
    human_entry: { ...input.humanEntry },
    resources: input.resources.map((resource) => ({ ...resource })),
    ...(input.intendedInput && { intended_input: structuredClone(input.intendedInput) }),
  };

  assertOwnedCourse(db, userId, courseId);
  db.prepare(`
    INSERT INTO operation_batches (
      id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    courseId,
    input.sourceType ?? TOOL_FACE_RECEIPT_SOURCE_TYPE,
    callId,
    `${input.sourceType === AGENT_CHAT_RECEIPT_SOURCE_TYPE ? 'Agent chat' : 'MCP'} ${tool}`,
    status,
    JSON.stringify(metadata),
    appliedAt,
  );
  return readToolFaceReceipt(id, db);
}

export function markToolFaceReceiptApplied(
  id: string,
  input: MarkToolFaceReceiptAppliedInput = {},
): ToolFaceReceipt {
  const receipt = readToolFaceReceipt(requiredText(id, 'id'));
  if (receipt.status === 'applied') return receipt;
  if (receipt.status !== 'proposed') {
    throw new AppError(409, 'Only a proposed tool face receipt can be applied');
  }
  const resources = input.resources?.map((resource) => ({ ...resource }));
  const result = resources
    ? getDb().prepare(`
        UPDATE operation_batches
        SET status = 'applied', metadata = ?, applied_at = ?
        WHERE id = ? AND source_type = 'mcp' AND status = 'proposed'
      `).run(
        JSON.stringify({ ...receipt.metadata, resources }),
        receiptTimestamp(),
        receipt.id,
      )
    : getDb().prepare(`
        UPDATE operation_batches
        SET status = 'applied', applied_at = ?
        WHERE id = ? AND source_type = 'mcp' AND status = 'proposed'
      `).run(receiptTimestamp(), receipt.id);
  if (result.changes !== 1) throw new AppError(409, 'Tool face receipt apply conflict');
  return readToolFaceReceipt(receipt.id);
}

export function dismissToolFaceReceipt({
  userId,
  receiptId,
}: DismissToolFaceReceiptInput): ToolFaceReceipt {
  const resolvedUserId = requiredText(userId, 'userId');
  const receipt = readToolFaceReceipt(requiredText(receiptId, 'receiptId'));
  if (receipt.user_id !== resolvedUserId) {
    throw new AppError(403, 'Tool face receipt is not owned by user');
  }
  if (receipt.status !== 'proposed') {
    throw new AppError(409, 'Only a proposed tool face receipt can be dismissed');
  }
  const result = getDb().prepare(`
    UPDATE operation_batches
    SET status = 'dismissed'
    WHERE id = ? AND user_id = ? AND source_type = 'mcp' AND status = 'proposed'
  `).run(receipt.id, resolvedUserId);
  if (result.changes !== 1) throw new AppError(409, 'Tool face receipt dismiss conflict');
  return readToolFaceReceipt(receipt.id);
}

export function revertToolFaceReceipt(
  id: string,
  input: RevertToolFaceReceiptInput,
  db: Database.Database = getDb(),
): ToolFaceReceipt {
  const receipt = readToolFaceReceipt(requiredText(id, 'id'), db);
  if (receipt.status === 'reverted') {
    throw new AppError(409, 'Tool face receipt is already reverted');
  }
  if (input.outcome !== 'complete' && input.outcome !== 'partial') {
    throw new AppError(400, 'Tool face receipt revert outcome must be complete or partial');
  }
  const metadata: ToolFaceReceiptMetadata = {
    ...receipt.metadata,
    revert_outcome: input.outcome,
    revert_details: { ...input.details },
  };
  const result = db.prepare(`
    UPDATE operation_batches
    SET status = 'reverted', metadata = ?, reverted_at = ?
    WHERE id = ? AND source_type IN ('mcp', 'agent_chat') AND status IN ('applied', 'proposed')
  `).run(JSON.stringify(metadata), receiptTimestamp(), receipt.id);
  if (result.changes !== 1) throw new AppError(409, 'Tool face receipt revert conflict');
  return readToolFaceReceipt(receipt.id, db);
}
