> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(Agent 入口)
> **日期 (Updated)**: 2026-07-14
> **权威 (Authoritative)**: 是(作为"该看哪里"的路由);具体事实以各来源为准
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# AGENT_CONTEXT —— Agent 开工入口

**给 Claude / Codex 等任何在本仓库工作的 Agent。** 本文件是开工前的第一站。它**不复制正文**,只告诉你"该看哪里、什么有效、什么别信"。具体事实以各来源文档为准。

---

## 1. 开工前必读(只读这三样)

1. **宪法层**:`PRODUCT.md`(产品定位、铁律)、`DOCUMENTATION-SYSTEM.md`(文档体系与协作规矩)
2. **决策层**:`decisions/` 中 `状态 = active` 的 ADR
3. **现状层**:`current-state/`(权威现状,Agent 主要读这里);本文件为快速入口

> 规矩:看任何文档先看顶部"状态头"。`superseded` / `archived` / `draft` 的内容**不作为依据**。

## 2. 禁止事项

- **禁止**把 `docs/brainstorm/**`(研究层)或 `docs/releases/**`(历史层)里的旧研究 / 旧 plan 当作当前真相或路线依据。它们是历史快照,许多结论已被取代。
- **禁止**回头修改历史层 / 研究层文档,或修复其失效的内部引用(历史就地冻结)。
- **禁止**在前三支柱稳定前动第四支柱(Agent / Graph Database / embedding / relation runtime / GraphRAG)。

## 3. 当前版本线

- **主线分支**:`codex/v2-bn-canvas-engine`(即 "Better Notebook" 线)。这是进度最快、且真正的主线。
- **版本号体系**:`V2.BN.x`。旧的 `v2.0–v2.5.6` 已是**已关闭的工程地基路线图**(`Coincides-Roadmap.md`),其部分产品哲学(如 block-first)已过时。
- **当前前沿**:`V2.BN.11.1–11.5` 已完成并通过第三方复验；`V2.BN.11.6` Mechanical Freshness And Relation Inspector 已工程完成、待第三方复验。复验 PASS 前不得进入 `V2.BN.11.7`。V2.BN.8 Canvas Engine 已封版，V2.BN.9 Purpose Foundation 已完成，V2.BN.10 Source Floor 已工程完成。
- 路线图:`docs/Coincides-Better-Notebook-Roadmap.md`。

## 4. 四大支柱与当前状态(摘要;**权威细节见 `current-state/`**)

依赖顺序严格,后者未到位前不动:

1. **TextFlow** —— 内容真相。核心可用，Typography 基线已在 V2.BN.8.10 落地；完整契约仍未冻结。
2. **ContentGroup / Item** —— Item 是独立知识真相，ContentGroup 是 Item 的捆绑 / 组织方式；Petal / Fragment 精修层已在 V2.BN.11.1 退役。V2.BN.11.3 已落地 Item 生命周期、Snapshot、Anchor pool、人工铸卡与 Package B 最小入口；V2.BN.11.4 已把 Item 接入 Purpose direct membership，并建立 active-only、来源可解释且不反写的 compiled scope；V2.BN.11.5 已建立并通过复验的 Item-only Relation 真相与双 Snapshot 判断收据；V2.BN.11.6 已工程完成读取时机械新鲜度与 Item Inspector Relation 维护面，等待独立复验。
3. **Canvas Engine** —— 空间/布局真相。V2.BN.8 自研最小混合引擎与普通对象家族已工程封版(见 ADR-0001)，后续成熟度工作按路线图继续。
4. **Agent + Graph Database** —— **未开始**,前三支柱稳定前不碰。

当前横切地基：**Item + Relation truth**。V2.BN.11.1 已退役 Petal / Fragment 与 legacy Relation writers，11.2 + 11.2.1 已落地 migration 047 与 Package B，11.3 + 11.3.1 已完成首条人工认领 Item 纵切，11.4 已完成 Purpose Item membership、compiled scope 与 Purpose-bounded Item search 并通过第三方复验；11.5 已完成 Relation create/list/revoke/reaffirm、九类方向注册表、双 Snapshot 判断收据与无图读取 API 并通过第三方复验；11.6 已工程完成四态 freshness 读时派生、latest-assessment checkpoint、全局 Item 候选搜索与 Inspector create/reaffirm/revoke，当前等待第三方复验，不提前建设图谱运行时。V2.BN.10 Source Floor 的联合第三方体验签收仍是独立待办，不应倒退当前施工前线。

## 5. 当前生效的决策 (active ADR)

| ADR | 标题 | 状态 |
|-----|------|------|
| [ADR-0001](decisions/ADR-0001-canvas-self-owned-engine-supersedes-pi-046.md) | 自研最小混合 Canvas 引擎路线(取代 PI-046 作为实现路线依据) | active |

> 完整列表见 `decisions/INDEX.md`(由脚本自动生成)。

## 6. 各目录的层归属

- `PRODUCT.md`、`agent-ops/DOCUMENTATION-SYSTEM.md`、本文件、`agent-ops/current-state/` → **宪法 / 现状**(权威)
- `agent-ops/decisions/` → **决策**(权威,仅 `active` 者)
- `docs/contracts/` → **契约**(看各文件状态:`frozen` 可信 / `draft` / `deferred` 不可作为依据)
- `docs/brainstorm/**` → **研究**(非权威,见该目录 `_ARCHIVE-NOTE.md`)
- `docs/releases/**` → **历史**(非权威,见该目录 `_ARCHIVE-NOTE.md`)

---

**维护规矩**:本文件需随主线状态变化而更新(属每个版本"完成的定义"之一)。它是路由 + 摘要,不承载需要单一事实源的详细真相——详细真相放现状层,本文件只指过去。
