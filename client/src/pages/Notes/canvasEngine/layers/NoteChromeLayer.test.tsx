import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from '../runtimeDataTypes';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import { useNoteBlockTrashController } from '../hooks/useNoteBlockTrashController';
import {
  NoteChromeLayer,
  type NoteChromeLayerProps,
} from './NoteChromeLayer';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: mocks.get,
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
    chromeCollapsed: false,
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
    titleDraft: 'Restore door',
    documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    trashedBlocks: [],
    blockTrashLoading: false,
    restoringBlockId: null,
    onAddFavorite: noop,
    onBackProject: noop,
    onCloseOverlay: noop,
    onCollapseChrome: noop,
    onAddPageBelow: noop,
    onCreatePageFrame: noop,
    onCreatePageStack: noop,
    onDetachPageFromStack: noop,
    onExpandChrome: noop,
    onSaveTitle: noop,
    onSaveDocumentTypographyProfile: noop,
    onTitleDraftChange: noop,
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
