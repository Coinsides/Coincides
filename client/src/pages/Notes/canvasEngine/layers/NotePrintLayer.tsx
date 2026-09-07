import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { textFromContent } from '../blockContentService';
import { readStoredLayout } from '../placementService';
import { getPagePrintFragmentGeometry, getPagePrintGeometry } from '../pagePrintProjectionService';
import { documentTypographyToCssVars } from '../typographyProfileService';
import { BlockEditorLayer } from './BlockEditorLayer';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import styles from '../../NoteDetail.module.css';
import './NotePrintLayer.css';

export type NotePrintInput = Pick<NoteWritingSurfaceLayerProps,
  'surfaceMode' | 'noteId' | 'noteCanvasRuntime' | 'visibleBlocks'
  | 'blockTextDrafts' | 'blockTextFlowDrafts' | 'blockFieldDrafts'
  | 'documentTypographyProfile' | 'anchorsBySourceRef'>;

const noOp = () => undefined;
const noSave = async (): Promise<BlockSaveOutcome> => ({
  status: 'rejected', block: null, recoveryReceipt: null,
  reconciliation: 'not_attempted', durableState: 'not_checked',
  reason: 'mutation_not_allowed', staleEpoch: false,
});

/** A read-only reuse of the editor renderer; no persistence or measurement callbacks escape. */
function PrintPages({ input }: { input: NotePrintInput }) {
  const blocks = new Map(input.visibleBlocks.filter((block) => readStoredLayout(block)?.surface !== 'tray')
    .map((block) => [block.id, block]));
  return <div data-note-print-root="true" data-note-id={input.noteId}>
    {input.noteCanvasRuntime.pageFrames.map((frame) => {
      const print = getPagePrintGeometry(frame);
      return <section
        key={frame.id}
        data-note-print-page="true"
        data-page-frame-id={frame.id}
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
            transform: `scale(${print.scale})`,
          } as CSSProperties}
        >
          {input.noteCanvasRuntime.blockFragmentProjections
            .filter((fragment) => fragment.pageFrameId === frame.id && blocks.has(fragment.blockId))
            .map((fragment) => {
              const block = blocks.get(fragment.blockId)!;
              const geometry = getPagePrintFragmentGeometry(frame, fragment);
              return <div
                key={block.id}
                data-note-print-fragment="true"
                data-block-id={block.id}
                style={geometry.clip}
              >
                <BlockEditorLayer
                  block={block}
                  text={input.blockTextDrafts[block.id] ?? textFromContent(block)}
                  textFlowDraft={input.blockTextFlowDrafts[block.id]}
                  fieldDraft={input.blockFieldDrafts[block.id]}
                  layout={geometry.block}
                  contentReadOnly
                  layoutMode={false}
                  pageOffsetX={0}
                  blockControlAnchor={null}
                  affiliationOutline={null}
                  annotations={[]}
                  selectedAnnotationIds={[]}
                  saving={false}
                  active={false}
                  autoFocus={false}
                  showBlockTypeBadge={false}
                  showAIStatusBadge={false}
                  showExportStatusBadge={false}
                  showLabelOverlay={false}
                  anchorsBySourceRef={input.anchorsBySourceRef}
                  sourceJumpBusy={null}
                  onFocused={noOp}
                  onFocusReleased={noOp}
                  onAnnotationSelect={noOp}
                  onAnnotationContextMenu={noOp}
                  onAnnotationStackSelect={noOp}
                  onTextUnitSelection={noOp}
                  onTextUnitContextMenu={noOp}
                  onBlockContextMenu={noOp}
                  onTextChange={noOp}
                  onTextFlowChange={noOp}
                  onFieldDraftChange={noOp}
                  onSave={noSave}
                  onTrash={noOp}
                  onSelect={noOp}
                  onBeginMove={noOp}
                  onBeginResize={noOp}
                  onToggleExportRole={noOp}
                  onToggleAIVisibility={noOp}
                  onAnnotateBlock={noOp}
                  onKeyDown={noOp}
                  onMeasuredHeight={noOp}
                  onViewSource={noOp}
                />
              </div>;
            })}
        </div>
      </section>;
    })}
    <style>{`
      [data-note-print-root] .${styles.textUnitGutter},
      [data-note-print-root] .${styles.sourceRefAction},
      [data-note-print-root] .${styles.blockStatusBadges} { display: none !important; }
      [data-note-print-root] .${styles.blockBox} { border-color: transparent; }
    `}</style>
  </div>;
}

export function NotePrintLayer(input: NotePrintInput) {
  const latest = useRef(input);
  latest.current = input;
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
