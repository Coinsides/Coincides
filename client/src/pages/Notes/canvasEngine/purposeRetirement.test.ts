import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as repository from './purposeRepository';
import * as service from './purposeService';
import type { PurposeFrameV1 } from './runtimeDataTypes';

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

describe('V13 S2 library souls and retired writers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves nullable labels, all storage states and historical order without default sorting', () => {
    const souls = ['active', 'sealed', 'archived'].map((status, index) => service.normalizePurposeFrame({
      id: `soul-${index}`, title: status, project_id: null, course_id: null,
      status: status as PurposeFrameV1['status'],
      members: [{ id: 'edge', purpose_id: `soul-${index}`, member_kind: 'item', member_id: 'item',
        order_index: 9, fitness: 'unknown', created_at: '', updated_at: '' }],
    }));
    expect(souls.map(({ status, project_id, course_id }) => [status, project_id, course_id]))
      .toEqual([['active', null, null], ['sealed', null, null], ['archived', null, null]]);
    expect(souls.every((soul) => soul.members[0].order_index === 9)).toBe(true);
    expect(service.activePurposeFrames([
      { ...souls[0], id: 'old-default', is_note_default: true, updated_at: '2020' },
      { ...souls[0], id: 'recent', is_note_default: false, updated_at: '2026' },
    ]).map(({ id }) => id)).toEqual(['recent', 'old-default']);
  });

  it('reads library souls and empty legacy lists without manufacturing a default', async () => {
    http.get.mockResolvedValue({ data: { purposes: [] } });
    expect(await repository.loadLibraryPurposes()).toEqual([]);
    expect(http.get).toHaveBeenCalledWith('/purposes');
    expect(await repository.loadPurposeFramesForNote({ note: { id: 'empty-paper' } as never })).toEqual([]);
    expect(http.put).not.toHaveBeenCalled();
    expect(repository).not.toHaveProperty('savePurposeFramesForNote');
    for (const name of ['upsertPurposeItemMember', 'removePurposeItemMember', 'movePurposeMember', 'upsertDefaultPurposeRoleForContentGroup']) {
      expect(service).not.toHaveProperty(name);
    }
  });

  it('keeps the deferred compiled reader failure visible', async () => {
    const retired = { response: { status: 410, data: { error: 'purpose_compiled_scope_deferred' } } };
    http.get.mockRejectedValue(retired);
    await expect(repository.loadPurposeCompiledScope({ purposeId: 'soul' })).rejects.toBe(retired);
  });
});
