> **状态 (Status)**: active
> **层 (Layer)**: 协议 / Ops Protocol(代理期工作流)
> **日期 (Updated)**: 2026-08-21
> **权威 (Authoritative)**: 是(Henry 2026-08-21 指示「设计一套工作流,至少把版本接回来」;Henry 可随时修改或废止)

# 代理期工作流(v1)

> 出身:Henry 观察 08-20 工作后的批评——逐条 thread 指挥效率不如他本人拆解意图后分派;版本记录缺失。本文件每条带理由。

## 1. 三层文档驱动,消息退为指针

| 层 | 文件 | 作者 | 内容 |
|---|---|---|---|
| **Plan** | `handoffs/plans/<version>.md` | Fable | 目标 / DoD(契约门+旅程分数)/ 触及面申报 / 编号步骤(各带 RED 靶)/ 边界 / 步骤状态表 |
| **Order** | `handoffs/<date>-<version>-<step>.md` | Opus(从 plan 拆)| 施工单;修正轮追加同文件 |
| **Receipt** | 同工单文件 `## Result/## Review/## Review-2`;`claude-log/` | builder / reviewer / Opus / Fable | 现行不变 |

**消息纪律**:跨会话消息只用于 ①方向变更 ②一行指针(「X 已落盘」)③升级告警。**报告不进消息**。
*理由:文件是权威通道(CLAUDE.md);消息里重述文件=同一事写两遍、两个会话各吃一遍上下文(08-20 实测)。*

## 2. 指挥链(Henry → Fable → Opus → Codex)

- **Fable**:设计稿与 plan、拍板(设计介入)、抽样抽检、终检与铸版、大版本复盘。**不写产品代码,不逐单调度。**
- **Opus(Fable 负责)**:从 plan 拆单、启动与监视 codex builder/reviewer、按步骤汇总复核、维护 tech-debt 与生成件;**只在三种情况升级 Fable**:设计级 finding(裁定卡 §2)、止损触发(§3)、plan 步骤收口。每日一份摘要。
- **Codex builder**:按 plan 步骤自驱多工单(V11 模式),按步骤 checkpoint;**Codex reviewer**:按步骤攒批、增量协议(角色卡 5-7)。
- **Claude 会话不下场施工**(Henry 08-21)。
*理由:昨日 Fable 兼任调度员,34 场 codex 会话逐单重读全仓;策略上下文被代码细节挤占。调度下沉后 Fable 上下文回到设计层。*

## 3. 版本纪律

- **结构**:`V2.BN.12.x` 按必修件:12.1 编辑基座(已铸)→ 12.2 MCP 工具面 → 12.3 选区收据 → 12.4 流式装配面+地板 → 12.5 层0/层1 → 12.6 收口(随行三线+契约冻结+旅程总验收)。**一个 12.x = 一份 plan。**
- **铸版动作**(plan 收口时,一次成型):checkpoint commit → **注解 git 标签** `v2.bn.12.x` → ROADMAP §3.5.1 → current-state §1 → claude-log → 迷你复盘(三行:哪里不顺/哪条债/下版带走什么)。
- **补丁版** `12.x.y`:铸版后的修理批(如旅程分数挖出的),Fable 定。
- **大版本收口**(V12→V13):**复盘文档** `analysis/<version>-retrospective.md`——真正使用不便清单 → 优化积压 → 进下一版 plan。
*理由:Henry——「我们目前是没有版本的,需要有记录」;标签让版本成为 git 实体而非路线图里的一行字。*

## 4. 效率机制

复核按步骤攒批;止损第 3 轮触发(裁定卡 §3);Spark 排单口径(小单/设计拍死/RED 靶/一次一条)与 5.6 大单并用,builder 档位由 Opus 按步骤性质选;Opus 每日摘要替代逐条消息。

## 5. 即时生效

12.2 起按本流程:Fable 出 plan → Opus 拆单与调度 → Fable 抽检/拍板/铸版。
