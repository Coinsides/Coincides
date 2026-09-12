import { STATIC_TEMPLATE_OPTIONS, type TemplateOption } from '@/services/templateOptions';
import { uploadCanvasImageAsset } from './canvasAssetRepository';
import { DEFAULT_PAGE_CONTENT_WIDTH, type BlockBoxLayout } from './runtimeLayout';
import type { NoteBlock } from './runtimeDataTypes';
import type { PageFrameModel } from './types';

export function imageOnlyClipboardFile(clipboard: DataTransfer): File | null {
  if (clipboard.getData('text/plain') || Array.from(clipboard.types || []).includes('text/plain')) return null;
  return Array.from(clipboard.files || []).find((file) => file.type.startsWith('image/'))
    || Array.from(clipboard.items || []).find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
    || null;
}

export function measurePastedImage(file: File): Promise<{ naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const finish = () => { img.onload = null; img.onerror = null; URL.revokeObjectURL(url); };
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      finish();
      if (naturalWidth > 0 && naturalHeight > 0) resolve({ naturalWidth, naturalHeight });
      else reject(new Error('This image has no readable dimensions.'));
    };
    img.onerror = () => { finish(); reject(new Error('This image could not be read.')); };
    img.src = url;
  });
}

export function mediaLayoutAfterBlock(
  anchor: BlockBoxLayout,
  frame: PageFrameModel,
  size: { naturalWidth: number; naturalHeight: number },
  occupied: BlockBoxLayout[] = [],
): BlockBoxLayout {
  const contentWidth = frame.width - frame.contentInset.left - frame.contentInset.right;
  const width = Math.min(size.naturalWidth, DEFAULT_PAGE_CONTENT_WIDTH, contentWidth);
  if (width <= 0) throw new Error('This page has no room for an image.');
  const layout: BlockBoxLayout = {
    x: Math.max(0, Math.min(anchor.x, contentWidth - width)),
    y: Math.max(0, anchor.y + anchor.height),
    width, height: width * size.naturalHeight / size.naturalWidth,
    width_mode: 'manual', coordinate_space: 'page_frame_local', frame_id: frame.id,
    surface: 'formal_page', boundary_role: 'inside', export_role: 'included',
  };
  // Fixed paper placements do not reflow when order_index changes. Use the
  // nearest clear space below the anchor without moving existing content.
  for (const box of [...occupied].sort((a, b) => a.y - b.y)) {
    if (box.frame_id !== frame.id || box.surface !== 'formal_page') continue;
    if (layout.x < box.x + box.width && layout.x + layout.width > box.x
      && layout.y < box.y + box.height && layout.y + layout.height > box.y) {
      layout.y = box.y + box.height;
    }
  }
  return layout;
}

export interface MediaBlockCreateOptions {
  contentJson: Record<string, unknown>;
  metadataPatch: Record<string, unknown>;
  layout: BlockBoxLayout;
  afterBlockId: string;
  silent: boolean;
}

/** Upload completes before the ordinary NoteBlock creation path is entered. */
export async function pasteMediaBlock(input: {
  noteId: string;
  blockId: string;
  file: File;
  anchor: BlockBoxLayout;
  frame: PageFrameModel;
  occupied?: BlockBoxLayout[];
  isCurrent: () => boolean;
  createBlock: (template: TemplateOption, text: string, options: MediaBlockCreateOptions) => Promise<NoteBlock | null>;
}): Promise<NoteBlock | null> {
  const size = await measurePastedImage(input.file);
  if (!input.isCurrent()) return null;
  const layout = mediaLayoutAfterBlock(input.anchor, input.frame, size, input.occupied);
  const asset = await uploadCanvasImageAsset({ noteId: input.noteId, file: input.file,
    width: size.naturalWidth, height: size.naturalHeight });
  if (!input.isCurrent()) return null;
  const template = STATIC_TEMPLATE_OPTIONS.find((candidate) => candidate.legacy_block_type === 'media');
  if (!template) throw new Error('The image block template is unavailable.');
  return input.createBlock(template, '', {
    contentJson: {}, metadataPatch: { media: { asset_id: asset.assetId, ...size, alt: input.file.name || 'Image' } },
    layout, afterBlockId: input.blockId, silent: true,
  });
}
