import { useEffect, useMemo, useRef, useState } from 'react';
import { createTypographyDomLineMeasurer } from '../typographyDomMeasurementService';
import { resolveDocumentPageFlowPlan } from '../documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts } from '../notePageFlowService';
import { normalizePageFrameCollection } from '../pageFrameCollectionService';
import type { CoordinateContract } from '../placementContractService';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { DocumentTypographyProfile, PageFrameCollectionModel, PageFrameModel } from '../types';

export function useNotePageFlow(input: {
  noteId?: string; enabled: boolean; coordinateContract?: CoordinateContract;
  coverFrameId?: string | null;
  blocks: NoteBlock[]; layouts: Record<string, BlockBoxLayout>; pageFrames: PageFrameModel[];
  collection: PageFrameCollectionModel | null; typography: DocumentTypographyProfile;
  textDrafts: Record<string, string>; flowDrafts: Record<string, TextBlockContentV1>;
  saveCollection: (collection: PageFrameCollectionModel) => void | Promise<void>;
  persistLayout: (block: NoteBlock, layout: BlockBoxLayout) => void | boolean | Promise<void | boolean>;
}) {
  const [measurementRevision, setMeasurementRevision] = useState(0);
  const [persistenceRevision, setPersistenceRevision] = useState(0);
  const measurer = useMemo(() => typeof document === 'undefined' ? undefined
    : createTypographyDomLineMeasurer(document), []);
  useEffect(() => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    const invalidate = () => { measurer?.invalidate(); setMeasurementRevision((value) => value + 1); };
    fonts?.addEventListener?.('loadingdone', invalidate);
    return () => { fonts?.removeEventListener?.('loadingdone', invalidate); measurer?.dispose(); };
  }, [measurer]);
  const blocks = useMemo(() => noteBlocksToPageFlow(input.blocks, input.layouts, input.textDrafts, input.flowDrafts),
    [input.blocks, input.layouts, input.textDrafts, input.flowDrafts]);
  const plan = useMemo(() => input.coordinateContract === 'v2'
    && input.pageFrames.some((frame) => frame.id !== input.coverFrameId && frame.templateId !== 'screen_note') ? resolveDocumentPageFlowPlan({
    collection: normalizePageFrameCollection(input.collection || {
      pageFrames: input.pageFrames, primaryFrameId: input.pageFrames[0]?.id || null,
    }), blocks, coverFrameId: input.coverFrameId, documentTypography: input.typography, coordinateContract: input.coordinateContract,
    measureTextLines: measurer,
  }) : undefined, [blocks, input.collection, input.pageFrames, input.coverFrameId, input.typography, input.coordinateContract, measurer, measurementRevision]);
  const layouts = useMemo(() => plan ? pageFlowFirstLayouts(plan, input.layouts) : input.layouts, [plan, input.layouts]);
  const latest = useRef(input);
  latest.current = input;
  const pending = useRef(false);
  const completed = useRef('');
  const planSignature = JSON.stringify([input.noteId,
    plan?.appendedFrameIds.length ? plan.collection : null, plan?.placementUpdates]);
  const latestSignature = useRef(planSignature);
  latestSignature.current = planSignature;
  useEffect(() => { completed.current = ''; }, [input.noteId]);
  useEffect(() => {
    if (!plan || !input.enabled || pending.current) return;
    const signature = planSignature;
    if (completed.current === signature || (!plan.appendedFrameIds.length && !plan.placementUpdates.length)) return;
    const session = input.noteId;
    pending.current = true;
    void (async () => {
      // Existing placement writers require their target frames to exist first.
      if (plan.appendedFrameIds.length) await latest.current.saveCollection(plan.collection);
      for (const update of plan.placementUpdates) {
        if (latest.current.noteId !== session || !latest.current.enabled || latestSignature.current !== signature) return;
        const block = latest.current.blocks.find((entry) => entry.id === update.blockId);
        if (block && await latest.current.persistLayout(block, update.layout) === false) {
          completed.current = signature;
          return;
        }
      }
      completed.current = signature;
    })().catch(() => { completed.current = signature; }).finally(() => {
      pending.current = false;
      setPersistenceRevision((value) => value + 1);
    });
  }, [input.enabled, input.noteId, plan, planSignature, persistenceRevision]);
  return { plan, layouts };
}
