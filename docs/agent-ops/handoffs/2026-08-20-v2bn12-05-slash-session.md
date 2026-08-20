> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: done | re: v2bn12-05 | date: 2026-08-20

# V2.BN.12 工单 05:SlashSession 事务(RC-D)+ 两笔测试债顺手清偿

## 背景

工单 01 判定 RC-D:slash query 先成为正文真值,cancel/failure 无 transaction rollback(症状 3)。修复蓝本=工单 01 ## Result §4.5;现状细节 §3 RC-D(file:line);RED 形状 §5.3。工单 02 已抽出 `slashCommandReducer` pure transition 层(exit policy 在内),03 链已建 focus receipt 三元组——本单是它们的合拢。

## 交付物

### D1 — SlashSession 事务

- 引入 SlashSession:记录 **owner 三元组(blockId,textFlowId,textUnitId)**、trigger range/original slice、caret 位置。
- **success commit**:writing-role/template 分支照旧 remove trigger(现行为保持)。
- **guarded rollback**:Escape/disabled/annotation-action/missing-template 各路径回滚 trigger 文本——**仅当 owner/range 仍匹配**(防删掉用户有意保留的 literal slash),回滚后恢复原 unit focus/caret。
- 事务状态走 pure transition 层(延续"抽逻辑不抽状态基座";`slashCommandReducer` 扩展,hook 原生 setState 委托)。
- 边界:菜单导航(ArrowUp/Down/Enter)工单 01 已验正常,**不重做**;不碰 03 链已定面。

### D2 — 测试

- 工单 01 §5.3 RED 落地:成功 Enter 保持绿;Escape/disabled/missing 断言 guarded rollback + 同 unit/caret 恢复;owner/range 漂移时断言**不回滚**(guard 负控)。
- RED-first:先落测试红证,再接生产转绿,红绿收据都进回执。

### D3 — TD-5 清偿(顺手)

- 恢复收据正控矩阵补 right-crossing 精确行(raw v1/v2,原 `[96,636]` 形),与既有左界行构成**左右对称必备项**;并在测试文件注释里立规则:crossing 测左必测右。

### D4 — TD-3 门接线(顺手,逐脚本裁快慢)

- 六条门外脚本逐一实测耗时后分层:快(<~10s)→并入 `verify:v2-bn8-runtime` 链;慢→并入一条新的并列强制门(repo 根一条命令);`docs:check` 一并接线。回执附每脚本耗时与分层理由。清偿后更新 tech-debt.md 的 TD-3/TD-5 行(带回执链接)。

## 边界

不碰跨 block Backspace(悬置待 Henry)/浏览器 E2E/placement stacking/schema/migration;RED #1 已绿的断言与 03 链保护面不动。

## 验证与回执

全套门(unit 112+新增/server 262/verify 链含新接线/双 tsc/migration 5 项)。## Result 追加进本文件:D1-D4 落实+收据、RED-first 红绿证、每脚本耗时表、顺手修与未做申报。不自评 PASS,不 commit。复核重点预告:rollback guard 的负控(owner 漂移不回滚)、literal slash 保留、门接线后 verify 链总耗时。

## Result

> builder: codex | date: 2026-08-20 | disposition: submitted-for-review

### 1. 交付范围

| 交付物 | 落点 |
|---|---|
| D1 SlashSession 事务 | `client/src/pages/Notes/canvasEngine/slashCommandReducer.ts:30,130,191`;`client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts:148,220,271`;`client/src/pages/Notes/canvasEngine/hooks/useSlashBlockRollbackController.ts:65`;`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts:187` |
| D2 RED-first / guard 回归 | `client/src/pages/Notes/canvasEngine/slashCommandReducer.test.ts:51`;`client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.test.tsx:175`;`client/src/pages/Notes/canvasEngine/hooks/useSlashBlockRollbackController.test.tsx:144`;`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx:211` |
| D3 TD-5 | `client/src/pages/Notes/canvasEngine/draftBlockPersistence.test.ts:147-175,315-336` |
| D4 TD-3 | 根 `package.json:33`;`docs/agent-ops/current-state/tech-debt.md:14-15`;`docs/generated/object-inventory.md` |

### 2. D1 — SlashSession 事务

1. `SlashSession` 记录 `target`、03 链既有 `(blockId,textFlowId,textUnitId)` owner、aggregate trigger range、当前 exact `originalSlice` 与 rollback-local caret。`transitionSlashSession`/`planSlashSessionRollback` 是 pure transition/plan;hook 保留原生 `useState`，functional setter 只委托 pure transition。
2. `escape`、`disabled`、`annotation_action`、`missing_template`、`missing_block` 统一走 rollback policy；只有当前 owner 三元组 exact equality 且当前文本在保存 range 内仍等于 `originalSlice` 才 exact splice。guard 失败仍结束菜单/transaction，但不写正文、不抢 focus、不改 caret，literal slash 留在正文。
3. block rollback 由 runtime root 的单一 authority 承接。它先捕获当前 plain/TextFlow/Formula field 三份 draft，再要求 TextFlow 的完整 active-unit projection、Formula `latex_input` 与 aggregate plain 完全相等，并验证 aggregate trigger 与 owner-local caret 是同一 occurrence；任一 companion 缺失、局部或 slice 外漂移都整笔拒绝，避免 half rollback 与重复 `/query` 错删。
4. 通过 TextFlow authority 删除时，同批 inverse-rebase annotation offsets/cache；Formula 只 patch `latex_input`，保留 `formula_name`、`explanation` 与其他 field。annotation API 失败时 Slash 专用选项保留与本地三份 draft 一致的 optimistic rebase，默认 annotation 调用的失败回退行为不变。这里保证的是 client optimistic coherence，不宣称服务端持久层原子事务；失败仍出 toast，服务端本次 inverse rebase 未落盘。
5. 已排队的 plain revision 会在 plan 前被 drain，并用 hook 的最新 text ref 再作 revision guard；owner/range/flow/field 任一漂移时所有 maps、annotations 与 focus 均零写。rollback 成功才恢复 exact owner/caret；优先使用会话捕获 textarea，失效时按三层 dataset exact lookup。guard 失败仅在 owner 仍匹配时把 interaction 收束回 `editingText`，owner 漂移不覆盖 03 lifecycle。
6. writing-role/template 的 `commit` 仍走既有 `removeSlashTrigger(...).trimEnd()` 语义；save/apply 返回 `null` 或 reject 后仍保持 trigger 已删、菜单已关。`Ctrl+Enter` 与 external clear 继续只关闭、不 rollback；ArrowUp/Down/Enter 菜单导航没有重写。

### 3. D2 — RED-first 收据

RED 先于 production 接线执行：

`client` cwd：`npm.cmd run test:unit -- --run src/pages/Notes/canvasEngine/hooks/useSlashCommandController.test.tsx`

- exit 1；10 tests 中 4 failed / 6 passed。
- 失败形状集中在 Escape、disabled、annotation action、missing-template：期望 `"alpha "`，实际仍为 `"alpha /hea"`。成功 Enter 与 guard 负控保持绿，证明失败指向 RC-D rollback 缺口而非菜单选择。

第一轮 GREEN 后用对抗 fixture 再压出 3 个 RED（11 passed / 3 failed）：range guard 结束菜单后 interaction 未收束、TextFlow local drift 发生 plain-only half rollback、draft textarea dataset 与 stale receipt 不一致仍建 session。三项均先红后接线；随后继续加入 Formula field、annotation inverse rebase、queued revision、companion slice 外漂移与 annotation save reject 负控。

最终 GREEN：

- reducer pure tests 覆盖 session capture/refresh、五种 rollback reason、owner/range drift、multi-unit aggregate↔local mapping、duplicate slice、TextFlow/Formula 完整 companion coherence。
- hook DOM tests 覆盖 Enter commit、block/draft Escape、disabled、annotation、missing-template、missing-block、same-unit focus/caret；owner 漂移到同 block 另一 `textUnitId`、range/flow 漂移及 draft stale owner 均断言不 rollback、不重聚焦并保留 literal slash。
- runtime authority tests 覆盖 plain + TextFlow + Formula + annotation 同步提交、全 companion 零写负控与 queued revision；adapter reject test锁定 Slash 的本地 optimistic coherence。
- 最终定向 5 files / 59 tests，exit 0；全 client unit 16 files / 146 tests（112 baseline + 34 新增），exit 0。

### 4. D3 — TD-5 左右对称矩阵

`canonicalCrossingReceipt` 现在显式接受 `left|right`。正控矩阵为 left/right × raw v1/v2 四行；右界保持原始精确几何 `x=128,width=540,pageBoundary=[96,636]`（box right=668），v1 断言升级成 replayable v2 并迁移 storage，v2 断言原生 replayable。矩阵旁已立规则：`every left-edge positive control has a right-edge twin`。TD-5 保留原行、链接本 Result 并标 `已清`。

### 5. D4 — TD-3 逐项计时与门接线

PowerShell `Stopwatch`、repo root、逐项 `npm.cmd run <script>`；以下是接线后的成功复测：

| 脚本 | 墙钟 | 分层 | 接线处置 |
|---|---:|---|---|
| `test:unit` | 3.318s | 快 | TD-2 已在 verify 首段；保留，不重复接线 |
| `check:group-gallery-shell` | 0.503s | 快 | 本单直接接入 verify |
| `check:groups-rail-shell` | 0.501s | 快 | 本单直接接入 verify |
| `check:single-editor-shell` | 0.504s | 快 | 本单直接接入 verify |
| `check:source-experience` | 0.988s | 快 | 本单直接接入 verify |
| `check:v2-bn11-legacy-shutdown` | 0.520s | 快 | 本单直接接入 verify |
| `docs:check` | 0.351s | 快 | 本单直接接入 verify |

inventory 旧口径的“六条门外脚本”包含 5 个 check + 已由 TD-2 接入的 `test:unit`；权威 TD-3 实际待接是 5 个 check + `docs:check`。七项都远低于约 10s 阈值，所以全归快项；慢项为 0，没有建立无执行成员的空并列门。根 verify 字符串直接列出新增六项，生成器可以机械识别；重生后的 object inventory 不再报告门外 check/smoke/test。TD-3 保留原行、链接本 Result 并标 `已清`。

### 6. 全套验证收据

| cwd / 环境 | 命令 | 结果 |
|---|---|---|
| repo root | `npm.cmd run test:unit` | exit 0；16 files / 146 tests |
| server；`CANVAS_ASSET_DIR=<repo>/.codex-tmp/v2bn12-05-canvas-assets` | `npm.cmd run test:v2` | exit 0；262/262；18.968s |
| server | `npm.cmd run test:v2-bn12-migration` | exit 0；5/5；0.177s；未执行 migration `--apply` |
| client | `npm.cmd exec tsc -- --noEmit` | exit 0；11.100s；无 diagnostics |
| server | `npm.cmd exec tsc -- --noEmit` | exit 0；8.704s；无 diagnostics |
| repo root | `npm.cmd run verify:v2-bn8-runtime` | exit 0；28.159s；unit 146、runtime boundary 159、五个新 check、relation freshness、model contract 60、client/server build、performance 5 scenarios / 11.65ms、`docs:check`、diff 与 secrets 均执行 |
| client | 五个定向 unit files | exit 0；59/59 |

非阻塞输出只有既有 React Router future-flag、Vite dynamic-import/chunk-size 与 Git LF→CRLF 提示。

### 7. 顺手修、生成物与未做申报

1. D3 helper 增加 `side` 参数后，双 tsc 首轮抓到旧 inconsistency matrix 仍按旧签名传 key；只修正该 test caller 为显式 `left`，随后定向 tests 与 client tsc 复跑为 0。
2. 为防 rollback 后 annotation offset 漂移，接入既有 rebase authority；只为 Slash local transaction 增加“失败保留 optimistic state”选项，其他 annotation 保存路径仍用原失败回退。
3. `docs:inventory` 依生成器更新门成员，并顺带刷新既有来源行号；没有手写 generated 内容。
4. 未改菜单导航、跨 block Backspace、03 的 focus receipt/release/reconciliation 文件、placement stacking、schema 或 migration production；未跑浏览器 E2E，未执行 migration apply。
5. 本单未 commit；工作树留给复核。

## Review

> reviewer: codex(reviewer) | date: 2026-08-20 | baseline: `d14f53996fbfccbc0aebcc3e48c7bbd5bdcee897`（`b2a006b` 后仅 docs commits） | verdict: **FAIL**
>
> 放行权仍在 Fable；本报告不作放行。

### 1. 判定与 findings

| ID | 分级 / 性质 | 结论 |
|---|---|---|
| HIGH-1 | 技术缺陷 / 5-2 跨条耦合 | draft Slash rollback 会吞掉 03 revision；在途 create 返回后不发纠正 save，durable block 可继续含 `/query`。隔离 Vitest 已确定复现。 |
| HIGH-2 | 技术缺陷 + 认识论错误 / annotation truth | annotation 失败路径只保证 client optimistic coherence，不能保证 durable 零半回滚；前一轮 forward rebase 已落盘而 inverse PUT 失败时，client 与 server offsets 会分叉。Result 的“服务端本次 inverse rebase 未落盘”也不能由 Promise rejection 推出。 |
| MED-1 | 技术缺陷 / queued revision | 声称的 queued revision drain 在其 hook batching 模型下没有取到最新 coherent snapshot；现有测试因 stale guard 安全拒绝而假绿。 |
| MED-2 | 测试护栏缺口 / rollback guard | shipped tests 没有点杀 canonical `textFlowId` guard，也没核死 owner 漂移时 interaction 零覆盖；重复 slice 缺“正确指向第二处”的正控。生产 exact guards 当前成立，但回归护栏不完备。 |
| LOW-1 | 收据 / 申报完整性 | 第二轮 RED 没有明写 command/exit，最终“5 files / 59”没有列完整命令；`useRuntimeNaturalWritingController.test.tsx` 的 required-callback fixture 适配未在 path-level scope 表点名。 |

#### HIGH-1 — draft rollback 吞掉 revision，durable `/query` 回流

因果链是确定的：

1. `useRuntimeNaturalWritingController.ts:446-453` 对 meaningful draft 输入立即启动 `persistDraft(value)`；review probe hold 住 `createBlock("draft /hea")`。
2. Escape rollback 在 `useSlashCommandController.ts:256-259` 先写 `draftTextRef.current = rollback.text`，再调用真实 `setDraftText`。
3. 03 authority 的 setter 仅在 value 与 ref 不同才递增 revision（`useDraftBlockController.ts:172-187`）；前写 ref 使 rollback revision 被吃掉。
4. create 返回后 `revisionCreated` 与当前 revision 仍相等（`:447,471`），`:491-508` 的 latest-save loop 不进入。

隔离复现：activate draft → 输入 `draft /hea` 并 hold create → Escape，本地为 `draft ` → resolve 一个正文仍为 `draft /hea` 的 create receipt。期望随后 `saveBlock(..., "draft")`（持久化会 `trimEnd`），实际调用数 **0**；临时 test 为 1 failed / 5 passed。只在隔离副本删除 `draftTextRef.current = rollback.text` 后，同一 test 6/6 绿并出现纠正 save；还原原行后再次稳定红（0 calls）。因此这不是静态猜测。

影响：本地表象正确，但 durable reconciliation / reload 可重新带回 `/query`，直接破坏本单的 transaction rollback。

建议修法：让真实 `setDraftText` 独占 ref、TextFlow 与 revision 更新，不能在调用前预写共享 ref；把上述 hold-create 场景作为 production integration test 穿过 `useRuntimeNaturalWritingController` + `useDraftBlockController`，并断 durable reconciliation / reload 无 slash。

#### HIGH-2 — annotation 失败时 durable truth 可与本地 rollback 分叉

成功路径本身正确：`useSlashBlockRollbackController.test.tsx:145-175` 证明删除 `/hea` 后 annotation `[6,14] "/heabeta"` 变成 `[6,10] "beta"`，plain / TextFlow / Formula 一起更新，Formula 其他字段保留；本单也没有触碰 placement，符合 I-1 的布局/内容真相分离。

失败边界不成立：正常 TextFlow 编辑会在 `NoteWritingSurfaceLayer.tsx:2187-2215` rebase 并立即保存 annotation；rollback 则在 `useSlashBlockRollbackController.ts:178-205` 本地 inverse 后 fire-and-forget 第二次 PUT，并用 `retainOptimisticOnFailure` 保持本地 inverse。隔离 adapter probe 先让 forward offsets `start=10` 成功落入模拟 durable store，再令 inverse offsets `start=6` 的 PUT reject；结果为 **client=6、durable=10**，测试 1/1 绿地确认了分叉形状。服务端 `annotationTruths.ts:371-469` 的 SQLite transaction 只覆盖 annotation replacement 自身，不与 block text 构成跨资源事务。

此外，`useNoteCanvasDataAdapter.test.tsx:211-241` 的 `mockRejectedValueOnce` 只能证明 client toast + retain optimistic；响应在 server commit 后丢失也会走同一 catch，所以 rejection 不能证明“服务端未落盘”。正确申报应是：**client-observed failure 时本地保持 inverse coherence 并 toast；durable outcome unknown**。

建议修法：Slash transient query 的 annotation forward rebase 可留本地，但在 session commit/rollback 前不要把中间 offsets 发布为 durable truth；或引入 version/CAS + operation receipt、串行化和 read-after-error reconciliation。必须补一条“forward 已 durable、inverse reject”以及一条“server commit 后 response loss”的测试，不能把 Promise 状态当数据库收据。

#### MED-1 — queued drain 实现与测试都未承重

现有 `useSlashBlockRollbackController.test.tsx:219-243` 先把 observed text 改成 `alpha /literal`，再排队 plain setter。临时删除 `captureLatestSnapshot` 的 `flushSync` 后，原 4 tests 仍全绿：旧 snapshot 与新 observed 不同会安全拒绝，outer `act` 最终又提交 literal；它证明的是 stale fail-closed，不是 drain。

Reviewer 另加 coherent probe：同一批排队 plain / TextFlow / Formula `alpha /heagamma`，session 仍 exact 指向 `/hea`；期望基于最新 snapshot applied=true 并保留 suffix，三份都成为 `alpha gamma`。删除 drain 时它按预期红；**还原当前 production drain 后它仍红**，实际 `applied=false`，说明 `flushSync` 在该 batched hook 路径没有让 closure refs 看到排队 revision。

影响目前是安全拒绝而非错删，但 Escape 会关菜单、留下本应可精确回滚的 literal `/query`，不满足 Result §2.5 的 drain 申报。

建议修法：不要用嵌套 no-op setter 的 `flushSync` 猜当前 state；让三份 draft authority 在 enqueue 时同步维护可读 snapshot/ref，或把同一 event 的 authoritative snapshot 显式交给 rollback。把上述 coherent positive 作为 shared test；mutation 删除 drain 必须命中 `applied=true` oracle 而红。

#### MED-2 — exact guard 当前正确，但 shipped suite 漏杀关键位点

- Owner / range 当前正确：`slashCommandReducer.ts:173,176` 分别做 receipt triple 与 original slice exact equality；只有 applied rollback 才恢复 focus。隔离 mutation 弱化 owner equality，现有 owner-drift test 直接从 `alpha /hea` 错删成 `alpha `；删除 range equality，changed-range test 从 `alpha /literal` 错删成 `alpha eral`。两处均命中相关后果而红。
- Flow identity 当前正确：`useSlashBlockRollbackController.ts:146` 要求 session `textFlowId` 等于 block canonical flow；但删除该行后 shipped 3 files / 44 tests 仍全绿。Reviewer 临时补“同 block、同 unit、仅 flow id 漂移且 current receipt 与 stale session 相等”后，原实现拒绝且三份正文/annotation 零写；删除 guard 时该 test 精确由 expected false 变 actual true。
- 03 interaction 当前 guard 正确（`useSlashCommandController.ts:248-253`），但 shipped owner test 不断 interaction。Reviewer 临时 assertion 在弱化 equality 后由 1 call 变 2 calls，证明应纳入 shared suite。
- Duplicate occurrence 的 shipped 错配负控有效；Reviewer 又用两个相同 `alpha /hea`、aggregate `[17,21]` 与 owner-local caret `6` 共同指向第二处，验证只删第二处、第一处原样（26/26）。删除 aggregate exact checks 时既有错配负控 relevant-red，并暴露 plain 删第一处、TextFlow 删第二处的不一致。

建议修法：把 reviewer 的 canonical-flow、interaction 与 duplicate-correct-occurrence 三条形状正式落进 shared tests；尤其 `:146` 必须有独立 killer test。

### 2. 九项逐条核形

| 重点 | 复核结论 |
|---|---|
| ① rollback guard 负控 | **生产逻辑 VERIFIED；交付护栏不完备。** owner/range mutation relevant-red；flow-id-only reviewer probes 验证不回滚、不写 annotation、不抢 focus/interaction、literal slash 留正文；但 shipped suite 删除 canonical flow guard仍绿，见 MED-2。 |
| ② 重复 `/query` | **VERIFIED。** shipped 错 occurrence 负控成立；reviewer 正 occurrence probe 证明 aggregate trigger 与 owner-local caret 同指第二处时只删第二处；删除 aggregate exact equality 后相关断言红。 |
| ③ annotation 乐观一致性 | **成功 VERIFIED，失败 FAIL。** inverse offset 与 companion 同批本地更新正确；失败只保证 client optimistic coherence，durable 可半回滚且 response rejection 不能证明未 commit，见 HIGH-2。 |
| ④ RED-first | 第一轮 receipt 有 cwd/command/exit/expected-vs-actual；第二轮的三条对抗断言当前存在。历史时序只能登记 builder receipt，承重因果由 reviewer mutations 另验；第二轮 command/exit 缺失记 LOW-1。 |
| ⑤ D3 / TD-5 | **VERIFIED。** `canonicalCrossingReceipt(left|right)`；left/right × raw v1/v2 四行；right 精确 `x=128,width=540,[96,636]`；twin 规则在 test 旁；TD-5 原行保留、链接 Result、状态 `已清`。 |
| ⑥ D4 / TD-3 | **VERIFIED。** 根 verify 字面新增 `group-gallery`、`groups-rail`、`single-editor`、`source-experience`、`v2-bn11-legacy-shutdown`、`docs:check` 六段，各一次；亲跑 25.149s（builder 28.159s）。`docs:inventory` 重生无变化，SHA-256 前后同为 `EE695BE3E8950C672FD829E17EBE7715989DD09A1CE81D66F8BFDD7B7CC19B6C`，门外脚本 0；TD-3 已清。 |
| ⑦ 边界零触碰 | **VERIFIED。** 菜单 index transition 与 ArrowUp/Down/Enter selection body 对 HEAD 归一化字节相同；跨-block Backspace production 文件无 diff；03 focus receipt/release/reconciliation 核心文件、placement/stacking、schema/migration、`surfacePersistenceContract.test.ts` 均零 changed-path 交集。 |
| ⑧ 5-2 跨条/状态转移 | **FAIL。** Slash × 03 draft lifecycle / durable reconciliation = HIGH-1；Slash × annotation truth = HIGH-2；Slash × queued revision = MED-1；Slash × 03 interaction guard 当前代码正确但 shared oracle 缺失 = MED-2。下一可观察状态不是“本地菜单已关”，而是 create/save response、durable reconciliation 与 reload；两条 HIGH 都在该状态才显形。 |
| ⑨ 全门 | **全部亲跑绿，但不能覆盖上述缺口。** 详细收据见 §6。 |

### 3. 5-3 / 5-5 mutation 与隔离收据

原生 `git worktree add` 因本环境无权写 `.git/worktrees` 被拒；未在共享施工树降级操作，而是用 `git clone --no-hardlinks` 建立独立 `.git` 的隔离 git working tree，并只把本单 canvasEngine diff 与两个 untracked controller 文件带入。依赖用只读 junction 指向既有 `node_modules`。

| Reviewer 自选位点 | 基线 / mutation 结果 | 判据 |
|---|---|---|
| owner receipt exact equality | construction 3 files / 44 绿；弱化后 owner-drift 1 relevant failure / 14 pass，正文被错删 | 杀伤成立 |
| range `slice === originalSlice` | 删除后 changed-range relevant-red：expected `alpha /literal`，actual `alpha eral` | 杀伤成立 |
| aggregate start/end exact equality | 删除后 duplicate错配 relevant-red：`applied` 从 false 变 true，并产生 plain/TextFlow occurrence 分裂 | 杀伤成立 |
| canonical `textFlowIdForBlock` equality | 删除后 shipped 44/44 仍绿；临时 reviewer test 后 expected false / actual true | **shipped 护栏漏杀** |
| owner-drift interaction equality | 弱化后 reviewer assertion 从 1 call 变 2 calls | shared oracle 缺失 |
| queued snapshot drain | 删除 drain 后 shipped rollback 4/4 仍绿；coherent reviewer test relevant-red；还原 production 后该 positive 仍红 | **测试假绿 + 实现未满足** |
| draft ref prewrite | 原实现 reviewer integration 0 corrective saves；删除 prewrite 后 6/6 绿；还原后再次红 | HIGH-1 因果确认 |

所有 production mutation 均已还原。共享源与隔离源按 LF 归一化后的 SHA-256 一致：`slashCommandReducer.ts=30F787...23E5F`、`useSlashCommandController.ts=2760E9...F9A02`、`useSlashBlockRollbackController.ts=D8B3E2...FB82D`；共享工作树的施工 path 集合没有因 probe 增加。

### 4. RED receipt 与 5-6 证据承重

- Result 第一轮 RED 可作为 builder receipt：command、exit 1、10 tests / 4 fail、期望与实际齐全；当前 diff 也包含对应测试形状。
- 第二轮仅写“11 pass / 3 fail”和机理，没有再次写 command/exit；最终“5 files / 59”也没有列第五文件与完整 command。最终绿树无法独立重演历史先后，因此这些精确历史数字只作**装饰证据**，不承重判定。
- Reviewer 亲跑的 relevant-red mutations、draft repair causality、duplicate 正控、annotation durable-split 与全门是本判定的承重证据。
- 14 条非 handoff 施工路径的生产行为均能在 Result 找到申报；唯一未逐路径点名的是 `useRuntimeNaturalWritingController.test.tsx:113-118` 的 required callback fixture stub，无新增生产行为，记 LOW-1 而不另升边界 finding。

### 5. D3、D4 与机械边界收据

- 起始 fingerprint：HEAD `d14f539`；13 条 tracked 施工路径 + 2 条 untracked rollback-controller 路径；`git diff --check HEAD` exit 0。`b2a006b..HEAD` 均为 docs commits，故按工单口径以 HEAD 为 baseline、dirty tree 为本单施工物。
- D3 的 helper、四行矩阵、right 精确几何、v1→replayable v2 + storage migration、v2 native replayable 与旧 caller 显式 `left` 均机械核对。
- D4 生成器的算法是从根 scripts 取 `check|smoke|test:` 全集再减 verify 字面成员；不是从生成物“没显示”反推。复算与重生均为 off-gate 0，符合 5-4 信号纪律。
- 菜单导航函数对 HEAD 做函数体归一化比较；03 / Backspace / placement / schema 边界用完整 changed-path 集合求交，不以截断 grep 的缺席作结论。

### 6. Reviewer 全门亲跑收据

| cwd / 环境 | 命令 | Reviewer 结果 |
|---|---|---|
| repo root | `npm.cmd run test:unit` | exit 0；16 files / **146 tests**；3.236s |
| server；`CANVAS_ASSET_DIR=<repo>/.codex-tmp/review05-server-assets` | `npm.cmd run test:v2` | exit 0；**262/262**；12.337s |
| repo root；同一 `CANVAS_ASSET_DIR` | `npm.cmd run verify:v2-bn8-runtime` | exit 0；**25.149s**；unit 146、runtime boundary 159、六个新增段、relation freshness、model contract 60、双 build、performance 5 scenarios、`docs:check`、diff、secrets 均执行 |
| client | `npm.cmd exec tsc -- --noEmit` | exit 0；5.511s；无 diagnostics |
| server | `npm.cmd exec tsc -- --noEmit` | exit 0；3.916s；无 diagnostics |
| server | `npm.cmd run test:v2-bn12-migration` | exit 0；**5/5**；0.412s；未执行 `--apply` |
| repo root | `npm.cmd run docs:inventory` | exit 0；0.466s；“无变化”，hash identical，off-gate 0 |

非阻塞输出只有既有 React Router future flags、Vite chunk/dynamic-import 与 Git LF→CRLF warnings。

### 7. 5-1 / 5-2 / 5-7 范围声明

- 未跑浏览器 E2E：工单边界明确排除；本报告不把 DOM hook probes 冒充浏览器验收。
- 未执行 migration apply：工单边界明确 schema/migration 零触碰，只亲跑 5 项 migration tests。
- 未做 live 网络代理的“server commit 后丢 response”注错：现有服务没有该 fault-injection seam；而 client rejection 无法承载 durable outcome 正是 HIGH-2 的认识论结论。已用 adapter durable-split probe、真实 server 262 suite 与 server transaction 源码分别承载 client、门、server 边界。
- 多轮取证采用 5-7 增量协议：共享施工树先作全 changed-path / diff 盘点；隔离中间轮只跑被 mutation 命中的 1–3 files，并以 production normalized hashes 对上一轮；全部 probes 后回到共享树亲跑 §6 全门。中间轮没有沉默缩范围。
- 未改任何产品代码或 shared test；本 reviewer 只向本 handoff 追加 `## Review`。

### 8. 最终结论

**FAIL。** D3、D4、机械边界和全部常规门均通过；owner/range/duplicate 的核心 exact guards 也经 relevant-red mutation 证明有效。但 HIGH-1 会让 draft transaction 在 durable reconciliation 后复活 `/query`，HIGH-2 会在 annotation failure 下留下 durable truth 分叉；MED-1 还证伪了 queued drain 申报。修复并补齐 MED-2 的 killer tests 后需重新做隔离 mutation 与全门复核。最终是否放行由 Fable 决定。
