> **状态 (Status)**: active（体验测试单 · Claude 工作区，持续追加）
> **层 (Layer)**: 现状 / Current-State（分析）
> **日期 (Updated)**: 2026-06-30
> **权威 (Authoritative)**: 否（dogfood 评估视角）

# Project → Note 体验测试单

> **这是什么**：以真实 STEM 学生的姿态，用 `browser-harness` 走 **project → note 这条线**及线上会发生的大部分事，记录①**流程问题**（中途的卡顿/困惑/死路/无反馈/丢状态）②**功能优化**（能用但可更好、缺的顺手 affordance）。
>
> **跟挖坑登记册（`canvas-object-review-issue-register.md`）的区别 —— 重要**：
> - 那本册是**缺陷/坑**，目标是收口后照单烧。
> - **本单不一样**：照列**不照修**。很多是功能性增补、加起来麻烦，而我们**还在铺地基**——所以**不强求这版就修**，但"不修 ≠ 不找"。本单是产品成熟度的待办蓄水池，日后按价值排期。
>
> **范围**：只走 project→note 线；**完全不测 AI 那边**（旧版 X 的 Agent，与新线无关，未做）。真库 + 测试账号（数据后会清）。
>
> **记录格式**：每条 `EX-S{场景}-{NN}`；摩擦度 🔴高（真会让人停下/丢东西/找不到）｜🟡中｜🟢低（小别扭）；桶 `flow`（流程问题）｜`opt`（功能优化）。若与挖坑册某条同源，标 `↔ CR-x.x.x`。

## 图例
- **摩擦度**：🔴 高｜🟡 中｜🟢 低
- **桶**：`flow`（流程卡点/死路/无反馈）｜`opt`（功能优化/缺 affordance）

## 汇总
| 场景 | 🔴 | 🟡 | 🟢 | 小计 |
|---|---|---|---|---|
| S0 进入/登录 | 0 | 0 | 0 | 0 ✅ |
| S1 项目层 | 0 | 0 | 1 | 1 |
| S2 项目→建笔记 | 0 | 1 | 1 | 2 |
| S3 笔记正文(TextFlow/Page) | 0 | 2 | 1 | 3 |
| S4 结构化/组织 | — | — | — | 待续 |
| S5 Canvas 空间层 | 0 | 6 | 0 | 6 |
| S6 再进入/导航/持久化 | — | — | — | 待续 |
| S7 跨切面 | — | — | — | 待续 |
| Agent 视角(建/读) | 0 | 0 | 2 | 2 |
| **合计(截至本轮)** | **0** | **9** | **5** | **14** |

## 走查进度
- ☐ S0 进入 / 登录 / 落地
- ☐ S1 项目层（项目列表 / 建项目 / 进项目）
- ☐ S2 项目 → 建笔记
- ☐ S3 笔记正文（TextFlow：标题/段落/列表/todo/公式/代码/链接、split/merge/indent、annotation、undo）
- ☐ S4 结构化 / 组织（ContentGroup Rail/Gallery/Single、标题层级、toggle）
- ☐ S5 Canvas 空间层（切 Canvas、页框、建 shape/sticky/table/image、move/resize、inspector、切回 Page）
- ☐ S6 再进入 / 导航 / 持久化（离开再回、刷新、找回笔记、状态是否留住）
- ☐ S7 跨切面（快捷键、空状态、错误/加载反馈、视觉一致性、"我在哪/怎么回去"）

---

> **方法说明**：登录态已存在(直接进 Home)；用户视角=`browser-harness` 驱动 UI；**Agent 视角=用 note-block / projection API 直接建/读**(Henry 拍板：这正是真 Agent 的数据路径)。文章=Wikipedia Gradient Descent 改写(19 块：标题/段落/列表)。**完全不测 AI 功能**。

## S0 — 进入 / 登录 / 落地
- ✅ 登录持久、直落 Home 仪表盘(Today's Minimum / 心情 / Must-Recommended-Optional / SRS),无摩擦。

## S1 — 项目层
- ✅ 建项目流畅:弹窗(名/短码/颜色/优先级/描述/学期)+ toast 确认 + 卡片/侧栏/RECENT 三处同步出现。
- **EX-S1-01** 🟢 `opt` 项目卡有 Sources/Tags/Edit 但**无显式"打开/进入"按钮**——进项目靠点标题(可发现性小别扭)。三个建项目入口(右上按钮/虚线卡/侧栏+)略冗余。

## S2 — 项目 → 建笔记
- ✅ "New Note" **一键即建即开**(无命名弹窗),快。
- **EX-S2-01** 🟡 `flow` 新笔记是 **"Untitled note" 且无命名引导**,灌满内容后**仍叫 Untitled**→ 无标题笔记会堆积、日后难找回(直接撞 S6 findability)。建议建后引导命名或用首个 heading 自动兜底标题。
- **EX-S2-02** 🟢 `opt`(数据模型/Agent)`block_type` 是**粗枚举**(heading/paragraph/…),`list`/`bullet`/`todo`/`toggle`/`code`/`text` 作为 block_type **全被 400 拒**;列表性只由 unit 的 `writing_role` 携带。Agent 写块须知:bullet 用 `block_type:"paragraph"` + `writing_role:"bullet_item"`。文档/契约该讲清这层,否则 Agent 易踩 400。

## S3 — 笔记正文（TextFlow / Page mode）
- **EX-S3-01** 🟡 `flow` 空笔记录入要**双击一个小提示按钮 "Double-click to start writing"**——单击/直接打字都不开始写。非常规、低可发现性(代码层确认:`onActivateDraft` 只挂在 prompt 的 onDoubleClick + page-space 的 onDoubleClick 且 `target===currentTarget`)。〔注:我的合成事件难复刻,真人鼠标无碍——此条侧重"双击才启"这一交互本身〕
- **EX-S3-02** 🟡 `flow/pit` **空/中止的 draft 会持久化成空块**:我误触留下的空 paragraph 块,API 实证 `content_json.body=""`+空 text unit、status active。↔ **CR-8.11.4-08**(空文本残留喂 AI)——**体验侧实证 live**。
- **EX-S3-03** 🟢 `opt` 列表项的项目符号渲染成淡淡的"_"/短横,而非清晰 bullet glyph(cosmetic)。
- 〔texture〕TextFlow 自定义编辑器(textarea+overlay、draft textarea 按需挂载且失焦即卸)对**程序化输入很抗拒**——与"Agent 经 UI 编辑"相关(但真 Agent 走数据 API,见下)。

## S4 — 结构化 / 组织
- 〔本轮未深入;Groups rail 入口在右侧,待续〕

## S5 — Canvas 空间层

> **⏸ 分阶段·暂不优化（Henry 2026-06-30 明确）**:以下多为**用户友好化**问题。"现在是铺地基,还没建完,不到优化它们的时候。"照列**不照修**。其中数条 Henry 亲述,等于产品负责人侧的权威确认。

- **EX-S5-01** 🟡 `flow` Layout 模式下建画布对象要右键**空白画布**,但文字满页的笔记几乎无可达空白;右键命中内容只出**块菜单**;**无常驻"插入对象"affordance**。↔ CR-8.11.3-04 / -8.11.5-09。
- **EX-S5-02** 🟡 `opt`（Henry 亲述）**模式割裂、笨重**:必须切 **Canvas mode 才能建**图形、切 **Layout mode 才能自由摆放/拖动位置**——不开 Layout 连图形位置都改不了、拖不动。Henry 自评"很垃圾"但地基期**不得不暂留**(否则失去摆放能力)。
- **EX-S5-03** 🟡 `feature-gap`（Henry 亲述）**表格只是雏形**:不能自定义行列数(建时选几行几列)。↔ 与 CR-8.11.8 一族(table v1 工程入口)。
- **EX-S5-04** 🟡 `feature-gap`（Henry 亲述）**shape 不能改形状**(矩形/圆形…),只能改大小。
- **EX-S5-05** 🟡 `pit`（Henry 亲述）**视觉连接线两端点默认锁死在两图形的正中心**,无锚点选择 → 线穿过形体而非贴边。↔ **CR-8.11.6-06**（anchor 仅 center,我工程扫描已登记,体验侧 Henry 独立印证）。
- **EX-S5-06** 🟡 `pit`（Henry 亲述）**图片缩太小露"打底画框"**:缩到很小时底下能看到一个小画框/打底图,效果像"矩形里嵌一张小图"而非纯图片。视觉 bug。
- 〔方法注〕图形对象我**没经 UI 放进去**——UI 图形操作对合成事件抗拒,且 Henry 判断这块当前不值得花精力测(用户友好化、地基期)。故未跑"block-backed shape → AI 快照泄漏"实验(若日后要验 CR-8.11.4-01,可经 API 单独做)。

## S6 — 再进入 / 导航 / 持久化
- 〔待续:离开再回 / 刷新 / 找回笔记 / 状态留存(尤其验那几条数据丢失坑:页框 margins、表格编辑)〕

## S7 — 跨切面
- 〔待续〕

---

## Agent 视角（建 / 读）—— 本轮最大收获
- ✅ **Agent 建(经 note-block API)→ 用户见 = 忠实**:19 块结构化文章(标题/段落/列表)在 UI 里**完整正确渲染**(标题粗体、段落、bullet 带符号)。**"Agent 能编辑的人也能编辑"在"建"的方向成立**。
- ✅ **Agent 读(`buildSnapshotFromNote`，POST /api/projections + source_note_id)→ 忠实单一**:返回 `{blocks:[19]}`,与用户所见一致;**纯文本笔记下无双源、无泄漏**(因尚无 backing 块)。
- **EX-AG-01** 🟢 `pit` **order_index 单调泄漏**:增删块后 order_index 从 14 起跳、永不压缩(`COALESCE(MAX,−1)+1`)。今 cosmetic、但无界增长。↔ **CR-8.11.4-13**。
- **EX-AG-02** 🟢 `improve` `POST /api/projections` 建探针快照会**持久化一条 projection 记录**,且 `DELETE /api/projections/:id` 返回 **404**(无删除端点)→ 探针/临时快照无法清理、projection 表只增不减。〔我留下了一条探针 projection,测试数据,待清〕
- **待续**:加图形(尤其 block-backed shape)后再读 `buildSnapshotFromNote`,实测 **CR-8.11.4-01**(隐藏 backing 块泄进 AI 快照)与 **CR-8.11.3-01**(双源)在真实内容下是否显形——这是 Agent 视角最该撞的两条 AI 层 HIGH。

## 与挖坑册的交叉（体验里撞到的、已登记缺陷）
- **EX-S3-02 ↔ CR-8.11.4-08**（空 draft → 空块持久化、喂 AI）：**体验侧实证 live**。
- **EX-S5-01 ↔ CR-8.11.3-04 / CR-8.11.5-09**（建对象可发现性差）。
- **EX-S5-05 ↔ CR-8.11.6-06**（连接线端点仅 center）：**工程扫描 + 体验(Henry 亲述)双向印证**——这类"扫描与体验都撞上"的最该排前。
- **EX-AG-01 ↔ CR-8.11.4-13**（order_index 槽泄漏）。

## 价值排期建议（走查完填）
> **分桶(对齐 Henry 的分阶段)**:
> - **🅰 地基-正确性(与"建完"相关,值得现在/近线看)**:EX-S3-02(空块喂 AI·实证 CR-8.11.4-08)、EX-AG-01/02(order_index 泄漏 / projection 无删除端点)、EX-S2-02(block_type 枚举 Agent 易踩)。这些是**数据/契约正确性**,不是友好化。
> - **🅱 用户友好化(Henry 明确暂不优化,地基建完再说)**:EX-S5-02~06(模式割裂 / 表格雏形 / shape 不改形 / 连接线 center / 图片缩小露框)、EX-S2-01(无标题笔记)、EX-S3-01(双击才启)、EX-S3-03(bullet 符号)。**照列存档,不强求这版修**。
> - **双向印证、性价比最高**:EX-S5-05 ↔ CR-8.11.6-06。
