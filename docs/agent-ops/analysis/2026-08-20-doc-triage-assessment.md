> **状态 (Status)**: active
> **层 (Layer)**: 分析 / Analysis（文档体检第一刀 · 供拍板与施工排期消费）
> **日期 (Updated)**: 2026-08-19（文件名沿用委托编号 2026-08-20）
> **权威 (Authoritative)**: 否（评估与建议；处置须经 Fable 拍板后执行）
> **上游**: 分诊协议 = 2026-07-15 会议卷 §二；对照基准 = `unified-direction-concept-design.md`（v1 权威，12 条已拍）
> **委托**: Fable 首脑会话（主权代理期）→ Opus 5 工程并行会话
> **作者**: Claude（Opus 5 · 工程并行）

# 文档分诊评估表 —— 全库对照新宪章

## 0. 任务与方法

### 0.1 分诊协议（Henry 定，2026-07-15 §二 原文要义）

> 比起重建，更难的是更正。所以先评估手边所有文档：①哪些需要更正；②更正量特别大的里面，哪些是**必须更正**的（历史/权威价值不可丢）；③哪些是**重建比更正更简单、更准确**的——直接推倒重写。

本表按委托要求扩为四档：

| 档位 | 定义 | 判据 |
|---|---|---|
| **无需动** | 当前内容仍准确，或已挂正确状态头、不冒充现行真相 | 冻结层 / `superseded` 已标注 / 事实未变 |
| **需更正** | 局部脱节，补丁·横幅·改段即可，结构成立 | 改动量 < 全文 1/3，骨架不动 |
| **必须更正** | 承重（agent 每次开工读它、或它是 Codex 施工依据），脱节会**直接误导施工**；且历史/权威价值不可丢，不能靠「冻结+重写」回避 | 在必读链上，或被 handoff / plan 引用 |
| **重建更划算** | 正文与新方向结构性错位，更正量 ≳ 重写量；旧文有独立历史价值，应冻结留档另立新件 | 多套 scheme 并存 / 横幅补丁已叠两层以上 |

### 0.2 盘面

全库 **733** 份 Markdown。按 `AGENT_CONTEXT.md §2`「历史就地冻结」：

- `docs/brainstorm/**` **164 份** → 整类【**无需动**】（研究层，非权威，禁止回头修改）
- `docs/releases/**` **450 份** → 整类【**无需动**】（历史层，同上）
- **活跃辖区 = 119 份**（+ repo 根 4 份 = **123**）：agent-ops 76、contracts 14、`docs/*.md` 10、internal / workflow / continuity / audits / issues / changelog 19、repo 根 4。

本表逐份判定其中的**承重件 33 份**，其余按类判定。

### 0.3 对照基准（新宪章 12 条拍板中与文档直接相关者）

| 拍板 | 内容 | 对文档的含义 |
|---|---|---|
| 待拍-1 | canvas 减负：释放「无尽打磨 / Figma 级 / 炫技」 | 自由布局类产品原则须降级 |
| 待拍-2 | page frame 退役为「导出取景框」，Note = 唯一文档单位（**机器不物理拆**） | 一切以 PageFrame 为内容容器的对象模型脱节 |
| 待拍-3 | 组件语言 v0（九组件）转正为默认模板 | 全库无此词汇 |
| 待拍-8 | **V12 = 「外骨骼与地板」**，必修五件 | 路线图「V12 = 打磨」作废 |
| 待拍-12 | **current-state 与 roadmap 按本稿更新；V11 时代的 V12 旧计划标 superseded** | 本表即为该指令的执行盘点 |

---

## 1. 结论摘要

### 1.1 数字

| 档位 | 份数 | 备注 |
|---|---|---|
| 无需动 | 619 | 含冻结层 614 + 已正确标注 5 |
| 需更正 | 9 | |
| **必须更正** | **8** | 全在必读链或施工依据链上 |
| **重建更划算** | **4** | |
| 按类判定（未逐份） | 93 | agent-ops 流水件 + internal / workflow 等 |

### 1.2 三条系统性发现（比单份文档更要紧）

**① 新宪章在规范层的渗透率 = 0。**

对 `PRODUCT.md` / `AGENTS.md` / `CLAUDE.md` / `ARCHITECTURE.md` / `DATA_MODEL.md` / `PRD.md` / `contracts/**` / `current-state/**` / `Coincides-Better-Notebook-Roadmap.md` 全量检索，「外骨骼」「MCP」「末端执行器」「组件语言」「订货方」「收据数据库」「流式装配」**七个新宪章核心词汇，命中 0 份文件**。

含义：宪章目前只活在 `analysis/` 一份文件里。Codex 按 `AGENT_CONTEXT → current-state → ADR` 的必读链开工，**读不到任何新方向**。这正是 CLAUDE.md §3 所说的「非对称的代价」：distill 失败 = 非对称破裂。**这是本次分诊的头号发现，优先级高于任何单份文档的更正。**

**② 状态头制度的辖区有洞。**

`scripts/docs-index.mjs` 的 `TARGET_DIRS` 只覆盖 `docs/agent-ops`、`agent-ops/decisions`、`agent-ops/current-state`、`docs/contracts`、`docs/brainstorm` 五个目录。因此：

- `docs/*.md` 根级 10 份（含 **ARCHITECTURE / DATA_MODEL / PRD / Coincides-Better-Notebook-Roadmap**——全是承重件）
- `docs/internal` 10 份、`docs/workflow` 3 份、`docs/continuity` 2 份、`docs/audits` 1、`docs/issues` 1、`docs/changelog` 2
- repo 根 `PRODUCT.md`（**宪法层第一必读，DOCUMENTATION-SYSTEM §二 明令状态头强制**）

**共 29 份文档没有状态头、不进任何 INDEX、不受「看状态头再信」纪律保护。** 其中 `PRODUCT.md` 无状态头是制度自伤：宪法文件自己不守自己定的强制约定。

**③ 07-15 §三 的「可执行更新手册」从未落地。**

`package.json` 中**不存在 `check:doc-impact`**，仓库中也无 doc-map manifest。当时的诊断（「单次盘查 98%，100 次连乘 ≈ 13%」）依然成立，且过去一个月又新增 V11 全线 + V12 转向两轮教义更替——**本表所盘出的脱节，正是该机制缺席的实测产出**。建议把 manifest 层列入 V12「随行三线」的第四线，或至少在文档批次一并落地。

---

## 2. 分诊总表

### A. 宪法层 / Agent 入口

| 文档 | 判定 | 一句理由 |
|---|---|---|
| `PRODUCT.md` | 🔴 **必须更正**（含局部重建） | 第一必读且全库最承重，但正文停在 06-20 / 06-29 教义：定位、表面模型、Source 时机三处与新宪章硬冲突（见 §3 C1 / C2 / C5），新宪章七大概念零覆盖；且**自身无状态头**。历史价值极高（设计语法与 telos 段落是产品的思想地基），不可重写整份 |
| `docs/agent-ops/AGENT_CONTEXT.md` | 🔴 **必须更正** | 路由本身健康，但 §3「当前前沿」停在 V2.BN.11.6 待复验、§3 主线分支写 `codex/v2-bn-canvas-engine`（现为 `fable/v2-bn12-exoskeleton`）、§4 四支柱无 V12 转向、§5 无新宪章条目。这是 Codex 开工第一站，**脱节直接产出错误施工** |
| `docs/agent-ops/DOCUMENTATION-SYSTEM.md` | 🟡 需更正 | 五层结构与状态头制度成立且承重；缺口 = 辖区未覆盖根级 / internal / workflow（发现②），且未收录 `analysis/`、`handoffs/`、`claude-log/` 三类的层归属 |
| `AGENTS.md`（repo 根） | 🟡 需更正 | 薄指针结构正确；但 §2 角色分工无 **Codex reviewer thread**（08-19 新设，角色卡已成文）、无主权代理期指挥链；§5 验证门仍写 `verify:v2-bn8-runtime`，需核对现状 |
| `CLAUDE.md`（repo 根） | 🟡 需更正 | 同上：无 reviewer 线、无代理期组织图；`analysis/unified-direction-concept-design.md` 未进必读清单（现为 v1 权威） |

### B. 现状层

| 文档 | 判定 | 一句理由 |
|---|---|---|
| `current-state/README.md` | 🔴 **必须更正** | 待拍-12 点名。内容质量高（V11 各子版本收据翔实，是全库最可信的事实面），但 §1 版本 / 分支、§3 四支柱、§4 watch list 全部停在 07-14 V11 收口，**完全不知道有 V12 转向**。它是 Codex 的「权威现状」，脱节代价最高 |
| `current-state/INDEX.md` | ⚪ 无需动 | 自动生成；随 README 状态头变化重跑 `node scripts/docs-index.mjs` 即可 |
| `agent-ops/README.md`、`HENRY-PREFERENCES.md` | ⚪ 无需动 | 事实未变，状态头正确 |
| `agent-ops/SESSION-HANDOFF-2026-06-27.md` | 🟡 需更正（或按其自述删除） | 文件自述「看完这份后可删」，已过去近两月且其描述的文档债务收口已完成；留着会与新的代理期交接混淆 |
| `decisions/ADR-0001` | ⚪ 无需动 | 自研 canvas 引擎路线仍 active；待拍-1 的「减负」是**范围收缩不是路线推翻**，ADR 结论未被取代（⚠️ 建议追加一条 08-19 注记说明减负边界，属需更正的边缘案例） |

### C. 契约层（`docs/contracts/`，14 份）

| 文档 | 状态头 | 判定 | 一句理由 |
|---|---|---|---|
| `Notebook-Object-Inventory-Contract.md` | active / 859 行 | 🟠 **重建更划算** | **07-15 §二 Henry 亲自点名**：06-23 建、V8 时代正文，07-13 打过教义横幅但「横幅补丁救不了正文脱节」。现已叠到第二层横幅；§0 Active Doctrine 仍以 Petal 为根、§1 Root Model 仍以 PageFrame 为内容容器（冲突 C7）。建议：冻结原件为历史，按五真相 + V12 地板组件重建一份精简 inventory（生成层优先） |
| `ContentGroup-GroupFolder-Contract.md` | active | 🔴 **必须更正** | 唯二 active 契约之一，仍是 Codex 施工依据；07-13 横幅已声明端点更替，但正文 §0.0 Active Doctrine 与 §10 Relation Boundary 仍是 Petal / CG-endpoint 口径。承重且历史价值在（Folder 组织语义仍现役） |
| `TextFlow-Contract.md` | draft | 🔴 **必须更正** | V12 必修②（流式装配面 + 地板组件）与必修⑤（root-cause 并案）**都坐在这份契约的内核上**，且宪章 §4 明言「新流面仍坐同一 TextFlow 内核」。它从 06-23 起 draft 未冻结，是全库最该升级为 frozen 的一份 |
| `Command-Surface-Contract.md` | draft | 🟡 需更正 | 命令面三分法思想仍成立；词汇（Petal / future ContentGroup）需随 Item 教义更替；意图路由器（宪章 §8）是它的天然下游，宜在此加接缝 |
| `Annotation-Contract.md` | draft | 🟡 需更正 | annotation 层仍现役但**已知为 pre-pivot 遗产**（annotation 父子层级已是 vestigial）；需加「不再投资」注记而非细改 |
| `Source-Provenance-Contract.md` | deferred | 🔴 **必须更正** | V12 必修④ 明确要求「**层0 schema 与窄腰契约本版定死**」——这份 deferred 契约将在 V12 内被激活，且当前正文（V2.BN.6 时代）不含三层梯子、多记坐标、按需解析。**是 V12 施工的前置文档，不能停在 deferred** |
| `Source-Reconstruction-Contract-Intake.md` | deferred | 🟠 **重建更划算** | 06-12 从 PI-048 提取，前提是「入库即重建」的旧管线；新宪章 §3 已把解析改为按需、付费点后移、层2 VLM 归 Agent 版，**前提整个换了**，逐条改不如按抽取矩阵重写 |
| `Block-Contract.md` | deferred | ⚪ 无需动 | 已 deferred 且 block-first 已明确过时；正确地不冒充现行真相 |
| `Editor-State-Rebuild-Contract.md` | deferred | ⚪ 无需动 | editor state / truth / derived 三分仍是正确思想，deferred 状态诚实 |
| `Link-Source-Relation-Boundary-Contract.md` | deferred | ⚪ 无需动 | 07-14 横幅已精确交代「三分法存活、词汇更替、各条兑现情况」——**全库横幅补丁的最佳范例**，可作为其他契约的更正模板 |
| `Template-Category-Contract.md` | deferred | 🟡 需更正 | Template 概念在新宪章下分裂为「排版预设 / 编译器」（§7）与「订单规格」（§9）两条完全不同的线；deferred 状态下无害，但需加指向注记，免得将来激活时误用 |
| `Canvas-Page-Surface-Contract.md` | superseded | ⚪ 无需动 | 已正确标 superseded 并指向 ADR-0001 |
| `Petal-Contract.md` | superseded | ⚪ 无需动 | 日落公告完整、指向准确 |
| `INDEX.md` | active | ⚪ 无需动 | 自动生成 |

### D. 根级产品文档（`docs/*.md`，10 份 —— **全部无状态头**）

| 文档 | 判定 | 一句理由 |
|---|---|---|
| `Coincides-Better-Notebook-Roadmap.md`（1996 行） | 🟠 **重建更划算**（分家式） | 待拍-12 点名。文件自述「1900+ 行、多套版本 scheme 并存」，已有一层「⚠️ 历史·勿作现行依据」内部横幅；`:35` 仍写「V2.BN.12+ 打磨」（与待拍-8 直接冲突）。建议分家：①§1–§5 长青参考 + 新 V12 权威 map → 新建一份精简 ACTIVE 路线图；②原件整体冻结为历史路线图。理由：在一份已经装了三套 scheme 的文件里插第四套，正是复制它得病的原因 |
| `ARCHITECTURE.md` | 🔴 **必须更正** | 06-06 成文，被新宪章 §2 / §10 **直接引用**（「GraphRAG sidecar，ARCHITECTURE.md §5.4 已定」）——但其 §4 / §5 词汇仍是 `ObjectRelation`（047 已落表）、Source 适配器仍是「入库即重建」（冲突 C6 / C5）。**被权威文件引用的文件自己过时**，是最危险的一类脱节。且需新增「MCP 工具面 / 末端执行器」边界章节（V12 必修① 的架构落点） |
| `DATA_MODEL.md` | 🔴 **必须更正** | 06-06 成文的概念模型，早于 Purpose(V9) / Source(V10) / Item+Relation(V11) 三层真相全部落地。它是 Codex 理解数据边界的入口之一，**落后三个版本** |
| `PRD.md` | 🔴 **必须更正** | §2 产品阶梯把 **Petal 列为现役第 4 步**（已物理清场），且**无任何横幅**——是全库唯一「无警示地冒充现行真相」的承重件（冲突 C4）。定位段与 PRODUCT.md 同源同病 |
| `Coincides-Relation-Product-Design.md` | ⚪ 无需动 | 已标 `superseded-in-part` 并逐条列出作废范围与保留价值，处置得当 |
| `Coincides-Roadmap.md` | ⚪ 无需动 | 已标 CLOSED / historical |
| `BACKLOG.md`、`DELIVERY_PLAN.md` | ⚪ 无需动 | 均自述「历史归档 / 非当前执行入口」，诚实 |
| `docs/README.md` | 🟡 需更正 | 已标 superseded 且自述「待重写为现状层入口」——**这张欠条挂了三个月**。文档批次可顺手兑现（低成本高收益：它是 `docs/` 的门面） |
| `v2-note-system-draft.md` | ⚪ 无需动 | 自述 early draft、未定稿；建议补一条 superseded 状态头（边缘案例） |

### E. repo 根 README

| 文档 | 判定 | 一句理由 |
|---|---|---|
| `README.md`（repo 根） | 🟠 **重建更划算** | 停在 **v1.7.3**，通篇介绍 Mr. Zero / FSRS 卡片 / 学期规划——而新宪章 §10 明言「**V1 老 agent(Mr. Zero)启动时正式声明取代**」。这是仓库的对外门面（也是将来任何协作者看到的第一页），描述的是一个已被两代方向取代的产品。逐段改不如按「长着投影的收据数据库 / 学习主力工具」重写一页 |

### F. 流程 / 内部 / 历史类（按类判定，19 份）

| 目录 | 份数 | 判定 | 一句理由 |
|---|---|---|---|
| `docs/internal/V2.BN.6–7 *` | 7 | ⚪ 无需动 | 均为已完成阶段的审计 / 尸检 / 路线草案，事实上是历史层放错了位置——建议整体移入 `docs/releases/` 或加冻结横幅，属归档动作不属更正 |
| `docs/internal/Coincides-Agent-Operating-Manual.md` | 1 | 🔴 **必须更正** | 自述 v2.5.0 scaffold，教 agent「如何在 Coincides 里安全施工」——而 V12 必修① 正是要把操作暴露为 **MCP 工具面 + 守卫 + 收据**，这份手册是那件事的文档前身。当前内容（proposal-first、ObjectRelation）已与 V11 后的真相层不符 |
| `docs/internal/Better-Notebook-Implementation-Reality-Check.md` | 1 | ⚪ 无需动 | 06-06 的代码能力盘点，已被 current-state 取代；加冻结横幅即可 |
| `docs/internal/Better-Notebook-Phase-Plan-Template.md` | 1 | 🟡 需更正 | 仍在用（每个 V2.BN.x plan 的模板），但需并入 07-15 §十 的新纪律：**触及面申报 + 旅程分数验收** |
| `docs/workflow/*` | 3 | 🟡 需更正 | `Coincides-Workflow.md` 分支写 `feat/v2.0-noteblock`、`Coincides-Onboarding.md` 停在 05-16 v2.0——**指向不存在的工作线**。三份都低频但会误导新会话；最省力处置 = 加冻结横幅 + 指向 `AGENTS.md` / `CLAUDE.md` |
| `docs/continuity/*` | 2 | ⚪ 无需动 | v2.x 结转登记册，作用域已关闭（v2.0–v2.5.6）；诚实的历史件 |
| `docs/audits/`、`docs/issues/`、`docs/changelog/` | 4 | ⚪ 无需动 | v1.3 时代审计与问题单，纯历史 |

### G. agent-ops 流水件（按类，64 份）

| 类 | 份数 | 判定 | 一句理由 |
|---|---|---|---|
| `handoffs/**` | 31 | ⚪ 无需动 | 交接单是**收据**，历史就地冻结；`status: done` 者天然归档 |
| `claude-log/**` | 18 | ⚪ 无需动 | 行动日志，追加式，永不回改 |
| `analysis/**` | 15 | ⚪ 无需动（1 例外） | 分析件按成文时点冻结。**例外**：`unified-direction-concept-design.md` 已升 v1 权威，但**层归属仍写「概念设计 / Analysis」**——权威文件住在非权威目录里，与 DOCUMENTATION-SYSTEM 的层纪律冲突（见 §4 建议 B） |

---

## 3. 与新宪章冲突的段落清单（点名）

> 逐条：**旧段落（可定位）→ 新宪章依据 → 冲突性质**

| # | 段落 | 旧口径 | 新宪章依据 | 性质 |
|---|---|---|---|---|
| **C1** | `PRODUCT.md:22`、`docs/PRD.md §1` | 「Coincides is a **refined information-processing notebook**」 | §0 / §1：**学习主力工具**；本体论 = **长着投影的收据数据库**（08-18 §四 / §十二） | 定位替换（宪法级） |
| **C2** | `PRODUCT.md:81` + `:87` | 「clean product model is **canvas-backed**」；Page 是画布内取景框；**Page-first / Canvas-first 两模式** | §4 表面重划：默认面 = **流式装配面**；canvas 降为「摆 + 圈」；待拍-1 释放无尽 / Figma 级；待拍-2 Note = 唯一文档单位 | 表面模型替换 |
| **C3** | `PRODUCT.md:239–256`（原则 8 全节，含 `Elastic Avoidance` 长条款） | 自由布局 + 弹性避让作为**产品级原则** | 待拍-1（08-16 §四.6）；08-08 实测摩擦重灾区 = 自由摆放 | 降级（产品原则 → canvas 面局部行为） |
| **C4** | `docs/PRD.md §2` 产品阶梯第 4 步 | 「**refining one ContentGroup with Petals**」作为现役阶梯 | Petal 已 V2.BN.11.1 停写 / 047 落表 / **11.7 物理清场** | **无警示的失效真相**（全库唯一） |
| **C5** | `PRODUCT.md:91`；`ARCHITECTURE.md §5 Source Reconstruction Adapter` | 「**Before** source material becomes useful note content, Coincides **should detect type, recover regions**…」= 入库即重建 | §3 三层梯子：层0 零成本进门、**解析按需、不入库即解析**、付费点后移至首次加工；层2 VLM 归 Agent 版 | 管线时序反转（直接决定 V12 必修④ 口径） |
| **C6** | `ARCHITECTURE.md §4 Relation Truth`、`§5 GraphRAG Adapter` | 通篇 `ObjectRelation` 词汇；endpoint 未指明 | V11：端点 = **Item**，`relations` 表，旧三表 047 落表 | 词汇失效 + **被 §2 / §10 引用**（权威件引用了过时件） |
| **C7** | `contracts/Notebook-Object-Inventory-Contract.md §0` + `§1 Root Model` | §0 Active Doctrine 以 **Petal** 为根；§1 `NoteCanvas → PageFrame → Block` 树 | 待拍-2 page frame 退役；Item 教义 | 对象模型根节点错位 |
| **C8** | `PRODUCT.md` / `ARCHITECTURE.md` / `DATA_MODEL.md` **全文缺席** | 无「外骨骼 / 穿戴者 / 大脑」三层、无 **MCP 工具面**、无末端执行器、无组件语言、无投影导出、无订货方 | §2 架构总图、§5 组件体系、§6 成长路径、§7 投影导出、§9 Purpose 2.0 | **缺章**（非更正可补，须新增） |
| **C9** | `Coincides-Better-Notebook-Roadmap.md:35`、`:1962` | 「**V2.BN.12+ 打磨** …… 工程可靠 → 用户可靠；ContentGroup 完整集成落此」 | 待拍-8：**V12 = 「外骨骼与地板」**，必修五件 + 随行三线 + 明确不带清单 | 版本定义替换（待拍-12 明令更新） |
| **C10** | `AGENT_CONTEXT.md §3`；`current-state/README.md §1` | 主线分支 = `codex/v2-bn-canvas-engine`；前沿 = V2.BN.11.6 待复验 | 实际分支 `fable/v2-bn12-exoskeleton`；V11 已 07-14 全线 PASS 收口 | 事实滞后 |
| **C11** | repo 根 `README.md` 全文 | v1.7.3；**Mr. Zero** 为核心 agent；FSRS 卡片系统为主打 | §10：「⚠️ V1 老 agent(**Mr. Zero**)启动时**正式声明取代**」 | 对外门面描述已死产品 |

---

## 4. 建议处置（供 Fable 拍板）

### 批次一 —— 止血（建议在 V12 首单落地前完成）

只做一件事：**让必读链知道有新宪章**。最小改动、最高收益，直接解决发现①。

1. `AGENT_CONTEXT.md`：§1 必读清单加入 `analysis/unified-direction-concept-design.md`（v1 权威）；§3 更新分支与前沿；§4 加 V12 转向摘要与「明确不带」清单。
2. `current-state/README.md`：§1 加 **2026-08-19 authoritative override** 段（形制照抄它自己的 07-14 override，全库最佳范例）；§3 四支柱加 V12 影响；§4 watch list 加「文档脱节」与「V10 / V11 体验门仍欠」。
3. `CLAUDE.md` / `AGENTS.md`：补 Codex reviewer 线与代理期指挥链。

> 判据：这三步不涉及任何设计判断，只是把已拍事实 distill 进接口层——正是 CLAUDE.md §3 定义的我的本职。

### 批次二 —— 宪法层重划（需 Fable 逐段拍）

4. `PRODUCT.md`：改 C1 / C2 / C3 / C5 四处 + 新增 C8 缺章 + **补状态头**。
   建议形制：**保留 06-20 / 06-29 两节原文并加「历史教义」横幅**（它们是产品思想的出生证，且设计语法 / telos 仍现役），在其后追加 `## 2026-08-19 统一方向教义`。避免整份重写。
5. `docs/PRD.md`：优先补 C4 横幅（**全库唯一无警示的失效真相，止血成本一行**），其余随批次三。
6. `ARCHITECTURE.md`：C6 词汇更替 + 新增 MCP 工具面 / 末端执行器边界节（V12 必修① 的架构落点）。

### 批次三 —— 重建四件（各自独立，可并行外包）

7. `Coincides-Better-Notebook-Roadmap.md` → 分家：新建精简 ACTIVE 路线图（长青参考 + V12 权威 map），原件整体冻结。
8. `contracts/Notebook-Object-Inventory-Contract.md` → 冻结原件 + 重建精简 inventory（**优先走生成层**：表 / 路由 / canvas object kinds / 操作从代码生成，手写只留意图，见 07-15 §三.1）。
9. `contracts/Source-Reconstruction-Contract-Intake.md` → 按三层梯子 + 抽取矩阵重写（与 V12 必修④ 同批）。
10. repo 根 `README.md` → 按新定位重写一页。

### 建议 A —— 补制度洞（发现②）

把 `docs`（根级）、`docs/internal`、`docs/workflow`、`docs/continuity` 加入 `scripts/docs-index.mjs` 的 `TARGET_DIRS`，并给 29 份无状态头文档补头。**成本一次性，收益是让「看状态头再信」这条纪律真正全覆盖**。

### 建议 B —— 权威件的层归属

`unified-direction-concept-design.md` 现为 v1 权威却住在 `analysis/`（非权威目录）。两条路：①移入 `current-state/` 或新建 `docs/agent-ops/doctrine/`；②留在原地，但在 `DOCUMENTATION-SYSTEM.md` 明确「analysis 层允许出现 `权威=是` 的例外件，须在 AGENT_CONTEXT 必读清单点名」。**倾向 ②**——移动会打断上游引用链，且宪章明确自己是「概念设计」性质。

### 建议 C —— 更新手册（发现③）

07-15 §三 的三层方案（生成层 / manifest 层 / 判断层）建议至少落 **manifest 层**：一份粗粒度 doc-map + `check:doc-impact` 进 verify 链。**红线照原议**：manifest 宁粗勿细；警告不阻塞 commit。

若 V12 排期紧，退一步的最小版本 = 在批次一同时写一份 `docs/agent-ops/current-state/DOC-MAP.md`（手写、粗粒度、10 行以内），先解决「想不起来该更哪份」。

---

## 5. 判断点（供 Henry / Fable 复核）

| # | 我的判断 | 理由 | 可逆性 |
|---|---|---|---|
| 1 | **把「渗透率 0」提为头号发现，排在所有单份文档之上** | 分诊协议问的是「哪份要改」，但真问题是接口层整体失联——Codex 现在按必读链开工会完全读不到 V12 转向。答「每份怎么改」而不答这个，等于答错题 | 高（结论可推翻，不改任何文件） |
| 2 | **冻结层 614 份整类判「无需动」，不逐份看** | `AGENT_CONTEXT §2` 明令历史 / 研究层就地冻结、禁止回改。逐份评估既违纪律又耗尽预算 | 高 |
| 3 | **路线图与 inventory 判「重建」而非「更正」** | 两份都已叠加内部历史横幅（路线图自述三套 scheme 并存、inventory 叠两层教义公告）。**07-15 §二 Henry 原话「横幅补丁救不了正文脱节」就是针对 inventory 说的**——再打第三层补丁是重复已知失败 | 中（重建前需 Fable 认可分家形制） |
| 4 | **PRODUCT.md 判「必须更正」而非「重建」** | 它同时装着已死的表面模型和仍现役的思想地基（设计语法 / telos / 红线）。整份重写会误伤 Chesterton's fence——07-15 §五 立的规矩 | 高 |
| 5 | **建议批次一「止血」不等拍板即可执行**（但我未执行） | 它只 distill 已拍事实，无设计判断成分。**但我停在建议**：文档改动会改变 Codex 的施工依据，属对外后果，按代理期纪律应由 Fable 放行 | — |
| 6 | **未逐份读 handoffs / claude-log / releases 全文** | 抽样验证其状态头与归属正确即止。若需要「每份都点名」的完整清单，可再跑一轮（成本主要在 releases 450 份） | 高 |

---

## 6. 交付说明

- 本表**只评估不执行**：未修改任何被评估文档。
- 承重件 33 份逐份判定，其余 700 份按类判定（依据见 §0.2、§5 判断点 2 / 6）。
- 冲突清单 §3 的 11 条均可定位到具体文件行或章节，供施工单直接引用。
