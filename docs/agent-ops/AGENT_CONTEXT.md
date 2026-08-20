> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(Agent 入口)
> **日期 (Updated)**: 2026-08-19
> **权威 (Authoritative)**: 是(作为"该看哪里"的路由);具体事实以各来源为准
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# AGENT_CONTEXT —— Agent 开工入口

**给 Claude / Codex 等任何在本仓库工作的 Agent。** 本文件是开工前的第一站。它**不复制正文**,只告诉你"该看哪里、什么有效、什么别信"。具体事实以各来源文档为准。

---

> ## ⭐ 2026-08-19 方向更替公告(V12 转向)
>
> **`docs/agent-ops/analysis/unified-direction-concept-design.md` 已升 v1 权威,是 V12+ 与 Agent 版的共同上游宪章。**
> 它虽住在 `analysis/`(非权威目录),但按 `DOCUMENTATION-SYSTEM.md §一` 的例外条款在本清单点名 —— **视同必读**。
>
> 该稿以主权代理方式逐条拍板 12 处(拍板记录见其文末;授权字据见 `claude-log/2026-08-19.md` 条目 1–2;Henry 保留全量推翻权)。
> **对施工的直接后果**:V12 定位已由「打磨」转为「**外骨骼与地板**」(拍板记录 待拍-8);canvas 减负(待拍-1);page frame 退役为导出取景框但 **V12 期间机器不物理拆**(待拍-2)。
> 本文件与 `current-state/` 的更新按 待拍-12 执行;其余规范层文档的脱节盘点见 `analysis/2026-08-20-doc-triage-assessment.md`。

## 1. 开工前必读(只读这四样)

1. **宪法层**:`PRODUCT.md`(产品定位、铁律)、`DOCUMENTATION-SYSTEM.md`(文档体系与协作规矩)
   > ✅ `PRODUCT.md` 已于 **2026-08-20 完成宪法层重划**(Henry 本人终审):补状态头、定位增补本体论与阶段焦点、表面模型更替、Source 三层梯子、新增「2026-08-19 统一方向教义」章。**06-20 与 06-29 两节原文保留为思想沿革**(挂历史横幅)。
   > ⚠️ **定位以 `PRODUCT.md` 为准,宪章 §1 的「学习主力工具」措辞已废弃**(Henry 2026-08-20 亲拍纠偏):**形状＝精加工信息处理平台;服务＝他的日常学习与生活;学习是引导场景,不是身份收窄。** 本体论(长着投影的收据数据库)不受影响。
2. **方向宪章**:`analysis/unified-direction-concept-design.md`(v1 权威,含 12 条拍板记录)
3. **决策层**:`decisions/` 中 `状态 = active` 的 ADR
4. **现状层**:`current-state/`(权威现状,Agent 主要读这里);本文件为快速入口

> 规矩:看任何文档先看顶部"状态头"。`superseded` / `archived` / `draft` 的内容**不作为依据**。

## 2. 禁止事项

- **禁止**把 `docs/brainstorm/**`(研究层)或 `docs/releases/**`(历史层)里的旧研究 / 旧 plan 当作当前真相或路线依据。它们是历史快照,许多结论已被取代。
- **禁止**回头修改历史层 / 研究层文档,或修复其失效的内部引用(历史就地冻结)。
- **禁止**在前三支柱稳定前动第四支柱(Agent / Graph Database / embedding / relation runtime / GraphRAG)。

## 3. 当前版本线

- **当前工作分支**:`fable/v2-bn12-exoskeleton`(2026-08-19 建立,V12「外骨骼与地板」施工线)。
- **历史主线分支**:`codex/v2-bn-canvas-engine`(V8–V11 Better Notebook 线)。
- **版本号体系**:`V2.BN.x`。旧的 `v2.0–v2.5.6` 已是**已关闭的工程地基路线图**(`Coincides-Roadmap.md`),其部分产品哲学(如 block-first)已过时。
- **当前前沿**:**V2.BN.11 已于 2026-07-14 全线收口** —— 七个子版本 11.1–11.7 全部通过独立第三方复验,26 项 Closure Gate 返回 PASS。V2.BN.8 Canvas Engine 已封版,V2.BN.9 Purpose Foundation 已完成,V2.BN.10 Source Floor 已工程完成(**联合浏览器体验签收仍是独立欠账**)。
- **当前版本**:**V2.BN.12「外骨骼与地板」**(拍板记录 待拍-8),定位 = "agent 进来之前必须存在的东西",非旧口径的"打磨"。
  - **必修五件**:①MCP 工具面(操作暴露为工具+守卫+收据,末端执行器首次实体化)②流式装配面+地板组件 ③选区收据系统 ④层0/层1+抽取矩阵(锚格式原生;**层0 schema 与窄腰契约本版定死**,层2 VLM 归 Agent 版)⑤token 预设 v0 + root-cause 并案修理(只修活的)。
  - **随行三线**:摄入收据埋线 / 数据隔离与备份纪律 / AI-readable tree 对齐 DOM。
  - **明确不带(勿自行扩范围)**:知识图谱、Relation 消费面+评估执行器、订单规格细做、产房沙盒、意图路由器、阅卷、homing projection、墙 register。
- **路线图**:**`docs/ROADMAP.md`**(2026-08-20 起唯一 ACTIVE 路线图)。
  > 旧件 `docs/Coincides-Better-Notebook-Roadmap.md` 已于 2026-08-20 按 待拍-12 **整体冻结**(`archived`),只保留 V8–V11 决定史,不作为任何工作依据。

## 4. 四大支柱与当前状态(摘要;**权威细节见 `current-state/`**)

依赖顺序严格,后者未到位前不动:

1. **TextFlow** —— 内容真相。核心可用，Typography 基线已在 V2.BN.8.10 落地；完整契约仍未冻结。
2. **ContentGroup / Item** —— Item 是独立知识真相，ContentGroup 是 Item 的捆绑 / 组织方式；Petal / Fragment 精修层已在 V2.BN.11.1 退役。V2.BN.11.3 已落地 Item 生命周期、Snapshot、Anchor pool、人工铸卡与 Package B 最小入口；V2.BN.11.4 已把 Item 接入 Purpose direct membership，并建立 active-only、来源可解释且不反写的 compiled scope；V2.BN.11.5 已建立并通过复验的 Item-only Relation 真相与双 Snapshot 判断收据；V2.BN.11.6 已工程完成读取时机械新鲜度与 Item Inspector Relation 维护面，等待独立复验。
3. **Canvas Engine** —— 空间/布局真相。V2.BN.8 自研最小混合引擎与普通对象家族已工程封版(见 ADR-0001)，后续成熟度工作按路线图继续。
4. **Agent + Graph Database** —— **未开始**,前三支柱稳定前不碰。

> **2026-08-19 补充(V12 转向对四支柱的影响)**:五真相(TextFlow / ContentGroup / Canvas / Source / Relation)已于 V11 收口后全部落地,**真相层本次一寸不动**——V12 是"表层重划 + 外骨骼",不是第六层真相。宪章 §4 明言「革新=搬家非拆迁,真相层零移动」。
> - 支柱 1 TextFlow:**V12 必修②⑤ 直接坐在它内核上**(新流式装配面仍用同一 TextFlow 内核;08-08 实测四条 🅰 住编辑机件深处,"噪声随面死、机件随面活,只修活的")。其契约 `contracts/TextFlow-Contract.md` 仍 `draft`,是本版最该冻结的一份。
> - 支柱 3 Canvas:按 待拍-1 **减负** —— 保留"写作顺手/装配/圈选锚/打散重排",释放"无尽打磨/Figma 级/炫技"。这是**范围收缩,不是 ADR-0001 路线推翻**。
> - 支柱 4:仍未开始。V12「明确不带」清单里知识图谱在列。

当前横切地基：**Item + Relation truth**。V2.BN.11.1 已退役 Petal / Fragment 与 legacy Relation writers，11.2 + 11.2.1 已落地 migration 047 与 Package B，11.3 + 11.3.1 已完成首条人工认领 Item 纵切，11.4 已完成 Purpose Item membership、compiled scope 与 Purpose-bounded Item search 并通过第三方复验；11.5 已完成 Relation create/list/revoke/reaffirm、九类方向注册表、双 Snapshot 判断收据与无图读取 API 并通过第三方复验；11.6 已完成四态 freshness 读时派生、latest-assessment checkpoint、全局 Item 候选搜索与 Inspector create/reaffirm/revoke 并通过第三方复验；**11.7 已完成生命周期完整性与 Closure Gate 并通过独立收口复验(2026-07-14,26 项 PASS)**。不提前建设图谱运行时。V2.BN.10 Source Floor 的联合第三方体验签收、以及 V11 集中体验门(deferred 非 waived),仍是独立待办,不应倒退当前施工前线。

## 5. 当前生效的决策 (active ADR)

| ADR | 标题 | 状态 |
|-----|------|------|
| [ADR-0001](decisions/ADR-0001-canvas-self-owned-engine-supersedes-pi-046.md) | 自研最小混合 Canvas 引擎路线(取代 PI-046 作为实现路线依据) | active |

> 完整列表见 `decisions/INDEX.md`(由脚本自动生成)。

## 6. 各目录的层归属

- `PRODUCT.md`、`agent-ops/DOCUMENTATION-SYSTEM.md`、本文件、`agent-ops/current-state/` → **宪法 / 现状**(权威)
- `agent-ops/decisions/` → **决策**(权威,仅 `active` 者)
- `agent-ops/analysis/` → **分析**(默认非权威)。**例外**:`unified-direction-concept-design.md` 为 `权威=是`,已在本文件 §1 点名 —— 见 `DOCUMENTATION-SYSTEM.md §一` 的例外条款。
- `agent-ops/handoffs/`、`agent-ops/claude-log/` → **收据**(追加式,历史就地冻结,永不回改)
- `docs/contracts/` → **契约**(看各文件状态:`frozen` 可信 / `draft` / `deferred` 不可作为依据)
- `docs/brainstorm/**` → **研究**(非权威,见该目录 `_ARCHIVE-NOTE.md`)
- `docs/releases/**` → **历史**(非权威,见该目录 `_ARCHIVE-NOTE.md`)

## 7. 已知文档脱节(2026-08-19 分诊结论,勿被误导)

全库分诊表:`analysis/2026-08-20-doc-triage-assessment.md`。**在其重划落地前,以下文件与当前方向已知冲突,不得作为施工依据**:

| 文件 | 已知脱节 |
|---|---|
| ~~`docs/Coincides-Better-Notebook-Roadmap.md`~~ | ✅ **已处置**:2026-08-20 整体冻结,现行路线图改为 `docs/ROADMAP.md` |
| ~~`PRODUCT.md`~~ | ✅ **已处置**:2026-08-20 宪法层重划完成(Henry 终审) |
| `docs/PRD.md` | §2 产品阶梯仍把已物理清场的 `Petal` 列为现役第 4 步 |
| `docs/ARCHITECTURE.md`、`docs/DATA_MODEL.md` | 停在 2026-06-06,词汇仍为 `ObjectRelation`(旧三表 047 已落),早于 Purpose/Source/Item 三层真相 |
| ~~`docs/contracts/Notebook-Object-Inventory-Contract.md`~~ | ✅ **已处置**:2026-08-20 整体冻结,现行契约改为 `contracts/Notebook-Object-Boundary-Contract.md` |
| `README.md`(repo 根) | 停在 v1.7.3 / Mr. Zero(宪章 §10 已声明取代) |
| `docs/workflow/**` | 分支写 `feat/v2.0-noteblock`,指向不存在的工作线 |

---

**维护规矩**:本文件需随主线状态变化而更新(属每个版本"完成的定义"之一)。它是路由 + 摘要,不承载需要单一事实源的详细真相——详细真相放现状层,本文件只指过去。
