> **状态 (Status)**: active
> **层 (Layer)**: 契约 / Contract amendment
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 是，仅限 C2 工单明确授权的两类自然直令与 note_patch 边界
> **上游**: [C2 工单](../agent-ops/handoffs/2026-09-20-v14-c2-intent-router-order.md) §一 / §三 / §四；[Agent 宪法](../agent-ops/current-state/agent-constitution.md) ③与[实施细则](../agent-ops/design/agent-constitution-bylaws.md) §三

# Amendment — 2026-09-20 · C2 natural instructions and note_patch prompt boundary

现役 prompt 是 `server/src/agent/system-prompt.ts`；行为契约由 `server/src/__tests__/v14ContextHint.test.ts` 的产品说明断言与 `v14AgentKnowledgeProjection.test.ts` 的还原哈希共同锁定。沿用 [TextFlow F17 / A4 追加 amendment 先例](TextFlow-Contract.md#amendment--2026-09-10--v135-c-fix2--f17-explicit-range-history-restoration)，本条只扩下述两个自然直令映射，并修订笔记修改通道的边界文字；不改其他工作流、身份、动态上下文或能力名集预算。

| 类别 | 句首轻映射 | 编译目标与完成口径 |
|---|---|---|
| memory | 记住 / 记着 / 别忘了 / 不要忘了 / 下次提醒我；英文 remember / do not forget / don't forget / remind me next time | `save_memory`；仅在成功收据后说已保存。记忆不等于定时通知。 |
| proposal | 整理 / 归纳 / 梳理材料、资料或文档，或「把这份材料整理…」；英文 organize / summarize material(s) / document(s) | `create_proposal` 的 `organized_note`；必须先取得既有输入要求的项目与来源，缺少则询问。登记不等于应用。 |

允许句首「请 / 请你 / 请帮我 / 帮我 / 麻烦你帮我 / please」等有限礼貌前缀。仅处理句首直接指令；整句引号、转述、否定、词义讨论和无内容的「请记住」不归类。不解析任意长文、嵌套语义或新指令家族，不内嵌模型调用。`server/src/agent/intentRules.ts` 同源提供两条规则说明、prompt 片段与纯函数 `classifyDirectInstruction(text): 'memory' | 'proposal' | null`；分类不会调用工具或改状态。

修改已有用户文字的唯一 Agent 通道为 `create_proposal(type:'note_patch')`。payload 为 `{note_id, patches:[{block_id, unit_id?, new_text}]}`，v1 只替换整 unit 文本；diff 逐 patch 可見、可采纳、可拒绝，部分采纳合法。采纳由人门执行现役 text-save 并进入既有撤销栈；靶块版本改变时该 patch 失效。Agent 不直接写用户正文，不增加结构操作、跨块移动或写权限。此处只声明已授权通道，不改变 TextFlow 真相 schema。

prompt 还原测试先移除本 amendment 的**精确生成片段**，再将获授权修订的笔记边界**精确还原旧句**，随后执行既有 roster 还原。原 SHA-256 `44affa4b6d7a9aa940e450602900856c567af3ae43fda983b18c3a08820ff2af` 保持不变，不用新正文重铸旧基线；身份与动态上下文六案原哈希仍保持。

本 amendment 单列 UTF-8 预算：两类自然直令节 561 字节；笔记边界旧句 166 → 新句 312 字节；合计净增 707 字节。能力名集投影原有 442–598 字节预算及 C1 七动词额外名额不变。两类节另锁精确 hash 与字节数，防止在两类之外静默扩大。

`check:agent-knowledge -- --update` 是另一道显式闸：只更新工具名集合的指纹及说明书版本戳快照，不负责改写上述 prompt 还原哈希。C2 的 proposal payload / contextHint schema 扩展仍须同步说明书 §三 / §五 并显式运行该命令，即使现役工具名未增减、集合 hash 保持不变。
