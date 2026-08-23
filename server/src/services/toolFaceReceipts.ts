import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import type { ToolRegistryHumanEntry, ToolTier } from '../toolFace/registry.js';

const TOOL_FACE_RECEIPT_SOURCE_TYPE = 'mcp';

export type ToolFaceReceiptTier = Extract<ToolTier, 'immediate' | 'propose'>;
export type ToolFaceReceiptStatus = 'applied' | 'proposed' | 'reverted';
export type ToolFaceRevertOutcome = 'complete' | 'partial';
export type ToolFaceReceiptResource = Record<string, unknown>;

export interface WriteToolFaceReceiptInput {
  userId: string;
  courseId?: string | null;
  callId: string;
  tool: string;
  tier: ToolFaceReceiptTier;
  harness: string;
  inputDigest: string;
  humanEntry: ToolRegistryHumanEntry;
  resources: ToolFaceReceiptResource[];
}

export interface RevertToolFaceReceiptInput {
  outcome: ToolFaceRevertOutcome;
  details: Record<string, unknown>;
}

export interface ToolFaceReceiptMetadata {
  tool: string;
  tier: ToolFaceReceiptTier;
  harness: string;
  input_digest: string;
  human_entry: ToolRegistryHumanEntry;
  resources: ToolFaceReceiptResource[];
  revert_outcome?: ToolFaceRevertOutcome;
  revert_details?: Record<string, unknown>;
}

export interface ToolFaceReceipt {
  id: string;
  user_id: string;
  course_id: string | null;
  source_type: typeof TOOL_FACE_RECEIPT_SOURCE_TYPE;
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

function statusForTier(tier: string): Exclude<ToolFaceReceiptStatus, 'reverted'> {
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
  if (row.source_type !== TOOL_FACE_RECEIPT_SOURCE_TYPE) {
    throw new AppError(409, 'Operation batch is not a tool face receipt');
  }
  return {
    ...row,
    source_type: TOOL_FACE_RECEIPT_SOURCE_TYPE,
    metadata: parseMetadata(row.metadata),
  };
}

function readToolFaceReceipt(id: string): ToolFaceReceipt {
  const row = getDb().prepare(`
    SELECT id, user_id, course_id, source_type, source_id, label, status, metadata,
           created_at, applied_at, reverted_at
    FROM operation_batches
    WHERE id = ?
  `).get(id) as ToolFaceReceiptRow | undefined;
  if (!row) throw new AppError(404, 'Tool face receipt not found');
  return hydrateReceipt(row);
}

function assertOwnedCourse(userId: string, courseId: string | null): void {
  if (!courseId) return;
  const course = getDb().prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

export function writeToolFaceReceipt(input: WriteToolFaceReceiptInput): ToolFaceReceipt {
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
    tool,
    tier: input.tier,
    harness,
    input_digest: inputDigest,
    human_entry: { ...input.humanEntry },
    resources: input.resources.map((resource) => ({ ...resource })),
  };

  assertOwnedCourse(userId, courseId);
  getDb().prepare(`
    INSERT INTO operation_batches (
      id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at
    ) VALUES (?, ?, ?, 'mcp', ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    courseId,
    callId,
    `MCP ${tool}`,
    status,
    JSON.stringify(metadata),
    appliedAt,
  );
  return readToolFaceReceipt(id);
}

export function markToolFaceReceiptApplied(id: string): ToolFaceReceipt {
  const receipt = readToolFaceReceipt(requiredText(id, 'id'));
  if (receipt.status === 'applied') return receipt;
  if (receipt.status !== 'proposed') {
    throw new AppError(409, 'Only a proposed tool face receipt can be applied');
  }
  const result = getDb().prepare(`
    UPDATE operation_batches
    SET status = 'applied', applied_at = ?
    WHERE id = ? AND source_type = 'mcp' AND status = 'proposed'
  `).run(receiptTimestamp(), receipt.id);
  if (result.changes !== 1) throw new AppError(409, 'Tool face receipt apply conflict');
  return readToolFaceReceipt(receipt.id);
}

export function revertToolFaceReceipt(
  id: string,
  input: RevertToolFaceReceiptInput,
): ToolFaceReceipt {
  const receipt = readToolFaceReceipt(requiredText(id, 'id'));
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
  const result = getDb().prepare(`
    UPDATE operation_batches
    SET status = 'reverted', metadata = ?, reverted_at = ?
    WHERE id = ? AND source_type = 'mcp' AND status IN ('applied', 'proposed')
  `).run(JSON.stringify(metadata), receiptTimestamp(), receipt.id);
  if (result.changes !== 1) throw new AppError(409, 'Tool face receipt revert conflict');
  return readToolFaceReceipt(receipt.id);
}
