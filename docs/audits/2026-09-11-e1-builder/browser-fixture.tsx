// Synthetic component smoke. No application services, backend or database.
// Callback log establishes UI dispatch only; it is not persistence evidence.
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../../../client/src/styles/global.css';
import { NoteChromeLayer } from '../../../client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer';
import { NoteFloatingPanelLayer } from '../../../client/src/pages/Notes/canvasEngine/layers/NoteFloatingPanelLayer';
import { ViewOptionsMenu } from '../../../client/src/pages/Notes/canvasEngine/layers/ViewOptionsMenu';
import { useFloatingOverlayController } from '../../../client/src/pages/Notes/canvasEngine/hooks/useFloatingOverlayController';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../../../client/src/pages/Notes/canvasEngine/typographyProfileService';
import { createPageFrameCollectionSeed } from '../../../client/src/pages/Notes/canvasEngine/pageFrameCollectionService';
import { derivePageReadingViewport } from '../../../client/src/pages/Notes/canvasEngine/pageReadingViewportService';
import type { PageReadingGear } from '../../../client/src/pages/Notes/canvasEngine/pageReadingViewportService';
import styles from '../../../client/src/pages/Notes/NoteDetail.module.css';

const callbacks: { name: string; value?: unknown }[] = [];
const record = (name: string, value?: unknown) => callbacks.push({ name, value });
const frame = { id: 'e1-page-1', role: 'primary_page_frame' as const, exportable: true, x: 0, y: 0,
  width: 794, height: 1123, pageSize: 'A4' as const, contentInset: { top: 24, right: 72, bottom: 96, left: 72 } };
const secondFrame = { ...frame, id: 'e1-page-2', role: 'secondary_page_frame' as const, y: 1155 };
const thirdFrame = { ...secondFrame, id: 'e1-page-3', y: 2310 };
const collection = createPageFrameCollectionSeed(frame);
collection.pageFrames = [frame, secondFrame, thirdFrame];
collection.pageStacks = [
  { ...collection.pageStacks[0], id: 'e1-stack-1', displayName: 'Notes', frameIds: [frame.id, secondFrame.id], primaryFrameId: frame.id },
  { ...collection.pageStacks[0], id: 'e1-stack-2', displayName: 'References', frameIds: [thirdFrame.id], primaryFrameId: thirdFrame.id },
];
const deleted = { id: 'e1-deleted', placement_id: 'e1-placement-deleted', block_type: 'text', title: 'Deleted theorem',
  plain_text: 'Synthetic deleted theorem', content_json: {}, metadata: {}, display_overrides_json: {}, canvas_layout: null, order_index: 0, source_references: [] };
const row = { block: { ...deleted, id: 'e1-inside', title: 'Synthetic theorem' }, boundary: 'inside', exportRole: 'included', aiVisibility: 'visible' };
const crossing = { ...row, block: { ...row.block, id: 'e1-crossing', title: 'Boundary example' }, boundary: 'crossing' };
const outside = { ...row, block: { ...row.block, id: 'e1-outside', title: 'Scratch example' }, boundary: 'outside', exportRole: 'scratch', aiVisibility: 'hidden' };
const preview = { rows: [row, crossing, outside], includedRows: [row], excludedRows: [crossing, outside], aiVisibleRows: [row, crossing], aiHiddenRows: [outside],
  included: 1, excluded: 2, aiVisible: 2, aiHidden: 1, crossing: 1, outside: 1, scratch: 1,
  crossingExportPolicy: 'manual', crossingObjects: [crossing], workspaceOnlyObjects: [outside], pageStacks: [],
  pageFrames: [{ pageFrameId: frame.id, role: frame.role, pageSize: 'A4', exportable: true, rows: [row], includedRows: [row], excludedRows: [],
    aiVisibleRows: [row], aiHiddenRows: [], documentTypography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, estimatedLineCapacity: 30 }] };

function E1BrowserFixture() {
  const [, renderLog] = useState(0);
  const [layout, setLayout] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [modal, setModal] = useState(false);
  const [trashed, setTrashed] = useState([deleted]);
  const [profile, setProfile] = useState(DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE);
  const [gear, setGear] = useState<PageReadingGear>('fit_width');
  const [source, setSource] = useState(false);
  const [interaction, setInteraction] = useState<unknown>(null);
  const overlay = useFloatingOverlayController({ setInteractionState: setInteraction });
  const reading = derivePageReadingViewport({ viewState: { gear, stepFactor: 1 }, availableWidth: 900, availableHeight: 600, paperWidth: 794, paperHeight: 1123, physicalScale: 1 });
  const action = (name: string) => (value?: unknown) => { record(name, value && typeof value === 'object' && 'nativeEvent' in value ? undefined : value); renderLog((v) => v + 1); };
  const state = { gear, displayScale: reading.displayScale, profile, layout, readOnly, modal, trashedCount: trashed.length, callbacks, interaction,
    open: { more: overlay.showMoreActions, info: overlay.showNoteInfo, layout: overlay.showLayoutPanel, trash: overlay.showBlockTrash, preview: overlay.showExportPreview, view: overlay.showViewOptions } };
  return <>
    <main style={{ padding: 36, maxWidth: 850 }}>
      <h1>E1 synthetic overlay smoke</h1>
      <p style={{ margin: '12px 0 24px' }}>Actual note overlay components and CSS. Synthetic callback state only.</p>
      <div style={{ display: 'flex', gap: 18 }}>
        <button data-smoke-control="source" onClick={() => { overlay.closeOverlay(); setSource(true); }}>Source snapshot</button>
        <button data-smoke-control="readonly" onClick={() => setReadOnly((v) => !v)}>Toggle readonly</button>
        <button data-smoke-control="modal" onClick={() => setModal((v) => !v)}>Toggle modal host</button>
      </div>
      <pre data-smoke-state style={{ marginTop: 28, fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 350, overflow: 'auto' }}>{JSON.stringify(state, null, 2)}</pre>
    </main>
    <div data-page-reading-control="true" className={`${styles.canvasZoomControl} ${styles.pageReadingControl}`} style={{ position: 'fixed', bottom: 24, right: 24 }}>
      <NoteChromeLayer hostMode={modal ? 'modal' : 'page'} blockTrashLoadFailed={false} blockTrashLoading={false} contentReadOnly={readOnly}
        exportPreview={preview as never} layoutMode={layout} layoutModeKind={layout ? 'persistent' : 'off'}
        note={{ id: 'e1-note', course_id: 'e1-project', title: 'Synthetic overlay note', description: null, status: 'active' }}
        pageFrameCollection={collection} pageFrames={collection.pageFrames} primaryPageFrameId={frame.id} selectedPageFrameId={secondFrame.id}
        showBlockTrash={overlay.showBlockTrash} showExportPreview={overlay.showExportPreview} showLayoutPanel={overlay.showLayoutPanel}
        showMoreActions={overlay.showMoreActions} showNoteInfo={overlay.showNoteInfo}
        showPreviewAIVisibility={overlay.showPreviewAIVisibility} showPreviewBlockTypes={overlay.showPreviewBlockTypes}
        showPreviewExportStatus={overlay.showPreviewExportStatus} showPreviewLabelOverlay={overlay.showPreviewLabelOverlay}
        sortedBlockCount={3} sourceReferenceCount={1} surfaceMode="page" surfacePolicy={{ label: 'Page', nextModeLabel: 'Canvas' }}
        trashedBlocks={trashed} documentTypographyProfile={profile} restoringBlockId={null}
        onAddFavorite={action('favorite')} onTrashNote={async () => action('trashNote')()} onCloseOverlay={overlay.closeOverlay}
        onAddPageBelow={action('addPageBelow')} onCreatePageFrame={action('createPageFrame')} onCreatePageStack={action('createPageStack')}
        onDetachPageFromStack={action('detachPage')} onDeletePageFrame={action('deletePage')} onDuplicatePageFrame={action('duplicatePage')}
        onInsertPageFrame={action('insertPage')} onMergePageStackWithPrevious={action('mergeStack')} onSelectPageFrame={action('selectPage')}
        onSetPrimaryPageFrame={action('primaryPage')} onSplitPageStackAtFrame={action('splitStack')} onTogglePageStackCollapse={action('collapseStack')}
        onSaveDocumentTypographyProfile={(next) => { action('typography')(next); setProfile(next); }}
        onRestoreTrashedBlock={(block) => { action('restoreBlock')(block); setTrashed([]); }}
        onToggleExportPreview={overlay.toggleExportPreview} onToggleLayoutMode={() => { action('layout')(!layout); setLayout(!layout); overlay.openLayoutPanel(); }}
        onToggleMoreActions={overlay.toggleMoreActions} onToggleNoteInfo={overlay.toggleNoteInfo} onOpenLayoutPanel={overlay.openLayoutPanel}
        onOpenBlockTrash={overlay.openBlockTrash} onTogglePreviewAIVisibility={overlay.togglePreviewAIVisibility}
        onTogglePreviewBlockTypes={overlay.togglePreviewBlockTypes} onTogglePreviewExportStatus={overlay.togglePreviewExportStatus}
        onTogglePreviewLabelOverlay={overlay.togglePreviewLabelOverlay} onToggleSurfaceMode={action('surface')} />
      <ViewOptionsMenu open={overlay.showViewOptions} activeGear={gear} onToggle={overlay.toggleViewOptions} onClose={overlay.closeOverlay}
        onSelect={(next) => { record('view', next); setGear(next); }} />
    </div>
    <NoteFloatingPanelLayer sourceJumpTarget={source ? { anchor: {} as never, snapshot: { id: 'e1-source', title: 'Synthetic source', source_filename: 'synthetic.txt' },
      page: { id: 'e1-source-page', page_number: 1, page_label: null, text_content: 'Synthetic source passage for visual verification.' },
      focus: { page_start: 1, page_end: 1, text_start_offset: null, text_end_offset: null }, warnings: [] } : null}
      onFocusBlock={action('focusBlock')} onCloseSourceJump={() => setSource(false)} />
  </>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<E1BrowserFixture />);
