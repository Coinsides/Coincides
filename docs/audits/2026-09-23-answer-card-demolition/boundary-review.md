> 状态: completed
> 日期: 2026-09-23
> 范围: 本单独立代码边界复核；功能 / 回归证据核对

# 答卡拆除边界复核

结论：本次 diff 未发现越过拆除单 §二 刀线的改动，也未发现仍工作的答卡出口或残留死测试。本报告是 builder 内部独立复核，不代替 HQ 的收口或产品验收。

复核前完整读取拆除单（含 §二、§四），按主线程提供的开工基线审查：开工无 tracked dirty；既有未跟踪文档、个人配置不属本单。全部 git 调用均带 `--no-optional-locks`，仅使用 `show / diff / status / ls-files`。

## 生产边界

- `NoteAnswerCards.tsx`、专属 CSS 和旧组件正向测试均已删除；真实 `NoteWritingSurfaceLayer` 仅删除组件 import 和挂载点，`askAgent`、选区工具条及原 contextHint 发出路径未改。
- `agentStore` 不再把 SSE 的任意 metadata 原样投影到新回复；仅保留现役 `intent_plan`。历史消息读取仍保存服务端给出的原始对象，没有清洗旧 `answer_card`。
- `orchestrator` 仅删答卡 metadata 构造及写库步骤，最后 assistant 的持久 ID/content 仍生成 `message_meta`，并与是否存在选区脱钩。`saveTurnMessage` 的最终正文捕获和 `finishTurn` 的收据读取、计数未改。
- client `done` 与 EOF 分支均继续采用 `responseContent ?? accumulated`；正文读取不依赖 `meta` 存在，`turn_receipt` 的挂载保持原样。服务端正常尾序仍为 `turn_receipt → message_meta → done`；错误、断连及工具轮限的既有回归保留。`intent_plan` 走未修改的 route 分支，client 保留明确读取。
- `useNoteAgentHumanEditor` 仅删 `insertAnswer` 和只供该分支使用的参数、类型；注册、ready/flush/idle、revision/old-text 核对、applyPatch、失败恢复与原 undo/redo 逻辑未改。`NotePatchReview` 生产组件未改。
- 操作说明书 C2 段已改为会话面板回答，并明确页边出口废除、选区与 note_patch 保留。

## 静态边界检查

独立执行一个只读 Node 检查，用 git HEAD 对照工作树文本（仅归一化 CRLF），结果：

```json
{
  "result": "PASS",
  "protectedFilesUnchanged": 23,
  "migrationFilesUnchanged": 83,
  "runtimeFilesScanned": 1001,
  "answerCardRuntimeHits": 0,
  "retiredComponentFilesAbsent": 3
}
```

23 个完整未改文件包括：共享 contextHint/selectionReceipt/notePatch/turnReceipt 类型；client contextHint helper、uiStore、ambient hint 两层 hook、block selection controller、selectionReceiptProjection、SelectionToolbar；server contextHint validator、attentionContext、Agent route、notePatch service/validator、turnReceipt；client AgentPanel、NotePatchReview、ProposalInbox、proposalInboxModel、useProposalInbox；migration 082。

此外逐 hunk 审查两个同时含保留与拆除逻辑的文件：`NoteWritingSurfaceLayer` 的选区路径原文未动；`orchestrator` 的 `readAttentionContext`、read_note 投影、预算及截断申报原文未动。迁移目录的磁盘文件列表与 tracked 列表一致，83 个文件无 diff；082 保留通用 `meta` JSON 列，无新 migration。

生产扫描覆盖 `client/src`、`server/src`、`shared/types`、client/server/root scripts 下非测试 `.ts/.tsx/.css/.json/.mjs`，匹配 `answer.?card / insertAnswer / 插入为块 / 页边答卡`，零命中。旧 `shared/dist` 是既有未跟踪生成产物，不属于 runtime 源码扫描或本单修改范围。

## 测试有效性与证据

- client 历史测试保留旧 `answer_card` JSON，断言正文继续出现在会话且历史对象不被改写；SSE 负断言验证旧键不进入新回复 metadata。
- 真实 note surface 负回归以存在的 note/block 身份、非零 DOM 测量、真实 note route 挂载旧历史，断言无页边答卡、插入/散去按钮、答卡正文和建块动作，同时「问 Agent」仍可达。原选区发送测试继续覆盖实际动作。
- done/EOF 四组用例覆盖 metadata 缺省与空对象，均要求最终权威正文胜过工具轮叙述；独立测试保留 `intent_plan` 并滤掉旧答卡键。
- server 新答卡正断言已改成 SSE、历史与数据库行无 `answer_card`；新增旧消息逐字段不变、带/不带选区的多轮最终正文；`v14EpisodeStorage` 的旧答卡夹具属于历史兼容回归，仍有效。
- 人门测试改为无 `insertAnswer` 属性、无写入/历史项的负断言，原 patch apply/stale/no-op/rollback 与 undo/redo 用例保留。

本复核读取并核对已有执行日志，没有重复运行或扩跑测试：client 主定向 **87/87**（11 文件），共享编辑链 **35/35**（4 文件），server **121/121**（9 文件），合计 **243 passed / 0 failed**。日志见 `client-regression-tests.log`、`client-editor-tests.log`、`server-functional.log`。TypeScript client/server 检查与 agent-knowledge 检查 exit 0 见各自日志及运行 JSON。服务端初次因新增通用正文事件暴露的旧固定位置收据断言失败，保留在 initial/intermediate 日志中；最终按事件名查收据且保留顺序、内容和计数断言，没有改弱业务要求。

未执行全库 `verify:v2-bn8-runtime`、整库压测或浏览器产品验收；按本单明确限定，验证止于上述功能 / 回归定向。本复核未访问 .env/key、用户库，未调用模型，未执行任何 git 写操作。
