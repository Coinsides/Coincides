> **状态 (Status)**: active
> **层 (Layer)**: Audit / C3 scripted 评测证据
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；本单执行收据

# C3 两场景评测

新增现役自动发现的 `11-episode-compression-journey.ts` 与 `12-episode-recall-journey.ts`，未改旧 C1/C2 场景。harness 唯一改动是在 `EVIDENCE_TABLES` 增加 `agent_episodes` 只读快照。

两场景均经现役 worker / runScenario 的 `scripted` 模式运行：独立 `:memory:` SQLite、空 dotenv、临时应用数据与资产目录；fetch 禁用；只有对话 provider 被脚本替代，HTTP handler、runAgent、工具执行、episode 投影、FTS 与收据链均为现役实现。`NODE_ENV=test` 使摘要 provider 完全跳过，摘要仅走确定性回退。场景还断言实际 provider 调用携带工具定义，且轮数精确匹配，避免误把摘要 provider 调用混入对话脚本。

## 最终完整批次

现役阈值改为 **24000 token**、确定性摘要按真实轮次各取首句（交错合组也保留每个真实轮次）后，于批次 `evals-2026-09-20T10-01-19-096Z-42460` 完整运行全部12场景：**114 / 114 断言通过**；现役 harness 回归 **14 / 14 通过**；eval TypeScript 检查通过。全12场景出现的唯一 `claim_without_receipt` 是既有 `02-empty-claim` 场景要求的阳性记录；两个新增 C3 场景均为0。

| 场景 | 用户轮数 | 断言 | 结果 | 结束时 episode 数 |
|---|---:|---:|---|---:|
| 11 长会话压缩旅程 | 14 | 20 / 20 | PASS | 2 |
| 12 旧 episode 唤醒旅程 | 1 | 6 / 6 | PASS | 4 |

正式摘要为本目录 `evals-summary.json`。原始逐场景 JSON、日志与 harness 日志均在 `.codex-tmp/c3-episode/evals-2026-09-20T10-01-19-096Z-42460/`。长旅程终态保留30条原始消息，唤醒旅程终态保留12条消息。

早先单独执行的 `.codex-tmp/c3-episode/11-episode-compression-journey.{json,log}` 与 `12-episode-recall-journey.{json,log}` 为阈值校准前中间证据，原样保留，不作为本次最终阈值的通过数字。

## 场景断言表

| 场景 | 断言内容 | 证据来源 |
|---|---|---|
| 11 | 14 次 scripted HTTP 灌注使组装估算（现役常驻包+工具定义+原始消息）超过24000 token，并生成 episode | 实际常驻包/工具定义、消息行、agent_episodes 快照、逐轮 episode 清单 |
| 11 | 所有既有消息逐字段不变，行数等于各轮新增行之和，历史 API 保留全量 ID | 每轮出生时消息快照与终态逐 ID 对账 |
| 11 | 各 episode 摘要等于确定性回退，token_estimate 对应摘要，段不超过8轮，实际对话 provider 恰15次 | 原始 segment、保存摘要与实际 provider 输入 |
| 11 | 首轮真实 save_memory 收据的原始 ID 完整落 manifest，其余四种锚清单为空 | 持久化工具结果、agent_memories、首段 episode |
| 11 | 实际 prompt 在常驻包之后附最近至多3段、总量不超过2048 token；覆盖消息不再重放，当前消息仍在 | provider 的真实 prompt / messages 快照 |
| 11 | 仅一次成功存记忆，无域写批次，无 claim_without_receipt | SSE tool_end、events、operation_batches |
| 11 | 逐轮 SSE 完整并有与历史 API 一致的轮次收据（14项） | 现役 harness 内建断言 |
| 12 | 四段中的最老段独特词与 ID 均不在实际常驻 prompt / replay，仅最近3段驻留 | 实际 provider 输入与 resident 选择 |
| 12 | 现役 search_memories FTS 返回最老 episode、kind=episode、原 summary / conversation / anchor_manifest，结果进入下一轮 provider messages | SSE、持久化 tool_results、provider 输入 |
| 12 | 自动 MemoryManager 记忆召回不返回 episode，也不新建 agent_memories | 现役 retrieveMemories 与数据库快照 |
| 12 | 唤醒不改任何 episode 或原始消息字段，历史 API 仍保留全量 ID | fixture 出生快照与终态逐 ID 对账 |
| 12 | 收据仅一次成功 read，无写动作、域写批次、空头声称 | turn_receipt、events、operation_batches |
| 12 | SSE 完整且收据与历史 API 一致（1项） | 现役 harness 内建断言 |

## 命令与静态验证

最终完整批次在仓库根执行：

```text
node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs evals
```

静态检查与两个场景单独执行入口（在 `server/`）：

```text
node node_modules/typescript/bin/tsc --project scripts/agent-eval/tsconfig.json
node --import tsx scripts/agent-eval/worker.ts scripts/agent-eval/scenarios/11-episode-compression-journey.ts ../.codex-tmp/c3-episode/11-episode-compression-journey.json scripted
node --import tsx scripts/agent-eval/worker.ts scripts/agent-eval/scenarios/12-episode-recall-journey.ts ../.codex-tmp/c3-episode/12-episode-recall-journey.json scripted
```

完整批次、静态检查与两场景入口退出码均为0。完整批次自动调用现役 `test:agent-eval`，其14项回归无失败/取消/跳过。此报告不替代 server 全量、client 全库或23组件验证门。
