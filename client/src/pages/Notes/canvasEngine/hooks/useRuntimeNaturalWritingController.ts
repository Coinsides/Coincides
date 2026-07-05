import { useCallback } from 'react';
import {
  useCanvasSurfacePointerController,
  type UseCanvasSurfacePointerControllerOptions,
} from './useCanvasSurfacePointerController';
import {
  useDraftBlockController,
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
import {
  projectPageFrameLocalLayoutToCanvasLayout,
} from '../placementService';
import type { BlockBoxLayout } from '../runtimeLayout';
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
  const createBlockWithPageFrameProjection = useCallback<UseDraftBlockControllerOptions['createBlock']>((
    template,
    text,
    createOptions = {},
  ) => {
    const shouldProjectPageLayout = Boolean(
      options.surfacePolicy.isPageMode
      && createOptions.layout
      && createOptions.layout.surface !== 'canvas_workspace',
    );
    if (!shouldProjectPageLayout || !createOptions.layout) {
      return options.createBlock(template, text, createOptions);
    }

    const pageFrame = findPrimaryPageFrame(options.pageFrameCollection);
    return options.createBlock(template, text, {
      ...createOptions,
      layout: projectPageFrameLocalLayoutToCanvasLayout({
        layout: createOptions.layout,
        pageFrame,
        pageOffsetX: options.pageOffsetX,
      }),
    });
  }, [options]);

  const {
    activateDraft,
    creatingDraft,
    discardDraft,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    draftTextRef,
    persistDraft,
    resizeDraftFromTextarea,
    setDraftText,
  } = useDraftBlockController({
    ...options,
    createBlock: createBlockWithPageFrameProjection,
  });

  const activateDraftWithPageStackFlow = useCallback((layout?: BlockBoxLayout) => {
    if (layout || !options.pageFrameCollection) {
      activateDraft(layout);
      return;
    }

    const currentFrameId = options.selectedPageFrameId
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
      activateDraft(plan.targetLayout);
      return;
    }

    if (plan.kind === 'move_to_existing_next_page' && plan.targetFrameId) {
      const nextCollection = selectPageFrame(options.pageFrameCollection, plan.targetFrameId);
      void options.onSavePageFrameCollection?.(nextCollection);
      const nextFrame = nextCollection.pageFrames.find((frame) => frame.id === plan.targetFrameId);
      if (nextFrame) options.onFocusPageFrame?.(nextFrame);
    }

    activateDraft(plan.targetLayout);
  }, [activateDraft, options]);

  const {
    activeSlashCommandId,
    clearSlashTarget,
    handleBlockKeyDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handleSelectSlashCommand,
    slashCommands,
    slashTarget,
  } = useSlashCommandController({
    ...options,
    activateDraft: activateDraftWithPageStackFlow,
    draftText,
    draftTextRef,
    persistDraft,
    setDraftText,
  });

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
    draftLayout,
    draftRef,
    draftText,
    handleBlockKeyDown,
    handleBlockListMouseDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handlePageSpaceDoubleClick,
    handleSelectSlashCommand,
    handleSurfacePointerDown,
    persistDraft,
    resizeDraftFromTextarea,
    slashCommands,
    slashTarget,
    activeSlashCommandId,
  };
}
