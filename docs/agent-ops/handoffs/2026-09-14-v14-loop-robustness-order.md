> **状态 (Status)**: done(施工与证据回填完成；server 两处环境红项及 git/secrets 留 HQ)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 循环健壮性批
> **上游**: claude-log §147 循环路审计(行号在案)

# 循环健壮性批

**性质**:orchestrator/routes 五处运行时韧性修复。⛔改工具语义/机关。

1. **流挂起永等**:超时旗改 Promise.race(流迭代 vs 超时)+AbortSignal 贯通(路由 req close/计时→provider fetch/SDK abort);
2. **工具执行零超时**:每工具 Promise.race 预算(60s,申报取值)→超时=错误 ToolResult(既有 catch 模式);
3. **8 轮耗尽静默退场**:耗尽时补一次无工具收尾调用让模型叙述末轮结果;或至少 yield 可区分的 round_limit 事件(择一实现申报);
4. **错误路丢弃已流文本**:各错误 return 前把 textBuffer 落史(标记 interrupted)——用户看见过的字必须在史里;
5. **预算失配**:请求级 deadline 传入 runAgent,轮间检查;路由 300s 平闸与 8×300s 失配消解(申报总预算取值);断线后工具写是否提交=裁**提交**(写门有收据可撤,断线⛔静默丢作业)。

验收:五处定向(挂起流夹具/慢工具夹具/8 轮夹具/错误路史落地/deadline)+agent 族回归+server 全量+client 全库;证据落 `docs/audits/2026-09-14-loop-robustness-builder/`;git/secrets HQ 收口。禁区照常;合成凭据 ≤20。Result:逐处行号+测试数字+取值申报。冲突停线举证。

## Result

**Builder · 2026-09-14**：五处施工与验收执行完成，代码按当前文件重定位，保留工具流修复与缓存单行为。以下为工程回执，非 HQ 放行；server 全量仍有两项环境失败。

### 逐处落点与取值

| # | 当前文件 / 行号 | 实现与申报 |
| --- | --- | --- |
| 1 流挂起 | `server/src/agent/runtime-budget.ts:19,36`；`server/src/agent/orchestrator.ts:171,176,208`；`server/src/agent/providers/types.ts:56,59`；`providers/anthropic.ts:129`；`providers/openai.ts:85,100,188,212`；`server/src/routes/agent.ts:118,131,145` | 每个 next 与 timeout/abort Promise.race，等待前后检查绝对 deadline；abort 贯通路由→主循环→fetch/Anthropic SDK。轮预算 **300,000ms**，不超请求余量；非合作 iterator 的 return、reader cancel 均不形成新的无限等待。 |
| 2 慢工具 | `server/src/agent/runtime-budget.ts:3,56`；`server/src/agent/orchestrator.ts:249,277` | 每工具预算 **60,000ms**，实际等待=`min(60,000ms, 请求剩余时间)`。超时沿原 catch 返回同 call ID 的错误 ToolResult、tool_end 为失败；不会取消已接受的真实工具事务。错误文案提示可能晚完成，重试前查看收据。 |
| 3 八轮耗尽 | `server/src/agent/orchestrator.ts:322`；`server/src/agent/providers/types.ts:42`；`server/src/routes/agent.ts:160` | 选择 **round_limit 事件方案**：第 8 轮工具结果保存后发 `round_limit`，再 done；**未增加第 9 次模型调用**。route 同时发 `code: round_limit` 的兼容 error 提示，现有 client 可显示。 |
| 4 错误路落史 | `server/src/agent/orchestrator.ts:213,216,226,299,300,310`；`server/src/agent/memory/manager.ts:28` | provider error/throw/挂起超时/abort 在错误 yield 前保存原 textBuffer + **`\n\n[interrupted]`**；使用普通 assistant 正文，不改 schema。流未完成的工具调用未执行，故不落 orphan tool_calls；已完成工具调用/result 以一个事务成对保存，早于 tool_end。定向验收另发现既有同毫秒排序会倒置配对，最小补 reader 的 **`created_at DESC, rowid DESC`**，保留现有 sanitizer 规则；固定 Date 实测可重放，无重复保存。 |
| 5 总预算 / 断线 | `server/src/agent/runtime-budget.ts:1,11,37,41`；`server/src/agent/orchestrator.ts:36,38,149,317`；`server/src/routes/agent.ts:89,90,118,131,145,147,175` | 请求/SSE/主循环模型总预算 **300,000ms**（绝对 epoch deadline），轮间及 next 前后检查，消除 8×300s。正常请求体 close 不误 abort；req abnormal close/aborted、res close 贯通信号。断线/响应结束后 **continue drain，不 break**，不启动后续主循环模型轮；已接受写作业照常提交既有收据。工具可能在等待方超时后继续完成，300s 不宣称为底层已接受作业的强制撤销点。finally 清计时器及监听，error/done/end 去重。 |

### 测试数字与证据

- **五项定向**：循环 **14/14**、路由 **10/10**、provider **49/49**（provider 本单新增 18；加循环 14 与路由 10，本单共新增 **42** 例）。挂起 next/return、SDK/fetch abort、慢工具 60s、短 deadline、8 轮、错误落史、同毫秒重放均覆盖。真实 organized_note 延迟夹具验证超时/断线后 pending 提案及 `proposal_issued` 事件仍提交，未自动应用提案。
- **Agent 族**：最终 **10 文件 / 207 tests / 207 pass / 0 fail**，从最终 server 全量同族文件逐项累加；初次 targeted 为 **206/206**，其后路由增加 tool_start 断线变体。两份口径均留档，不覆盖首跑事实。
- **Server 全量**：动态枚举 **86/86 文件**并全部逐文件执行，**860 tests / 858 pass / 2 fail / 0 cancelled / 0 skipped / 0 todo**；84 文件通过、2 文件失败。其中 `v2SourceMineruWiring.test.ts:60` 为 `python.exe ENOENT` 的顶层文件启动失败，内部用例未展开；`v2SourceRegionCells.test.ts:203` 为 MinerU Python 进程启动失败(code 101)。与前两单环境红项同形，未修改这些文件/解释器/依赖或排除测试。
- **Client 全库**：**171/171 文件 / 1746/1746 tests** 全部通过。
- **Runtime 门**：核对原 `verify:v2-bn8-runtime` 命令文本后，全部 **21/21 非 Git/secrets 子检查**通过，含双端构建、模型契约、性能、文档检查。接线 **86/86，0 豁免、0 未接线**。未运行含 git/secrets 的聚合命令，完整门不能宣称通过。
- 蒸馏件与复跑入口：[`docs/audits/2026-09-14-loop-robustness-builder/README.md`](../../audits/2026-09-14-loop-robustness-builder/README.md)、[`summary.json`](../../audits/2026-09-14-loop-robustness-builder/summary.json)、[`findings.md`](../../audits/2026-09-14-loop-robustness-builder/findings.md)。原始跑批日志仅 `.codex-tmp/2026-09-14-loop-robustness-builder/`，audit 目录只有 README/findings、计数 summary、复跑脚本。

### 未做项 / 禁区 / 交接

1. **Git/secrets 两个尾门、commit/push/PR/merge 均未做，留 HQ**；本单没有运行 git 命令，没有读写 `.git`。未触碰真实凭据、账号或用户数据库；新造凭据形合成值均 ≤20 字符，真实模型请求 **0 次**。
2. **两项 Python/MinerU 环境失败未修复，留 HQ 环境复跑**；这是 server 全量未全绿的明确原因。真实外网模型、浏览器主观验收、进程退出后作业恢复未做；本单没有引入持久任务队列。Promise.race 不抢占阻塞事件循环的同步代码。
3. 未修改工具 executor/注册定义/仪式权限机关、prompt 正文/缓存策略或 client。只为第 4 项重放兼容补 memory reader 同毫秒排序，未扩做队列位 6 记忆速赢工单。应用操作说明书没有新操作面，条目**无涉**；current-state 与最终放行留 HQ steward。
4. CodeGraph 先行探测已做：`.codegraph/` 存在，但本会话无 MCP/CLI，遂使用限定路径搜索与读取。入口 AGENTS/AGENT_CONTEXT、方向宪章、相关现状与 active ADR 已读；没有修改 agent 操作指令或权限配置。

**最终回读**：Result/status 回填后接线 86/86、server build 通过；首轮 docs check 因工单 ready→done 导致派生 `docs/agent-ops/INDEX.md` 过期，已用既有生成器仅更新该 INDEX，最终 docs check 通过（`closeout-summary.json` 保留首轮红项，`docs-final-summary.json` 记录修复后两步通过）。未改变任何验证门或增加豁免。
