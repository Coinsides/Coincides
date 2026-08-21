export interface ToolRegistryHumanEntry {
  route: string;
  client_call_site: string;
}

export interface ToolRegistryEntry {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  truth: 'content' | 'knowledge' | 'spatial' | 'provenance' | 'semantic' | 'purpose' | 'package';
  tier: 'immediate' | 'propose' | 'confirm';
  human_entry: ToolRegistryHumanEntry;
  exposure: 'public' | 'internal' | 'test';
  scopes: string[];
}

export const TOOL_REGISTRY: ToolRegistryEntry[] = [];

export const TOOL_REGISTRY_SELF_TEST_ENTRIES: ToolRegistryEntry[] = [
  {
    name: '__probe_tool_face_parity_self_test',
    description: 'Tool face parity self-check fixture',
    input_schema: {},
    output_schema: {},
    truth: 'content',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/health',
      client_call_site: 'client/src/App.tsx#App',
    },
    exposure: 'test',
    scopes: ['self-test'],
  },
];
