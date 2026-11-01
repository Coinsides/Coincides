import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { ProjectSourcesPanel } from './ProjectSourcesPanel';
import type { SourceRecordDetail } from './sourceExperienceModel';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
  refresh: vi.fn(),
  addToast: vi.fn(),
  sources: [] as SourceRecordDetail[],
}));

vi.mock('@/services/api', () => ({ default: { get: mocks.get, delete: mocks.delete } }));
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

function failedSource(): SourceRecordDetail {
  return {
    id: 'synthetic-failed',
    display_name: 'Lecture handout.docx',
    origin: { course_id: 'project-1', course_name_snapshot: 'Project', entry_kind: 'project_upload' },
    metadata: {},
    file: {
      id: 'synthetic-file', original_filename: 'Lecture handout.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      byte_size: 100, content_hash: 'synthetic-hash', file_mtime: null,
      uploaded_at: '2026-11-01T10:00:00Z', storage_state: 'ready', format: 'docx', capability: 'materializable',
      blob_available: true, blob_url: '/api/sources/synthetic-failed/blob', issue: null,
    },
    materialization: {
      id: 'synthetic-materialization', parser_key: 'native-docx', parser_version: '1', status: 'failed',
      attempt_count: 1, projection_note_id: null, projection_available: false,
      error_code: 'resource_limit', error_message: 'Synthetic limit', retryable: false,
      started_at: null, completed_at: null,
    },
    placements: [], created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z',
  } as SourceRecordDetail;
}

function impact(overrides: Record<string, unknown> = {}) {
  return {
    source: { id: 'synthetic-failed', display_name: 'Lecture handout.docx' },
    placement_count: 1, receipt_count: 0, projection_receipt_count: 0, retained_receipt_count: 0,
    projection_note_id: null, projection_user_work: null, materialization_status: 'failed',
    deletion_blocked: false, blocked_reason: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.sources = [failedSource()];
});

async function openDeleteDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Source details' }));
  const detail = screen.getByRole('dialog');
  const deleteButton = within(detail).getByRole('button', { name: 'Delete Source' });
  expect((deleteButton as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(deleteButton);
  return screen.findByRole('alertdialog');
}

describe('ProjectSourcesPanel deletion', () => {
  it('deletes a failed Source from the Project view and refreshes both lists', async () => {
    mocks.get.mockResolvedValue({ data: impact() });
    mocks.delete.mockImplementation(async () => {
      mocks.sources = [];
      return { data: { deleted: true } };
    });
    const onProjectionNotesChanged = vi.fn();
    const view = render(<ProjectSourcesPanel projectId="project-1" onProjectionNotesChanged={onProjectionNotesChanged} />);

    const confirm = await openDeleteDialog();
    expect(within(confirm).getByText(/cannot be undone/)).toBeTruthy();
    expect(within(confirm).getByText(/removed from every Project/)).toBeTruthy();
    expect(mocks.get).toHaveBeenCalledWith('/sources/synthetic-failed/delete-impact');
    const danger = within(confirm).getByRole('button', { name: /Delete Source permanently/ });
    await waitFor(() => expect((danger as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(danger);

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith('/sources/synthetic-failed'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mocks.refresh).toHaveBeenCalledWith(true);
    view.rerender(<ProjectSourcesPanel projectId="project-1" onProjectionNotesChanged={onProjectionNotesChanged} />);
    // A failed Source never had an extracted note, so the host note list is unchanged.
    expect(onProjectionNotesChanged).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith('success', expect.stringContaining('permanently deleted'));
  });

  it('tells the host when extracted notes appear or go away, without a reload', () => {
    const onProjectionNotesChanged = vi.fn();
    const view = render(<ProjectSourcesPanel projectId="project-1" onProjectionNotesChanged={onProjectionNotesChanged} />);
    expect(onProjectionNotesChanged).not.toHaveBeenCalled();

    const ready = failedSource();
    ready.materialization = { ...ready.materialization, status: 'materialized', error_code: null,
      projection_note_id: 'synthetic-note', projection_available: true };
    mocks.sources = [ready];
    view.rerender(<ProjectSourcesPanel projectId="project-1" onProjectionNotesChanged={onProjectionNotesChanged} />);
    expect(onProjectionNotesChanged).toHaveBeenCalledTimes(1);

    mocks.sources = [];
    view.rerender(<ProjectSourcesPanel projectId="project-1" onProjectionNotesChanged={onProjectionNotesChanged} />);
    expect(onProjectionNotesChanged).toHaveBeenCalledTimes(2);
  });

  it('keeps an active extraction undeletable through the server impact, not by hiding the action', async () => {
    mocks.get.mockResolvedValue({ data: impact({
      materialization_status: 'parsing', deletion_blocked: true,
      blocked_reason: 'Source extraction is still active. Wait for it to finish before deleting.',
    }) });
    render(<ProjectSourcesPanel projectId="project-1" />);

    const confirm = await openDeleteDialog();
    expect(await within(confirm).findByText(/still active/)).toBeTruthy();
    expect((within(confirm).getByRole('button', { name: /Delete Source permanently/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
