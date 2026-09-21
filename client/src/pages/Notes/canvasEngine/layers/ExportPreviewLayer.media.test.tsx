import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildExportPreviewModel } from '../exportPreviewService';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import type { NoteBlock } from '../runtimeDataTypes';
import { ExportPreviewLayer } from './ExportPreviewLayer';

vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('ExportPreviewLayer media projection', () => {
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
