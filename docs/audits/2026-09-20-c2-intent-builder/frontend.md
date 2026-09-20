> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；施工证据，最终裁定留 HQ

# C2 前端：注意力、逐块修订、页边答卡

## 现物考古与接线

| 义务 | 现役机器与施工落点 |
|---|---|
| 选区身份 | `useBlockSelectionController.ts:72` 的单块选择；`NoteWritingSurfaceLayer.tsx:1323` 的 `selectionDraft.ranges` / `documentTextSelection`。未创建另一套选区真相。共享字段声明在 `shared/types/agentContextHint.ts:12`（NoteSelection）及 `:17`（note_view.data.selection）。 |
| 问 Agent | `NoteWritingSurfaceLayer.tsx:1323`：读取现役选区，先完成选中块的普通编辑保存，再经 `openAgentWithContext({type:'note_view',data:{note_id,selection}})`。最多 32 块；入口仅 note route。块菜单、阅读工具按钮、单/多范围选区工具栏共享此入口。 |
| contextHint 一次性 | `uiStore.ts:69` 仍接 explicit hint；`AgentPanel.tsx:95` 取出，`:97` 消费一次，`:98` 发送；`agentContextHint.ts` 显示选区块数。没有另开 attention 请求通道。 |
| 消息 meta | `agentStore.ts:228` 接 `message_meta {message_id,meta,content?}`；`done` 和流自然结束都以持久消息 ID、权威正文（有 content 时）保存 meta；历史 GET 直接保留 meta 对象。未给 content 的旧事件兼容累积文本。 |
| 收件箱 diff | `NotePatchReview.tsx:7`；`ProposalInbox.tsx:38`。每 patch 旧文/新文独立显示，勾采纳、叉弃，stale 禁采；没有全案一键 apply。未打开对应 note route 时提供 `/#/notes/:id`。 |
| 人门与撤销 | `useNoteAgentHumanEditor.ts:44` → 现役 `replaceTextUnitText` / `useTextFlowHistory.applyEdit` → adapter `saveBlock` → `saveAtomicText`。首写携 `proposal_patch`；`useTextFlowHistory.ts:224` 的 undo/redo 明确不携该 envelope。inline/annotation/board ranges 仍使用既有 rebase 与历史快照。 |
| no-op patch | 相同新旧文仍走 text-save 确认采纳，不制造无效 undo 记录。 |
| 冲突 | 客户端先比 frozen revision 与旧文；服务端 text-save 再作 OCC 与提案签章验证。`useTextFlowHistory.ts:542` 的提案分支仅首保存成功后入现役 history；`:555` 开始只还原本地 before flow/text/annotation/board ranges，`:562` 清除失败事务及已发 revision；`:647` 等首持久化结果。零回写 before，零无效 undo 条目，失败返回 false。 |
| 答卡 | `NoteAnswerCards.tsx:70` 只投影当前会话 assistant 消息的 `meta.answer_card`；问题摘句与完整回答，按选中块纵向位置和渲染纸张右边缘定位。仅本地呈现状态，不新增表。 |
| 散去 | 只隐藏答卡，完整消息仍在会话历史。 |
| 插入为块 | `useNoteAgentHumanEditor.ts:72`，仅按钮事件调用既有 createBlock + afterBlockId + `createdBlock` history。`requireAfterBlock` 窄选项复用既有失败回滚，避免 placement/reorder 失败后错误宣称已插入锚下。 |

## 亲跑证据

| 验证 | 结果 | 原始日志 |
|---|---|---|
| C2 注意力/收件箱/答卡/人门定向与邻接回归 | 6 files / 31 tests PASS | `.codex-tmp/c2-intent/client-targeted.log` |
| 现役 adapter、TextFlow history、runtime controller 回归，含 C2 严格插入失败矩阵 | 3 files / 151 tests PASS | `.codex-tmp/c2-intent/client-runtime-regression.log` |
| 冲突恢复修正与现役 TextFlow history；成功采纳/undo/redo、失败恢复本地 flow/board range 且无 undo 记录 | 2 files / 25 tests PASS | `.codex-tmp/c2-intent/client-conflict-fix.log` |
| 多轮答卡最终正文修正、contextHint/收据条/答卡回归（done 与 EOF 两路） | 3 files / 31 tests PASS | `.codex-tmp/c2-intent/client-message-projection-fix.log` |
| Client `tsc -b` | PASS（门级最终编译另见总汇） | `.codex-tmp/c2-intent/client-types.log` |
| canvas runtime boundary | 175 checks PASS | `.codex-tmp/c2-intent/client-runtime-boundary.log` |

功能断言覆盖：真实选块入口→contextHint；SSE 与历史 meta 往返；逐 patch 采纳/弃/stale；现役 history 首保存/undo/redo；no-op；保存失败返回 false；答卡锚与纸边；散去留会话史；人点插入/撤销/重做；答卡插入 placement/order 失败回滚。

最终前端代码冻结点：2026-09-20T09:28:42.3686795Z。表中专项日志有不同执行时点，最终冻结状态的全 client / 编译覆盖以总验证汇总为准，不能仅用较早专项日志宣称完整门已覆盖最后改动。

以上数字是分别执行的集合，存在重叠，不得简单相加称为去重测试总数。

## 冻结后只读生命周期核对

- **跨笔记过期回调**：`noteAgentHumanBridge.ts:29` 按 owner 注册；`useNoteAgentHumanEditor.ts:90` 的 cleanup 置 active=false 并注销。`:37` 在保存/idle 等待后再查 active；`:47` / `:76` 从当前 runtime 按块 ID 取靶块，`:80` / `:83` 在插入队列入口及新建返回后再查 active。adapter 的 requestedNoteId/route generation 守卫继续生效。`NoteAnswerCards.tsx:74` 只展示与当前 noteId 相符的 meta。未发现过期回调写另一个 note 的路径；此结论是代码核对加既有 adapter A/B 路由回归，未声称新增浏览器切页旅程。
- **SSE 消息身份**：orchestrator 把 meta 写入最后 assistant 行并发同一 message ID；route `agent.ts:181` 原样转发，client `agentStore.ts:228` 接收，`:253` 使用真实 ID，历史读取 `agent.ts:54` 包含 meta 并在 `:56` 解析。单轮往返已有专项断言。
- **多轮内容一致性修复**：只读复核发现 tool 前文本与最终答案在 client 累积为一段，而服务端 meta 只附最后一条 assistant 行，导致旧实时答卡正文与同 ID 的历史重载不同。root 已分配 server 端最终正文投影，client 端 `agentStore.ts:234` 读取可选权威 content，`:256` / `:313` 在 done/EOF 使用它。两条新增功能断言以工具前旁白 → read_note → 最终文本 → 权威 content 为输入，确认完成后 message ID、正文、meta 与 history 重载相同。见 `client-message-projection-fix.log`；最终跨端门结论由总汇承担。

新测试均为功能路径，未新建安全对抗测试。未调用真实模型、未碰用户库、未新增依赖、未做 git 写操作。没有实施板选区、「存走」、行内轻修订或重型投影分票。浏览器主观体验签收仍归 HQ，本文件不将 jsdom 证据称为浏览器验收。
