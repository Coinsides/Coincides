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
    snapshotRef.current = { ...snapshotRef.current, textDrafts: next };
    setTextDraftState(next);
  }, []);

  const setBlockTextFlowDrafts = useCallback<UseBlockDraftAuthorityResult['setBlockTextFlowDrafts']>((action) => {
    const next = resolveStateAction(action, snapshotRef.current.textFlowDrafts);
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
