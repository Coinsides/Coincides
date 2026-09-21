> **状态 (Status)**: active
> **层 (Layer)**: 契约 / Contract amendment
> **日期 (Updated)**: 2026-09-21
> **权威 (Authoritative)**: 是，仅限 T2 工单授权的 organized_note 生成器块型选择
> **上游**: [T2 工单](../agent-ops/handoffs/2026-09-21-v14-t2-rich-block-pipeline-order.md) §三；[F17/A4 先例](TextFlow-Contract.md)；[C2 amendment](Agent-Intent-Prompt-Amendment.md)

# Amendment — 2026-09-21 · organized_note rich blocks

生成器原位于 `server/src/services/organizedNoteProposals.ts`。本单将原五句完整提取至 `organizedNotePrompt.ts` 的 `ORGANIZED_NOTE_BASE_PROMPT`，逐字保留，再追加 `ORGANIZED_NOTE_RICH_BLOCK_AMENDMENT`。本次不修改主 Agent system prompt、C2 宪法、note_patch 通道、create_proposal 名称或 channel_write 归类。

追加节教生成器按材料结构选择表格（枚举对照）、时间线（编年）、柱状图/折线图（数量对比）、paragraph 引文/提示框样式，以及至少三章时的目录。组件限 timeline/chart_bar/chart_line；目录严格空对象，无标题正文或目录真相缓存；furniture 只有 variant 与自由文本 source/label。所有载荷只有数据和语义，视觉由现役渲染 token 决定。media/item_ref/note_ref 不入提案，生成只登记 pending，人门独占 apply。

SHA-256 以 UTF-8 运行时 prompt 字节为口径：

| 对象 | 字节 | SHA-256 |
|---|---:|---|
| 原生成器 prompt | 569 | `2a330527f4d46fff0f1e6bcde4fe308c10b667480a575026c7e6789042cc9274` |
| 追加节 | 1891 | `167d353bc18f635c73e986e3e777be2e552bb5d75b7e6a0decad4c474b8fa547` |
| 追加后 prompt | 2460 | `0159d0c94773cc51599ab235dcdb00960521a9eaae96f30903f3d88470cd46cf` |
| 精确移除追加节后的还原件 | 569 | `2a330527f4d46fff0f1e6bcde4fe308c10b667480a575026c7e6789042cc9274` |

永久定向测试 `v14OrganizedNoteRichBlocks.test.ts` 锁原哈希与还原关系。原生成器字节副本和测量 JSON 留 `.codex-tmp/t2-richblock/`。旧基线来自施工前原文件，不用新正文重铸。

确定性回退只识别显式 Markdown 表、日期行、引用及提示语法；不猜测数量、不自动造图表。真实模型效果与全保真预览不在本单验证射程；scripted 新场景经现役 create_proposal 分派并用人门 apply，零 provider turn。
