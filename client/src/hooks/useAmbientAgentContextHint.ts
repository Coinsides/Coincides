import { useLayoutEffect, useState } from 'react';
import type { AmbientAgentContextHint } from '@shared/types';
import { useUIStore } from '@/stores/uiStore';

/** Only local view state; nothing is sent until the user sends a message. */
export function useAmbientAgentContextHint(hint: AmbientAgentContextHint | null): void {
  const [owner] = useState(() => Symbol('agent-context-view'));
  const open = useUIStore((state) => state.agentPanelOpen);
  const setHint = useUIStore((state) => state.setAmbientAgentContextHint);
  const clearHint = useUIStore((state) => state.clearAmbientAgentContextHint);
  useLayoutEffect(() => {
    if (open && hint) setHint(owner, hint);
    else clearHint(owner);
  }, [open, hint, owner, setHint, clearHint]);
  useLayoutEffect(() => () => clearHint(owner), [owner, clearHint]);
}
