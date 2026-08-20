import { act, renderHook } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import type { BlockBoxLayout } from '../runtimeLayout';
import {
  useDraftBlockController,
  type UseDraftBlockControllerOptions,
} from './useDraftBlockController';

const defaultDraftLayout: BlockBoxLayout = {
  x: 0,
  y: 0,
  width: 760,
  height: 72,
};

const defaultTextTemplate: TemplateOption = {
  template_id: 'text',
  template_key: 'text',
  template_version: '1.0.0',
  label: 'Text',
  description: 'Text block',
  system_type: 'text',
  learning_role: 'note',
  legacy_block_type: 'text',
  default_content: {},
  origin: 'test',
  status: 'active',
  isRuntime: false,
};

function makeOptions(): UseDraftBlockControllerOptions {
  return {
    createBlock: vi.fn(async () => null),
    defaultDraftLayout,
    defaultTextTemplate,
    note: null,
    saveBlock: vi.fn(async () => null),
    setActiveBlockId: vi.fn(),
    setFocusBlockId: vi.fn(),
    setInteractionState: vi.fn(),
    setSelectedBlockId: vi.fn(),
  };
}

describe('useDraftBlockController native useState parity', () => {
  it('matches native same-value render-phase scheduling and effect commits', () => {
    const hookReceipt = { renders: 0, effects: 0 };
    const nativeReceipt = { renders: 0, effects: 0 };
    const subject = renderHook(() => {
      hookReceipt.renders += 1;
      const controller = useDraftBlockController(makeOptions());
      useEffect(() => {
        hookReceipt.effects += 1;
      }, [controller.draftText]);
      return controller;
    });
    const native = renderHook(() => {
      nativeReceipt.renders += 1;
      const [value, setValue] = useState('');
      useEffect(() => {
        nativeReceipt.effects += 1;
      }, [value]);
      return { setValue, value };
    });
    const hookBefore = { ...hookReceipt };
    const nativeBefore = { ...nativeReceipt };

    act(() => {
      subject.result.current.setDraftText('');
      native.result.current.setValue('');
    });

    expect({
      renders: hookReceipt.renders - hookBefore.renders,
      effects: hookReceipt.effects - hookBefore.effects,
    }).toEqual({
      renders: nativeReceipt.renders - nativeBefore.renders,
      effects: nativeReceipt.effects - nativeBefore.effects,
    });
    expect({
      renders: nativeReceipt.renders - nativeBefore.renders,
      effects: nativeReceipt.effects - nativeBefore.effects,
    }).toEqual({ renders: 0, effects: 0 });
  });

  it('matches native functional-updater evaluation timing', () => {
    const subject = renderHook(() => useDraftBlockController(makeOptions()));
    const native = renderHook(() => {
      const [value, setValue] = useState('');
      return { setValue, value };
    });
    let hookExternal = 'one';
    let nativeExternal = 'one';

    act(() => {
      subject.result.current.setDraftText(() => hookExternal);
      native.result.current.setValue(() => nativeExternal);
      hookExternal = 'two';
      nativeExternal = 'two';
    });

    expect(subject.result.current.draftText).toBe(native.result.current.value);
    expect(native.result.current.value).toBe('one');
  });
});
