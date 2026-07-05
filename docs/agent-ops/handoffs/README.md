> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State（协作协议）
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是

# handoffs —— Henry × Claude × Codex 三方交接区

## 为什么存在

让三方协作**不靠人肉转述**。Henry 不再把一个 agent 的话复制粘贴给另一个 —— 交换单位是**仓库里的一份交接文件（spec / 结果 / 问题）**，各 agent 直接读写。

这套设计直接来自 Coincides 自己的产品原则：

- **共享基底**：repo 之于我们，如同 ContentGroup 之于人 + AI —— 同一份结构化产物，谁都不替对方翻译。
- **Proposal → Review → Apply**：Claude 写 spec（proposal）→ Henry 审/改（review）→ 翻牌 `ready` 后 Codex 执行（apply）。
- **不替用户决定**：Henry 仍是导演 —— 他审每一份交接，但只做「点头 + 触发」，不做转述。

## 文件格式

一份交接 = 一个 md。文件名：`YYYY-MM-DD-<slug>.md`。顶部一行 header：

```
> from: <claude|codex|henry> | to: <claude|codex|henry> | status: <draft|ready|done|closed> | re: <slug> | date: <YYYY-MM-DD>
```

正文 = spec / 结果 / 问题本身。**写成 spec（文件、契约、验收标准、约束），不是聊天语气** —— spec 没有口音，任何 agent 读起来一样。

## 状态流转

- `draft` —— 作者写好；若是「要建的活」，需 Henry 审过才能往下。
- `ready` —— **Henry 已批准**；目标 agent 可以执行。（这是唯一的人工闸：Henry 把 `draft` 翻成 `ready`。）
- `done` —— 目标 agent 做完，在同文件追加 `## Result`，或另写一份回执交接。
- `closed` —— 已确认收口，可留档。

## 流程

1. Claude 写 spec → `from: claude / to: codex / status: draft`。
2. Henry 读、改、把 `status` 翻成 `ready`。
3. Codex 开工时（由根 `AGENTS.md` 指引）扫到 `ready` 的活，执行，写回 `status: done` + `## Result`。
4. Claude 读回执，审 diff，给结论。

## 约定

- **不删原文**：交接是 append-only；状态只在 header 里改。
- 一份交接只干一件事（一个 `re:`）。
- 遇到与 spec 假设不符的情况**不要猜** —— 在 `## Result` 里记下、标 `needs: claude/henry`。
- `done` / `closed` 的交接可移到 `archive/` 子目录，或留原地。
