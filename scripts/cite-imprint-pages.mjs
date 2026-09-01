import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = dirname(SCRIPT_DIR);
const SERVER_DIR = join(REPO_DIR, 'server');
const CONTRACT_PATH = join(
  REPO_DIR,
  'docs',
  'agent-ops',
  'analysis',
  '2026-08-31-c3-citation-prompt-contract.md',
);
const ADDENDUM_PATH = join(
  REPO_DIR,
  'docs',
  'agent-ops',
  'analysis',
  '2026-08-31-c3-citation-prompt-contract-addendum-1.md',
);
const CENSUS_PATH = join(
  REPO_DIR,
  'docs',
  'agent-ops',
  'analysis',
  '2026-08-31-v12-9c-c2-divergence-census-v3.md',
);
const DATABASE_PATH = join(SERVER_DIR, 'coincides.db');
const CONTRACT_SHA256 = '8dd249db1cbbb34a04c0f4080bd34c73ebf319f10a4eb191c94078c8583832aa';
const CONTRACT_BYTES = 10_354;
const ADDENDUM_SHA256 = '2ab5f08231a37acf0279f6b051af04e32455cbc6cf3667b50d108c40d6237b4f';
const ADDENDUM_BYTES = 1_743;
const CENSUS_SHA256 = '2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab';
const CENSUS_BYTES = 5_096_178;
const ACTIVE_LOCKFILE_SHA256 = '891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95';
const MODEL = 'qwen-vl-max';
const API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const MAX_CALLS = 20;
const MAX_OUTBOUND_CHARS = 30_000;
const PLANNED_OUTBOUND_CHARS = 18_396;
const USER_EMAIL = 'test@test.com';

const PLANS = [
  {
    document: 'academic-reading',
    requestId: 'c3-academic-reading-p19',
    imprintId: 'd5247f8f-a4ff-4dce-8273-c62d4114425c',
    pageRange: { start: 19, end: 19 },
    expectedRequestChars: 4_437,
    pointShot: 'D-000029 / EV-000143',
  },
  {
    document: 'academic-reading',
    requestId: 'c3-academic-reading-p34-p35',
    imprintId: 'd5247f8f-a4ff-4dce-8273-c62d4114425c',
    pageRange: { start: 34, end: 35 },
    expectedRequestChars: 7_326,
    pointShot: 'D-000059 / EV-000268',
  },
  {
    document: 'writing-example-responses',
    requestId: 'c3-writing-responses-p4',
    imprintId: 'd238deb2-e80d-4378-b693-40f1f4c90c71',
    pageRange: { start: 4, end: 4 },
    expectedRequestChars: 3_456,
    pointShot: null,
  },
  {
    document: 'academic-writing',
    requestId: 'c3-academic-writing-p4',
    imprintId: 'b5df948c-d1c1-4448-a32d-b18ecadbf31e',
    pageRange: { start: 4, end: 4 },
    expectedRequestChars: 1_633,
    pointShot: null,
  },
  {
    document: 'listening',
    requestId: 'c3-listening-p8',
    imprintId: '1d1d8c63-f7ab-459c-a871-cfdf9739a89a',
    pageRange: { start: 8, end: 8 },
    expectedRequestChars: 1_544,
    pointShot: null,
  },
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stop(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function verifyFrozenFile(path, expectedBytes, expectedSha, label) {
  const bytes = readFileSync(path);
  const actualSha = sha256(bytes);
  if (bytes.length !== expectedBytes || actualSha !== expectedSha) {
    stop('contract_integrity_stop', `${label} integrity mismatch`, {
      expected_bytes: expectedBytes,
      actual_bytes: bytes.length,
      expected_sha256: expectedSha,
      actual_sha256: actualSha,
    });
  }
  return bytes.toString('utf8');
}

function extractPrompt(contract, marker) {
  const startMarker = `<!-- ${marker}_START -->`;
  const endMarker = `<!-- ${marker}_END -->`;
  const start = contract.indexOf(startMarker);
  const end = contract.indexOf(endMarker);
  if (start < 0 || end < 0 || contract.indexOf(startMarker, start + 1) >= 0
    || contract.indexOf(endMarker, end + 1) >= 0) {
    stop('contract_integrity_stop', `${marker} markers are not unique`);
  }
  const fenced = contract.slice(start + startMarker.length, end);
  const match = fenced.match(/^\n```text\n([\s\S]*?)\n```\n$/);
  if (!match || match[1].includes('\r')) {
    stop('contract_integrity_stop', `${marker} fence or LF boundary differs`);
  }
  return match[1];
}

function decodeCensus() {
  const archive = readFileSync(CENSUS_PATH, 'utf8');
  const startMarker = '<!-- CANONICAL_JSON_GZIP_BASE64_V3_START -->';
  const endMarker = '<!-- CANONICAL_JSON_GZIP_BASE64_V3_END -->';
  const start = archive.indexOf(startMarker);
  const end = archive.indexOf(endMarker);
  if (start < 0 || end < 0 || archive.indexOf(startMarker, start + 1) >= 0
    || archive.indexOf(endMarker, end + 1) >= 0) {
    stop('census_integrity_stop', 'Canonical census Base64 markers are not unique');
  }
  const fenced = archive.slice(start + startMarker.length, end);
  const match = fenced.match(/^\r?\n~~~base64\r?\n([A-Za-z0-9+/=\r\n]+)~~~\r?\n$/);
  if (!match) stop('census_integrity_stop', 'Canonical census Base64 fence differs');
  const raw = gunzipSync(Buffer.from(match[1].replace(/\s/g, ''), 'base64'));
  if (raw.length !== CENSUS_BYTES || sha256(raw) !== CENSUS_SHA256) {
    stop('census_integrity_stop', 'Canonical census bytes or SHA-256 differ', {
      actual_bytes: raw.length,
      actual_sha256: sha256(raw),
    });
  }
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    stop('census_integrity_stop', 'Canonical census contains a UTF-8 BOM');
  }
  if (raw.at(-1) !== 0x0a || raw.at(-2) === 0x0a) {
    stop('census_integrity_stop', 'Canonical census does not end with exactly one LF');
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch {
    stop('census_integrity_stop', 'Canonical census is not valid UTF-8');
  }
  const parsed = JSON.parse(text);
  const receipts = parsed?.gate_pass?.existence_differences;
  if (!Array.isArray(receipts) || receipts.length !== 175) {
    stop('census_integrity_stop', 'Existence receipt path is not the frozen 175-item array');
  }
  return receipts;
}

function unicodeCodePoints(value) {
  return [...value].length;
}

function makeRequestBody(systemPrompt, userPromptTemplate, canonicalInput) {
  const canonicalJson = JSON.stringify(canonicalInput);
  const placeholder = '{{CANONICAL_INPUT_JSON}}';
  if (userPromptTemplate.split(placeholder).length !== 2) {
    stop('contract_integrity_stop', 'User prompt placeholder is not unique');
  }
  const userPrompt = userPromptTemplate.replace(placeholder, canonicalJson);
  return {
    model: MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
}

function providerContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    stop('provider_response_stop', 'Provider response has no string message content');
  }
  return content;
}

async function main() {
  const contract = verifyFrozenFile(
    CONTRACT_PATH,
    CONTRACT_BYTES,
    CONTRACT_SHA256,
    'Main contract',
  );
  verifyFrozenFile(ADDENDUM_PATH, ADDENDUM_BYTES, ADDENDUM_SHA256, 'Addendum 1');
  const systemPrompt = extractPrompt(contract, 'C3_SYSTEM_PROMPT');
  const userPromptTemplate = extractPrompt(contract, 'C3_USER_PROMPT');
  const receipts = decodeCensus();

  const serviceUrl = pathToFileURL(join(SERVER_DIR, 'src', 'services', 'imprintCitations.ts')).href;
  const {
    buildCitationExistenceIndex,
    prepareImprintCitationRequest,
    validateImprintCitationResponse,
  } = await import(serviceUrl);
  const serverRequire = createRequire(join(SERVER_DIR, 'package.json'));
  const Database = serverRequire('better-sqlite3');
  const db = new Database(DATABASE_PATH, { readonly: true, fileMustExist: true });
  try {
    db.pragma('query_only = ON');
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(USER_EMAIL);
    if (!user || typeof user.id !== 'string') {
      stop('host_preflight_stop', `User ${USER_EMAIL} was not found`);
    }

    const prepared = PLANS.map((plan) => {
      const context = prepareImprintCitationRequest(db, user.id, {
        requestId: plan.requestId,
        imprintId: plan.imprintId,
        pageRange: plan.pageRange,
      });
      if (context.host.transcriber_lockfile_hash !== ACTIVE_LOCKFILE_SHA256) {
        stop('host_preflight_stop', `${plan.requestId} host lockfile hash differs`);
      }
      return { plan, context };
    });
    const uniqueHosts = [...new Map(prepared.map(({ plan, context }) => [
      plan.document,
      { document: plan.document, original_filename: context.host.original_filename },
    ])).values()];
    const existenceIndex = buildCitationExistenceIndex(receipts, uniqueHosts);

    const requests = prepared.map(({ plan, context }) => {
      const body = makeRequestBody(systemPrompt, userPromptTemplate, context.input);
      const serialized = JSON.stringify(body);
      const chars = unicodeCodePoints(serialized);
      if (chars !== plan.expectedRequestChars) {
        stop('budget_preflight_stop', `${plan.requestId} request character count differs`, {
          expected: plan.expectedRequestChars,
          actual: chars,
        });
      }
      return { plan, context, body, serialized, chars };
    });
    const plannedCalls = requests.length;
    const plannedChars = requests.reduce((sum, request) => sum + request.chars, 0);
    if (plannedCalls > MAX_CALLS
      || plannedChars > MAX_OUTBOUND_CHARS
      || plannedChars !== PLANNED_OUTBOUND_CHARS) {
      stop('budget_preflight_stop', 'Full-run budget preflight failed', {
        planned_calls: plannedCalls,
        planned_chars: plannedChars,
      });
    }

    const preflight = {
      contracts: {
        main: { bytes: CONTRACT_BYTES, sha256: CONTRACT_SHA256 },
        addendum_1: { bytes: ADDENDUM_BYTES, sha256: ADDENDUM_SHA256 },
      },
      census: { bytes: CENSUS_BYTES, sha256: CENSUS_SHA256, existence_receipts: 175 },
      database: { readonly: true, query_only: true },
      planned_calls: plannedCalls,
      planned_outbound_chars: plannedChars,
      call_limit: MAX_CALLS,
      outbound_char_limit: MAX_OUTBOUND_CHARS,
      requests: requests.map(({ plan, context, chars }) => ({
        request_id: plan.requestId,
        document: plan.document,
        page_range: plan.pageRange,
        fragment_count: context.input.fragments.length,
        fragment_text_chars: context.input.fragments.reduce(
          (sum, fragment) => sum + unicodeCodePoints(fragment.text),
          0,
        ),
        request_body_chars: chars,
        point_shot: plan.pointShot,
      })),
    };
    if (process.argv.includes('--preflight-only')) {
      console.log(JSON.stringify({ status: 'preflight_only', preflight }, null, 2));
      return;
    }

    const apiKey = process.env.DASHSCOPE_API_KEY;
    const keyReceipt = { present: typeof apiKey === 'string' && apiKey.length > 0, length: apiKey?.length ?? 0 };
    if (!keyReceipt.present) stop('credential_stop', 'DASHSCOPE_API_KEY is absent', { key: keyReceipt });

    let callCount = 0;
    let outboundChars = 0;
    const results = [];
    for (const request of requests) {
      const nextCalls = callCount + 1;
      const nextChars = outboundChars + request.chars;
      if (nextCalls > MAX_CALLS || nextChars > MAX_OUTBOUND_CHARS) {
        stop('budget_preflight_stop', `Budget would be exceeded before ${request.plan.requestId}`, {
          calls_before_send: callCount,
          chars_before_send: outboundChars,
          next_request_chars: request.chars,
        });
      }
      callCount = nextCalls;
      outboundChars = nextChars;
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: request.serialized,
      });
      const responseText = await response.text();
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        stop('provider_response_stop', `${request.plan.requestId} returned non-JSON HTTP content`, {
          http_status: response.status,
          calls_consumed: callCount,
          outbound_chars_consumed: outboundChars,
        });
      }
      if (!response.ok) {
        stop('provider_http_stop', `${request.plan.requestId} provider request failed`, {
          http_status: response.status,
          provider_code: payload?.code ?? null,
          calls_consumed: callCount,
          outbound_chars_consumed: outboundChars,
        });
      }
      const rawModelOutput = providerContent(payload);
      const validation = validateImprintCitationResponse(
        db,
        request.context,
        rawModelOutput,
        { activeLockfileHash: ACTIVE_LOCKFILE_SHA256, existenceIndex },
      );
      results.push({
        request_id: request.plan.requestId,
        document: request.plan.document,
        page_range: request.plan.pageRange,
        point_shot: request.plan.pointShot,
        fragment_count: request.context.input.fragments.length,
        request_body_chars: request.chars,
        cumulative_calls: callCount,
        cumulative_outbound_chars: outboundChars,
        retry_count: 0,
        provider_usage: payload?.usage ?? null,
        raw_model_output: rawModelOutput,
        validation,
      });
    }

    console.log(JSON.stringify({
      status: 'complete',
      model: MODEL,
      endpoint: API_URL,
      key: keyReceipt,
      preflight,
      actual_calls: callCount,
      actual_outbound_chars: outboundChars,
      retries: 0,
      results,
    }, null, 2));
  } finally {
    db.close();
  }
}

main().catch((error) => {
  const receipt = {
    status: 'stopped',
    code: typeof error?.code === 'string' ? error.code : 'unexpected_stop',
    message: error instanceof Error ? error.message : String(error),
    details: error?.details ?? {},
  };
  console.error(JSON.stringify(receipt, null, 2));
  process.exitCode = 1;
});
