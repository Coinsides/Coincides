import type { CoverPresetId } from '@shared/types/notePresets';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';
import type { RuntimeHistoryEntry } from './historyService';
import { coverPresetPlacements } from './noteCoverPresets';

export interface CoverPresetHost {
  frame: PageFrameModel;
  blocks: NoteBlock[];
  layouts: Record<string, BlockBoxLayout>;
  current: () => boolean;
  create: (field: 'title' | 'description', layout: BlockBoxLayout) => Promise<NoteBlock | null>;
  place: (block: NoteBlock, layout: BlockBoxLayout) => Promise<boolean>;
  trash: (id: string) => Promise<boolean>;
  restore: (block: NoteBlock) => Promise<NoteBlock | null>;
  remember: (entry: RuntimeHistoryEntry) => boolean;
}

/** Uses ordinary human block/placement writes and the existing reversible-edit history lane. */
export async function applyCoverPreset(id: CoverPresetId, host: CoverPresetHost): Promise<string> {
  const recipe = coverPresetPlacements(id, host.frame);
  const changes: { block: NoteBlock; before?: BlockBoxLayout; after: BlockBoxLayout }[] = [];
  const revert = async () => {
    let ok = true;
    for (const change of [...changes].reverse()) {
      if (!host.current()) return false;
      const saved = change.before ? await host.place(change.block, change.before) : await host.trash(change.block.id);
      ok = saved && ok;
    }
    return ok;
  };
  try {
    for (const field of ['title', 'description'] as const) {
      if (!host.current()) throw new Error('笔记已切换，请回到封面重试。');
      const existing = host.blocks.find((block) => block.block_type === 'note_ref' && block.content_json.field === field
        && host.layouts[block.id]?.frame_id === host.frame.id && host.layouts[block.id]?.surface !== 'tray');
      if (existing) {
        const before = structuredClone(host.layouts[existing.id]);
        const after = { ...before, ...recipe[field], rotation: 0 };
        changes.push({ block: existing, before, after });
        if (!await host.place(existing, after)) throw new Error('封面版式未保存，请重试。');
      } else {
        const created = await host.create(field, recipe[field]);
        if (!created) throw new Error('封面绑定件未添加，请重试。');
        changes.push({ block: created, after: recipe[field] });
      }
    }
    if (!host.current() || !host.remember({ type: 'reversibleEdit', undo: revert, redo: async () => {
      for (const change of changes) {
        if (!host.current()) return false;
        if (!change.before && !await host.restore(change.block)) return false;
        if (!host.current()) return false;
        if (!await host.place(change.block, change.after)) return false;
      }
      return true;
    } })) throw new Error('封面版式未记入撤销记录，请重试。');
    return changes[0].block.id;
  } catch (error) {
    if (host.current() && !await revert()) throw new Error('封面版式未完成，部分更改未能恢复。请重新打开笔记检查。');
    throw error;
  }
}
