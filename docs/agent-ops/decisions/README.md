> **状态 (Status)**: active
> **层 (Layer)**: 决策 / Decisions
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# 决策层 / Architecture Decision Records (ADR)

本目录记录 Coincides 的**架构与产品决策**。它是"我们为什么这么选"的权威出处。

规则见 [`../DOCUMENTATION-SYSTEM.md`](../DOCUMENTATION-SYSTEM.md) 第三节。要点重申:

- 每条决策一个文件:`ADR-XXXX-<短标题>.md`,编号递增、永不复用。
- **决策正文一旦写下永不修改**;唯一可改的是状态头的 `状态` 和 `被取代`。
- 推翻旧决策 → 写新 ADR 取代,双向链接,旧的标 `superseded`,**不删原文**。
- 开工前,只参考 `状态 = active` 的 ADR。

## ADR 模板

```markdown
> **状态 (Status)**: active
> **层 (Layer)**: 决策 / Decisions
> **日期 (Updated)**: YYYY-MM-DD
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: <ADR 链接，或 —>
> **被取代 (Superseded by)**: <ADR 链接，或 —>

# ADR-XXXX: <标题>

## 背景 (Context)
当时面临什么问题、什么约束、知道/不知道什么。

## 决定 (Decision)
我们选了什么,明确而具体。

## 后果 (Consequences)
正面、负面、引入的债务、留下的未知数 / 待验证项。
```

## 索引 (Index)

> 后续将由脚本从各 ADR 状态头自动生成(见 DOCUMENTATION-SYSTEM 第四节)。当前手工维护:

| ADR | 标题 | 状态 | 日期 |
|-----|------|------|------|
| [ADR-0001](ADR-0001-canvas-self-owned-engine-supersedes-pi-046.md) | 自研最小混合 Canvas 引擎路线(取代 PI-046 作为实现路线依据) | active | 2026-06-27 |
