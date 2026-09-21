import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { useDocumentTabsStore } from '@/stores/documentTabsStore';
import { InlineLinkProvider } from './InlineLinkProvider';
import { appendInlineLink, type InlineLinkTarget } from './inlineLinkService';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from './textFlowService';
import { deriveChapterProjection } from './chapterProjectionService';
import { TextBlockProjection, type TextBlockProjectionProps } from './blocks/TextBlockProjection';
import { PaginatedTextBlockProjection } from './blocks/PaginatedTextBlockProjection';
import type { NoteBlock } from './runtimeDataTypes';
import type { PositionedPageFlowFragment } from './paginationEditingService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); useDocumentTabsStore.getState().reset(); });

const heading = createTextBlockContentV1('Chapter', 'heading_1');
const targetBlock = { id: 'target', placement_id: 'target-place', block_type: 'paragraph', title: 'Chapter',
  content_json: { [TEXT_FLOW_CONTENT_KEY]: heading }, plain_text: 'Chapter', metadata: {}, order_index: 0,
  source_references: [], display_overrides_json: {} } as NoteBlock;
const targets: InlineLinkTarget[] = [{ target_kind: 'heading', block_id: 'target', unit_id: 'tu-1' },
  { target_kind: 'block', block_id: 'target' }, { target_kind: 'note', note_id: 'next' }];
function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function fixture(target: InlineLinkTarget, paginated = false) {
  const base = createTextBlockContentV1('A linked word.');
  const flow = appendInlineLink(base, { blockId: 'body', textFlowId: 'textflow-body', textUnitId: 'tu-1',
    startOffset: 2, endOffset: 8, text: base.units[0].text }, target, 'link')!;
  const block = { ...targetBlock, id: 'body', content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, plain_text: base.units[0].text };
  const navigateChapter = vi.fn(), navigateBlock = vi.fn();
  const callbacks = { onFocused: vi.fn(), onAnnotationSelect: vi.fn(), onAnnotationContextMenu: vi.fn(),
    onTextUnitSelection: vi.fn(), onTextUnitContextMenu: vi.fn(), onTextChange: vi.fn(), onTextFlowChange: vi.fn(),
    onSave: vi.fn().mockResolvedValue({ status: 'saved' }), onKeyDown: vi.fn() };
  const props: TextBlockProjectionProps = { blockId: 'body', readOnly: false, text: base.units[0].text, textFlow: flow,
    presentationKind: 'paragraph', annotations: [], selectedAnnotationIds: [], showLabelOverlay: false,
    textareaRef: null, ...callbacks };
  const fragments: PositionedPageFlowFragment[] = [0, 5].map((start, index) => ({ id: `frag-${index}`, blockId: 'body', frameId: `page-${index}`,
    startFrameId: 'page-0', fragmentIndex: index, isFirst: index === 0, isLast: index === 1, left: 0, top: index * 100,
    textRange: { start, end: index === 0 ? 5 : base.units[0].text.length }, lineRange: { start: index, end: index + 1 },
    layout: { x: 0, y: 0, width: 300, height: 44, surface: 'formal_page' },
    lines: [{ startOffset: start, endOffset: index === 0 ? 5 : base.units[0].text.length, heightPx: 28, lineHeightPx: 22, widthPx: 80 }] }));
  const renderView = (blocks: NoteBlock[] = [targetBlock, block], print = false) => <MemoryRouter initialEntries={['/notes/current']}>
    <Location /><InlineLinkProvider noteId="current" projectId="project" blocks={blocks}
      drafts={{}} chapters={deriveChapterProjection(blocks)} onSelectChapter={navigateChapter} onSelectBlock={navigateBlock}>
      {paginated ? <PaginatedTextBlockProjection {...props} inlineLinkPrint={print} fragments={fragments} typography={DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE} />
        : <TextBlockProjection {...props} inlineLinkPrint={print} />}
    </InlineLinkProvider></MemoryRouter>;
  const view = render(renderView());
  return { ...view, renderView, callbacks, navigateChapter, navigateBlock, flow, block };
}
describe('T6 rendered inline navigation and degradation', () => {
  it.each(targets)('clicks $target_kind through the existing navigation host', async (target) => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 'next', title: 'Next note', course_id: 'project', status: 'active' }] });
    const f = fixture(target);
    fireEvent.click(await screen.findByRole('link', { name: 'linked' }));
    if (target.target_kind === 'heading') expect(f.navigateChapter).toHaveBeenCalledWith(deriveChapterProjection([targetBlock]).agenda[0].id);
    if (target.target_kind === 'block') expect(f.navigateBlock).toHaveBeenCalledWith('target');
    if (target.target_kind === 'note') {
      await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/notes/next'));
      expect(useDocumentTabsStore.getState().tabs[0]).toMatchObject({ id: 'next', kind: 'note', projectId: 'project' });
      expect(api.get).toHaveBeenLastCalledWith('/notes', { params: { course_id: 'project', status: 'active' } });
    }
    expect(f.callbacks.onTextFlowChange).not.toHaveBeenCalled();
  });
  it.each(targets)('retains a deleted $target_kind target as inert marked text and preserves records', async (target) => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    const f = fixture(target);
    f.rerender(f.renderView([f.block]));
    await waitFor(() => expect(f.container.querySelector('[data-inline-link-degraded="target"]')).not.toBeNull());
    expect(screen.queryByRole('link')).toBeNull();
    expect(f.flow.inline_structures).toHaveLength(1);
    expect(f.container.querySelector('textarea')?.value).toBe('A linked word.');
    expect(f.callbacks.onTextFlowChange).not.toHaveBeenCalled();
  });
  it('rechecks a note deleted after rendering and does not open its tab', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ id: 'next', title: 'Next', course_id: 'project', status: 'active' }] })
      .mockResolvedValue({ data: [] });
    const f = fixture(targets[2]);
    fireEvent.click(await screen.findByRole('link'));
    await waitFor(() => expect(f.container.querySelector('[data-inline-link-degraded="target"]')).not.toBeNull());
    expect(useDocumentTabsStore.getState().tabs).toEqual([]);
    expect(screen.getByTestId('location').textContent).toBe('/notes/current');
  });
  it('clips the same record across page slices and prints plain text without link nodes', () => {
    const f = fixture(targets[0], true);
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['lin', 'ked']);
    links.forEach((link) => fireEvent.click(link));
    expect(f.navigateChapter).toHaveBeenCalledTimes(2);
    f.rerender(f.renderView(undefined, true));
    expect(screen.queryByRole('link')).toBeNull();
    expect(f.container.querySelector('[data-inline-link-layer]')).toBeNull();
    expect([...f.container.querySelectorAll('textarea')].map((node) => node.value).join('')).toBe('A linked word.');
  });
  it('keeps a null B8 anchor as evidence and marks it without reconstructing the old range', () => {
    const f = fixture(targets[0]);
    f.flow.inline_structures[0].anchor_range = null;
    f.rerender(f.renderView());
    expect(screen.queryByRole('link')).toBeNull();
    expect(f.container.querySelector('[data-inline-link-degraded="anchor"]')).not.toBeNull();
    expect(f.flow.inline_structures[0].anchor_text).toBe('linked');
  });
  it('keeps failed list reads inert and recovers when the existing focus refresh succeeds', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: [
      { id: 'next', title: 'Next', course_id: 'project', status: 'active' },
    ] });
    const f = fixture(targets[2]);
    await waitFor(() => expect(f.container.querySelector('[title="链接目标暂不可用"]')).not.toBeNull());
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(await screen.findByRole('link')).toBeTruthy();
  });
});
