import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockSourceReferenceLayer } from './BlockSourceReferenceLayer';
import type { SourceAnchor } from '../runtimeDataTypes';
import { PAGINATED_SOURCE_REFERENCE_HEIGHT_PX, pageFlowSourceReferenceHeight } from '../pageFlowSourceReferenceService';

afterEach(cleanup);

describe('bounded first-fragment source references', () => {
  it('retains every source action while sharing its fixed strip budget with pagination', () => {
    const sources = Array.from({ length: 18 }, (_, index) => ({ id: `source-${index}`, source_page_start: index + 1 }));
    const anchors: Record<string, SourceAnchor> = Object.fromEntries(sources.map((source, index) => [source.id, {
      id: `anchor-${index}`, source_snapshot_id: 'snapshot', source_snapshot_page_id: null, anchor_kind: 'page',
      page_start: index + 1, page_end: index + 1, metadata: {},
    }]));
    const onViewSource = vi.fn();
    const view = render(<BlockSourceReferenceLayer sourceReferences={sources} anchorsBySourceRef={anchors} sourceJumpBusy="anchor-3" onViewSource={onViewSource} paginated />);
    const strip = view.getByRole('region', { name: 'Source references' });
    expect(Number.parseFloat(strip.style.height) + Number.parseFloat(strip.style.marginTop)).toBe(PAGINATED_SOURCE_REFERENCE_HEIGHT_PX);
    expect(pageFlowSourceReferenceHeight(sources.length)).toBe(PAGINATED_SOURCE_REFERENCE_HEIGHT_PX);
    expect(strip.tabIndex).toBe(0);
    const actions = view.getAllByRole('button', { name: 'View' });
    expect(actions).toHaveLength(18);
    expect((actions[3] as HTMLButtonElement).disabled).toBe(true);
    for (const [index, action] of actions.entries()) if (index !== 3) fireEvent.click(action);
    expect(onViewSource.mock.calls.map(([id]) => id)).toEqual(sources.flatMap((_source, index) => index === 3 ? [] : [`anchor-${index}`]));
  });
  it('keeps legacy wrapping geometry and no-source behavior unchanged', () => {
    const view = render(<BlockSourceReferenceLayer sourceReferences={[{ id: 'source', source_page_start: 1 }]} anchorsBySourceRef={{}} sourceJumpBusy={null} onViewSource={vi.fn()} />);
    expect(view.container.firstElementChild?.getAttribute('style')).toBeNull();
    expect(view.container.querySelector('[data-page-flow-sources]')).toBeNull();
    view.rerender(<BlockSourceReferenceLayer sourceReferences={[]} anchorsBySourceRef={{}} sourceJumpBusy={null} onViewSource={vi.fn()} paginated />);
    expect(view.container.firstElementChild).toBeNull(); expect(pageFlowSourceReferenceHeight(0)).toBe(0);
  });
});
