import { useId, useState, type KeyboardEvent } from 'react';
import { deriveChapterProjection, type ChapterNode, type ChapterProjection } from '../chapterProjectionService';
import type { NoteNavigationHeadingAnchor } from '../hooks/useNoteNavigationController';
import { projectPageFrameToReadingSurface } from '../pageFramePresentationService';
import { readStoredLayout } from '../placementService';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import './NoteNavigationHeadings.css';

type NavigationHeadingInput = Pick<NoteWritingSurfaceLayerProps,
  'visibleBlocks' | 'blockTextFlowDrafts' | 'noteCanvasRuntime' | 'pageOffsetX' | 'chapterPresentation'>;

/** The tree has no pages. Cover residents are excluded before deriving its content structure. */
export function chapterProjectionForNavigation(input: NavigationHeadingInput): ChapterProjection {
  if (input.chapterPresentation) return input.chapterPresentation.projection;
  const coverFrames = new Set(input.noteCanvasRuntime.pageFrameExtensions
    ?.filter((frame) => frame.isCover).map((frame) => frame.frameId));
  const excluded = new Set(input.visibleBlocks.filter((block) => {
    const layout = readStoredLayout(block);
    return layout?.surface === 'tray' || coverFrames.has(layout?.frame_id || '');
  }).map((block) => block.id));
  return deriveChapterProjection(input.visibleBlocks, input.blockTextFlowDrafts, excluded);
}

/** Page coordinates belong to this UI adapter, not to the shared chapter projection. */
export function chapterNavigationAnchors(
  projection: ChapterProjection,
  input: NavigationHeadingInput,
  offsetByFrameId: ReadonlyMap<string, number>,
): NoteNavigationHeadingAnchor[] {
  const runtime = input.noteCanvasRuntime;
  const frames = new Map(runtime.pageFrames.map((frame) => [frame.id, frame]));
  const coverFrames = new Set(runtime.pageFrameExtensions?.filter((frame) => frame.isCover).map((frame) => frame.frameId));
  const firstFragments = new Map<string, (typeof runtime.blockFragmentProjections)[number]>();
  for (const fragment of runtime.blockFragmentProjections) {
    if (coverFrames.has(fragment.pageFrameId)) continue;
    const previous = firstFragments.get(fragment.blockId);
    // A1's first projected fragment owns the chapter anchor, even after repagination.
    if (!previous || fragment.fragmentIndex < previous.fragmentIndex) firstFragments.set(fragment.blockId, fragment);
  }
  return projection.chapters.flatMap((chapter) => {
    const fragment = firstFragments.get(chapter.blockId);
    if (!fragment) return [];
    const frame = frames.get(fragment.pageFrameId);
    if (!frame) return [];
    const readingFrame = projectPageFrameToReadingSurface(frame, runtime.coordinateContract, input.pageOffsetX);
    return [{ chapterId: chapter.id, blockId: chapter.blockId, frameId: frame.id,
      rect: { ...fragment.visibleRect, x: fragment.visibleRect.x + readingFrame.x - frame.x,
        y: fragment.visibleRect.y + (offsetByFrameId.get(frame.id) || 0) } }];
  });
}

export interface NoteNavigationHeadingsProps {
  projection: ChapterProjection;
  currentChapterId?: string | null;
  numbered?: boolean;
  onToggleNumbering?: () => void;
  onSelectChapter?: (chapterId: string) => void;
}

export function NoteNavigationHeadings({ projection, currentChapterId, numbered = true,
  onToggleNumbering, onSelectChapter }: NoteNavigationHeadingsProps) {
  const treeId = useId();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusId = projection.chapters.some((chapter) => chapter.id === focusedId) ? focusedId
    : currentChapterId || projection.chapters[0]?.id;
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, chapter: ChapterNode) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = projection.chapters.findIndex((candidate) => candidate.id === chapter.id);
    const next = event.key === 'Home' ? projection.chapters[0]
      : event.key === 'End' ? projection.chapters[projection.chapters.length - 1]
        : event.key === 'ArrowLeft' ? projection.chapters.find((candidate) => candidate.id === chapter.parentId)
          : event.key === 'ArrowRight' ? chapter.children[0]
            : projection.chapters[index + (event.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    setFocusedId(next.id);
    const tree = event.currentTarget.closest('[role="tree"]');
    tree?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]').forEach((item) => {
      if (item.dataset.chapterId === next.id) item.focus({ preventScroll: true });
    });
  };
  const renderChapters = (chapters: readonly ChapterNode[], depth: number) => chapters.map((chapter, index) => <li key={chapter.id} role="none">
    <button type="button" role="treeitem" className="noteNavigationHeading" data-chapter-id={chapter.id}
      aria-label={chapter.title || 'Untitled heading'}
      aria-level={depth} aria-current={currentChapterId === chapter.id ? 'location' : undefined}
      aria-expanded={chapter.children.length ? true : undefined} aria-posinset={index + 1}
      aria-owns={chapter.children.length ? `${treeId}-${chapter.id}` : undefined}
      aria-setsize={chapters.length} tabIndex={focusId === chapter.id ? 0 : -1}
      onMouseDown={(event) => event.preventDefault()}
      onFocus={() => setFocusedId(chapter.id)} onKeyDown={(event) => moveFocus(event, chapter)}
      onClick={() => onSelectChapter?.(chapter.id)}>
      {numbered && <span className="noteNavigationHeadingNumber" aria-hidden="true">{chapter.number.join('.')}</span>}
      <span>{chapter.title || 'Untitled heading'}</span>
    </button>
    {chapter.children.length > 0 && <ol role="group" id={`${treeId}-${chapter.id}`}>{renderChapters(chapter.children, depth + 1)}</ol>}
  </li>);
  return <div className="noteNavigationHeadings">
    {onToggleNumbering && <button type="button" className="noteNavigationHeadingNumbers" aria-pressed={numbered}
      onMouseDown={(event) => event.preventDefault()} onClick={onToggleNumbering}>Chapter numbers</button>}
    {projection.chapters.length === 0
      ? <p className="noteNavigationEmpty">Add a heading to start the chapter tree.</p>
      : <ol className="noteNavigationHeadingTree" role="tree" aria-label="Heading tree">{renderChapters(projection.roots, 1)}</ol>}
  </div>;
}
