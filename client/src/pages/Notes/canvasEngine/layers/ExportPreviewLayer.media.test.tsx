import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildExportPreviewModel } from '../exportPreviewService';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import type { NoteBlock } from '../runtimeDataTypes';
import { ExportPreviewLayer } from './ExportPreviewLayer';

vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));

describe('ExportPreviewLayer media fallback', () => {
  it('includes an exact-sized labelled placeholder and makes no asset requests', () => {
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
    const placeholders = screen.getAllByRole('img', { name: 'Image', hidden: true });
    expect(placeholders.length).toBeGreaterThan(0);
    for (const placeholder of placeholders) {
      expect(placeholder.style.width).toBe('300px');
      expect(placeholder.style.height).toBe('30px');
      expect(placeholder.textContent).toBe('Image');
    }
    expect(loadCanvasImageAssetBlobUrl).not.toHaveBeenCalled();
  });
});
