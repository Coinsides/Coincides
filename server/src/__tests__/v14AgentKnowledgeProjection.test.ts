import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  projectAgentCapabilities,
  renderChannelWriteTools,
  renderDoorWriteTools,
  renderPerceptionTools,
} from '../agent/capabilityProjection.js';
import { buildSystemPrompt } from '../agent/system-prompt.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import { CHANNEL_WRITE_TOOLS, DOOR_WRITE_TOOLS, READ_TOOLS } from '../agent/tools/effectClassification.js';
import { AGENT_READ_TOOLS } from '../toolFace/registry.js';

const context = { userName: 'Manual Reader', currentDate: '2026-09-14', courses: [], memories: [], documentSummaries: [] };
// Before construction: four reader instruction lines (363) + LF (1) + the
// Container sentence (156). No untouched workflow/worldview bytes in the budget.
const BASELINE_BYTES = 520;
const MIN_BYTES = 442;
const MAX_BYTES = 598;
const oldDoorSentence = 'Container and scheduling actions use create_deck, create_section, create_goal, create_sub_goal, create_time_blocks, update_time_block, and link_task_cards. ';

function projectionText() {
  const projection = projectAgentCapabilities();
  return [renderPerceptionTools(projection.perceptionReaders), renderDoorWriteTools(projection.doorWrite),
    renderChannelWriteTools(projection.channelWrite)].join('\n');
}

function assertBudget(text: string) {
  const bytes = Buffer.byteLength(text, 'utf8');
  assert.ok(bytes >= MIN_BYTES && bytes <= MAX_BYTES, `projection ${bytes} bytes exceeds ${MIN_BYTES}..${MAX_BYTES} (baseline ${BASELINE_BYTES})`);
}

test('capability groups cover exactly the actual provider definitions and imported effect sets', () => {
  const projection = projectAgentCapabilities();
  for (const [actual, expected] of [[projection.doorWrite, DOOR_WRITE_TOOLS],
    [projection.channelWrite, CHANNEL_WRITE_TOOLS], [projection.read, READ_TOOLS]] as const) {
    assert.deepEqual(actual, [...expected].sort());
  }
  const all = [...projection.doorWrite, ...projection.channelWrite, ...projection.read];
  assert.equal(new Set(all).size, all.length);
  assert.deepEqual(all.sort(), toolDefinitions.map(tool => tool.name).sort());
});

test('perception membership follows registered readers intersected with read effects and provider exposure', () => {
  const projection = projectAgentCapabilities();
  assert.deepEqual(projection.perceptionReaders.map(tool => tool.name), AGENT_READ_TOOLS.map(tool => tool.name));
  for (const reader of projection.perceptionReaders) {
    assert.ok(READ_TOOLS.has(reader.name));
    assert.equal(reader, toolDefinitions.find(tool => tool.name === reader.name));
  }
});

test('new perception members use authoritative descriptions without a handwritten name allowlist', () => {
  const reader = { name: 'inspect_fixture', description: 'Read the synthetic fixture scope.' };
  assert.equal(renderPerceptionTools([reader]), '- Use inspect_fixture — Read the synthetic fixture scope.');
  assert.equal(renderPerceptionTools([]), '', 'removed members leave no stale usage entry');
});

test('door and channel renderers include newly supplied members and omit removed members', () => {
  assert.equal(renderDoorWriteTools(['synthetic_action']), '门内写动词: synthetic_action. ');
  assert.equal(renderChannelWriteTools(['synthetic_channel']), '信道写: synthetic_channel.');
});

test('workflow name references resolve against the provider and reject missing or retired capabilities', () => {
  const projection = projectAgentCapabilities();
  for (const tool of toolDefinitions) assert.equal(projection.name(tool.name), tool.name);
  assert.throws(() => projection.name('missing_fixture'), /unavailable tool: missing_fixture/);
  assert.throws(() => projection.name('create_card'), /unavailable tool: create_card/);
});

test('actual prompt contains the generated reader, door and channel fragments exactly once', () => {
  const projection = projectAgentCapabilities();
  const prompt = buildSystemPrompt('Manual Agent', context);
  for (const fragment of [renderPerceptionTools(projection.perceptionReaders), renderDoorWriteTools(projection.doorWrite),
    renderChannelWriteTools(projection.channelWrite)]) {
    assert.equal(prompt.split(fragment).length - 1, 1);
  }
});

test('the projected fragments stay within both sides of the pre-edit UTF-8 budget', () => {
  assert.equal(MIN_BYTES, Math.ceil(BASELINE_BYTES * 0.85));
  assert.equal(MAX_BYTES, Math.floor(BASELINE_BYTES * 1.15));
  assertBudget(projectionText());
  assert.throws(() => assertBudget(projectionText() + '膨胀'.repeat(100)), /exceeds/);
  assert.throws(() => assertBudget(''), /exceeds/);
});

test('restoring only the changed roster bytes reproduces the entire pre-edit prompt', () => {
  const projection = projectAgentCapabilities();
  const restored = buildSystemPrompt('Manual Agent', context)
    .replace(renderDoorWriteTools(projection.doorWrite), oldDoorSentence)
    .replace(renderChannelWriteTools(projection.channelWrite) + '\n', '');
  // Captured from the pre-edit builder baseline, not from the new implementation.
  assert.equal(createHash('sha256').update(restored).digest('hex'),
    '44affa4b6d7a9aa940e450602900856c567af3ae43fda983b18c3a08820ff2af');
});
