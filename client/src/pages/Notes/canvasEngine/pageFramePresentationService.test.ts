import { describe, expect, it } from 'vitest';
import { createPageGapPresentation, projectPageFrameToReadingSurface } from './pageFramePresentationService';
import { resolveScreenRect, screenLayoutToLocal } from './placementContractService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

const frame = (id: string, y: number, height = 600): PageFrameModel => ({
  id, role: 'secondary_page_frame', x: 120, y, width: 520, height, exportable: true,
  templateId: 'a4_portrait', pageSize: 'Custom', contentInset: { left: 40, right: 40, top: 35, bottom: 45 },
});

describe('A2 reading-only page gap projection', () => {
  it('removes only positive inter-page gaps for unequal pages and preserves the originals', () => {
    const frames = [frame('p1', 20), frame('p2', 700, 400), frame('p3', 1250)];
    const before = structuredClone(frames);
    const folded = createPageGapPresentation(frames, true);
    expect(folded.pageFrames.map((page) => page.y)).toEqual([20, 620, 1020]);
    expect(folded.gaps.map((gap) => [gap.y, gap.height])).toEqual([[620, 0], [1020, 0]]);
    folded.pageFrames.forEach((page, index) => {
      expect({ ...page, y: frames[index].y }).toEqual(frames[index]);
      expect(page.contentInset).toBe(frames[index].contentInset);
    });
    expect(frames).toEqual(before);
    expect(createPageGapPresentation(frames, false).pageFrames).toEqual(before);
    expect(createPageGapPresentation(frames, false).gaps.map((gap) => gap.height)).toEqual([80, 150]);
  });

  it('round-trips a second-page manual box and pointer y without changing local coordinates or walls', () => {
    const frames = [frame('p1', 0), frame('p2', 680)];
    const folded = createPageGapPresentation(frames, true);
    const local: BlockBoxLayout = { x: 22, y: 60, width: 240, height: 90, width_mode: 'manual',
      coordinate_space: 'page_frame_local', frame_id: 'p2', surface: 'formal_page' };
    const screen = resolveScreenRect(local, folded.pageFrames[1], 'v2');
    expect(screen.y).toBe(695);
    expect(folded.toWorldY(screen.y)).toBe(775);
    expect(folded.toDisplayY(775)).toBe(screen.y);
    expect(folded.toDisplayY(640)).toBe(600);
    expect(screenLayoutToLocal({ ...local, ...screen }, folded.pageFrames, 'v2')).toMatchObject(local);
    expect(projectPageFrameToReadingSurface(folded.pageFrames[1], 'v2').y).toBe(600);
  });

  it('has no folding presentation for a Web long page', () => {
    const web = { ...frame('web', 0, 7000), templateId: 'screen_note' as const };
    const folded = createPageGapPresentation([web], true);
    expect(folded.enabled).toBe(false);
    expect(folded.pageFrames[0]).toBe(web);
    expect(folded.gaps).toEqual([]);
    expect(folded.toWorldY(5100)).toBe(5100);
  });

  it('does not manufacture negative gaps or alter overlapping frames', () => {
    const frames = [frame('p1', 0), frame('p2', 500)];
    const folded = createPageGapPresentation(frames, true);
    expect(folded.pageFrames).toEqual(frames);
    expect(folded.gaps).toEqual([]);
  });
});
