import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { buildPaperSizeEdit, type PaperSizeSnapshot } from '../paperSizeEditService';
import { getPagePaperDimensions, resizePagePaper, restorePagePaperDefault, setNotebookPaperPreset, internalLengthToPaper } from '../paperSizeService';
import { projectWallPlacements } from '../pageFrameWallService';
import { createTypographyDomLineMeasurer } from '../typographyDomMeasurementService';
import type { DocumentTypographyProfile, PageFrameCollectionModel, PageFrameTemplateId } from '../types';
import type { TextFlowHistoryHost } from './useTextFlowHistory';

interface Options extends Omit<Parameters<typeof buildPaperSizeEdit>[0], 'before' | 'after' | 'measureTextLines'> {
  noteId?: string;
  generation?: number;
  enabled: boolean;
  layoutMode: boolean;
  collection: PageFrameCollectionModel | null;
  getCollection: () => PageFrameCollectionModel | null;
  getLayouts: () => Parameters<typeof buildPaperSizeEdit>[0]['layoutDrafts'];
  resolveTypography?: (collection: PageFrameCollectionModel) => DocumentTypographyProfile;
  history: MutableRefObject<TextFlowHistoryHost | null>;
  boundary: () => boolean;
  whenIdle: () => Promise<unknown>;
  save: (snapshot: PaperSizeSnapshot) => Promise<boolean>;
  zoom: number;
}

export function usePaperSize(options: Options) {
  const latest = useRef(options); latest.current = options;
  const scope = useMemo(() => ({ busy: false, cleanup: null as (() => void) | null }), [options.noteId, options.generation]);
  const activeScope = useRef(scope); activeScope.current = scope;
  const [state, setState] = useState<{ scope: typeof scope; preview: PageFrameCollectionModel | null; busy: boolean } | null>(null);
  const [selected, setSelected] = useState<{ scope: typeof scope; id: string } | null>(null);
  const [error, setError] = useState<{ scope: typeof scope; message: string } | null>(null);
  const measurer = useMemo(() => typeof document === 'undefined' ? undefined : createTypographyDomLineMeasurer(document), []);
  useEffect(() => () => measurer?.dispose(), [measurer]);
  useEffect(() => () => { scope.cleanup?.(); }, [scope]);
  useEffect(() => { if (!options.enabled || !options.layoutMode) scope.cleanup?.(); }, [options.enabled, options.layoutMode, scope]);
  const preview = state?.scope === scope ? state.preview : null;
  const busy = state?.scope === scope && state.busy;
  const publish = (collection: PageFrameCollectionModel | null, isBusy: boolean) => {
    if (activeScope.current === scope) setState({ scope, preview: collection, busy: isBusy });
  };

  const commit = useCallback(async (transform: (collection: PageFrameCollectionModel) => PageFrameCollectionModel,
    gestureBefore?: PageFrameCollectionModel) => {
    const start = latest.current;
    const history = start.history.current;
    if (!start.enabled || scope.busy || !history || history.isReplaying?.() || !start.boundary()) return false;
    scope.busy = true; publish(null, true); setError(null);
    try {
      return await history.enqueueRuntimeHistoryOperation(async () => {
        try {
          await start.whenIdle();
          if (activeScope.current !== scope) return false;
          const current = latest.current;
          // A drag renders its preview back into the runtime collection ref. Its
          // history baseline remains the collection captured before pointerdown.
          const before = gestureBefore || current.getCollection() || current.collection;
          if (!before) return false;
          const after = transform(before);
          if (JSON.stringify(before) === JSON.stringify(after)) return false;
          const edit = buildPaperSizeEdit({ ...current, before, after, layoutDrafts: current.getLayouts(),
            typography: current.resolveTypography?.(after) || current.typography, measureTextLines: measurer });
          publish(edit.after.collection, true);
          if (!await start.save(edit.after)) {
            if (activeScope.current === scope) setError({ scope, message: '纸型未保存，请重试。' });
            return false;
          }
          return history.pushHistoryEntry({ type: 'reversibleEdit', undo: () => start.save(edit.before), redo: () => start.save(edit.after) }, { skipBoundary: true });
        } catch {
          if (activeScope.current === scope) setError({ scope, message: '纸型未保存，请重试。' });
          return false;
        }
      });
    } catch {
      if (activeScope.current === scope) setError({ scope, message: '纸型未保存，请重试。' });
      return false;
    } finally { scope.busy = false; publish(null, false); }
  }, [scope, measurer]);

  const setPreset = useCallback((preset: PageFrameTemplateId) => commit((collection) => setNotebookPaperPreset(collection, preset, { coverFrameId: latest.current.coverFrameId })), [commit]);
  const resize = useCallback((frameId: string, widthMm: number, heightMm: number) => {
    if (!latest.current.layoutMode) return Promise.resolve(false);
    return commit((collection) => resizePagePaper(collection, frameId, { width: widthMm, height: heightMm }, 'mm', { coverFrameId: latest.current.coverFrameId }));
  }, [commit]);
  const restore = useCallback((frameId: string) => {
    if (!latest.current.layoutMode) return Promise.resolve(false);
    return commit((collection) => restorePagePaperDefault(collection, frameId, { coverFrameId: latest.current.coverFrameId }));
  }, [commit]);

  const begin = useCallback((event: ReactPointerEvent<HTMLElement>, frameId: string) => {
    const start = latest.current;
    const collection = start.getCollection() || start.collection;
    const frame = collection?.pageFrames.find((entry) => entry.id === frameId);
    if (event.button !== 0 || !start.enabled || !start.layoutMode || scope.busy || !collection || !frame
      || frame.templateId === 'screen_note' || start.history.current?.isReplaying?.() || !start.boundary()) return;
    event.preventDefault(); event.stopPropagation();
    scope.cleanup?.(); scope.busy = true; setSelected({ scope, id: frameId });
    const dimensions = getPagePaperDimensions(frame, 'mm');
    const origin = { x: event.clientX, y: event.clientY };
    const pointerId = event.pointerId;
    const element = event.currentTarget;
    const target = element.ownerDocument.defaultView || window;
    const zoom = start.zoom > 0 ? start.zoom : 1;
    let next = dimensions;
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      next = { width: dimensions.width + internalLengthToPaper((pointer.clientX - origin.x) / zoom, 'mm', frame),
        height: dimensions.height + internalLengthToPaper((pointer.clientY - origin.y) / zoom, 'mm', frame) };
      publish(resizePagePaper(collection, frameId, next, 'mm', { coverFrameId: start.coverFrameId }), true);
    };
    const reset = () => {
      target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel); target.removeEventListener('keydown', key, true);
      target.removeEventListener('blur', cancel);
      if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
      scope.cleanup = null; scope.busy = false; publish(null, false);
    };
    const cancel = () => reset();
    const key = (keyboard: KeyboardEvent) => {
      if (keyboard.key === 'Escape') { keyboard.preventDefault(); keyboard.stopPropagation(); cancel(); }
      if ((keyboard.ctrlKey || keyboard.metaKey) && keyboard.key.toLowerCase() === 'z') { keyboard.preventDefault(); keyboard.stopImmediatePropagation(); }
    };
    const end = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      move(pointer); reset();
      if (Math.abs(next.width - dimensions.width) < 0.001 && Math.abs(next.height - dimensions.height) < 0.001) return;
      void commit((before) => resizePagePaper(before, frameId, next, 'mm', {
        coverFrameId: latest.current.coverFrameId,
      }), collection);
    };
    scope.cleanup = cancel;
    publish(collection, true);
    element.setPointerCapture?.(pointerId);
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel); target.addEventListener('keydown', key, true); target.addEventListener('blur', cancel);
  }, [scope, commit]);

  const collection = preview || options.collection;
  const placements = useMemo(() => preview && options.collection
    ? projectWallPlacements(options.placements, options.objects, options.collection, preview, options.coordinateContract)
    : options.placements, [preview, options.collection, options.placements, options.objects, options.coordinateContract]);
  return { collection, placements, busy, enabled: options.enabled, begin, setPreset, resize, restore,
    error: error?.scope === scope ? error.message : null,
    selectedFrameId: selected?.scope === scope ? selected.id : null,
    selectFrame: (id: string) => setSelected({ scope, id }),
  };
}
