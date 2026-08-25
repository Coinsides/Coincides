> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-24 裁「采 A + 三配套」log #6 `4d3ba81`;设计稿已订正到 v1.1 §1) | re: v2bn12-2c-1-fix | date: 2026-08-24

# V2.BN.12.2c-1-fix:`excerpt` 是切片,不是整段

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> **纯客户端 + shared 类型。** 不碰 server、不碰工具面。

## 上游 —— 本单为什么存在

c-1 复核判 **FAIL 0B/1H/0M/0L**,唯一 **HIGH-1**:

> `text_ranges[].text` 投影的是**整个 TextUnit**,不是选区 excerpt。

**三条独立证据(调度方已复验)**:
1. `selectionRangeForTextUnit`(`TextBlockProjection.tsx`)造 range 时 `startOffset: 0, endOffset: unit.text.length, text: unit.text`;
2. 右键菜单产地用 `textarea.selectionStart/End` 做 offsets,**text 仍取整段**;
3. ⭐ `createSelectionDraftRangeFromCapturedSelection` 把 **`textLength: selection.text.length`** 传给 `normalizeSelectionOffsets` —— **它把 `text` 当作 offsets 索引进去的那个「全文」**。若 text 是摘录,这个夹取就错了。

⇒ **`CapturedSelectionRange.text` 是整个 unit 的文本,offsets 是它上面的窗口。**

### ⚠️ 定性:**不是 builder 的错,是设计稿前提写错了**

设计稿 v1 §1 原文曾写「`text_ranges` **原样继承 `CapturedSelectionRange` 含摘录**」—— 而**该类型不含摘录**。builder 照「原样继承」做,复核照「含摘录」判,**两边都忠于稿子,而稿子自相矛盾**。
**设计稿已订正到 v1.1 §1**(Fable),本单据 v1.1 施工。

---

## S1:三处改动(Fable 裁定 ①②③)

1. **切片**:`excerpt = range.text.slice(startOffset, endOffset)`。
2. **字段更名 `text` → `excerpt`**(`SelectionReceiptTextRangeV1`)。
   📌 **现在零消费者,是改名最便宜的时刻**;更名后任何「原样继承」式的错误假设**直接编译不过,而不是静默地对**。
3. **不变式**:`excerpt.length === endOffset - startOffset` —— 本单写进**测试**(c-2 的 zod 另加 refine,不在本单)。

⛔ **不采 B**(不同时带整段+摘录):模糊重定位是锚时代的能力,**不预先养肥值类型**——要原料时锚时代自己捕获。
⛔ **不采 C**(不维持整段):邻句改一字就报 drift 会让 `resolve_selection` 失信。

---

## ⭐ S2:按**鉴别力分则**重造 K-1 的 fixture(本单的方法论要点)

**原 K-1 的 fixture 用的是整段选区(offsets `0..len`)** ⇒ 此时 **摘录 == 整段,逐字相同** ⇒ **该断言在两种实现下都绿**,对「投影的到底是什么」**零证明力**。

**本单要求**:

- fixture 必须是 **部分选区 + 非零起点**(如 `startOffset: 3, endOffset: 9`,unit 文本更长);
- 断言 **`excerpt === text.slice(start, end)`** **且** **`excerpt !== 整段 unit 文本`**;
- ⭐ **该 fixture 下这两个值必须不同** —— 请在测试里**显式断言它们不同**(`expect(whole).not.toBe(excerpt)`),否则将来有人改窄 fixture 时不会有人发现。

📌 **写死一句给后来者**:**fixture 须使两假设可区分** —— 探针要先证明**看得见**,fixture 要先证明**分得开**。

---

## K 系 killer(**均为「对本单点名 killer 的单刀验红」= P1;⛔ 单刀、只对点名机关、不自由巡猎、不多轮**)

| # | killer | 必红判据 |
|---|---|---|
| **K-1'** ⭐⭐ | **excerpt 是切片**:部分选区 fixture 下,`excerpt === text.slice(s,e)` 且 `!== 整段` | 令投影退回 `excerpt: range.text`(整段)⇒ **须红**。⭐ **必须在新 fixture 下红** —— 若换回整段选区 fixture 它就不红了,那正是本单要消灭的形状 |
| **K-2'** | **fixture 自身有鉴别力**:显式断言 `整段 !== excerpt` | 令 fixture 退回整段选区(`0..len`)⇒ **该断言须红**(证明 fixture 真的分得开,不是碰巧) |
| **K-3'** | **不变式**:`excerpt.length === endOffset - startOffset` | 令切片用错边界(如 `slice(start)` 到底)⇒ 须红 |
| **K-4'** | **更名彻底**:`SelectionReceiptTextRangeV1` 上**无** `text` 字段,只有 `excerpt` | 保留 `text` 别名 ⇒ 须红(递归 key 探针断言,**配阳性对照**) |
| **K-5'** | **c-1 既有护栏未退化**:K-2 零几何 / K-3 空 ranges ⇒ null / K-4 不共享引用 **仍绿**,且各自的阳性对照仍在 | 删任一既有断言 ⇒ 红 |

**红的性质**:目标 `AssertionError`,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;每刀独立恢复后再取绿。

---

## 边界

**允许**:改 `shared/types/selectionReceipt.ts`(字段更名)· 改 `client/src/pages/Notes/canvasEngine/selectionReceiptProjection.ts`(切片)· 改同目录 `selectionReceiptProjection.test.ts`(fixture 重造 + 新断言)。

**⛔ 不得**:碰 `server/**` 任何文件 · 碰 `SelectionDraftV1` / `SelectionDraftPhase` 枚举 / **8 个既有消费者** · 碰 `server/src/services/items.ts`(点名禁区)· 改 schema/migration/注册表/manifest · 碰 `docs/agent-ops/`(**唯一例外:向本工单追加 `## Result`**)· 做几何 / 跨 note 选区 / 锚晋升。

**越界即停,标 `needs: claude`。**

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| **切片边界的模糊矩阵**(负 offset / 超长 offset / 代理对与组合字形的 UTF-16 切分 / RTL) | 「切片对畸形或非 BMP 文本的行为」—— 现只测常规部分选区 | P2 不扩 |
| **多轮 refute / 自由巡猎** | 「点名 killer 之外的未知漏径」 | P3 停做 |

⇒ 调度方按此在 `current-state/deferred-tests.md` 追指针行。**若你实际又略过了本表之外的东西,必须在 Result 里点名。**
📌 ⚠️ **UTF-16 那条值得你在 Result 里留一句观感**(不必测):`slice` 按 code unit 切,遇到 emoji/组合字形可能切裂 —— **本档不处理,但请申报你是否观察到该风险**,以便台账记得准。

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14)· TD-6 · TD-19/20 · TD-16。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照;**确认命中不是来自你自己刚写进去的东西**。
⭐ **凡阴性结论至少要有第二个独立来源同意** —— 空集同时是「真的没有」和「我没看见」的合法输出。
⭐ **fixture 须使两假设可区分**(本单的核心方法论,见 S2)。
📌 **已知 EOL 假阳性共三个**:`useNoteCanvasRuntimeController.ts` · `server/src/routes/projections.ts` · **`SelectionToolbarLayer.tsx`**(第三个是 2026-08-24 新确认)⇒ **判真改用 blob 哈希或 `--numstat`,不要用 porcelain**。
📌 **PID 8292 的 codex.exe 是 Henry 的 Codex 桌面应用**(`app-server`,非 exec)—— ⛔ **不得杀、不得干扰**。
**锁**:`.codex-tmp/builder.lock.d` 由发单方(opus)持有 —— **不取锁、不写 `owner.json`、不删锁**。
📌 **提交完整性**(单内指令):改了文档就跑 `docs:index` 并一起交;生成件是 tracked 的 ` M`,不在 `??` 里;**门禁跑在工作树、提交的是暂存树,两者可以一绿一红**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit` → `test:v2` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:K-1'…K-5' **各自**先红后绿两段输出(**K-1' 须证明它在新 fixture 下红、并说明换回整段 fixture 会不红**;**K-4' 须附阳性对照**)· fixture 的具体取值(证明部分选区、非零起点、两值确实不同)· `server/**` 与 8 消费者零改动的证明 · UTF-16 切分风险的观感一句 · 门禁逐条收据 · **每条阴性断言的阳性对照** · **若略过了「本单按新档略过」表之外的东西,点名申报**。

## Result

完成。施工代码基线为 `c3708b4`；当前 HEAD `4d3ba81` 是它的直接子提交且只含本次裁定文档。header 按 M-2 保持 `status: ready`，未由 builder 翻牌。

### 落点与 fixture

- `shared/types/selectionReceipt.ts`：`SelectionReceiptTextRangeV1.text` 更名为 `excerpt`。
- `client/src/pages/Notes/canvasEngine/selectionReceiptProjection.ts`：唯一值投影改为 `excerpt: range.text.slice(range.startOffset, range.endOffset)`；没有新增状态、store、查找路或平行机关。
- 同目录 `selectionReceiptProjection.test.ts`：把第一条 range 明确重造为 whole=`0123456789abcdef`（length `16`）、offsets=`3..9`、excerpt=`345678`（length `6`）。第二条 `gamma / 0..5` 保留作整段对照。
- fixture 常驻断言同时证明：`excerpt === whole.slice(3, 9)`、`whole !== excerpt`、`excerpt.length === 9 - 3`。因此两种投影假设在夹具上可区分，而不是碰巧同值。
- 字段更名时 CodeGraph blast radius 与 Git 源码枚举两源均只找到 shared 类型、projector 与专项测试；生产侧没有调用者。client/server 双 `tsc --noEmit` 均 exit `0`，没有消费者迁移。

没有改 `SelectionDraftV1` / phase、8 个既有消费者、barrel export、server、schema、migration、registry 或 manifest。

### K-1'～K-4' 单刀验红 / 恢复绿

- **K-1' — 切片而非整段**
  - 红：只把 projector 临时退回 `excerpt: range.text`；定点运行 `npx.cmd vitest run ... -t "K-1'"` 得 `1 failed / 8 skipped`，目标 `AssertionError`：expected `345678`，received `0123456789abcdef`。
  - 绿：恢复双边界 `slice(startOffset, endOffset)` 后，同一定点例 `1 passed / 8 skipped`；最终专项 `9/9`。
  - ⭐ 若 fixture 换回整段 `0..16`，则 `whole.slice(0, 16) === whole`，错误实现与正确实现逐字相同，**K-1' 就不会红**。这正是本单消灭的 fixture 形状；没有再做这组无鉴别力运行。
- **K-2' — fixture 自身有鉴别力**
  - 红：只把 fixture 临时退回 `0..whole.length`，并令 expected excerpt 同为 whole；定点例得到目标 `AssertionError: expected '0123456789abcdef' not to be '0123456789abcdef'`，失败点正是 `whole !== excerpt`，不是语法或模块错误。
  - 绿：恢复 `3..9` 后 `1 passed / 8 skipped`；`expectedExcerpt === '345678'` 是先行阳性对照，随后才断言与 whole 不同。
- **K-3' — 长度不变式**
  - 红：只把切片右边界临时删掉为 `slice(startOffset)`；定点例得到目标 `AssertionError: expected 13 to be 6`。
  - 绿：恢复 `slice(startOffset, endOffset)` 后 `1 passed / 8 skipped`；最终两条 range 均满足 `excerpt.length === endOffset - startOffset`。
- **K-4' — 只有 `excerpt`，无 `text` 别名**
  - 红：只向 runtime 投影临时加回 `text: range.text`；递归 key 探针先让阳性对照通过，再以目标 `AssertionError` 命中 `$.text_ranges[0].text` 与 `[1].text`，输出 `1 passed / 1 failed / 7 skipped`。
  - 绿：移除别名后同组 `2 passed / 7 skipped`。阳性对照对象同时含 `{ excerpt, text }`，探针分别命中精确路径；receipt 侧命中两条 `excerpt` 路径、`text` 路径为空。
  - 第二来源：CodeGraph 只见 `SelectionReceiptTextRangeV1` 自身及 projector 内部；`git grep` 的 receipt `.text` access 为 `EMPTY`，而同一 grep 对 `.excerpt` 命中 7 处测试访问；双 tsc 同意。

每刀均独立恢复后再取绿。最初三条 harness 调用输出未被采用：一次 root-relative filter 得 `No test files found`；一次嵌套 npm 未正确转发 `-t`，误跑全文件并混入 `TypeError`；一次 inline Node 被 PowerShell 引号改写成 `SyntaxError`。有效证据随后统一改用 client 目录下 `npx.cmd vitest` 与临时文件式 Node guard，所有有效红均为点名的 `AssertionError`；临时 guard 已删除。

### K-5' — c-1 既有护栏未退化

- **断言存在性单刀**：临时 guard 枚举 K-2 几何阳性/阴性、K-3 空 ranges、K-4 双向 mutation 阳性与隔离断言共 `7/7`。只删除既有 K-3 `toBeNull()` 断言后，guard 以 `AssertionError [ERR_ASSERTION]: missing empty-null` 红；恢复后重新 `7/7` 绿。枚举式 guard 意味着任一登记 marker 缺失都会走同一失败路径；按 P1 只亲刀一条，不做多轮删除巡猎。
- **K-2 零几何**：临时把 `draft.anchorRect` 投影进 receipt；阳性对照先绿，阴性例以 `AssertionError` 命中 `$.anchorRect/.x/.y/.width/.height`（`1 passed / 1 failed`）。恢复后两例 `2/2`。
- **K-3 空 ranges ⇒ null**：临时返回空壳 receipt；同一运行中 K-1' 非空阳性路径先绿，K-3 以 `AssertionError`（received object, expected null）红。恢复后两例 `2/2`。
- **K-4 不共享引用**：临时令 `text_ranges: draft.ranges`；真实 push 后原 draft 长度随之从 2 变 3，隔离断言以 `AssertionError` 红。恢复逐字段 map 后 `1/1`。常驻测试新增显式阳性对照，先证明 receipt 侧和 draft 侧各自 mutation 确实发生，再断言另一侧的字段与数组长度不变。
- 最终专项 `selectionReceiptProjection.test.ts` 为 `9/9`，全量 unit 中 `textFocusReceipt.test.ts` 为 `2/2`，runtime 的 `SelectionDraft engine` 契约组通过（model contract `60/60`）。

### 边界与阴性校准

- `SelectionDraftService`（含 `SelectionDraftV1` / phase）+ 8 个点名消费者相对 `c3708b4` 的 `git diff --numstat` 为空；逐个 clean-filter blob 为 `9/9` 相同：`aa15fe7b / f70e71ed / 893e8ad1 / f1ec5c55 / f812cbe0 / 29de8952 / 967d2209 / a2febe2c / b921271a`。
- `server/**` 相对基线的 `--numstat` 与 `--raw` 均为空；baseline 与 HEAD server tree 同为 `d1117dcc93d39c4a99a03c24f1f3c1771a6fda5f`。点名禁区 `server/src/services/items.ts` 的 baseline/work blob 均为 `1d3280afd61f05208caa58634b02e40ce54a3957`。
- 上述空 diff 的阳性校准：同一 `git diff --numstat c3708b4` 对本单三个允许源码文件明确命中 `99/14`、`1/1`、`1/1`；不是探针失明。blob 比对是第二来源。
- 三个已知 EOL 假阳性按 clean-filter blob 判真，均与 HEAD 相同：`useNoteCanvasRuntimeController.ts=3efe5f82`、`server/src/routes/projections.ts=561902a4`、`SelectionToolbarLayer.tsx=29de8952`；未拿 porcelain 作结论。
- 本单开始前真实既存工作树差异为调度方的 `docs/agent-ops/INDEX.md`、旧 c-1 handoff Review，以及未跟踪 `.claude/settings.local.json` 与本修正工单；全部保留。本单只改三个允许源码文件，并向本工单的既有 `## Result` 写回。
- 锁目录由发单方持有：未取锁、未读写 `owner.json`、未删锁；未查询、终止或干扰 PID 8292 / 既有服务。

### UTF-16 风险与降档申报

已观察并确认风险：JavaScript `slice` 按 UTF-16 code unit 切；若 offsets 落在 surrogate pair 或组合字形内部，可能切裂 emoji / grapheme。它正属本单表列的 P2 模糊边界矩阵，本档不处理、不扩测。

表外略过申报：**无**。本单仅按工单表略过 P2 的畸形/Unicode/RTL 边界矩阵，以及 P3 多轮 refute / 自由巡猎；没有声称清偿 TD-14、TD-6、TD-19/20、TD-16。

### 门禁逐条收据

- `npm.cmd run docs:check`：通过（docs-first）。
- `npm.cmd run verify:v2-bn8-runtime`：通过；unit `22 files / 222 tests`，本专项 `9/9`，canvas boundary `159` checks，model contract `60/60`，client/server build、runtime/source/docs/secret/tool-face 门均绿；仅既有 Vite dynamic-import / chunk-size warning。
- client `npx.cmd tsc --noEmit`：exit `0`。
- server `npx.cmd tsc --noEmit`：exit `0`。
- `npm.cmd run test:unit`：`22 files / 222 passed`。
- server `npm.cmd run test:v2`：隔离 `CANVAS_ASSET_DIR` 下 `270 passed / 0 failed`；目录末态 0 项、0 reparse point，随后已非递归删除。
- `test:tool-face-registry`：`4/4 passed`。
- `test:tool-face-manifest`：`10/10 passed`。
- `check:tool-face-manifest`：通过（2 entries / 2 public，artifact 未过期）。
- `test:tool-face-parity`：`10/10 passed`。
- `check:tool-face-parity`：PASS（2 public entries；仍按既有门声明 human reachability not verified / journey pending）。

### 写回后复核

- `npm.cmd run docs:index`：通过；9 个 INDEX 全部“无变化”，写入 `0` 个文件。
- `npm.cmd run docs:check`：通过。
- `git diff --check`：exit `0`；只有工单已登记的 LF→CRLF warning，无 whitespace error。
- 工单文件用 strict UTF-8 decoder 复读通过；首行仍为原 `status: ready(...)` header，未翻牌。

## Review

> reviewer: Codex reviewer（洁净室增量复核）
> review baseline: `4d3ba81` → `602d0a0`（前一施工基线 `c3708b4` 仅作连续 blob 对照）
> date: 2026-08-24

### 判定

**FAIL（方向成立）— 0 BLOCKER / 1 HIGH / 0 MED / 0 LOW。**

切片实现、`text` → `excerpt` 更名、长度不变式、R2–R7 均成立；唯一 HIGH 是 **R1-② 的反事实鉴别力证明被 K-1' 自己的重复断言污染**。本报告只作复核判定，放行权仍在 Fable。

### HIGH-1 — K-1' 混入 fixture 自证断言，旧 fixture 下“同一投影刀不红”无法成立

**性质：认识论错误 / 回归护栏鉴别力。** 生产实现不是本条缺陷；缺陷在测试职责耦合。

- 当前 K-1' 在 `selectionReceiptProjection.test.ts:125` 先做完整投影等值，在 `:159-161` 再做 `excerpt === whole.slice(start,end)`；这两处足以检出“投影退回整段”。
- 但 K-1' 又在 `:162` 断言 `excerpt !== whole`。同一 fixture 自证职责已经由 K-2' `:168-176` 单独承担（其中还显式断言 `startOffset > 0`）。
- 亲刀 1（新 fixture 保持 `whole=0123456789abcdef / 3..9 / excerpt=345678`，只把投影改成 `excerpt: range.text`）：K-1' `1 failed / 8 skipped`，目标 `AssertionError` 在 `:125`；expected `345678`，received `0123456789abcdef`。**这一半正确。**
- 亲刀 2（按 R1-② 把 fixture 改成 `0..16 / excerpt=whole`，再施完全相同的投影刀）：工单要求 K-1' 不红，实际仍为 `1 failed / 8 skipped`；目标 `AssertionError` 落在 `:162`：`expected '0123456789abcdef' not to be '0123456789abcdef'`。前面的 strict-equal 与 slice 等式已通过，说明投影刀本身确实被整段 fixture 隐掉；红来自混入 K-1' 的 fixture 断言。
- 因而当前测试能证明“新 fixture 下会红”，却不能按点名验法证明“旧 fixture 对同一投影刀确实无鉴别力”。R1 明定两步缺一不可，故定 HIGH。

**建议修法：**只从 K-1' 移除 `:162` 的 `excerpt !== whole`；该断言保留在 K-2'。随后重跑：partial fixture + 整段投影 ⇒ K-1' 红；`0..len` fixture + 同一投影 ⇒ K-1' 绿；`0..len` fixture ⇒ K-2' 红。无需改生产投影或 shared 类型。

证据口径补注：直接父提交 `4d3ba81` 的第一条 range 字面值其实是 `alpha beta / 2..7`，第二条 `gamma / 0..5` 才是整段。上述 `0..len` 是严格执行本复核单点名的反事实，不冒充对父提交 fixture 的逐字还原；不另行分级。

### R2–R5

- **R2 PASS。** 常驻 fixture 精确为 whole length `16`、offsets `3..9`、excerpt `345678`；K-2' 显式断言 `whole !== excerpt`、`startOffset > 0`（并有 `endOffset < whole.length`）。只把 fixture 改成 `0..16` 后，K-2' 在 `:173` 以目标 `AssertionError` 红；恢复后专项全绿。
- **R3 PASS。** 投影为 `range.text.slice(range.startOffset, range.endOffset)`；K-3' 对每条 range 断言 `excerpt.length === endOffset - startOffset`。只改成 `slice(startOffset)` 后，在 `:182` 以目标 `AssertionError: expected 13 to be 6` 红；恢复后绿。
- **R4 PASS。** `SelectionReceiptTextRangeV1` 只有 `excerpt: string`，投影也只发 `excerpt`。同时给 interface 与 runtime 投影加回 `text` 别名后，K-4' 阳性对照先绿，实际收据探针在 `:199` 以目标 `AssertionError` 红并报出 `$.text_ranges[0].text`、`[1].text`；输出为 `1 passed / 1 failed / 7 skipped`。第二来源：CodeGraph blast radius 只列 shared 类型与 projector；Git 源码枚举只见 shared 类型、projector、专项测试，receipt `.text` access 为空，而 `.excerpt` 命中为阳性校准。双 `tsc` 同意。
- **R5 PASS。** 恢复态专项 `9/9`。K-2 零几何的递归探针阳性对照仍先检出 `anchorRect/x/width`；K-3 空 ranges ⇒ `null`；K-4 双向引用隔离在断言另一侧稳定前，先证明 receipt 侧和 draft 侧 mutation 各自确实发生。

所有有效 killer 红均为点名 `AssertionError`，没有把 `ReferenceError`、`SyntaxError`、`ERR_MODULE_NOT_FOUND` 或启动错误计作证据。

### R6 — 范围

**PASS。** 阴性均有第二来源与阳性校准。

- `git diff --numstat/--raw 4d3ba81 602d0a0 -- server` 均空；两端 `server` tree 均为 `d1117dcc93d39c4a99a03c24f1f3c1771a6fda5f`。点名禁区 `server/src/services/items.ts` 两端 blob 均为 `1d3280afd61f05208caa58634b02e40ce54a3957`。
- `selectionDraftService.ts`（含 `SelectionDraftV1` / phase）与 8 个既有消费者 combined `--numstat/--raw` 均空，9/9 blob 在 `4d3ba81` 与 `602d0a0` 相同；并与 `c3708b4` 连续一致：`aa15fe7b / f70e71ed / 893e8ad1 / f1ec5c55 / f812cbe0 / 29de8952 / 967d2209 / a2febe2c / b921271a`。
- 三个已知 EOL 位点没有用 porcelain 判真。clean-filter working blob 与 `602d0a0` commit blob 分别同为：`useNoteCanvasRuntimeController.ts=3efe5f82`、`server/src/routes/projections.ts=561902a4`、`SelectionToolbarLayer.tsx=29de8952`；对应 `--numstat` 为空。
- 阳性校准：同一基线差分确实命中三个允许源码/测试文件，numstat 为 `99/14`、`1/1`、`1/1`；projector blob 从 `e2482ff…` 变到 `5f8c277…`，探针没有失明。

### R7 — 门禁

按指定顺序亲跑，全部通过：

1. `npm.cmd run docs:check`：exit `0`。
2. `npm.cmd run verify:v2-bn8-runtime`：exit `0`；含 unit `22 files / 222 tests`、专项 `9/9`、canvas boundary `159`、model contract `60/60`、client/server build 与既有门；仅既有 Vite dynamic-import / chunk-size warning。
3. client / server `npx.cmd tsc --noEmit`：均 exit `0`。
4. `npm.cmd run test:unit`：`22 files / 222 passed`。
5. server `npm.cmd run test:v2`：隔离 `CANVAS_ASSET_DIR` 下 `270 passed / 0 failed`；目录末态 `0` 项、`0` reparse，校验后已删除。
6. 五道 tool-face 门：registry `4/4`；manifest `10/10`；manifest check `2 entries / 2 public` fresh；parity `10/10`；parity check PASS（仍按门自身措辞：human reachability not verified / journey pending）。

### 隔离树、边界与合取扫描

- Mutation 位于仓外系统临时 clone `C:\Users\70208\AppData\Local\Temp\coincides-review-2c1-ef4ad11f48f943dfacf3873b12566d06`，HEAD `602d0a0`；client/server 依赖各自 `npm ci --offline`，没有 junction/symlink 到共享 `node_modules`。每刀反向恢复并取 `git diff --exit-code=0`；收尾工作区/索引双空、`0` reparse 后已删除该 clone。
- 临时 clone 中 esbuild 首次因沙箱拒绝读取高层父目录而在测试启动前退出；该输出未计证据。有效定点运行临时隐藏 clone 自身的 Vite/Vitest config，依赖测试文件的 `@vitest-environment node` 与相对 import；每次均在 finally 中恢复 config。生产配置下的专项 `9/9`、unit `222/222` 与总 runtime 门另在共享树亲跑通过。
- 未取锁、未读写 `owner.json`、未删锁；未查询、终止或干扰 PID 8292；未触碰 `server/src/services/items.ts`。
- 跨条耦合扫描唯一命中即 HIGH-1：K-1' 与 K-2' 职责重复，使 R1 的阴性反事实被另一条断言劫持。其余合取未见新增缺口：类型更名 + 源码枚举 + 双 tsc 同意零消费者；切片 + 长度不变式同意常规 UTF-16 窗口。emoji / grapheme、畸形 offset、RTL 仍是工单已登记的 P2，不扩；P3 自由巡猎不做。
- 下一单 `resolve_selection` 若开始消费 receipt，`excerpt` 名称与 shared 类型会提供编译缝；当前零消费者结论不外推为未来保证。除 HIGH-1 外无状态转移后新增问题。
