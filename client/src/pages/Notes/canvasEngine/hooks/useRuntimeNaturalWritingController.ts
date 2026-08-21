import { useCallback, type KeyboardEvent } from 'react';
import {
  useCanvasSurfacePointerController,
  type UseCanvasSurfacePointerControllerOptions,
} from './useCanvasSurfacePointerController';
import {
  useDraftBlockController,
  type DraftSessionAuthority,
  type UseDraftBlockControllerOptions,
} from './useDraftBlockController';
import {
  useSlashCommandController,
  type UseSlashCommandControllerOptions,
} from './useSlashCommandController';
import {
  selectPageFrame,
} from '../pageFrameCollectionService';
import {
  appendPageFrameToStack,
} from '../pageStackCollectionService';
import {
  resolvePageStackContentFlowPlan,
} from '../pageStackContentFlowService';
import { DEFAULT_PRIMARY_PAGE_FRAME } from '../engineModel';
import {
  projectPageFrameLocalLayoutToCanvasLayout,
} from '../placementService';
import { getPageFrameContentRect } from '../pageFrameService';
import type { BlockBoxLayout } from '../runtimeLayout';
import {
  shouldCreateDurableDraftFromInput,
} from '../draftBlockLifecycleReducer';
import type { DraftRecoveryReceipt } from '../draftBlockPersistence';
import type {
  DocumentTypographyProfile,
  PageFrameCollectionModel,
  PageFrameModel,
} from '../types';

function findPrimaryPageFrame(collection: PageFrameCollectionModel | null | undefined): PageFrameModel | null {
  if (!collection) return null;
  return collection.pageFrames.find((frame) => frame.id === collection.primaryFrameId)
    || collection.pageFrames[0]
    || null;
}

export function findPageFrameForLayout(
  collection: PageFrameCollectionModel | null | undefined,
  layout: BlockBoxLayout,
  selectedFrameId?: string | null,
  isPageMode = true,
): PageFrameModel | null {
  if (!collection) return null;
  const layoutFrameId = layout.frame_id;
  const authorityFrameId = layout.surface_authority?.pageBoundary?.frameId;
  if (layoutFrameId && authorityFrameId && layoutFrameId !== authorityFrameId) return null;
  const requestedFrameId = layoutFrameId || authorityFrameId;
  if (requestedFrameId) {
    return collection.pageFrames.find((frame) => frame.id === requestedFrameId) || null;
  }
  if (isPageMode) return findPrimaryPageFrame(collection);
  return (selectedFrameId
    ? collection.pageFrames.find((frame) => frame.id === selectedFrameId)
    : null) || findPrimaryPageFrame(collection);
}

function shouldProjectPageFrameLocalLayout(
  layout: BlockBoxLayout,
  isPageMode: boolean,
): boolean {
  return Boolean(
    isPageMode
    && layout.surface !== 'canvas_workspace'
    && layout.coordinate_space !== 'canvas_world',
  );
}

export function canonicalizeDraftRecoveryReceiptForSurface({
  receipt,
  isPageMode,
  pageFrame,
  pageOffsetX,
}: {
  receipt: DraftRecoveryReceipt;
  isPageMode: boolean;
  pageFrame: PageFrameModel | null;
  pageOffsetX: number;
}): DraftRecoveryReceipt {
  if (!shouldProjectPageFrameLocalLayout(receipt.layout, isPageMode)) return receipt;
  const explicitFrameId = receipt.layout.frame_id
    || receipt.layout.surface_authority?.pageBoundary?.frameId;
  if (explicitFrameId && !pageFrame) return receipt;
  return {
    ...receipt,
    layout: projectPageFrameLocalLayoutToCanvasLayout({
      layout: receipt.layout,
      pageFrame: pageFrame || DEFAULT_PRIMARY_PAGE_FRAME,
      pageOffsetX,
    }),
  };
}

export function createPageFrameDraftSessionAuthority(
  pageFrame: PageFrameModel,
  pageOffsetX: number,
  layoutCoordinates: 'page_frame_local' | 'runtime_surface' = 'page_frame_local',
): DraftSessionAuthority {
  const snapshot: PageFrameModel = {
    ...pageFrame,
    contentInset: { ...pageFrame.contentInset },
  };
  const contentRect = getPageFrameContentRect(snapshot);
  return {
    frameId: snapshot.id,
    pageBoundary: {
      left: contentRect.x,
      right: contentRect.x + contentRect.width,
      frameId: snapshot.id,
    },
    canonicalizeLayout: (layout) => layoutCoordinates === 'runtime_surface'
      ? {
        ...layout,
        x: layout.x + pageOffsetX,
        y: layout.y,
        surface: 'formal_page',
        coordinate_space: 'canvas_world',
        frame_id: snapshot.id,
        boundary_role: 'inside',
        surface_authority: {
          coordinateSpace: 'canvas_world',
          pageBoundary: {
            left: contentRect.x,
            right: contentRect.x + contentRect.width,
            frameId: snapshot.id,
          },
        },
      }
      : {
        ...projectPageFrameLocalLayoutToCanvasLayout({
          layout,
          pageFrame: snapshot,
          pageOffsetX,
        }),
        boundary_role: 'inside',
      },
  };
}

export function resolvePageDraftSessionAuthority({
  collection,
  layout,
  selectedFrameId,
  pageOffsetX,
  pageFrameOverride,
  layoutCoordinates = 'page_frame_local',
}: {
  collection: PageFrameCollectionModel | null | undefined;
  layout: BlockBoxLayout;
  selectedFrameId?: string | null;
  pageOffsetX: number;
  pageFrameOverride?: PageFrameModel | null;
  layoutCoordinates?: 'page_frame_local' | 'runtime_surface';
}): DraftSessionAuthority | null {
  const layoutFrameId = layout.frame_id;
  const boundaryFrameId = layout.surface_authority?.pageBoundary?.frameId;
  if (layoutFrameId && boundaryFrameId && layoutFrameId !== boundaryFrameId) return null;
  const explicitFrameId = layoutFrameId || boundaryFrameId;
  if (pageFrameOverride) {
    if (explicitFrameId && explicitFrameId !== pageFrameOverride.id) return null;
    return createPageFrameDraftSessionAuthority(
      pageFrameOverride,
      pageOffsetX,
      layoutCoordinates,
    );
  }
  const pageFrame = findPageFrameForLayout(
    collection,
    layout,
    selectedFrameId,
    true,
  ) || (!explicitFrameId ? DEFAULT_PRIMARY_PAGE_FRAME : null);
  return pageFrame
    ? createPageFrameDraftSessionAuthority(pageFrame, pageOffsetX, layoutCoordinates)
    : null;
}

const canvasWorldSessionAuthority: DraftSessionAuthority = {
  frameId: null,
  pageBoundary: null,
  canonicalizeLayout: (layout) => (
    layout.coordinate_space === 'canvas_world'
      ? layout
      : {
        ...layout,
        surface: 'canvas_workspace',
        coordinate_space: 'canvas_world',
        boundary_role: 'outside',
      }
  ),
};

interface PageStackContentFlowRuntimeOptions {
  documentTypographyProfile?: DocumentTypographyProfile;
  pageFrameCollection?: PageFrameCollectionModel | null;
  selectedPageFrameId?: string | null;
  onFocusPageFrame?: (pageFrame: PageFrameModel) => void;
  onSavePageFrameCollection?: (collection: PageFrameCollectionModel) => Promise<void> | void;
}

export interface UseRuntimeNaturalWritingControllerOptions
  extends UseDraftBlockControllerOptions,
    Omit<
      UseSlashCommandControllerOptions,
      | 'activateDraft'
      | 'draftText'
      | 'draftTextRef'
      | 'persistDraft'
      | 'setDraftText'
    >,
    Omit<
      UseCanvasSurfacePointerControllerOptions,
      | 'activateDraft'
      | 'defaultDraftLayout'
    >,
    PageStackContentFlowRuntimeOptions {}

export function useRuntimeNaturalWritingController(options: UseRuntimeNaturalWritingControllerOptions) {
  const canonicalizeDraftLayoutForCurrentSurface = useCallback((layout: BlockBoxLayout) => {
    if (!options.surfacePolicy.isPageMode) {
      return canvasWorldSessionAuthority.canonicalizeLayout(layout);
    }
    const authority = resolvePageDraftSessionAuthority({
      collection: options.pageFrameCollection,
      layout,
      selectedFrameId: options.selectedPageFrameId,
      pageOffsetX: options.pageOffsetX,
    });
    return authority
      ? authority.canonicalizeLayout(layout)
      : layout;
  }, [options]);

  const createBlockWithPageFrameProjection = useCallback<UseDraftBlockControllerOptions['createBlock']>((
    template,
    text,
    createOptions,
  ) => {
    const shouldProjectPageLayout = Boolean(
      createOptions.layout
      && shouldProjectPageFrameLocalLayout(
        createOptions.layout,
        options.surfacePolicy.isPageMode,
      ),
    );
    if (!shouldProjectPageLayout || !createOptions.layout) {
      return options.createBlock(template, text, createOptions);
    }

    const pageFrame = findPageFrameForLayout(
      options.pageFrameCollection,
      createOptions.layout,
      options.selectedPageFrameId,
      options.surfacePolicy.isPageMode,
    );
    if (!pageFrame) return Promise.resolve(null);
    return options.createBlock(template, text, {
      ...createOptions,
      layout: projectPageFrameLocalLayoutToCanvasLayout({
        layout: createOptions.layout,
        pageFrame,
        pageOffsetX: options.pageOffsetX,
      }),
    });
  }, [options]);

  const saveDraftBlockPlacementWithPageFrameProjection = useCallback<
    UseDraftBlockControllerOptions['saveDraftBlockPlacement']
  >((block, layout, clientCreateKey, noteId) => {
    const shouldProject = shouldProjectPageFrameLocalLayout(
      layout,
      options.surfacePolicy.isPageMode,
    );
    const pageFrame = shouldProject
      ? findPageFrameForLayout(
        options.pageFrameCollection,
        layout,
        options.selectedPageFrameId,
        options.surfacePolicy.isPageMode,
      )
      : null;
    if (shouldProject && !pageFrame) return Promise.resolve(null);
    const projectedLayout = shouldProject
      ? projectPageFrameLocalLayoutToCanvasLayout({
        layout,
        pageFrame,
        pageOffsetX: options.pageOffsetX,
      })
      : layout;
    return options.saveDraftBlockPlacement(block, projectedLayout, clientCreateKey, noteId);
  }, [options]);

  const canonicalizeRecoveryReceiptWithPageFrameProjection = useCallback<
    NonNullable<UseDraftBlockControllerOptions['canonicalizeRecoveryReceipt']>
  >((receipt) => canonicalizeDraftRecoveryReceiptForSurface({
    receipt,
    isPageMode: options.surfacePolicy.isPageMode,
    pageFrame: findPageFrameForLayout(
      options.pageFrameCollection,
      receipt.layout,
      options.selectedPageFrameId,
      options.surfacePolicy.isPageMode,
    ),
    pageOffsetX: options.pageOffsetX,
  }), [options]);

  const finalizeDraftBlockWithPageFrameProjection = useCallback<
    UseDraftBlockControllerOptions['finalizeDraftBlock']
  >((receipt) => {
    const projectedReceipt = canonicalizeRecoveryReceiptWithPageFrameProjection(receipt);
    return options.finalizeDraftBlock(projectedReceipt);
  }, [canonicalizeRecoveryReceiptWithPageFrameProjection, options]);

  const {
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
    resizeDraftFromTextarea,
    resetDraft,
    setDraftText,
  } = useDraftBlockController({
    ...options,
    canonicalizeDraftLayout: canonicalizeDraftLayoutForCurrentSurface,
    canonicalizeRecoveryReceipt: canonicalizeRecoveryReceiptWithPageFrameProjection,
    createBlock: createBlockWithPageFrameProjection,
    finalizeDraftBlock: finalizeDraftBlockWithPageFrameProjection,
    saveDraftBlockPlacement: saveDraftBlockPlacementWithPageFrameProjection,
  });

  const activateWithImmutableAuthority = useCallback((
    layout: BlockBoxLayout | undefined,
    pageFrameOverride?: PageFrameModel | null,
    layoutCoordinates: 'page_frame_local' | 'runtime_surface' = 'page_frame_local',
  ) => {
    const nextLayout = layout || options.defaultDraftLayout;
    if (!options.surfacePolicy.isPageMode) {
      activateDraft(nextLayout, canvasWorldSessionAuthority);
      return;
    }
    const authority = resolvePageDraftSessionAuthority({
      collection: options.pageFrameCollection,
      layout: nextLayout,
      selectedFrameId: options.selectedPageFrameId,
      pageOffsetX: options.pageOffsetX,
      pageFrameOverride,
      layoutCoordinates,
    });
    if (!authority) return;
    activateDraft(nextLayout, authority);
  }, [activateDraft, options]);

  const activateDraftWithPageStackFlow = useCallback((layout?: BlockBoxLayout) => {
    if (layout || !options.pageFrameCollection) {
      activateWithImmutableAuthority(layout);
      return;
    }

    const currentFrameId = options.surfacePolicy.isPageMode
      ? options.pageFrameCollection.primaryFrameId
      : options.selectedPageFrameId
        || options.pageFrameCollection.selectedFrameId
        || options.pageFrameCollection.primaryFrameId;
    const plan = resolvePageStackContentFlowPlan({
      collection: options.pageFrameCollection,
      currentFrameId,
      draftLayout: options.defaultDraftLayout,
      draftText: draftTextRef.current || draftText,
      documentTypography: options.documentTypographyProfile,
      blockWorldOffsetX: options.pageOffsetX,
    });

    if (plan.kind === 'append_next_page') {
      const nextCollection = appendPageFrameToStack(
        options.pageFrameCollection,
        plan.stackId,
        plan.afterFrameId,
      );
      void options.onSavePageFrameCollection?.(nextCollection);
      const nextFrame = plan.targetFrameId
        ? nextCollection.pageFrames.find((frame) => frame.id === plan.targetFrameId)
        : nextCollection.pageFrames.find((frame) => frame.id === nextCollection.selectedFrameId);
      if (nextFrame) options.onFocusPageFrame?.(nextFrame);
      activateWithImmutableAuthority(plan.targetLayout, nextFrame || null, 'runtime_surface');
      return;
    }

    let targetFrame: PageFrameModel | null = null;
    if (plan.kind === 'move_to_existing_next_page' && plan.targetFrameId) {
      const nextCollection = selectPageFrame(options.pageFrameCollection, plan.targetFrameId);
      void options.onSavePageFrameCollection?.(nextCollection);
      const nextFrame = nextCollection.pageFrames.find((frame) => frame.id === plan.targetFrameId);
      if (nextFrame) options.onFocusPageFrame?.(nextFrame);
      targetFrame = nextFrame || null;
    } else if (plan.targetFrameId) {
      targetFrame = options.pageFrameCollection.pageFrames
        .find((frame) => frame.id === plan.targetFrameId) || null;
    }

    activateWithImmutableAuthority(
      plan.targetLayout,
      targetFrame,
      plan.kind === 'move_to_existing_next_page' ? 'runtime_surface' : 'page_frame_local',
    );
  }, [activateWithImmutableAuthority, options]);

  const {
    activeSlashCommandId,
    clearSlashTarget,
    handleBlockKeyDown,
    handleBlockTextChange,
    handleDraftChange: handleDraftChangeBase,
    handleDraftKeyDown: handleDraftKeyDownBase,
    handleSelectSlashCommand,
    slashCommands,
    slashTarget,
  } = useSlashCommandController({
    ...options,
    activateDraft: activateDraftWithPageStackFlow,
    draftOwnerReconciliation,
    draftText,
    draftTextRef,
    persistDraft,
    setDraftText,
  });

  const handleDraftChange = useCallback((
    value: string,
    caret: number,
    anchorElement?: HTMLElement | null,
  ) => {
    handleDraftChangeBase(value, caret, anchorElement);
    if (shouldCreateDurableDraftFromInput(value)) void persistDraft(value);
  }, [handleDraftChangeBase, persistDraft]);

  const handleDraftKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    handleDraftKeyDownBase(event);
    if (event.defaultPrevented || event.key !== 'Escape' || draftTextRef.current.trim()) return;
    event.preventDefault();
    clearSlashTarget();
    discardDraft();
  }, [clearSlashTarget, discardDraft, draftTextRef, handleDraftKeyDownBase]);

  const {
    handleBlockListMouseDown,
    handlePageSpaceDoubleClick,
    handleSurfacePointerDown,
  } = useCanvasSurfacePointerController({
    ...options,
    activateDraft: activateDraftWithPageStackFlow,
    defaultDraftLayout: options.defaultDraftLayout,
  });

  return {
    activateDraft: activateDraftWithPageStackFlow,
    clearSlashTarget,
    creatingDraft,
    discardDraft,
    draftActive,
    draftFocusReceipt,
    draftLayout,
    draftOwnerReconciliation,
    draftPhase,
    draftRef,
    draftText,
    handleBlockKeyDown,
    handleBlockListMouseDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftFocusReceipt,
    handleDraftKeyDown,
    handleDurableFocusReceipt,
    handlePageSpaceDoubleClick,
    handleSelectSlashCommand,
    handleSurfacePointerDown,
    placementPending,
    persistDraft,
    resetDraft,
    resizeDraftFromTextarea,
    slashCommands,
    slashTarget,
    activeSlashCommandId,
  };
}
