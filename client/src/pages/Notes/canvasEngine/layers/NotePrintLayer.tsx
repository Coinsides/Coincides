import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { getPagePrintGeometry, getPagePrintSlices } from '../pagePrintProjectionService';
import { documentTypographyToCssVars } from '../typographyProfileService';
import { NoteReadOnlyPageContent } from './NoteReadOnlyPageContent';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import './NotePrintLayer.css';
import { usePaperSkin } from '../PaperSkinContext';
import { NotePaperHeaderProjection, NOTE_HEADER_INITIAL_HEIGHT } from './NotePaperHeader';
import { deriveChapterProjection } from '../chapterProjectionService';
import { TocProjectionProvider } from '../TocProjectionContext';
import { tocPageNumbers } from '../tocProjectionService';
import { readStoredLayout } from '../placementService';

export type NotePrintInput = Pick<NoteWritingSurfaceLayerProps,
  'surfaceMode' | 'noteId' | 'noteCanvasRuntime' | 'visibleBlocks'
  | 'blockTextDrafts' | 'blockTextFlowDrafts' | 'blockFieldDrafts'
  | 'documentTypographyProfile' | 'anchorsBySourceRef' | 'paperHeader'> & {
    skinStyle?: CSSProperties;
    skinPreset?: string;
    /** Creation-time Web preset only; never inferred from a historical template. */
    continuousWeb?: boolean;
  };

/** A read-only reuse of the editor renderer; no persistence or measurement callbacks escape. */
function PrintPages({ input }: { input: NotePrintInput }) {
  const flowPlan = input.noteCanvasRuntime.pageFlowPlan;
  const extensions = new Map(input.noteCanvasRuntime.pageFrameExtensions.map((extension) => [extension.frameId, extension]));
  const hasCover = input.noteCanvasRuntime.pageFrameExtensions.some((extension) => extension.isCover);
  const coverIds = new Set(input.noteCanvasRuntime.pageFrameExtensions.filter((extension) => extension.isCover).map((extension) => extension.frameId));
  const layouts = Object.fromEntries(input.visibleBlocks.flatMap((block) => {
    const layout = readStoredLayout(block);
    return layout ? [[block.id, layout]] : [];
  }));
  const excluded = new Set(input.visibleBlocks.filter((block) => layouts[block.id]?.surface === 'tray'
    || coverIds.has(layouts[block.id]?.frame_id || '')).map((block) => block.id));
  const { agenda } = deriveChapterProjection(input.visibleBlocks, input.blockTextFlowDrafts, excluded);
  const pageNumbers = tocPageNumbers(agenda, flowPlan, input.noteCanvasRuntime.pageFrames, coverIds, layouts,
    input.continuousWeb, input.noteCanvasRuntime.blockFragmentProjections);
  const frames = input.noteCanvasRuntime.pageFrames.filter((frame) => {
    const extension = extensions.get(frame.id);
    return !extension?.isCover || extension.coverExportIncluded !== false;
  });
  return <TocProjectionProvider value={{ agenda, pageNumbers }}><div data-note-print-root="true" data-note-id={input.noteId} style={input.skinStyle} data-note-skin-preset={input.skinPreset}>
    {flowPlan && <style>{frames.map((frame, index) => {
      const size = getPagePrintGeometry(frame, true);
      return `@page coincides-flow-${index} { size: ${size.width}px ${size.height}px; margin: 0; }`;
    }).join('\n')}</style>}
    {frames.flatMap((frame, frameIndex) => {
      const print = getPagePrintGeometry(frame, Boolean(flowPlan));
      return getPagePrintSlices(frame, input.continuousWeb).map((slice) => {
        const header = !hasCover && frameIndex === 0 && slice.index === 0 ? input.paperHeader : undefined;
        const bandHeight = header ? NOTE_HEADER_INITIAL_HEIGHT : 0;
        const pageHeight = print.height / print.scale;
        // The first export view includes a display-only band. Fit that view into
        // the same physical page without moving the frame, fragments or flow plan.
        const scale = header ? print.scale * pageHeight / (pageHeight + bandHeight) : print.scale;
        return <section
        key={`${frame.id}:${slice.index}`}
        data-note-print-page="true"
        data-page-frame-id={frame.id}
        data-print-slice-index={slice.index}
        data-print-slice-offset={slice.offsetY}
        data-paper-size={print.paperSize}
        data-print-scale={scale}
        data-print-header-height={bandHeight || undefined}
        style={{ width: print.width, height: print.height, ...(flowPlan ? { page: `coincides-flow-${frameIndex}` } : {}) }}
      >
        <div
          data-note-print-canvas="true"
          style={{
            ...documentTypographyToCssVars(input.documentTypographyProfile),
            width: frame.width,
            height: header ? pageHeight + bandHeight : frame.height,
            top: slice.printTop,
            ...(header ? { left: (print.width - frame.width * scale) / 2 } : {}),
            transform: `scale(${scale})`,
          } as CSSProperties}
        >
          {header && <NotePaperHeaderProjection titleDraft={header.titleDraft} descriptionDraft={header.descriptionDraft}
            left={frame.contentInset.left} right={frame.contentInset.right} />}
          <div data-note-print-body="true" style={header ? { position: 'absolute', top: bandHeight,
            width: frame.width, height: pageHeight, overflow: 'hidden' } : { display: 'contents' }}>
          <NoteReadOnlyPageContent
            frame={frame}
            slots={extensions.get(frame.id)?.slots}
            coverImage={extensions.get(frame.id)?.coverImage}
            documentTypography={input.documentTypographyProfile}
            fragments={input.continuousWeb && frame.templateId === 'screen_note'
              ? input.noteCanvasRuntime.blockFragmentProjections.filter((fragment) => (
                fragment.visibleRect.y < frame.y + slice.offsetY + slice.height
                && fragment.visibleRect.y + fragment.visibleRect.height > frame.y + slice.offsetY
              ))
              : input.noteCanvasRuntime.blockFragmentProjections}
            canvasObjects={input.noteCanvasRuntime.canvasObjects}
            canvasPlacements={input.noteCanvasRuntime.canvasPlacements}
            visibleBlocks={input.visibleBlocks}
            blockTextDrafts={input.blockTextDrafts}
            blockTextFlowDrafts={input.blockTextFlowDrafts}
            blockFieldDrafts={input.blockFieldDrafts}
            anchorsBySourceRef={input.anchorsBySourceRef}
            print
          />
          </div>
        </div>
        {flowPlan?.overflows.filter((overflow) => overflow.frameId === frame.id).map((overflow) => (
          <small key={overflow.fragmentId} data-page-flow-overflow={overflow.kind}
            style={{ position: 'absolute', bottom: 4, left: 8 }}>
            Content exceeds this page by {Math.ceil(overflow.overflowPx)} px.
          </small>
        ))}
      </section>;
      });
    })}
  </div></TocProjectionProvider>;
}

export function NotePrintLayer(input: NotePrintInput) {
  const skin = usePaperSkin();
  const latest = useRef(input);
  latest.current = { ...input, skinStyle: skin?.style, skinPreset: skin?.materialPreset ?? skin?.preset };
  const snapshot = useRef<NotePrintInput | null>(null);
  const [printing, setPrinting] = useState<NotePrintInput | null>(null);

  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
    setPrinting(null);
    const begin = () => {
      if (snapshot.current || latest.current.surfaceMode !== 'page') return;
      // Freeze this print job before hiding the app can notify screen ResizeObservers.
      snapshot.current = latest.current;
      flushSync(() => setPrinting(snapshot.current));
    };
    const end = () => {
      snapshot.current = null;
      flushSync(() => setPrinting(null));
    };
    const change = (event: MediaQueryListEvent) => event.matches ? begin() : end();
    window.addEventListener('beforeprint', begin);
    window.addEventListener('afterprint', end);
    media?.addEventListener('change', change);
    // Also support a document opened while print media is already selected.
    if (media?.matches && latest.current.surfaceMode === 'page') {
      snapshot.current = latest.current;
      setPrinting(snapshot.current);
    }
    return () => {
      window.removeEventListener('beforeprint', begin);
      window.removeEventListener('afterprint', end);
      media?.removeEventListener('change', change);
      snapshot.current = null;
    };
  }, [input.noteId, input.surfaceMode]);

  return printing && printing.noteId === input.noteId && input.surfaceMode === 'page'
    ? createPortal(<PrintPages input={printing} />, document.body)
    : null;
}
