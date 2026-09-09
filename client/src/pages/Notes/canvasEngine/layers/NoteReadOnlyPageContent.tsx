import { textFromContent } from '../blockContentService';
import { readStoredLayout } from '../placementService';
import { getPagePrintFragmentGeometry } from '../pagePrintProjectionService';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import type { PageFrameModel, PageStackBlockFragmentProjection } from '../types';
import { BlockEditorLayer } from './BlockEditorLayer';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import styles from '../../NoteDetail.module.css';

export type NoteReadOnlyPageContentProps = Pick<NoteWritingSurfaceLayerProps,
  'visibleBlocks' | 'blockTextDrafts' | 'blockTextFlowDrafts' | 'blockFieldDrafts' | 'anchorsBySourceRef'> & {
  frame: PageFrameModel;
  fragments: readonly PageStackBlockFragmentProjection[];
  /** Retain the existing print fragment markers without sharing its event lifecycle. */
  print?: boolean;
};

const noOp = () => undefined;
const noSave = async (): Promise<BlockSaveOutcome> => ({
  status: 'rejected', block: null, recoveryReceipt: null,
  reconciliation: 'not_attempted', durableState: 'not_checked',
  reason: 'mutation_not_allowed', staleEpoch: false,
});

/**
 * Page-local block fragments shared by print and overview. The caller owns the
 * page box, typography and scale; this renderer has no write or measurement API.
 * Fidelity follows the existing print projection: no annotations or generic objects.
 */
export function NoteReadOnlyPageContent({ frame, fragments, print = false, ...input }: NoteReadOnlyPageContentProps) {
  const blocks = new Map(input.visibleBlocks.filter((block) => readStoredLayout(block)?.surface !== 'tray')
    .map((block) => [block.id, block]));

  return <>
    {fragments
      .filter((fragment) => fragment.pageFrameId === frame.id && blocks.has(fragment.blockId))
      .map((fragment) => {
        const block = blocks.get(fragment.blockId)!;
        const geometry = getPagePrintFragmentGeometry(frame, fragment);
        return <div
          key={block.id}
          data-note-readonly-fragment="true"
          data-note-print-fragment={print ? 'true' : undefined}
          data-block-id={block.id}
          style={{ position: 'absolute', overflow: 'hidden', ...geometry.clip }}
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
    <style>{`
      [data-note-readonly-fragment] .${styles.textUnitGutter},
      [data-note-readonly-fragment] .${styles.sourceRefAction},
      [data-note-readonly-fragment] .${styles.blockStatusBadges} { display: none !important; }
      [data-note-readonly-fragment] .${styles.blockBox} { border-color: transparent; }
      [data-note-print-fragment] .${styles.codeBlockBox},
      [data-note-print-fragment] .${styles.codeBlockProjection} { background: white; }
    `}</style>
  </>;
}
