import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import { createTextBlockContentV1 } from '../textFlowService';
import { TextBlockProjection } from './TextBlockProjection';

type ProjectionProps = ComponentProps<typeof TextBlockProjection>;

function syntheticFlow(): TextBlockContentV1 {
  const base = createTextBlockContentV1('');
  return {
    ...base,
    metadata: { nested: { retained: 'flow' } },
    units: ['Alpha', 'Bravo', 'Charlie'].map((text, index) => ({
      ...base.units[0], id: `unit-${index}`, text, order_index: index,
      writing_role: index === 1 ? 'quote' : 'paragraph',
      indent_level: index,
      metadata: { nested: { retained: text } },
    })),
    inline_structures: [{
      id: 'inline-bravo', parent_text_unit_id: 'unit-1', semantic_kind: 'inline_code',
      anchor_text: 'rav', anchor_range: { start: 1, end: 4 }, field_values: { language: 'text' },
      metadata: { nested: { retained: 'inline' } }, status: 'active',
    }],
  };
}

function rectangle(x: number, y: number, width: number, height: number): DOMRect {
  return { x, y, left: x, top: y, right: x + width, bottom: y + height, width, height,
    toJSON: () => ({ x, y, width, height }) };
}

// jsdom has no pointer constructor or layout. Preserve real bubbling/React handlers,
// supplying only pointer identity and the measured row/editor rectangles.
function pointer(target: HTMLElement, type: string, x: number, y: number, pointerId = 7) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true,
    clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 });
  Object.defineProperties(event, { pointerId: { value: pointerId }, pointerType: { value: 'mouse' },
    isPrimary: { value: true } });
  fireEvent(target, event);
}

function renderEditor(options: Partial<ProjectionProps> = {}, initial = syntheticFlow()) {
  const onFlow = vi.fn();
  const onExtract = vi.fn();
  const onBoundary = vi.fn();
  const onContextMenu = vi.fn();
  let latest = initial;
  function Fixture() {
    const [flow, setFlow] = useState(initial);
    latest = flow;
    return <TextBlockProjection blockId="synthetic-handle-block" readOnly={false}
      text={flow.units.map((unit) => unit.text).join('\n')} textFlow={flow}
      presentationKind="paragraph" annotations={[]} selectedAnnotationIds={[]}
      showLabelOverlay={false} textareaRef={null} onFocused={vi.fn()}
      onAnnotationSelect={vi.fn()} onAnnotationContextMenu={vi.fn()}
      onTextUnitSelection={vi.fn()} onTextUnitContextMenu={onContextMenu}
      onTextChange={vi.fn()} onTextFlowChange={(next, edit, previous) => {
        onFlow(next, edit, previous); setFlow(next);
      }} onTextEditBoundary={onBoundary} onExtractTextUnit={onExtract}
      onSave={vi.fn(async () => ({ status: 'saved' } as never))} onKeyDown={vi.fn()}
      {...options} />;
  }
  const view = render(<Fixture />);
  const handle = (id: string) => view.container.querySelector<HTMLElement>(`[data-text-unit-handle="${id}"]`)!;
  const row = (id: string) => view.container.querySelector<HTMLElement>(`[data-text-unit-row="${id}"]`)!;
  const measure = () => {
    const editor = view.container.querySelector<HTMLElement>('[data-text-unit-editor]')!;
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue(rectangle(100, 100, 400, 120));
    [...view.container.querySelectorAll<HTMLElement>('[data-text-unit-row]')].forEach((node, index) => {
      vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(rectangle(100, 100 + index * 40, 400, 40));
      const gutter = node.querySelector<HTMLElement>('[aria-label="Text unit tools"]')!;
      vi.spyOn(gutter, 'getBoundingClientRect').mockReturnValue(rectangle(80, 100 + index * 40, 20, 20));
      vi.spyOn(handle(node.dataset.textUnitRow!), 'getBoundingClientRect').mockReturnValue(rectangle(80, 100 + index * 40, 20, 20));
    });
  };
  return { ...view, handle, row, measure, onFlow, onExtract, onBoundary, onContextMenu,
    current: () => latest,
    ids: () => [...view.container.querySelectorAll<HTMLTextAreaElement>('textarea')].map((node) => node.dataset.textUnitId) };
}

describe('B10 real unit handle events with synthetic content', () => {
  it('without a writing-surface move host, another block retains B10 outside-extraction behavior', () => {
    const source = renderEditor({ blockId: 'c3-source' });
    const targetFlow = syntheticFlow();
    targetFlow.units = targetFlow.units.map((unit) => ({ ...unit, id: `target-${unit.id}` }));
    targetFlow.inline_structures = [];
    const target = renderEditor({ blockId: 'c3-target' }, targetFlow);
    source.measure();
    const targetEditor = target.container.querySelector<HTMLElement>('[data-text-unit-editor]')!;
    vi.spyOn(targetEditor, 'getBoundingClientRect').mockReturnValue(rectangle(100, 300, 400, 120));
    [...target.container.querySelectorAll<HTMLElement>('[data-text-unit-row]')].forEach((node, index) => {
      vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(rectangle(100, 300 + index * 40, 400, 40));
    });
    pointer(source.handle('unit-1'), 'pointerdown', 85, 150);
    pointer(source.handle('unit-1'), 'pointermove', 180, 338);
    expect(target.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    pointer(source.handle('unit-1'), 'pointerup', 180, 338);
    expect(source.onExtract).toHaveBeenCalledExactlyOnceWith('unit-1', { x: 180, y: 338 });
    expect(source.onFlow).not.toHaveBeenCalled();
    expect(target.onFlow).not.toHaveBeenCalled();
    expect(target.current()).toEqual(targetFlow);
  });

  it('smoke 1: always renders a button per unit and no native role select', () => {
    const editor = renderEditor();
    expect(screen.getAllByRole('button', { name: 'Text unit handle' })).toHaveLength(3);
    expect(editor.container.querySelector('select')).toBeNull();
    for (const button of screen.getAllByRole('button', { name: 'Text unit handle' })) {
      expect(button.hidden).toBe(false);
      expect(button.getAttribute('aria-hidden')).not.toBe('true');
    }
  });

  it.each([
    ['Text', 'paragraph'], ['Heading', 'heading'], ['Quote', 'quote'],
    ['Bullet list', 'bullet_item'], ['Numbered list', 'numbered_item'],
    ['To-do list', 'todo_item'], ['Toggle list', 'toggle_item'], ['Code line', 'code_line'],
  ] satisfies Array<[string, TextUnitWritingRole]>)('smoke 1: click menu changes the unit role to %s', (label, role) => {
    const initial = syntheticFlow();
    initial.units[0].writing_role = role === 'paragraph' ? 'heading' : 'paragraph';
    const editor = renderEditor({}, initial);
    fireEvent.click(editor.handle('unit-0'), { clientX: 85, clientY: 110 });
    const turnInto = screen.getByRole('button', { name: 'Turn into' });
    fireEvent.mouseEnter(turnInto.parentElement!);
    fireEvent.click(turnInto);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(editor.current().units[0].writing_role).toBe(role);
    expect(editor.current().units[0].id).toBe('unit-0');
    expect(editor.current().inline_structures).toEqual(initial.inline_structures);
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
    expect(editor.onExtract).not.toHaveBeenCalled();
  });

  it('smoke 1: gutter right-click keeps the existing unit menu', () => {
    const editor = renderEditor();
    fireEvent.contextMenu(editor.handle('unit-1'), { clientX: 90, clientY: 145 });
    const menu = screen.getByRole('menu', { name: 'Text unit' });
    expect(within(menu).getByRole('button', { name: 'Turn into' })).toBeTruthy();
    expect(within(menu).getByRole('button', { name: 'Label this unit' })).toBeTruthy();
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it.each([
    { source: 'unit-0', target: 'unit-2', y: 210, edge: 'after', order: [1, 2, 0] },
    { source: 'unit-2', target: 'unit-0', y: 105, edge: 'before', order: [2, 0, 1] },
  ])('smoke 2: pointer drag paints the $edge line and reorders without rewriting unit/inline data', ({ source, target, y, edge, order }) => {
    const initial = syntheticFlow();
    const editor = renderEditor({}, initial);
    editor.measure();
    const start = source === 'unit-0' ? 110 : 190;
    pointer(editor.handle(source), 'pointerdown', 85, start);
    pointer(editor.handle(source), 'pointermove', 120, y);
    const indicator = editor.container.querySelector<HTMLElement>(`[data-text-unit-drop-indicator="${target}"]`);
    expect(indicator?.dataset.dropEdge).toBe(edge);
    expect(editor.onFlow).not.toHaveBeenCalled();
    pointer(editor.handle(source), 'pointerup', 120, y);
    expect(editor.ids()).toEqual(order.map((index) => `unit-${index}`));
    expect(editor.current()).toEqual({ ...initial,
      units: order.map((index, order_index) => ({ ...initial.units[index], order_index })) });
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    expect(editor.onExtract).not.toHaveBeenCalled();
    // A browser's click following pointerup must not open the menu after a drag.
    fireEvent.click(editor.handle(source));
    expect(screen.queryByRole('menu', { name: 'Text unit' })).toBeNull();
    // The suppression is consumed, so a later keyboard-generated click can open it.
    fireEvent.click(editor.handle(source), { detail: 0 });
    expect(screen.getByRole('menu', { name: 'Text unit' })).toBeTruthy();
  });

  it('smoke 4: dragging outside the block emits the actual release point once', () => {
    const editor = renderEditor();
    editor.measure();
    pointer(editor.handle('unit-1'), 'pointerdown', 85, 150);
    pointer(editor.handle('unit-1'), 'pointermove', 620, 340);
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    pointer(editor.handle('unit-1'), 'pointerup', 635, 355);
    expect(editor.onExtract).toHaveBeenCalledTimes(1);
    expect(editor.onExtract).toHaveBeenCalledWith('unit-1', { x: 635, y: 355 });
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('does not extract or reorder on pointer movement below the drag threshold', () => {
    const editor = renderEditor();
    editor.measure();
    pointer(editor.handle('unit-0'), 'pointerdown', 85, 110);
    pointer(editor.handle('unit-0'), 'pointermove', 87, 112);
    pointer(editor.handle('unit-0'), 'pointerup', 87, 112);
    expect(editor.onFlow).not.toHaveBeenCalled();
    expect(editor.onExtract).not.toHaveBeenCalled();
    fireEvent.click(editor.handle('unit-0'));
    expect(screen.getByRole('menu', { name: 'Text unit' })).toBeTruthy();
  });

  it.each(['pointercancel', 'Escape'])('%s cancels a drag without changing content', (cancel) => {
    const editor = renderEditor();
    editor.measure();
    pointer(editor.handle('unit-0'), 'pointerdown', 85, 110);
    pointer(editor.handle('unit-0'), 'pointermove', 120, 210);
    if (cancel === 'Escape') fireEvent.keyDown(editor.handle('unit-0'), { key: 'Escape' });
    else pointer(editor.handle('unit-0'), 'pointercancel', 120, 210);
    pointer(editor.handle('unit-0'), 'pointerup', 120, 210);
    expect(editor.onFlow).not.toHaveBeenCalled();
    expect(editor.onExtract).not.toHaveBeenCalled();
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
  });

  it.each(['todo_item', 'bullet_item'] as const)('smoke 5: a standalone extracted %s unit retains role and marker rendering', (role) => {
    const initial = syntheticFlow();
    const extractedUnit = { ...initial.units[1], writing_role: role, order_index: 0,
      metadata: { ...initial.units[1].metadata, checked: true } };
    const extractedFlow = { ...initial, units: [extractedUnit] };
    const editor = renderEditor({}, extractedFlow);
    expect(editor.ids()).toEqual(['unit-1']);
    expect(editor.current()).toEqual(extractedFlow);
    if (role === 'todo_item') expect((screen.getByRole('checkbox', { name: 'Toggle todo item' }) as HTMLInputElement).checked).toBe(true);
    else expect(within(editor.row('unit-1')).getByText('-', { exact: true })).toBeTruthy();
  });

  it('smoke 6: composition blocks handle drag and normal dragging resumes after compositionend', () => {
    const editor = renderEditor();
    editor.measure();
    const textarea = editor.container.querySelector('textarea')!;
    act(() => textarea.focus());
    fireEvent.compositionStart(textarea);
    pointer(editor.handle('unit-0'), 'pointerdown', 85, 110);
    pointer(editor.handle('unit-0'), 'pointermove', 120, 210);
    pointer(editor.handle('unit-0'), 'pointerup', 120, 210);
    expect(editor.onFlow).not.toHaveBeenCalled();
    expect(editor.onExtract).not.toHaveBeenCalled();
    expect(editor.container.querySelector('[data-text-unit-drop-indicator]')).toBeNull();
    fireEvent.compositionEnd(textarea);
    pointer(editor.handle('unit-0'), 'pointerdown', 85, 110);
    pointer(editor.handle('unit-0'), 'pointermove', 120, 210);
    pointer(editor.handle('unit-0'), 'pointerup', 120, 210);
    expect(editor.ids()).toEqual(['unit-1', 'unit-2', 'unit-0']);
  });

  it.each([{ readOnly: true }, { layoutMode: true }])('disabled editor mode $readOnly/$layoutMode blocks handle mutations', (options) => {
    const editor = renderEditor(options);
    editor.measure();
    pointer(editor.handle('unit-0'), 'pointerdown', 85, 110);
    pointer(editor.handle('unit-0'), 'pointermove', 120, 210);
    pointer(editor.handle('unit-0'), 'pointerup', 120, 210);
    pointer(editor.handle('unit-0'), 'pointerdown', 85, 110);
    pointer(editor.handle('unit-0'), 'pointermove', 620, 355);
    pointer(editor.handle('unit-0'), 'pointerup', 635, 355);
    expect(editor.onFlow).not.toHaveBeenCalled();
    expect(editor.onExtract).not.toHaveBeenCalled();
  });
});
