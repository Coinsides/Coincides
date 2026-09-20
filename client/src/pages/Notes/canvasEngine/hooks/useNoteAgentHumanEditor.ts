import { useLayoutEffect, useRef } from 'react';
import { registerNoteAgentHumanEditor } from '@/lib/noteAgentHumanBridge';
import { replaceTextUnitText } from '../textFlowService';
import type { useTextFlowHistory, TextFlowHistoryHost } from './useTextFlowHistory';
import type { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import type { TemplateOption } from '@/services/templateOptions';
import type { BlockBoxLayout } from '../runtimeLayout';

interface Options {
  noteId: string | undefined;
  enabled: boolean;
  readOnly: boolean;
  textHistory: ReturnType<typeof useTextFlowHistory>;
  history: TextFlowHistoryHost;
  whenIdle: () => Promise<void>;
  createBlock: ReturnType<typeof useNoteCanvasDataAdapter>['createBlock'];
  template: TemplateOption;
  layouts: Record<string, BlockBoxLayout>;
  beforeAction: () => boolean;
  selectBlock: (id: string) => void;
}

/** Proposal acceptance and answer insertion are explicit human UI actions. */
export function useNoteAgentHumanEditor(options: Options): void {
  const latest = useRef(options);
  latest.current = options;
  useLayoutEffect(() => {
    if (!options.noteId || !options.enabled) return;
    let active = true;
    let busy = false;
    const ready = async () => {
      const api = latest.current;
      if (!active || busy || api.readOnly || !api.beforeAction()) return false;
      busy = true;
      try {
        await api.textHistory.flush(); await api.whenIdle();
        if (!active || latest.current.readOnly) { busy = false; return false; }
        return true;
      }
      catch { busy = false; return false; }
    };
    const unregister = registerNoteAgentHumanEditor({
      noteId: options.noteId,
      async applyPatch(proposalId, index, patch) {
        if (!await ready()) return false;
        try {
          const api = latest.current;
          const block = api.textHistory.readLiveBlock(patch.block_id);
          const flow = api.textHistory.readLiveFlow(patch.block_id);
          const unit = flow?.units.find((candidate) => candidate.id === patch.unit_id);
          if (!block || !flow || !unit || patch.status !== 'pending'
            || (block.text_save_revision ?? 0) !== patch.base_revision || unit.text !== patch.old_text) return false;
          const next = replaceTextUnitText({ textFlow: flow, textUnitId: unit.id, nextText: patch.new_text });
          if (next === flow) {
            const result = await api.textHistory.saveBlock(block, block.plain_text ?? '', { textFlow: flow, silent: true,
              proposalPatch: { proposal_id: proposalId, patch_index: index } });
            return result.status === 'saved';
          }
          const applied = await api.textHistory.applyEdit(block, next, {
            previousTextFlow: flow,
            metadata: { unitId: unit.id, kind: 'structural', inputType: 'notePatchAcceptance', isComposing: false,
              beforeSelection: { unitId: unit.id, start: 0, end: unit.text.length },
              afterSelection: { unitId: unit.id, start: 0, end: patch.new_text.length },
              proposalPatch: { proposal_id: proposalId, patch_index: index } },
          });
          if (!applied?.success) return false;
          await api.textHistory.flush();
          return active;
        } catch { return false; }
        finally { busy = false; }
      },
      async insertAnswer(anchorBlockId, answer) {
        if (!answer.trim() || !await ready()) return false;
        try {
          const api = latest.current;
          const anchor = api.textHistory.readLiveBlock(anchorBlockId);
          const layout = api.layouts[anchorBlockId];
          if (!anchor || !layout) return false;
          return await api.history.enqueueRuntimeHistoryOperation(async () => {
            if (!active) return false;
            const created = await api.createBlock(api.template, answer, { afterBlockId: anchorBlockId, requireAfterBlock: true,
              layout: { ...layout, y: layout.y + layout.height + 16, height: 96 }, silent: true });
            if (!created || !active) return false;
            api.selectBlock(created.id);
            return api.history.pushHistoryEntry({ type: 'createdBlock', block: created }, { skipBoundary: true });
          });
        } finally { busy = false; }
      },
    });
    return () => { active = false; unregister(); };
  }, [options.noteId, options.enabled]);
}
