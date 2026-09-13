import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from '../runtimeDataTypes';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import { createPrimaryPageFrame } from '../engineModel';
import { createPageFrameCollectionSeed } from '../pageFrameCollectionService';
import { useNoteBlockTrashController } from '../hooks/useNoteBlockTrashController';
import { useNoteTrashAction } from '../hooks/useNoteTrashAction';
import { useFloatingOverlayController } from '../hooks/useFloatingOverlayController';
import { PaperSkinContext } from '../PaperSkinContext';
import { SKIN_PRESET_IDS, type SkinSelection } from '@shared/types';
import { SKIN_LABELS, SKIN_PRESETS } from '@/styles/skinPresets';
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
  getToken: () => null, setToken: vi.fn(),
  default: {
    get: (url: string, ...args: unknown[]) => url === '/palette-colors' || url === '/skin-suites'
      ? Promise.resolve({ data: [] }) : mocks.get(url, ...args),
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
    showAppearancePanel: false,
    showMoreActions: true,
    showPreviewAIVisibility: false,
    showPreviewBlockTypes: false,
    showPreviewExportStatus: false,
    showPreviewLabelOverlay: false,
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
    onToggleAppearancePanel: noop,
    onToggleLayoutMode: noop,
    onToggleMoreActions: noop,
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
    ...overrides,
  };
}

describe('NoteChromeLayer block restore door', () => {
  it('D2 keeps only the direct pills and More visible before opening the bottom menu', () => {
    const props = noteChromeProps({ showMoreActions: false,
      onToggleExportPreview: vi.fn(), onToggleLayoutMode: vi.fn(), onToggleAppearancePanel: vi.fn(), onToggleMoreActions: vi.fn() });
    const { container } = render(<div data-page-reading-control="true"><NoteChromeLayer {...props} /></div>);
    for (const name of ['New PageStack', 'Add to favorites', 'View info', 'Deleted blocks', 'Delete note']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('textbox', { name: 'Note title' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Back to project|Collapse toolbar|Expand toolbar/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Layout' }));
    fireEvent.click(screen.getByRole('button', { name: '笔记外观' }));
    fireEvent.click(screen.getByRole('button', { name: 'More note actions' }));
    expect(props.onToggleExportPreview).toHaveBeenCalledOnce();
    expect(props.onToggleLayoutMode).toHaveBeenCalledOnce();
    expect(props.onToggleAppearancePanel).toHaveBeenCalledOnce();
    expect(props.onToggleMoreActions).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-page-reading-control] [data-note-toolbar-actions]')).not.toBeNull();
  });

  it('E5 retires View info while the remaining menu entries keep their handlers and upward body portal', () => {
    const props = noteChromeProps({ onCreatePageStack: vi.fn(), onAddFavorite: vi.fn(),
      onOpenBlockTrash: vi.fn() });
    const { container } = render(<div data-page-reading-control="true"><NoteChromeLayer {...props} /></div>);
    const popover = document.querySelector<HTMLElement>('[data-note-toolbar-popover]')!;
    expect(container.contains(popover)).toBe(false);
    expect(popover.closest('[data-canvas-layer="floating-overlay"]')?.parentElement).toBe(document.body);
    expect(Number.parseFloat(popover.style.bottom)).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'New PageStack' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }));
    expect(screen.queryByRole('button', { name: 'View info' })).toBeNull();
    expect(document.querySelector('[data-note-overlay="info"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Deleted blocks' }));
    expect(props.onCreatePageStack).toHaveBeenCalledOnce();
    expect(props.onAddFavorite).toHaveBeenCalledOnce();
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

describe('NoteChromeLayer appearance', () => {
  it('retains a single float card across selections and paper identity changes, then applies to the current paper', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    function Fixture({ noteId, selected }: { noteId: string; selected: string | null }) {
      const overlay = useFloatingOverlayController({ setInteractionState: vi.fn() });
      const props = noteChromeProps();
      return <PaperSkinContext.Provider value={{ style: {}, preset: 'default', selection: { preset: 'default' },
        save: async (value) => { await save(noteId, value); }, error: null, retry: vi.fn() }}>
        <button type="button" onClick={overlay.closeOverlay}>纸面选区</button>
        <NoteChromeLayer {...props} note={{ ...props.note, id: noteId }} selectedPageFrameId={selected}
          showAppearancePanel={overlay.showAppearancePanel} showMoreActions={overlay.showMoreActions}
          onToggleAppearancePanel={overlay.toggleAppearancePanel} onToggleMoreActions={overlay.toggleMoreActions}
          onCloseOverlay={overlay.closeOverlay} />
      </PaperSkinContext.Provider>;
    }
    const subject = render(<Fixture noteId="paper-a" selected={null} />);
    fireEvent.click(screen.getByRole('button', { name: '笔记外观' }));
    const panel = screen.getByRole('dialog', { name: '笔记外观浮卡' });
    fireEvent.click(screen.getByRole('button', { name: '纸面选区' }));
    subject.rerender(<Fixture noteId="paper-a" selected="page-b" />);
    expect(screen.getByRole('dialog', { name: '笔记外观浮卡' })).toBe(panel);
    subject.rerender(<Fixture noteId="paper-b" selected={null} />);
    expect(screen.getAllByRole('dialog', { name: '笔记外观浮卡' })).toEqual([panel]);
    expect(panel.querySelector('[data-skin-float-content]')?.getAttribute('data-skin-float-content')).toBe('paper-b');
    fireEvent.click(within(panel).getByRole('button', { name: '暖纸' }));
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith('paper-b', { preset: 'warm-paper' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '笔记外观浮卡' })).toBeNull();
  });

  it('opens one persistent float card, preserves deviations across presets, edits colors, and keeps More independent', async () => {
    const save = vi.fn();
    const setInteractionState = vi.fn();
    function AppearanceFixture() {
      const overlay = useFloatingOverlayController({ setInteractionState });
      const [selection, setSelection] = useState<SkinSelection | null>({ preset: 'warm-paper', overrides: { paper: '#abcdef' } });
      return <PaperSkinContext.Provider value={{
        style: {}, preset: selection?.preset ?? 'default', selection,
        save: async (next) => { save(next); setSelection(next); },
        error: null, retry: vi.fn(),
      }}>
        <NoteChromeLayer {...noteChromeProps({
          showAppearancePanel: overlay.showAppearancePanel,
          showMoreActions: overlay.showMoreActions,
          onToggleAppearancePanel: overlay.toggleAppearancePanel,
          onToggleMoreActions: overlay.toggleMoreActions,
          onCloseOverlay: overlay.closeOverlay,
        })} />
      </PaperSkinContext.Provider>;
    }
    const { container } = render(<AppearanceFixture />);
    fireEvent.click(screen.getByRole('button', { name: '笔记外观' }));
    const panel = document.querySelector<HTMLElement>('[data-skin-float-card]')!;
    expect(container.contains(panel)).toBe(false);
    expect(panel.parentElement).toBe(document.body);
    const presets = screen.getByRole('group', { name: '外观预设快选' });
    expect(within(presets).getAllByRole('button')).toHaveLength(4);
    expect(within(presets).getByRole('button', { name: '暖纸' }).getAttribute('aria-pressed')).toBe('true');
    for (const preset of SKIN_PRESET_IDS) {
      const button = within(presets).getByRole('button', { name: SKIN_LABELS[preset] });
      const expected = document.createElement('button');
      expected.style.background = SKIN_PRESETS[preset].paper;
      expect(button.querySelector<HTMLElement>('[data-skin-sample]')!.style.backgroundColor).toBe(expected.style.backgroundColor);
      fireEvent.click(button);
      await waitFor(() => expect(save).toHaveBeenLastCalledWith({ preset, overrides: { paper: '#abcdef' } }));
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(within(presets).getAllByRole('button', { pressed: true })).toHaveLength(1);
    }
    fireEvent.click(screen.getByRole('button', { name: 'More note actions' }));
    expect(document.querySelector('[data-note-overlay="more"]')).not.toBeNull();
    expect(document.querySelector('[data-skin-float-card]')).toBe(panel);
    fireEvent.click(screen.getByRole('button', { name: '纸面' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Hex 颜色' }), { target: { value: '#123456' } });
    fireEvent.keyDown(screen.getByRole('dialog', { name: '纸面颜色' }), { key: 'Escape' });
    await waitFor(() => expect(save).toHaveBeenLastCalledWith({ preset: 'workbench', overrides: { paper: '#123456' } }));
    fireEvent.click(screen.getByRole('button', { name: '关闭外观' }));
    expect(document.querySelector('[data-skin-float-card]')).toBeNull();
    expect(screen.getByRole('button', { name: '笔记外观' }).getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-note-overlay="more"]')).not.toBeNull();
    expect(document.querySelector('[data-paper-appearance]')).toBeNull();
  });

  it('keeps appearance open across ordinary overlays and selection close requests', () => {
    const setInteractionState = vi.fn();
    const { result } = renderHook(() => useFloatingOverlayController({ setInteractionState }));
    const panels = [
      ['openLayoutPanel', 'showLayoutPanel'],
      ['toggleMoreActions', 'showMoreActions'],
      ['openBlockTrash', 'showBlockTrash'],
      ['toggleExportPreview', 'showExportPreview'],
      ['toggleViewOptions', 'showViewOptions'],
    ] as const;
    act(() => result.current.toggleAppearancePanel());
    expect(setInteractionState).not.toHaveBeenCalled();
    for (const [open, shown] of panels) {
      act(() => result.current[open]());
      expect(result.current.showAppearancePanel).toBe(true);
      expect(result.current[shown]).toBe(true);
      act(() => result.current.closeOverlay());
      expect(result.current.showAppearancePanel).toBe(true);
      expect(result.current[shown]).toBe(false);
    }
    act(() => result.current.toggleAppearancePanel());
    expect(result.current.showAppearancePanel).toBe(false);
    act(() => result.current.toggleAppearancePanel());
    act(() => result.current.closeOverlay());
    expect(result.current.showAppearancePanel).toBe(true);
    expect(setInteractionState).toHaveBeenLastCalledWith({ mode: 'idle', target: 'surface' });
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

  it.each([
    { pageFormat: 'screen_note', templateId: 'screen_note' as const, continuous: true },
    { pageFormat: undefined, templateId: 'screen_note' as const, continuous: false },
    { pageFormat: 'a4_portrait', templateId: 'a4_portrait' as const, continuous: false },
    { pageFormat: 'letter_portrait', templateId: 'letter_portrait' as const, continuous: false },
  ])('limits manual frame creation only for new Web notes ($pageFormat / $templateId)', ({ pageFormat, templateId, continuous }) => {
    const frame = createPrimaryPageFrame({ templateId });
    const props = noteChromeProps({
      note: { ...noteChromeProps().note, page_format: pageFormat },
      pageFrameCollection: createPageFrameCollectionSeed(frame),
      pageFrames: [frame], primaryPageFrameId: frame.id, selectedPageFrameId: frame.id,
      showLayoutPanel: true, showMoreActions: true,
      onToggleLayoutMode: vi.fn(), onCreatePageStack: vi.fn(), onAddPageBelow: vi.fn(), onDuplicatePageFrame: vi.fn(), onDeletePageFrame: vi.fn(),
    });
    render(<NoteChromeLayer {...props} />);
    if (continuous) {
      expect(screen.queryAllByRole('button', { name: /New PageStack/ })).toHaveLength(0);
      expect(screen.queryAllByRole('button', { name: /Add page below/ })).toHaveLength(0);
      expect(screen.queryByRole('button', { name: 'Duplicate Page 1 to new stack' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete Page 1' })).toBeNull();
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'New PageStack' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add page below Page 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Duplicate Page 1 to new stack' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete Page 1' }));
      expect(props.onCreatePageStack).toHaveBeenCalledOnce();
      expect(props.onAddPageBelow).toHaveBeenCalledWith(frame.id);
      expect(props.onDuplicatePageFrame).toHaveBeenCalledWith(frame.id);
      expect(props.onDeletePageFrame).toHaveBeenCalledWith(frame.id);
    }
    // The Layout entry remains usable, including for the new Web preset.
    fireEvent.click(screen.getByRole('button', { name: 'Layout' }));
    expect(props.onToggleLayoutMode).toHaveBeenCalledOnce();
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
