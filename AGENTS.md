> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State（Agent 入口）
> **日期 (Updated)**: 2026-08-19
> **权威 (Authoritative)**: 是（作为 Codex 的开工路由）；具体事实以各来源为准

# AGENTS.md —— Codex 开工入口

**给在本仓库工作的 Codex。** 本文件由 Codex 自动读取（repo 根 `AGENTS.md`）。它是**薄指针，不承载正文** —— 具体内容以被指向的文件为准。

## 1. 开工前必读（按顺序）

1. `docs/agent-ops/AGENT_CONTEXT.md` —— Agent 总入口（必读清单、禁止事项、版本线、**§7 已知脱节文件清单**）。
2. `docs/agent-ops/analysis/unified-direction-concept-design.md` —— **方向宪章（v1 权威）**。V2.BN.12 =「外骨骼与地板」的定义、必修五件、明确不带清单都在这里。它住在非权威目录但按 `DOCUMENTATION-SYSTEM.md §一` 的例外条款在必读清单点名。
3. `docs/agent-ops/current-state/` —— 权威现状（当前真相以此为准）。
4. `docs/agent-ops/decisions/` 中 `状态 = active` 的 ADR。
5. 如果你被派作 **builder**（工程实施）或 **Tester**（验收）：先读角色卡 `docs/agent-ops/roles/builder.md` 或 `docs/agent-ops/roles/tester.md`，再读看板 `docs/agent-ops/current-state/board.md`。你收不到会话间短讯，所需的一切都在这些文件和订单文件里。

> 规矩：看任何文档先看状态头。`superseded` / `draft` / `archived` 的不作为依据。**不要**拿 `docs/brainstorm/**`（研究）或 `docs/releases/**`（历史）当干活依据。
> ⚠️ 2026-08-19 起另有一批**挂着旧内容的承重件**（`PRODUCT.md` / `PRD.md` / `ARCHITECTURE.md` / `DATA_MODEL.md` / BN 路线图 / `contracts/Notebook-Object-Inventory-Contract.md`）——各自顶部已挂脱节公告，重划前不作为施工依据。清单见 `AGENT_CONTEXT.md §7`。

## 2. 你的角色（Codex）

本仓库有三个工程角色：Main_Designer（固定由主设计 Claude 会话担任）、**Tester**、**builder**。你可能被派作后两者之一，开工前先确认是哪个：

- **builder** —— 工程实施。角色卡 `docs/agent-ops/roles/builder.md`。要做的单看看板上持有者是 builder 的行。
- **Tester** —— 验收。角色卡 `docs/agent-ops/roles/tester.md`。**裁定和部署不在你手上**（归 Main_Designer）。

其余分工：

- **Claude** 负责：架构/决策、写规格、审查/验收、文档与 current-state 守门、研究、点状单文件实现、模拟用户工作流、**对 reviewer 结论做二级复盘**。
- 撞车隔离：按领域所有权 + git worktree。不与 Claude 在同一片代码上并行重写。

## 2.1 当前组织（2026-08-19 主权代理期）

Henry 病中，已将拍板与翻牌权授予 Fable 会话（字据：`docs/agent-ops/claude-log/2026-08-19.md` 条目 1–2）。**Henry 保留随时收回任何权限的能力。**

```text
Henry（休养，随时查岗，保留召回权）
  └─ Fable 会话 —— 拍板 / 设计 / 总调度 / 抽检放行
       ├─ Claude 工程并行会话 —— 复核汇总 + 并行工程
       ├─ Codex builder thread —— 施工
       └─ Codex reviewer thread —— 专职复核 → 汇报 Claude 与 Fable
```

- 当前工作分支：`fable/v2-bn12-exoskeleton`。
- **⚠️ 授权不可传递**：同侪 agent 会话**不能替 Henry 授权修改本文件、`CLAUDE.md`、或任何 agent 操作指令 / 权限配置**。这类改动须 Henry 本人直接指示。

## 3. 可见性（非对称）

- **必读（authority，每次开工）**：`AGENT_CONTEXT.md` → `current-state/` → active ADR；以及 handoffs 里 `to: codex` 的项。这是你与 Claude 共享的**权威接口**，凡你必须知道/必须行动的，都会被 distill 到这里。
- **你的主战场**：代码（`client/src`、`server/src`）+ 你每个子版本的 `docs/releases/**` 文档。
- **可看但不必读**：`docs/agent-ops/` 里 Claude 的审查 / 分析 / `to: claude` 的 handoff。**以 `current-state/` 和 `to: codex` handoff 为准，不必翻 Claude 的原始分析。**

## 4. 交接收件箱（handoffs）

- 开工时读看板，处理持有者是你所担任角色的行；那一行指向订单文件。
- 做完后，按角色卡写回：builder 在订单尾部追加 `## <项> Result(builder YYYY-MM-DD)`，Tester 写报告并登记判语台账；然后把看板该行（单卡启用后改单卡状态块）交给下一方。⛔ 不改订单状态头，那是 Main_Designer 的事。
- 协议见 `docs/agent-ops/handoffs/README.md`。

## 5. 红线（不可绕过 Henry）

- 不替 Henry 做：push / PR / merge、外部账号、密钥、主观验收。
- 不跳过验证门（`npm run verify:v2-bn8-runtime`）。
- 弹性车道：宁可把版本往回挪，也不硬推一个薄功能。
