import { createRef } from 'react';
import { act, cleanup, createEvent, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TRAY_DRAG_TYPE, type TrayEntry } from '../trayService';
import { NoteTraySidebar, type NoteTrayState } from './NoteTraySidebar';

afterEach(cleanup);

function entry(id: string, category: TrayEntry['category']): TrayEntry {
  return {
    placement: { placementId: id, objectId: `object-${id}`, canvasId: 'synthetic-note',
      x: 0, y: 0, width: 0, height: 0, rotation: 0, surface: 'tray', boundaryRole: 'inside', zIndex: 0 },
    category, label: `${category} sample`,
    ...(category === 'block' ? { block: { id: 'synthetic-block', placement_id: id, display_overrides_json: {},
      block_type: 'paragraph', title: null, content_json: { body: 'Synthetic text' }, plain_text: 'Synthetic text',
      metadata: {}, order_index: 0, source_references: [] } } : { boardKind: category === 'object' ? 'shape' : 'content_group' }),
  };
}

function state(overrides: Partial<NoteTrayState> = {}): NoteTrayState {
  return {
    entries: [entry('block-row', 'block'), entry('object-row', 'object'), entry('mount-row', 'mount')],
    busy: false, canReorder: true, reorder: vi.fn().mockResolvedValue(true), dropTargetRef: createRef<HTMLElement>(),
    setOpen: vi.fn(), canMoveSelected: true, moveSelectedToTray: vi.fn(), split: vi.fn(),
    boards: [{ id: 'synthetic-board', title: 'Synthetic board' }], boardsLoading: false, boardsError: null,
    boardActionsEnabled: true, relocateToBoard: vi.fn().mockResolvedValue(true), latestRelocation: null,
    error: null, createdNoteId: null, ...overrides,
  } as NoteTrayState;
}

function renderSidebar(tray: NoteTrayState) {
  return render(<MemoryRouter><NoteTraySidebar tray={tray} /></MemoryRouter>);
}

function rows(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLLIElement>('[data-tray-placement-id]'));
}

function rowIds(container: HTMLElement) {
  return rows(container).map((row) => row.dataset.trayPlacementId);
}

function transfer() {
  const data = new Map<string, string>();
  return { get types() { return [...data.keys()]; }, effectAllowed: 'none', dropEffect: 'none',
    setData: (type: string, value: string) => data.set(type, value), getData: (type: string) => data.get(type) ?? '' };
}

function dragEvent(type: 'dragOver' | 'drop', target: HTMLElement, dataTransfer: ReturnType<typeof transfer>, edge: 'before' | 'after') {
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 40 } as DOMRect);
  const event = createEvent[type](target, { dataTransfer });
  Object.defineProperty(event, 'clientY', { value: edge === 'before' ? 105 : 135 });
  fireEvent(target, event);
}

describe('Note staging row reorder', () => {
  it.each([
    { source: 2, target: 0, edge: 'before' as const, expected: ['mount-row', 'block-row', 'object-row'] },
    { source: 1, target: 2, edge: 'after' as const, expected: ['block-row', 'mount-row', 'object-row'] },
    { source: 0, target: 2, edge: 'after' as const, expected: ['object-row', 'mount-row', 'block-row'] },
  ])('drags each entry category through one complete order request: $source', ({ source, target, edge, expected }) => {
    const tray = state();
    const { container } = renderSidebar(tray);
    const items = rows(container);
    expect(items.every((row) => row.draggable)).toBe(true);
    expect(tray.dropTargetRef.current).toBe(container.querySelector('[data-note-tray="true"]'));
    const dataTransfer = transfer();
    fireEvent.dragStart(items[source], { dataTransfer });
    expect(dataTransfer.getData(TRAY_DRAG_TYPE)).toBe(items[source].dataset.trayPlacementId);
    expect(dataTransfer.effectAllowed).toBe('move');
    dragEvent('dragOver', items[target], dataTransfer, edge);
    expect(items[target].className).toContain(edge === 'before' ? 'trayInsertBefore' : 'trayInsertAfter');
    dragEvent('drop', items[target], dataTransfer, edge);
    expect(tray.reorder).toHaveBeenCalledExactlyOnceWith(expected);
    expect(rowIds(container)).toEqual(['block-row', 'object-row', 'mount-row']);
    expect(items[target].className).toBe('');
  });

  it('retains the original order after rejection and displays the controller error', async () => {
    const tray = state({ reorder: vi.fn().mockResolvedValue(false) });
    const { container, rerender, getByRole } = renderSidebar(tray);
    const items = rows(container);
    const dataTransfer = transfer();
    fireEvent.dragStart(items[2], { dataTransfer });
    await act(async () => { dragEvent('drop', items[0], dataTransfer, 'before'); });
    rerender(<MemoryRouter><NoteTraySidebar tray={{ ...tray, error: 'Staging order could not be saved. Try again.' }} /></MemoryRouter>);
    expect(rowIds(container)).toEqual(['block-row', 'object-row', 'mount-row']);
    expect(getByRole('alert').textContent).toContain('Staging order could not be saved');
  });

  it.each([{ busy: true }, { canReorder: false }])('disables row writes while %j', (disabled) => {
    const tray = state(disabled);
    const { container } = renderSidebar(tray);
    const items = rows(container);
    expect(items.every((row) => !row.draggable)).toBe(true);
    const dataTransfer = transfer();
    fireEvent.dragStart(items[2], { dataTransfer });
    dragEvent('drop', items[0], dataTransfer, 'before');
    expect(tray.reorder).not.toHaveBeenCalled();
  });

  it('clears cancelled insertion feedback and ignores external drops and unchanged row order', () => {
    const tray = state();
    const { container } = renderSidebar(tray);
    const items = rows(container);
    const dataTransfer = transfer();
    dataTransfer.setData(TRAY_DRAG_TYPE, 'mount-row');
    dragEvent('drop', items[0], dataTransfer, 'before');
    expect(tray.reorder).not.toHaveBeenCalled();
    fireEvent.dragStart(items[2], { dataTransfer });
    dragEvent('dragOver', items[0], dataTransfer, 'before');
    fireEvent.dragEnd(items[2], { dataTransfer });
    expect(items[0].className).toBe('');
    dragEvent('drop', items[0], dataTransfer, 'before');
    fireEvent.dragStart(items[0], { dataTransfer });
    dragEvent('drop', items[1], dataTransfer, 'before');
    expect(tray.reorder).not.toHaveBeenCalled();
  });

  it('keeps block split and mixed board selection independent of row dragging', async () => {
    const tray = state();
    const { container, getByRole, getByLabelText } = renderSidebar(tray);
    fireEvent.click(rows(container)[0].querySelector('input')!);
    fireEvent.click(getByRole('button', { name: 'Create note from selection' }));
    expect(tray.split).toHaveBeenCalledExactlyOnceWith(['block-row'], 'Untitled note');
    fireEvent.click(getByLabelText('Select object sample for board'));
    fireEvent.click(getByLabelText('Select mount sample for board'));
    fireEvent.change(getByLabelText('Target board'), { target: { value: 'synthetic-board' } });
    await act(async () => { fireEvent.click(getByRole('button', { name: 'Move selection to board' })); });
    expect(tray.relocateToBoard).toHaveBeenCalledExactlyOnceWith(['object-row', 'mount-row'], 'synthetic-board');
    expect(tray.reorder).not.toHaveBeenCalled();
  });

  it('names the sidebar, move action and empty state as staging', () => {
    const tray = state({ entries: [] });
    const { getByRole } = renderSidebar(tray);
    expect(getByRole('complementary', { name: 'Note staging' })).toBeTruthy();
    expect(getByRole('button', { name: 'Close staging' })).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Stage' }));
    expect(tray.moveSelectedToTray).toHaveBeenCalledTimes(1);
    expect(getByRole('status', { name: 'Empty staging' }).textContent).toBe('');
  });
});
