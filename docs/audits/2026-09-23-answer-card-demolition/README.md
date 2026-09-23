# 答卡 v1 拆除 · 功能/回归证据

日期：2026-09-23。角色：Codex builder。依据：[拆除单](../../agent-ops/handoffs/2026-09-23-v14-answer-card-demolition-order.md) §二、§四。

## 交付

- 删除 `NoteAnswerCards.tsx`、专属 CSS、旧正例测试，以及 `NoteWritingSurfaceLayer` 的答卡挂载。
- `agentStore` 不再把流中的整份答卡 meta 纳入响应状态；仅保留现役 `intent_plan` 投影。持久消息 ID 与权威正文读取不再依赖 meta 存在，done/EOF 都继续采用最终正文。
- `orchestrator` 移除答卡 meta 构造和 UPDATE。成功回合仍发最终持久消息的 ID/content，`message_meta` 与答卡解绑；选区和普通对话均有多轮正文回归。
- 删除共享编辑桥的 `insertAnswer` 及 hook 中专属的块创建、定位和 undo 接线。`applyPatch`、编辑前保存/等待、失效判断、失败回滚和既有撤销链保持原样。
- 删除共享类型中的现役 `answer_card` 声明；历史 JSON 仍可原样读取，不清洗旧消息。
- 操作说明书 C2 更新为圈选语境保留、回答进入会话面板、答卡及插入出口退役。

## 验证结果

| 范围 | 文件数 | 最终通过 | 失败 |
|---|---:|---:|---:|
| Client：上下文往返、真实笔记页负断言、计划卡、收件箱、收据、UI 流、圈选 | 11 | 87 | 0 |
| Client：共享编辑、note_patch review、文字/placement 撤销 | 4 | 35 | 0 |
| Server：C2/Agent 邻接功能与回归 | 9 | 121 | 0 |
| 合计（最终运行，不重复计初跑） | 24 | **243** | **0** |

- Client / server TypeScript `--noEmit --incremental false`：均 exit 0。
- `check-agent-knowledge`：通过，知识事实未漂移；无需更新指纹。
- `git diff --check`：通过（只读命令）。
- Client 日志有现有 React Router future-flag 提示，无测试失败。

负断言覆盖旧 SSE meta 不再生成答卡状态、旧历史消息仍可读但真实笔记页不呈现答卡/散去/插入、共享编辑器不再暴露插入出口、服务端新消息和流事件不写 `answer_card`。正向回归保留圈选身份传输、上下文预算和截断、`intent_plan`、多轮正文、note_patch 生命周期、收件箱、收据条。

服务端初跑为 110/121：新增通用 `message_meta` 使旧测试按倒数第二个事件读取收据的假设失效；调整为按事件名读取，保留顺序/收据断言并补持久 ID/content 对照。中间运行 120/121：新增测试误用未返回 ID 的 helper，已改为实际 SQL 查询。最终 121/121，失败日志保留，详见 [server-result.md](./server-result.md)。

## 证据索引与复现

- [client-functional-run.json](./client-functional-run.json)：客户端及静态验证数字。
- [client-regression-tests.log](./client-regression-tests.log)：完整定向命令与 87 项结果。
- [client-editor-review.md](./client-editor-review.md)、[client-editor-tests.log](./client-editor-tests.log)：共享消费者审计与 35 项结果。
- [server-result.md](./server-result.md)、[server-functional-run.json](./server-functional-run.json)、[server-functional.log](./server-functional.log)：9 文件 121 项结果。
- [server-run-functional.mjs](./server-run-functional.mjs)：可复现的隔离运行器。
- [client-typecheck.log](./client-typecheck.log)、[server-typecheck.log](./server-typecheck.log)、[agent-knowledge-check.log](./agent-knowledge-check.log)：静态检查。
- [boundary-review.md](./boundary-review.md)：独立只读边界复核。

Client 用空 `COINCIDES_VALIDATION_ENV_DIR`，网络为测试 mock；server 使用 scripted provider、内存 SQLite、临时凭据/上传目录，运行器只继承系统启动所需的环境变量。不读取 `.env` 值，不接触用户库，不调用真实模型。没有凭据表单交互。

## 保留与未做

- 选区 contextHint 生产链不改：1–32 块、read_note 投影、8 页/16000 字符预算、截断/遗漏申报均保留。
- migration 082 与通用 meta JSON 列不改；无新 migration，无旧答卡数据清洗。
- 不回滚最终正文投影，不改 note_patch 共享路径，不施工岸案 UI、河独立窗或样张。
- 未运行全库 `verify:v2-bn8-runtime`、全库测试或压力测试：本次用户指令与拆除单明确限定定向功能/回归并禁止马拉松，整库收口留 HQ。
- 未执行任何 git 写操作、commit、push、PR、merge；未做用户主观验收或真实浏览器旅程。
- 开工时已有的未跟踪文件未动；本单不修改 agent 操作指令/权限配置。

CodeGraph 优先查询已尝试，但当前无可调用 MCP/CLI；`rg` 也不可用，改用限定源码目录的 PowerShell 搜索。生产残留扫描范围为 `client/src`、`server/src`、`shared/types`（排除测试）：答卡符号与出口零命中。该结论不涵盖历史文档、测试夹具或未跟踪的旧 `shared/dist` 生成产物。
