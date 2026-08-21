import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldValueRecord } from '../blockContentService';
import type {
  AnnotationTruthV1,
  NoteBlock,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import type { SlashSession } from '../slashCommandReducer';
import { textFocusReceiptForBlock } from '../textFocusReceipt';
import { TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { useBlockDraftAuthority } from './useBlockDraftAuthority';
import { useBlockTextFlowEditController } from './useBlockTextFlowEditController';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { useSlashBlockRollbackController } from './useSlashBlockRollbackController';

const blockId = 'formula-block-1';
const owner = textFocusReceiptForBlock(blockId);
const textWithTrigger = 'alpha /heabeta';
const rolledBackText = 'alpha beta';

const block: NoteBlock = {
  id: blockId,
  placement_id: 'placement-formula-block-1',
  display_overrides_json: {},
  canvas_layout: null,
  block_type: 'formula',
  title: null,
  content_json: {
    body: 'alpha beta',
    field_values: {
      latex_input: 'alpha beta',
      formula_name: 'Euler',
      explanation: 'Keep me',
    },
  },
  plain_text: 'alpha beta',
  metadata: {},
  order_index: 0,
  source_references: [],
};

function savedBlockOutcome(savedBlock: NoteBlock): BlockSaveOutcome {
  return {
    status: 'saved',
    block: savedBlock,
    recoveryReceipt: null,
    reconciliation: 'response',
  };
}

function textFlow(text: string): TextBlockContentV1 {
  return {
    textflow_version: 'TextBlockContentV1',
    units: [{
      id: owner.textUnitId,
      text,
      writing_role: 'paragraph',
      indent_level: 0,
      order_index: 0,
      metadata: {},
      status: 'active',
    }],
    inline_structures: [],
    metadata: {},
  };
}

const annotation: AnnotationTruthV1 = {
  id: 'annotation-1',
  note_id: 'note-1',
  canvas_id: 'canvas-1',
  raw_label: 'beta',
  ranges: [{
    id: 'range-1',
    target_kind: 'text_span',
    block_id: blockId,
    text_flow_id: owner.textFlowId,
    text_unit_id: owner.textUnitId,
    start_offset: 6,
    end_offset: 14,
    range_text_cache: '/heabeta',
  }],
  parent_annotation_id: null,
  child_annotation_ids: [],
  visual_style: { color_token: 'yellow', marker_kind: 'highlight' },
  created_by: 'human',
  status: 'active',
  created_at: '2026-08-20T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
};

const session: SlashSession = {
  target: 'block',
  owner,
  trigger: { query: 'hea', start: 6, end: 10 },
  originalSlice: '/hea',
  caret: 6,
};

const ordinaryRollbackReasons = [
  'escape',
  'disabled',
  'annotation_action',
  'missing_template',
  'missing_block',
] as const;

function renderSubject(input: {
  text?: string;
  flowText?: string;
  fieldText?: string;
  omitField?: boolean;
  annotations?: AnnotationTruthV1[];
  blockSaveError?: unknown;
  blockSaveOutcome?: BlockSaveOutcome;
  blockSavePromise?: Promise<BlockSaveOutcome>;
  blocks?: NoteBlock[];
  persistAnnotations?: (annotations: AnnotationTruthV1[]) => Promise<void> | void;
} = {}) {
  const initialText = input.text ?? textWithTrigger;
  const initialFlow = textFlow(input.flowText ?? textWithTrigger);
  const initialFields: FieldValueRecord = {
    latex_input: input.fieldText ?? textWithTrigger,
    formula_name: 'Euler',
    explanation: 'Keep me',
  };
  const annotationSaveCalls: AnnotationTruthV1[][] = [];
  const saveBlock = vi.fn(async (
    blockToSave: NoteBlock,
    text: string,
    options?: {
      silent?: boolean;
      fieldValues?: FieldValueRecord;
      textFlow?: TextBlockContentV1;
    },
  ): Promise<BlockSaveOutcome> => {
    if (input.blockSaveError !== undefined) throw input.blockSaveError;
    if (input.blockSavePromise) return input.blockSavePromise;
    const savedBlock: NoteBlock = {
      ...blockToSave,
      content_json: {
        ...blockToSave.content_json,
        body: text,
        ...(options?.fieldValues ? { field_values: options.fieldValues } : {}),
        ...(options?.textFlow ? { [TEXT_FLOW_CONTENT_KEY]: options.textFlow } : {}),
      },
      plain_text: text,
    };
    return input.blockSaveOutcome ?? savedBlockOutcome(savedBlock);
  });

  const hook = renderHook(() => {
    const {
      blockTextDrafts: textDrafts,
      blockTextFlowDrafts: textFlowDrafts,
      blockFieldDrafts: fieldDrafts,
      setBlockTextDrafts: setTextDrafts,
      setBlockTextFlowDrafts: setTextFlowDrafts,
      setBlockFieldDrafts: setFieldDrafts,
      readBlockDraftSnapshot,
    } = useBlockDraftAuthority({
      textDrafts: { [blockId]: initialText },
      textFlowDrafts: { [blockId]: initialFlow },
      fieldDrafts: {
        ...(input.omitField ? {} : { [blockId]: initialFields }),
      },
    });
    const [annotations, setAnnotations] = useState<AnnotationTruthV1[]>(
      input.annotations ?? [annotation],
    );
    const applyBlockTextFlowEdit = useBlockTextFlowEditController({
      annotationTruths: annotations,
      blockTextFlowDrafts: textFlowDrafts,
      saveAnnotationTruths: (next) => {
        annotationSaveCalls.push(next);
        setAnnotations(next);
        return input.persistAnnotations?.(next);
      },
      setBlockTextFlowDrafts: setTextFlowDrafts,
    });
    const rollback = useSlashBlockRollbackController({
      applyBlockTextFlowEdit,
      blocks: input.blocks ?? [block],
      readBlockDraftSnapshot,
      saveBlock,
      setBlockFieldDrafts: setFieldDrafts,
      setBlockTextDrafts: setTextDrafts,
    });

    return {
      annotations,
      fieldDrafts,
      rollback,
      setFieldDrafts,
      setTextDrafts,
      setTextFlowDrafts,
      textDrafts,
      textFlowDrafts,
    };
  });
  return Object.assign(hook, {
    annotationSaveCalls,
    saveBlock,
  });
}

describe('Slash block rollback authority', () => {
  it.each(ordinaryRollbackReasons)(
    'routes %s rollback through the ordinary TextFlow edit and one annotation save',
    (reason) => {
      const subject = renderSubject();
      let applied = false;

      act(() => {
        applied = subject.result.current.rollback({
          session,
          getCurrentOwner: () => owner,
          getCurrentText: () => textWithTrigger,
          reason,
        }).applied;
      });

      expect(applied).toBe(true);
      expect(subject.result.current.textDrafts[blockId]).toBe(rolledBackText);
      expect(subject.result.current.textFlowDrafts[blockId]?.units[0]?.text).toBe(rolledBackText);
      expect(subject.result.current.fieldDrafts[blockId]).toMatchObject({
        latex_input: rolledBackText,
        formula_name: 'Euler',
        explanation: 'Keep me',
      });
      expect(subject.result.current.annotations[0]?.ranges[0]).toMatchObject({
        start_offset: 6,
        end_offset: 10,
        range_text_cache: 'beta',
      });
      expect(subject.annotationSaveCalls).toHaveLength(1);
      expect(subject.saveBlock).toHaveBeenCalledTimes(1);
      expect(subject.saveBlock).toHaveBeenCalledWith(
        block,
        rolledBackText,
        expect.objectContaining({
          silent: true,
          fieldValues: expect.objectContaining({
            latex_input: rolledBackText,
            formula_name: 'Euler',
            explanation: 'Keep me',
          }),
          textFlow: expect.objectContaining({
            units: [expect.objectContaining({ text: rolledBackText })],
          }),
        }),
      );
    },
  );

  it('starts the durable block save without waiting for annotation persistence', async () => {
    let releaseAnnotationSave!: () => void;
    const heldAnnotationSave = new Promise<void>((resolve) => {
      releaseAnnotationSave = resolve;
    });
    const subject = renderSubject({
      persistAnnotations: () => heldAnnotationSave,
    });

    act(() => {
      subject.result.current.rollback({
        session,
        getCurrentOwner: () => owner,
        getCurrentText: () => textWithTrigger,
        reason: 'escape',
      });
    });

    expect(subject.saveBlock).toHaveBeenCalledTimes(1);
    expect(subject.saveBlock).toHaveBeenCalledWith(
      block,
      rolledBackText,
      expect.objectContaining({
        silent: true,
        fieldValues: expect.objectContaining({ latex_input: rolledBackText }),
        textFlow: expect.objectContaining({
          units: [expect.objectContaining({ text: rolledBackText })],
        }),
      }),
    );

    await act(async () => {
      releaseAnnotationSave();
      await heldAnnotationSave;
    });
  });

  it('keeps the local inverse and reports an unavailable durable block receipt without retry', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const subject = renderSubject({
        blockSaveOutcome: {
          status: 'rejected',
          block: null,
          recoveryReceipt: null,
          reconciliation: 'not_attempted',
          durableState: 'not_checked',
          reason: 'mutation_not_allowed',
          staleEpoch: false,
        },
      });

      act(() => {
        subject.result.current.rollback({
          session,
          getCurrentOwner: () => owner,
          getCurrentText: () => textWithTrigger,
          reason: 'escape',
        });
      });

      await waitFor(() => expect(consoleWarn).toHaveBeenCalledWith(
        'Slash block rollback was not durably saved:',
        {
          blockId,
          exitReason: 'escape',
          reason: 'block_save_receipt_unavailable',
          durableOutcome: 'unknown',
        },
      ));
      expect(subject.saveBlock).toHaveBeenCalledTimes(1);
      expect(subject.result.current.textDrafts[blockId]).toBe(rolledBackText);
      expect(subject.result.current.textFlowDrafts[blockId]?.units[0]?.text).toBe(rolledBackText);
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it('keeps the local inverse and reports a rejected durable block save without retry', async () => {
    const blockSaveError = new Error('durable block write rejected');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const subject = renderSubject({ blockSaveError });

      act(() => {
        subject.result.current.rollback({
          session,
          getCurrentOwner: () => owner,
          getCurrentText: () => textWithTrigger,
          reason: 'escape',
        });
      });

      await waitFor(() => expect(consoleError).toHaveBeenCalledWith(
        'Failed to persist Slash block rollback:',
        {
          blockId,
          exitReason: 'escape',
          reason: 'block_save_failed',
          durableOutcome: 'unknown',
          error: blockSaveError,
        },
      ));
      expect(subject.saveBlock).toHaveBeenCalledTimes(1);
      expect(subject.result.current.textDrafts[blockId]).toBe(rolledBackText);
      expect(subject.result.current.textFlowDrafts[blockId]?.units[0]?.text).toBe(rolledBackText);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('reports annotation failure before a held block save later succeeds', async () => {
    const annotationSaveError = new Error('annotation write rejected');
    let releaseBlockSave!: (value: BlockSaveOutcome) => void;
    const heldBlockSave = new Promise<BlockSaveOutcome>((resolve) => {
      releaseBlockSave = resolve;
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const subject = renderSubject({
        blockSavePromise: heldBlockSave,
        persistAnnotations: () => Promise.reject(annotationSaveError),
      });

      act(() => {
        subject.result.current.rollback({
          session,
          getCurrentOwner: () => owner,
          getCurrentText: () => textWithTrigger,
          reason: 'escape',
        });
      });

      await waitFor(() => expect(consoleError).toHaveBeenCalledWith(
        'Failed to persist Slash annotation rollback:',
        {
          blockId,
          exitReason: 'escape',
          reason: 'annotation_save_failed',
          error: annotationSaveError,
        },
      ));
      expect(subject.saveBlock).toHaveBeenCalledTimes(1);

      await act(async () => {
        releaseBlockSave(savedBlockOutcome(block));
        await heldBlockSave;
      });
      expect(consoleError).not.toHaveBeenCalledWith(
        'Failed to persist Slash block rollback:',
        expect.anything(),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('reports block rejection before a held annotation save later succeeds', async () => {
    const blockSaveError = new Error('block write rejected first');
    let releaseAnnotationSave!: () => void;
    let annotationSettled = false;
    const heldAnnotationSave = new Promise<void>((resolve) => {
      releaseAnnotationSave = resolve;
    }).then(() => {
      annotationSettled = true;
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const subject = renderSubject({
        blockSaveError,
        persistAnnotations: () => heldAnnotationSave,
      });

      act(() => {
        subject.result.current.rollback({
          session,
          getCurrentOwner: () => owner,
          getCurrentText: () => textWithTrigger,
          reason: 'escape',
        });
      });

      await waitFor(() => expect(consoleError).toHaveBeenCalledWith(
        'Failed to persist Slash block rollback:',
        {
          blockId,
          exitReason: 'escape',
          reason: 'block_save_failed',
          durableOutcome: 'unknown',
          error: blockSaveError,
        },
      ));
      expect(annotationSettled).toBe(false);
      expect(subject.annotationSaveCalls).toHaveLength(1);

      await act(async () => {
        releaseAnnotationSave();
        await heldAnnotationSave;
      });
      expect(consoleError).not.toHaveBeenCalledWith(
        'Failed to persist Slash annotation rollback:',
        expect.anything(),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('uses not_attempted only for a missing block while annotation persistence still starts', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const subject = renderSubject({ blocks: [] });

      act(() => {
        subject.result.current.rollback({
          session,
          getCurrentOwner: () => owner,
          getCurrentText: () => textWithTrigger,
          reason: 'escape',
        });
      });

      await waitFor(() => expect(consoleWarn).toHaveBeenCalledWith(
        'Slash block rollback was not durably saved:',
        {
          blockId,
          exitReason: 'escape',
          reason: 'block_unavailable',
          durableOutcome: 'not_attempted',
        },
      ));
      expect(subject.annotationSaveCalls).toHaveLength(1);
      expect(subject.saveBlock).not.toHaveBeenCalled();
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it('makes no write when an owner-local companion truth has drifted', () => {
    const subject = renderSubject({ flowText: 'alpha /literal' });
    const before = subject.result.current;
    let applied = true;

    act(() => {
      applied = subject.result.current.rollback({
        session,
        getCurrentOwner: () => owner,
        getCurrentText: () => textWithTrigger,
        reason: 'escape',
      }).applied;
    });

    expect(applied).toBe(false);
    expect(subject.result.current.textDrafts).toEqual(before.textDrafts);
    expect(subject.result.current.textFlowDrafts).toEqual(before.textFlowDrafts);
    expect(subject.result.current.fieldDrafts).toEqual(before.fieldDrafts);
    expect(subject.result.current.annotations).toEqual(before.annotations);
    expect(subject.annotationSaveCalls).toHaveLength(0);
    expect(subject.saveBlock).not.toHaveBeenCalled();
  });

  it('rejects the transaction when only the canonical TextFlow identity has drifted', () => {
    const subject = renderSubject();
    const before = subject.result.current;
    const driftedOwner = {
      ...owner,
      textFlowId: 'textflow-stale-formula-block-1',
    };
    let applied = true;

    act(() => {
      applied = subject.result.current.rollback({
        session: { ...session, owner: driftedOwner },
        getCurrentOwner: () => driftedOwner,
        getCurrentText: () => textWithTrigger,
        reason: 'escape',
      }).applied;
    });

    expect(applied).toBe(false);
    expect(subject.result.current.textDrafts).toEqual(before.textDrafts);
    expect(subject.result.current.textFlowDrafts).toEqual(before.textFlowDrafts);
    expect(subject.result.current.fieldDrafts).toEqual(before.fieldDrafts);
    expect(subject.result.current.annotations).toEqual(before.annotations);
    expect(subject.annotationSaveCalls).toHaveLength(0);
    expect(subject.saveBlock).not.toHaveBeenCalled();
  });

  it('fails closed when a Formula field companion has not reached current state', () => {
    const subject = renderSubject({ omitField: true });
    let applied = true;

    act(() => {
      applied = subject.result.current.rollback({
        session,
        getCurrentOwner: () => owner,
        getCurrentText: () => textWithTrigger,
        reason: 'escape',
      }).applied;
    });

    expect(applied).toBe(false);
    expect(subject.result.current.textDrafts[blockId]).toBe(textWithTrigger);
    expect(subject.result.current.textFlowDrafts[blockId]?.units[0]?.text).toBe(textWithTrigger);
    expect(subject.result.current.fieldDrafts[blockId]).toBeUndefined();
    expect(subject.annotationSaveCalls).toHaveLength(0);
    expect(subject.saveBlock).not.toHaveBeenCalled();
  });

  it('drains a queued newer plain revision before planning the transaction', () => {
    const subject = renderSubject();
    const literalText = 'alpha /literal';
    let observedText = textWithTrigger;
    let applied = true;

    act(() => {
      observedText = literalText;
      subject.result.current.setTextDrafts((current) => ({
        ...current,
        [blockId]: literalText,
      }));
      applied = subject.result.current.rollback({
        session,
        getCurrentOwner: () => owner,
        getCurrentText: () => observedText,
        reason: 'escape',
      }).applied;
    });

    expect(applied).toBe(false);
    expect(subject.result.current.textDrafts[blockId]).toBe(literalText);
    expect(subject.result.current.textFlowDrafts[blockId]?.units[0]?.text).toBe(textWithTrigger);
    expect(subject.result.current.fieldDrafts[blockId]?.latex_input).toBe(textWithTrigger);
    expect(subject.saveBlock).not.toHaveBeenCalled();
  });

  it('uses one coherent enqueue-time snapshot for queued plain, TextFlow, and Formula revisions', () => {
    const subject = renderSubject();
    const queuedText = 'alpha /heagamma';
    let observedText = textWithTrigger;
    let applied = false;

    act(() => {
      observedText = queuedText;
      subject.result.current.setTextDrafts((current) => ({
        ...current,
        [blockId]: queuedText,
      }));
      subject.result.current.setTextFlowDrafts((current) => ({
        ...current,
        [blockId]: textFlow(queuedText),
      }));
      subject.result.current.setFieldDrafts((current) => ({
        ...current,
        [blockId]: {
          ...current[blockId],
          latex_input: queuedText,
        },
      }));
      applied = subject.result.current.rollback({
        session,
        getCurrentOwner: () => owner,
        getCurrentText: () => observedText,
        reason: 'escape',
      }).applied;
    });

    expect(applied).toBe(true);
    expect(subject.result.current.textDrafts[blockId]).toBe('alpha gamma');
    expect(subject.result.current.textFlowDrafts[blockId]?.units[0]?.text).toBe('alpha gamma');
    expect(subject.result.current.fieldDrafts[blockId]).toMatchObject({
      latex_input: 'alpha gamma',
      formula_name: 'Euler',
      explanation: 'Keep me',
    });
    expect(subject.saveBlock).toHaveBeenCalledTimes(1);
    expect(subject.saveBlock).toHaveBeenCalledWith(
      block,
      'alpha gamma',
      expect.objectContaining({
        fieldValues: expect.objectContaining({ latex_input: 'alpha gamma' }),
        textFlow: expect.objectContaining({
          units: [expect.objectContaining({ text: 'alpha gamma' })],
        }),
      }),
    );
  });
});
