> **状态 (Status)**: active（builder 逐件证据，非放行）
> **日期 (Updated)**: 2026-09-20

# C1 逐件定位

| 交付 | 现物与行号 |
|---|---|
| 七动词注册 | [server/src/toolFace/boardActions.ts:31](../../../server/src/toolFace/boardActions.ts#L31) |
| 注册表入口 | [server/src/toolFace/registry.ts:816](../../../server/src/toolFace/registry.ts#L816) |
| executor 薄适配入口 | [server/src/agent/tools/executor.ts:41](../../../server/src/agent/tools/executor.ts#L41) |
| 七个既有人门服务调用 | [server/src/services/agentBoardActions.ts:12](../../../server/src/services/agentBoardActions.ts#L12) |
| 同事务史记/收据 | [server/src/services/recordAgentAction.ts:30](../../../server/src/services/recordAgentAction.ts#L30) |
| 可逆快照 | [server/src/services/boardActionSnapshots.ts:4](../../../server/src/services/boardActionSnapshots.ts#L4) |
| 逐条撤销 | [server/src/services/boardActionRevert.ts:10](../../../server/src/services/boardActionRevert.ts#L10) |
| 撤销注册 | [server/src/services/toolFaceReceiptRevert.ts:302](../../../server/src/services/toolFaceReceiptRevert.ts#L302) |
| 批次派生与原子整撤 | [server/src/services/boardAgentBatches.ts:25](../../../server/src/services/boardAgentBatches.ts#L25) |
| 固定 batch API | [server/src/routes/boards.ts:66](../../../server/src/routes/boards.ts#L66) |
| 迁移：sticky staging + event vocabulary | [server/src/db/migrations/081_v14_board_agent_staging.ts:6](../../../server/src/db/migrations/081_v14_board_agent_staging.ts#L6) |
| 同门 member provenance | [server/src/services/boards.ts:453](../../../server/src/services/boards.ts#L453) |
| 同门 sticky staging/provenance | [server/src/services/boards.ts:653](../../../server/src/services/boards.ts#L653) |
| Staging UI | [client/src/pages/Boards/BoardStaging.tsx:73](../../../client/src/pages/Boards/BoardStaging.tsx#L73) |
| 人拖采纳 | [client/src/pages/Boards/BoardPage.tsx:545](../../../client/src/pages/Boards/BoardPage.tsx#L545) |
| 工具栏整撤 | [client/src/pages/Boards/BoardPage.tsx:1153](../../../client/src/pages/Boards/BoardPage.tsx#L1153) |
| 固定重试批次与队列刷新 | [client/src/pages/Boards/useBoard.ts:297](../../../client/src/pages/Boards/useBoard.ts#L297) |
| 采纳命令历史沿旧规则 | [client/src/pages/Boards/boardCommandHistory.ts:222](../../../client/src/pages/Boards/boardCommandHistory.ts#L222) |
| 体检器消费者 | [server/src/services/boardAgentLayout.ts:6](../../../server/src/services/boardAgentLayout.ts#L6) |
| 持久化结果投影回执报告 | [server/src/agent/turnReceipt.ts:65](../../../server/src/agent/turnReceipt.ts#L65) |
| 回执展示 | [client/src/components/AgentPanel/MessageBubble.tsx:123](../../../client/src/components/AgentPanel/MessageBubble.tsx#L123) |
| 板实时刷新 | [client/src/stores/agentStore.ts:231](../../../client/src/stores/agentStore.ts#L231) |
| 板 claim 词表 | [server/src/agent/claimObservation.ts:8](../../../server/src/agent/claimObservation.ts#L8) |
| 定向可撤/事务/批次测试 | [server/src/__tests__/v14BoardSandbox.test.ts:77](../../../server/src/__tests__/v14BoardSandbox.test.ts#L77) |
| 前端采纳/批次交互测试 | [client/src/pages/Boards/BoardPage.staging.test.tsx:100](../../../client/src/pages/Boards/BoardPage.staging.test.tsx#L100) |
| 回执/诊断显示测试 | [client/src/components/AgentPanel/AgentPanel.turnReceipt.test.tsx:52](../../../client/src/components/AgentPanel/AgentPanel.turnReceipt.test.tsx#L52) |
| 知识预算限定增加七名 | [server/src/__tests__/v14AgentKnowledgeProjection.test.ts:87](../../../server/src/__tests__/v14AgentKnowledgeProjection.test.ts#L87) |
| 概念图 eval | [server/scripts/agent-eval/scenarios/07-board-concept-map.ts:18](../../../server/scripts/agent-eval/scenarios/07-board-concept-map.ts#L18) |
| 整批撤销 eval | [server/scripts/agent-eval/scenarios/08-board-batch-revert.ts:10](../../../server/scripts/agent-eval/scenarios/08-board-batch-revert.ts#L10) |
| 说明书 §四 | [docs/agent-ops/current-state/app-operating-manual.md:80](../../../docs/agent-ops/current-state/app-operating-manual.md#L80) |
| 说明书 §五七动词表 | [docs/agent-ops/current-state/app-operating-manual.md:102](../../../docs/agent-ops/current-state/app-operating-manual.md#L102) |
