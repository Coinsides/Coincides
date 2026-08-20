> **状态 (Status)**: superseded
> **层 (Layer)**: 分析 / Analysis（宪法层重划提案 · **已终审并执行**）
> **被取代 (Superseded by)**: [`PRODUCT.md`](../../../PRODUCT.md)（2026-08-20 CH-1…CH-7 全部执行完毕）
> **日期 (Updated)**: 2026-08-20
> **权威 (Authoritative)**: 否（提案本身）；**§5 四问已由 Henry 本人于 2026-08-20 亲自裁定，见 §5 裁定栏**
> **委托**: 批次二（分诊表 §4）。流程：Opus 起草 → Fable 过目 → **Henry 终审**。Fable 与 Opus 均不代拍此件。

# `PRODUCT.md` 宪法层重划提案

## 0. 形式：为什么是逐条 changeset，不是整页替换

前四件重建我都用了「新建精简件 + 冻结原件」。**这一件我刻意不那么做。**

| 理由 | 说明 |
|---|---|
| **它不是脱节文件，是半脱节文件** | `PRODUCT.md` 同时装着**已死的表面模型**（canvas-backed 两模式、Page-first）和**仍现役的思想地基**（06-29 设计语法、telos、红线）。整页重写会误伤后者 —— Chesterton's fence |
| **宪法层的改动要能被逐条否决** | Henry 可能认 8 条否 2 条。整页替换是「全接受或全拒绝」；changeset 是「逐条翻牌」 |
| **可逆性要写在每一条上** | 见下方每条的「可逆性」列 |

**故：本文是一份改动清单，每条含【位置 / 现文 / 拟改 / 依据 / 可逆性 / 我的置信度】。** Henry 逐条认/改/驳，认下的才执行。

---

## 1. 诊断（分诊表 §3 C1/C2/C3/C5/C8 + 制度自伤一条）

| # | 问题 | 性质 |
|---|---|---|
| C1 | 定位「refined information-processing notebook」 | 已被宪章 §0/§1 更替 |
| C2 | 表面模型「canvas-backed」+ Page-first / Canvas-first 两模式 | 已被宪章 §4 表面重划更替 |
| C3 | 原则 8「Free Layout」及 `Elastic Avoidance` | **降级**（作用域收缩），非删除 |
| C5 | Source「入库即重建」 | 已被宪章 §3 三层梯子更替（时序反转） |
| C8 | 缺章：外骨骼三层 / MCP 工具面 / 组件语言 / 投影导出 / 订货方 / 学习闭环 | **新增**，非更正 |
| — | **本文件没有状态头** | 违反自身 `DOCUMENTATION-SYSTEM.md §二`「强制约定」。**宪法文件不守自己定的规矩** |

---

## 2. 改动清单

### CH-1 — 补状态头（**制度自伤修复**）

- **位置**：文件最顶部（`# Product` 之前）
- **现文**：无
- **拟改**：

```markdown
> **状态 (Status)**: active
> **层 (Layer)**: 宪法 / Constitution
> **日期 (Updated)**: <翻牌日>
> **权威 (Authoritative)**: 是
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —
```

- **依据**：`DOCUMENTATION-SYSTEM.md §二`「每一份"活着的"文档（宪法/决策/现状/live 契约）顶部**必须**有状态头」。
- **可逆性**：极高（纯元数据）。
- **置信度**：**高**。这条不含产品判断，纯粹是让宪法文件遵守它自己颁布的规矩。

---

### CH-2 — 定位（C1）⚠️ **已按 Henry 裁定改写**

> **Henry 裁定（Q1）：保留更宽的定位。** 学习是首个战场但不是天花板；定位仍写「信息处理」，学习作为**当前主攻方向**写在下一层。避免过早把产品钉死在学生场景。
>
> **这条推翻了 Fable 代拍的宪章 §1 定位句（「定位:学习主力工具」）在宪法层的适用**，下游影响见 §5.1。

- **位置**：`PRODUCT.md:22`（`## Product Purpose` 首句）
- **现文**：

> Coincides is a refined information-processing notebook. Its job is to help humans and AI turn selected materials into readable, editable, source-aware notes and reports.

- **拟改**（首句**保留**，其后追加本体论与阶段焦点两段）：

> Coincides is a refined information-processing notebook. Its job is to help humans and AI turn selected materials into readable, editable, source-aware notes and reports.
>
> **Structurally, it is a receipts database that grows projections.** The five truths are the tables; the receipts — anchors, birth certificates, judgment snapshots — are foreign keys with honest degradation; and the reading surface, the canvas, an HTML export, and a vault export are four views of the same rows. The contrast that names it: **a highlight made in a browser dies inside that file; a selection made here lives on as a receipt.** Obsidian is a note app on top of a filesystem; Coincides is a learning system on top of a database.
>
> **The current stage focuses on learning.** Study material is the first battlefield — the place where the product must become good enough that its author stops reaching for anything else. That is a focus, not a ceiling: research, report assembly, and long-horizon material organization stay within the north star, they are simply not what this stage optimizes for.

- **依据**：宪章 §1（本体论部分）+ **Henry 2026-08-20 亲裁（范围部分）**。
- **可逆性**：中（本体论段与阶段焦点段各自可独立删改）。
- **置信度**：**高**（裁定后）。

> 📌 **我按裁定做的拆分**：Henry 反对的是**范围收窄**（「学习主力工具」把产品钉死在学生场景），不是**本体论**（「长着投影的收据数据库」讲的是架构不是受众）。故保留后者、降级前者为阶段焦点。**若这个拆分读错了他的意思，改起来只是删一段。**

### CH-3 — 表面模型（C2）

- **位置**：`PRODUCT.md:81` 与 `:87`
- **现文（:81）**：

> The clean product model is canvas-backed rather than three separate surfaces. A Note owns an underlying infinite canvas/workspace. A Page is a fixed exportable frame inside that canvas...

- **现文（:87）**：

> Canvas behavior should support two broad modes. A Page-first note gives the user a stable Page frame for writing... A Canvas-first note lets the user start directly from the open infinite workspace...

- **拟改**：**保留两段原文并加历史横幅**，其后追加现行表述：

```markdown
> ⚠️ **2026-08-19 更替**：以下两段描述的「canvas-backed + Page-first/Canvas-first 两模式」
> 已被表面重划取代（拍板记录 待拍-1 / 待拍-2）。保留原文作为思想沿革，不作为现行依据。
```

追加：

> **Note is the only document unit.** The default writing surface is a **stream assembly surface** — a one-dimensional component stream where layout is handled by the flow, not placed by hand. The canvas is kept for what it is genuinely good at: **arranging** (spatial organization, walls, whole-view) and **circling** (selection, anchoring, red-pen marking on originals). The page frame retires from being a content container into being an **export viewfinder**; A4 and pagination become export concerns, not writing concerns.
>
> ⚠️ Retiring the page frame is a **direction**, not a demolition: during V2.BN.12 the page-frame machinery is not physically removed — the new surface routes around it.

- **依据**：宪章 §4 表面重划表 + 待拍-1 / 待拍-2（含「V12 期间机器不物理拆」的执行分级）。
- **可逆性**：**中**（方向声明，可扩回；机器未拆，工程上完全可逆）。
- **置信度**：**高**。08-08 实测摩擦重灾区正是自由摆放，证据充分。

---

### CH-4 — 原则 8 降级，`Elastic Avoidance` 归属待定（C3）

- **位置**：`PRODUCT.md:239–254`（`### 8. Free Layout Should Still Feel Orderly` 全节）
- **拟改**：节标题改为 **`8. Free Layout On The Canvas Should Still Feel Orderly`**，并在节首加：

> **作用域（2026-08-19）**：本原则约束的是**画布面**，不再是默认书写面。默认面是流式装配面，其版面由排版预设与编译器给出 —— **好格式是默认给的，不是调出来的**。

- **`Elastic Avoidance` 三段（`:243–254`）：按 Henry 裁定（Q2）随 Page 模式一起退役。** 拟处置：整体移出正文，改为一行历史注记 ——
  > 📜 `Elastic Avoidance`（块间弹性避让，开发中偶然发现并保留的书写手感）随 Page 模式退役于 2026-08-20。原条款见本文件 git 史。
  **⚠️ 与我的倾向相反**（我倾向留着等流式装配面成型再判），Henry 亲裁退役，照办。
- **依据**：待拍-1（canvas 减负）。
- **可逆性**：高。
- **置信度**：**高**（裁定后）。
  > 留档：我的分诊表 C3 曾把整节判为「与待拍-1 冲突」，起草时我复核认为**那句过头了** —— 待拍-1 释放的三类不覆盖弹性避让，真正影响它的是待拍-2（宿主 Page 模式退役）。**这个纠正仍然成立**：它是随宿主退役，不是因「炫技」被释放。裁定结果相同，但理由不同，记录要准。

---

### CH-5 — Source 解析时序（C5）

- **位置**：`PRODUCT.md:91`
- **现文**：

> Source reconstruction is part of the product identity. **Before** source material becomes useful note content, Coincides should detect source type, recover meaningful regions, preserve page labels and provenance, and distinguish text, formulas, tables, diagrams, handwriting, code, and decorative page elements where possible.

- **拟改**：

> Source handling is part of the product identity, and it works as a **three-rung ladder**:
>
> - **Rung 0 — view the original.** Hash and blob; zero-cost entry. No parsing, no extraction, no understanding.
> - **Rung 1 — original plus anchors.** ⭐ **A region anchor requires no parsing.** You can circle an area on an untouched original and ask about it. Anchor coordinates are **format-native**: page + bbox for PDF, element path + offset for DOCX, cell address for XLSX.
> - **Rung 2 — cited source.** Narrow-waist parsing into a typed component stream with reading order and source coordinates. **Parsing happens on demand, not on intake** — the cost is paid at first use, not at the door.
>
> Reconstruction is never note generation, and parse output is always a **derivative, never truth**.

- **依据**：宪章 §3；已落契约 `contracts/Source-Ladder-Contract.md`（active）L-1/L-2/L-3。
- **可逆性**：**中低** —— 它已经在契约层落成 active，且是 V12 必修④ 的施工口径。
- **置信度**：**高**。这条不只是方向，已有 active 契约背书。

---

### CH-6 — 新增章节（C8）

- **位置**：`## 2026-06-29 Design Grammar And Telos Sharpening` 之后、`## Accessibility & Inclusion` 之前
- **拟改**：新增 `## 2026-08-19 统一方向教义` 一节，全文见 §3。
- **依据**：宪章 §2/§5/§6/§7/§9/§11。
- **可逆性**：高（新增节，整节可删）。
- **置信度**：**中高**。内容是宪章的忠实蒸馏；**取舍在于蒸馏多少** —— 见 §5 问题 Q3。

---

### CH-7 — 历史章节挂横幅（不删）

- **位置**：`## 2026-06-20 Better Notebook Doctrine`（:40）
- **拟改**：节首加一行：

> 📜 **历史教义（2026-06-20）**。其确立的 `TextFlow-first / ContentGroup-aware`（取代 block-first）**至今有效**；其中 `Petal` 已于 V2.BN.11 退役（节内已有 07-13 补丁）。表面模型部分见 CH-3。保留原文作为思想沿革。

- **依据**：分诊表判定（该节部分存活）。
- **可逆性**：极高。
- **置信度**：**高**。

---

## 3. CH-6 新增章节全文（拟）

```markdown
## 2026-08-19 统一方向教义

上游：`docs/agent-ops/analysis/unified-direction-concept-design.md`（v1 权威，12 条拍板记录附其文末）。

本节不取代 06-20 与 06-29 两节 —— 它们是这一节的思想上游。本节增补的是「智能进来之后，这个产品是什么形状」。

### 三句钉语

智能会贬值，真相不会。智能是租的，手是自己的。
手为什么长这个形状 —— 那个「为什么」，就是核。

### 三层不绑架

大脑（模型）全租，前沿一档，provider 缝可换。
穿戴者（harness）可换可多：管家、工程、产房各有其一。
外骨骼（应用）**唯一不换**：真相层 + 末端执行器 + 守卫 + 收据。

两条纪律：**穿戴者只许点菜不许下厨**；**外骨骼不为任何穿戴者整容** —— 改锥形状由螺丝决定。

### 能力归应用，编排归用户

每项能力都暴露为工具面（MCP），带守卫与收据。编排层归用户，
应用不被任何 LLM 或 harness 绑架。这是红线「Agent 能做的，人类必须
100% 能做」在架构上的兑现方式：同一道门，同一把钥匙。

### 零模型荣誉榜

客观判分、机械新鲜度、沉降、选区捕捉、锚定位、compiled scope ——
全机械，零 token。**设计健康度的另一半，是有多少事情不需要模型。**

### 选区收据

一切手势（多选 / 框选 / 文字选区 / 红笔圈 / 文字指代）在客户端解析成
对象身份，归一为 `{对象 IDs, 文字范围, 几何, 时刻}`。
**选区收据 ＝ 还没保存的锚** —— 锚系统的前半生。
零 OCR：不需要用眼睛认自己亲手画的东西。

### 组件语言与成长路径

组件不是预先设计齐的，是**长出来的**：产房现搓 → 案例库留存并积使用
收据 → **凭使用收据晋升转正**，获完整真相层待遇。与字段晋升、沉降同律。

⭐ **内容与壳分离**：数据（带源锚）走真相层，交互壳走沙盒 ——
**转正只升级壳，内容从未流浪。**

### 投影与导出

**真相存对象，投影出 HTML。** 应用内打开的是本人，导出的是照片 ——
编辑视图与导出成品共用同一套组件渲染与 token（所见即将得）。

**格式即承诺**：分享出去的导出格式是永久对外契约，版本化，永远向后可读。

**使用 ≠ 修改**：应用外的折叠、勾选、做题都是使用，不需要回家机制。

### 学习闭环（产品的理论层）

双层结构：理解层与骨架层，折叠决定的是提取还是编码。
**教学装置不可删** ——「AI 笔记 = 缩短」是错方向。
写入一比特，读取全分辨率。
credence 逐块、属于用户，且与 provenance 正交。

### 我们是在补哪一半

artifact 与 design 工具的页是**终点**（孤儿成品）；
我们的页是**投影**（背后有真相层）。
不是重做它们，是补上它们没有的那一半。
```

---

## 4. 明确**不动**的部分（Chesterton's fence）

| 段落 | 为什么不动 |
|---|---|
| `## Users`（:7–18） | ✅ **Henry 裁定（Q4）：保留四类，但加一句边界。** 拟加于该节末：<br>「Learning is what this stage optimizes for. The other uses stay in scope but are not separately designed for yet.」 |
| `## Brand Personality`（:123） | 安静 / 可靠 / 清晰 / 严肃而不冷 —— 与新方向无冲突 |
| `## Anti-references`（:137） | 逐条核过，与宪章零冲突。「not a raw Obsidian replacement」与宪章「Obsidian 是文件系统上的笔记应用，我们是数据库上的学习系统」是同一意思的两种说法 |
| 设计原则 1–7、9–11 | 逐条核过。原则 5（出处可查）、7（AI 协作不接管）、9（工程可靠先于打磨）被新方向**加强**而非削弱 |
| `## 2026-06-29 Design Grammar And Telos Sharpening` 全节 | **全项目最承重的一节，一字不动。** 唯一结构律（相对的绝不焊死到绝对的上面）、Project 是镜片、telos（思维义肢）、substrate/operator 分离 —— 全部是新方向的上游而非下游 |
| `## Accessibility & Inclusion` | 未被触及 |

---

## 5. Henry 亲裁结果（2026-08-20）

| # | 问题 | **Henry 裁定** | 与我的倾向 |
|---|---|---|---|
| **Q1** | 定位是否收窄为「学习主力工具」 | ❌ **保留更宽的定位**。学习是首个战场但不是天花板；定位仍写「信息处理」，学习作为当前主攻方向写在下一层。**避免过早把产品钉死在学生场景。** | 我未表态（此题我明确不代拍） |
| **Q2** | `Elastic Avoidance` 存废 | ✅ **随 Page 模式一起退役** | **与我倾向相反**（我倾向留着等流面成型再判）。他的发现，他定，照办 |
| **Q3** | 新增章蒸馏浓度 | ✅ **就这个厚度**（约 60 行） | 与我倾向一致 |
| **Q4** | `## Users` 是否收窄 | ✅ **保留四类，但加一句边界** | 与我倾向一致（我倾向不动，他补了边界句，更好） |

> 另：**LICENSE 问题 Henry 已自行处置** —— 补了 `LICENSE`（MIT）并在 `README.md` 写下「为一个人设计，无条件公开给全世界」。我在 README 草案 §2 挂的那条悬空事项闭环。

### 5.1 ⚠️ Q1 的下游影响（**须报 Fable**）

Henry 的 Q1 裁定**推翻了 Fable 代拍的宪章 §1 定位句在宪法层的适用**。这是授权字据里「Henry 保留全量推翻权」的第一次实际行使，需要下游对齐：

| 位置 | 现状 | 建议处置 |
|---|---|---|
| `analysis/unified-direction-concept-design.md` §1 | 「**定位:学习主力工具**——任意常见学习文档扔进来」 | **加 rider**：范围部分经 Henry 2026-08-20 亲裁降级为**阶段焦点**，非产品定位。**本体论部分（收据数据库）不受影响。** ⚠️ 该文件是 Fable 的产出且带拍板记录表，**由 Fable 自行加注**，我不代改 |
| `docs/ROADMAP.md` §4 判定表 | 「现行定位＝**学习主力工具**」 | 随之改为「北极星＝信息处理中台；当前阶段焦点＝学习」 |
| `README.md` 开篇 | 「一个把学习材料变成可追溯知识的笔记系统」 | **不必改** —— 门面页讲的是当前阶段能做什么，与阶段焦点一致，不构成定位声明 |

> 📌 **我做的拆分**：Henry 反对的是**范围收窄**（把产品钉死在学生场景），不是**本体论**（收据数据库讲架构不讲受众）。故 CH-2 保留后者、把前者降级为阶段焦点。**若这个拆分读错了他的意思，删掉那一段即可。**

## 6. 执行清单（Henry 逐条翻牌后）

0. **前置**：§5.1 的下游对齐 —— 宪章 rider 由 **Fable** 加注；`ROADMAP.md` §4 定位句由我随本批次改。
1. ✅ CH-1…CH-7 全部执行（CH-2/CH-4 按裁定改写后执行）。`PRODUCT.md` 97 增 13 删，**06-29 设计语法与 telos 全节零改动**（已机械核对）。
2. ✅ `AGENT_CONTEXT.md §1` 冲突警示已换为完成说明（含 Henry 推翻代拍那条）；`§7` 该行改「已处置」。
3. ⏳ `docs/PRD.md` 定位段随 CH-2 同步 —— **未做**：PRD 整体仍 `draft` 且有多处其他脱节，单改定位段会造成局部新旧混杂。建议随其自身重划一并处理。
   ✅ `docs/ROADMAP.md` §4 判定表的定位句已按 §5.1 更新。
4. ✅ `npm run docs:index`。
5. ✅ 本提案转 `superseded`。
6. ⏳ **宪章 §1 的 rider 由 Fable 加注**（§5.1）—— 那是 Fable 的产出且带拍板记录表，我不代改。

---

## 附：我在本提案里改过自己的一次判断

分诊表 §3 的 **C3** 我写的是「原则 8 全节（含 `Elastic Avoidance` 长条款）与待拍-1 冲突」。

起草本提案时逐字复核，**我认为那个判定过头了**：待拍-1 释放的三类（无尽打磨 / Figma 级 / 炫技）都不覆盖弹性避让。真正影响它的是待拍-2（它的宿主 Page 模式在退役），而那是**归属问题不是存废问题**。

已在 CH-4 与 Q2 更正。**记在这里是因为分诊表是我自己的产出，而它被下游（本提案）用作依据 —— 依据错了要说，不能因为是自己写的就顺着用。**
