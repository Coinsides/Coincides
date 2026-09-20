import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { useDocumentTabsStore } from '../src/stores/documentTabsStore';
import { useAgentUiStore } from '../src/stores/agentUiStore';

afterEach(() => {
  cleanup();
  // Isolated route fixtures omit AppLayout, whose unmount ends the UI session.
  useDocumentTabsStore.getState().reset();
  useAgentUiStore.getState().reset();
});
