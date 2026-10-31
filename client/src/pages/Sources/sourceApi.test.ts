import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { openAuthenticatedSourceBlob } from './sourceApi';
import type { SourceRecordDetail } from './sourceExperienceModel';

// The real axios instance resolves baseURL + path; only its transport is stubbed.
const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function source(): SourceRecordDetail {
  return {
    id: 'source-1',
    display_name: 'Synthetic.pdf',
    // The server reports an /api-prefixed blob_url; the client must not reuse it under baseURL.
    file: { original_filename: 'Synthetic.pdf', blob_url: '/api/sources/source-1/blob' },
  } as unknown as SourceRecordDetail;
}

describe('openAuthenticatedSourceBlob', () => {
  it('requests the blob through a single /api prefix', async () => {
    const requested: string[] = [];
    api.defaults.adapter = async (config) => {
      requested.push(api.getUri(config));
      return { data: new Blob(['x']), status: 200, statusText: 'OK', headers: {}, config };
    };
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:synthetic'), revokeObjectURL: vi.fn() }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await openAuthenticatedSourceBlob(source(), 'download');

    expect(requested).toEqual(['/api/sources/source-1/blob']);
  });
});
