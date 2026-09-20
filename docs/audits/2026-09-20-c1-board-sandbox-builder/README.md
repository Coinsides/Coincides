> **状态 (Status)**: active（builder 交付证据，非主观验收或放行）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（代码与验证日志为事实来源，放行留 HQ）

# V14 C1 板沙箱 builder 交付

工单：[C1 板沙箱](../../agent-ops/handoffs/2026-09-20-v14-c1-board-sandbox-order.md)。本轮身份为 Codex builder；施工与测试均在工作树完成，未做 git 写操作。逐件文件/行号见 [delivery-map.md](delivery-map.md)，验证结果见 [validation.md](validation.md)。原始日志、隔离 runner、场景 JSON/SSE 证据均在 `.codex-tmp/c1-board/`。

## 同门同钥与注册申报

七个动词统一注册到 `BOARD_ACTION_TOOLS → AGENT_ACTION_TOOLS → toolDefinitions`。全部 `truth=spatial,tier=immediate,exposure=internal,scopes=[boards:write]`，全部自动进入 `effectClassification.door_write`；read/channel 集合未增加。注册表由 28 到 35 条，public 仍 14；provider definitions 由 34 到 41。旧动词没有语义改动。

| 工具 | 人门服务 | 逆操作（现役 receipt revert 注册） |
|---|---|---|
| board_mount_member | mountBoardMember | unmountBoardMember |
| board_move_member | updateBoardMember | updateBoardMember 恢复 before |
| board_set_member_layer | updateBoardMember | updateBoardMember 恢复 before |
| board_create_edge | createBoardEdge | deleteBoardEdge |
| board_create_sticky | createBoardSticky | deleteBoardSticky |
| board_update_sticky | updateBoardSticky | updateBoardSticky 恢复 before |
| board_patch_visual | updateBoardVisual | updateBoardVisual 恢复 before |

executor 只分派，`agentBoardActions` 不执行 SQL。它复用既有人类 validator/service，外层使用现役 `recordAgentAction` 同事务提交域写、`actor_kind=agent/channel=chat` event 和 `source_type=agent_chat` 收据。mount 使用 `mounted` 史记，其他六项用新增 `board_changed`，具体工具名在 meta；人撤销使用 `rolled_back`。史记/收据任一存储失败会回滚域写。

`board_patch_visual` 仅接受已有粉笔(sticky)、shape、freehand；没有建视觉物工具。连线沿 v1 全款 API，保留人门既有兼容参数；默认 visual_version=1，线不写 Relation。便签工具仅暴露 text/x/y/w/weight/color_index。没有 Agent 删除、建板、改 soul/板题、text_range 上件、直接采纳或笔记写门。

manifest 的 JSON Schema 2020-12 检查不接受 Zod `.positive()` 生成的布尔 exclusiveMinimum；仅 Agent 视觉投影将 scale 表达为有限数且 `min(Number.MIN_VALUE)`，与有限 JS 数值 `>0` 等价。人类 schema/service 校验不变。

知识指纹已按 `--update` 更新为 `6b15e1be7ac79342203c14d32bd9ab2900bf6be8d4c337e9f97718f0193ce816`。差异只有七名进入 registry/doorWrite/provider definitions；说明书戳 v1 / 2026-09-20。能力投影仍自动生成；预算测试只增加七个字面名及分隔符的字节配额，原内容预算和原 prompt 还原哈希继续锁住。claim 词表增加板操作窄词，原有词保留；收据分类测试同步 41/41。

## Staging、批次与撤销边界

考古沿用了板的 `placed` 状态、BoardStaging、拖拽 MIME、现役 repository/PATCH/history 机制。`useBoardStagingSelection` 族是笔记选区生成 text_range 的人门，本单未冒用它生成便签。

迁移 081 给 `board_stickies` 添加 `placed DEFAULT 1`、`mounted_actor DEFAULT human`；原便签继续上板。Agent mount/sticky 强制 false/agent，人拖或点 Place 才采纳；画布及附着线过滤未采纳物。成员采纳沿既有完整几何分配；便签保留宽/重/色，放置分配位置与 z。成员及便签的本地 Undo 都保留原有「placed 不回撤、几何可撤」规则，没有第二套采纳机关。

每会话 `batch_id=conversation_id`，存于既有 `operation_batches.metadata.agent_context` 及 resource；event meta 同记 batch_id/board_id。无新真相表、批次计数器或独立 undo 栈。before/after 为板对象字段快照，不含时间戳和来源正文投影；因此连续修改同一物可逆序还原。

`GET /api/boards/:boardId/agent-batch` 从 applied/reverted 收据派生最近会话与待撤数；最近批撤完也不回退指向更早会话。`POST /api/boards/:boardId/agent-batches/:batchId/revert {}` 固定 ID，按 event_seq 逆序调用现役单条 revert，外层 immediate 事务兜住全部，已单撤项跳过，二次相同请求 409 且不新增史记。跨板属于同会话的写一并撤。

板工具栏「撤销 Agent 本批」锁定 batch_id 后发显式 API，失败重试仍指同批；成功后刷新并清本板本地 Undo/Redo，禁用重复点击。后续 Agent 回执通知板刷新。单条撤销仍在现役 tool-receipts 面。

**后改冲突是明确限制**：采纳会改 placed/几何，人后续修改或外部边引用也可能使创建收据不可逆。单条 compare-before-revert 守卫拒绝覆盖，批内任何冲突则整批原子拒绝，保护人后改。未采纳且未后改的 9+13 概念图可整批恢复；Agent 对既有已采纳对象的整理可还原到整理前。这里没有宣称可无条件擦除采纳后的工作；定向测试锁住冲突时域/史记/收据全不变。

## 体检器与两份 scripted 场景

`inspectAgentBoard` 把已保存成员/便签/边投影给原 `inspectBoardLayout`，包括 Staging 候选坐标、过滤隐藏层，v1 使用现役端点/弧/标签估算几何，旧线保留六像素间隙与旧标签位置。每次板写后诊断，流尾每板保留本轮最后一份；持久化 tool result 是 live/history 收据的共同来源。报告包含 issues/kind/severity/itemIds/coordinate/bounds/counts，UI 可展开。诊断失败不反转已提交成功，返回 report:null 并显示「暂不可用」。标签矩形为估算，仍需人工视觉验收。

场景仅增加 `scenarios/07-board-concept-map.ts` 与 `08-board-batch-revert.ts`，无 harness/discovery 注册修改；08 复用 07 的合成旅程并加撤销断言。全部 scripted，没有模型调用。

| 场景 | 断言组 | 结果 |
|---|---|---|
| 07 概念图 | 两轮传输/归属公共断言；9 张便签 Staging/actor/几何；13 条边的实际 ID、两端、锚、弯度、样式、标签；SSE/历史/event/receipt/batch 对账；尾份体检同值；笔记/Relation 不变 | 9/9 |
| 08 整批撤销 | 全部 07 断言；固定 batch API 撤 22 件；原有人便签保留，板域快照恢复（排除 bookkeeping 时间戳）；22 reverted 收据/22 human rolled_back 对账；同请求第二次 409 且零变更 | 12/12 |

说明书 §四新增 Agent 装卸区、固定批次 API/按钮、单撤与冲突边界、体检消费者；§五补七动词能力表及禁区。没有改坐标契约九条、TextFlow schema、Relation/判断逻辑、笔记写权、原 reader 输出或依赖。

本轮不做：真实模型评测、用户库/用户账号、主观视觉验收、git 写/commit、总门的 `git diff --check` 与 secrets 扫描。后二项依工单留 HQ；本地已有未跟踪文件未改动。
