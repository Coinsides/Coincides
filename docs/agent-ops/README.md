> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(入口)
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是 / Yes

# agent-ops —— Agent 协同中枢

本文件夹集中存放**与 Agent 协同、指挥、搞清现状、以及 Henry 的决策**相关的"活着的"文档。它是 Claude / Codex 干活的指挥部。历史与研究类内容**不**放这里(它们在 `../brainstorm/`、`../releases/`)。

## 里面有什么

- **`AGENT_CONTEXT.md`** —— Agent 开工第一站:必读清单、禁止事项、版本线、支柱摘要、active 决策。**先读它。**
- **`DOCUMENTATION-SYSTEM.md`** —— 整个文档体系的"宪法":五层结构、状态头格式、ADR 规矩、协作规矩。
- **`current-state/`** —— 现状层:此刻的真相(四大支柱状态、技术栈、watch list)。**权威现状以这里为准。**
- **`decisions/`** —— 决策层(ADR):为什么这么选;`active` 者有效,`superseded` 者仅作历史。
- **`INDEX.md`(自动生成)** —— 本文件夹各文档的状态清单。

## 给 Agent 的最短路径

干活前按顺序读:`AGENT_CONTEXT.md` → `current-state/` → `decisions/` 中 `active` 的 ADR。不要拿 `../brainstorm/`(研究)或 `../releases/`(历史)当依据。

## 维护

本文件夹内的文档**随主线变化而更新**,属每个 `V2.BN.x` 版本"完成的定义"之一。`INDEX.md` 由 `scripts/docs-index.mjs` 自动生成,不手写。
