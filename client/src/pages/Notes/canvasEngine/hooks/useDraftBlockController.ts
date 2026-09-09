import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { TemplateOption } from '@/services/templateOptions';
import {
  idleInteraction,
  type RuntimeInteractionState,
} from '../interactionController';
import { resizeTextareaToContent } from '../measurementService';
import type { FieldValueRecord } from '../blockContentService';
import type { BlockBoxLayout } from '../runtimeLayout';
import { DEFAULT_BLOCK_HEIGHT } from '../runtimeLayout';
import type { Note, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import {
  createTextBlockContentV1,
  getTextFlowContent,
  projectTextFlowContent,
  replaceTextUnitText,
  TEXT_FLOW_CONTENT_KEY,
} from '../textFlowService';
import {
  hasMeaningfulDraftContent,
  INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
  transitionCreatingDraft,
  transitionDraftActive,
  transitionDraftFocusNonce,
  transitionDraftLayout,
  transitionDraftPhase,
  transitionDraftText,
  type DraftBlockLifecyclePhase,
} from '../draftBlockLifecycleReducer';
import {
  textFocusReceiptForBlock,
  textFocusReceiptForDraft,
  textFocusReceiptsEqual,
  type TextFocusReceipt,
  type TextOwnerReconciliation,
} from '../textFocusReceipt';
import {
  createDraftClientCreateKey,
  forgetDraftRecoveryReceipt,
  rememberDraftRecoveryReceipt,
  type DraftBlockCreateResult,
  type DraftRecoveryReceipt,
} from '../draftBlockPersistence';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';

const identityDraftLayout = (layout: BlockBoxLayout): BlockBoxLayout => layout;

export interface DraftSessionAuthority {
  readonly frameId: string | null;
  readonly pageBoundary: Readonly<{
    left: number;
    right: number;
    frameId?: string | null;
  }> | null;
  readonly canonicalizeLayout: (layout: BlockBoxLayout) => BlockBoxLayout;
}

export interface UseDraftBlockControllerOptions {
  createBlock: (
    template: TemplateOption,
    text: string,
    options: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
      layout?: BlockBoxLayout;
      silent?: boolean;
      clientCreateKey: string;
    },
  ) => Promise<DraftBlockCreateResult | null>;
  canonicalizeDraftLayout?: (layout: BlockBoxLayout) => BlockBoxLayout;
  canonicalizeRecoveryReceipt?: (receipt: DraftRecoveryReceipt) => DraftRecoveryReceipt;
  defaultDraftLayout: BlockBoxLayout;
  defaultTextTemplate: TemplateOption;
  discardDraftBlock: (noteId: string, clientCreateKey: string) => Promise<boolean>;
  finalizeDraftBlock: (receipt: DraftRecoveryReceipt) => Promise<boolean>;
  note: Note | null;
  onDraftFocusReceipt: (receipt: TextFocusReceipt) => void;
  onDraftPersisted?: (block: NoteBlock) => void;
  saveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; fieldValues?: FieldValueRecord; textFlow?: TextBlockContentV1 },
  ) => Promise<BlockSaveOutcome>;
  saveDraftBlockPlacement: (
    block: NoteBlock,
    layout: BlockBoxLayout,
    clientCreateKey: string,
    noteId: string,
  ) => Promise<NoteBlock | null>;
  setActiveBlockId: Dispatch<SetStateAction<string | null>>;
  setFocusBlockId: Dispatch<SetStateAction<string | null>>;
  setInteractionState: (state: RuntimeInteractionState) => void;
  setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
}

export function useDraftBlockController({
  canonicalizeDraftLayout = identityDraftLayout,
  canonicalizeRecoveryReceipt = (receipt) => receipt,
  createBlock,
  defaultDraftLayout,
  defaultTextTemplate,
  discardDraftBlock,
  finalizeDraftBlock,
  note,
  onDraftFocusReceipt,
  onDraftPersisted,
  saveBlock,
  saveDraftBlockPlacement,
  setActiveBlockId,
  setFocusBlockId,
  setInteractionState,
  setSelectedBlockId,
}: UseDraftBlockControllerOptions) {
  const [draftPhase, setDraftPhase] = useState<DraftBlockLifecyclePhase>(
    INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.phase,
  );
  const [draftActive, setDraftActive] = useState(INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftActive);
  const [draftText, setDraftTextState] = useState(INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftText);
  const [creatingDraft, setCreatingDraft] = useState(INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.creatingDraft);
  const [placementPending, setPlacementPending] = useState(false);
  const [draftFocusNonce, setDraftFocusNonce] = useState(
    INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftFocusNonce,
  );
  const [draftLayout, setDraftLayoutState] = useState<BlockBoxLayout | null>(
    INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftLayout,
  );
  const [draftFocusReceipt, setDraftFocusReceipt] = useState<TextFocusReceipt>(
    textFocusReceiptForDraft(0),
  );
  const [draftOwnerReconciliation, setDraftOwnerReconciliation] = useState<TextOwnerReconciliation | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const draftActiveRef = useRef(false);
  const draftTextRef = useRef('');
  const draftTextFlowRef = useRef<TextBlockContentV1 | null>(null);
  const draftLayoutRef = useRef<BlockBoxLayout | null>(null);
  const draftRevisionRef = useRef(0);
  const draftSessionRef = useRef(0);
  const draftFocusReceiptRef = useRef(draftFocusReceipt);
  const durableBlockRef = useRef<NoteBlock | null>(null);
  const durableSavedRevisionRef = useRef(0);
  const durablePlacementPersistedRef = useRef(false);
  const durableHistoryRecordedRef = useRef(false);
  const createAttemptedRef = useRef(false);
  const durableTemplateRef = useRef<TemplateOption | null>(null);
  const draftSessionAuthorityRef = useRef<DraftSessionAuthority | null>(null);
  const sessionCanonicalizeDraftLayoutRef = useRef(canonicalizeDraftLayout);
  const sessionCanonicalizeRecoveryReceiptRef = useRef(canonicalizeRecoveryReceipt);
  const sessionFinalizeDraftRef = useRef(finalizeDraftBlock);
  const clientCreateKeyRef = useRef<string | null>(null);
  const pendingReconciliationRef = useRef<TextOwnerReconciliation | null>(null);
  const persistPromiseRef = useRef<Promise<void> | null>(null);
  const requestGenerationRef = useRef(0);
  const noteIdRef = useRef(note?.id || null);

  const syncDraftTextFlow = useCallback((nextText: string) => {
    const current = draftTextFlowRef.current;
    const textUnitId = current?.units[0]?.id;
    if (!current || !textUnitId) return;
    draftTextFlowRef.current = replaceTextUnitText({
      textFlow: current,
      textUnitId,
      nextText,
    });
  }, []);

  const setDraftText = useCallback<Dispatch<SetStateAction<string>>>((value) => {
    if (typeof value !== 'function') {
      if (value !== draftTextRef.current) draftRevisionRef.current += 1;
      draftTextRef.current = value;
      syncDraftTextFlow(value);
    }
    setDraftTextState((current) => {
      const next = transitionDraftText(current, { type: 'set_text', value });
      if (typeof value === 'function') {
        draftTextRef.current = next;
        syncDraftTextFlow(next);
        if (next !== current) draftRevisionRef.current += 1;
      }
      return next;
    });
  }, [syncDraftTextFlow]);

  const setDraftLayout = useCallback<Dispatch<SetStateAction<BlockBoxLayout | null>>>((value) => {
    setDraftLayoutState((current) => {
      const next = transitionDraftLayout(current, { type: 'set_layout', value });
      draftLayoutRef.current = next;
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    const textarea = draftRef.current;
    if (!draftActive || !textarea) return;
    textarea.focus({ preventScroll: true });
    resizeTextareaToContent(textarea);
  }, [draftActive, draftFocusNonce]);

  useLayoutEffect(() => {
    resizeTextareaToContent(draftRef.current);
    if (!draftActive || !draftRef.current) return;
    const nextHeight = Math.max(DEFAULT_BLOCK_HEIGHT, draftRef.current.scrollHeight + 34);
    setDraftLayout((current) => (
      current && nextHeight > current.height + 2
        ? { ...current, height: nextHeight }
        : current
    ));
  }, [draftText, draftActive, setDraftLayout]);

  const clearLocalDraft = useCallback((
    action: 'discard' | 'persist_succeeded' | 'reset',
    options: { preserveReconciliation?: boolean } = {},
  ) => {
    const transition = { type: action } as const;
    setDraftPhase((current) => transitionDraftPhase(current, transition));
    setDraftTextState((current) => transitionDraftText(current, transition));
    draftTextRef.current = '';
    draftTextFlowRef.current = null;
    draftRevisionRef.current = 0;
    setDraftActive((current) => transitionDraftActive(current, transition));
    draftActiveRef.current = false;
    setDraftLayoutState((current) => transitionDraftLayout(current, transition));
    draftLayoutRef.current = null;
    if (!options.preserveReconciliation) setDraftOwnerReconciliation(null);
    pendingReconciliationRef.current = null;
    durableBlockRef.current = null;
    durableSavedRevisionRef.current = 0;
    durablePlacementPersistedRef.current = false;
    durableHistoryRecordedRef.current = false;
    createAttemptedRef.current = false;
    durableTemplateRef.current = null;
    draftSessionAuthorityRef.current = null;
    sessionCanonicalizeDraftLayoutRef.current = identityDraftLayout;
    clientCreateKeyRef.current = null;
    setPlacementPending(false);
  }, []);

  const discardDraft = useCallback(async () => {
    if (hasMeaningfulDraftContent(draftTextRef.current)) return;
    const discardedNoteId = noteIdRef.current;
    const clientCreateKey = clientCreateKeyRef.current;
    requestGenerationRef.current += 1;
    persistPromiseRef.current = null;
    setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'discard' }));
    clearLocalDraft('discard');
    setInteractionState(idleInteraction());
    if (discardedNoteId && clientCreateKey) {
      const discarded = await discardDraftBlock(discardedNoteId, clientCreateKey);
      if (discarded) forgetDraftRecoveryReceipt(clientCreateKey);
    }
  }, [clearLocalDraft, discardDraftBlock, setInteractionState]);

  const resetDraft = useCallback(() => {
    const discardedNoteId = noteIdRef.current;
    const clientCreateKey = clientCreateKeyRef.current;
    const pendingPersist = persistPromiseRef.current;
    const meaningfulText = draftTextRef.current.trimEnd();
    const textFlow = draftTextFlowRef.current;
    const canonicalizeAbandonedReceipt = sessionCanonicalizeRecoveryReceiptRef.current;
    const shouldCompensateEmpty = Boolean(
      discardedNoteId
      && clientCreateKey
      && createAttemptedRef.current
      && !hasMeaningfulDraftContent(meaningfulText)
      && !durableHistoryRecordedRef.current,
    );
    const shouldFinalizeMeaningful = Boolean(
      discardedNoteId
      && clientCreateKey
      && createAttemptedRef.current
      && hasMeaningfulDraftContent(meaningfulText)
      && !durableHistoryRecordedRef.current,
    );
    const recoveryReceipt = shouldFinalizeMeaningful && discardedNoteId && clientCreateKey
      ? canonicalizeAbandonedReceipt({
        version: 2,
        noteId: discardedNoteId,
        clientCreateKey,
        text: meaningfulText,
        contentJson: textFlow
          ? { body: meaningfulText, [TEXT_FLOW_CONTENT_KEY]: textFlow }
          : undefined,
        layout: sessionCanonicalizeDraftLayoutRef.current(
          draftLayoutRef.current || defaultDraftLayout,
        ),
        template: durableTemplateRef.current || defaultTextTemplate,
        queuedAt: new Date().toISOString(),
      } satisfies DraftRecoveryReceipt)
      : null;
    const finalizeAbandonedDraft = sessionFinalizeDraftRef.current;
    if (recoveryReceipt) rememberDraftRecoveryReceipt(recoveryReceipt);
    requestGenerationRef.current += 1;
    persistPromiseRef.current = null;
    setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'reset' }));
    clearLocalDraft('reset');
    if (shouldCompensateEmpty && discardedNoteId && clientCreateKey) {
      void discardDraftBlock(discardedNoteId, clientCreateKey).then((discarded) => {
        if (discarded) forgetDraftRecoveryReceipt(clientCreateKey);
      });
    } else if (recoveryReceipt) {
      void (async () => {
        try {
          await pendingPersist;
        } catch {
          // The same-key finalizer remains authoritative after a failed request.
        }
        const finalized = await finalizeAbandonedDraft(recoveryReceipt);
        if (finalized) forgetDraftRecoveryReceipt(recoveryReceipt.clientCreateKey);
      })();
    }
  }, [
    clearLocalDraft,
    defaultDraftLayout,
    defaultTextTemplate,
    discardDraftBlock,
  ]);

  useLayoutEffect(() => {
    const nextNoteId = note?.id || null;
    if (noteIdRef.current === nextNoteId) return;
    resetDraft();
    noteIdRef.current = nextNoteId;
  }, [note?.id, resetDraft]);

  const activateDraft = useCallback((
    layout?: BlockBoxLayout,
    sessionAuthority?: DraftSessionAuthority,
  ) => {
    const nextLayout = layout || defaultDraftLayout;
    const transition = { type: 'activate_local', layout: nextLayout } as const;
    setActiveBlockId(null);
    setSelectedBlockId(null);
    setInteractionState(idleInteraction());

    if (!draftActiveRef.current) {
      draftSessionRef.current += 1;
      const receipt = textFocusReceiptForDraft(draftSessionRef.current);
      draftFocusReceiptRef.current = receipt;
      setDraftFocusReceipt(receipt);
      draftTextRef.current = '';
      draftTextFlowRef.current = null;
      draftRevisionRef.current = 0;
      durableBlockRef.current = null;
      durableSavedRevisionRef.current = 0;
      durablePlacementPersistedRef.current = false;
      durableHistoryRecordedRef.current = false;
      createAttemptedRef.current = false;
      durableTemplateRef.current = null;
      const immutableAuthority = sessionAuthority
        ? {
          frameId: sessionAuthority.frameId,
          pageBoundary: sessionAuthority.pageBoundary
            ? Object.freeze({ ...sessionAuthority.pageBoundary })
            : null,
          canonicalizeLayout: sessionAuthority.canonicalizeLayout,
        } satisfies DraftSessionAuthority
        : null;
      draftSessionAuthorityRef.current = immutableAuthority
        ? Object.freeze(immutableAuthority)
        : null;
      sessionCanonicalizeDraftLayoutRef.current = immutableAuthority?.canonicalizeLayout
        || canonicalizeDraftLayout;
      sessionCanonicalizeRecoveryReceiptRef.current = canonicalizeRecoveryReceipt;
      sessionFinalizeDraftRef.current = finalizeDraftBlock;
      clientCreateKeyRef.current = createDraftClientCreateKey(
        note?.id || noteIdRef.current || 'unbound',
        draftSessionRef.current,
      );
      pendingReconciliationRef.current = null;
      setDraftOwnerReconciliation(null);
      setPlacementPending(false);
    }

    draftLayoutRef.current = nextLayout;
    draftActiveRef.current = true;
    setDraftPhase((current) => transitionDraftPhase(current, transition));
    setDraftLayoutState((current) => transitionDraftLayout(current, transition));
    setDraftActive((current) => transitionDraftActive(current, transition));
    setDraftFocusNonce((current) => transitionDraftFocusNonce(current, transition));
  }, [
    defaultDraftLayout,
    canonicalizeDraftLayout,
    canonicalizeRecoveryReceipt,
    finalizeDraftBlock,
    note?.id,
    setActiveBlockId,
    setInteractionState,
    setSelectedBlockId,
  ]);

  const handleDraftFocusReceipt = useCallback((receipt: TextFocusReceipt) => {
    if (!draftActiveRef.current || !textFocusReceiptsEqual(receipt, draftFocusReceiptRef.current)) return;
    setDraftPhase((current) => transitionDraftPhase(current, { type: 'focus_received' }));
    onDraftFocusReceipt(receipt);
  }, [onDraftFocusReceipt]);

  const handleDurableFocusReceipt = useCallback((receipt: TextFocusReceipt) => {
    const pending = pendingReconciliationRef.current;
    if (!pending || !textFocusReceiptsEqual(receipt, pending.to)) return;
    clearLocalDraft('persist_succeeded', { preserveReconciliation: true });
  }, [clearLocalDraft]);

  const persistDraft = useCallback((
    initialText?: string,
    explicitTemplate?: TemplateOption,
    options: { textFlow?: TextBlockContentV1; layout?: BlockBoxLayout } = {},
  ): Promise<void> => {
    if (!note || !draftActiveRef.current) return Promise.resolve();
    const initialValue = initialText ?? draftTextRef.current;
    const projectedTextFlow = options.textFlow
      ? projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: options.textFlow }, initialValue).plain_text
      : null;
    const requestedText = (projectedTextFlow ?? initialValue).trimEnd();
    if (!hasMeaningfulDraftContent(requestedText) && !explicitTemplate) return Promise.resolve();
    setDraftPhase((current) => transitionDraftPhase(current, { type: 'meaningful_input' }));
    const template = explicitTemplate || defaultTextTemplate;
    if (!template) return Promise.resolve();
    durableTemplateRef.current = template;
    const clientCreateKey = clientCreateKeyRef.current
      || createDraftClientCreateKey(note.id, draftSessionRef.current);
    clientCreateKeyRef.current = clientCreateKey;

    if (options.textFlow) draftTextFlowRef.current = options.textFlow;
    if (options.layout) draftLayoutRef.current = options.layout;
    if (persistPromiseRef.current) return persistPromiseRef.current;

    const requestGeneration = requestGenerationRef.current;
    const requestSession = draftSessionRef.current;
    const requestNoteId = note.id;
    const requestIsCurrent = () => (
      requestGenerationRef.current === requestGeneration
      && draftSessionRef.current === requestSession
      && noteIdRef.current === requestNoteId
      && draftActiveRef.current
    );

    setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'begin_draft_persist' }));
    const run = (async () => {
      let persistedBlock = durableBlockRef.current;
      let textFlow = draftTextFlowRef.current;
      if (!persistedBlock) {
        const revisionCreated = draftRevisionRef.current;
        textFlow = options.textFlow
          || (!explicitTemplate ? createTextBlockContentV1(requestedText, 'paragraph') : null);
        createAttemptedRef.current = true;
        const authoritativeLayout = sessionCanonicalizeDraftLayoutRef.current(
          options.layout || draftLayoutRef.current || defaultDraftLayout,
        );
        const createResult = await createBlock(template, requestedText, {
          contentJson: textFlow
            ? {
              body: requestedText,
              [TEXT_FLOW_CONTENT_KEY]: textFlow,
            }
            : undefined,
          layout: authoritativeLayout,
          silent: true,
          clientCreateKey,
        });
        if (!createResult || !requestIsCurrent()) return;
        persistedBlock = createResult.block;
        durableBlockRef.current = createResult.block;
        // A same-key replay returns the authoritative snapshot from the first
        // committed POST, which can predate the current local revision. Force
        // the latest-save loop even when no keystroke landed during this retry.
        durableSavedRevisionRef.current = createResult.reused ? -1 : revisionCreated;
        durablePlacementPersistedRef.current = createResult.placementPersisted;
        setPlacementPending(!createResult.placementPersisted);
        if (!createResult.placementPersisted) return;
      } else if (!durablePlacementPersistedRef.current) {
        const placed = await saveDraftBlockPlacement(
          persistedBlock,
          sessionCanonicalizeDraftLayoutRef.current(
            options.layout || draftLayoutRef.current || defaultDraftLayout,
          ),
          clientCreateKey,
          requestNoteId,
        );
        if (!placed || !requestIsCurrent()) return;
        persistedBlock = placed;
        durableBlockRef.current = placed;
        durablePlacementPersistedRef.current = true;
        setPlacementPending(false);
      }

      let savedRevision = durableSavedRevisionRef.current;
      while (requestIsCurrent() && savedRevision !== draftRevisionRef.current) {
        const revisionToSave = draftRevisionRef.current;
        const latestText = draftTextRef.current.trimEnd();
        if (!hasMeaningfulDraftContent(latestText)) break;
        const latestTextFlow = draftTextFlowRef.current
          || (!explicitTemplate ? createTextBlockContentV1(latestText, 'paragraph') : null);
        const saveOutcome = await saveBlock(
          persistedBlock,
          latestText,
          latestTextFlow ? { silent: true, textFlow: latestTextFlow } : { silent: true },
        );
        if (saveOutcome.status !== 'saved' || !requestIsCurrent()) return;
        persistedBlock = saveOutcome.block;
        durableBlockRef.current = saveOutcome.block;
        savedRevision = revisionToSave;
        durableSavedRevisionRef.current = revisionToSave;
      }
      if (!requestIsCurrent()) return;
      if (!hasMeaningfulDraftContent(draftTextRef.current)) {
        requestGenerationRef.current += 1;
        persistPromiseRef.current = null;
        setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'discard' }));
        clearLocalDraft('discard');
        setInteractionState(idleInteraction());
        await discardDraftBlock(requestNoteId, clientCreateKey);
        return;
      }

      const persistedFlow = getTextFlowContent(persistedBlock.content_json)
        || draftTextFlowRef.current
        || textFlow;
      const durableReceipt = textFocusReceiptForBlock(
        persistedBlock.id,
        persistedFlow?.units[0]?.id || draftFocusReceiptRef.current.textUnitId,
      );
      const selectionStart = draftRef.current?.selectionStart ?? draftTextRef.current.length;
      const selectionEnd = draftRef.current?.selectionEnd ?? selectionStart;
      const reconciliation: TextOwnerReconciliation = {
        from: draftFocusReceiptRef.current,
        to: durableReceipt,
        selectionStart,
        selectionEnd,
      };
      pendingReconciliationRef.current = reconciliation;
      setDraftOwnerReconciliation(reconciliation);
      setDraftPhase((current) => transitionDraftPhase(current, { type: 'persisted_reconciled' }));
      setFocusBlockId(persistedBlock.id);
      if (!durableHistoryRecordedRef.current) {
        durableHistoryRecordedRef.current = true;
        onDraftPersisted?.(persistedBlock);
      }
    })();

    let tracked: Promise<void>;
    tracked = run.finally(() => {
      if (persistPromiseRef.current !== tracked) return;
      persistPromiseRef.current = null;
      setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'create_finished' }));
    });
    persistPromiseRef.current = tracked;
    return tracked;
  }, [
    createBlock,
    clearLocalDraft,
    defaultDraftLayout,
    defaultTextTemplate,
    discardDraftBlock,
    note,
    onDraftPersisted,
    saveBlock,
    saveDraftBlockPlacement,
    setFocusBlockId,
    setInteractionState,
  ]);

  const resizeDraftFromTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    resizeTextareaToContent(textarea);
    const nextHeight = Math.max(DEFAULT_BLOCK_HEIGHT, textarea.scrollHeight + 34);
    setDraftLayout((current) => (current ? { ...current, height: nextHeight } : current));
  }, [setDraftLayout]);

  return {
    whenDraftIdle: () => persistPromiseRef.current || Promise.resolve(),
    activateDraft,
    creatingDraft,
    discardDraft,
    draftActive,
    draftFocusReceipt,
    draftLayout,
    draftOwnerReconciliation,
    draftPhase,
    draftRef,
    draftText,
    draftTextRef,
    handleDraftFocusReceipt,
    handleDurableFocusReceipt,
    placementPending,
    persistDraft,
    resetDraft,
    resizeDraftFromTextarea,
    setDraftLayout,
    setDraftText,
  };
}
