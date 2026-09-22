import { useLayoutEffect, useRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrimaryPageFrame } from '../engineModel';
import { createPageFrameCollectionSeed } from '../pageFrameCollectionService';
import { appendPageFrameToStack } from '../pageStackCollectionService';
import { getPagePaperDimensions, internalLengthToPaper } from '../paperSizeService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, writeTypographyProfileMetadata } from '../typographyProfileService';
import { createPageFrameDefaultTypographyProfile, resolveEffectiveDocumentTypographyProfile } from '../pageFrameTypographyService';
import type { PageFrameWallSnapshot } from '../pageFrameWallService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { DocumentTypographyProfile, PageFrameCollectionModel } from '../types';
import { usePaperSize } from './usePaperSize';
import { usePlacementHistory } from './usePlacementHistory';
import { estimateTypographyTextBlockHeight } from '../typographyMeasurementService';
import { getPageFrameContentRect } from '../pageFrameService';
import type { TextFlowHistoryHost } from './useTextFlowHistory';

class PaperPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
beforeAll(() => vi.stubGlobal('PointerEvent', PaperPointerEvent));
afterAll(() => vi.unstubAllGlobals());

function seed(web = false) {
  const first = createPageFrameCollectionSeed(createPrimaryPageFrame({ id: 'paper-first', templateId: web ? 'screen_note' : 'a4_portrait' }));
  return web ? first : appendPageFrameToStack(first, first.primaryStackId!, 'paper-first', { id: 'paper-second' });
}
interface PaperState { collection: PageFrameCollectionModel; blocks: NoteBlock[] }
interface SubjectState {
  paper: ReturnType<typeof usePaperSize>;
  history: ReturnType<typeof usePlacementHistory>;
  persisted: PaperState;
}
function mountPaper({ web = false, zoom = 1, initialLayout = true, outcome = async (_snapshot: PageFrameWallSnapshot) => true,
  idle = async () => undefined, runtimeFeedback = false, initialState, typography = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  resolveTypography }: { web?: boolean; zoom?: number; initialLayout?: boolean; runtimeFeedback?: boolean;
    initialState?: PaperState; typography?: DocumentTypographyProfile;
    resolveTypography?: (collection: PageFrameCollectionModel) => DocumentTypographyProfile;
    outcome?: (snapshot: PageFrameWallSnapshot) => Promise<boolean>; idle?: () => Promise<unknown> } = {}) {
  let api: SubjectState;
  const save = vi.fn(outcome);
  const boundary = vi.fn(() => true);
  function Harness({ noteId = 'paper-note', layoutMode = initialLayout }: { noteId?: string; layoutMode?: boolean }) {
    const [persisted, setPersisted] = useState<PaperState>(() => initialState || ({ collection: seed(web), blocks: [] }));
    const live = useRef(persisted); live.current = persisted;
    const renderedCollection = useRef(persisted.collection);
    const history = usePlacementHistory({ noteId, coordinateContract: 'v2', target: null,
      applyLayoutDrafts: () => undefined, persistLayoutSnapshot: async () => true });
    const historyRef = useRef<TextFlowHistoryHost | null>(history); historyRef.current = history;
    const paper = usePaperSize({ noteId, enabled: true, layoutMode, collection: persisted.collection,
      getCollection: () => runtimeFeedback ? renderedCollection.current : live.current.collection, getLayouts: () => ({}), blocks: persisted.blocks,
      objects: [], placements: [], layoutDrafts: {}, coordinateContract: 'v2',
      typography, resolveTypography, history: historyRef, boundary, whenIdle: idle, zoom,
      save: async (snapshot) => {
        const saved = await save(snapshot);
        if (saved) setPersisted((previous) => ({ collection: snapshot.collection,
          blocks: previous.blocks.map((block) => {
            const update = snapshot.layoutUpdates.find((entry) => entry.block.id === block.id);
            return update ? { ...block, canvas_layout: { ...update.layout } } : block;
          }) }));
        return saved;
      },
    });
    // The real runtime publishes its currently rendered collection, including a drag preview.
    useLayoutEffect(() => { renderedCollection.current = paper.collection || persisted.collection; });
    api = { paper, history, persisted };
    return <button data-testid="paper-corner" onPointerDown={(event) => paper.begin(event, 'paper-first')}>尺寸</button>;
  }
  const view = render(<Harness />);
  return { get current() { return api!; }, save, boundary, view,
    setLayout: (layoutMode: boolean) => view.rerender(<Harness layoutMode={layoutMode} />),
    navigate: (noteId: string) => view.rerender(<Harness noteId={noteId} />) };
}
function begin(subject: ReturnType<typeof mountPaper>, x = 100, y = 200) {
  fireEvent.pointerDown(subject.view.getByTestId('paper-corner'), { pointerId: 9, button: 0, clientX: x, clientY: y });
}
function pointer(type: 'pointermove' | 'pointerup' | 'pointercancel', x: number, y: number) {
  window.dispatchEvent(new PaperPointerEvent(type, { pointerId: 9, button: 0, clientX: x, clientY: y }));
}
async function finish(subject: ReturnType<typeof mountPaper>, x: number, y: number) {
  await act(async () => { pointer('pointerup', x, y); await subject.current.history.whenHistoryIdle(); });
}

describe('A5 paper size shared history and Layout gestures', () => {
  it.each([false, true])('reflows with target paper typography while preserving an explicit override (%s)', async (custom) => {
    const collection = createPageFrameCollectionSeed(createPrimaryPageFrame({ id: 'paper-first', templateId: 'a4_portrait' }));
    const typography = createPageFrameDefaultTypographyProfile(collection.pageFrames[0]);
    const metadata = custom ? writeTypographyProfileMetadata({}, typography) : undefined;
    const resolveTypography = vi.fn((target: PageFrameCollectionModel) => resolveEffectiveDocumentTypographyProfile({
      surfaceMode: 'page', metadata, pageFrames: target.pageFrames, hydratedProfile: typography,
    }));
    const block: NoteBlock = { id: 'text', placement_id: 'placement:text', block_type: 'paragraph', title: null,
      plain_text: 'a'.repeat(3500), content_json: {}, metadata: {}, order_index: 0,
      source_references: [], display_overrides_json: {}, canvas_layout: {
        x: 0, y: 0, width: 760, height: 100, width_mode: 'auto', frame_id: 'paper-first',
        coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside',
      } };
    const targetFrame = createPrimaryPageFrame({ templateId: 'letter_portrait' });
    const targetContent = getPageFrameContentRect(targetFrame);
    // Guard the specimen's intended boundary independently of the pagination
    // operation: Letter fits one page while the retained A4 type metrics do not.
    const heightFor = (profile: DocumentTypographyProfile) => estimateTypographyTextBlockHeight({
      text: block.plain_text!, width: targetContent.width, typography: profile }).heightPx;
    expect(heightFor(createPageFrameDefaultTypographyProfile(targetFrame))).toBeLessThanOrEqual(targetContent.height);
    expect(heightFor(typography)).toBeGreaterThan(targetContent.height);
    const subject = mountPaper({ initialState: { collection, blocks: [block] }, typography, resolveTypography });
    await act(async () => { expect(await subject.current.paper.setPreset('letter_portrait')).toBe(true); });
    expect(resolveTypography).toHaveBeenCalledTimes(1);
    expect(resolveTypography.mock.calls[0][0].pageFrames[0].templateId).toBe('letter_portrait');
    // Straddle the paper-family pagination boundary with the 1.65 line rhythm:
    // Letter's metrics fit one page; retaining the explicit A4 profile needs two.
    expect(subject.current.persisted.collection.pageFrames).toHaveLength(custom ? 2 : 1);
    expect(subject.current.persisted.blocks).toEqual([block]);
    const after = structuredClone(subject.current.persisted);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted).toEqual({ collection, blocks: [block] });
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted).toEqual(after);
  });

  it('commits a drag against its original collection when the runtime ref contains the live preview', async () => {
    const subject = mountPaper({ runtimeFeedback: true });
    const before = structuredClone(subject.current.persisted);
    begin(subject);
    act(() => pointer('pointermove', 160, 280));
    expect(subject.current.paper.collection!.pageFrames[0].width).toBeCloseTo(before.collection.pageFrames[0].width + 60, 8);
    await finish(subject, 160, 280);
    expect(subject.save).toHaveBeenCalledTimes(1);
    const after = structuredClone(subject.current.persisted);
    expect(after.collection.pageFrames[0].width).toBeCloseTo(before.collection.pageFrames[0].width + 60, 8);
    expect(after.collection.pageFrames[0].paperSizeOverride).toBe(true);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted).toEqual(before);
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted).toEqual(after);
    expect(subject.save).toHaveBeenCalledTimes(3);
  });

  it('changes every existing page with one save and one symmetric undo/redo entry', async () => {
    const subject = mountPaper({ initialLayout: false });
    const before = structuredClone(subject.current.persisted);
    await act(async () => { expect(await subject.current.paper.setPreset('a3_landscape')).toBe(true); });
    expect(subject.save).toHaveBeenCalledTimes(1);
    expect(subject.current.persisted.collection.pageFrames.map((frame) => frame.templateId)).toEqual(['a3_landscape', 'a3_landscape']);
    expect(subject.current.persisted.collection.paperDefault?.templateId).toBe('a3_landscape');
    const after = structuredClone(subject.current.persisted);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted).toEqual(before);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted).toEqual(after);
    expect(subject.save).toHaveBeenCalledTimes(3);
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(false); });
  });

  it('resizes only the selected page and restores its default through consecutive undo entries', async () => {
    const subject = mountPaper();
    const secondBefore = structuredClone(subject.current.persisted.collection.pageFrames[1]);
    await act(async () => { expect(await subject.current.paper.resize('paper-first', 180, 240)).toBe(true); });
    const resized = structuredClone(subject.current.persisted.collection);
    expect(getPagePaperDimensions(resized.pageFrames[0]).width).toBeCloseTo(180, 8);
    expect(getPagePaperDimensions(resized.pageFrames[0]).height).toBeCloseTo(240, 8);
    expect(resized.pageFrames[0].paperSizeOverride).toBe(true);
    expect(resized.pageFrames[1].width).toBe(secondBefore.width);
    expect(resized.pageFrames[1].height).toBe(secondBefore.height);
    expect(resized.pageFrames[1].paperSizeOverride).toBeUndefined();
    await act(async () => { expect(await subject.current.paper.restore('paper-first')).toBe(true); });
    expect(subject.current.persisted.collection.pageFrames[0].paperSizeOverride).toBeUndefined();
    expect(subject.current.persisted.collection.pageFrames[0].width).toBe(secondBefore.width);
    expect(subject.save).toHaveBeenCalledTimes(2);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted.collection).toEqual(resized);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted.collection).toEqual(seed());
  });

  it('previews a zoom-adjusted drag without writes and saves once when released', async () => {
    const subject = mountPaper({ zoom: 0.5 });
    const before = structuredClone(subject.current.persisted);
    const original = before.collection.pageFrames[0];
    begin(subject);
    act(() => pointer('pointermove', 130, 240));
    expect(subject.current.paper.busy).toBe(true);
    expect(subject.current.paper.selectedFrameId).toBe('paper-first');
    expect(subject.current.paper.collection!.pageFrames[0].width).toBeCloseTo(original.width + 60, 8);
    expect(subject.current.paper.collection!.pageFrames[0].height).toBeCloseTo(original.height + 80, 8);
    expect(subject.current.persisted).toEqual(before);
    expect(subject.save).not.toHaveBeenCalled();
    await finish(subject, 130, 240);
    expect(subject.save).toHaveBeenCalledTimes(1);
    expect(subject.current.paper.busy).toBe(false);
    expect(getPagePaperDimensions(subject.current.persisted.collection.pageFrames[0]).width)
      .toBeCloseTo(getPagePaperDimensions(original).width + internalLengthToPaper(60, 'mm', original), 8);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.current.persisted).toEqual(before);
  });

  it('leaves a stationary resize gesture without saves, overrides or undo history', async () => {
    const subject = mountPaper();
    const before = structuredClone(subject.current.persisted);
    begin(subject);
    act(() => pointer('pointermove', 100, 200));
    await finish(subject, 100, 200);
    expect(subject.save).not.toHaveBeenCalled();
    expect(subject.current.paper.busy).toBe(false);
    expect(subject.current.persisted).toEqual(before);
    expect(subject.current.paper.collection).toEqual(before.collection);
    expect(subject.current.persisted.collection.pageFrames[0].paperSizeOverride).toBeUndefined();
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it.each(['Escape', 'pointercancel', 'blur'] as const)('cancels %s without saving a preview or adding undo history', async (kind) => {
    const subject = mountPaper();
    const before = structuredClone(subject.current.persisted);
    begin(subject);
    act(() => pointer('pointermove', 150, 250));
    act(() => {
      if (kind === 'Escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else if (kind === 'blur') window.dispatchEvent(new Event('blur'));
      else pointer('pointercancel', 150, 250);
    });
    await finish(subject, 150, 250);
    expect(subject.save).not.toHaveBeenCalled();
    expect(subject.current.paper.busy).toBe(false);
    expect(subject.current.paper.collection).toEqual(before.collection);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it.each(['layout', 'navigation'] as const)('drops the current preview when %s leaves its scope', async (kind) => {
    const subject = mountPaper();
    begin(subject);
    act(() => pointer('pointermove', 140, 240));
    if (kind === 'layout') subject.setLayout(false);
    else subject.navigate('another-note');
    await finish(subject, 150, 250);
    expect(subject.save).not.toHaveBeenCalled();
    expect(subject.current.paper.collection).toBe(subject.current.persisted.collection);
    expect(subject.current.paper.busy).toBe(false);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('keeps page resize and restore inert outside Layout', async () => {
    const subject = mountPaper({ initialLayout: false });
    begin(subject);
    await finish(subject, 160, 260);
    await act(async () => {
      expect(await subject.current.paper.resize('paper-first', 180, 240)).toBe(false);
      expect(await subject.current.paper.restore('paper-first')).toBe(false);
    });
    expect(subject.boundary).not.toHaveBeenCalled();
    expect(subject.save).not.toHaveBeenCalled();
  });

  it('keeps the Web growing page unchanged for preset, numeric and pointer actions', async () => {
    const subject = mountPaper({ web: true });
    const before = structuredClone(subject.current.persisted);
    await act(async () => {
      expect(await subject.current.paper.setPreset('a5_portrait')).toBe(false);
      expect(await subject.current.paper.resize('paper-first', 180, 240)).toBe(false);
      expect(await subject.current.paper.restore('paper-first')).toBe(false);
    });
    begin(subject);
    await finish(subject, 150, 250);
    expect(subject.save).not.toHaveBeenCalled();
    expect(subject.current.persisted).toEqual(before);
  });

  it.each(['false', 'throw'] as const)('reports a %s save failure without adding undo history', async (failure) => {
    const subject = mountPaper({ outcome: async () => { if (failure === 'throw') throw new Error('Paper save failed'); return false; } });
    const before = structuredClone(subject.current.persisted);
    await act(async () => { expect(await subject.current.paper.setPreset('a5_portrait')).toBe(false); });
    expect(subject.save).toHaveBeenCalledTimes(1);
    expect(subject.current.paper.error).toBe('纸型未保存，请重试。');
    expect(subject.current.paper.busy).toBe(false);
    expect(subject.current.persisted).toEqual(before);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('abandons an operation waiting for note saves when navigation changes its scope', async () => {
    let release!: () => void;
    const idle = new Promise<void>((resolve) => { release = resolve; });
    const subject = mountPaper({ idle: () => idle });
    let pending!: Promise<boolean>;
    await act(async () => { pending = subject.current.paper.setPreset('a5_portrait'); await Promise.resolve(); });
    expect(subject.current.paper.busy).toBe(true);
    subject.navigate('another-note');
    await act(async () => { release(); expect(await pending).toBe(false); });
    expect(subject.save).not.toHaveBeenCalled();
    expect(subject.current.paper.busy).toBe(false);
  });
});
