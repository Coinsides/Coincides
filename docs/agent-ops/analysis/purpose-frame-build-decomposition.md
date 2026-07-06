> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State（Agent 分析 · 构建分解）
> **日期 (Updated)**: 2026-07-03
> **权威 (Authoritative)**: 构建顺序=是（作为 roadmap 重写的输入提案）；产品事实以 `PRODUCT.md` / current-state 为准
> **来源**：研究层 `docs/brainstorm/产品完善/会议记录/2026-07-02-...-Meeting-Notes.md`（07-02 脑暴）+ `2026-06-28` 源重建模型；本文是把那两份**压成"现在一个一个做什么"**的构建清单。

# 目的/圈模型 → 构建分解（把脑暴压成构建顺序）

> 目的：roadmap 重写**之前**，先定"当下要做什么"。本文不复述哲学（那在会议记录里），只做三件事：① 用今天实际 schema **翻实**脑暴的前提；② 画**依赖骨架**（什么挡什么）；③ 列**构建单元清单**（按就绪度排序）+ 荐第一刀。

---

## 0. 一句话模型（锚，读清单前先对齐）

```
item（member，标量：type+topic，内在、坐标无关）
  → 进「圈」（purpose-frame＝目的；给 role/fitness/序＝方向）成矢量
    → 渲染成 note（prose，锚回源，不回写）
```
- **圈 ≠ draft**（七.8 纠正）：圈是**常驻**的目的组织（durable，笔记生成完还在、可复用）；**draft = 把某圈渲染成可审半成品的瞬态提案**，点确认即化成正文。"目的草稿" = 圈的"产出笔记"那次用法。
- **一份笔记多目的 → 多圈 → 多图层**（复习一层/日常一层），底下 item 共享。
- **圈 = 局部知识图的 scope**（item=节点、relation=边、purpose-scoped）→ 打通 Relation 视图。

---

## 1. 现状翻实（grounded 2026-07-03，别基于旧旗标规划）

读了 `031_v2_content_groups` / `033_v2_content_group_members` / `020_v2_source_anchors`。对脑暴前提的翻实结论：

| 脑暴命题 | 现状实际 | 翻实结论 |
|---|---|---|
| `identity_role` 焊在 CG 节点（违铁律，待修） | `content_groups.identity_role` / `identity_topic` / `identity_summary` **全焊在 CG 节点**（031:21-23），identity_status/created_by/confidence 一套齐；**无 `identity_type` 列** | ✅ **确认**。role 焊死（该上边）；topic 焊死（按七.5续=可留 CG，OK）；**type 轴根本不存在**（现 role 一词兼"是什么+派什么用"）。 |
| member 是带缓存预览+source_ref+漂移追踪的指针 | `content_group_members` 已有 `order_index`（序）/`source_ref_json`+`content_range_json`（指针+range）/`source_sync_status`=fresh\|stale（**漂移追踪已在**）/`current_content`（工作副本）/`preview_text`（缓存预览） | ◐ **大半已在**。**缺**：① 边上无 `role`（角色在 CG 节点、不在"member-在-圈"边）；② **无冻结的「原文快照/收据」**（`current_content` 是工作副本，没有独立不可变的源快照）。 |
| 用户建 vs AI 建 = 一原语 + created_by | `content_groups.created_by`（human/ai）**已有**（031:18）；identity_created_by 也在 | ◐ **created_by 已在**；**缺** staging↔curated 状态轴（status 只 'active'）+ "后台库文件夹"落法。 |
| 圈/purpose-frame（目的层）第一等对象 | **不存在**。members 直属一个 `content_group_id`；无"目的"表、无"(member,圈,role,序)"边表 | ✗ **全新**。这是骨架缺的核心一块。 |
| CG 焊 course_id（该是 view-scope） | `content_groups.course_id NOT NULL`（031:11）+ `content_group_members.course_id NOT NULL` | ✅ 确认焊死。跨 note/项目要靠"圈=view-scope 不焊 course_id"解。 |
| CG 套 CG | `parent_group_id`（031:15）+ member kind 可 content_group | 已在。按脑暴：留给"真知识组合"、别当组织圈。 |
| **Source 结构未做、形态未定**（脑暴/Henry 口径） | **⚠ 对不上**：`020_v2_source_anchors` 已建整套 `source_anchors`（引 source_snapshots / snapshot_pages / documents / document_chunks / source_materials / source_fragments / material_segments）+ `source_anchor_links`（anchor→target、link_role）。即**已有一层丰富的源寻址+锚脚手架** | ⚠ **OPEN·必翻实**。要么这套是**转型前遗留**（像 annotation 父子那样 dead-vestigial），要么"Source 未做"指的是**抽取管线**未建而表已在。**这决定装配管线是 greenfield-blocked 还是能接现成。见 Tier 0。** |

**两条翻实判据**：
1. **role-weld = 确认真**（031:21）；且**缺 type 轴** → 构建单元 U1/U2 的前提坐实。
2. **Source/anchor 脚手架真实性 = OPEN** → 必须先查（020 及其引用的 source_snapshots/materials/chunks 系列表是 live 还是 vestigial），才能定装配管线是"从零设计"还是"接现成"。**这是 Tier 0 的头号活。**

---

## 2. 依赖骨架（Source 闸把一切切两半）

```
                          ┌─ Tier 0 翻实（Source 脚手架真实性 · role-weld 血溅面）
                          │
  不依赖 Source ──────────┤  Tier 1 骨架：U1 圈+边(role) · U2 CG→纯 bundling(+type轴) · U3 member 三真相/快照
  （可立刻做）             │             U4 词表池 · U5 圈=view-scope(不焊 course_id)
                          │                   │
                          │  Tier 2 视图：U6 软木板 · U7 大纲 · U8 关系图   （依赖 Tier 1，不依赖 Source）
                          │
  ══════ Source 契约闸（PI-048 双闸门：先立接缝、后浇混凝土）══════
                          │
  依赖 Source ────────────┤  Tier 3 装配：U9 Source 契约/结构（闸本身）→ U10 抽取 → U11 分块=源上建CG
  （blocked-on-Source）    │             → U12 provenance 锚 → U13 draft 装配 → U14 note 渲染
```
- **关键**：整个 Tier 1+2（骨架 + 视图）**不依赖 Source**，且 **U1 顺手修 role-weld 红线**。→ "现在能做且该做"的主战场在 Tier 1。
- **draft（目的草稿）本体属 Tier 3**（渲染半成品、锚回源），但 **draft = 圈的一次用法** → **U1 圈不建，draft 无从谈起**。所以"想做目的草稿"的正确第一步是先建圈（U1），不是直接冲 draft。

---

## 3. 构建单元清单（按就绪度排序 · 每单元=做什么/为什么/依赖/触及/红线）

### Tier 0 — 翻实前置（1 趟核查，便宜，定 Tier 3 形状）
| # | 做什么 | 产出 |
|---|---|---|
| **T0-a** | 查 `020_source_anchors` + `source_snapshots/materials/chunks/fragments/segments` 系列表**是否 live**（有无创建入口/消费点/生产调用，照 annotation 父子那套 dead-vestigial 判法） | 定论：Source 脚手架 = 可接现成 / 遗留待清 / 半成品。决定 U9 是"设计"还是"复活+补" |
| **T0-b** | 查 `identity_role` 的**消费面**（谁读它、渲染在哪、AI 用它做什么）——移到边表前的血溅面 | U1/U2 迁移清单 |

### Tier 1 — 骨架（不依赖 Source，可立刻做；U1 修红线）
| # | 单元 | 为什么现在 | 依赖 | 触及 |
|---|---|---|---|---|
| **U1** | **圈/purpose-frame 第一等对象**：节点 `{目的, 范围简述, 简介}` + **(member, 圈) 边表 `{role, fitness, order_index}`** | **keystone**——draft/视图/关系图全挂它；且 role 落到边=**修 identity_role 焊死红线**（相对不焊） | T0-b | 新 migration（purpose_frames + purpose_frame_members 边表）；role 从 content_groups 迁出 |
| **U2** | **CG → 纯 bundling**：member=item、CG="a group of content"；**"精华/理解单元"从 CG 挪到圈**；**新增 `type` 轴**（是什么，内在、在节点）、topic 留节点、role 离节点 | 三轴归位（type=是什么/topic=讲什么/role=派什么用），scope 可重划而 type/topic 不动 | U1 | content_groups schema（加 type、role 去焊）；identity_* 语义重划 |
| **U3** | **member 三份真相**：原文 / **原文快照（冻结引用副本=收据）** / member 本体（工作副本 `current_content`，改不回写原文） | 自足→改/合并/拆/删都坏不了；**收据随 item 走→跨 note/项目血统不丢**（治多源 CG 抹血统）；**为 cross-project 而设** | U1；**部分耦合 Source**（快照指向"原文"，今天原文=块/canvas 对象，Source 后=源 span） | content_group_members 加冻结快照列/表 |
| **U4** | **词表池**（type/topic/role）：起点空、grow-by-use、跨笔记共享累积、去重归并（松）、下拉为主、AI 提议人点头、单池+上下文排序 | 不预设样板（千人千面）又要复用/别每篇重建 | U2（type/topic）+U1（role） | 新表 vocab pool + 规范化/模糊匹配 + proposal 闸 |
| **U5** | **圈 = view-scope，不焊 course_id**：圈是视图 scope、可跨 note/项目；不被存储边界拥有 | 打通跨项目综合的地基（06-28 cluster C：local=视图 scope 非存储边界） | U1 | purpose_frames **不设 NOT NULL course_id**；跨项目圈住"无墙空间/家" |

### Tier 2 — 视图（依赖 Tier 1 骨架，不依赖 Source；"一份东西·多张脸"）
| # | 单元 | 说明 | 依赖 |
|---|---|---|---|
| **U6** | **软木板**（卡片拖排、空间/全局、Commit 落定） | draft 的一张脸；Scrivener 式"grow a book" | U1（圈边表带序） |
| **U7** | **大纲**（线性、可搜、找不到元素时的退路） | draft 另一张脸；与 U6 是同一份的两个视图（叉 B 已拍：都要） | U1 |
| **U8** | **关系图**（item=节点、relation=边、**purpose-scoped**） | Relation 视图归位到"目的"；**端点资格=向量**（进了目的+带 role 才够格连），跨目的连=新建装两端的目的 | U1（+U5 跨 scope） |
| 备 | 正文（A4/page）、画布（canvas）**已存在** → 接现有 page-vs-canvas 双视图；"AI 主导→成员自动渲染正文 / 人接管→直接改正文、AI 停自动盖"两态 | | |

### Tier 3 — 装配管线（BLOCKED on Source 契约；PI-048：先立接缝后浇）
| # | 单元 | 说明 | 依赖 |
|---|---|---|---|
| **U9** | **Source 契约/结构**（闸本身）：SourceArtifact（②忠实可寻址+bbox）+ SourceAnchor 形状 | **形状先定**；结合 T0-a 决定复用/清退 020 脚手架 | T0-a |
| **U10** | **抽取**（原始文档→干净 Markdown+可寻址②，Notion 式，机械、eager） | Agent 前、可 eager | U9 |
| **U11** | **分块 = 在源上建 CG**（有 chapter 跟走 / 没 chapter AI 通读派生 / 非线性散点收一块） | 分块本身就是建 CG；ContentGroup 是比 chapter 更一般的分块 | U9+U10+U2 |
| **U12** | **provenance 锚**（笔记 content_range ⟷ source range 双向链） | **抗幻觉+韧性**承重设计：有锚=搬来可查、无锚=生成→标红送审；块状可恢复 | U9 |
| **U13** | **draft 装配**（走大纲→逐节点：锚定搬运/改写源 span + 薄桥→有序 proto-note、status=proposal） | **"目的草稿"本体**；draft=圈的产出用法、化成正文、圈留下 | U1+U2+U12 |
| **U14** | **note 渲染**（prose、施加嗓音/风格、锚回源、不回写；内容源+风格源两配方） | 装配=一趟写作走查，单向不回写 | U13 |

### Tier X — 明确不做/延后（别膨胀）
- annotation 父子：**留着不投入**（vestigial·无害·会隐形；记忆 `annotation-hierarchy-is-vestigial`）。
- 反向流（手写→AI 事后归 CG，CG 当副产物）：框要能双向，但**非现在**。
- 目的间态射 / 事件内可复合透镜 / 环-域数学：**灵感层，不落数据模型**。
- 信任级别做成检索权重、AI-scratch CG 留存衰减：**待观察**（不主动删、靠检索天然只浮相关）。

---

## 4. 荐第一刀（若要动手，从这里）

1. **先 Tier 0 翻实**（半天核查）：定 Source 脚手架真实性（T0-a）+ role-weld 血溅面（T0-b）。**便宜、且防止基于错前提规划**。
2. **第一份 spec = U1 + U2 合并**（圈第一等对象 + 边表带 role + CG 纯化+type 轴）：
   - **为什么是它**：keystone，draft/软木板/大纲/关系图**全挂它**；**顺手修 identity_role 焊死红线**；**不依赖 Source**（member 今天就能指现有块/canvas 对象，Source 后再加一种 member kind）。
   - **"想做目的草稿"的人该先建圈**——draft 是圈的用法，圈不在 draft 无处落。
3. **再按价值挑 Tier 2 一张视图**（U6/U7 是 draft 的脸、U8 打通 Relation）或 **推进 Tier 3 的 U9 Source 契约**（若 T0-a 显示脚手架可接、且你想先通抗幻觉管线）。这一步等 Tier 1 落一半再定。

> **纪律**：U1/U2 是 schema 迁移 + 焊死解耦，属"接缝层"、可现在立；U12/U13（锚+draft，混凝土）**必须等 U9 Source 接缝**。别让"想要 draft"倒逼在没有 Source 形状时硬浇锚。

---

## 5. 待拍口子（spec 前 Henry 定）

1. **命名**：圈 / **Reading**（Henry 偏，代码有 ReadingInterpretation）/ purpose-frame（Henry 不喜）——口头继续"圈"，落库名待定。
2. **(member,圈) role 承载**：**新边表** `purpose_frame_members` vs **扩 `content_group_members` 加 role/purpose_id**？（影响 CG↔圈 是否同一张 membership。）
3. **T0-a 结果分叉**：020 Source 脚手架 = 复活接现成 / 当遗留清掉重设计 / 半成品补齐？
4. **Tier 顺序**：Tier 1 落完再上 Tier 2 视图，还是 U1 一到就并行做 U8 关系图（打通 Relation 的诱惑）？
5. **draft 形态**（Source-gated，暂不拍）：proto-note（偏）vs mega-ContentGroup。
6. 会议记录 §八 的 10 个未决（anchor 粒度多对一 / 锚定内容被编辑后断锚 / 逐节点配方持久性 / CG 粒度 / scratch 留存…）——多数落 Tier 3，随 U9 一起拍。

---

## 6. 翻实结果（grounded 2026-07-03 · 4-agent blast-radius map · wv45goujv）

把 §1 两个 OPEN 口子结成论，并**重排先后**。证据全是实读代码。

### 6.1 结论一（改变问题本身）：Source 不是"未做"，是 LIVE、端到端通的
- `source_anchors` 全套（documents → `parseDocument` 切 `document_chunks` → `source_materials/fragments/segments` 懒物化 → `generateSourceSnapshots` 出 `source_snapshot_pages` → `generateSourceAnchors` 出跳转锚 + `source_anchor_links`）**8 张表逐个 LIVE**：真实写入+消费路径、15 条路由挂载、客户端在用（CourseDetail.tsx / useNoteCanvasDataAdapter.ts）。**与 annotation 父子（有表无生产/消费）相反。**
- **推断（待 Henry 确认）**：脑暴口径"Source 未做、形态未定"应指**"从源装配一篇笔记"那个产品体验（锚定编排）未建**，而非**基础设施**未建——解析/切块/页快照/跳转锚这层**地基已在**。→ **T0-a 结案：Source 可"接着长"，不必从零设计**（除非 Henry 要推翻这套 v1）。
- **落点**：`note_block_sources`（migration 015:77-92）是一张**把三真相揉一起**的扁平行（`document_chunk_id`=活原文指针 + `source_excerpt`=冻结文本 + 页范围），写自 3 处（手动 note-block 引用 / AI organized-note proposals / composition templates）。member 快照完成 = 拆这张 + **复用已有的 `source_snapshots/source_snapshot_pages` 冻结原语**（别自造 snapshot_text）。**唯一要先验的技术风险**：现有 chunk/页寻址粒度够不够细当冻结收据锚点。

### 6.2 结论二：role-weld 确认 + 血溅面收敛
- `content_groups.identity_role` **确焊在节点**（031:21），且**服务端几乎不驱动任何东西**（纯 passthrough，无 AI/proposal 读它；content_group 也不是 domain-classification 目标）。
- 客户端角色焊在**单一干净接缝** `ContentGroupIdentityV1.role`：**1 个写入口**（`updateContentGroupIdentityDraft`）+ **~15 读点**（reading 投影 / 关系图投影 / 搜索索引 / rail / panel / gallery / 契约检查）。CG 全活在 service 层 + runtimeDataTypes.ts，`engineModel.ts` 零触及 → **血溅锁在 contentGroup* 几个文件 + 2 面板 + GroupGallery**。
- **member 早就是 item**（成员行上无 role）→ "CG 纯化成 bundling"节点侧**基本已是**。
- **铁证**：契约检查里 `identity.role === 'definition'`——'definition' 其实是 **type 值**，代码本身把 type 揉进了 role。type/role 拆分是真模型修复、非化妆。

### 6.3 结论三：改造 vs 推翻重来 —— 绝大多数改造，真推翻只两处
- **推翻①** `identity_role` 列：角色概念**离开节点**（数据迁到边、不丢；"概念推翻"非"数据推翻"）。
- **推翻②** gallery/rail 的**"按角色分组/排序"模式**（GroupGallery `role` mode / ContentGroupPanel role sort）：角色一旦 per-member，"按组的角色分组"**语义不成立** → 重想成"按 type 分组"。**要产品决策、非机械 rebind。**
- 其余全 rework-migrate/extend。**member 本体（current_content 工作副本）已做好**（可改、单向不回写、never write-back）——unaffected。
- **顺手可修**（Source-independent）：漂移检测是**死的**（`compareContentGroupMemberWithSource`/`refreshContentGroupMemberFromSource` **零调用**；唯一运行时写手 canvas 删对象写 `'stale'` 是**出枚举值、被 hydrate 强制回 'fresh'**）→ `source_sync_status` 实际恒 fresh。

### 6.4 重排后的先后裁决：➡ 目的先做（grounded）
- 目的/角色拆/加 type **完全不依赖 Source**、**顺手修红线**、血溅收敛、CG 纯化基本已是 → **先落**（U1+U2）。
- Source 已建 → member 快照完成是**"改造扩展 + 接现有基座"**（wire source_ref → source_snapshot_pages/chunks、复用冻结原语、唤醒 compare/refresh），**不是重建 Source**。
- **改 §4 荐第一刀**：Tier 0 的 T0-a（Source live/vestigial）**已由本次 map 结案=LIVE**；剩 T0-b（role 消费面）也已摸清（上 §6.2）→ **可直接进 U1+U2 spec**，无需再翻实。

### 6.5 Source 悬而未决 → 已结（2026-07-04）· 见专文
"活着的 Source 接着长 vs 换" **已拍**：接着长、但**现有基座太糙**（page-only / 可变 / 假页 → 接不了真原文快照），所以修订 §6.4 的"member 快照接现有基座"：
- **member 快照补全（U3）的前置 = 先立 Source 契约接缝**（`source_artifact/block` 表 + `SourceParser` 接口 + 锚改指 block）；
- **工具已选**：PaddleOCR-VL 1.6 主（本地开源中文榜一）+ MinerU 2.5 备，Mistral 只当可选逃生口；
- **目的层（U1/U2）仍第一、仍不被 Source 挡**；Source 契约接缝紧跟其后。
- **详见** `docs/agent-ops/analysis/source-reconstruction-design-and-tooling.md`（现状实锤 + 三层契约字段 + 工具对照 + 置信度纠错 UX 原则 + 修订先后）。

### 6.6 U4 词表池设计细化（topic/type 标签治理 · 2026-07-05）
**问题**：topic/type 若各 CG 自由生成，两个本该同标签的 CG 会因 hallucination 漂成不同字符串 → 按主题分组/检索失效。**解 = 共享词表池（U4），非预设目录。**
- **标签 = 共享实体，不是自由文本**：`content_groups.topic/type` 存**指向词表实体的引用（id）**，非复制字符串 → 同实体即同标签、漂移物理上不可能。
- **池 grow-by-use，起点空**（不预设分类目录 —— 那会洗成平均值）。
- **防漂机制 = 先搜池 → 优先复用 → 建时向量模糊匹配 → 松归并（人点头）**：挂标签前用 embedding 语义搜池，命中近似即复用；漏进的近似重复由归并闸机会性提示合并。**向量 = 池上可重建索引，标签实体才是真相**（接 GraphRAG-as-sidecar）。
- **平铺多标签、不强制层级**：一 CG 可挂多个 topic；层级作为标签间可选关系长出来，不必填。
- **scope = 用户全局（跨项目，接 U5 拆墙）**；**仅 topic/type 走这个稳定池**（内在轴）；**role 不走**（per-目的、住 (member,目的) 边上）。
- **落点**：新表 `topic_labels` / `type_labels`（或统一 `vocab_labels` + facet）+ CG 侧改存 label_id + 向量索引（sidecar）+ 归并 proposal。属 U4，依赖 U1/U2。详见会议记录 §七.11。
