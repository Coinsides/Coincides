> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State（Agent 入口）
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是（作为 Codex 的开工路由）；具体事实以各来源为准

# AGENTS.md —— Codex 开工入口

**给在本仓库工作的 Codex。** 本文件由 Codex 自动读取（repo 根 `AGENTS.md`）。它是**薄指针，不承载正文** —— 具体内容以被指向的文件为准。

## 1. 开工前必读（按顺序）

1. `docs/agent-ops/AGENT_CONTEXT.md` —— Agent 总入口（必读清单、禁止事项、版本线）。
2. `docs/agent-ops/current-state/` —— 权威现状（当前真相以此为准）。
3. `docs/agent-ops/decisions/` 中 `状态 = active` 的 ADR。

> 规矩：看任何文档先看状态头。`superseded` / `draft` / `archived` 的不作为依据。**不要**拿 `docs/brainstorm/**`（研究）或 `docs/releases/**`（历史）当干活依据。

## 2. 你的角色（Codex）

- 你是**建造者**：长周期、多文件的重实现（canvas 引擎等）。
- **Claude** 负责：架构/决策、写规格、审查/验收、文档与 current-state 守门、研究、点状单文件实现、模拟用户工作流。
- 撞车隔离：按领域所有权 + git worktree。不与 Claude 在同一片代码上并行重写。

## 3. 可见性（非对称）

- **必读（authority，每次开工）**：`AGENT_CONTEXT.md` → `current-state/` → active ADR；以及 handoffs 里 `to: codex` 的项。这是你与 Claude 共享的**权威接口**，凡你必须知道/必须行动的，都会被 distill 到这里。
- **你的主战场**：代码（`client/src`、`server/src`）+ 你每个子版本的 `docs/releases/**` 文档。
- **可看但不必读**：`docs/agent-ops/` 里 Claude 的审查 / 分析 / `to: claude` 的 handoff。**以 `current-state/` 和 `to: codex` handoff 为准，不必翻 Claude 的原始分析。**

## 4. 交接收件箱（handoffs）

- 开工时检查 `docs/agent-ops/handoffs/`，处理 header 里 `to: codex` 且 `status: ready` 的交接。
- 做完后，把结果写回（同文件追加 `## Result`，并把 `status` 改为 `done`；或另写一份 `from: codex` 的回执）。
- 协议见 `docs/agent-ops/handoffs/README.md`。

## 5. 红线（不可绕过 Henry）

- 不替 Henry 做：push / PR / merge、外部账号、密钥、主观验收。
- 不跳过验证门（`npm run verify:v2-bn8-runtime`）。
- 弹性车道：宁可把版本往回挪，也不硬推一个薄功能。
