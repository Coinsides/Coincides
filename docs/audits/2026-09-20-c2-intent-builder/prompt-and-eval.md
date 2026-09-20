> **状态 (Status)**: active（C2 builder 证据；放行留 HQ）
> **日期 (Updated)**: 2026-09-20
> **层 (Layer)**: Evidence / 蒸馏件，不新增产品权威

# C2 prompt 与随版评测证据

现物考古确认：prompt 正文在 `server/src/agent/system-prompt.ts`；其现役行为断言在 `v14ContextHint.test.ts`，整体还原哈希在 `v14AgentKnowledgeProjection.test.ts`。仓库原来没有单独的现役 prompt Markdown 契约。F17 / A4 的 amendment 先例在 `docs/contracts/TextFlow-Contract.md:167` / `:177`，采取追加授权条款、保留历史冻结正文的方式。

本单契约落于 [Agent-Intent-Prompt-Amendment.md](../../contracts/Agent-Intent-Prompt-Amendment.md)。仅增加两类自然直令与已获授权的 note_patch 边界；没有改身份、动态上下文或其他工作流。

| 现物 | 位置与证据 |
|---|---|
| 两类同源规则 | `server/src/agent/intentRules.ts:4`；memory → save_memory，材料整理 → create_proposal |
| 纯分类函数 | `intentRules.ts:24`；有限句首关键词、礼貌前缀；引用、转述、否定与词义讨论普通反例不归类；无模型、DB 或执行依赖 |
| prompt 两类节 | `intentRules.ts:37`、`system-prompt.ts:47`；经现役能力名 resolver 验工具名存在 |
| note_patch 边界 | `intentRules.ts:41`、`system-prompt.ts:60`；Agent 发提案，人逐 patch 采纳/拒绝，人门 text-save，现役撤销 |
| 原文还原锁 | `v14AgentKnowledgeProjection.test.ts:98`；精确移除 C2 节、恢复旧边界后走旧 roster 还原，原 `44affa4b…2af` 不变 |
| 两规则正反例 | `v14ContextHint.test.ts:191`；不新增任何安全对抗套件 |
| 专属字节锁 | `v14AgentKnowledgeProjection.test.ts:110`；两类节 561 UTF-8 字节，边界 166→312，净增707；旧能力投影预算不变，既有产品说明估算上限2000未提高 |

知识指纹 `--update` 与 prompt 哈希是两道不同的门：`scripts/check-agent-knowledge.ts:51` 明确只哈希工具名集合；`:174` 提供显式 update 并保存说明书戳。C2 载荷扩展没有自造工具名；说明书与显式 update 由主 builder 统一执行。

评测随单只增加两个自动发现的场景文件，未改 harness / scenario 注册。`discovery.ts:7` 扫 `scenarios/*.ts`；`harness.ts:62` 在 scripted 模式禁网络，原会话路由、orchestrator、工具执行、提案与收据继续运行现物。10 场景人门动作使用原 noteBlocks handler 与原 errorHandler，`humanActions` 只加入评测输出，保存中间 API 响应与块文本，产品消息不增加该字段。

| 场景 | 断言 | 结果 |
|---|---|---|
| `09-memory-directive.ts:10` | 原话只有「请记住…」而无工具名；真实 prompt 含两类节；save_memory 实际成功、SSE/历史收据一致、库与记忆 API 逐字相符、零笔记/提案写、红旗零 | 5/5（含一轮公共收据断言） |
| `10-note-patch-journey.ts:45` | 提案 pending 与旧新 diff、零直接正文写；人门部分采纳；剩余 patch 丢弃零变；原 text-save 人门恢复原文并重做、revision 1/2/3；人自行改字后 stale；采纳409且正文不变；整案丢弃零变；Agent 收据只含 create_proposal、红旗零 | 10/10（含三轮公共收据断言） |

10 场景的撤销证据是现役人门对已冻结文本快照的撤销/重做重放；客户端真实撤销栈由本单客户端宿主测试另证，不能用这个 server 场景替代 UI 栈覆盖。

最终 scripted 场景回归：**10 场景88/88断言通过**，harness 自测 **14/14通过**。既有 `02-empty-claim` 是阳性对照，红旗1为预期；本单09/10均为0。证据：[evals-summary.json](evals-summary.json)；最终服务冻结后的原始逐场景数据及日志 `.codex-tmp/c2-intent/evals-2026-09-20T09-29-17-578Z-10468/`。零真实模型调用、零用户库。

首轮定向回归 **19文件316/316**，含 Agent 族、C1 batch、提案、contextHint、note_patch、意图编译器与现役 atomic text-save。此数字来自当时文件状态；后来增加的 prompt 字节锁与 Attention 文件由全量 run 覆盖，最终全量数字以 `server-full-summary.json` 为准，不与定向数字相加。首次 typecheck 记录施工中的类型窄化错误，原始失败日志保留；最终检查以主 builder 收口结果为准。

验证器 [run-validation.mjs](run-validation.mjs) 动态拆根 `verify:v2-bn8-runtime` 为25组件，仅排除 git / secrets 两项，非 git/secrets 23组件。server-full 递归发现 `server/src` 与 `server/scripts` 全部 `.test.ts`，逐文件整跑，不过滤既有回归。Node test预算600000ms，外部文件预算660000ms；`v13WildernessExecute.test.ts` 明确包括在内。所有 raw 输出落 `.codex-tmp/c2-intent/`，审计只存命令、退出码、计数与断言等蒸馏件。

全量 server 已完成 **105/105文件，1060 tests / 1058 pass / 2 fail**，cancelled / skipped / todo 均为0。`v13WildernessExecute.test.ts` 完整 **27/27 PASS，444.175秒**，没有用120秒截断。[独立计数审核](server-full-count-audit.json) 重新读取105份 raw TAP，确认当前全树清单、执行清单、每文件计数与总计数一致；明确 `countAuditPassed:true`、`testsPassed:false`，不把计数审核通过当成测试通过。

| 全量未通过项 | 本轮直接证据 | 处理 |
|---|---|---|
| `v2SourceMineruWiring.test.ts` | 模块启动时 `spawnSync python.exe ENOENT`，业务测试未进入 | 保留失败，未改源码、环境或权限 |
| `v2SourceRegionCells.test.ts` | 固定 MinerU Python 启动返回101，`Unable to create process` | 保留失败，未以模拟或跳过改绿 |

两份原始日志分别为 `.codex-tmp/c2-intent/server-full-2026-09-20T09-18-15-875Z-32056/099-server_src___tests___v2SourceMineruWiring.test.ts.log` 与同目录 `101-server_src___tests___v2SourceRegionCells.test.ts.log`。本次全量完成于 `2026-09-20T09:32:22.570Z`。全量已包括 NotePatch9案及 Attention5案；随后新增的第6个多轮回答 HTTP 回归与最终路由正文修复由主 builder 的最终 Agent 定向补验覆盖，不将两轮重叠数字相加。
