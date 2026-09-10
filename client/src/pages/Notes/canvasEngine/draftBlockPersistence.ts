import type { TemplateOption } from '@/services/templateOptions';
import {
  classifyCanvasSurfaceAuthority,
  type CanvasSurfaceAuthority,
} from '../../../../../shared/types/canvasSurfaceAuthority';
import type { FieldValueRecord } from './blockContentService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import type { AnnotationRangeSnapshot } from './textFlowEditSession';
import type { BoardRangeSaveSnapshot } from './boardTextRangeEditSession';

export interface DraftBlockCreateResult {
  /** Authoritative durable snapshot returned by the create/replay endpoint. */
  block: NoteBlock;
  clientCreateKey: string;
  placementPersisted: boolean;
  reused: boolean;
}

export interface DraftRecoveryReceipt {
  version: 2;
  noteId: string;
  clientCreateKey: string;
  text: string;
  contentJson?: Record<string, unknown>;
  layout: BlockBoxLayout;
  template: TemplateOption;
  queuedAt: string;
}

export interface BlockEditRecoveryReceipt {
  readonly version: 2;
  readonly kind: 'block_edit_recovery';
  readonly recoveryKey: string;
  readonly noteId: string;
  readonly requestedNoteId: string;
  readonly mountNonce: string;
  readonly creationGeneration: number;
  readonly operationSequence: number;
  readonly blockId: string;
  readonly text: string;
  readonly plainText: string;
  readonly contentJson: Record<string, unknown>;
  readonly textFlow?: TextBlockContentV1;
  readonly fieldValues?: FieldValueRecord;
  readonly baseRevision?: number;
  readonly annotationRanges?: AnnotationRangeSnapshot[];
  readonly boardRangeSnapshot?: BoardRangeSaveSnapshot;
  readonly hydrationEpoch: number;
  readonly queuedAt: string;
}

export interface BlockedDraftRecoveryReceipt {
  clientCreateKey: string | null;
  raw: unknown;
  reason: 'invalid_json' | 'invalid_shape' | 'owner_authority_unknown' | 'unsupported_version';
  storageKey: string;
}

export interface DraftRecoveryQueue {
  replayable: DraftRecoveryReceipt[];
  blocked: BlockedDraftRecoveryReceipt[];
}

export interface DraftRecoveryPersistence {
  createOrReuse: (receipt: DraftRecoveryReceipt) => Promise<NoteBlock>;
  saveLatest: (block: NoteBlock, receipt: DraftRecoveryReceipt) => Promise<void>;
  savePlacement: (block: NoteBlock, receipt: DraftRecoveryReceipt) => Promise<void>;
}

export const DRAFT_RECOVERY_STORAGE_KEY_V1 = 'coincides:draft-recovery:v1';
export const DRAFT_RECOVERY_STORAGE_KEY_V2 = 'coincides:draft-recovery:v2';

function recoveryStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function blockEditRecoveryScopeKey(noteId: string, blockId: string): string {
  return `${noteId}\u0000${blockId}`;
}

export function createBlockEditRecoveryKey(
  noteId: string,
  blockId: string,
  creationGeneration: number,
  operationSequence: number,
  mountNonce: string,
): string {
  return `block-edit:${noteId}:${blockId}:${mountNonce}:${creationGeneration}:${operationSequence}`;
}

function validateBlockEditRecoveryReceipt(raw: unknown): BlockEditRecoveryReceipt | null {
  if (
    !isRecord(raw)
    || raw.version !== 2
    || raw.kind !== 'block_edit_recovery'
    || typeof raw.recoveryKey !== 'string'
    || typeof raw.noteId !== 'string'
    || !raw.noteId.trim()
    || typeof raw.requestedNoteId !== 'string'
    || raw.requestedNoteId !== raw.noteId
    || typeof raw.mountNonce !== 'string'
    || !raw.mountNonce.trim()
    || !Number.isInteger(raw.creationGeneration)
    || (raw.creationGeneration as number) < 0
    || !Number.isInteger(raw.operationSequence)
    || (raw.operationSequence as number) <= 0
    || typeof raw.blockId !== 'string'
    || !raw.blockId.trim()
    || typeof raw.text !== 'string'
    || typeof raw.plainText !== 'string'
    || !isRecord(raw.contentJson)
    || (raw.textFlow !== undefined && !isRecord(raw.textFlow))
    || (raw.fieldValues !== undefined && !isRecord(raw.fieldValues))
    || !Number.isInteger(raw.hydrationEpoch)
    || (raw.hydrationEpoch as number) < 0
    || typeof raw.queuedAt !== 'string'
    || !raw.queuedAt
  ) return null;
  const creationGeneration = raw.creationGeneration as number;
  const operationSequence = raw.operationSequence as number;
  if (raw.recoveryKey !== createBlockEditRecoveryKey(
    raw.noteId,
    raw.blockId,
    creationGeneration,
    operationSequence,
    raw.mountNonce,
  )) return null;
  return {
    version: 2,
    kind: 'block_edit_recovery',
    recoveryKey: raw.recoveryKey,
    noteId: raw.noteId,
    requestedNoteId: raw.requestedNoteId,
    mountNonce: raw.mountNonce,
    creationGeneration,
    operationSequence,
    blockId: raw.blockId,
    text: raw.text,
    plainText: raw.plainText,
    contentJson: raw.contentJson,
    textFlow: raw.textFlow as TextBlockContentV1 | undefined,
    fieldValues: raw.fieldValues as FieldValueRecord | undefined,
    baseRevision: typeof raw.baseRevision === 'number' ? raw.baseRevision : undefined,
    annotationRanges: raw.annotationRanges as AnnotationRangeSnapshot[] | undefined,
    boardRangeSnapshot: raw.boardRangeSnapshot as BoardRangeSaveSnapshot | undefined,
    hydrationEpoch: raw.hydrationEpoch as number,
    queuedAt: raw.queuedAt,
  };
}

function clientCreateKeyFromRaw(value: unknown): string | null {
  return isRecord(value) && typeof value.clientCreateKey === 'string'
    ? value.clientCreateKey
    : null;
}

function readStorageEntries(storage: Storage, storageKey: string): {
  entries: unknown[];
  invalidJson: string | null;
} {
  const raw = storage.getItem(storageKey);
  if (raw === null) return { entries: [], invalidJson: null };
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? { entries: parsed, invalidJson: null }
      : { entries: [], invalidJson: raw };
  } catch {
    return { entries: [], invalidJson: raw };
  }
}

function writeStorageEntries(storage: Storage, storageKey: string, entries: unknown[]): boolean {
  let targetBytes: string | null;
  try {
    targetBytes = entries.length === 0 ? null : JSON.stringify(entries);
  } catch {
    return false;
  }
  try {
    if (targetBytes === null) storage.removeItem(storageKey);
    else storage.setItem(storageKey, targetBytes);
  } catch {
    // A throwing storage implementation may still have committed; verify below.
  }
  try {
    return storage.getItem(storageKey) === targetBytes;
  } catch {
    return false;
  }
}

function hasValidCanonicalOwner(layout: BlockBoxLayout): boolean {
  const rawLayout = layout as unknown as Record<string, unknown>;
  const coordinateSpace = rawLayout.coordinate_space;
  if (coordinateSpace !== 'canvas_world') return false;

  const rawFrameId = rawLayout.frame_id;
  const frameAbsent = rawFrameId === undefined || rawFrameId === null;
  const frameId = typeof rawFrameId === 'string' && rawFrameId.trim()
    ? rawFrameId
    : null;
  if (!frameAbsent && !frameId) return false;

  const rawAuthority = rawLayout.surface_authority;
  let authority: Record<string, unknown> | null = null;
  if (rawAuthority !== undefined && rawAuthority !== null) {
    if (!isRecord(rawAuthority)) return false;
    authority = rawAuthority;
  }
  const rawBoundary = authority?.pageBoundary;
  const boundaryAbsent = rawBoundary === undefined || rawBoundary === null;
  let boundary: Record<string, unknown> | null = null;
  if (!boundaryAbsent) {
    if (!isRecord(rawBoundary)) return false;
    boundary = rawBoundary;
  }

  const declaredSurface = rawLayout.surface;
  const declaredBoundaryRole = rawLayout.boundary_role;
  const isCanonicalOutside = declaredSurface === 'canvas_workspace'
    && declaredBoundaryRole === 'outside';
  if (isCanonicalOutside) {
    return frameAbsent
      && boundaryAbsent
      && (authority === null || authority.coordinateSpace === 'canvas_world');
  }
  const isCanonicalFramedRole = (
    declaredSurface === 'formal_page' && declaredBoundaryRole === 'inside'
  ) || (
    declaredSurface === 'canvas_workspace' && declaredBoundaryRole === 'crossing'
  );
  if (!isCanonicalFramedRole || !frameId || !authority || !boundary) return false;

  const left = boundary.left;
  const right = boundary.right;
  if (
    authority.coordinateSpace !== coordinateSpace
    || typeof left !== 'number'
    || !Number.isFinite(left)
    || typeof right !== 'number'
    || !Number.isFinite(right)
    || right <= left
    || boundary.frameId !== frameId
  ) return false;

  const decision = classifyCanvasSurfaceAuthority({
    coordinateSpace,
    box: { x: layout.x, width: layout.width },
    pageBoundary: { left, right, frameId },
    explicitSurface: declaredSurface as CanvasSurfaceAuthority,
  });
  return decision.surface === declaredSurface
    && decision.boundaryRole === declaredBoundaryRole
    && decision.frameId === frameId;
}

function receiptShapeFromRaw(
  raw: unknown,
): Omit<DraftRecoveryReceipt, 'version'> | null {
  if (
    !isRecord(raw)
    || Object.prototype.hasOwnProperty.call(raw, 'kind')
    || !isRecord(raw.layout)
    || !isRecord(raw.template)
  ) return null;
  const layout = raw.layout as unknown as BlockBoxLayout;
  if (
    typeof raw.noteId !== 'string'
    || !raw.noteId.trim()
    || typeof raw.clientCreateKey !== 'string'
    || !raw.clientCreateKey.trim()
    || typeof raw.text !== 'string'
    || typeof raw.queuedAt !== 'string'
    || typeof raw.template.legacy_block_type !== 'string'
    || !Number.isFinite(layout.x)
    || !Number.isFinite(layout.y)
    || !Number.isFinite(layout.width)
    || !Number.isFinite(layout.height)
    || (raw.contentJson !== undefined && !isRecord(raw.contentJson))
  ) return null;
  return {
    noteId: raw.noteId,
    clientCreateKey: raw.clientCreateKey,
    text: raw.text,
    contentJson: raw.contentJson as Record<string, unknown> | undefined,
    layout,
    template: raw.template as unknown as TemplateOption,
    queuedAt: raw.queuedAt,
  };
}

function validateV2Receipt(raw: unknown): DraftRecoveryReceipt | null {
  if (!isRecord(raw) || raw.version !== 2) return null;
  const shaped = receiptShapeFromRaw(raw);
  return shaped && hasValidCanonicalOwner(shaped.layout)
    ? { ...shaped, version: 2 }
    : null;
}

function upgradeV1Receipt(raw: unknown): DraftRecoveryReceipt | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const shaped = receiptShapeFromRaw(raw);
  return shaped && hasValidCanonicalOwner(shaped.layout)
    ? { ...shaped, version: 2 }
    : null;
}

function blockedReason(raw: unknown): BlockedDraftRecoveryReceipt['reason'] {
  if (!isRecord(raw) || (raw.version !== 1 && raw.version !== 2)) return 'unsupported_version';
  const shaped = receiptShapeFromRaw(raw);
  if (!shaped) return 'invalid_shape';
  return hasValidCanonicalOwner(shaped.layout) ? 'invalid_shape' : 'owner_authority_unknown';
}

export function loadDraftRecoveryQueue(): DraftRecoveryQueue {
  const storage = recoveryStorage();
  if (!storage) return { replayable: [], blocked: [] };

  const v2 = readStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V2);
  const legacy = readStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V1);
  const replayable = new Map<string, DraftRecoveryReceipt>();
  const blocked: BlockedDraftRecoveryReceipt[] = [];
  const retainedLegacy: unknown[] = [];
  const migrated: DraftRecoveryReceipt[] = [];
  let hasReplayableLegacy = false;

  if (v2.invalidJson !== null) {
    blocked.push({
      clientCreateKey: null,
      raw: v2.invalidJson,
      reason: 'invalid_json',
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V2,
    });
  }
  for (const raw of v2.entries) {
    const receipt = validateV2Receipt(raw);
    if (receipt) replayable.set(receipt.clientCreateKey, receipt);
    else if (validateBlockEditRecoveryReceipt(raw)) continue;
    else blocked.push({
      clientCreateKey: clientCreateKeyFromRaw(raw),
      raw,
      reason: blockedReason(raw),
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V2,
    });
  }

  if (legacy.invalidJson !== null) {
    blocked.push({
      clientCreateKey: null,
      raw: legacy.invalidJson,
      reason: 'invalid_json',
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V1,
    });
  }
  for (const raw of legacy.entries) {
    const receipt = upgradeV1Receipt(raw) || validateV2Receipt(raw);
    if (receipt) {
      hasReplayableLegacy = true;
      if (!replayable.has(receipt.clientCreateKey)) {
        migrated.push(receipt);
        replayable.set(receipt.clientCreateKey, receipt);
      }
    } else if (validateBlockEditRecoveryReceipt(raw)) {
      retainedLegacy.push(raw);
    } else {
      retainedLegacy.push(raw);
      blocked.push({
        clientCreateKey: clientCreateKeyFromRaw(raw),
        raw,
        reason: blockedReason(raw),
        storageKey: DRAFT_RECOVERY_STORAGE_KEY_V1,
      });
    }
  }

  if (hasReplayableLegacy && v2.invalidJson === null) {
    const migratedKeys = new Set(migrated.map((receipt) => receipt.clientCreateKey));
    const nextV2 = v2.entries.filter((raw) => {
      const replayable = validateV2Receipt(raw);
      return !replayable || !migratedKeys.has(replayable.clientCreateKey);
    });
    const v2Persisted = writeStorageEntries(
      storage,
      DRAFT_RECOVERY_STORAGE_KEY_V2,
      [...nextV2, ...migrated],
    );
    if (v2Persisted && legacy.invalidJson === null) {
      writeStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V1, retainedLegacy);
    }
  }

  return { replayable: [...replayable.values()], blocked };
}

export function listDraftRecoveryReceipts(): DraftRecoveryReceipt[] {
  return loadDraftRecoveryQueue().replayable;
}

export function listBlockEditRecoveryReceipts(noteId?: string): BlockEditRecoveryReceipt[] {
  const storage = recoveryStorage();
  if (!storage) return [];
  const byScope = new Map<string, BlockEditRecoveryReceipt>();
  for (const storageKey of [DRAFT_RECOVERY_STORAGE_KEY_V1, DRAFT_RECOVERY_STORAGE_KEY_V2]) {
    const stored = readStorageEntries(storage, storageKey);
    if (stored.invalidJson !== null) continue;
    stored.entries.forEach((raw) => {
      const receipt = validateBlockEditRecoveryReceipt(raw);
      if (!receipt) return;
      byScope.set(blockEditRecoveryScopeKey(receipt.noteId, receipt.blockId), receipt);
    });
  }
  return [...byScope.values()].filter((receipt) => !noteId || receipt.noteId === noteId);
}

export function rememberDraftRecoveryReceipt(receipt: DraftRecoveryReceipt): void {
  const storage = recoveryStorage();
  if (!storage) return;
  const storedV2 = readStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V2);
  const legacy = readStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V1);
  const keepUnlessReplayableDuplicate = (item: unknown) => {
    const replayable = validateV2Receipt(item) || upgradeV1Receipt(item);
    return replayable?.clientCreateKey !== receipt.clientCreateKey;
  };
  if (storedV2.invalidJson === null) {
    const v2Persisted = writeStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V2, [
      ...storedV2.entries.filter(keepUnlessReplayableDuplicate),
      receipt,
    ]);
    if (v2Persisted && legacy.invalidJson === null) {
      writeStorageEntries(
        storage,
        DRAFT_RECOVERY_STORAGE_KEY_V1,
        legacy.entries.filter(keepUnlessReplayableDuplicate),
      );
    }
  } else if (legacy.invalidJson === null) {
    // Keep corrupt v2 bytes intact; the legacy queue also accepts validated v2 entries.
    writeStorageEntries(
      storage,
      DRAFT_RECOVERY_STORAGE_KEY_V1,
      [...legacy.entries.filter(keepUnlessReplayableDuplicate), receipt],
    );
  }
}

export function rememberBlockEditRecoveryReceipt(receipt: BlockEditRecoveryReceipt): boolean {
  const validated = validateBlockEditRecoveryReceipt(receipt);
  const storage = recoveryStorage();
  if (!validated || !storage) return false;
  const scopeKey = blockEditRecoveryScopeKey(validated.noteId, validated.blockId);
  const keepUnlessSameBlockEdit = (item: unknown) => {
    const storedReceipt = validateBlockEditRecoveryReceipt(item);
    return !storedReceipt
      || blockEditRecoveryScopeKey(storedReceipt.noteId, storedReceipt.blockId) !== scopeKey;
  };
  const storedV2 = readStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V2);
  const legacy = readStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V1);
  if (storedV2.invalidJson === null) {
    const v2Persisted = writeStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V2, [
      ...storedV2.entries.filter(keepUnlessSameBlockEdit),
      validated,
    ]);
    if (v2Persisted && legacy.invalidJson === null) {
      writeStorageEntries(
        storage,
        DRAFT_RECOVERY_STORAGE_KEY_V1,
        legacy.entries.filter(keepUnlessSameBlockEdit),
      );
    }
    return v2Persisted;
  }
  if (legacy.invalidJson !== null) return false;
  return writeStorageEntries(storage, DRAFT_RECOVERY_STORAGE_KEY_V1, [
    ...legacy.entries.filter(keepUnlessSameBlockEdit),
    validated,
  ]);
}

export function forgetDraftRecoveryReceipt(clientCreateKey: string): void {
  const storage = recoveryStorage();
  if (!storage) return;
  for (const storageKey of [DRAFT_RECOVERY_STORAGE_KEY_V2, DRAFT_RECOVERY_STORAGE_KEY_V1]) {
    const stored = readStorageEntries(storage, storageKey);
    if (stored.invalidJson !== null) continue;
    writeStorageEntries(
      storage,
      storageKey,
      stored.entries.filter((item) => {
        const replayable = validateV2Receipt(item) || upgradeV1Receipt(item);
        return replayable?.clientCreateKey !== clientCreateKey;
      }),
    );
  }
}

export function forgetBlockEditRecoveryReceipt(recoveryKey: string): boolean {
  const storage = recoveryStorage();
  if (!storage) return false;
  for (const storageKey of [DRAFT_RECOVERY_STORAGE_KEY_V2, DRAFT_RECOVERY_STORAGE_KEY_V1]) {
    const stored = readStorageEntries(storage, storageKey);
    if (stored.invalidJson !== null) continue;
    writeStorageEntries(
      storage,
      storageKey,
      stored.entries.filter((item) => (
        validateBlockEditRecoveryReceipt(item)?.recoveryKey !== recoveryKey
      )),
    );
  }
  return !listBlockEditRecoveryReceipts().some((receipt) => receipt.recoveryKey === recoveryKey);
}

export async function finalizeDraftRecoveryReceipt(
  receipt: DraftRecoveryReceipt,
  persistence: DraftRecoveryPersistence,
): Promise<void> {
  const validated = validateV2Receipt(receipt);
  if (!validated) throw new Error('Draft recovery receipt owner authority is invalid');
  const durableBlock = await persistence.createOrReuse(validated);
  await persistence.savePlacement(durableBlock, validated);
  await persistence.saveLatest(durableBlock, validated);
}

export async function replayDraftRecoveryReceipts(
  receipts: DraftRecoveryReceipt[],
  finalize: (receipt: DraftRecoveryReceipt) => Promise<boolean>,
  onRecovered: (clientCreateKey: string) => void,
): Promise<void> {
  for (const receipt of receipts) {
    const recovered = await finalize(receipt);
    if (recovered) onRecovered(receipt.clientCreateKey);
  }
}

export function createDraftClientCreateKey(noteId: string, sessionId: number): string {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `draft:${noteId}:${sessionId}:${randomPart}`;
}
