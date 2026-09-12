import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSurfaceModePolicy } from '../modePolicyService';
import { createNotePagePresetSeed } from '../notePagePresetService';
import type { NoteBlock } from '../runtimeDataTypes';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { PageFrameCollectionModel } from '../types';
import { useRuntimeLayoutModelController } from './useRuntimeLayoutModelController';

describe('new Web note content width after loading', () => {
  it('uses the loaded frame walls before any resize event, including subsequent wall changes, without changing legacy sizing', () => {
    const collection = createNotePagePresetSeed('screen_note');
    const block: NoteBlock = {
      id: 'body', placement_id: 'body-placement', display_overrides_json: {},
      canvas_layout: { x: 0, y: 0, width: 760, height: 72, coordinate_space: 'page_frame_local',
        frame_id: collection.primaryFrameId, surface: 'formal_page' },
      block_type: 'text', title: null, content_json: { body: 'Loaded Web text' }, plain_text: 'Loaded Web text',
      metadata: {}, order_index: 0, source_references: [],
    };
    const persistBlockLayout = vi.fn();
    function Host({ loaded = false, preset, frames }: {
      loaded?: boolean; preset?: string; frames?: PageFrameCollectionModel;
    }) {
      const blockListRef = useRef<HTMLDivElement>(null);
      const model = useRuntimeLayoutModelController({
        notePagePreset: loaded ? preset : undefined, coordinateContract: 'v2', blockListRef,
        blocks: loaded ? [block] : [], sortedBlocks: loaded ? [block] : [], layoutDrafts: {},
        documentTypographyProfile: createDefaultDocumentTypographyProfile(), pageOffsetX: 84,
        pageFrameCollection: loaded ? frames! : null, persistBlockLayout,
        surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page'),
      });
      if (!loaded) return <span>Loading...</span>;
      return <div ref={blockListRef}>
        <output data-testid="widths">{JSON.stringify({ content: model.contentWidth,
          block: model.blockLayouts.body.width, draft: model.defaultDraftLayout.width })}</output>
      </div>;
    }
    const { rerender } = render(<Host />);
    expect(screen.getByText('Loading...')).toBeTruthy();
    // The ref was null on initial mount. Loading inserts the editor without a
    // browser resize, matching the production NoteCanvasRuntime loading shell.
    rerender(<Host loaded preset="screen_note" frames={collection} />);
    expect(JSON.parse(screen.getByTestId('widths').textContent!)).toEqual({ content: 992, block: 992, draft: 992 });
    const narrowed = structuredClone(collection);
    narrowed.pageFrames[0].contentInset.left = 96;
    rerender(<Host loaded preset="screen_note" frames={narrowed} />);
    expect(JSON.parse(screen.getByTestId('widths').textContent!)).toEqual({ content: 960, block: 960, draft: 960 });
    rerender(<Host loaded preset="flow" frames={collection} />);
    expect(JSON.parse(screen.getByTestId('widths').textContent!)).toEqual({ content: 760, block: 760, draft: 760 });
    expect(collection.pageFrames[0]).toMatchObject({ width: 1120, height: 720,
      contentInset: { left: 64, right: 64 } });
    expect(block.canvas_layout?.width).toBe(760);
    expect(persistBlockLayout).not.toHaveBeenCalled();
  });
});
