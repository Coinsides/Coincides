import { createHash } from 'node:crypto';
import {
  createMcpHandler,
  fromJsonSchema,
  McpServer,
  validateHostHeader,
  validateOriginHeader,
  type CallToolResult,
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
  publicToolFaceEntries,
} from './manifest.js';
import {
  requestHarness,
  resolveEffectiveTier,
} from './policy.js';

const TOOL_METADATA_KEY = 'io.coincides/toolFace';
const RECEIPT_METADATA_KEY = 'io.coincides/toolFaceReceipt';

export type ReceiptWriter = (input: WriteToolFaceReceiptInput) => ToolFaceReceipt;

export interface ToolCallDispatchContext {
  callId: string;
  envelope?: Record<string, unknown>;
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

function proposalResult(receipt: ToolFaceReceipt): CallToolResult {
  return {
    content: [{
      type: 'text',
      text: 'Tool call recorded as a proposal for human review; no business action was executed.',
    }],
    _meta: receiptMetadata(receipt),
  };
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
): Promise<CallToolResult> {
  const envelope = context.envelope;
  const effectiveTier = resolveEffectiveTier(entry.tier, envelope);
  const receiptBase = {
    userId,
    callId: context.callId,
    tool: entry.name,
    harness: requestHarness(envelope),
    inputDigest: digestInput(input),
    humanEntry: entry.human_entry,
    resources: [],
  } satisfies Omit<WriteToolFaceReceiptInput, 'tier'>;

  if (effectiveTier === 'propose') {
    return proposalResult(receiptWriter({ ...receiptBase, tier: 'propose' }));
  }
  if (effectiveTier === 'confirm') {
    throw new AppError(
      501,
      'Confirm-tier tools require an approved elicitation schema and human-review entrypoint',
    );
  }

  const value = await binding(input, { userId });
  const receipt = receiptWriter({ ...receiptBase, tier: 'immediate' });
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
