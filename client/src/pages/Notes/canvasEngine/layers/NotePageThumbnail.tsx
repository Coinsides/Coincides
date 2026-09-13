import { memo, type CSSProperties } from 'react';
import { documentTypographyToCssVars } from '../typographyProfileService';
import type { PageFrameModel } from '../types';
import { NoteReadOnlyPageContent } from './NoteReadOnlyPageContent';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import './NotePageThumbnail.css';

export type NotePageThumbnailInput = Pick<NoteWritingSurfaceLayerProps,
  'noteId' | 'noteCanvasRuntime' | 'visibleBlocks' | 'blockTextDrafts'
  | 'blockTextFlowDrafts' | 'blockFieldDrafts' | 'documentTypographyProfile'
  | 'anchorsBySourceRef' | 'selectedPageFrameId'>;

export interface NotePageThumbnailProps {
  input: NotePageThumbnailInput;
  frame: PageFrameModel;
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
  selected: boolean;
  renderContent: boolean;
  preserveEditingFocus?: boolean;
  onSelectPage: (frameId: string) => void;
}

/** The same inert, lazily mounted page preview serves overview and navigation. */
export const NotePageThumbnail = memo(function NotePageThumbnail({
  input, frame, pageNumber, width, height, scale, selected, renderContent,
  preserveEditingFocus = false, onSelectPage,
}: NotePageThumbnailProps) {
  return <div className="noteOverviewSheet" data-note-overview-sheet="true"
    data-note-page-thumbnail="true" data-page-frame-id={frame.id}
    data-content-mounted={renderContent ? 'true' : 'false'}>
    <div className="noteOverviewPreview" data-note-overview-preview="true"
      aria-hidden="true" {...{ inert: '' }} style={{ width, height }}>
      {renderContent && <div className="noteOverviewCanvas" data-note-overview-canvas="true"
        style={{ ...documentTypographyToCssVars(input.documentTypographyProfile),
          width: frame.width, height: frame.height, transform: `scale(${scale})` } as CSSProperties}>
        <NoteReadOnlyPageContent frame={frame}
          fragments={input.noteCanvasRuntime.blockFragmentProjections}
          canvasObjects={input.noteCanvasRuntime.canvasObjects}
          canvasPlacements={input.noteCanvasRuntime.canvasPlacements}
          visibleBlocks={input.visibleBlocks} blockTextDrafts={input.blockTextDrafts}
          blockTextFlowDrafts={input.blockTextFlowDrafts} blockFieldDrafts={input.blockFieldDrafts}
          anchorsBySourceRef={input.anchorsBySourceRef} />
      </div>}
    </div>
    <button type="button" className="noteOverviewPage" data-note-overview-page="true"
      data-page-frame-id={frame.id} aria-label={`Read page ${pageNumber}`}
      aria-current={selected ? 'page' : undefined}
      onMouseDown={(event) => { if (preserveEditingFocus) event.preventDefault(); }}
      onClick={() => onSelectPage(frame.id)}>
      <span className="noteOverviewPageLabel">{pageNumber}</span>
    </button>
  </div>;
});
