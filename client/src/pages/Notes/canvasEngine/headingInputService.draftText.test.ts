import { describe, expect, it } from 'vitest';
import { headingRequestForDraftText } from './headingInputService';
import { draftTextFlowFromText } from './hooks/useDraftBlockController';

describe('a heading typed before the block existed', () => {
  it('becomes a heading with body after it, the caret still where the reader is', () => {
    const request = headingRequestForDraftText(draftTextFlowFromText('Intro\n# Title\nBody'), { unitId: 'tu-3', offset: 2 });
    const units = request!.nextTextFlow.units.map((unit) => [unit.writing_role, unit.text]);
    expect(units).toEqual([['paragraph', 'Intro'], ['heading_1', 'Title'], ['paragraph', 'Body']]);
    expect(request!.focus).toEqual({ unitId: 'tu-3', caret: 2 });
  });

  it('moves the caret past the marker when it is on the heading itself', () => {
    const request = headingRequestForDraftText(draftTextFlowFromText('Intro\n# Title'), { unitId: 'tu-2', offset: 7 });
    expect(request!.nextTextFlow.units.find((unit) => unit.id === 'tu-2')?.text).toBe('Title');
    expect(request!.focus).toEqual({ unitId: 'tu-2', caret: 5 });
  });

  it('item 5: undo puts the caret back where the reader was in the draft text', () => {
    const request = headingRequestForDraftText(draftTextFlowFromText('Intro\n# Title'), { unitId: 'tu-2', offset: 7 });
    expect(request!.focus).toEqual({ unitId: 'tu-2', caret: 5 });
    expect(request!.beforeCaret).toBe(7);
  });

  it('asks for nothing when no line is a heading', () => {
    expect(headingRequestForDraftText(draftTextFlowFromText('Intro\nBody #1'), { unitId: 'tu-1', offset: 0 })).toBeNull();
  });
});
