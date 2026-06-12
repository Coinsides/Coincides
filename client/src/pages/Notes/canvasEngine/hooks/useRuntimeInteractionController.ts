import {
  useCallback,
  useState,
} from 'react';
import {
  idleInteraction,
  type RuntimeInteractionState,
} from '../interactionController';

export function useRuntimeInteractionController() {
  const [interactionState, setInteractionState] = useState<RuntimeInteractionState>(idleInteraction());

  const resetInteractionState = useCallback(() => {
    setInteractionState(idleInteraction());
  }, []);

  return {
    interactionState,
    resetInteractionState,
    setInteractionState,
  };
}
