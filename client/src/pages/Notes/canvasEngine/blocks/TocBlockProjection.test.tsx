import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SKIN_PRESET_IDS } from '@shared/types';
import { SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from '@/styles/skinPresets';
import { buildSkinComponentStyles } from '@/styles/skinComponentStyles';
import { TocProjectionProvider } from '../TocProjectionContext';
import { deriveChapterProjection } from '../chapterProjectionService';
import { buildPaperSkinStyles } from '../paperSkinStyles';
import type { NoteBlock, TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import { documentTypographyToCssVars } from '../typographyProfileService';
import { TYPOGRAPHY_UNIT_INDENT_PX } from '../typographyMeasurementService';
import { TocBlockProjection } from './TocBlockProjection';
import tocCss from './TocBlockProjection.module.css?raw';

function flow(text: string, role: TextUnitWritingRole): TextBlockContentV1 {
  return { textflow_version: 'TextBlockContentV1', units: [{ id: 'unit', text, writing_role: role,
    indent_level: 0, order_index: 0, metadata: {}, status: 'active' }], inline_structures: [], metadata: {} };
}

function heading(id: string, text: string, role: TextUnitWritingRole): NoteBlock {
  return { id, placement_id: `p-${id}`, block_type: 'paragraph', title: null,
    content_json: { text_flow: flow(text, role) }, plain_text: text, metadata: {}, order_index: 0,
    display_overrides_json: {}, source_references: [] };
}

describe('T1 live table of contents projection', () => {
  it('renders the current hierarchy and dispatches a stable chapter identity through its supplied navigation door', () => {
    const blocks = [heading('one', '第一章', 'heading_1'), heading('two', '第二层', 'heading_2'),
      heading('three', '第三层', 'heading_3'), heading('next', '下一章', 'heading_1')];
    const before = structuredClone(blocks);
    const { agenda } = deriveChapterProjection(blocks);
    const onSelectChapter = vi.fn();
    const outerClick = vi.fn();
    const view = render(<div onClick={outerClick}><TocProjectionProvider value={{ agenda, onSelectChapter }}>
      <TocBlockProjection />
    </TocProjectionProvider></div>);
    const toc = view.getByRole('region', { name: '目录' });
    expect(within(toc).getAllByRole('button').map((button) => button.textContent))
      .toEqual(['第一章', '第二层', '第三层', '下一章']);
    expect(within(toc).getAllByRole('listitem').map((entry) => Number.parseFloat(entry.style.paddingInlineStart)))
      .toEqual([0, TYPOGRAPHY_UNIT_INDENT_PX, TYPOGRAPHY_UNIT_INDENT_PX * 2, 0]);
    fireEvent.click(within(toc).getByRole('button', { name: '第三层' }));
    expect(onSelectChapter).toHaveBeenCalledExactlyOnceWith(agenda[2]!.id);
    expect(outerClick).not.toHaveBeenCalled();
    expect(view.queryByRole('textbox')).toBeNull();
    expect(blocks).toEqual(before);
  });

  it('reflects unsaved title, hierarchy and role changes without changing the stored blocks', () => {
    const blocks = [heading('one', '原章节', 'heading_1'), heading('two', '待提升', 'paragraph')];
    const before = structuredClone(blocks);
    const first = deriveChapterProjection(blocks);
    const view = render(<TocProjectionProvider value={{ agenda: first.agenda }}><TocBlockProjection /></TocProjectionProvider>);
    expect(view.getAllByRole('listitem')).toHaveLength(1);
    const drafts = { one: flow('当前章节', 'heading_1'), two: flow('新子章节', 'heading_2') };
    const current = deriveChapterProjection(blocks, drafts);
    view.rerender(<TocProjectionProvider value={{ agenda: current.agenda }}><TocBlockProjection /></TocProjectionProvider>);
    expect(view.queryByText('原章节')).toBeNull();
    expect(view.getByText('当前章节')).toBeTruthy();
    expect(view.getByText('新子章节').closest('[role="listitem"]')?.getAttribute('data-toc-level')).toBe('2');
    expect(view.getAllByRole('listitem')).toHaveLength(2);
    const restoredBody = deriveChapterProjection(blocks, { ...drafts, two: flow('恢复正文', 'paragraph') });
    view.rerender(<TocProjectionProvider value={{ agenda: restoredBody.agenda }}><TocBlockProjection /></TocProjectionProvider>);
    expect(view.getAllByRole('listitem')).toHaveLength(1);
    expect(view.queryByText('新子章节')).toBeNull();
    expect(blocks).toEqual(before);
  });

  it('shows the empty-tree hint and gives an unnamed heading a readable label', () => {
    const view = render(<TocBlockProjection />);
    expect(view.getByText('添加章节标题后，目录会自动显示。')).toBeTruthy();
    expect(view.queryByRole('list')).toBeNull();
    const { agenda } = deriveChapterProjection([heading('empty', '', 'heading_1')]);
    view.rerender(<TocProjectionProvider value={{ agenda }}><TocBlockProjection /></TocProjectionProvider>);
    expect(view.queryByText('添加章节标题后，目录会自动显示。')).toBeNull();
    expect(view.getByText('未命名章节')).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('prints supplied current page labels without interactive controls or changing the agenda', () => {
    const { agenda } = deriveChapterProjection([heading('one', '章节', 'heading_1')]);
    const before = structuredClone(agenda);
    const onSelectChapter = vi.fn();
    const view = render(<TocProjectionProvider value={{ agenda, onSelectChapter, pageNumbers: new Map([[agenda[0]!.id, 2]]) }}>
      <TocBlockProjection print />
    </TocProjectionProvider>);
    expect(view.queryByRole('button')).toBeNull();
    expect(view.getByText('2').getAttribute('data-toc-page-number')).toBe('2');
    view.rerender(<TocProjectionProvider value={{ agenda, onSelectChapter, pageNumbers: new Map([[agenda[0]!.id, 4]]) }}>
      <TocBlockProjection print />
    </TocProjectionProvider>);
    expect(view.queryByText('2')).toBeNull();
    expect(view.getByText('4')).toBeTruthy();
    expect(onSelectChapter).not.toHaveBeenCalled();
    expect(agenda).toEqual(before);
  });

  it.each(SKIN_PRESET_IDS)('uses available skin and typography roles under %s without private visual values', (preset) => {
    const variables = { ...buildPaperSkinStyles(SKIN_PRESETS[preset]),
      ...buildSkinComponentStyles(SKIN_PRESET_COMPONENTS[preset]), ...documentTypographyToCssVars() } as Record<string, string>;
    for (const name of ['--sk-ink', '--sk-ink-muted', '--sk-accent', '--sk-title-font', '--sk-label-font',
      '--document-font-size', '--document-line-height', '--document-paragraph-spacing']) {
      expect(tocCss).toContain(`var(${name})`);
      expect(variables[name]).toBeTruthy();
    }
    expect(tocCss).not.toMatch(/#[a-f\d]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em)\b/i);
    const fontDeclarations = [...tocCss.matchAll(/font-family:\s*([^;]+);/g)].map((match) => match[1]);
    expect(fontDeclarations.every((value) => /^var\(--sk-(?:title|label)-font\)$/.test(value))).toBe(true);
  });
});
