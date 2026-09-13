import { describe, expect, it } from 'vitest';
import { buildNoteNavigationResults, type NoteNavigationSearchInput } from './noteNavigationSearch';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from './textFlowService';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockPlacementModel, PageFrameModel, PageStackBlockFragmentProjection } from './types';

function block(id: string, text: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id, placement_id: `place-${id}`, display_overrides_json: {}, block_type: 'paragraph',
    title: null, content_json: { body: text }, plain_text: text, metadata: {},
    order_index: 0, source_references: [], ...overrides,
  };
}

function page(id: string, y: number): PageFrameModel {
  return {
    id, role: 'primary_page_frame', exportable: true, x: 100, y, width: 700, height: 900,
    contentInset: { top: 30, bottom: 40, left: 50, right: 50 },
  };
}

function fragment(blockId: string, frame: PageFrameModel): PageStackBlockFragmentProjection {
  const visibleRect = { x: 150, y: frame.y + 30, width: 600, height: 100 };
  return {
    blockId, pageStackId: 'stack', pageFrameId: frame.id, pageIndex: 0, pageTotal: 2,
    fragmentIndex: 0, fragmentTotal: 1, role: 'single', clippedTop: false, clippedBottom: false,
    blockRect: visibleRect, visibleRect, pageContentRect: visibleRect,
  };
}

function placement(blockId: string, x: number, y: number): BlockPlacementModel {
  return {
    blockId, objectKind: 'note_block', placementId: `place-${blockId}`, objectId: blockId,
    canvasId: 'note-canvas', surface: 'formal_page', boundaryRole: 'inside',
    x, y, width: 20, height: 30, rotation: 0, zIndex: 0,
  };
}

function inputFor(blocks: NoteBlock[]): NoteNavigationSearchInput {
  const first = page('page-1', 0);
  const second = page('page-2', 1000);
  return {
    noteId: 'note-1', visibleBlocks: blocks,
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, pageOffsetX: 20,
    noteCanvasRuntime: {
      pageFrames: [first, second], coordinateContract: 'v2',
      blockFragmentProjections: blocks.map((item) => fragment(item.id, first)),
    },
  };
}

describe('loaded note navigation search', () => {
  it('returns every case-insensitive literal occurrence with original-case highlighted snippets', () => {
    const results = buildNoteNavigationResults(inputFor([block('a', 'Lead Cat follows cat. CAT!')]), 'cat');
    expect(results.map((result) => result.match)).toEqual(['Cat', 'cat', 'CAT']);
    expect(results[1]).toMatchObject({
      noteId: 'note-1', blockId: 'a', before: 'Lead Cat follows ', after: '. CAT!',
      frameId: 'page-1', pageNumbers: [1],
    });
    expect(new Set(results.map((result) => result.id)).size).toBe(3);
    expect(buildNoteNavigationResults(inputFor([block('a', 'x+y and xy')]), 'x+y')).toHaveLength(1);
  });

  it('reads live text and TextFlow drafts ahead of persisted text, honoring empty drafts', () => {
    const input = inputFor([block('a', 'persisted'), block('b', 'persisted')]);
    input.blockTextDrafts = { a: 'typed text' };
    input.blockTextFlowDrafts = { a: createTextBlockContentV1('older flow'), b: createTextBlockContentV1('flow text') };
    expect(buildNoteNavigationResults(input, 'text').map((result) => result.blockId)).toEqual(['a', 'b']);
    expect(buildNoteNavigationResults(input, 'persisted')).toEqual([]);
    input.blockTextDrafts = { a: '', b: '' };
    expect(buildNoteNavigationResults(input, 'text')).toEqual([]);
  });

  it('uses the existing TextFlow plain-text projection and omits deleted units', () => {
    const flow = createTextBlockContentV1('live paragraph');
    flow.units.push({ ...flow.units[0]!, id: 'removed-unit', text: 'removed paragraph', order_index: 1, status: 'deleted' });
    const input = inputFor([block('a', 'stale fallback', { content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } })]);
    expect(buildNoteNavigationResults(input, 'paragraph')).toHaveLength(1);
    expect(buildNoteNavigationResults(input, 'removed')).toEqual([]);
    expect(buildNoteNavigationResults(input, 'fallback')).toEqual([]);
  });

  it('searches displayed formula names, latex and explanations with field draft precedence', () => {
    const input = inputFor([block('formula', 'saved', {
      block_type: 'formula', content_json: { field_values: {
        latex_input: 'x=1', formula_name: 'Saved rule', explanation: 'Stored explanation',
      } },
    })]);
    expect(buildNoteNavigationResults(input, 'rule')).toHaveLength(1);
    input.blockFieldDrafts = { formula: { latex_input: 'x=2', formula_name: 'Fresh rule', explanation: 'Fresh explanation' } };
    expect(buildNoteNavigationResults(input, 'Fresh')).toHaveLength(2);
    expect(buildNoteNavigationResults(input, 'x=2')).toHaveLength(1);
    expect(buildNoteNavigationResults(input, 'Stored')).toEqual([]);
    input.blockFieldDrafts = { formula: { latex_input: '', formula_name: '', explanation: '' } };
    expect(buildNoteNavigationResults(input, 'rule')).toEqual([]);
  });

  it('uses actual page fragments for later-page blocks and projects their jump rectangles', () => {
    const input = inputFor([block('later', 'find me')]);
    const later = input.noteCanvasRuntime.pageFrames[1]!;
    input.noteCanvasRuntime.blockFragmentProjections = [fragment('later', later)];
    expect(buildNoteNavigationResults(input, 'find')[0]).toMatchObject({
      frameId: 'page-2', pageNumbers: [2], rect: { x: 20, y: 1030, width: 600, height: 100 },
    });
  });

  it('reports all real pages of a crossing block without duplicating each occurrence or guessing character pages', () => {
    const input = inputFor([block('crossing', 'one match here')]);
    input.noteCanvasRuntime.blockFragmentProjections = [
      fragment('crossing', input.noteCanvasRuntime.pageFrames[1]!),
      fragment('crossing', input.noteCanvasRuntime.pageFrames[0]!),
    ];
    const results = buildNoteNavigationResults(input, 'match');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ frameId: 'page-1', pageNumbers: [1, 2], rect: { x: 20, y: 30 } });
  });

  it('searches current title and description drafts with a separate header destination', () => {
    const input = inputFor([block('a', 'Body text')]);
    input.paperHeader = { titleDraft: 'Fresh cover', descriptionDraft: 'Fresh description' };
    const results = buildNoteNavigationResults(input, 'Fresh');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      target: 'header', blockId: null, noteId: 'note-1', frameId: 'page-1', pageNumbers: [1],
      match: 'Fresh', after: ' cover\nFresh description',
    });
    expect(buildNoteNavigationResults(input, 'Body')[0]).toMatchObject({ target: 'block', blockId: 'a' });
    input.paperHeader = { titleDraft: '', descriptionDraft: '' };
    expect(buildNoteNavigationResults(input, 'Fresh')).toEqual([]);
  });

  it('includes a loaded paper-margin block without content fragments using its world placement', () => {
    const input = inputFor([block('margin', 'margin note'), block('outside', 'margin note'), block('tray', 'margin note')]);
    input.noteCanvasRuntime.blockFragmentProjections = [];
    input.noteCanvasRuntime.blockPlacements = [
      placement('margin', 110, 1040), placement('outside', 810, 1040),
      { ...placement('tray', 110, 1040), surface: 'tray' },
    ];
    const results = buildNoteNavigationResults(input, 'note');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      target: 'block', blockId: 'margin', frameId: 'page-2', pageNumbers: [2],
      rect: { x: -20, y: 1040, width: 20, height: 30 },
    });
  });

  it('searches only loaded paper blocks and carries no results into another note', () => {
    const input = inputFor([
      block('shown', 'needle'), block('tray', 'needle', { canvas_layout: { surface: 'tray' } }),
      block('off-paper', 'needle'), block('reference', 'needle', { block_type: 'item_ref' }),
    ]);
    input.noteCanvasRuntime.blockFragmentProjections = input.noteCanvasRuntime.blockFragmentProjections
      .filter((item) => item.blockId !== 'off-paper');
    input.blockTextDrafts = { 'not-loaded': 'needle' };
    input.noteCanvasRuntime.blockFragmentProjections.push(fragment('not-loaded', input.noteCanvasRuntime.pageFrames[0]!));
    expect(buildNoteNavigationResults(input, 'needle').map((result) => result.blockId)).toEqual(['shown']);
    const other = { ...inputFor([block('other', 'different body')]), noteId: 'note-2' };
    expect(buildNoteNavigationResults(other, 'needle')).toEqual([]);
  });

  it('clears results for empty input and returns no matches without changing loaded input', () => {
    const input = inputFor([block('a', 'readable body')]);
    const before = JSON.stringify(input);
    expect(buildNoteNavigationResults(input, 'body')).toHaveLength(1);
    expect(buildNoteNavigationResults(input, '')).toEqual([]);
    expect(buildNoteNavigationResults(input, '  \n  ')).toEqual([]);
    expect(buildNoteNavigationResults(input, 'absent')).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
  });
});
