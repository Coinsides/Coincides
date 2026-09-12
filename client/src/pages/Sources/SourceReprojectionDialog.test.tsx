import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import i18n from '@/i18n';
import SourceLibraryPage from './SourceLibrary';
import type { SourceRecordDetail } from './sourceExperienceModel';
import type { SourceProjectionUserWork } from './sourceApi';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  refresh: vi.fn(),
  addToast: vi.fn(),
  sources: [] as SourceRecordDetail[],
}));

vi.mock('@/services/api', () => ({ default: { post: mocks.post } }));
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: { addToast: typeof mocks.addToast }) => unknown) => selector({ addToast: mocks.addToast }),
}));
vi.mock('./useSourceActions', () => ({
  useSourceActions: () => ({ open: vi.fn(), original: vi.fn(), download: vi.fn() }),
}));
vi.mock('./useSourceCollection', () => ({
  useSourceCollection: () => ({
    sources: mocks.sources,
    loading: false,
    error: null,
    uploading: false,
    uploadProgress: 0,
    hasActiveMaterialization: false,
    intake: vi.fn(),
    retry: vi.fn(),
    refresh: mocks.refresh,
  }),
}));

function source(status: SourceRecordDetail['materialization']['status'] = 'materialized'): SourceRecordDetail {
  return {
    id: `synthetic-${status}`,
    display_name: 'Synthetic source.pdf',
    origin: { course_id: null, course_name_snapshot: null, entry_kind: 'library_upload' },
    metadata: {},
    file: {
      id: 'synthetic-file', original_filename: 'Synthetic source.pdf', mime_type: 'application/pdf',
      byte_size: 100, content_hash: 'synthetic-hash', file_mtime: null,
      uploaded_at: '2026-09-12T10:00:00Z', storage_state: 'ready', format: 'pdf', capability: 'materializable',
      blob_available: true, blob_url: '/synthetic-original', issue: null,
    },
    materialization: {
      id: 'synthetic-materialization', parser_key: 'native-pdf', parser_version: '1', status,
      attempt_count: 1, projection_note_id: status === 'materialized' ? 'synthetic-note' : null,
      projection_available: status === 'materialized', error_code: null, error_message: null,
      retryable: false, started_at: null, completed_at: null,
    },
    placements: [], created_at: '2026-09-12T10:00:00Z', updated_at: '2026-09-12T10:00:00Z',
  };
}

const userWork: SourceProjectionUserWork = {
  annotation_count: 2, note_tag_count: 3, content_group_count: 4,
  purpose_count: 5, display_override_count: 6, external_block_placement_count: 0,
  has_user_work: true,
};

async function openReprojection() {
  render(<SourceLibraryPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Rebuild projection' }));
  return screen.getByRole('alertdialog');
}

describe('Source reprojection confirmation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.sources = [source()];
    mocks.refresh.mockResolvedValue(mocks.sources);
    mocks.post.mockResolvedValue({ data: { user_work: userWork } });
  });

  it('shows the entry only for Ready sources', () => {
    mocks.sources = [source(), source('parsing'), source('publishing'), source('failed')];
    render(<SourceLibraryPage />);
    expect(screen.getAllByRole('button', { name: 'Rebuild projection' })).toHaveLength(1);
  });

  it('loads all six counts without confirmation and cancellation performs no replacement', async () => {
    const dialog = await openReprojection();
    await screen.findByText('Annotations');
    const counts = [
      ['Annotations', '2'], ['Note tags', '3'], ['Content groups', '4'],
      ['Linked purposes', '5'], ['Appearance changes', '6'], ['References in other notes or boards', '0'],
    ];
    for (const [label, value] of counts) {
      const row = within(dialog).getByText(label).parentElement!;
      expect(within(row).getByText(value).tagName).toBe('DD');
    }
    expect(screen.getByText(/Annotations will be removed, with a snapshot receipt retained/)).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/sources/synthetic-materialized/rematerialize', {});
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('disables replacement until the impact request has resolved', async () => {
    let resolvePreview!: (value: unknown) => void;
    mocks.post.mockImplementationOnce(() => new Promise((resolve) => { resolvePreview = resolve; }));
    const dialog = await openReprojection();
    const confirm = within(dialog).getByRole('button', { name: 'Replace projection' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    await act(async () => { resolvePreview({ data: { user_work: userWork } }); });
    expect(confirm.disabled).toBe(false);
  });

  it('sends confirm true once, holds the dialog during replacement, then refreshes sources', async () => {
    let resolveReplacement!: (value: unknown) => void;
    mocks.post.mockResolvedValueOnce({ data: { user_work: userWork } })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveReplacement = resolve; }));
    const dialog = await openReprojection();
    await screen.findByText('Annotations');
    const confirm = within(dialog).getByRole('button', { name: 'Replace projection' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledTimes(2);
    expect(mocks.post).toHaveBeenLastCalledWith('/sources/synthetic-materialized/rematerialize', { confirm: true });
    await act(async () => { resolveReplacement({ data: { projection_note_id: 'new-note', receipt_id: 'receipt' } }); });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(mocks.refresh).toHaveBeenCalledExactlyOnceWith(true);
    expect(mocks.addToast).toHaveBeenCalledWith('success', expect.stringContaining('snapshot receipt'));
  });

  it('renders external references as a readable blocker before confirmation', async () => {
    mocks.post.mockResolvedValue({ data: { user_work: { ...userWork, external_block_placement_count: 7 } } });
    const dialog = await openReprojection();
    await screen.findByText('Annotations');
    expect(within(dialog).getByRole('alert').textContent).toContain('referenced by another note or board');
    expect((within(dialog).getByRole('button', { name: 'Replace projection' }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('shows a late external-reference 409 without closing or claiming success', async () => {
    mocks.post.mockResolvedValueOnce({ data: { user_work: userWork } }).mockRejectedValueOnce({
      response: { status: 409, data: { details: { code: 'reprojection_blocked_external_refs' } } },
    });
    const dialog = await openReprojection();
    await screen.findByText('Annotations');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace projection' }));
    await waitFor(() => expect(within(dialog).getByRole('alert').textContent).toContain('referenced by another note or board'));
    expect((within(dialog).getByRole('button', { name: 'Replace projection' }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.addToast).not.toHaveBeenCalled();
  });

  it('lets a failed preview be reloaded without confirming', async () => {
    mocks.post.mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce({ data: { user_work: userWork } });
    const dialog = await openReprojection();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Reload work counts' }));
    await screen.findByText('Annotations');
    expect(mocks.post).toHaveBeenCalledTimes(2);
    expect(mocks.post).toHaveBeenLastCalledWith('/sources/synthetic-materialized/rematerialize', {});
  });

  it('keeps keyboard focus inside the confirmation and restores the Ready entry on cancel', async () => {
    render(<SourceLibraryPage />);
    const entry = screen.getByRole('button', { name: 'Rebuild projection' });
    entry.focus();
    fireEvent.click(entry);
    const dialog = screen.getByRole('alertdialog');
    await screen.findByText('Annotations');
    const close = within(dialog).getByRole('button', { name: 'Close' });
    const confirm = within(dialog).getByRole('button', { name: 'Replace projection' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(entry);
  });

  it('shows the required Chinese warning and six translated labels', async () => {
    await i18n.changeLanguage('zh');
    render(<SourceLibraryPage />);
    fireEvent.click(screen.getByRole('button', { name: '重新投影' }));
    await screen.findByText('批注');
    expect(screen.getByText(/批注将被移除\(已留快照收据\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '替换投影' })).toBeTruthy();
    expect(screen.getAllByRole('term')).toHaveLength(6);
  });
});
