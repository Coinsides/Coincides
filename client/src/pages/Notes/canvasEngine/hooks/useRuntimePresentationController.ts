import { useCallback } from 'react';
import {
  useNoteCanvasLayerProps,
  type UseNoteCanvasLayerPropsInput,
} from './useNoteCanvasLayerProps';
import {
  useRuntimeFrameModelController,
  type UseRuntimeFrameModelControllerOptions,
} from './useRuntimeFrameModelController';
import {
  deletePageFrameFromCollection,
  duplicatePageFrame,
  createPageFrameCollectionSeed,
  insertPageFrameAfter,
  selectPageFrame,
  setPrimaryPageFrame,
} from '../pageFrameCollectionService';
import {
  appendPageFrameToStack,
  createPageStackForFrame,
  detachPageFrameFromStack,
  mergePageStacks,
  resolvePageStackContext,
  setPageStackCollapsed,
  splitPageStackAtFrame,
} from '../pageStackCollectionService';
import type {
  CanvasWorldModel,
  PageFrameCollectionModel,
  PageFrameModel,
} from '../types';

export type UseRuntimePresentationControllerOptions =
  UseRuntimeFrameModelControllerOptions &
  Omit<
    UseNoteCanvasLayerPropsInput,
    | 'exportPreview'
    | 'noteCanvasRuntime'
    | 'pageContentHeight'
    | 'pageFrameCollection'
    | 'pageFrames'
    | 'primaryPageFrameId'
    | 'primaryPageFrameX'
    | 'primaryPageFrameWidth'
    | 'selectedPageFrameId'
    | 'onCreatePageFrame'
    | 'onCreatePageStack'
    | 'onAddPageBelow'
    | 'onDeletePageFrame'
    | 'onDetachPageFromStack'
    | 'onDuplicatePageFrame'
    | 'onInsertPageFrame'
    | 'onSelectPageFrame'
    | 'onSetPrimaryPageFrame'
    | 'onSplitPageStackAtFrame'
    | 'onMergePageStackWithPrevious'
    | 'onTogglePageStackCollapse'
  > & {
    onFocusPageFrame: (pageFrame: PageFrameModel, world: CanvasWorldModel) => void;
    onSavePageFrameCollection: (collection: PageFrameCollectionModel) => void | Promise<void>;
  };

export function useRuntimePresentationController(
  options: UseRuntimePresentationControllerOptions,
) {
  const {
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    primaryPageFrame,
    runtimePageFrameCollection,
  } = useRuntimeFrameModelController(options);
  const currentPageFrameCollection: PageFrameCollectionModel = {
    pageFrames: noteCanvasRuntime.pageFrames,
    pageStacks: options.pageFrameCollection?.pageStacks || noteCanvasRuntime.pageStacks,
    primaryFrameId: noteCanvasRuntime.primaryPageFrame?.id || null,
    primaryStackId: options.pageFrameCollection?.primaryStackId || noteCanvasRuntime.pageStacks[0]?.id || null,
    selectedFrameId: options.pageFrameCollection?.selectedFrameId || noteCanvasRuntime.primaryPageFrame?.id || null,
    selectedStackId: options.pageFrameCollection?.selectedStackId || null,
  };

  const focusPageFrame = useCallback((frameId: string, collection = currentPageFrameCollection) => {
    const pageFrame = collection.pageFrames.find((frame) => frame.id === frameId);
    if (!pageFrame) return;
    options.onFocusPageFrame(pageFrame, noteCanvasRuntime.world);
  }, [currentPageFrameCollection, noteCanvasRuntime.world, options]);

  const handleCreatePageFrame = useCallback(() => {
    if (options.note?.page_format === 'screen_note') return;
    const afterFrameId = currentPageFrameCollection.selectedFrameId
      || currentPageFrameCollection.primaryFrameId
      || currentPageFrameCollection.pageFrames[currentPageFrameCollection.pageFrames.length - 1]?.id
      || null;
    if (!afterFrameId) {
      const seedCollection = createPageFrameCollectionSeed();
      void options.onSavePageFrameCollection(seedCollection);
      if (seedCollection.selectedFrameId) focusPageFrame(seedCollection.selectedFrameId, seedCollection);
      return;
    }
    const nextCollection = insertPageFrameAfter(currentPageFrameCollection, afterFrameId);
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleCreatePageStack = useCallback(() => {
    if (options.note?.page_format === 'screen_note') return;
    const afterFrameId = currentPageFrameCollection.selectedFrameId
      || currentPageFrameCollection.primaryFrameId
      || currentPageFrameCollection.pageFrames[currentPageFrameCollection.pageFrames.length - 1]?.id
      || null;
    const withFrame = afterFrameId
      ? insertPageFrameAfter(currentPageFrameCollection, afterFrameId)
      : createPageFrameCollectionSeed();
    const createdFrameId = withFrame.selectedFrameId || withFrame.pageFrames[0]?.id || null;
    const nextCollection = createdFrameId
      ? createPageStackForFrame(withFrame, createdFrameId, {
        createdFrom: 'user_created',
      })
      : withFrame;
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleAddPageBelow = useCallback((frameId: string) => {
    if (options.note?.page_format === 'screen_note') return;
    const context = resolvePageStackContext(currentPageFrameCollection, frameId);
    if (context) {
      const nextCollection = appendPageFrameToStack(currentPageFrameCollection, context.stack.id, frameId);
      void options.onSavePageFrameCollection(nextCollection);
      if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
      return;
    }

    const stackedCollection = createPageStackForFrame(currentPageFrameCollection, frameId, {
      createdFrom: 'user_created',
    });
    const newContext = resolvePageStackContext(stackedCollection, frameId);
    if (!newContext) return;
    const nextCollection = appendPageFrameToStack(stackedCollection, newContext.stack.id, frameId);
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleDetachPageFromStack = useCallback((frameId: string) => {
    const nextCollection = detachPageFrameFromStack(currentPageFrameCollection, frameId);
    void options.onSavePageFrameCollection(nextCollection);
    focusPageFrame(frameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleSplitPageStackAtFrame = useCallback((frameId: string) => {
    const nextCollection = splitPageStackAtFrame(currentPageFrameCollection, frameId);
    void options.onSavePageFrameCollection(nextCollection);
    focusPageFrame(frameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleMergePageStackWithPrevious = useCallback((stackId: string) => {
    const pageStacks = currentPageFrameCollection.pageStacks || [];
    const sourceIndex = pageStacks.findIndex((stack) => stack.id === stackId);
    if (sourceIndex <= 0) return;
    const targetStack = pageStacks[sourceIndex - 1];
    if (!targetStack) return;
    const nextCollection = mergePageStacks(currentPageFrameCollection, targetStack.id, stackId);
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleTogglePageStackCollapse = useCallback((frameId: string) => {
    const context = resolvePageStackContext(currentPageFrameCollection, frameId);
    if (!context) return;
    const nextCollection = setPageStackCollapsed(
      currentPageFrameCollection,
      context.stack.id,
      !context.stack.collapsed,
    );
    void options.onSavePageFrameCollection(nextCollection);
  }, [currentPageFrameCollection, options]);

  const handleInsertPageFrame = useCallback((afterFrameId: string) => {
    if (options.note?.page_format === 'screen_note') return;
    const nextCollection = insertPageFrameAfter(currentPageFrameCollection, afterFrameId);
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleDuplicatePageFrame = useCallback((frameId: string) => {
    if (options.note?.page_format === 'screen_note') return;
    const nextCollection = duplicatePageFrame(currentPageFrameCollection, frameId);
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleSetPrimaryPageFrame = useCallback((frameId: string) => {
    const nextCollection = setPrimaryPageFrame(currentPageFrameCollection, frameId);
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const handleDeletePageFrame = useCallback((frameId: string) => {
    if (options.note?.page_format === 'screen_note') return;
    void options.onSavePageFrameCollection(deletePageFrameFromCollection(currentPageFrameCollection, frameId));
  }, [currentPageFrameCollection, options]);

  const handleSelectPageFrame = useCallback((frameId: string) => {
    const nextCollection = selectPageFrame(currentPageFrameCollection, frameId);
    void options.onSavePageFrameCollection(nextCollection);
    if (nextCollection.selectedFrameId) focusPageFrame(nextCollection.selectedFrameId, nextCollection);
  }, [currentPageFrameCollection, focusPageFrame, options]);

  const layerProps = useNoteCanvasLayerProps({
    ...options,
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    pageFrameCollection: currentPageFrameCollection,
    pageFrames: noteCanvasRuntime.pageFrames,
    primaryPageFrameId: noteCanvasRuntime.primaryPageFrame?.id || null,
    primaryPageFrameX: primaryPageFrame?.x || 0,
    primaryPageFrameWidth: primaryPageFrame?.width || 0,
    selectedPageFrameId: currentPageFrameCollection.selectedFrameId ?? null,
    onCreatePageFrame: handleCreatePageFrame,
    onCreatePageStack: handleCreatePageStack,
    onAddPageBelow: handleAddPageBelow,
    onDeletePageFrame: handleDeletePageFrame,
    onDetachPageFromStack: handleDetachPageFromStack,
    onDuplicatePageFrame: handleDuplicatePageFrame,
    onInsertPageFrame: handleInsertPageFrame,
    onSelectPageFrame: handleSelectPageFrame,
    onSetPrimaryPageFrame: handleSetPrimaryPageFrame,
    onSplitPageStackAtFrame: handleSplitPageStackAtFrame,
    onMergePageStackWithPrevious: handleMergePageStackWithPrevious,
    onTogglePageStackCollapse: handleTogglePageStackCollapse,
  });

  return {
    layerProps,
    runtimePageFrameCollection,
  };
}
