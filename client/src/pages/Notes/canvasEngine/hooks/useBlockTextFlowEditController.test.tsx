import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { TextBlockContentV1 } from '../runtimeDataTypes';
import { useBlockTextFlowEditController } from './useBlockTextFlowEditController';

describe('live board ranges on the annotation edit controller', () => {
  it('rebases ordinary input and visibly degrades a split even with no annotations', async () => {
    const before = createTextBlockContentV1('alpha beta gamma');
    const first = { ...before, units: [{ ...before.units[0], text: 'prefix alpha beta gamma' }] };
    const range: BoardTextRangeV1 = {
      id: 'range', note_id: 'note', board_id: 'board', block_id: 'block',
      text_flow_id: 'textflow-block', text_unit_id: before.units[0].id,
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
      at: '', created_at: '', updated_at: '',
    };
    const session = createBoardTextRangeEditSession('note', vi.fn());
    session.hydrate([range]);
    const saveAnnotations = vi.fn();
    const hook = renderHook(() => {
      const [drafts, setDrafts] = useState<Record<string, TextBlockContentV1>>({});
      return useBlockTextFlowEditController({
        annotationTruths: [], blockTextFlowDrafts: drafts, setBlockTextFlowDrafts: setDrafts,
        saveAnnotationTruths: saveAnnotations, rebaseBoardTextRanges: session.rebase,
      });
    });
    const block = { id: 'block', content_json: { [TEXT_FLOW_CONTENT_KEY]: before } };
    await act(async () => { await hook.result.current(block, first); });
    expect(session.capture('block').ranges[0]).toMatchObject({ start_offset: 13, end_offset: 17, excerpt: 'beta' });
    const split = { ...first, units: [{ ...first.units[0], text: 'prefix alpha be' }, { ...first.units[0], id: 'split', text: 'ta gamma' }] };
    await act(async () => { await hook.result.current(block, split); });
    expect(session.capture('block').ranges[0]).toMatchObject({
      status: 'drifted', excerpt: 'beta', pre_edit_offsets: { start_offset: 13, end_offset: 17 },
    });
    expect(saveAnnotations).not.toHaveBeenCalled();
  });
});
