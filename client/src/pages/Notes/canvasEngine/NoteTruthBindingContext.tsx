import { createContext, useContext, type ReactNode } from 'react';

export interface NoteTruthBindingValue {
  title: string;
  description: string;
  readOnly?: boolean;
  onChange?: (field: 'title' | 'description', value: string) => void;
  onSave?: (field: 'title' | 'description') => void | Promise<void>;
}

const NoteTruthBindingContext = createContext<NoteTruthBindingValue | null>(null);

/** A reference projects its owning note; no block body or TextFlow copy is made. */
export function NoteTruthBindingProvider({ value, children }: {
  value: NoteTruthBindingValue; children: ReactNode;
}) {
  return <NoteTruthBindingContext.Provider value={value}>{children}</NoteTruthBindingContext.Provider>;
}

export const useNoteTruthBinding = () => useContext(NoteTruthBindingContext);
