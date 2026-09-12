import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { getPagePrintGeometry, getPagePrintSlices } from '../pagePrintProjectionService';
import { documentTypographyToCssVars } from '../typographyProfileService';
import { NoteReadOnlyPageContent } from './NoteReadOnlyPageContent';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import './NotePrintLayer.css';
import { usePaperSkin } from '../PaperSkinContext';

export type NotePrintInput = Pick<NoteWritingSurfaceLayerProps,
  'surfaceMode' | 'noteId' | 'noteCanvasRuntime' | 'visibleBlocks'
  | 'blockTextDrafts' | 'blockTextFlowDrafts' | 'blockFieldDrafts'
  | 'documentTypographyProfile' | 'anchorsBySourceRef'> & {
    skinStyle?: CSSProperties;
    skinPreset?: string;
    /** Creation-time Web preset only; never inferred from a historical template. */
    continuousWeb?: boolean;
  };

/** A read-only reuse of the editor renderer; no persistence or measurement callbacks escape. */
function PrintPages({ input }: { input: NotePrintInput }) {
  return <div data-note-print-root="true" data-note-id={input.noteId} style={input.skinStyle} data-note-skin-preset={input.skinPreset}>
    {input.noteCanvasRuntime.pageFrames.flatMap((frame) => {
      const print = getPagePrintGeometry(frame);
      return getPagePrintSlices(frame, input.continuousWeb).map((slice) => <section
        key={`${frame.id}:${slice.index}`}
        data-note-print-page="true"
        data-page-frame-id={frame.id}
        data-print-slice-index={slice.index}
        data-print-slice-offset={slice.offsetY}
        data-paper-size={print.paperSize}
        data-print-scale={print.scale}
        style={{ width: print.width, height: print.height }}
      >
        <div
          data-note-print-canvas="true"
          style={{
            ...documentTypographyToCssVars(input.documentTypographyProfile),
            width: frame.width,
            height: frame.height,
            top: slice.printTop,
            transform: `scale(${print.scale})`,
          } as CSSProperties}
        >
          <NoteReadOnlyPageContent
            frame={frame}
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
      </section>);
    })}
  </div>;
}

export function NotePrintLayer(input: NotePrintInput) {
  const skin = usePaperSkin();
  const latest = useRef(input);
  latest.current = { ...input, skinStyle: skin?.style, skinPreset: skin?.preset };
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
