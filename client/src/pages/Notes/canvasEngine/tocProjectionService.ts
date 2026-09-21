import type { ChapterAgendaEntry } from './chapterProjectionService';
import type { DocumentPageFlowPlan } from './documentPageFlowService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel, PageStackBlockFragmentProjection } from './types';
import { getPagePrintSlices } from './pagePrintProjectionService';

/** Page labels are disposable consumers of the current plan, never block content. */
export function tocPageNumbers(
  agenda: readonly ChapterAgendaEntry[],
  plan: DocumentPageFlowPlan | undefined,
  pageFrames: readonly PageFrameModel[],
  coverFrameIds: ReadonlySet<string> = new Set(),
  layouts: Readonly<Record<string, Partial<BlockBoxLayout>>> = {},
  continuousWeb = false,
  blockFragments: readonly PageStackBlockFragmentProjection[] = [],
): ReadonlyMap<string, number> {
  const frames = (plan?.collection.pageFrames ?? pageFrames).filter((frame) => !coverFrameIds.has(frame.id));
  let pageNumber = 1;
  const numbers = new Map(frames.map((frame) => {
    const slices = getPagePrintSlices(frame, continuousWeb);
    const first = pageNumber;
    pageNumber += slices.length;
    return [frame.id, { frame, first, slices }] as const;
  }));
  const firstFragments = new Map<string, NonNullable<DocumentPageFlowPlan['fragments'][number]>>();
  for (const fragment of plan?.fragments ?? []) {
    const previous = firstFragments.get(fragment.blockId);
    if (!previous || fragment.fragmentIndex < previous.fragmentIndex) firstFragments.set(fragment.blockId, fragment);
  }
  return new Map(agenda.flatMap((entry) => {
    const flow = firstFragments.get(entry.blockId);
    const projected = blockFragments.filter((fragment) => fragment.blockId === entry.blockId)
      .reduce<PageStackBlockFragmentProjection | undefined>((first, fragment) => !first || fragment.fragmentIndex < first.fragmentIndex ? fragment : first, undefined);
    const frameId = flow?.frameId ?? projected?.pageFrameId ?? layouts[entry.blockId]?.frame_id;
    const page = frameId ? numbers.get(frameId) : undefined;
    if (!page) return [];
    const y = flow ? flow.layout.y + page.frame.contentInset.top
      : projected ? projected.visibleRect.y - page.frame.y : undefined;
    const slice = y === undefined ? undefined : page.slices.find((candidate) => y < candidate.offsetY + candidate.height);
    return [[entry.id, page.first + (slice?.index ?? 0)] as const];
  }));
}
