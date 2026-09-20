import { normalizePageFrameCollection } from './pageFrameCollectionService';
import { createPageStackFromFrame } from './pageStackCollectionService';
import type { PageFrameCollectionModel, PageFrameModel } from './types';

/** The first content page keeps its identity and coordinates. Cover is a manual stack. */
export function addNoteCoverPage(collection: PageFrameCollectionModel, frameId: string): PageFrameCollectionModel {
  const source = collection.pageFrames.find((frame) => frame.id === collection.primaryFrameId) || collection.pageFrames[0];
  if (!source) throw new Error('请先创建内容页。');
  const frame: PageFrameModel = { ...source, id: frameId, role: 'secondary_page_frame',
    y: Math.min(...collection.pageFrames.map((page) => page.y)) - source.height - 80,
    contentInset: { ...source.contentInset }, exportable: true };
  const stack = createPageStackFromFrame(frame);
  return normalizePageFrameCollection({ ...collection,
    pageFrames: [frame, ...collection.pageFrames], pageStacks: [stack, ...(collection.pageStacks || [])],
    selectedFrameId: frameId, selectedStackId: stack.id,
  });
}

export function removeNoteCoverPage(collection: PageFrameCollectionModel, frameId: string): PageFrameCollectionModel {
  return normalizePageFrameCollection({ ...collection,
    pageFrames: collection.pageFrames.filter((frame) => frame.id !== frameId),
    pageStacks: collection.pageStacks?.map((stack) => ({ ...stack, frameIds: stack.frameIds.filter((id) => id !== frameId) }))
      .filter((stack) => stack.frameIds.length),
    selectedFrameId: collection.primaryFrameId, selectedStackId: collection.primaryStackId,
  });
}
