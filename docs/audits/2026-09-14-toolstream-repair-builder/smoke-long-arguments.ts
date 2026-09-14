// Local HTTP replay only. Run from server/: node --import tsx ../docs/audits/2026-09-14-toolstream-repair-builder/smoke-long-arguments.ts
// The provider, orchestrator, executor and proposal service are the real application modules.
import assert from 'node:assert/strict';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

type Json = Record<string, any>;
const directory = dirname(resolve(process.argv[1]));
const root = resolve(directory, '../../..');
const resultPath = join(directory, 'smoke-long-arguments-result.json');
const requireServer = createRequire(join(root, 'server/package.json'));
const express = requireServer('express');
const USER = 'replay-user';
const COURSE = '11111111-1111-4111-8111-111111111111';
const documentIds = Array.from({ length: 384 }, (_, index) =>
  `22222222-2222-4222-8222-${String(index + 1).padStart(12, '0')}`);
const argumentsJson = JSON.stringify({
  type: 'organized_note',
  data: { course_id: COURSE, document_ids: documentIds, note_title: '整理笔记：极限、连续性与课堂练习' },
});
const scenarios = [
  { name: 'long-success', id: 'replay-success', raw: argumentsJson, finishReason: 'tool_calls' },
  { name: 'long-truncated', id: 'replay-truncated', raw: argumentsJson.slice(0, -19), finishReason: 'length' },
] as const;
const report: Json = {
  startedAt: new Date().toISOString(),
  kind: 'Local post-auth HTTP replay with synthetic OpenAI-compatible HTTP endpoint',
  isolation: 'In-memory SQLite; fresh system-temp appdata/assets/uploads; allowlisted process environment; no .env or user database; loopback HTTP only.',
  liveModelCall: false,
  authenticatedBrowserJourney: false,
  scenarioCount: scenarios.length,
  ordinaryFixtureDocumentCount: documentIds.length,
  scenarios: [],
  outboundProviderRequests: [],
  complete: false,
};

function sanitize(value: string): string {
  return value.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(?:sk-|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+/g, '[redacted]');
}
const save = () => writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
async function listen(server: Server): Promise<string> {
  await new Promise<void>((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}
async function close(server?: Server) {
  if (server?.listening) await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
}
const nextTurn = () => new Promise<void>(done => setImmediate(done));
async function sendSse(response: ServerResponse, frames: string[]) {
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  // Actual HTTP write boundaries deliberately cross SSE JSON and UTF-8 boundaries.
  const bytes = Buffer.from(frames.join(''), 'utf8');
  for (let index = 0; index < bytes.length; index += 127) {
    response.write(bytes.subarray(index, index + 127));
    await nextTurn();
  }
  response.end();
}
function event(delta: Json, finishReason: string | null = null, trailingNewline = true) {
  return `data:${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finishReason }] })}${trailingNewline ? '\n\n' : ''}`;
}
function toolFrames(scenario: typeof scenarios[number]) {
  const frames: string[] = [];
  // The identity arrives after the first arguments delta; subsequent index fields are omitted.
  const step = 509;
  frames.push(event({ tool_calls: [{ index: 0, function: { arguments: scenario.raw.slice(0, step) } }] }));
  frames.push(event({ tool_calls: [{ index: 0, id: scenario.id, function: { name: 'create_proposal', arguments: '' } }] }));
  for (let index = step; index < scenario.raw.length; index += step) {
    frames.push(event({ tool_calls: [{ function: { arguments: scenario.raw.slice(index, index + step) } }] }));
  }
  // Deliberately no final newline or [DONE]: this exercises EOF residual parsing.
  frames.push(event({}, scenario.finishReason, false));
  return frames;
}

async function main() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'coincides-replay-'));
  let providerServer: Server | undefined;
  let applicationServer: Server | undefined;
  let closeDb: (() => void) | undefined;
  const originalEnvironment = process.env;
  const nativeFetch = globalThis.fetch;
  try {
    const isolatedEnvironment: NodeJS.ProcessEnv = {};
    for (const name of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP',
      'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'ComSpec', 'COMSPEC', 'PATHEXT']) {
      if (process.env[name] !== undefined) isolatedEnvironment[name] = process.env[name];
    }
    const directories = Object.fromEntries(['appdata', 'canvas', 'sources', 'uploads'].map(name => {
      const path = join(temporaryRoot, name);
      mkdirSync(path);
      return [name, path];
    }));
    const emptyDotenv = join(temporaryRoot, 'empty.dotenv');
    writeFileSync(emptyDotenv, '', 'utf8');
    process.env = { ...isolatedEnvironment, DB_PATH: ':memory:',
      COINCIDES_APP_DATA_DIR: directories.appdata, CANVAS_ASSET_DIR: directories.canvas,
      SOURCE_BLOB_DIR: directories.sources, UPLOAD_DIR: directories.uploads,
      DOTENV_CONFIG_PATH: emptyDotenv, DOTENV_CONFIG_QUIET: 'true', GENERIC_API_KEY: 'syn-replay' };

    let activeScenario: typeof scenarios[number] = scenarios[0];
    let receivedToolResult: Json | undefined;
    let generationRequests = 0;
    const serverErrors: string[] = [];
    providerServer = createServer(async (request, response) => {
      try {
        assert.equal(request.url, '/v1/chat/completions');
        assert.equal(request.method, 'POST');
        let requestBody = '';
        for await (const piece of request) requestBody += piece.toString();
        const body = JSON.parse(requestBody) as Json;
        assert.equal(body.max_tokens, 16384);
        const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
        const toolResult = body.messages.findLast((message: Json) => message.role === 'tool');
        report.outboundProviderRequests.push({
          scenario: activeScenario.name, kind: hasTools ? toolResult ? 'tool-feedback' : 'tool-request' : 'organized-note-blocks',
          max_tokens: body.max_tokens, ...(hasTools && { parallel_tool_calls: body.parallel_tool_calls }),
        });
        if (!hasTools) {
          generationRequests++;
          const content = JSON.stringify({ blocks: [{ block_type: 'paragraph', template_id: 'text.paragraph',
            title: '极限与连续性', content_json: { body: '极限描述函数在输入接近某一点时的行为。连续性连接函数值与极限。' },
            plain_text: '极限描述函数在输入接近某一点时的行为。连续性连接函数值与极限。', confidence: 0.8, warnings: [] }] });
          await sendSse(response, [event({ content }, 'stop', false)]);
        } else if (toolResult) {
          assert.equal(body.parallel_tool_calls, true);
          assert.equal(toolResult.tool_call_id, activeScenario.id);
          receivedToolResult = JSON.parse(toolResult.content);
          const content = receivedToolResult?.error
            ? '整理笔记的工具参数被截断，本次提案未创建；可以重新生成参数后再试。'
            : '整理笔记提案已创建，请在 Agent 面板「提案」收件箱中查看。';
          await sendSse(response, [event({ content }, 'stop', false)]);
        } else {
          assert.equal(body.parallel_tool_calls, true);
          await sendSse(response, toolFrames(activeScenario));
        }
      } catch (error) {
        serverErrors.push(sanitize(error instanceof Error ? error.message : String(error)));
        if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end('{"error":"Synthetic replay endpoint failed"}');
      }
    });
    const providerUrl = await listen(providerServer);
    const allowedOrigins = new Set([providerUrl]);
    // Prevent fixture configuration mistakes from making a real external request.
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      assert.ok(allowedOrigins.has(url.origin), 'Replay request must target one of its local HTTP fixtures');
      return nativeFetch(input, init);
    }) as typeof fetch;

    const dbModule = await import(pathToFileURL(join(root, 'server/src/db/init.ts')).href);
    const { ensureSegmentsForMaterial, listCourseMaterials } = await import(pathToFileURL(join(root, 'server/src/services/courseMaterials.ts')).href);
    const { default: agentRouter } = await import(pathToFileURL(join(root, 'server/src/routes/agent.ts')).href);
    const { default: proposalRouter } = await import(pathToFileURL(join(root, 'server/src/routes/proposals.ts')).href);
    const db = await dbModule.initDb(':memory:');
    closeDb = dbModule.closeDb;
    db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
      .run(USER, 'replay@example.invalid', 'synthetic', 'Synthetic replay', JSON.stringify({
        active_provider: 'generic', ai_providers: { generic: { default_model: 'synthetic-replay', base_url: providerUrl } },
      }));
    db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(COURSE, USER, 'Synthetic calculus materials');
    for (const [index, id] of documentIds.entries()) {
      db.prepare(`INSERT INTO documents(id,user_id,course_id,filename,file_path,file_type,parse_status,extracted_text,
        page_count,document_type,chunk_count) VALUES(?,?,?,?,?,'pdf','completed',?,1,'slides',1)`)
        .run(id, USER, COURSE, `synthetic-${index}.pdf`, `synthetic/${index}.pdf`, 'Limits and continuity.');
      db.prepare('INSERT INTO document_chunks(id,document_id,chunk_index,content,page_start,page_end,heading) VALUES(?,?,0,?,1,1,?)')
        .run(`replay-chunk-${index}`, id, 'A limit describes the behavior near an input.', `Lesson ${index + 1}`);
    }
    for (const material of listCourseMaterials(db, USER, COURSE)) ensureSegmentsForMaterial(db, USER, material.id);
    const app = express();
    app.use(express.json());
    app.use((request: Json, _response: Json, next: () => void) => { request.userId = USER; next(); });
    app.use('/api/agent', agentRouter);
    app.use('/api/proposals', proposalRouter);
    applicationServer = createServer(app);
    const applicationUrl = await listen(applicationServer);
    allowedOrigins.add(applicationUrl);

    for (const scenario of scenarios) {
      activeScenario = scenario;
      receivedToolResult = undefined;
      const generationBefore = generationRequests;
      const countBefore = db.prepare('SELECT COUNT(*) AS count FROM proposals').get().count;
      const conversationId = `conversation-${scenario.name}`;
      db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)').run(conversationId, USER, '整理笔记回放');
      const response = await fetch(`${applicationUrl}/api/agent/conversations/${conversationId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '请将这些课堂材料整理成笔记提案。' }),
      });
      assert.equal(response.status, 200);
      const sse = await response.text();
      const events = sse.split('\n\n').filter(Boolean).map(frame => {
        const [eventLine, dataLine] = frame.split('\n');
        return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
      });
      const toolEvents = events.filter(entry => entry.event.startsWith('tool_'));
      const readableError = typeof receivedToolResult?.error === 'string' && receivedToolResult.error.length > 0;
      const countAfter = db.prepare('SELECT COUNT(*) AS count FROM proposals').get().count;
      const result: Json = {
        name: scenario.name, rawArgumentCharacters: scenario.raw.length, rawArgumentBytes: Buffer.byteLength(scenario.raw),
        finishReason: scenario.finishReason, sseToolEvents: toolEvents, modelReceivedToolResult: Boolean(receivedToolResult),
        modelReceivedReadableError: readableError, proposalDelta: countAfter - countBefore,
        generationRequestDelta: generationRequests - generationBefore,
        globalSseErrorCount: events.filter(entry => entry.event === 'error').length,
        doneEventCount: events.filter(entry => entry.event === 'done').length,
        emptyShot: countAfter === countBefore && !readableError,
      };
      report.scenarios.push(result);
      save();
      assert.deepEqual(toolEvents, [
        { event: 'tool_start', data: { id: scenario.id, name: 'create_proposal' } },
        { event: 'tool_end', data: { id: scenario.id, name: 'create_proposal', ok: scenario.finishReason !== 'length' } },
      ]);
      assert.equal(result.globalSseErrorCount, 0);
      assert.equal(result.doneEventCount, 1);
      assert.equal(result.emptyShot, false);
      if (scenario.finishReason === 'length') {
        assert.ok(readableError);
        assert.match(receivedToolResult!.error, /length/);
        assert.match(receivedToolResult!.error, /truncat/i);
        assert.equal(countAfter, countBefore);
        assert.equal(generationRequests, generationBefore);
        result.modelError = sanitize(receivedToolResult!.error);
        result.sseTextMakesFailureVisible = events.some(entry => entry.event === 'text' && entry.data.content.includes('未创建'));
        assert.equal(result.sseTextMakesFailureVisible, true);
      } else {
        assert.equal(readableError, false);
        assert.equal(countAfter - countBefore, 1);
        assert.equal(generationRequests - generationBefore, 1);
        assert.match(receivedToolResult!.message, /Proposals inbox \(「提案」收件箱\) in the Agent panel/);
        result.receiptMessage = receivedToolResult!.message;
        const proposal = db.prepare('SELECT type,status,conversation_id,data FROM proposals WHERE id=?').get(receivedToolResult!.id);
        const data = JSON.parse(proposal.data);
        result.persistedProposal = { type: proposal.type, status: proposal.status, conversationMatches: proposal.conversation_id === conversationId,
          generationMode: data.generation_mode, sourceMaterialCount: data.source_material_ids.length, blockCount: data.blocks.length };
        assert.equal(proposal.type, 'organized_note');
        assert.equal(proposal.status, 'pending');
        assert.equal(data.generation_mode, 'ai');
        assert.equal(data.source_material_ids.length, documentIds.length);
        assert.ok(data.blocks.length > 0);
        const inboxResponse = await fetch(`${applicationUrl}/api/proposals?status=pending`);
        assert.equal(inboxResponse.status, 200);
        const inbox = await inboxResponse.json() as Json[];
        result.visibleInPendingInboxApi = inbox.some(entry => entry.id === receivedToolResult!.id);
        assert.equal(result.visibleInPendingInboxApi, true);
      }
    }
    assert.deepEqual(serverErrors, []);
    report.emptyShots = report.scenarios.filter((scenario: Json) => scenario.emptyShot).length;
    report.emptyShotDenominator = scenarios.length;
    report.emptyShotRate = report.emptyShots / report.emptyShotDenominator;
    report.proposalIssuedEventCount = db.prepare("SELECT COUNT(*) AS count FROM events WHERE verb='proposal_issued'").get().count;
    assert.equal(report.proposalIssuedEventCount, 1);
    report.complete = true;
  } catch (error) {
    report.failure = sanitize(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await close(applicationServer);
    await close(providerServer);
    closeDb?.();
    globalThis.fetch = nativeFetch;
    process.env = originalEnvironment;
    // Delete only the exact fresh temporary root, after checking containment.
    const pathFromTemp = relative(resolve(tmpdir()), resolve(temporaryRoot));
    if (!pathFromTemp || pathFromTemp === '..' || pathFromTemp.startsWith(`..${sep}`) || isAbsolute(pathFromTemp)) {
      report.cleanupError = 'Temporary-root containment check failed; no deletion attempted.';
      process.exitCode = 1;
    } else {
      try { rmSync(temporaryRoot, { recursive: true, force: true }); }
      catch { report.cleanupError = 'Temporary fixture cleanup failed.'; process.exitCode = 1; }
    }
    report.finishedAt = new Date().toISOString();
    save();
    console.log(`[toolstream-replay] ${report.complete ? 'PASS' : 'FAIL'}; summary=${relative(root, resultPath)}`);
  }
}

void main();
