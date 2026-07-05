import type {
  PageFrameCollectionModel,
  PageFrameModel,
  PageStackCreatedFrom,
  PageStackModel,
} from './types';

export const DEFAULT_PAGE_STACK_GAP = 80;
export const DEFAULT_PAGE_STACK_COLLAPSED_PREVIEW_PAGES = 1;

type PageStackCreateOptions = {
  id?: string;
  displayName?: string;
  createdFrom?: PageStackCreatedFrom;
};

type AppendPageFrameOptions = {
  id?: string;
};

export type PageStackContext = {
  stack: PageStackModel;
  index: number;
  total: number;
  pageNumber: number;
  pageNumberLabel: string;
};

function nextPageStackId(existingStacks: PageStackModel[]): string {
  const existing = new Set(existingStacks.map((stack) => stack.id));
  let index = existingStacks.length + 1;
  let candidate = `page-stack-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `page-stack-${index}`;
  }
  return candidate;
}

function nextPageFrameId(pageFrames: PageFrameModel[]): string {
  const existing = new Set(pageFrames.map((frame) => frame.id));
  let index = pageFrames.length + 1;
  let candidate = `page-frame-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `page-frame-${index}`;
  }
  return candidate;
}

function validPageStack(item: unknown): item is PageStackModel {
  if (!item || typeof item !== 'object') return false;
  const stack = item as Partial<PageStackModel>;
  return typeof stack.id === 'string'
    && Array.isArray(stack.frameIds);
}

function normalizePageStack(
  stack: PageStackModel,
  validFrameIds: Set<string>,
  claimedFrameIds: Set<string>,
): PageStackModel | null {
  const frameIds = stack.frameIds.filter((frameId) => (
    validFrameIds.has(frameId) && !claimedFrameIds.has(frameId)
  ));
  if (frameIds.length === 0) return null;
  frameIds.forEach((frameId) => claimedFrameIds.add(frameId));

  const primaryFrameId = frameIds.includes(stack.primaryFrameId || '')
    ? stack.primaryFrameId || frameIds[0]!
    : frameIds[0]!;
  const selectedFrameId = frameIds.includes(stack.selectedFrameId || '')
    ? stack.selectedFrameId || primaryFrameId
    : primaryFrameId;
  const gap = Number.isFinite(stack.layout?.gap) ? stack.layout.gap : DEFAULT_PAGE_STACK_GAP;
  const collapsedPreviewPages = Number.isFinite(stack.layout?.collapsedPreviewPages)
    ? Math.max(1, Math.floor(stack.layout.collapsedPreviewPages))
    : DEFAULT_PAGE_STACK_COLLAPSED_PREVIEW_PAGES;
  const startAt = Number.isFinite(stack.numbering?.startAt)
    ? Math.max(1, Math.floor(stack.numbering.startAt))
    : 1;

  return {
    ...stack,
    displayName: stack.displayName || 'Page stack',
    frameIds,
    primaryFrameId,
    selectedFrameId,
    collapsed: Boolean(stack.collapsed),
    numbering: {
      enabled: stack.numbering?.enabled !== false,
      startAt,
    },
    layout: {
      direction: 'vertical',
      gap,
      collapsedPreviewPages,
    },
    createdFrom: stack.createdFrom || 'import',
  };
}

export function normalizePageStacks(
  collection: PageFrameCollectionModel | null | undefined,
): PageStackModel[] {
  const validFrameIds = new Set((collection?.pageFrames || []).map((frame) => frame.id));
  const claimedFrameIds = new Set<string>();
  return (collection?.pageStacks || [])
    .filter(validPageStack)
    .map((stack) => normalizePageStack(stack, validFrameIds, claimedFrameIds))
    .filter((stack): stack is PageStackModel => Boolean(stack));
}

export function normalizePageStacksWithFrameCoverage(
  collection: PageFrameCollectionModel | null | undefined,
): PageStackModel[] {
  const normalizedStacks = normalizePageStacks(collection);
  const claimedFrameIds = new Set(normalizedStacks.flatMap((stack) => stack.frameIds));
  const coveredStacks = [...normalizedStacks];

  (collection?.pageFrames || []).forEach((pageFrame) => {
    if (claimedFrameIds.has(pageFrame.id)) return;
    const stack = createPageStackFromFrame(pageFrame, {
      id: nextPageStackId(coveredStacks),
      displayName: `Page stack ${coveredStacks.length + 1}`,
      createdFrom: 'import',
    });
    coveredStacks.push(stack);
    claimedFrameIds.add(pageFrame.id);
  });

  return normalizePageStacks({
    ...(collection || {
      pageFrames: [],
      primaryFrameId: null,
    }),
    pageStacks: coveredStacks,
  });
}

export function createPageStackFromFrame(
  pageFrame: PageFrameModel,
  options: PageStackCreateOptions = {},
): PageStackModel {
  return {
    id: options.id || `page-stack-${pageFrame.id}`,
    displayName: options.displayName || 'Page stack 1',
    frameIds: [pageFrame.id],
    primaryFrameId: pageFrame.id,
    selectedFrameId: pageFrame.id,
    collapsed: false,
    numbering: {
      enabled: true,
      startAt: 1,
    },
    layout: {
      direction: 'vertical',
      gap: DEFAULT_PAGE_STACK_GAP,
      collapsedPreviewPages: DEFAULT_PAGE_STACK_COLLAPSED_PREVIEW_PAGES,
    },
    createdFrom: options.createdFrom || 'a4_note_seed',
  };
}

function findStackByFrameId(
  pageStacks: PageStackModel[],
  frameId: string,
): PageStackModel | null {
  return pageStacks.find((stack) => stack.frameIds.includes(frameId)) || null;
}

function normalizeStackSelection(
  collection: PageFrameCollectionModel,
  pageStacks: PageStackModel[],
): PageFrameCollectionModel {
  const stackIds = new Set(pageStacks.map((stack) => stack.id));
  const primaryStackId = collection.primaryStackId && stackIds.has(collection.primaryStackId)
    ? collection.primaryStackId
    : pageStacks[0]?.id || null;
  const selectedStackId = collection.selectedStackId && stackIds.has(collection.selectedStackId)
    ? collection.selectedStackId
    : (collection.selectedFrameId
      ? findStackByFrameId(pageStacks, collection.selectedFrameId)?.id || primaryStackId
      : primaryStackId);

  return {
    ...collection,
    pageStacks,
    primaryStackId,
    selectedStackId,
  };
}

export function createPageStackForFrame(
  collection: PageFrameCollectionModel,
  frameId: string,
  options: PageStackCreateOptions = {},
): PageFrameCollectionModel {
  const pageStacks = normalizePageStacks(collection);
  const pageFrame = collection.pageFrames.find((frame) => frame.id === frameId);
  if (!pageFrame || findStackByFrameId(pageStacks, frameId)) {
    return normalizeStackSelection(collection, pageStacks);
  }
  const stack = createPageStackFromFrame(pageFrame, {
    id: options.id || nextPageStackId(pageStacks),
    displayName: options.displayName || `Page stack ${pageStacks.length + 1}`,
    createdFrom: options.createdFrom || 'user_created',
  });
  return normalizeStackSelection(
    {
      ...collection,
      selectedFrameId: frameId,
    },
    [...pageStacks, stack],
  );
}

function createAppendedFrame(
  source: PageFrameModel,
  pageFrames: PageFrameModel[],
  options: AppendPageFrameOptions,
): PageFrameModel {
  const requestedId = options.id;
  const id = requestedId && !pageFrames.some((frame) => frame.id === requestedId)
    ? requestedId
    : nextPageFrameId(pageFrames);
  return {
    ...source,
    id,
    role: 'secondary_page_frame',
    y: source.y + source.height + DEFAULT_PAGE_STACK_GAP,
  };
}

export function appendPageFrameToStack(
  collection: PageFrameCollectionModel,
  stackId: string,
  afterFrameId: string,
  options: AppendPageFrameOptions = {},
): PageFrameCollectionModel {
  const pageStacks = normalizePageStacks(collection);
  const stack = pageStacks.find((item) => item.id === stackId);
  const sourceIndex = collection.pageFrames.findIndex((frame) => frame.id === afterFrameId);
  const source = collection.pageFrames[sourceIndex];
  if (!stack || !source || !stack.frameIds.includes(afterFrameId)) {
    return normalizeStackSelection(collection, pageStacks);
  }

  const appendedFrame = createAppendedFrame(source, collection.pageFrames, options);
  const pageFrameInsertIndex = sourceIndex + 1;
  const stackFrameInsertIndex = stack.frameIds.indexOf(afterFrameId) + 1;
  const nextPageFrames = [
    ...collection.pageFrames.slice(0, pageFrameInsertIndex),
    appendedFrame,
    ...collection.pageFrames.slice(pageFrameInsertIndex),
  ];
  const nextStacks = pageStacks.map((item) => (
    item.id === stackId
      ? {
        ...item,
        frameIds: [
          ...item.frameIds.slice(0, stackFrameInsertIndex),
          appendedFrame.id,
          ...item.frameIds.slice(stackFrameInsertIndex),
        ],
        selectedFrameId: appendedFrame.id,
      }
      : item
  ));

  return normalizeStackSelection(
    {
      ...collection,
      pageFrames: nextPageFrames,
      selectedFrameId: appendedFrame.id,
      selectedStackId: stackId,
    },
    normalizePageStacks({
      ...collection,
      pageFrames: nextPageFrames,
      pageStacks: nextStacks,
    }),
  );
}

export function detachPageFrameFromStack(
  collection: PageFrameCollectionModel,
  frameId: string,
): PageFrameCollectionModel {
  const pageStacks = normalizePageStacks(collection);
  const sourceStack = findStackByFrameId(pageStacks, frameId);
  const pageFrame = collection.pageFrames.find((frame) => frame.id === frameId);
  if (!sourceStack || !pageFrame || sourceStack.frameIds.length <= 1) {
    return normalizeStackSelection(collection, pageStacks);
  }
  const remainingStacks = pageStacks
    .map((stack) => ({
      ...stack,
      frameIds: stack.frameIds.filter((id) => id !== frameId),
      primaryFrameId: stack.primaryFrameId === frameId ? null : stack.primaryFrameId,
      selectedFrameId: stack.selectedFrameId === frameId ? null : stack.selectedFrameId,
    }))
    .filter((stack) => stack.frameIds.length > 0);
  const detachedStack = createPageStackFromFrame(pageFrame, {
    id: nextPageStackId(remainingStacks),
    displayName: `Page stack ${remainingStacks.length + 1}`,
    createdFrom: 'user_created',
  });
  const nextStacks = [...remainingStacks, detachedStack];

  return normalizeStackSelection(
    {
      ...collection,
      selectedFrameId: frameId,
      selectedStackId: detachedStack.id,
    },
    normalizePageStacks({
      ...collection,
      pageStacks: nextStacks,
    }),
  );
}

export function splitPageStackAtFrame(
  collection: PageFrameCollectionModel,
  frameId: string,
): PageFrameCollectionModel {
  const pageStacks = normalizePageStacks(collection);
  const sourceStack = findStackByFrameId(pageStacks, frameId);
  if (!sourceStack) return normalizeStackSelection(collection, pageStacks);

  const splitIndex = sourceStack.frameIds.indexOf(frameId);
  if (splitIndex <= 0) return normalizeStackSelection(collection, pageStacks);

  const leadingFrameIds = sourceStack.frameIds.slice(0, splitIndex);
  const trailingFrameIds = sourceStack.frameIds.slice(splitIndex);
  if (leadingFrameIds.length === 0 || trailingFrameIds.length === 0) {
    return normalizeStackSelection(collection, pageStacks);
  }

  const leadingStack: PageStackModel = {
    ...sourceStack,
    frameIds: leadingFrameIds,
    primaryFrameId: leadingFrameIds.includes(sourceStack.primaryFrameId || '')
      ? sourceStack.primaryFrameId
      : leadingFrameIds[0]!,
    selectedFrameId: leadingFrameIds.includes(sourceStack.selectedFrameId || '')
      ? sourceStack.selectedFrameId || leadingFrameIds[0]!
      : leadingFrameIds[0]!,
  };
  const trailingStack: PageStackModel = {
    ...sourceStack,
    id: nextPageStackId(pageStacks),
    displayName: `Page stack ${pageStacks.length + 1}`,
    frameIds: trailingFrameIds,
    primaryFrameId: trailingFrameIds[0]!,
    selectedFrameId: frameId,
    collapsed: false,
    numbering: {
      ...sourceStack.numbering,
      startAt: 1,
    },
    layout: {
      ...sourceStack.layout,
    },
    createdFrom: 'user_created',
  };
  const nextStacks = pageStacks.flatMap((stack) => (
    stack.id === sourceStack.id ? [leadingStack, trailingStack] : [stack]
  ));

  return normalizeStackSelection(
    {
      ...collection,
      selectedFrameId: frameId,
      selectedStackId: trailingStack.id,
    },
    normalizePageStacks({
      ...collection,
      pageStacks: nextStacks,
    }),
  );
}

export function setPageStackCollapsed(
  collection: PageFrameCollectionModel,
  stackId: string,
  collapsed: boolean,
): PageFrameCollectionModel {
  const pageStacks = normalizePageStacks(collection);
  return normalizeStackSelection(
    collection,
    pageStacks.map((stack) => (
      stack.id === stackId
        ? { ...stack, collapsed }
        : stack
    )),
  );
}

export function mergePageStacks(
  collection: PageFrameCollectionModel,
  targetStackId: string,
  sourceStackId: string,
): PageFrameCollectionModel {
  if (targetStackId === sourceStackId) return collection;
  const pageStacks = normalizePageStacks(collection);
  const targetStack = pageStacks.find((stack) => stack.id === targetStackId);
  const sourceStack = pageStacks.find((stack) => stack.id === sourceStackId);
  if (!targetStack || !sourceStack) {
    return normalizeStackSelection(collection, pageStacks);
  }
  const mergedFrameIds = [
    ...targetStack.frameIds,
    ...sourceStack.frameIds.filter((frameId) => !targetStack.frameIds.includes(frameId)),
  ];
  const nextStacks = pageStacks
    .filter((stack) => stack.id !== sourceStackId)
    .map((stack) => (
      stack.id === targetStackId
        ? {
          ...stack,
          frameIds: mergedFrameIds,
          selectedFrameId: sourceStack.selectedFrameId || sourceStack.primaryFrameId || stack.selectedFrameId,
          createdFrom: 'merge' as const,
        }
        : stack
    ));

  return normalizeStackSelection(
    {
      ...collection,
      selectedStackId: targetStackId,
      selectedFrameId: sourceStack.selectedFrameId || sourceStack.primaryFrameId || collection.selectedFrameId,
    },
    normalizePageStacks({
      ...collection,
      pageStacks: nextStacks,
    }),
  );
}

export function resolvePageStackContext(
  collection: PageFrameCollectionModel,
  frameId: string,
): PageStackContext | null {
  const stack = findStackByFrameId(normalizePageStacks(collection), frameId);
  if (!stack) return null;
  const index = stack.frameIds.indexOf(frameId);
  const pageNumber = (stack.numbering.enabled ? stack.numbering.startAt : 1) + index;
  return {
    stack,
    index,
    total: stack.frameIds.length,
    pageNumber,
    pageNumberLabel: `${pageNumber} / ${stack.frameIds.length}`,
  };
}
