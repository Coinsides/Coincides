import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import type { NoteBlock } from './runtimeDataTypes';
import {
  DRAFT_RECOVERY_STORAGE_KEY_V1,
  DRAFT_RECOVERY_STORAGE_KEY_V2,
  createBlockEditRecoveryKey,
  finalizeDraftRecoveryReceipt,
  forgetBlockEditRecoveryReceipt,
  forgetDraftRecoveryReceipt,
  listBlockEditRecoveryReceipts,
  loadDraftRecoveryQueue,
  listDraftRecoveryReceipts,
  rememberBlockEditRecoveryReceipt,
  rememberDraftRecoveryReceipt,
  replayDraftRecoveryReceipts,
  type BlockEditRecoveryReceipt,
  type DraftRecoveryReceipt,
} from './draftBlockPersistence';

const template: TemplateOption = {
  template_id: 'text.paragraph',
  template_key: 'text.paragraph',
  template_version: '1.0.0',
  label: 'Text',
  description: 'Text block',
  system_type: 'text',
  learning_role: 'note',
  legacy_block_type: 'text',
  default_content: {},
  origin: 'test',
  status: 'active',
  isRuntime: false,
};

function recoveryReceipt(key = 'draft:note-a:1:key'): DraftRecoveryReceipt {
  return {
    version: 2,
    noteId: 'note-a',
    clientCreateKey: key,
    text: 'latest snapshot',
    contentJson: { body: 'latest snapshot' },
    layout: {
      x: 20,
      y: 40,
      width: 760,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'outside',
    },
    template,
    queuedAt: '2026-08-20T00:00:00.000Z',
  };
}

function blockEditRecoveryReceipt({
  generation = 1,
  mountNonce = 'mount-a',
  operationSequence = 1,
  text = 'queued edit',
}: {
  generation?: number;
  mountNonce?: string;
  operationSequence?: number;
  text?: string;
} = {}): BlockEditRecoveryReceipt {
  const noteId = 'note-a';
  const blockId = 'block-a';
  return {
    version: 2,
    kind: 'block_edit_recovery',
    recoveryKey: createBlockEditRecoveryKey(
      noteId,
      blockId,
      generation,
      operationSequence,
      mountNonce,
    ),
    noteId,
    requestedNoteId: noteId,
    mountNonce,
    creationGeneration: generation,
    operationSequence,
    blockId,
    text,
    plainText: text,
    contentJson: { body: text },
    hydrationEpoch: 1,
    queuedAt: '2026-08-20T00:00:00.000Z',
  };
}

function canonicalPageRecoveryReceipt(key = 'canonical-key'): DraftRecoveryReceipt {
  return {
    ...recoveryReceipt(key),
    layout: {
      x: 128,
      y: 96,
      width: 540,
      height: 80,
      surface: 'formal_page',
      coordinate_space: 'canvas_world',
      frame_id: 'owner-frame-a',
      boundary_role: 'inside',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: {
          left: 96,
          right: 832,
          frameId: 'owner-frame-a',
        },
      },
    },
  };
}

type GeometryContradiction = 'inside-as-outside' | 'crossing-as-inside';

function geometryContradictionReceipt(
  version: 1 | 2,
  key: string,
  contradiction: GeometryContradiction,
) {
  const layout = contradiction === 'inside-as-outside'
    ? {
      x: 300,
      y: 40,
      width: 10,
      height: 72,
      surface: 'formal_page' as const,
      coordinate_space: 'canvas_world' as const,
      boundary_role: 'inside' as const,
      frame_id: 'frame-a',
      surface_authority: {
        coordinateSpace: 'canvas_world' as const,
        pageBoundary: { left: 100, right: 200, frameId: 'frame-a' },
      },
    }
    : {
      x: 120,
      y: 40,
      width: 20,
      height: 72,
      surface: 'canvas_workspace' as const,
      coordinate_space: 'canvas_world' as const,
      boundary_role: 'crossing' as const,
      frame_id: 'frame-a',
      surface_authority: {
        coordinateSpace: 'canvas_world' as const,
        pageBoundary: { left: 100, right: 200, frameId: 'frame-a' },
      },
    };
  return {
    ...recoveryReceipt(key),
    version,
    layout,
  };
}

function legacyCanonicalPageRecoveryReceipt(key = 'canonical-key') {
  return {
    ...canonicalPageRecoveryReceipt(key),
    version: 1 as const,
  };
}

function contradictoryCrossingReceipt(version: 1 | 2, key: string) {
  return {
    ...recoveryReceipt(key),
    version,
    layout: {
      x: 20,
      y: 40,
      width: 760,
      height: 72,
      surface: 'canvas_workspace' as const,
      coordinate_space: 'canvas_world' as const,
      boundary_role: 'crossing' as const,
      frame_id: null,
      surface_authority: {
        coordinateSpace: 'canvas_world' as const,
        pageBoundary: null,
      },
    },
  };
}

function canonicalCrossingReceipt(
  side: 'left' | 'right',
  key = `canonical-${side}-crossing`,
): DraftRecoveryReceipt {
  const crossingGeometry = side === 'left'
    ? { x: 20, width: 760, left: 72, right: 832 }
    : { x: 128, width: 540, left: 96, right: 636 };
  return {
    ...recoveryReceipt(key),
    layout: {
      x: crossingGeometry.x,
      y: 40,
      width: crossingGeometry.width,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
      frame_id: 'owner-frame-a',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: {
          left: crossingGeometry.left,
          right: crossingGeometry.right,
          frameId: 'owner-frame-a',
        },
      },
    },
  };
}

function interceptV2Writes(mode: 'quota' | 'no-op') {
  const setItem = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    storageKey: string,
    value: string,
  ) {
    if (storageKey === DRAFT_RECOVERY_STORAGE_KEY_V2) {
      if (mode === 'quota') throw new Error('quota');
      return;
    }
    setItem.call(this, storageKey, value);
  });
}

const durableBlock = {
  id: 'block-a',
  placement_id: 'placement-a',
  display_overrides_json: {},
  canvas_layout: null,
  block_type: 'text',
  title: null,
  content_json: { body: 'initial' },
  plain_text: 'initial',
  metadata: {},
  order_index: 0,
  source_references: [],
} satisfies NoteBlock;

describe('draft recovery persistence', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('fails closed for an ownerless v1 receipt and leaves the raw entry queued', async () => {
    const rawV1 = {
      version: 1,
      noteId: 'note-a',
      clientCreateKey: 'legacy-ownerless-key',
      text: 'legacy draft',
      layout: { x: 0, y: 48, width: 540, height: 80 },
      template,
      queuedAt: '2026-08-20T00:00:00.000Z',
    };
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, JSON.stringify([rawV1]));

    const queue = loadDraftRecoveryQueue();
    const finalize = vi.fn(async () => true);
    const onRecovered = vi.fn();
    await replayDraftRecoveryReceipts(queue.replayable, finalize, onRecovered);

    expect(queue.replayable).toEqual([]);
    expect(queue.blocked).toEqual([expect.objectContaining({
      clientCreateKey: rawV1.clientCreateKey,
      raw: rawV1,
      reason: 'owner_authority_unknown',
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V1,
    })]);
    expect(finalize).not.toHaveBeenCalled();
    expect(onRecovered).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1))
      .toBe(JSON.stringify([rawV1]));
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBeNull();
  });

  it.each([
    [1, DRAFT_RECOVERY_STORAGE_KEY_V1],
    [2, DRAFT_RECOVERY_STORAGE_KEY_V2],
  ] as const)(
    'fails closed for a contradictory crossing raw v%s tuple and leaves its bytes queued',
    async (version, storageKey) => {
      const raw = contradictoryCrossingReceipt(version, `contradictory-v${version}`);
      const rawBytes = JSON.stringify([raw]);
      sessionStorage.setItem(storageKey, rawBytes);

      const queue = loadDraftRecoveryQueue();
      const finalize = vi.fn(async () => true);
      const onRecovered = vi.fn();
      await replayDraftRecoveryReceipts(queue.replayable, finalize, onRecovered);

      expect(queue.replayable).toEqual([]);
      expect(queue.blocked).toEqual([expect.objectContaining({
        clientCreateKey: raw.clientCreateKey,
        raw,
        reason: 'owner_authority_unknown',
        storageKey,
      })]);
      expect(finalize).not.toHaveBeenCalled();
      expect(onRecovered).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBe(rawBytes);
      expect(sessionStorage.getItem(
        storageKey === DRAFT_RECOVERY_STORAGE_KEY_V1
          ? DRAFT_RECOVERY_STORAGE_KEY_V2
          : DRAFT_RECOVERY_STORAGE_KEY_V1,
      )).toBeNull();
    },
  );

  it.each([
    ['inside claimed over outside geometry', 1, 'inside-as-outside'],
    ['inside claimed over outside geometry', 2, 'inside-as-outside'],
    ['crossing claimed over inside geometry', 1, 'crossing-as-inside'],
    ['crossing claimed over inside geometry', 2, 'crossing-as-inside'],
  ] as const)(
    'fails closed for %s in raw v%s and never reaches the finalizer',
    async (_label, version, contradiction) => {
      const storageKey = version === 1
        ? DRAFT_RECOVERY_STORAGE_KEY_V1
        : DRAFT_RECOVERY_STORAGE_KEY_V2;
      const otherStorageKey = version === 1
        ? DRAFT_RECOVERY_STORAGE_KEY_V2
        : DRAFT_RECOVERY_STORAGE_KEY_V1;
      const raw = geometryContradictionReceipt(
        version,
        `geometry-${contradiction}-v${version}`,
        contradiction,
      );
      const rawBytes = JSON.stringify([raw]);
      sessionStorage.setItem(storageKey, rawBytes);

      const queue = loadDraftRecoveryQueue();
      const finalize = vi.fn(async () => true);
      const onRecovered = vi.fn();
      await replayDraftRecoveryReceipts(queue.replayable, finalize, onRecovered);

      expect(queue.replayable).toEqual([]);
      expect(queue.blocked).toEqual([expect.objectContaining({
        clientCreateKey: raw.clientCreateKey,
        raw,
        reason: 'owner_authority_unknown',
        storageKey,
      })]);
      expect(finalize).not.toHaveBeenCalled();
      expect(onRecovered).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBe(rawBytes);
      expect(sessionStorage.getItem(otherStorageKey)).toBeNull();
    },
  );

  // Crossing coverage is symmetric: every left-edge positive control has a right-edge twin.
  it.each([
    ['left', 1],
    ['left', 2],
    ['right', 1],
    ['right', 2],
  ] as const)('keeps a canonical %s crossing raw v%s tuple replayable', (side, version) => {
    const receipt = canonicalCrossingReceipt(side, `canonical-${side}-v${version}`);
    const raw = version === 1 ? { ...receipt, version: 1 as const } : receipt;
    const storageKey = version === 1
      ? DRAFT_RECOVERY_STORAGE_KEY_V1
      : DRAFT_RECOVERY_STORAGE_KEY_V2;
    sessionStorage.setItem(storageKey, JSON.stringify([raw]));

    const queue = loadDraftRecoveryQueue();

    expect(queue.blocked).toEqual([]);
    expect(queue.replayable).toEqual([{ ...receipt, version: 2 }]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2) || '[]'))
      .toEqual(queue.replayable);
  });

  it.each([
    ['formal_page/crossing', { surface: 'formal_page' }],
    ['canvas_workspace/inside', { boundary_role: 'inside' }],
    ['outside carrying a frame and boundary', { boundary_role: 'outside' }],
    ['page-local outer coordinate', { coordinate_space: 'page_frame_local' }],
    ['page-local authority coordinate', {
      surface_authority: {
        coordinateSpace: 'page_frame_local',
        pageBoundary: { left: 72, right: 832, frameId: 'owner-frame-a' },
      },
    }],
    ['mismatched boundary frame', {
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: { left: 72, right: 832, frameId: 'other-frame' },
      },
    }],
  ])('fails closed for %s tuple inconsistency', (_label, layoutPatch) => {
    const canonical = canonicalCrossingReceipt('left', `inconsistent-${_label}`);
    const raw = {
      ...canonical,
      layout: { ...canonical.layout, ...layoutPatch },
    };
    const rawBytes = JSON.stringify([raw]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V2, rawBytes);

    const queue = loadDraftRecoveryQueue();

    expect(queue.replayable).toEqual([]);
    expect(queue.blocked).toEqual([expect.objectContaining({
      clientCreateKey: raw.clientCreateKey,
      reason: 'owner_authority_unknown',
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V2,
    })]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(rawBytes);
  });

  it.each([
    ['numeric frame_id', { frame_id: 0 }],
    ['boolean surface_authority', { surface_authority: false }],
    ['numeric pageBoundary', {
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: 0,
      },
    }],
  ])('fails closed for malformed outside tuple field: %s', (_label, layoutPatch) => {
    const canonical = recoveryReceipt(`malformed-${_label}`);
    const raw = {
      ...canonical,
      layout: { ...canonical.layout, ...layoutPatch },
    };
    const rawBytes = JSON.stringify([raw]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V2, rawBytes);

    const queue = loadDraftRecoveryQueue();

    expect(queue.replayable).toEqual([]);
    expect(queue.blocked).toEqual([expect.objectContaining({
      clientCreateKey: raw.clientCreateKey,
      reason: 'owner_authority_unknown',
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V2,
    })]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(rawBytes);
  });

  it('upgrades a v1 receipt only when canonical owner authority is already provable', () => {
    const legacyCanonical = legacyCanonicalPageRecoveryReceipt('legacy-canonical-key');
    sessionStorage.setItem(
      DRAFT_RECOVERY_STORAGE_KEY_V1,
      JSON.stringify([legacyCanonical]),
    );

    const queue = loadDraftRecoveryQueue();

    expect(queue.blocked).toEqual([]);
    expect(queue.replayable).toEqual([expect.objectContaining({
      version: 2,
      clientCreateKey: legacyCanonical.clientCreateKey,
      layout: expect.objectContaining({ frame_id: 'owner-frame-a' }),
    })]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2) || '[]'))
      .toEqual(queue.replayable);
  });

  it('keeps canonical v1 bytes through quota failure, failed replay, and reload', async () => {
    const legacyCanonical = legacyCanonicalPageRecoveryReceipt('canonical-key');
    const legacyBytes = JSON.stringify([legacyCanonical]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, legacyBytes);
    const setItem = interceptV2Writes('quota');

    const firstQueue = loadDraftRecoveryQueue();
    expect(firstQueue.blocked).toEqual([]);
    expect(firstQueue.replayable).toEqual([expect.objectContaining({
      version: 2,
      clientCreateKey: legacyCanonical.clientCreateKey,
    })]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBe(legacyBytes);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBeNull();

    const finalize = vi.fn(async () => false);
    const onRecovered = vi.fn();
    await replayDraftRecoveryReceipts(firstQueue.replayable, finalize, onRecovered);
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(onRecovered).not.toHaveBeenCalled();

    const afterReload = loadDraftRecoveryQueue();
    expect(afterReload.blocked).toEqual([]);
    expect(afterReload.replayable).toEqual([expect.objectContaining({
      version: 2,
      clientCreateKey: legacyCanonical.clientCreateKey,
    })]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBe(legacyBytes);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBeNull();
    expect(setItem.mock.calls.filter(([key]) => key === DRAFT_RECOVERY_STORAGE_KEY_V2))
      .toHaveLength(2);
  });

  it('does not clear canonical v1 bytes when a v2 write silently fails read-back', () => {
    const legacyCanonical = legacyCanonicalPageRecoveryReceipt('silent-no-op-key');
    const legacyBytes = JSON.stringify([legacyCanonical]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, legacyBytes);
    interceptV2Writes('no-op');

    const queue = loadDraftRecoveryQueue();

    expect(queue.replayable).toEqual([expect.objectContaining({
      clientCreateKey: legacyCanonical.clientCreateKey,
    })]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBe(legacyBytes);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBeNull();
  });

  it('keeps the old same-key v1 receipt when remember cannot verify the v2 replacement', () => {
    const key = 'same-key-quota';
    const legacyCanonical = {
      ...legacyCanonicalPageRecoveryReceipt(key),
      text: 'old snapshot',
      contentJson: { body: 'old snapshot' },
    };
    const legacyBytes = JSON.stringify([legacyCanonical]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, legacyBytes);
    interceptV2Writes('quota');

    rememberDraftRecoveryReceipt({
      ...canonicalPageRecoveryReceipt(key),
      text: 'new snapshot',
      contentJson: { body: 'new snapshot' },
    });

    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBe(legacyBytes);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBeNull();
    expect(loadDraftRecoveryQueue().replayable).toEqual([expect.objectContaining({
      clientCreateKey: key,
      text: 'old snapshot',
    })]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBe(legacyBytes);
  });

  it('never deletes a blocked v1 entry when a same-key v2 replay succeeds', () => {
    const key = 'same-key-with-blocked-legacy';
    const ownerlessV1 = {
      version: 1,
      noteId: 'note-a',
      clientCreateKey: key,
      text: 'must remain queued',
      layout: { x: 0, y: 48, width: 540, height: 80 },
      template,
      queuedAt: '2026-08-20T00:00:00.000Z',
    };
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, JSON.stringify([ownerlessV1]));
    rememberDraftRecoveryReceipt(recoveryReceipt(key));

    const queue = loadDraftRecoveryQueue();
    expect(queue.replayable).toHaveLength(1);
    expect(queue.blocked).toEqual([expect.objectContaining({
      clientCreateKey: key,
      reason: 'owner_authority_unknown',
    })]);
    forgetDraftRecoveryReceipt(key);

    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBeNull();
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1))
      .toBe(JSON.stringify([ownerlessV1]));
  });

  it('preserves corrupt v2 bytes while queueing a new validated receipt in fallback storage', () => {
    const corruptV2 = '{not-json';
    const receipt = recoveryReceipt('fallback-key');
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V2, corruptV2);

    rememberDraftRecoveryReceipt(receipt);
    const queue = loadDraftRecoveryQueue();

    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(corruptV2);
    expect(queue.replayable).toEqual([receipt]);
    expect(queue.blocked).toEqual([expect.objectContaining({
      reason: 'invalid_json',
      raw: corruptV2,
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V2,
    })]);
  });

  it('preserves a blocked same-key v2 entry while migrating a canonical legacy receipt', () => {
    const key = 'same-key-with-blocked-v2';
    const blockedV2 = {
      ...recoveryReceipt(key),
      layout: { x: 0, y: 48, width: 540, height: 80 },
    };
    const canonicalV1 = {
      ...recoveryReceipt(key),
      version: 1,
    };
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V2, JSON.stringify([blockedV2]));
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, JSON.stringify([canonicalV1]));

    const queue = loadDraftRecoveryQueue();

    expect(queue.replayable).toEqual([expect.objectContaining({
      version: 2,
      clientCreateKey: key,
    })]);
    expect(queue.blocked).toEqual([expect.objectContaining({
      clientCreateKey: key,
      raw: blockedV2,
      reason: 'owner_authority_unknown',
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V2,
    })]);
    expect(JSON.parse(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2) || '[]'))
      .toEqual([blockedV2, { ...canonicalV1, version: 2 }]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1)).toBeNull();
  });

  it('stores block edit recovery in the validated v2 queue without entering draft replay', () => {
    const receipt = blockEditRecoveryReceipt();

    expect(rememberBlockEditRecoveryReceipt(receipt)).toBe(true);

    expect(listBlockEditRecoveryReceipts('note-a')).toEqual([receipt]);
    expect(loadDraftRecoveryQueue()).toEqual({ replayable: [], blocked: [] });
    expect(JSON.parse(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2) || '[]'))
      .toEqual([receipt]);
  });

  it('routes an explicit block edit hybrid only to edit recovery and never auto-replays it', async () => {
    const editReceipt = blockEditRecoveryReceipt();
    const hybridRaw = {
      ...recoveryReceipt('hybrid-create-key'),
      ...editReceipt,
    };
    const rawBytes = JSON.stringify([hybridRaw]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V2, rawBytes);
    const finalize = vi.fn(async () => true);
    const onRecovered = vi.fn();

    const queue = loadDraftRecoveryQueue();
    await replayDraftRecoveryReceipts(queue.replayable, finalize, onRecovered);
    forgetDraftRecoveryReceipt('hybrid-create-key');

    expect(queue).toEqual({ replayable: [], blocked: [] });
    expect(listBlockEditRecoveryReceipts('note-a')).toEqual([editReceipt]);
    expect(finalize).not.toHaveBeenCalled();
    expect(onRecovered).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(rawBytes);
  });

  it('keeps an explicit unknown recovery kind blocked without replaying or rewriting it', async () => {
    const unknownRaw = {
      ...recoveryReceipt('unknown-kind-key'),
      kind: 'future_recovery_kind',
    };
    const rawBytes = JSON.stringify([unknownRaw]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V2, rawBytes);
    const finalize = vi.fn(async () => true);

    const queue = loadDraftRecoveryQueue();
    await replayDraftRecoveryReceipts(queue.replayable, finalize, vi.fn());
    forgetDraftRecoveryReceipt('unknown-kind-key');

    expect(queue.replayable).toEqual([]);
    expect(queue.blocked).toEqual([expect.objectContaining({
      clientCreateKey: 'unknown-kind-key',
      raw: unknownRaw,
      reason: 'invalid_shape',
      storageKey: DRAFT_RECOVERY_STORAGE_KEY_V2,
    })]);
    expect(listBlockEditRecoveryReceipts()).toEqual([]);
    expect(finalize).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(rawBytes);
  });

  it('does not let an old exact-key forget remove the newer same-block intent', () => {
    const oldReceipt = blockEditRecoveryReceipt({
      generation: 1,
      operationSequence: 1,
      text: 'old intent',
    });
    const newReceipt = blockEditRecoveryReceipt({
      generation: 2,
      operationSequence: 2,
      text: 'new intent',
    });
    expect(rememberBlockEditRecoveryReceipt(oldReceipt)).toBe(true);
    expect(rememberBlockEditRecoveryReceipt(newReceipt)).toBe(true);
    const newBytes = sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2);

    expect(forgetBlockEditRecoveryReceipt(oldReceipt.recoveryKey)).toBe(true);

    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(newBytes);
    expect(listBlockEditRecoveryReceipts('note-a')).toEqual([newReceipt]);
    expect(forgetBlockEditRecoveryReceipt(newReceipt.recoveryKey)).toBe(true);
    expect(listBlockEditRecoveryReceipts('note-a')).toEqual([]);
  });

  it('preserves an invalid same-key entry when a validated edit receipt is dismissed', () => {
    const receipt = blockEditRecoveryReceipt();
    const invalidSameKey = { ...receipt, requestedNoteId: 'other-note' };
    sessionStorage.setItem(
      DRAFT_RECOVERY_STORAGE_KEY_V2,
      JSON.stringify([invalidSameKey, receipt]),
    );

    expect(forgetBlockEditRecoveryReceipt(receipt.recoveryKey)).toBe(true);

    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2))
      .toBe(JSON.stringify([invalidSameKey]));
  });

  it('uses one receipt key through create, placement, then latest save', async () => {
    const calls: string[] = [];
    const receipt = recoveryReceipt();
    await finalizeDraftRecoveryReceipt(receipt, {
      createOrReuse: async (pending) => {
        calls.push(`POST:${pending.noteId}:${pending.clientCreateKey}`);
        return durableBlock;
      },
      savePlacement: async (block, pending) => {
        calls.push(`PLACEMENT:${block.id}:${pending.clientCreateKey}`);
      },
      saveLatest: async (block, pending) => {
        calls.push(`SAVE:${block.id}:${pending.text}`);
      },
    });

    expect(calls).toEqual([
      `POST:note-a:${receipt.clientCreateKey}`,
      `PLACEMENT:block-a:${receipt.clientCreateKey}`,
      'SAVE:block-a:latest snapshot',
    ]);
  });

  it('forgets only successful mount replays and retains failed recovery payloads', async () => {
    const failed = recoveryReceipt('failed-key');
    const recovered = recoveryReceipt('recovered-key');
    rememberDraftRecoveryReceipt(failed);
    rememberDraftRecoveryReceipt(recovered);
    const finalize = vi.fn(async (receipt: DraftRecoveryReceipt) => (
      receipt.clientCreateKey === recovered.clientCreateKey
    ));

    await replayDraftRecoveryReceipts(
      listDraftRecoveryReceipts(),
      finalize,
      forgetDraftRecoveryReceipt,
    );

    expect(finalize).toHaveBeenCalledTimes(2);
    expect(listDraftRecoveryReceipts()).toEqual([failed]);
  });

  it.each(['create', 'placement', 'save'] as const)(
    'keeps the replay receipt when %s fails',
    async (failedStep) => {
      const receipt = recoveryReceipt(`${failedStep}-failure`);
      rememberDraftRecoveryReceipt(receipt);
      const fail = async () => {
        throw new Error(`${failedStep} failed`);
      };

      await expect(finalizeDraftRecoveryReceipt(receipt, {
        createOrReuse: failedStep === 'create' ? fail : async () => durableBlock,
        savePlacement: failedStep === 'placement' ? fail : async () => undefined,
        saveLatest: failedStep === 'save' ? fail : async () => undefined,
      })).rejects.toThrow(`${failedStep} failed`);

      expect(listDraftRecoveryReceipts()).toEqual([receipt]);
    },
  );
});
