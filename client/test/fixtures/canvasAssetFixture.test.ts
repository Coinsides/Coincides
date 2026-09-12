import { expect, it } from 'vitest';
import { MEDIA_FIXTURE_BLOB_PATH } from './canvasAssetFixture';

const transports = [
  ['board tools / layers', () => import('../../scripts/boardToolsSmoke/mockApi')],
  ['board open note', () => import('../../scripts/boardOpenNoteSmoke/mockApi')],
  ['board text range', () => import('../../scripts/boardTextRangeSmoke/mockApi')],
  ['C fix 1', () => import('../../scripts/cFix1Smoke/mockApi')],
  ['page frame healing', () => import('../../scripts/pageFrameHealingSmoke/mockApi')],
  ['page reading / print / overview / tray', () => import('../../scripts/pageReadingSmoke/mockApi')],
  ['paper ink', () => import('../../scripts/paperInkSmoke/inkMockApi')],
] as const;

it.each(transports)('%s explicitly serves registered media as a Blob and retains its unknown-request failure', async (_name, load) => {
  const { default: api } = await load();
  const result = await api.get(MEDIA_FIXTURE_BLOB_PATH);
  expect(result.data).toBeInstanceOf(Blob);
  expect(result.data.type).toBe('image/png');
  expect(result.data.size).toBeGreaterThan(0);
  await expect(api.get('/canvas-assets/unregistered-fixture-image/blob')).rejects.toThrow(/synthetic|fixture|memory/i);
});
