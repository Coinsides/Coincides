import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from '../runtimeDataTypes';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import { useNoteBlockTrashController } from '../hooks/useNoteBlockTrashController';
import { useNoteTrashAction } from '../hooks/useNoteTrashAction';
import { ProjectNotesSection } from '../../../Courses/CourseDetail';
import {
  NoteChromeLayer,
  type NoteChromeLayerProps,
} from './NoteChromeLayer';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: mocks.get,
    delete: mocks.delete,
    post: mocks.post,
  },
}));

const trashedBlock: NoteBlock = {
  id: 'block-trashed',
  placement_id: 'placement-trashed',
  display_overrides_json: { display_mode: 'card' },
  canvas_layout: null,
  block_type: 'text',
  title: 'Deleted theorem',
  content_json: { text: 'Keep the complete object' },
  plain_text: 'Keep the complete object',
  metadata: { parent_placement_id: 'placement-parent' },
  order_index: 9,
  source_references: [{ id: 'source-ref-1' }],
};

function noteChromeProps(
  overrides: Partial<NoteChromeLayerProps> = {},
): NoteChromeLayerProps {
  const noop = vi.fn();
  return {
    blockTrashLoadFailed: false,
    contentReadOnly: false,
    exportPreview: {} as NoteChromeLayerProps['exportPreview'],
    layoutMode: false,
    layoutModeKind: 'off',
    note: {
      id: 'note-td28',
      course_id: 'course-td28',
      title: 'Restore door',
      description: null,
      status: 'active',
    },
    pageFrameCollection: { pageStacks: [] } as unknown as NoteChromeLayerProps['pageFrameCollection'],
    pageFrames: [],
    primaryPageFrameId: null,
    selectedPageFrameId: null,
    showBlockTrash: false,
    showExportPreview: false,
    showLayoutPanel: false,
    showMoreActions: true,
    showNoteInfo: false,
    showPreviewAIVisibility: false,
    showPreviewBlockTypes: false,
    showPreviewExportStatus: false,
    showPreviewLabelOverlay: false,
    sortedBlockCount: 1,
    sourceReferenceCount: 0,
    surfaceMode: 'page',
    surfacePolicy: { label: 'Page', nextModeLabel: 'Switch to Canvas' },
    documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    trashedBlocks: [],
    blockTrashLoading: false,
    restoringBlockId: null,
    onAddFavorite: noop,
    onTrashNote: vi.fn().mockResolvedValue(undefined),
    onCloseOverlay: noop,
    onAddPageBelow: noop,
    onCreatePageFrame: noop,
    onCreatePageStack: noop,
    onDetachPageFromStack: noop,
    onSaveDocumentTypographyProfile: noop,
    onToggleExportPreview: noop,
    onToggleLayoutMode: noop,
    onToggleMoreActions: noop,
    onToggleNoteInfo: noop,
    onOpenBlockTrash: noop,
    onOpenLayoutPanel: noop,
    onDeletePageFrame: noop,
    onDuplicatePageFrame: noop,
    onInsertPageFrame: noop,
    onMergePageStackWithPrevious: noop,
    onRestoreTrashedBlock: noop,
    onSelectPageFrame: noop,
    onSetPrimaryPageFrame: noop,
    onSplitPageStackAtFrame: noop,
    onTogglePageStackCollapse: noop,
    onTogglePreviewAIVisibility: noop,
    onTogglePreviewBlockTypes: noop,
    onTogglePreviewExportStatus: noop,
    onTogglePreviewLabelOverlay: noop,
    onToggleSurfaceMode: noop,
    ...overrides,
  };
}

describe('NoteChromeLayer block restore door', () => {
  it('D2 keeps only the direct pills and More visible before opening the bottom menu', () => {
    const props = noteChromeProps({ showMoreActions: false,
      onToggleExportPreview: vi.fn(), onToggleLayoutMode: vi.fn(), onToggleMoreActions: vi.fn() });
    const { container } = render(<div data-page-reading-control="true"><NoteChromeLayer {...props} /></div>);
    for (const name of ['New PageStack', 'Add to favorites', 'View info', 'Deleted blocks', 'Delete note']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('textbox', { name: 'Note title' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Back to project|Collapse toolbar|Expand toolbar/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'More note actions' }));
    expect(props.onToggleExportPreview).toHaveBeenCalledOnce();
    expect(props.onToggleLayoutMode).toHaveBeenCalledOnce();
    expect(props.onToggleMoreActions).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-page-reading-control] [data-note-toolbar-actions]')).not.toBeNull();
  });

  it('D2 migrated menu entries invoke their existing handlers from the upward body portal', () => {
    const props = noteChromeProps({ onCreatePageStack: vi.fn(), onAddFavorite: vi.fn(),
      onToggleNoteInfo: vi.fn(), onOpenBlockTrash: vi.fn() });
    const { container } = render(<div data-page-reading-control="true"><NoteChromeLayer {...props} /></div>);
    const popover = document.querySelector<HTMLElement>('[data-note-toolbar-popover]')!;
    expect(container.contains(popover)).toBe(false);
    expect(popover.closest('[data-canvas-layer="floating-overlay"]')?.parentElement).toBe(document.body);
    expect(Number.parseFloat(popover.style.bottom)).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'New PageStack' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }));
    fireEvent.click(screen.getByRole('button', { name: 'View info' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deleted blocks' }));
    expect(props.onCreatePageStack).toHaveBeenCalledOnce();
    expect(props.onAddFavorite).toHaveBeenCalledOnce();
    expect(props.onToggleNoteInfo).toHaveBeenCalledOnce();
    expect(props.onOpenBlockTrash).toHaveBeenCalledOnce();
    expect(screen.getByText('Typography')).toBeTruthy();
    expect(screen.queryByText('Note-level actions')).toBeNull();
    expect(screen.queryByText('History, duplicate, archive, import, and export controls will live here.')).toBeNull();
  });

  it('disables modal note deletion while retaining the local deleted-block drawer', () => {
    const props = noteChromeProps({ hostMode: 'modal' });
    render(<NoteChromeLayer {...props} />);
    const entry = screen.getByRole('button', { name: 'Delete note' }) as HTMLButtonElement;
    expect(entry.disabled).toBe(true);
    expect(entry.title).toBe('Open full page to use this');
    fireEvent.click(entry);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(props.onTrashNote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Deleted blocks' }));
    expect(props.onOpenBlockTrash).toHaveBeenCalledOnce();
  });

  it('S5 removes the mode switch from the DOM even with legacy canvas props', () => {
    for (const surfaceMode of ['page', 'canvas'] as const) {
      const subject = render(<NoteChromeLayer {...noteChromeProps({ surfaceMode })} />);
      expect(subject.container.querySelector('[title="Switch to Canvas"]')).toBeNull();
      expect(screen.queryByRole('button', { name: /^(Page|Canvas)$/ })).toBeNull();
      expect(screen.getByRole('button', { name: 'Preview' })).toBeTruthy();
      subject.unmount();
    }
  });
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it('K-5 renders a quiet block-trash entry with no count, badge, or status node', () => {
    render(<NoteChromeLayer {...noteChromeProps()} />);

    const entry = screen.getByRole('button', { name: 'Deleted blocks' });
    expect(Array.from(entry.children).map((child) => child.tagName.toLowerCase()))
      .toEqual(['svg', 'span', 'small']);
    expect(entry.querySelector('[data-block-trash-count]')).toBeNull();
    expect(entry.querySelector('[data-block-trash-badge]')).toBeNull();
    expect(entry.querySelector('[data-notification-dot], [data-unread]')).toBeNull();
    expect(entry.querySelector('[role="status"]')).toBeNull();
    expect(entry.textContent).not.toMatch(/\d/);
  });

  it('loads trashed blocks only on demand and restores with the complete listed object', async () => {
    const restoredBlock = { ...trashedBlock, metadata: { restored: true } };
    const restoreBlock = vi.fn().mockResolvedValue(restoredBlock);
    mocks.get.mockResolvedValue({ data: [trashedBlock] });
    const subject = renderHook(() => useNoteBlockTrashController({
      noteId: 'note-td28',
      restoreBlock,
    }));

    expect(mocks.get).not.toHaveBeenCalled();

    await act(async () => {
      await subject.result.current.loadTrashedBlocks();
    });

    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledWith('/notes/note-td28/blocks', {
      params: { status: 'trashed' },
    });
    const listedBlock = subject.result.current.trashedBlocks[0];
    expect(listedBlock).toBe(trashedBlock);

    await act(async () => {
      await subject.result.current.restoreTrashedBlock(listedBlock);
    });

    expect(restoreBlock).toHaveBeenCalledTimes(1);
    expect(restoreBlock.mock.calls[0][0]).toBe(listedBlock);
    expect(subject.result.current.trashedBlocks).toEqual([]);
  });

  it('shows deleted blocks in read-only notes while disabling Restore', () => {
    const onRestoreTrashedBlock = vi.fn();
    render(<NoteChromeLayer {...noteChromeProps({
      contentReadOnly: true,
      showBlockTrash: true,
      showMoreActions: false,
      trashedBlocks: [trashedBlock],
      onRestoreTrashedBlock,
    })} />);

    expect(screen.getByText('Deleted theorem')).toBeTruthy();
    const restoreButton = screen.getByRole('button', { name: 'Restore Deleted theorem' });
    expect((restoreButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(restoreButton);
    expect(onRestoreTrashedBlock).not.toHaveBeenCalled();
  });
});

describe('NoteChromeLayer organize mode', () => {
  it('keeps the Layout pill while removing the independent Snap alignment control', () => {
    render(<NoteChromeLayer {...noteChromeProps({
      showLayoutPanel: true,
      showMoreActions: false,
    })} />);

    expect(screen.getByRole('button', { name: 'Layout' })).toBeTruthy();
    expect(screen.queryByText('Snap alignment')).toBeNull();
  });
});

describe('NoteChromeLayer note trash smoke', () => {
  const showModalDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

  beforeEach(() => {
    mocks.delete.mockReset();
    mocks.post.mockReset();
    // jsdom has no native dialog top layer; preserve its observable open state.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) { this.open = true; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) { this.open = false; },
    });
  });

  afterEach(() => {
    if (showModalDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalDescriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  it('requires confirmation, cancels without deleting, and keeps a failed delete visible for retry', async () => {
    const onTrashNote = vi.fn().mockRejectedValueOnce(new Error('Request failed')).mockResolvedValue(undefined);
    render(<NoteChromeLayer {...noteChromeProps({ onTrashNote })} />);

    expect(screen.queryByText(/History, duplicate, archive, import, and export/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    expect(screen.getByRole('dialog').textContent).toContain('can be restored from the Project Trash tab');
    expect(onTrashNote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onTrashNote).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to Trash' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Could not move the note to Trash. Please try again.');
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Move to Trash' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onTrashNote).toHaveBeenCalledTimes(2);
  });

  it('moves the note through the real delete action, navigates to its Project, and restores through the existing Trash entry', async () => {
    const props = noteChromeProps();
    let noteStatus: 'active' | 'trashed' = 'active';
    mocks.delete.mockImplementation(async () => { noteStatus = 'trashed'; return { data: {} }; });
    mocks.post.mockImplementation(async () => { noteStatus = 'active'; return { data: {} }; });
    const noteSummary = { ...props.note, updated_at: '2026-09-09T12:00:00Z' };

    function NoteScreen() {
      const onTrashNote = useNoteTrashAction(props.note);
      return <NoteChromeLayer {...props} onTrashNote={onTrashNote} />;
    }

    function ProjectScreen() {
      const [status, setStatus] = useState<'active' | 'trashed'>('active');
      const [, refresh] = useState(0);
      return <ProjectNotesSection
        notes={status === noteStatus ? [noteSummary] : []}
        status={status}
        onStatusChange={setStatus}
        onCreateNote={vi.fn()}
        onOpenNote={vi.fn()}
        refreshNotes={async () => { refresh((value) => value + 1); }}
        addToast={vi.fn()}
      />;
    }

    render(<MemoryRouter initialEntries={['/notes/note-td28']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
      <Route path="/notes/:noteId" element={<NoteScreen />} />
      <Route path="/projects/course-td28" element={<ProjectScreen />} />
    </Routes></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to Trash' }));
    expect(await screen.findByText('No notes yet.')).toBeTruthy();
    expect(mocks.delete).toHaveBeenCalledExactlyOnceWith('/notes/note-td28');
    fireEvent.click(screen.getByRole('button', { name: 'Trash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore Restore door' }));
    expect(await screen.findByText('Trash is empty.')).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/notes/note-td28/restore');
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByRole('button', { name: 'Open note Restore door' })).toBeTruthy();
  });

  it('keeps a late delete response from navigating away from the next page', async () => {
    let resolveDelete!: () => void;
    mocks.delete.mockReturnValue(new Promise<void>((resolve) => { resolveDelete = resolve; }));
    const props = noteChromeProps();
    function NoteScreen() {
      const trashNote = useNoteTrashAction(props.note);
      return <><button onClick={() => void trashNote()}>Delete pending note</button><Link to="/next">Next page</Link></>;
    }
    render(<MemoryRouter initialEntries={['/notes/note-td28']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
      <Route path="/notes/:noteId" element={<NoteScreen />} />
      <Route path="/next" element={<p>Next page retained</p>} />
      <Route path="/projects/:courseId" element={<p>Old project</p>} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Delete pending note' }));
    fireEvent.click(screen.getByRole('link', { name: 'Next page' }));
    await act(async () => resolveDelete());
    expect(screen.getByText('Next page retained')).toBeTruthy();
    expect(screen.queryByText('Old project')).toBeNull();
    expect(mocks.delete).toHaveBeenCalledExactlyOnceWith('/notes/note-td28');
  });

  it('closes the prior note confirmation when the mounted chrome receives another note', () => {
    const props = noteChromeProps();
    const subject = render(<NoteChromeLayer {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    subject.rerender(<NoteChromeLayer {...props} note={{ ...props.note, id: 'note-next', title: 'Next note' }} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(props.onTrashNote).not.toHaveBeenCalled();
  });
});
