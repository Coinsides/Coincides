> **状态 (Status)**: draft
> **层 (Layer)**: 契约 / Contract（**草案，待 Fable 抽检放行后转 `active`**）
> **日期 (Updated)**: 2026-08-20
> **权威 (Authoritative)**: 否（转正前不作为施工依据）
> **取代 (Supersedes)**: `docs/contracts/Notebook-Object-Inventory-Contract.md`（转正时整体冻结）
> **上游**: `PRODUCT.md` 06-29 设计语法 · 方向宪章 §4（表面重划）· `agent-ops/analysis/relation-item-graph-concept-design.md` v1.1（Item 教义）· 2026-07-15 会议卷 §三.1（生成层）

# Notebook 对象边界契约

## 0. 这份契约管什么 —— 也管它**不**装什么

**管**：每个对象**拥有哪一种真相**、彼此的边界在哪、什么绝不能混为一谈、什么是不变式。

**不装**：字段清单 · 表名 · 路由清单 · kind 清单 · 操作清单。

> **理由（07-15 §三.1「生成层」原话要义）**：**能派生的不手写，手写只留意图与为什么。** 事实面从代码生成，生成物没有过期问题。
>
> 旧件 `Notebook-Object-Inventory-Contract.md` 正是反例：859 行手写事实面，06-23 成文，07-13 打过一层教义横幅、08-19 又打第二层，**而正文仍是 V8 时代**。07-15 §二 Henry 亲自点名它时的判词是：**「横幅补丁救不了正文脱节」**。
>
> 手写事实面的半衰期约等于**下一次 migration**。本契约拒绝再生产一份。

---

## 1. 五真相与它们的边界

```text
TextFlow          内容真相      —— 自然书写的正文
ContentGroup/Item 知识真相      —— Item 是独立知识卡；ContentGroup 是 Item 的捆绑
Canvas            空间真相      —— 对象在哪、多大、怎么排
Source            出处真相      —— 原件 + 锚 + 摘录副本
Relation          语义真相      —— Item 之间的关系 + 判断收据
```

### 1.1 唯一结构律

> **相对于某个语境/目的的属性，必须与那个语境同住，绝不焊死到事物的内在身份上。**（`PRODUCT.md` 06-29）

把相对的焊到绝对的上面，会破坏复用、让语义跨语境泄漏、并让相对者篡夺绝对者。**本契约所有边界都是这条律的推论。**

### 1.2 三个永不合并的概念

```text
Link           = 导航      「去那儿」
SourceReference = 出处/证据 「这段内容凭什么这么说」
Relation        = 语义关系  「这两个 Item 有某种意义上的联系」
```

一个对象可以同时有这三样。**数据模型与 UI 都不得把它们塌缩成一个。**

### 1.3 Origin / Containment / Binding

```text
Origin      来自哪里    —— 不可变的出处事实，永远保留
Containment 被归在哪    —— 非排他：一物可同时归多处；删容器不删物
Binding     排他归属    —— ⚠️ 要避免的形状
```

**`Project` 是镜片，不是所有者。** 一个必填的 project-scope 所有者列（如作为强制所有权的 `course_id`）就是「把相对的镜片焊到绝对的身份上」的实例。

> ⚠️ **已知违例**：`source_anchors.course_id NOT NULL REFERENCES courses(id)`（见 `Source-Ladder-Contract.md` G-7）。处置随该契约的施工单。

---

## 2. 对象边界（意图，非字段）

| 对象 | 它拥有的真相 | 它**不**拥有 |
|---|---|---|
| **Project** | 镜片 / 成员关系 / 浏览边界 | 不拥有其中的内容。删 Project 不删知识 |
| **Note** | **唯一文档单位**（待拍-2） | 不拥有布局细节；不再是「一张画布 + 一个页框」的复合体 |
| **TextFlow** | 自然书写的内容真相 | 不拥有最终语义标签，不拥有关系真相 |
| **TextUnit** | 书写单元与书写角色（段落/标题/列表/引用/待办/折叠/代码行） | **书写角色 ≠ 知识类型**。「标题」是排版角色，不是「定义」这类知识判断 |
| **InlineStructure** | 行内渲染/交互锚点（行内公式、代码、链接、源标记） | 不拥有其所指对象的真相 |
| **ContentRange** | 位置真相（在 TextFlow / 源 / 画布对象里的稳定定位） | 不拥有它所圈内容的语义 |
| **AnnotationTruth** | 持久的标记/标签层 | 不是知识对象。⚠️ **父子层级是 pre-pivot 遗产，已被 ContentGroup 取代，不再投资** |
| **Item** | **知识真相**：可独立编辑的知识卡，有自己的正文、类型/主题、回指源的锚收据 | 不拥有它被用于何处（那是 Purpose 的事） |
| **ItemAnchor** | 锚收据（一表两态：原料池 + 已认领锚）+ 摘录副本 | **不拥有语义**（`Source-Ladder-Contract.md` A-2） |
| **ItemSnapshot** | 判断收据：判断作出那一刻的端点快照 | 不是版本历史，不是 diff |
| **ContentGroup** | **组织真相**：Item 与其他可溯成员的捆绑 | **不是关系端点**。不拥有成员的内容 |
| **GroupFolder** | 组织路径与浏览边界 | 不拥有 ContentGroup。删文件夹不删组 |
| **Purpose** | **情境真相**：意图 / 范围；成员边上挂 role / fitness / 序 | 不拥有成员本身。**收据不门禁；目的是特权层不是义务层；沉降不删除** |
| **Relation** | 语义真相：Item↔Item，附双端 Snapshot 判断收据 | **端点只能是 Item**。不是可视连线（那是 canvas 的 `visual_connector`，另一套真相） |
| **CanvasObject / Placement** | 空间真相：在哪、多大、怎么排、z 序 | **移动/缩放/对齐绝不改写内容、标注、出处、关系真相** |
| **PageFrame** | ⚠️ **已退役为「导出取景框」**（待拍-2）。Note 才是文档单位 | 不再是内容容器。**V12 期间机器不物理拆，新流面绕开而非拆除** |
| **SourceRecord / SourceFile** | 出处真相：不可变原件 + 全局身份 | 不属于任何单一 Project（Project 只是 placement） |

---

## 3. 跨对象不变式

| # | 不变式 |
|---|---|
| **I-1** | **布局操作永不改写内容真相。** 移动、缩放、对齐、重排只改 placement。 |
| **I-2** | **删容器不删内容。** 删 Project / Note / ContentGroup / GroupFolder **不得**删除 Item、Snapshot、Anchor 或 Relation 真相。 |
| **I-3** | **Relation 的端点只能是 Item。** 不是 block，不是 ContentRange，不是容器。原始范围是内容；要进入理解之图，必须先被铸成 Item。 |
| **I-4** | **至多一张出生证，任意多张会员卡。** 出生证是纯收据，**永不用于过滤**（V11 铁律；`origin_purpose_id` 即此）。 |
| **I-5** | **判断留收据。** 任何 AI 或人作出的语义判断，必须记下判断时刻的端点快照，使新鲜度可机械派生。 |
| **I-6** | **新鲜度是读时派生的，不是存储的状态。** 无持久 freshness 列、无后台 sweep。 |
| **I-7** | **Agent 能做的，人类必须 100% 能做。** 同门同钥，无后门。 |
| **I-8** | **新增 kind ＝ 注册一个三元组，核心零 if-kind。**（V2.BN.8.11.1.2 已落地的 kind-general 管线） |

---

## 4. 事实面：由代码生成，不在本契约

以下事实面**必须**从代码生成，写入 `docs/generated/`，**任何人不得手写**：

| 事实面 | 权威来源 | 当前规模 |
|---|---|---|
| 数据表清单与外键关系 | `server/src/db/schema.sql` + `migrations/` | 76 张表 |
| HTTP 路由清单 | `server/src/index.ts` 的 routes import | 48 个路由模块 |
| canvas object kinds | `server/src/services/canvasObjects.ts` 的 `KIND_HANDLERS`（`:1258`） | 随注册增长 |
| npm scripts / 验证门 | `package.json` | — |
| 契约测试与 check 脚本覆盖面 | `package.json` 的 `check:*` / `smoke:*` | — |

**生成物的规矩**：

1. 顶部必须写明「本文件由 `<script>` 生成，请勿手改」；
2. 状态头 `层 = 生成 / Generated`，`权威 = 是（事实面）`；
3. **生成物过期 = 脚本没跑，不是文档写错了** —— 这正是它优于手写的地方。

> ⚠️ **本契约不假装这件事已经做了。** 生成器**尚不存在**，见 §6。

---

## 5. 旧件逐条判定

| 旧节 | 判定 | 说明 |
|---|---|---|
| §0 Active Object Doctrine（以 Petal 为根） | ❌ **被取代** | Petal 已 11.1 停写 / 047 落表 / 11.7 物理清场 |
| §1 Root Model（`NoteCanvas → PageFrame → Block`） | ❌ **被取代** | 待拍-2：Note ＝ 唯一文档单位，PageFrame 退役为导出取景框 |
| §2–§6 Project / Note / NoteCanvas / PageFrame / FrameOutsideWorkspace | 🔶 **重写为 §2 边界表** | 概念存活，容器隐喻已换 |
| §7–§11 Block / TextFlow / TextUnit / TextUnitGroup / InlineStructure | 🔶 **部分** | TextFlow / TextUnit / InlineStructure 存活；`TextUnitGroup` 是 legacy range-helper，未再投资 |
| §12–§13 AnnotationTruth / DisplayState | 🔶 **降级存活** | 标记层仍现役，但**父子层级是 pre-pivot 遗产，不再投资** |
| §14 SelectionDraft | ✅ **存活并升级** | 宪章 §8 把它升格为**选区收据**——「还没保存的锚」，V12 必修③ |
| §15 ContentRange | ✅ 存活 | 位置真相 |
| §16–§19 GroupFolder / ContentGroup / Identity / Gallery | 🔶 **部分** | 组织语义存活；「ContentGroup 是关系端点」口径已被取代 |
| §17.1 Petal | ❌ **被取代** | 同上 |
| §20 AnnotationSet | ❌ **被取代** | 旧件自称历史/原型概念 |
| §21 ReadingInterpretation | ❌ **被取代** | 归 Agent 版（阅卷/评估岗位） |
| §22 Relation / ObjectRelation | ❌ **被取代** | 端点 ＝ Item；旧三表 047 已落 |
| §22（重号）Source And Provenance | 🔶 **移交** | 归 `Source-Ladder-Contract.md` |
| §23 User-Facing Translation | ✅ **存活** | 内部模型名 ↔ 用户可见语的对照仍有用 —— 建议随 V12 组件语言一并重做，**本契约不装** |
| §24 Synchronization Rules | 🔶 **部分** | 其中「删容器不删内容」等已升为 §3 不变式；其余属实现细节 |

> ⚠️ 旧件有**两个 §22**（Relation 与 Source 重号）—— 手写事实面失控的又一个征候。

---

## 6. 未闭环项（**请勿让它成为孤儿**）

**§4 的生成器尚不存在。** 本契约把事实面「交给代码生成」，但那个生成器还没有人写。

在它落地之前，本契约的 §4 只是一句承诺。**本仓已有两次同类前例**：

- 07-15 §三 拟定的 doc-map manifest + `check:doc-impact` —— 至今未落地（分诊表发现③）；
- `test:unit` 的常驻门接线 —— 直到二级复盘点出才立 TD-2。

**建议**：立一张最小工单 —— `scripts/docs-inventory.mjs`（只读，输出 `docs/generated/object-inventory.md`），并接入 `docs:index` 同一条线。**在它落地前，本契约不应转 `frozen`**（同 `Source-Ladder-Contract.md` D-4 的理由：不冻一个未被机器验证的形状）。

---

## 附：转正执行清单（草案期不执行）

1. 本文件状态头转 `active`（**非 `frozen`**，见 §6）。
2. `Notebook-Object-Inventory-Contract.md` 顶部加整体冻结公告、状态转 `archived`、`被取代` 指向本文件。
3. 更新指向旧件的引用（至少：`contracts/INDEX.md` 自动重生成；`AGENT_CONTEXT.md §7` 已知脱节表中该行改为「已处置」）。
4. 重跑 `node scripts/docs-index.mjs`。
5. 按 §6 立生成器工单，排单由 Fable 决定。
