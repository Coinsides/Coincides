import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildExportPreviewModel } from '../exportPreviewService';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import type { NoteBlock } from '../runtimeDataTypes';
import { ExportPreviewLayer } from './ExportPreviewLayer';
import { createTextBlockContentV1 } from '../textFlowService';
import type { InlineLinkTarget } from '../inlineLinkService';

vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('ExportPreviewLayer media projection', () => {
  it('T6 exports all three link targets and degraded anchors as the identical plain-text markup', () => {
    const flow = createTextBlockContentV1('Heading Block Note Dangling');
    const block: NoteBlock = { id: 'export-text', placement_id: 'placement-text', block_type: 'text', title: null,
      plain_text: flow.units[0].text, content_json: { text_flow: flow }, order_index: 0, metadata: {},
      display_overrides_json: {}, canvas_layout: null, source_references: [] };
    const layout = { [block.id]: { x: 0, y: 40, width: 300, height: 40, width_mode: 'manual' as const, surface: 'formal_page' as const } };
    const noop = vi.fn();
    const projection = () => <ExportPreviewLayer preview={buildExportPreviewModel([block], layout)}
      showBlockTypes={false} showAIVisibility={false} showExportStatus={false} showLabelOverlay={false}
      onToggleBlockTypes={noop} onToggleAIVisibility={noop} onToggleExportStatus={noop} onToggleLabelOverlay={noop} onClose={noop} />;
    const view = render(projection());
    const plain = view.container.innerHTML;
    const targets: InlineLinkTarget[] = [{ target_kind: 'heading', block_id: 'heading', unit_id: 'unit' },
      { target_kind: 'block', block_id: 'block' }, { target_kind: 'note', note_id: 'note' }, { target_kind: 'block', block_id: 'deleted' }];
    flow.inline_structures = targets.map((field_values, index) => ({ id: `export-link-${index}`,
      parent_text_unit_id: flow.units[0].id, semantic_kind: 'inline_link', status: 'active', metadata: {}, field_values,
      anchor_text: ['Heading', 'Block', 'Note', 'Dangling'][index],
      anchor_range: index === 3 ? null : [{ start: 0, end: 7 }, { start: 8, end: 13 }, { start: 14, end: 18 }][index] }));
    view.rerender(projection());
    expect(view.container.innerHTML).toBe(plain);
    expect(view.container.textContent).toContain(flow.units[0].text);
    expect(view.container.querySelector('a, [role="link"], [data-inline-link]')).toBeNull();
  });

  it('includes the real image in its exact stored rectangle and shares the read across groups', async () => {
    vi.mocked(loadCanvasImageAssetBlobUrl).mockReset().mockResolvedValue('blob:export-media');
    vi.stubGlobal('URL', class extends URL { static revokeObjectURL = vi.fn(); });
    const block: NoteBlock = { id: 'export-media', placement_id: 'placement-export-media', block_type: 'media', title: null, plain_text: '', content_json: {},
      order_index: 0, metadata: { media: { asset_id: 'asset-export', naturalWidth: 300, naturalHeight: 30 } },
      display_overrides_json: {}, canvas_layout: null, source_references: [] };
    const preview = buildExportPreviewModel([block], { [block.id]: {
      x: 0, y: 40, width: 300, height: 30, width_mode: 'manual', surface: 'formal_page',
    } });
    const noop = vi.fn();
    render(<ExportPreviewLayer preview={preview} showBlockTypes={false} showAIVisibility={false}
      showExportStatus={false} showLabelOverlay={false} onToggleBlockTypes={noop} onToggleAIVisibility={noop}
      onToggleExportStatus={noop} onToggleLabelOverlay={noop} onClose={noop} />);
    await waitFor(() => expect(screen.getAllByRole('img', { name: 'Image', hidden: true }).length).toBeGreaterThan(0));
    const images = screen.getAllByRole('img', { name: 'Image', hidden: true });
    for (const image of images) {
      expect(image.parentElement?.style.width).toBe('300px');
      expect(image.parentElement?.style.height).toBe('30px');
      expect(image.getAttribute('src')).toBe('blob:export-media');
    }
    expect(document.querySelector('[data-media-block-placeholder]')).toBeNull();
    expect(loadCanvasImageAssetBlobUrl).toHaveBeenCalledExactlyOnceWith('asset-export');
  });
});
