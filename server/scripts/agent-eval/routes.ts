import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import type { Router } from 'express';
import type { ApiResponse, Row, SseEvent } from './types.js';

type Handler = (req: any, res: any, next: (error?: unknown) => void) => unknown;
type Layer = { route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> } };

/** Same response seam as v14AgentRouteLifecycle: record the real route's bytes. */
export class RecordedResponse extends EventEmitter {
  writableEnded = false;
  destroyed = false;
  statusCode = 200;
  body: unknown;
  writes: string[] = [];
  events: SseEvent[] = [];
  private started = performance.now();
  private pending = '';
  setHeader() { return this; }
  flushHeaders() {}
  status(status: number) { this.statusCode = status; return this; }
  json(value: unknown) { this.body = structuredClone(value); this.end(); return this; }
  write(chunk: string) {
    assert.equal(this.writableEnded || this.destroyed, false, 'SSE cannot write after close');
    this.writes.push(chunk);
    this.pending += chunk.replaceAll('\r\n', '\n');
    let boundary: number;
    while ((boundary = this.pending.indexOf('\n\n')) >= 0) {
      const frame = this.pending.slice(0, boundary);
      this.pending = this.pending.slice(boundary + 2);
      const lines = frame.split('\n');
      const type = lines.find(line => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
      const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (data) this.events.push({ type, data: JSON.parse(data), elapsedMs: performance.now() - this.started });
    }
    return true;
  }
  end() {
    assert.equal(this.writableEnded, false, 'SSE/JSON response ends once');
    assert.equal(this.pending, '', 'SSE finishes with complete frames');
    this.writableEnded = true;
    this.emit('close');
    return this;
  }
}

export async function invoke(router: Router, method: string, path: string, userId: string, body?: unknown) {
  const url = new URL(path, 'http://eval.invalid');
  const segments = url.pathname.split('/').filter(Boolean);
  let params: Row = {};
  const layer = (router.stack as Layer[]).find(layer => {
    if (!layer.route?.methods[method.toLowerCase()]) return false;
    const pattern = layer.route.path.split('/').filter(Boolean);
    if (pattern.length !== segments.length) return false;
    const found: Row = {};
    const matches = pattern.every((segment, index) => {
      if (segment.startsWith(':')) { found[segment.slice(1)] = decodeURIComponent(segments[index]); return true; }
      return segment === segments[index];
    });
    if (matches) params = found;
    return matches;
  });
  assert.ok(layer?.route, `Existing route ${method} ${url.pathname}`);
  const req = Object.assign(new EventEmitter(), {
    userId, params, query: Object.fromEntries(url.searchParams), body,
    complete: true, aborted: false, method, headers: {},
  });
  const res = new RecordedResponse();
  // These concrete routes each expose one handler. Do not silently bypass new middleware.
  assert.equal(layer.route.stack.length, 1, 'Route adapter must be reviewed if middleware changes');
  await layer.route.stack[0].handle(req, res, error => { if (error) throw error; });
  assert.equal(res.writableEnded, true, 'The actual route completed its response');
  return res;
}

export async function createApiReader(userId: string) {
  const agent = (await import('../../src/routes/agent.js')).default;
  const proposals = (await import('../../src/routes/proposals.js')).default;
  const memories = (await import('../../src/routes/agentMemories.js')).default;
  const receipts = (await import('../../src/routes/toolReceipts.js')).default;
  const mounts: Array<[string, Router]> = [
    ['/api/settings/agent-memories', memories], ['/api/agent', agent],
    ['/api/proposals', proposals], ['/api/tool-receipts', receipts],
  ];
  return { agent, async request(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<ApiResponse> {
    const mount = mounts.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
    assert.ok(mount, `No fabricated API: ${path}`);
    const suffix = path.slice(mount[0].length);
    const response = await invoke(mount[1], method, !suffix || suffix.startsWith('?') ? `/${suffix}` : suffix, userId, body);
    return { status: response.statusCode, body: response.body };
  } };
}
