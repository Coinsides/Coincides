> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-24 拍 12.2c 设计 v1 + 段计划 `baa5046`;c-1 可与 c-0 并行,c-0 已交付 `399376a`) | re: v2bn12-2c-1 | date: 2026-08-24

# V2.BN.12.2c-1:选区收据的客户端投影(纯值,零几何)

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> **本单是纯客户端投影** —— 不碰 server、不碰工具面。`resolve_selection`(c-2)是它的消费端,**不在本单**。

## 上游

- **selection 设计 v1**(`analysis/2026-08-21-selection-receipt-design.md`,2026-08-24 拍板)——裁定以它与段计划 §2 为准,**不重述**。
- 段计划 `plans/v2-bn12-2c-selection-receipts-and-resolve.md` **c-1 行 + §2 裁定 1/2/3 + §4 不做**。
- **c-0 核实报告**(`analysis/2026-08-24-c0-resolve-selection-server-paths.md`)—— 下方「实况」取自它,已亲验。

---

## 调度方已亲验的四条实况(**行号会漂,按符号定位**)

| # | 实况 |
|---|---|
| 1 | ⭐⭐ **`SelectionDraftV1` 不带 `note_id`**。它的字段是 `{ id, phase, mode, ranges, anchorRect, parentAnnotationId?, createdAt, updatedAt }`;`ranges` 是 `CapturedSelectionRange & { id }` = `{ blockId, textFlowId, textUnitId, startOffset, endOffset, text }` —— **整条链上没有 note_id**。⇒ **投影函数必须把 `noteId` 作为显式入参收进来,⛔ 不得自行发明查找路(去 store / 去 context / 去 DOM 摸)。** |
| 2 | **零长度守卫已存在于上游**:`createSelectionDraftRangeFromCapturedSelection`(`selectionDraftService.ts:67`)对 `start === end` 返回 `null` ⇒ **进到 draft 里的 range 已经非零长**。本单**复用这条前提,不重复实现**;但须处理 `draft.ranges` 为空数组的情形(见 K-3)。 |
| 3 | ⭐ **`textFlowId` 信息量为 0**:`textFlowIdForBlock(blockId) => \`textflow-${blockId}\``,全仓 5 个产地同一函数(c-0 §1 逐个核过)。⚠️ **但设计 v1 的 `refs` 明写 owner 三元组** ⇒ **本单原样保留三元组,⛔ 不得擅自去掉 textFlowId**。(是否精简是设计裁定,未拍。) |
| 4 | **`anchorRect` 是瞬时 UI 定位物**:产自 `TextBlockProjection.tsx:681` 的裸 `getBoundingClientRect()`,只被三个 UI 定位层消费,**从不是身份的一部分**(c-0 §2 / 前置核实报告 Q2)。⇒ 裁定②「零几何」不是取舍,是**它本来就不能持久化**。 |

---

## S1:shared 类型 `SelectionReceiptV1`

按设计 v1 §2 的身份构成:**`refs`(owner 三元组)+ `text_ranges`(offsets + excerpt)+ `at` + 信封 `note_id`**。

⛔ **不得含任何几何字段**(`anchorRect` / `rect` / `geometry` / `x` / `y` / `width` / `height` / `bounds` 等)—— **K-2 会把这条写成断言**。
⛔ **不得含 `phase` / `mode`** —— receipt 是导出的不可变快照,**不是 draft 的第四态**(裁定③)。

📌 类型放 `shared/types/**`(新增一处或并入既有,你定并在回执申报)——它将来要被 server 侧 c-2 消费,**必须在 shared 而不是 client 私有**。

## S2:投影函数 `selectionDraftToReceipt()`

**签名须显式收 `noteId`**(实况 1):

```ts
selectionDraftToReceipt(draft: SelectionDraftV1, envelope: { noteId: string }): SelectionReceiptV1 | null
```

- **纯函数**:同一输入产出等价输出;⛔ **不读 store / context / DOM / 时钟以外的任何外部状态**;
- `at` 取当前时刻(唯一允许的外部读);
- `draft.ranges` 为空 ⇒ 返回 `null`(与上游零长度守卫同族的「没有可投影的东西」);
- **深拷贝**:改动返回值不得影响原 draft,反之亦然(K-4)。

## S3:导出口

给工具入参侧一个取「当前选区收据」的出口(函数导出即可)。
⛔ **不做 UI** —— 「把收据递给 Agent 面板」归 12.2d/12.4(段计划 §4)。

---

## ⛔ 边界(**含 Fable 2026-08-24 点名的禁区**)

**允许**:新增 shared 类型 · 新增客户端投影模块(**放在 `selectionDraftService.ts` 旁,不改它**)· 新增单测 · 必要的导出口。

**⛔ 不得**:
- 改 `SelectionDraftV1` / `SelectionDraftPhase` 枚举 / **8 个既有消费者**(`useSelectionDraftController` · `NoteWritingSurfaceLayer` · `TextBlockProjection` · `BlockEditorLayer` · `SelectionToolbarLayer` · `SelectionTypographyToolbarLayer` · `AnnotationContextMenuLayer` · `annotationRenderService`)—— **一字不动**;
- 碰 `server/**` 任何文件(本单纯客户端);
- ⛔⭐ **碰 `server/src/services/items.ts`**(Fable 点名禁区:它含一处 INSERT 把 `pool_scope_kind` 写成 SQL 字面量、入参被忽略,修理属设计级工程,**整体推迟**);
- 碰 schema / migration / 注册表 / manifest / `docs/agent-ops/`(**唯一例外:向本工单追加 `## Result`**);
- 做几何 / 跨 note 选区 / 锚晋升 / 选区历史 UI。

**越界即停,标 `needs: claude`。**

---

## K 系 killer(**按新档:以下均为「对本单点名 killer 的单刀验红」= P1**)

| # | killer | 必红判据(**单刀,只对点名机关,⛔ 不自由巡猎、不多轮**) |
|---|---|---|
| **K-1** | **投影正确**:三元组 / offsets / excerpt / `note_id` / `at` 逐字段落位 | 令投影漏传 `noteId`(或写死常量)⇒ 红 |
| **K-2** ⭐ | **零几何**:对产出的 receipt **递归枚举所有 key**,断言不含几何名(`anchorRect`/`rect`/`geometry`/`bounds`/`x`/`y`/`width`/`height`) | 令投影把 `draft.anchorRect` 带进去 ⇒ **红**。⭐ **阳性对照必须有**:同一探针在**故意加了几何字段的对象**上要能命中 —— 否则「没找到几何」可能只是探针瞎了 |
| **K-3** | **空 ranges ⇒ `null`** | 令它对空 ranges 返回一个空壳 receipt ⇒ 红 |
| **K-4** | **不可变 / 不共享引用**:改返回值不影响原 draft;改原 draft 不影响已产出的 receipt | 把深拷贝改成浅引用 ⇒ **须在「改一边另一边跟着变」上红**,不只看类型 |
| **K-5** | **既有面零退化**:`SelectionDraftPhase` 枚举与 8 个消费者 `git diff --numstat` 为空;既有 `textFocusReceipt.test.ts` 与契约门 `testSelectionDraftEngine()` 仍绿 | 改动任一既有消费者 ⇒ 红 |

**红的性质**:目标 `AssertionError`,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;每刀独立恢复后再取绿。

---

## 📌 本单按新档(P0–P3)略过的东西(**成对写,略过项与它本来挡的东西同行**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| **投影入参的模糊测试矩阵**(超长 excerpt / 非法 offsets / 畸形 unicode / ranges 数量上限) | 「投影对畸形 draft 的容错」—— 现只测正常路径 + 空 ranges | P2 不扩 |
| **多轮 refute / 自由巡猎式 mutation** | 「除点名 killer 外的未知漏径」 | P3 停做 |

⇒ 调度方按此**在 `current-state/deferred-tests.md` 追指针行**。**回执无需重复台账,但若你实际又略过了本表之外的东西,必须在 Result 里点名。**

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14,**不得声称已强制**)· TD-6 · TD-19/20(**ownership 类 mutation 本档停做**,不得声称已验)· TD-16。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照(**K-2 是重灾区** —— 「没找到几何字段」与「探针没在看」输出相同);**确认命中不是来自你自己刚写进去的东西**。
⭐ **凡阴性结论(「不含」「没有」「零条」)至少要有第二个独立来源同意** —— 空集同时是「真的没有」和「我没看见」的合法输出。
⛔ ⭐ **本单任何断言不得以 `server/src/services/items.ts` 的行为为前提**(该文件是点名禁区,且其中一处 INSERT 的入参被忽略——以它为前提的断言会建在流沙上)。
**锁**:`.codex-tmp/builder.lock.d` 由发单方(opus)持有 —— **不取锁、不写 `owner.json`、不删锁**。
📌 dev 服务在 `:3001`/`:5173` 跑着(调度方所有,**⛔ 不要杀**)。
📌 porcelain 对 `useNoteCanvasRuntimeController.ts`、`projections.ts` 有 stat/EOL 假阳性(blob 等于 HEAD);判真改用 blob 哈希或 `--numstat`;`grep -c` 数**行数**不是**出现数**。
📌 **提交完整性**(单内指令):改了 handoff/文档就跑 `docs:index` 并**一起交**;生成件是 tracked 的 ` M`,不在 `??` 里;**门禁跑在工作树、提交的是暂存树,两者可以一绿一红**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → `test:v2` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:K-1…K-5 **各自**先红后绿两段输出(**K-2 须附阳性对照的输出**)· 类型放置位置与理由 · **8 个既有消费者 + phase 枚举 `git diff --numstat` 为空的证明** · `server/**` 零改动的证明 · 门禁逐条收据 · 触及面 diff vs 申报 · **每条阴性断言的阳性对照** · **若略过了「本单按新档略过」表之外的东西,点名申报**。

## Result
