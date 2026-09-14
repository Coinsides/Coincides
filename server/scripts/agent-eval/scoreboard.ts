import type { ScenarioResult } from './types.js';

export function summarizeScenario(result: ScenarioResult) {
  const evaluated = result.scenarioAssertionsEvaluated !== false;
  const passed = evaluated ? result.assertions.filter(assertion => assertion.passed).length : 0;
  const total = evaluated ? result.assertions.length : 0;
  const byTool: Record<string, number> = Object.create(null);
  for (const turn of result.turns) for (const event of turn.events) {
    if (event.type === 'tool_end' && event.data.ok === false) {
      const name = typeof event.data.name === 'string' ? event.data.name : '(unnamed)';
      byTool[name] = (byTool[name] ?? 0) + 1;
    }
  }
  return {
    name: result.name, dimensions: result.dimensions, mode: result.mode,
    scenarioAssertionsEvaluated: evaluated,
    ...(!evaluated ? { notEvaluatedReason: 'Live captures evidence and transport checks only; controlled scenario assertions require scripted mode.' } : {}),
    taskCompletion: { passed, total, rate: total ? passed / total : null },
    claimWithoutReceiptCount: (result.finalTables.events ?? []).filter(event => event.verb === 'claim_without_receipt').length,
    toolMisuse: { count: Object.values(byTool).reduce((a, b) => a + b, 0), byTool: { ...byTool } },
    timing: { userTurns: result.turns.length,
      toolRounds: result.turns.reduce((sum, turn) => sum + turn.messages.filter(row => row.role === 'assistant'
        && row.tool_calls && JSON.parse(row.tool_calls).length > 0).length, 0),
      durationMs: result.durationMs,
      turns: result.turns.map(turn => ({ durationMs: turn.durationMs,
        toolRounds: turn.messages.filter(row => row.role === 'assistant' && row.tool_calls && JSON.parse(row.tool_calls).length > 0).length })),
    },
    failures: result.assertions.filter(assertion => !assertion.passed),
    ...(result.executionError ? { executionError: result.executionError } : {}),
  };
}
export function readScoreboard(runId: string, results: ScenarioResult[]) {
  const scenarios = results.map(summarizeScenario);
  const passed = scenarios.reduce((n, scenario) => n + scenario.taskCompletion.passed, 0);
  const total = scenarios.reduce((n, scenario) => n + scenario.taskCompletion.total, 0);
  const byTool: Record<string, number> = Object.create(null);
  for (const scenario of scenarios) for (const [tool, count] of Object.entries(scenario.toolMisuse.byTool)) {
    byTool[tool] = (byTool[tool] ?? 0) + count;
  }
  return { schemaVersion: 1, runId, scenarios,
    taskCompletion: { passed, total, rate: total ? passed / total : null },
    claimWithoutReceiptCount: scenarios.reduce((n, row) => n + row.claimWithoutReceiptCount, 0),
    toolMisuse: { count: Object.values(byTool).reduce((a, b) => a + b, 0), byTool: { ...byTool } },
    timing: { userTurns: scenarios.reduce((n, row) => n + row.timing.userTurns, 0),
      toolRounds: scenarios.reduce((n, row) => n + row.timing.toolRounds, 0),
      durationMs: scenarios.reduce((n, row) => n + row.timing.durationMs, 0) },
  };
}
export function markdownScoreboard(score: ReturnType<typeof readScoreboard>): string {
  const escape = (text: string) => text.replaceAll('|', '\\|').replaceAll('\n', ' ');
  return [
    `# Agent eval ${score.runId}`, '',
    '任务完成率仅表示机器断言通过比例，不代表真实模型成功率。空头支票仅为既有窄词观察计数；工具误用按 tool_end ok=false 计数，包含故意触发的超时。耗时为实际墙钟，不包含 fake clock 推进值。', '',
    '| 场景 | 模式 | 断言通过/总数 | 空头支票 | 失败工具 | 用户轮/工具轮 | 毫秒 |',
    '|---|---|---:|---:|---|---:|---:|',
    ...score.scenarios.map(s => `| ${escape(s.name)} | ${s.mode} | ${s.taskCompletion.passed}/${s.taskCompletion.total} | ${s.claimWithoutReceiptCount} | ${escape(JSON.stringify(s.toolMisuse.byTool))} | ${s.timing.userTurns}/${s.timing.toolRounds} | ${s.timing.durationMs.toFixed(1)} |`),
    '', `总计：${score.taskCompletion.passed}/${score.taskCompletion.total}；空头支票 ${score.claimWithoutReceiptCount}；失败工具 ${score.toolMisuse.count}。`,
    ...score.scenarios.filter(s => !s.scenarioAssertionsEvaluated).map(s => `- ${escape(s.name)}：live 仅采证与传输检查，场景断言未评估，完成率为 null。`),
    ...score.scenarios.flatMap(s => s.failures.map(f => `- ${escape(s.name)} / ${escape(f.name)}：${escape(f.error ?? 'failed')}`)), '',
    'LLM 评分、幻觉率及 live 批跑验收均未包含。', '',
  ].join('\n');
}
