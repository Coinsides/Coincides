import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { FieldValueRecord } from '../blockContentService';
import type { TextBlockContentV1 } from '../runtimeDataTypes';

export interface BlockDraftSnapshot {
  textDrafts: Record<string, string>;
  textFlowDrafts: Record<string, TextBlockContentV1>;
  fieldDrafts: Record<string, FieldValueRecord>;
}

interface UseBlockDraftAuthorityResult {
  blockTextDrafts: BlockDraftSnapshot['textDrafts'];
  blockTextFlowDrafts: BlockDraftSnapshot['textFlowDrafts'];
  blockFieldDrafts: BlockDraftSnapshot['fieldDrafts'];
  setBlockTextDrafts: Dispatch<SetStateAction<BlockDraftSnapshot['textDrafts']>>;
  setBlockTextFlowDrafts: Dispatch<SetStateAction<BlockDraftSnapshot['textFlowDrafts']>>;
  setBlockFieldDrafts: Dispatch<SetStateAction<BlockDraftSnapshot['fieldDrafts']>>;
  readBlockDraftSnapshot: () => BlockDraftSnapshot;
}

function resolveStateAction<T>(action: SetStateAction<T>, current: T): T {
  return typeof action === 'function'
    ? (action as (value: T) => T)(current)
    : action;
}

export function useBlockDraftAuthority(
  initial: Partial<BlockDraftSnapshot> = {},
): UseBlockDraftAuthorityResult {
  const initialSnapshotRef = useRef<BlockDraftSnapshot>({
    textDrafts: initial.textDrafts ?? {},
    textFlowDrafts: initial.textFlowDrafts ?? {},
    fieldDrafts: initial.fieldDrafts ?? {},
  });
  const snapshotRef = useRef(initialSnapshotRef.current);
  const [blockTextDrafts, setTextDraftState] = useState(initialSnapshotRef.current.textDrafts);
  const [blockTextFlowDrafts, setTextFlowDraftState] = useState(initialSnapshotRef.current.textFlowDrafts);
  const [blockFieldDrafts, setFieldDraftState] = useState(initialSnapshotRef.current.fieldDrafts);

  const setBlockTextDrafts = useCallback<UseBlockDraftAuthorityResult['setBlockTextDrafts']>((action) => {
    const next = resolveStateAction(action, snapshotRef.current.textDrafts);
    for (const key of new Set([...Object.keys(next), ...Object.keys(snapshotRef.current.textDrafts)])) {
      if (next[key] !== snapshotRef.current.textDrafts[key]) console.info('[F4-PROBE] textDraft', key.slice(0, 8), JSON.stringify(snapshotRef.current.textDrafts[key]), '->', JSON.stringify(next[key]), typeof action === 'function' ? 'fn' : 'MAP', new Error().stack?.split('\n').slice(2, 5).map((l) => l.trim().replace(/\?t=\d+/, '').replace(/https?:\/\/[^/]+\/src\/pages\/Notes\/canvasEngine\//, '')).join(' < '));
    }
    snapshotRef.current = { ...snapshotRef.current, textDrafts: next };
    setTextDraftState(next);
  }, []);

  const setBlockTextFlowDrafts = useCallback<UseBlockDraftAuthorityResult['setBlockTextFlowDrafts']>((action) => {
    const next = resolveStateAction(action, snapshotRef.current.textFlowDrafts);
    for (const key of new Set([...Object.keys(next), ...Object.keys(snapshotRef.current.textFlowDrafts)])) {
      if (next[key] !== snapshotRef.current.textFlowDrafts[key]) console.info('[F4-PROBE] flowDraft', key.slice(0, 8), JSON.stringify(snapshotRef.current.textFlowDrafts[key]?.units.map((u) => u.text)), '->', JSON.stringify(next[key]?.units.map((u) => u.text)), typeof action === 'function' ? 'fn' : 'MAP', new Error().stack?.split('\n').slice(2, 5).map((l) => l.trim().replace(/\?t=\d+/, '').replace(/https?:\/\/[^/]+\/src\/pages\/Notes\/canvasEngine\//, '')).join(' < '));
    }
    snapshotRef.current = { ...snapshotRef.current, textFlowDrafts: next };
    setTextFlowDraftState(next);
  }, []);

  const setBlockFieldDrafts = useCallback<UseBlockDraftAuthorityResult['setBlockFieldDrafts']>((action) => {
    const next = resolveStateAction(action, snapshotRef.current.fieldDrafts);
    snapshotRef.current = { ...snapshotRef.current, fieldDrafts: next };
    setFieldDraftState(next);
  }, []);

  const readBlockDraftSnapshot = useCallback(() => snapshotRef.current, []);

  return {
    blockTextDrafts,
    blockTextFlowDrafts,
    blockFieldDrafts,
    setBlockTextDrafts,
    setBlockTextFlowDrafts,
    setBlockFieldDrafts,
    readBlockDraftSnapshot,
  };
}
