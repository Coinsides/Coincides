import { createHash } from 'node:crypto';
import {
  createMcpHandler,
  fromJsonSchema,
  inputRequired,
  inputResponse,
  McpServer,
  validateHostHeader,
  validateOriginHeader,
  type CallToolResult,
  type InputRequiredResult,
  type JsonSchemaType,
} from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { RequestHandler } from 'express';
import type { McpTransportConfig } from '../db/validateConfig.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  writeToolFaceReceipt,
  type ToolFaceReceipt,
  type WriteToolFaceReceiptInput,
} from '../services/toolFaceReceipts.js';
import { TOOL_BINDINGS, type ToolBinding } from './bindings.js';
import {
  assertToolBindingParity,
  type LoadedToolFaceManifest,
  type LoadedToolFaceManifestEntry,
  publicToolFaceEntries,
} from './manifest.js';
import {
  requestHarness,
  resolveEffectiveTier,
} from './policy.js';

const TOOL_METADATA_KEY = 'io.coincides/toolFace';
const RECEIPT_METADATA_KEY = 'io.coincides/toolFaceReceipt';
const DECISION_METADATA_KEY = 'io.coincides/toolFaceDecision';

export type ReceiptWriter = (input: WriteToolFaceReceiptInput) => ToolFaceReceipt;

export interface ToolCallDispatchContext {
  callId: string;
  envelope?: Record<string, unknown>;
  inputResponses?: Record<string, unknown>;
}

export interface McpRequestHandlerOptions {
  manifest: LoadedToolFaceManifest;
  bindings?: ReadonlyMap<string, ToolBinding>;
  receiptWriter?: ReceiptWriter;
}

function digestInput(input: Record<string, unknown>): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
}

function receiptMetadata(receipt: ToolFaceReceipt): Record<string, unknown> {
  return {
    [RECEIPT_METADATA_KEY]: {
      id: receipt.id,
      status: receipt.status,
    },
  };
}

function proposalResult(
  receipt: ToolFaceReceipt,
  structuredContent?: CallToolResult['structuredContent'],
): CallToolResult {
  const result: CallToolResult = {
    content: [{
      type: 'text',
      text: 'Tool call recorded as a proposal for human review; no business action was executed.',
    }],
    _meta: receiptMetadata(receipt),
  };
  if (structuredContent !== undefined) result.structuredContent = structuredContent;
  return result;
}

function batchIdsFromInput(
  entry: LoadedToolFaceManifestEntry,
  input: Record<string, unknown>,
): string[] | null {
  const batchField = entry.threshold?.batch_field;
  if (typeof batchField !== 'string') return null;
  const batchIds = input[batchField];
  if (!Array.isArray(batchIds) || !batchIds.every((id) => typeof id === 'string')) {
    return null;
  }
  return batchIds;
}

function proposedResources(
  entry: LoadedToolFaceManifestEntry,
  input: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const batchIds = batchIdsFromInput(entry, input);
  if (!batchIds) return [];
  return batchIds.map((id) => ({ kind: 'note', id, outcome: 'pending' }));
}

function proposalStructuredContent(
  entry: LoadedToolFaceManifestEntry,
  input: Record<string, unknown>,
): CallToolResult['structuredContent'] | undefined {
  return batchIdsFromInput(entry, input) ? { results: [] } : undefined;
}

type ToolFaceDecision = 'rejected' | 'declined' | 'cancelled';

function confirmationMessage(
  entry: LoadedToolFaceManifestEntry,
  input: Record<string, unknown>,
): string {
  const batchIds = batchIdsFromInput(entry, input);
  if (!batchIds) {
    return `Confirm ${entry.name}; 0 declared resource ids are available for this call.`;
  }
  return `Confirm ${entry.name} for ${batchIds.length} affected item(s). IDs: ${batchIds.join(', ')}`;
}

function confirmationRequired(
  entry: LoadedToolFaceManifestEntry,
  input: Record<string, unknown>,
): InputRequiredResult {
  return inputRequired({
    inputRequests: {
      confirm: inputRequired.elicit({
        message: confirmationMessage(entry, input),
        requestedSchema: {
          type: 'object',
          properties: { confirm: { type: 'boolean' } },
          required: ['confirm'],
        },
      }),
    },
  });
}

function rejectedResult(decision: ToolFaceDecision): CallToolResult {
  return {
    isError: false,
    content: [{
      type: 'text',
      text: 'Tool call cancelled at the user\'s request; no notes were deleted and no business action was executed.',
    }],
    structuredContent: { results: [] },
    _meta: {
      [DECISION_METADATA_KEY]: { decision },
    },
  };
}

function appliedResources(value: unknown): Array<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  const results = (value as Record<string, unknown>).results;
  if (!Array.isArray(results)) return [];

  return results.flatMap((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return [];
    const result = item as Record<string, unknown>;
    if (typeof result.note_id !== 'string' || typeof result.outcome !== 'string') return [];
    return [{
      kind: 'note',
      id: result.note_id,
      outcome: result.outcome,
      ...(typeof result.reason === 'string' && { reason: result.reason }),
    }];
  });
}

function appErrorResult(error: AppError): CallToolResult {
  const safeMessage = error.statusCode < 500 ? error.message : 'Internal server error';
  const details = error.statusCode < 500
    && error.details
    && typeof error.details === 'object'
    && !Array.isArray(error.details)
    && typeof (error.details as Record<string, unknown>).code === 'string'
      ? { code: (error.details as Record<string, unknown>).code }
      : undefined;
  if (error.statusCode >= 500) console.error('MCP tool AppError:', error);

  return {
    isError: true,
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: safeMessage,
        status: error.statusCode,
        ...(details && { details }),
      }),
    }],
  };
}

function internalToolErrorResult(error: unknown): CallToolResult {
  console.error('Unexpected MCP tool failure:', error);
  return {
    isError: true,
    content: [{
      type: 'text',
      text: JSON.stringify({ error: 'Internal server error', status: 500 }),
    }],
  };
}

function reportMcpTransportError(error: Error): void {
  console.error('MCP transport failure:', error);
}

export async function dispatchToolCall(
  entry: ReturnType<typeof publicToolFaceEntries>[number],
  binding: ToolBinding,
  input: Record<string, unknown>,
  userId: string,
  context: ToolCallDispatchContext,
  receiptWriter: ReceiptWriter = writeToolFaceReceipt,
): Promise<CallToolResult | InputRequiredResult> {
  const envelope = context.envelope;
  const effectiveTier = resolveEffectiveTier(entry, envelope, input);
  const receiptBase = {
    userId,
    callId: context.callId,
    tool: entry.name,
    harness: requestHarness(envelope),
    inputDigest: digestInput(input),
    humanEntry: entry.human_entry,
    intendedInput: input,
  } satisfies Omit<WriteToolFaceReceiptInput, 'tier' | 'resources'>;

  if (effectiveTier === 'propose') {
    const receipt = receiptWriter({
      ...receiptBase,
      tier: 'propose',
      resources: proposedResources(entry, input),
    });
    return proposalResult(receipt, proposalStructuredContent(entry, input));
  }
  if (effectiveTier === 'confirm') {
    const response = inputResponse(context.inputResponses, 'confirm');
    let decision: ToolFaceDecision | undefined;

    if (
      response.kind === 'elicit'
      && response.action === 'accept'
      && response.content?.confirm === false
    ) {
      decision = 'rejected';
    } else if (response.kind === 'elicit' && response.action === 'decline') {
      decision = 'declined';
    } else if (response.kind === 'elicit' && response.action === 'cancel') {
      decision = 'cancelled';
    }

    if (decision) return rejectedResult(decision);
    if (
      response.kind !== 'elicit'
      || response.action !== 'accept'
      || response.content?.confirm !== true
    ) {
      return confirmationRequired(entry, input);
    }
  }

  const value = await binding(input, { userId });
  const receipt = receiptWriter({
    ...receiptBase,
    tier: 'immediate',
    resources: appliedResources(value),
  });
  return {
    content: [{ type: 'text', text: JSON.stringify(value) ?? 'null' }],
    structuredContent: value as CallToolResult['structuredContent'],
    _meta: receiptMetadata(receipt),
  };
}

function createFreshServer(
  entries: ReturnType<typeof publicToolFaceEntries>,
  bindings: ReadonlyMap<string, ToolBinding>,
  userId: string,
  receiptWriter: ReceiptWriter,
): McpServer {
  const server = new McpServer({ name: 'coincides', version: '1.8.0' });
  for (const entry of entries) {
    const binding = bindings.get(entry.name)!;
    server.registerTool(
      entry.name,
      {
        description: entry.description,
        inputSchema: fromJsonSchema(entry.input_schema as JsonSchemaType),
        outputSchema: fromJsonSchema(entry.output_schema as JsonSchemaType),
        _meta: {
          [TOOL_METADATA_KEY]: {
            truth: entry.truth,
            tier: entry.tier,
            human_entry: entry.human_entry,
            scopes: entry.scopes,
          },
        },
      },
      async (input, context) => {
        try {
          return await dispatchToolCall(
            entry,
            binding,
            input as Record<string, unknown>,
            userId,
            {
              callId: String(context.mcpReq.id),
              envelope: context.mcpReq.envelope as Record<string, unknown> | undefined,
              inputResponses: context.mcpReq.inputResponses as Record<string, unknown> | undefined,
            },
            receiptWriter,
          );
        } catch (error) {
          if (error instanceof AppError) return appErrorResult(error);
          return internalToolErrorResult(error);
        }
      },
    );
  }
  return server;
}

export function createMcpHostOriginGuard(
  config: McpTransportConfig,
): RequestHandler {
  return (req, res, next) => {
    const host = validateHostHeader(req.headers.host, config.allowedHostnames);
    if (!host.ok) {
      res.status(403).end();
      return;
    }
    const origin = validateOriginHeader(
      req.headers.origin,
      config.allowedOriginHostnames,
    );
    if (!origin.ok) {
      res.status(403).end();
      return;
    }
    next();
  };
}

export function createMcpRequestHandler(
  options: McpRequestHandlerOptions,
): RequestHandler {
  const entries = publicToolFaceEntries(options.manifest);
  const bindings = options.bindings ?? TOOL_BINDINGS;
  const receiptWriter = options.receiptWriter ?? writeToolFaceReceipt;
  assertToolBindingParity(entries, bindings);

  return async (request, response, next) => {
    const userId = (request as AuthRequest).userId;
    if (!userId) {
      next(new AppError(500, 'Authenticated MCP request is missing user context'));
      return;
    }

    let handler: ReturnType<typeof createMcpHandler> | undefined;
    let forwardedError = false;
    try {
      handler = createMcpHandler(
        () => createFreshServer(entries, bindings, userId, receiptWriter),
        { legacy: 'reject', onerror: reportMcpTransportError },
      );
      const nodeHandler = toNodeHandler(handler, { onerror: reportMcpTransportError });
      await nodeHandler(request, response, request.body);
    } catch (error) {
      forwardedError = true;
      next(error);
    } finally {
      if (handler) {
        try {
          await handler.close();
        } catch (error) {
          if (!forwardedError && !response.headersSent) next(error);
          else console.error('Failed to close per-request MCP handler:', error);
        }
      }
    }
  };
}
