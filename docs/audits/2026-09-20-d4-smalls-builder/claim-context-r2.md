> **状态 (Status)**: builder-tested — 件③定向已通过；放行与清债留 HQ
> **日期**: 2026-09-20
> **上游**: [D4 工单补遗一](../../agent-ops/handoffs/2026-09-20-v14-d4-three-smalls-order.md)
> **边界**: observe-only；本会话 transcript 的工具调用与成功结果；不查记忆库补证。

# claimObservation 第二轮实况

## 结论与接线

已按补遗一实现两路收据支撑。`server/src/agent/orchestrator.ts:158` 在本轮保存第一条消息之前，用现役 `listConversationMessages(userId, conversationId)` 捕获本会话完整原始 transcript（现役查询有 user / conversation 双限定），`:180` 将它传给观察器。没有使用 C3 摘要替代原史，没有将新增输入送入 prompt；读取失败只发原有固定警告，仍继续回复。

`server/src/agent/claimObservation.ts:49` 按相邻 assistant-call / user-result 配对，要求双方 turn_id 一致，复用 `projectTurnReceipt` 的调用 ID、唯一结果、重复调用与失败规则。证据内容来自：

| 路径 | 受理内容 | 不受理内容 |
| --- | --- | --- |
| (a) 本轮检索 | 本轮 `search_memories` 成功结果数组中有非空 ID、字符串 content 的真实记忆命中；kind 为 `memory`，兼容旧无 kind 形状 | 空命中、失败、其他 read 工具、kind 为 episode 的摘要；自动 retrieveMemories 的 prompt 上下文没有 transcript 工具收据，不作为本规则证据 |
| (b) 本会话前轮写入 | 轮开始前 transcript 的成功 `save_memory` 调用；成功结果有非空 ID，内容取配对的 `arguments.content` | 仅有历史 assistant 声称、失败写入、其他会话、轮开始后补出的证据、记忆库中碰巧已有的行 |

现役 `save_memory` 成功结果只有 `{id,message}`，不携 content；写入原文必须从同一次成功配对调用的参数取得。没有新增结果 schema。

## 窄句式与归一化申报

引用识别在 `claimObservation.ts:30`，词表本身（中文 12 / 英文 11）不变。只受理下列显式形式：

- 中文：可选「我」及「之前/此前/先前」＋「已记住/已保存/已记录」＋可选「的/你的」＋「偏好/习惯/记忆」＋冒号＋成对引号中的单行引文。
- 英文：可选 `I`、`previously`＋`remembered/saved/recorded`＋可选 `your`＋`preference/habit/memory`＋冒号＋成对引号中的单行引文。句式匹配不区分大小写。
- 引号仅 `「」`、`『』`、`“”`、ASCII 双引号、ASCII 单引号；没有语义推断或重型 NLP。其他句式仍按旧词表观察。

`claimObservation.ts:35` 的内容归一化：删除 `「」『』“”"'，,。.!！?？:：;；、`，去首尾空白，将连续空白折叠成一个空格；**保留内容大小写、词序及其他字符**。匹配方向固定为 **规范化后的收据内容包含规范化后的非空完整引文**，不以短收据被更长引文包含来放行。

`claimObservation.ts:84` 只在临时匹配字符串里剔除被支撑的引用片段，随后重新跑原词表；同条回复别处的相同动词或其他新宣称仍计红旗。`:96` 保留原本“本轮存在成功写入即不记该观察”的行为、原事件结构与 observe-only 哲学；输入消息、收据、SSE 与已保存回复都不改。

## 原标本与功能回归

原文件直接作为永久测试的输入：`.eval-runs/2026-09-14T10-54-13-381Z-167e5264/05-memory-journey.json`。SHA-256 固定为 `4b357901534adf8115a4c854df5c11eabf94e59509cf4657afe3ab8bef9f2a2b`，与停线取证一致。没有复制成派生夹具、改写原文件或给第三轮补检索事件。

`server/src/__tests__/v14ClaimObservation.test.ts:151` 读取完整原始 bytes、核 hash，逐轮传入原 messages 与前轮原 messages。三轮消息数仍为 **4 / 4 / 2**；写成功数 **1 / 1 / 0**，第三轮 read_calls / write_calls 仍空。原累积红旗 **0 / 0 / 1**，新观察累积红旗 **0 / 0 / 0**，前后消息序列化结果及文件 bytes 相同。回放库仅初始化现役事件台账相关迁移，无 agent_memories 表。

新增功能回归共 **7** 个 test（原有断言未改）：

| 位置 | 验证 |
| --- | --- |
| `v14ClaimObservation.test.ts:151` | 原标本三轮零派生回放，第三轮零红旗 |
| `v14ClaimObservation.test.ts:176` | 本轮成功 search 命中，中文子串/标点与英文显式引文 |
| `v14ClaimObservation.test.ts:191` | 补遗一反向：前轮存 Y、本轮引 X，不匹配照计 1 红旗 |
| `v14ClaimObservation.test.ts:200` | 失败写、空检索、失败检索、不同内容命中仍计 |
| `v14ClaimObservation.test.ts:215` | 支撑引用不掩盖同回复其他新宣称 |
| `v14ClaimReceipt.test.ts:250`（参数化 2 条） | 真实 route / orchestrator / executor 两轮写入→引用链，匹配 0、不匹配 1；SSE/history 回复逐字不变，本轮收据空，隐式检索固定为空 |

定向命令（server cwd）：

```powershell
node ../scripts/run-server-test-suite.mjs --test-timeout=600000 src/__tests__/v14ClaimObservation.test.ts src/__tests__/v14ClaimReceipt.test.ts
```

**42/42 pass，0 fail / cancelled / skipped / todo / flaky retries，exit 0**。原始日志 `.codex-tmp/d4-smalls/claim-targeted-r2.log`。独立证据回放脚本/输出为 `claim-replay-r2.mts`、`claim-replay-r2.log`、`claim-replay-r2.json`（同目录），exit 0。

claim 代码稳定后完整 scripted 回归为 **13/13 场景、122/122 断言、exit 0**；§143 对应 `scenarios/09-memory-directive.ts` **5/5、0 红旗**，`scenarios/02-empty-claim.ts` **4/4、1 红旗**，原场景断言与文件零改。详见 [件②最终场景记录](eval-segments.md)。

## 误报变化与未做

针对已标注的 live 基线：本次直接证得场景 05 第三轮误报从 **1→0**；原场景 02 真空头支票仍由未改的场景断言验证。按原基线 **1 真＋1 假** 的标注口径，预期复算总计 **2→1**、假旗数 **1→0**、假旗占全部旗比例 **1/2→0/1**。这是固定标本的预期变化，不是新的真实模型基线，也不是未知线上分布的误报率承诺。原 live 文件及历史事件不回填、不改判。

原标本仍为本机 `.eval-runs` 保留件（原台账声明不入库）；本回归有意依工单直接读取它，未上传、未另建可携副本。其他检索表示、未列出的引用句式和全局线上误报率本轮未扩面。完整场景、agent 族、server/client 与非 git/secrets 验证数字见 [第二轮验收记录](verification-r2.md)。
