import { createContext, useContext } from 'react';

export interface SourcePageJump {
  hasPage: (page: number) => boolean;
  viewPage: (page: number) => void;
}

// Only the live writing surface provides this: overview thumbnails and print
// render the same source strip and must stay without a jump action.
const SourcePageJumpContext = createContext<SourcePageJump | null>(null);

export const SourcePageJumpProvider = SourcePageJumpContext.Provider;
export const useSourcePageJump = () => useContext(SourcePageJumpContext);
