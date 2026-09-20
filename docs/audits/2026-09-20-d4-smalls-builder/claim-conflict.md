> **状态 (Status)**: blocked（工单冲突停线；未完成验收）
> **层 (Layer)**: 审计 / Builder 事实证据
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（局部取证，不是放行裁定）

# D4 第三件：本轮命中门槛与原 live 标本冲突

## 冲突条款

- 工单 `docs/agent-ops/handoffs/2026-09-20-v14-d4-three-smalls-order.md:24`（§三.2）：**本轮存在成功 search_memories/记忆命中且措辞为引用式**才不计红旗，无检索支撑的新宣称照计。
- 同单 `:26`（§三.4）：**live 标本②转为回归夹具，引用式→零红旗**。
- 同单 `:34`（§四）：**冲突停线举证**。本次不自行将前轮保存、对话历史或观察器事后查库扩充为“本轮命中”。

## 原始标本证据

读取原始文件 `.eval-runs/2026-09-14T10-54-13-381Z-167e5264/05-memory-journey.json`，未调用模型、未打开用户库。整文件 SHA-256：

`4b357901534adf8115a4c854df5c11eabf94e59509cf4657afe3ab8bef9f2a2b`

取证范围为 `turns[2]`（第 3 用户轮）、同轮记忆行与前两轮调用名称：

| 字段 | 原始事实 |
|---|---|
| 用户文本 | `明天复习怎么安排` |
| 消息 | 只有 user / assistant 两行，双方 `tool_calls=null`、`tool_results=null` |
| 回复中的争议句 | `✅ 我已记住你的偏好：「我习惯清晨背诵，晚上做题。」` |
| 工具事件 | `tool_start` / `tool_end` 共 0 |
| 收据 | `read_calls=[]`、`write_calls=[]`、`write_ok_count=0`、`write_fail_count=0` |
| 已存偏好 | 内容与回复引用一致，但 `last_accessed=null` |
| 红旗事件 | `claim_without_receipt` 1 条 |
| 前两轮 | 各有一次 `save_memory`；属于前轮，不属于本轮 |

可复核抽取件：`.codex-tmp/d4-smalls/claim-live-specimen-evidence.json`；抽取脚本及 stdout：`claim-conflict-evidence.mjs`、`claim-conflict-evidence.log`。保留原始标本，未篡改或补入检索结果。

## 自动检索通路反证核对

不能仅由空工具收据推断没有自动检索，故同时核对现役自动通路：

- `server/src/agent/orchestrator.ts:83` 每轮调用 `retrieveMemories(userMessage)`。
- `server/src/agent/memory/manager.ts:115` 调用共享 `searchMemories`，`includeEpisodes:false`。
- `server/src/agent/memory/service.ts:81`–`:87` 对选中的真实 memory 在返回前更新 `last_accessed`；本标本没有该命中痕迹。
- `server/scripts/agent-eval/isolation.ts:26` 清空 Voyage；`harness.ts:26`–`:35` 的 live 路径只取 dashscope 后切到隔离凭据目录。本次仅阅读这些源码，没有读取或解析任何凭据。
- `scenarios/05-memory-journey.ts:28` 仅 scripted 设置合成 embedding；`:103` 起明确验证该中文 query 无 FTS / LIKE 候选。

未找到支持“本轮记忆命中”的证据。前两轮保存及对话历史能够解释模型引用既存偏好，这是跨轮解释，不能替代工单指定的同轮门槛。独立只读子任务复核得到同一结论。

## 停线结论与待裁范围

保留原标本事实并严格执行 §三.2，不能承诺此原标本为零红旗；要满足 §三.4 则需改变上下文证据边界，或另定带真实检索命中的派生夹具。给原标本补一个未发生的 search 不能作为原标本修复证据。

因此第三件零代码修改，`claimObservation.ts` / observe-only 行为未改，未宣称误报率改善。需要 HQ 澄清：是否允许以先前成功 `save_memory` / 对话历史支持引用，或保留同轮门槛并调整原标本验收预期。此处只列冲突出口，不替 HQ 裁定。

整单暂停。其余局部成果见同目录 `cast-item.md`、`eval-segments.md`；全量门、台账清偿与放行均未完成。
