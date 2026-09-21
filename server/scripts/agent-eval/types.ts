import type Database from 'better-sqlite3';
import type { mock } from 'node:test';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../../src/agent/providers/types.js';

export type Row = Record<string, any>;
export type Mode = 'scripted' | 'live';
export interface SseEvent { type: string; data: Row; elapsedMs: number }
export interface AssertionResult { name: string; passed: boolean; error?: string }
export interface ApiResponse { status: number; body: any }
export interface TurnRecord {
  user: string;
  contextHint?: unknown;
  events: SseEvent[];
  rawSse: string;
  durationMs: number;
  providerRounds: number;
  messages: Row[];
  tables: Record<string, Row[]>;
  ledger: Row[];
  api: { history: Row[]; proposals: Row[]; memories: Row[]; receipts: Row[] };
}
export interface Fixtures {
  db: Database.Database;
  userId: string;
  courseId: string;
  conversationId: string;
  directory: string;
  mode: Mode;
  state: Row;
  mock: typeof mock;
  turns: TurnRecord[];
  request(path: string, body?: unknown, method?: string): Promise<ApiResponse>;
  check(name: string, assertion: () => unknown | Promise<unknown>): Promise<void>;
}
export interface ScriptContext extends Fixtures {
  round: number;
  messages: ProviderMessage[];
  definitions: ToolDefinition[];
  prompt: string;
}
export interface EvalTurn {
  user: string | ((fixtures: Fixtures) => string);
  contextHint?: unknown | ((fixtures: Fixtures) => unknown);
  script(ctx: ScriptContext): AsyncIterable<StreamChunk> | Iterable<StreamChunk>;
}
export interface Scenario {
  name: string;
  /** Explicit fixture/tool pipeline scenario: no model turns and never eligible for live mode. */
  scriptedOnly?: true;
  dimensions: string[];
  setup(fixtures: Fixtures): void | Promise<void>;
  turns: EvalTurn[];
  afterTurn?(ctx: Fixtures, turnIndex: number): void | Promise<void>;
  assertions(ctx: Fixtures): void | Promise<void>;
}
export interface ScenarioResult {
  name: string;
  dimensions: string[];
  mode: Mode;
  assertions: AssertionResult[];
  turns: TurnRecord[];
  durationMs: number;
  finalTables: Record<string, Row[]>;
  executionError?: string;
  scenarioAssertionsEvaluated?: boolean;
}
