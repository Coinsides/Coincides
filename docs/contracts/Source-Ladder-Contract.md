> **状态 (Status)**: draft
> **层 (Layer)**: 契约 / Contract（**草案，待 Fable 抽检放行；V2.BN.12 必修④ 要求本版定死后转 `frozen`**）
> **日期 (Updated)**: 2026-08-20
> **权威 (Authoritative)**: 否（转正前不作为施工依据）
> **取代 (Supersedes)**: `docs/contracts/Source-Reconstruction-Contract-Intake.md`（转正时整体冻结）
> **上游**: 方向宪章 `agent-ops/analysis/unified-direction-concept-design.md` §3（三层梯子）· `agent-ops/analysis/external-candidate-registry.md`（抽取矩阵，已核验）· 07-20 会议卷（多记坐标 / 窄腰 / 双 register）

# Source 三层梯子与锚契约

## 0. 为什么是重建而不是更正

旧件 `Source-Reconstruction-Contract-Intake.md`（2026-06-12，从 PI-048 提取）的**前提整个被换掉了**：

| | 旧契约 | 新宪章 §3 |
|---|---|---|
| 解析时机 | **入库即重建**：类型判断 → 区域重建 → 候选 → proposal | **解析按需，不入库即解析**；付费点后移至首次加工 |
| 锚的前置条件 | 必须先有 `SourceRegion`（即必须先解析） | **层1 区域锚不需解析** —— 划个红圈就能问 AI |
| 终点 | `NoteBlockCandidate` → 用户确认的 NoteBlock | 端点是 **Item**（V11 教义更替）；候选生成归 Agent 版 |
| 坐标模型 | 统一 `bbox` | **锚模型格式原生**：PDF=页+bbox / DOCX=元素路径+偏移 / XLSX=单元格地址 / PPTX=slide+形状偏移 |

旧件把「解析」放在「锚」的上游。新梯子把这条依赖**切断**了 —— 这不是措辞差异，是管线拓扑反转。逐条改无法保留一致性，故重建。

**旧件仍有的价值**：`kind` 词表、condensed raw source 的处理原则、adapter 不得覆写 canonical truth 的边界 —— 见 §8 逐条判定。

---

## 1. 本契约管什么

**管**：材料从进门到被引用的**三层阶梯**，以及每一层的真相形状与不变式 —— 尤其**锚的格式原生坐标契约**（V2.BN.12 必修④ 要求本版定死的那部分）。

**不管**：具体解析器选型（见登记册）· VLM 提示词与模型档位（Agent 版）· 笔记生成（Agent 版）· 阅读界面交互（体验层）。

---

## 2. 三层梯子

```text
层0  原件观看 —— hash + blob，零成本进门
     ├ 不解析。不抽取。不理解。
     └ 观看器全租（PDF.js / 浏览器原生 / 图片查看）

层1  原件 + 锚 —— 可圈选，可引用，可问 AI
     ├ ⭐ 不需要解析：区域锚是几何/地址事实，不是语义事实
     └ 锚坐标格式原生（§4）

层2  引用源 —— 窄腰解析，AI 加工基座
     ├ 按需触发：首次加工时才付解析成本
     └ 任意格式 → 一个前端映射 → 类型化组件流 + 阅读序 + 源坐标
```

### 2.1 三条阶梯不变式

| # | 不变式 | 为什么 |
|---|---|---|
| **L-1** | **层0 完整可用，不依赖层1/层2**。材料入库即可观看，永不因解析失败而不可读。 | 原件是冷证据。解析是可重跑的机器，锚 schema 是不可逆地基（07-20 拍定） |
| **L-2** | **层1 不依赖层2**。建锚**不得**要求先有解析产物。 | 宪章 §3 原话：「区域锚不需解析，即可划红圈问 AI」。这是整条梯子的承重点 |
| **L-3** | **层2 可重跑、可丢弃、可换后端**。解析产物是**派生物**，永不是真相。 | 解析器会换（登记册结论：按格式配抽取器）。派生物重算的代价必须永远低于锚失效的代价 |

> **L-2 的反面就是旧契约的死因。** 一旦允许「先解析才能锚」，付费点就被拖回入库时刻，且解析失败＝材料不可引用。

---

## 3. 层0 契约（本版定死）

### 3.1 已落地部分（V2.BN.10.1–10.2，migration 045）

`source_records` / `source_files` / `source_materializations` / `source_project_placements` 已存在并满足层0 要求：

- **身份全局**：Source identity 是用户级全局的，Project 只是 placement 镜片（与 `PRODUCT.md` 06-29「Project 是镜片不是所有者」同律）。
- **原件不可变**：server 权威 SHA-256、staging→ready blob 提交、hash 去重跨 Project 复用。
- **Origin 是保留的收据**，不是所有权。

**本契约确认上述形状为层0 契约，冻结。**

### 3.2 本版须补（施工输入）

| # | 缺口 | 要求 |
|---|---|---|
| **L0-a** | 摄入收据（run receipt） | 宪章 §12「现在就埋的两根线」之一：窄腰契约须写死摄入收据。每次入库/解析留 `{工具, 版本, 入参, 耗时, 结果摘要, 时刻}` |
| **L0-b** | 格式能力矩阵落库 | 每个 `source_record` 应能回答「本格式支持到梯子第几层」（观看 / 锚 / 解析），供界面决定给什么入口 |

---

## 4. 层1 锚契约 —— **本契约的核心，也是当前最大缺口**

### 4.1 现状盘点（已核对代码，非推测）

`item_anchors` 表已存在（V2.BN.11.3），字段含 `target_kind` / `target_id` / `range_json` / `source_record_id`。**但**：

```text
ItemAnchorTargetKind = 'block' | 'content_range' | 'canvas_object'
                     | 'table_region' | 'image_region'
                                    ↑
              五种全部是「笔记侧」目标。没有任何一种是「源侧」目标。
```

（`server/src/services/items.ts:6-11`；validator 同枚举 `server/src/validators/index.ts:554-560`）

并且 `range_json` 的校验是 `jsonObjectSchema.nullable()` —— **完全无类型**（`validators/index.ts:567`）。

**结论：层1「不解析也能在原件上划红圈」目前在 schema 层没有落点。** `source_record_id` 只是一张出处收据，你无法用有类型的方式表达「这个锚指向那份 PDF 的第 7 页、bbox = [x,y,w,h]」。

**这正是 V2.BN.12 必修④「层0 schema 与窄腰契约本版定死」要填的洞。**

### 4.2 新增源侧 target kind（本契约提案）

```text
source_page_region     页面型格式的矩形区域   （PDF / 扫描件 / 图片）
source_element_range   流式格式的元素路径+偏移 （DOCX / HTML / Markdown）
source_cell_range      网格型格式的单元格区间 （XLSX / CSV）
source_slide_region    幻灯片的形状/坐标      （PPTX）
```

四类**对应四种坐标系**，不强行统一 —— 这是 07-20 拍定的「多记坐标」：**按格式各记各的坐标系**。

### 4.3 `range_json` 的类型化契约（**按 target_kind 判别的联合类型**）

```text
source_page_region:
  { page_index, page_label?, rect: {x, y, w, h}, unit: 'pdf_pt' | 'px', rotation? }

source_element_range:
  { element_path, start_offset, end_offset, path_scheme: 'docx_body' | 'dom_xpath' | 'md_ast' }

source_cell_range:
  { sheet, anchor: 'A1', to?: 'C9' }

source_slide_region:
  { slide_index, shape_id?, rect: {x, y, w, h}, unit: 'emu' }
```

**不变式**：

| # | 不变式 |
|---|---|
| **A-1** | `range_json` 的形状由 `target_kind` **判别式决定**，不再是自由 JSON。用 discriminated union 校验（仓内已有先例：canvas object validator 的 `discriminatedUnion`） |
| **A-2** | **锚不含语义**。`kind`（paragraph / formula / table …）是**层2 的判断**，不得写进层1 锚 —— 否则层1 又依赖解析，违反 L-2 |
| **A-3** | **锚不可变**。位置改变＝新锚 + 旧锚降级，不是原地改坐标。判断收据的可信度依赖这条 |
| **A-4** | **摘录副本随锚保存**（`excerpt` 已有）。原件可能消失、解析可能变，摘录是最后一道诚实降级 |
| **A-5** | 单位必须显式（`unit`）。PDF pt / 像素 / EMU 混用而不标单位是坐标类 bug 的头号来源 |

### 4.4 层1 的能力边界

**层1 能做**：在原件上圈一块 → 得到一条锚 → 把「这块 + 我的问题」交给 AI（图像/区域裁切即可，无需文字层）。
**层1 不能做**：知道那块是公式还是表格 · 提取其文字 · 跨页合并阅读序 —— 这些都要层2。

---

## 5. 层2 窄腰契约

```text
任意格式（PDF / DOCX / 扫描 / 图片 / 外来 HTML）
        ↓ 一个前端映射（唯一入口，不是每格式一条管线）
类型化组件流 + 阅读序 + 源坐标
```

### 5.1 不变式

| # | 不变式 | 为什么 |
|---|---|---|
| **N-1** | **窄腰只有一个出口形状**。新增格式＝新增一个前端映射，**不得**新增下游形状 | 下游（阅读面/AI 加工/引用）只认一种结构，否则每加一种格式炸一次下游 |
| **N-2** | **每个组件必须携带回指层1 锚的坐标**。解析产物与原件之间永远可对位 | 没有源坐标的解析产物无法回溯，等于生成了一份孤儿文本 |
| **N-3** | **外来 JS 永不执行**（导入侧）。外来 HTML 只取结构不取行为 | 宪章 §3 明令。请求出身不同待遇不同 |
| **N-4** | 层2 产物带**摄入收据**（工具 + 版本 + 时刻），可据此判断是否需要重跑 | 换解析器后要能识别哪些产物是旧工具产的 |
| **N-5** | 解析**按需触发**，不在入库时 | 付费点后移（宪章 §3） |

### 5.2 与已落地实现的关系

V2.BN.10.3 已落地 `source-artifact.v1` 瞬态格式 + PDF/DOCX/TXT/Markdown/图片 parser registry + 原子 SourceProjection 发布。**本契约不推翻它** —— 它是窄腰的**第一版实现**。本契约要求的是：
1. 其出口形状按 N-1 收敛并**定死**（当前是 `source-artifact.v1`，需确认是否已满足 N-2 的源坐标要求）；
2. 补 N-4 摄入收据；
3. 触发时机按 N-5 从「入库即跑」改为「按需」。

> ⚠️ **待核**：`source-artifact.v1` 当前是否为每个组件携带源坐标（N-2）。若否，这是 V12 必修④ 的主要施工量。**本项须在转正前由施工侧核实**，我未逐行核 10.3 的实现。

### 5.3 抽取矩阵（登记册已核验，此处只引不改）

| 格式 | 机械道 | 锚模型 |
|---|---|---|
| PDF | **pdf.js**（Apache-2.0，Node 原生，每文字项带 transform 坐标 + 页码） | 页 + bbox |
| DOCX | **mammoth.js**（BSD-2） | 元素路径 + 偏移（DOCX 是流式格式，**无真页面几何**） |
| XLSX | **SheetJS** | 单元格地址（天然是锚） |
| PPTX | JSZip + XML | slide + EMU 偏移 |
| 长尾 | Kreuzberg | 🔍 **坐标输出未文档化，1 天 spike 前置，未验证不得采纳** |
| — | MarkItDown | ⚠️ **锚测不合格**（无页码无坐标），只当快速预览件，不当骨干 |

**架构结论（登记册原文）**：无单件同时满足多格式 + 结构 + 坐标 + Node 原生 ⇒ **按格式配 Node 原生机械抽取器，统一写进我们自己的层0 schema —— 锚契约我们 own。**

---

## 6. 双 register 不变式（07-20，继续生效）

```text
矿场（引用源）   采收优先，修正显式    —— 引用源页面永不长成第二个笔记编辑器
花园（笔记）     创作自由
```

**层2 产物住矿场。** 用户可在其上圈选、锚定、铸卡，但**不可原地自由编辑**。要改，就铸成 Item 进花园。

---

## 7. 红线

1. **Agent 能做的，人类必须 100% 能做** —— 人可手工建锚、手工圈区域、手工触发解析。
2. **解析器是 adapter，不是真相**。任何抽取器都不得直接写 canonical truth；它们产出的是层2 派生物与候选。
3. **不入库即解析**。
4. **锚不含语义**（A-2）。

---

## 8. 旧契约逐条判定

| 旧节 | 判定 | 说明 |
|---|---|---|
| §1 边界（reconstruction ≠ note generation） | ✅ **存活** | 仍是正确的边界，且被宪章 §3「层2 是 AI 加工基座，不是成品」加强 |
| §2 `SourceTypeDetection` 格式清单 | ✅ **存活**（作为格式能力矩阵的输入，见 L0-b） | 清单本身仍准 |
| §2 `SourceRegion` 字段表 | 🔶 **拆分** | 其几何字段（page/bbox）→ 层1 锚（§4，且改为格式原生）；其语义字段（kind/text/latex/confidence）→ 层2 组件流（§5）。**旧件把两者混在一张表里，正是 L-2 违反的根源** |
| §2 `NoteBlockCandidate` | ❌ **被取代** | 端点已改为 Item（V11）；候选生成归 Agent 版（宪章 §10 岗位十席） |
| §3 Chunking 顺序（detection → region → chunk → candidate → proposal） | ❌ **被取代** | 该链条整体前移到解析时刻，违反 N-5；且它强制「锚在解析之后」，违反 L-2 |
| §3「禁止跳过 SourceRegion 直接写 NoteBlock truth」 | ✅ **存活**（换词） | 现表述：解析产物是派生物，永不是真相（L-3 + 红线 2） |
| §4 Adapter 边界 | ✅ **存活** | 「adapter 不得覆写 canonical truth」仍是红线；其中 AFFiNE/BlockSuite 一行已随 ADR-0001 自研引擎失效 |
| §5 Condensed Raw Source 处理原则 | ✅ **存活并加强** | 「不默认 aggressive summarization / 保留手写与图像证据 / 不把人类整理过的信息当未加工 textbook」—— 与宪章 §11「AI 笔记＝缩短是错方向」「教学装置不可删」同源。**建议原文搬运进本契约**，见待决 D-3 |
| §6 后续影响（PI-048 待答问题） | 🔶 **部分** | 多数已由登记册回答；剩「手写 STEM 如何评估」「公式/表格保真」仍开放，归 Agent 版层2 VLM |

---

## 9. 与现有实现的差距清单（施工输入）

| # | 差距 | 落点 |
|---|---|---|
| G-1 | `ItemAnchorTargetKind` 无源侧类型 | 加 §4.2 四类 |
| G-2 | `range_json` 无类型契约 | 按 §4.3 改 discriminated union 校验 |
| G-3 | 摄入收据未埋 | L0-a + N-4 |
| G-4 | 解析触发时机为入库即跑 | 改按需（N-5） |
| G-5 | `source-artifact.v1` 是否满足 N-2 源坐标 | **待核**（§5.2） |
| G-6 | 格式能力矩阵未落库 | L0-b |

> **G-7（记档，不在本契约处置）**：`source_anchors` 表（migration 020）在 `server/src` 中**无任何非-migration 读写方** —— 与 V11 清掉的 `object_relations / canvas_edges / relation_layers` 同类，是 v2 时代建了但 BN 线从未采用的死表。建议按同一先例走「活性盘点 → 落表」。**不在本单决定**，因为物理拆除属自限清单里的不可回滚动作。

---

## 10. 待决（转正前请 Fable 裁）

| # | 问题 | 我的倾向 |
|---|---|---|
| **D-1** | 源侧 anchor 是扩 `item_anchors` 的 `target_kind`，还是**另立** `source_anchors_v2` 表？ | **扩现表**。锚是同一概念的不同目标；分表会让「一个 Item 同时锚到笔记和原件」变成跨表查询，且 `item_anchors` 的 pool/claim 机制正好复用 |
| **D-2** | 层1 锚的**图像裁切**是即时生成还是持久化？ | **即时生成 + 可选缓存**。裁切是从原件 + 坐标可重算的派生物（L-3），持久化它等于给不可变原件做冗余副本 |
| **D-3** | 旧件 §5 Condensed Raw Source 处理原则是否原文搬进本契约？ | **搬**。它是全旧件里唯一与新宪章 §11 学习闭环直接同源的一节，留在冻结件里会被遗忘 |
| **D-4** | 本契约转 `frozen` 的时机 | 建议 **G-1/G-2 施工落地后**再冻。契约先于实现冻结，会冻出一个没被代码验证过的形状 |

---

## 附：转正执行清单（草案期不执行）

1. 本文件状态头转 `draft → active`（**非 `frozen`**，见 D-4）。
2. `Source-Reconstruction-Contract-Intake.md` 顶部加冻结公告、状态转 `archived`、`被取代` 指向本文件；按 D-3 裁定决定是否先搬 §5 原文。
3. `contracts/INDEX.md` 由脚本重生成（`node scripts/docs-index.mjs`）。
4. 若 Fable 认可 §4，则本契约的 G-1/G-2 应成为 **V2.BN.12 必修④ 的施工单交付物**。
