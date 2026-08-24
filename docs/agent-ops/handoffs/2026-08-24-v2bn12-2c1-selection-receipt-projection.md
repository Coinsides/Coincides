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

完成。施工与验收基线为 `399376a`；header 按 M-2 保持 `status: ready`，未由 builder 翻牌。

### 落点与边界

- 新增 `shared/types/selectionReceipt.ts`：定义 `SelectionReceiptV1`、`SelectionReceiptRefV1`、`SelectionReceiptTextRangeV1`。receipt 是将由 client 与后续 server 消费的边界 DTO，因此放在 shared；独立文件也避免把新契约塞进 client 私有类型或扩大既有 shared 聚合面的改动。
- 新增 `client/src/pages/Notes/canvasEngine/selectionReceiptProjection.ts`：唯一新职责是 `selectionDraftToReceipt(draft, { noteId })`。`noteId` 只取显式 envelope；ranges 按原顺序 1:1 投影；`textFlowId` 原样保留；空 ranges 返回 `null`；`at` 只读当前时钟。
- 新增同目录 `selectionReceiptProjection.test.ts`：常驻 K-1～K-4，其中 K-2 的递归 key 探针与阳性对照独立成例。
- `client/src/pages/Notes/canvasEngine/index.ts` 仅新增 projection 的 re-export，作为后续工具入参侧入口。
- 没有另造与既有 draft service 平行的 draft 状态机：receipt projector 消费 `SelectionDraftV1`，不改变 draft 的产生、phase 或 8 个既有消费路径；receipt 不是第四态。

产物 shape 为 `{ note_id, refs, text_ranges, at }`。`refs` 与 `text_ranges` 都保留 `{ blockId, textFlowId, textUnitId }`；`text_ranges` 另含 offsets 与 excerpt，且不携带 draft range 的运行时 `id`。投影逐字段新建对象和数组，不传播 `anchorRect`、phase、mode 或任何共享引用。

### K-1～K-5 单刀验红 / 恢复绿

- **K-1 投影正确**
  - 红：临时把 `note_id` 写死为 `note-hardcoded-k1-probe`；定点运行 K-1 得到 `AssertionError`，received 为硬编码值、expected 为显式入参 `note-explicit-1`。
  - 绿：恢复 `note_id: envelope.noteId` 后，同一命令 `1 passed / 4 skipped`。严格对象等值同时逐字段覆盖 note、两组三元组、offsets、excerpt 与冻结时钟的 `at`。
- **K-2 零几何**
  - 红：临时把 `anchorRect: draft.anchorRect` 带入 receipt；同一 K-2 运行中阳性对照先通过，receipt 断言随后以 `AssertionError` 命中 `$.anchorRect`、`.x`、`.y`、`.width`、`.height`。
  - 绿：恢复后 `2 passed / 3 skipped`；阳性对照与 receipt 零命中同时为绿。探针递归遍历数组/对象的全部 own keys，并归一化大小写及 `-`/`_`/空白。
- **K-3 空 ranges**
  - 红：临时返回空壳 receipt；定点运行得到 `AssertionError`（received 为 object，expected 为 `null`）。
  - 绿：恢复 `return null` 后 `1 passed / 4 skipped`。K-1 的非空输入成功产出 receipt 是对应阳性路径。
- **K-4 不共享引用**
  - 红：临时令 `text_ranges: draft.ranges`；双向 mutation 断言得到 `AssertionError`，原 draft 的 text 跟随 receipt 变为 `receipt-only-text`。
  - 绿：恢复逐字段 map 后 `1 passed / 4 skipped`。测试分别修改 receipt 与 draft 的嵌套字段、offset 和数组长度，另一侧均保持原值。
- **K-5 既有面零退化**
  - 红：在基线树定位出的真实消费者 `canvasEngine/layers/SelectionToolbarLayer.tsx` 临时加一行注释；Node `assert/strict` 对 9 个受保护文件的 `git diff --numstat 399376a` 得到 `AssertionError [ERR_ASSERTION]`，actual 为 `1\t0\tclient/src/pages/Notes/canvasEngine/layers/SelectionToolbarLayer.tsx`。
  - 绿：删除该注释后输出 `K-5 guarded diff empty (selectionDraftService + 8 consumers = 9/9)`；`textFocusReceipt.test.ts` 为 `2/2`，`smoke:canvas-engine-model-contract` 的 `60/60` 组全部通过。
  - 第二来源：逐文件比较工作树 `git hash-object` 与 `git rev-parse 399376a:<path>`，9/9 相等：`aa15fe7` selectionDraftService、`f70e71e` useSelectionDraftController、`893e8ad` NoteWritingSurfaceLayer、`f1ec5c5` TextBlockProjection、`f812cbe` BlockEditorLayer、`29de895` SelectionToolbarLayer、`967d220` SelectionTypographyToolbarLayer、`a2febe2` AnnotationContextMenuLayer、`b921271` annotationRenderService。

K-5 的接受证据使用上面真实 `canvasEngine/{hooks,blocks,layers}` 路径。一次 disposable inline Node 命令被 PowerShell 引号改写成 `SyntaxError`，已判为无效 harness 输出，未充当验红；有效单刀的红为上述 `AssertionError`，恢复后才取绿。临时 probe 文件已删除。

### 阴性结论的校准与第二来源

- **receipt 不含几何**：同一递归探针对故意嵌入的 `{ anchorRect: { x, width } }` 精确命中三条路径；独立来源是 K-1 的 `toStrictEqual` 完整 shape 与 shared DTO 的封闭字段清单共同同意零几何。
- **既有 draft 面零 diff**：真实消费者注释是阳性校准；独立来源是 9 个 baseline blob 与工作树 blob 的逐个等值，而不只依赖空 `--numstat`。
- **`server/**` 零产品改动**：同一 `git diff --numstat 399376a` 对本 handoff 在 Result 前命中 `117\t0`、最终命中 `181\t0`，证明探针可见非空；server 的 baseline tree 与 HEAD tree 均为 `d1117dcc93d39c4a99a03c24f1f3c1771a6fda5f`，且独立的 `git diff --raw HEAD -- server` 与 baseline server `--numstat` 均为空。porcelain 中 `server/src/routes/projections.ts` 的 stat/EOL 标记没有内容差异。
- **投影两侧不共享引用**：K-4 每个方向都先实际改变被操作一侧，再断言另一侧值与数组长度不变；另由投影源码的两个逐字段 object map 佐证。
- **表外略过申报：无**。阳性校准是工单表内两项仍明确列为 P2/P3（模糊输入矩阵、多轮自由巡猎）；执行清单与下方逐门收据逐项相符。本单没有把 TD-14、TD-6、TD-19/20、TD-16 宣称为已覆盖。

本单断言只以 shared DTO、client projector、定点测试和 git tree/blob 为依据；没有读取或假设 `server/src/services/items.ts` 的运行行为。锁、`owner.json` 与调度方 dev 服务均未触碰。

### 门禁逐条收据

- `npm.cmd run docs:check`：通过（施工前 docs-first）。
- `npm.cmd run verify:v2-bn8-runtime`：通过；Vitest `22 files / 218 tests`，client/server build、runtime/source/manifest/parity/docs/secret gates 全绿。仅有既有 dynamic-import 与 chunk-size warning。
- `client: npx.cmd tsc --noEmit`：通过。
- `server: npx.cmd tsc --noEmit`：通过。
- `npm.cmd run test:unit`：`22 files / 218 passed`。
- `server: npm.cmd run test:v2`：`270 passed / 0 failed`；按 TD-12 使用 OS temp `CANVAS_ASSET_DIR=C:\Users\70208\AppData\Local\Temp\coincides-c1-assets-6ed093f51a06491aa885640ea1bf4287`，未改测试或产品语义。
- `npm.cmd run test:tool-face-registry`：`4/4 passed`。
- `npm.cmd run test:tool-face-manifest`：`10/10 passed`。
- `npm.cmd run check:tool-face-manifest`：通过，artifact 未过期（2 entries / 2 public）。
- `npm.cmd run test:tool-face-parity`：`10/10 passed`。
- `npm.cmd run check:tool-face-parity`：通过（2 public entries checked；human reachability 仍按既有门声明未验证）。
- 写回后 `npm.cmd run docs:index`：通过，9 个 index 均“无变化”，写入 0 个文件；`npm.cmd run docs:check`：通过；`git diff --check`：通过（仅报告既有 LF→CRLF warning，无 whitespace error）。

Windows 执行策略阻止 `npm.ps1` / `npx.ps1` wrapper，因此最终门禁均通过对应 `.cmd` 入口执行；没有以修改测试或产品代码代偿环境问题。

### 触及面 vs 申报

本单代码触及严格为 4 处：3 个新增文件（shared type、client projector、colocated test）与 `canvasEngine/index.ts` 的 1 行导出；文档只向本 handoff 的既有 `## Result` 写回。未提交、未取调度方锁。工作树另有调度方/用户既存的 `.claude/settings.local.json`，以及 `useNoteCanvasRuntimeController.ts`、`SelectionToolbarLayer.tsx`、`server/src/routes/projections.ts` 的 stat/EOL porcelain 标记；它们不属于本单，内容 diff/受保护 blob 证据如上。

## Review

> reviewer: Codex reviewer（洁净室复核）
> review baseline: `c3708b4`（唯一 parent `978cc22`）
> verdict: **FAIL — 0 BLOCKER / 1 HIGH / 0 MED / 0 LOW**
> authority: 本节只给复核判定；header 未翻，放行权仍在 Fable。

### Finding

#### HIGH-1（业务正确性）— `text_ranges[].text` 投影的是整个 TextUnit，不是选区 excerpt

工单 S1/K-1 要求 `text_ranges` 携带 `offsets + excerpt`。当前真实数据链为：

1. `TextBlockProjection.tsx:1193` 把整个 `unit.text` 写入 `data-text-unit-text`；
2. `selectionRangeService.ts:155,165-171` 把该整段文本原样存入 `CapturedSelectionRange.text`，`startOffset/endOffset` 只标出其中的选区；同文件既有 annotation 投影在 `:61-73` 明确执行 `selection.text.slice(startOffset, endOffset)` 才得到范围文本；
3. 新投影 `selectionReceiptProjection.ts:25` 却直接写 `text: range.text`；
4. 新 K-1 fixture 在 `selectionReceiptProjection.test.ts:54-56,104-106` 对 `text='alpha beta'`、offsets `2..7` 仍期待完整 `alpha beta`，所以测试与实现一起把错误固化为绿。

独立动态复现：同一输入产出的 `actual="alpha beta"`，按 offsets 应得的 `expectedExcerpt="pha b"`。这会让后续 `resolve_selection` / Agent 收到未被用户选中的相邻文字，收据对手势的陈述失真；属于本单核心字段落位错误，不是 P2 畸形输入扩测。

建议修法：projector 以与既有 annotation 路径相同的 UTF-16 offset 语义写入 `range.text.slice(range.startOffset, range.endOffset)`，并把 K-1 第一段期望改为 `pha b`（保留第二段 `0..5 => gamma` 作为全段对照）。本 reviewer 未代修。

### R1–R8 复核收据

- **R1 / K-2 探针可信与零几何：PASS。**
  - 基线：专项测试 `5/5` 绿。
  - 探针失明单刀：在 `geometryKeyPaths()` 入口恒 `return []`；阳性对照以目标 `AssertionError` 红，received `[]`，expected 精确为 `$.payload[0].anchorRect` / `.x` / `.width`；恢复后该例 `1/1` 绿。
  - 几何泄漏单刀：向 receipt 加 `anchorRect: draft.anchorRect`；零几何断言以目标 `AssertionError` 红，实际命中 `$.anchorRect`、`.x`、`.y`、`.width`、`.height`；恢复后 K-2 阳性+阴性 `2/2` 绿。
  - 阴性第二来源：K-1 `toStrictEqual` 的完整 runtime shape 与 `SelectionReceiptV1` 封闭字段清单均同意无几何；不是只依赖空探针输出。
- **R2 / note envelope 与静态纯度：PASS。** 把 `note_id` 写死为 `note-hardcoded-r2-probe` 后，K-1 以目标 `AssertionError` 红（expected `note-explicit-1`）；恢复后 `1/1` 绿。CodeGraph 精确源码与独立 TypeScript AST 枚举共同确认：两个 import 均为 `type-only`，调用只有两个 `map` helper 与 `new Date().toISOString()`；没有 store / context / DOM / `localStorage` / `window` / `document` 读取。
- **R3 / 不共享引用：PASS。** 令 `text_ranges: draft.ranges` 直接复用数组和 range 对象；K-4 在真实双向 mutation 后以目标 `AssertionError` 红（draft 实收 `receipt-only-text`，应为 `alpha beta`），不是类型或多字段 shape 报错；恢复后 `1/1` 绿。
- **R4 / 空 ranges：PASS。** 把 `null` 改为空壳 `{ note_id, refs: [], text_ranges: [], at }`；K-3 以目标 `AssertionError` 红（received object，expected `null`）；恢复后 `1/1` 绿。
- **R5 / 既有面零退化：PASS。** `978cc22..c3708b4` 对 `selectionDraftService` + 8 consumers 的 `git diff --numstat` 为 0；第二来源为 9/9 双端 blob 相同：`aa15fe7b` / `f70e71ed` / `893e8ad1` / `f1ec5c55` / `f812cbe0` / `29de8952` / `967d2209` / `a2febe2c` / `b921271a`。`SelectionToolbarLayer.tsx` 工作树 blob=`HEAD` `29de8952` 且 numstat 0，确认只是 EOL 假阳性。全量 unit 中 `textFocusReceipt.test.ts 2/2`；verify 中 `SelectionDraft engine` 契约组通过（model contract `60/60`）。
- **R6 / 外层 shape：PASS；K-1 excerpt 语义：FAIL，见 HIGH-1。** `SelectionReceiptV1` 顶层恰为 `{ note_id, refs, text_ranges, at }`，无 geometry / `phase` / `mode`；owner 三元组在 `refs` 与 `text_ranges` 中均保留。外形正确不抵消 `text_ranges[].text` 的错误值。
- **R7 / 范围：PASS。** `server/**` numstat 为 0，且两端 server tree 均为 `d1117dcc93d39c4a99a03c24f1f3c1771a6fda5f`。`docs/agent-ops/**` 的递归 blob 对比只有本工单一处 delta，排除本工单后 numstat 为 0。实际 commit diff 仅申报的 5 文件、`+309/-0`；未读取或触碰 `server/src/services/items.ts`，未取锁、未写/删 `owner.json`，未干扰任何既有 PID/服务。
- **R8 / 门禁：PASS（按 docs-first 顺序亲跑）。** `docs:check` 通过；`verify:v2-bn8-runtime` 通过（含 unit `22 files / 218`、新专项 `5/5`、model contract `60/60`、双 build 与其余 runtime 门）；client/server `npx.cmd tsc --noEmit` 均 exit 0；独立 `test:unit` 为 `218/218`；隔离 `CANVAS_ASSET_DIR` 下 `test:v2` 为 `270/270`；五道 tool-face 依次为 registry `4/4`、manifest `10/10`、manifest check 通过（2 entries / 2 public）、parity `10/10`、parity check PASS（2 public）。

### Mutation / 环境卫生

所有单刀都在 OS temp 的独立 clone 上执行；client/server 依赖分别用 `npm ci --offline` 独立安装，没有 junction/symlink 指向共享 `node_modules`。末轮专项测试回到 `5/5`；隔离树 `git diff --numstat` 与 `--raw` 均为 0，projector/test 两个刀口的 clean-filter blob 均与 `c3708b4` 相同。删除前枚举 ReparsePoint 为 0，随后已删除隔离 clone；TD-12 asset 目录同样为 0 个 ReparsePoint、0 个文件后删除。共享 root/client/server `node_modules` 顶层计数删除前后保持 `2 / 153 / 187`。

### 结论

四组点名 mutation 与全部门禁证明护栏主体有效，但 K-1 对 excerpt 的常驻断言因错误 fixture 而“按错误理由通过”。在 HIGH-1 修复并补一条非全段选区的正确期望前，本单判 **FAIL**。
