> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready(12.2a-1 已闭环 2026-08-22;**接口已由 Opus 按落地实况校订,见 §0**) | re: v2bn12-12.2a-2 | date: 2026-08-21

# V2.BN.12.2a-2:收据轴扩展('mcp' / 'proposed')+ 消费方不变式守卫(单交付物)

## 0. ⚠️ 2026-08-22 接口校订(Opus,发单前核对)

本单写于 2026-08-21,其后 12.2a-1 经历方向重置(1b/1c)。**发单前逐条核对了工单对代码的点名,发现两处脱节,均已在下文校订。核对用阳性对照法**(先证探针能命中 `operation_batch` 17 处,再断言阴性)。

| # | 工单原文 | 实况 | 处置 |
|---|---|---|---|
| **D-1** | 守卫挂在「`findOperationBatch(id)` 的路径(:390/:951 一带)」 | ⛔ **`findOperationBatch` 全仓零命中,该函数不存在**;真实读取点是 `server/src/services/noteBlockLifecycle.ts:225` 与 `:262` 的两处 `FROM operation_batches` | **守卫改挂这两处**;**行号仅为路标,施工时以实际 `SELECT ... FROM operation_batches` 语句为准,不得按行号盲改** |
| **D-2** | 规则「工具收据不传 `created_at`」 | ⚠️ **周围代码尚未遵守**:四个显式写入点原样都在(`noteBlockLifecycle` 三处 + `sourceProjectionMaterializer.ts` 一处)。12.1 的 B 段(时间戳统一)被止损线停掉后**从未执行** | **本单只管自己新写的收据路径不传 `created_at`**(走 DB 默认);**⛔ 不得顺手去修那四处**(不在触及面,且是 TD-8 的存量面)。**回执须明写「本单未修既有四处,故 `created_at` 全表仍为混格式」,不得申报为已统一** |

**另两处已核实无需改**:③ 设计稿现为 **v0.5 + 08-22 补注**(工单引 v0.4),但 §2.2 收据轴部分未被 v0.5 改动(v0.5 改的是 schema 权威与机械门口径);④ server 测试基线数字工单写「262+」,**施工时以实测为准,不照抄该数**。

## 上游与定位

设计稿 v0.4 §2.2(已拍板)+ Review-1 ①/①-b。本单只做**收据轴**:让 `operation_batches` 能安全承载工具面收据,并把「非 mcp 消费方不得解引用 mcp 批次」从命名空间巧合变成**声明不变式**。零 MCP、零工具实现。

## 交付物(单项)

1. `server/src/services/toolFaceReceipts.ts`:`writeToolFaceReceipt({userId, courseId?, callId, tool, tier, harness, inputDigest, humanEntry, resources[]})` → 写一行 `operation_batches`,`source_type='mcp'`,`source_id=callId`,`status` 由 tier 决定(`immediate`→`applied`;`propose`→`proposed`);`metadata` 携 tool/tier/harness/input_digest/human_entry/resources。`markToolFaceReceiptApplied(id)` / `revertToolFaceReceipt(id, {outcome:'complete'|'partial', details})` —— **revert 只写收据状态与 `revert_outcome`,不执行业务回滚**(业务回滚归各工具,且跨资源不承诺原子:设计稿 §2.2)。
2. **不变式守卫**:`noteBlockLifecycle.ts` 经 `findOperationBatch(id)` 的路径(Review-1 指出的 :390/:951 一带)加 `source_type` 守卫——仅接受该服务自己的取值(`client_note_block_create` 等),遇 `'mcp'` 批次 fail closed 为明确错误(非静默非误判 applied)。
3. 测试(RED 先行):a)写 immediate 收据→status applied;b)写 propose 收据→status proposed;c)revert 写 `revert_outcome:'partial'` 可观察;d)**killer**:把一条 `'mcp'/'proposed'` 批次 id 喂给 noteBlockLifecycle 的 findOperationBatch 路径→必须拒绝(改回无守卫时该测试红);e)既有 noteBlockLifecycle 16/17 项测试零回归。
4. `tech-debt.md`:TD-6 行补注「工具面跨资源撤销以 revert_outcome 可观察,原子性待本专项」。

## 边界

schema 零改动(新 status 值属词汇扩展);不碰 routes/transport;不碰 03/05 保护面(仅 noteBlockLifecycle 守卫一处,逐 hunk 申报)。

## ⭐ 12.2a-1 三轮的实证教训(本单直接吃,点名出处非套话)

| # | 教训 | 出处 |
|---|---|---|
| 1 | **「API 不存在」的红不承重** —— 红须来自「机关存在但被改坏」 | 12.1.3 复核 FAIL 的直接原因 |
| 2 | **测了逻辑 ≠ 测了接线** —— 同族已四次:hook 逻辑绿而生产调用者可删;comparator 绿而生产分支可绕;投影纯函数绿而生产对它的调用可换内联复制 | 12.1.3 X3 / 12.2a-1b M4 / fix2 F3 |
| 3 | **mock 掉正门 = 护栏自证** —— 凡 mock 须申报「mock 了什么、为什么它不承载被测行为」 | 12.1.4 复核 FAIL 落点 |

**对本单的落点**:第 3 项(killer:把 `'mcp'/'proposed'` 批次喂给 noteBlockLifecycle 路径必须被拒)**必须由「守卫存在但被改坏」触发红**,并须有一条能杀死「守卫根本没被调用」。

## D. 探针先过阳性对照(`adjudication §7`,含反面分则)

正面:阴性断言前先让同一探针看见已知阳性。反面:**先确认探针的命中不是来自你自己刚写进去的东西**。
📌 本环境:`.git/index` 只读 ⇒ porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性 `.M`,**不是改动**;判文件是否真改用 blob 哈希或 `git diff --numstat`;管道会遮蔽退出码。
📌 **提交前若新增 handoff/文档须先跑 `docs:index`**;改 `package.json` 会使 `object-inventory` 合法过期,须 `docs:inventory`。

## 验证与回执

server 全套(262+新增)/ noteBlockLifecycle 定向 / 双 tsc / verify 链。## Result 追加进本文件,回执措辞不得宽于实现;附 Spark 单前/单后读表。不自评 PASS,不 commit。

## Result (Codex builder, 2026-08-22)

### 落地内容

1. 新增 `server/src/services/toolFaceReceipts.ts`:
   - `writeToolFaceReceipt(...)` 写入既有 `operation_batches`,固定 `source_type='mcp'`、`source_id=callId`;`immediate -> applied` 且写 `applied_at`,`propose -> proposed` 且 `applied_at=NULL`。
   - metadata 保存 `tool/tier/harness/input_digest/human_entry/resources`;运行时显式拒绝不属于 `immediate|propose` 的 tier,没有把 `confirm` 静默降成 proposed。
   - `markToolFaceReceiptApplied(id)` 仅推进 `proposed -> applied`;`revertToolFaceReceipt(id,{outcome,details})` 仅把收据改为 `reverted`,合并写入 `revert_outcome/revert_details` 与 `reverted_at`,不写任何业务表、不执行业务回滚。
   - 新 INSERT **完全不列 `created_at`**,由 SQLite 默认值生成。
2. `server/src/services/noteBlockLifecycle.ts` 只在 D-1 校订指出的两条真实读取路径加 fail-closed 守卫,并共用一个私有断言:
   - hunk 1:`recordLegacyPlacementCleanupConflict()` 的 `SELECT ... FROM operation_batches` 回读后、解析 metadata 前,只接受 `client_note_block_cleanup_conflict`。
   - hunk 2:`readBatch()` 的 `SELECT ... FROM operation_batches` 回读后、return 前,只接受 `client_note_block_create`。
   - 错类型统一返回 409 + `details.code='note_block_lifecycle_batch_source_mismatch'`,并给出 expected/actual source type;既有下游 identity 检查原样保留作纵深防御。
   - 除上述两条读取路径及其共享私有 helper 外,该文件没有其他语义改动;**未改 Slash/rollback 保护 hunk 与语义**。
3. 在既有 `v2NoteBlockLifecycle.test.ts` 内新增 5 条真实 SQLite/Express 路径测试(2 条守卫 killer + immediate/propose/revert 各 1 条),因此没有新增测试脚本或改 `server/package.json`。
4. `tech-debt.md` 的 TD-6 仅追加窄注:工具面跨资源撤销以 `revert_outcome: complete|partial` 可观察,不承诺原子回滚,原子性仍待该专项。

### 平行机关申报

`toolFaceReceipts.ts` 是新的工具面 producer/writer,原因是既有 `noteBlockLifecycle` 与 `sourceProjectionMaterializer` writer 都硬编码各自 operation 的 source identity、metadata 与状态机,不能替工具面写 `mcp` 收据。新服务仍复用同一 `operation_batches`、现有 DB 连接与 `AppError`;没有新表、第二份状态存储、路由/transport、业务回滚引擎或新的事务边界。

### 守卫 RED、接线与 mutation 证据

- 开工定向基线:`node --import tsx --test src/__tests__/v2NoteBlockLifecycle.test.ts` -> exit 0,17/17。
- 先只加入两条 killer、未加守卫时 -> exit 1,19 项中原 17 项绿、2 条新 killer 红;实际退回旧错误 `Client create receipt identity mismatch` / `Cleanup conflict receipt identity mismatch`,红因不是缺 API 或语法。
- 两条 killer 走真实迁移后临时 SQLite + 真实 notes router/service;既有 auth shim 只注入 `userId`,没有 mock DB、读取函数、守卫、identity 检查或路由承重点。
- 单刀 mutation 1(守卫谓词临时放行 `mcp`)只跑两条 killer -> exit 1,0/2,两条都退回上述旧 identity mismatch。
- 单刀 mutation 2(临时删除两处生产 guard call)只跑两条 killer -> exit 1,0/2,两条同样退回旧 identity mismatch;因此测试会杀死“守卫根本没被调用”。
- 两次 mutation 都立即还原;`noteBlockLifecycle.ts` mutation 前后 blob hash 同为 `20c2804709b81037cc454e7d88f9c1d11d8aeff3`,还原后 killer 2/2 绿,最终定向 22/22。

### `created_at` 口径(D-2)

同一只读解析探针先扫 HEAD 已知阳性,再扫工作树:HEAD 有 4 个 operation-batch INSERT 显式传 `created_at`(`noteBlockLifecycle` 3 处 + `sourceProjectionMaterializer` 1 处),工作树仍是同 4 处;新 `toolFaceReceipts` INSERT 的显式 `created_at` 命中为 0。**本单未修既有四处,故 `created_at` 全表仍为混格式。** 本单只能申报“新工具收据路径遵守 DB 默认”,不能申报系统已统一。

### 验证实录

| 命令/阶段 | 实测结果 |
|---|---|
| 开工 `npm.cmd --prefix server run test:v2`(未隔离资产目录) | exit 1,257/262;5 项均为默认 `server/uploads` fixture 清理的 Windows `EPERM`,不是断言失败 |
| 开工 server 全套(改用工作区隔离 `CANVAS_ASSET_DIR` / `SOURCE_BLOB_DIR`) | exit 0,262/262 |
| 最终 `node --import tsx --test src/__tests__/v2NoteBlockLifecycle.test.ts` | exit 0,22/22 |
| 最终 `npm.cmd --prefix server run test:v2`(隔离资产目录) | exit 0,267/267(262 基线 + 5 新增) |
| `server: npm.cmd exec -- tsc --noEmit` | exit 0 |
| `client: npm.cmd exec -- tsc --noEmit` | exit 0 |
| `npm.cmd run verify:v2-bn8-runtime`(隔离资产目录) | exit 0;双 build、既有工具面/Canvas 门、performance seed、docs check 与 changed-file secret scan 均完成 |
| `npm.cmd run docs:check` | exit 0;Result 写入后复跑仍为 exit 0 |
| `git diff --check` | exit 0 |

`verify:v2-bn8-runtime` 不包含 server `test:v2`,所以上表两门分别亲跑,没有互相代替。

### D 段与边界核对

- D-1 开工先用同一 `git grep` 探针在未改代码命中既有 `operation_batch` 阳性,再查 `findOperationBatch` 得全仓零命中(exit 1);施工依据是两条实际 SELECT。
- routes 阴性前,同一 `git grep` 先从 HEAD 命中既有 `router.post` 阳性;`server/src/routes` 对 `toolFaceReceipt` 零命中。schema 阴性前从 HEAD 命中 `schema.sql` 的既有 `operation_batches` 阳性;当前 `server/src/db` diff 为空。
- 同一 `git diff --name-only` 先在 `HEAD^..HEAD` 命中本单之前已有的 docs 改动,再查当前 `server/src/db`、`server/src/routes`、`server/src/transport` 与三份 `package.json`,输出为空。没有 schema、routes/transport 或 package 改动。
- porcelain 报告的 `client/.../useNoteCanvasRuntimeController.ts` `.M` 为题述 stat/EOL 假阳性:`git diff --numstat` 为空,HEAD/工作树 blob hash 都是 `3efe5f820e2077850611b54d4d09482845e89545`。
- 未新增文档、未改文档状态头/H1,故未生成 `docs:index`;未改 package,故未生成 `docs:inventory`。`docs:check` 已同时执行两者的 `--check`。
- 按用户指令保留本 handoff header 原样;未 commit、未 push、未切换或触碰 main。

### Spark 读表与机械锁说明

- 本环境 CLI 无法读取 Henry UI 中的 Spark 单前/单后百分比,本次**未取得该两项读数,需 Henry 从 UI 提供**;未编造百分比。
- `needs: claude/dispatcher`(仅机械锁归属):开工时 `.codex-tmp/builder.lock.d` 已存在;本机 PowerShell 不支持取锁命令所用的 `New-Item -LiteralPath`,mkdir 失败后随后的 owner 写入覆盖了既有 `owner.json`。目录创建时间与本单 agent 启动相邻,但原 owner 字段已无法恢复,所以本 builder 没有删除该锁;请原发单方核对并按锁纪律释放。

## Review (Codex reviewer, 2026-08-22)

### 判定

**FAIL（方向成立）**。复核对象严格锁定为 `d799d50c871c4dd05e7274e56ff2579a93f3424e`，其直接父提交为 `15b3d90f951d9e1444749109bddb92900a1036f7`。本单计数：**1 BLOCKER / 0 HIGH / 0 MED / 0 LOW**；另有 1 项既有 Windows 资产目录 hermeticity TD 候选，不计入本单缺陷。放行权仍归 Fable。

**BLOCKER-1——点名基线漏装核心生产文件，Result 与提交树不一致。** `d799d50` 的测试已经 import `../services/toolFaceReceipts.js`，但该提交的 Git tree 中不存在 `server/src/services/toolFaceReceipts.ts`；该文件到后继 `84c7fffc3393d181a17157678952b90682ce6c6f` 才以 192 行新文件进入历史。因此严格基线不能通过 server tsc、verify、server 全套或定向测试，也没有 K4–K6 的生产 mutation 位点。修法：不要改写 `d799d50`；由调度方明确把包含该文件的修正提交（现有 `84c7fff` 或其后继）定为新的精确复核基线，再做放行复核。后继提交的全门和 mutation 补充实证均成立，故方向成立，但它不能被静默视作 `d799d50` 的一部分。

### 基线与隔离方法

- 根仓 `.git` 对本环境只读，直接 `git worktree add` 被拒；我在 `.codex-tmp/review-12-2a2-repo.git` 建本地 bare clone，再从它创建 `15b3d90`、`d799d50`、`84c7fff` 的真实 detached worktree。mutation 只发生在这些隔离 worktree，未改共享树产品源码或常驻测试。
- 首轮 worktree 继承 Windows `core.autocrlf`，使按字节校验的 generated docs/manifest 出现假红；随后在该临时 clone 设 `core.autocrlf=false` 并重建 LF worktree。下表的 docs/manifest/verify 结论均取 LF 与 Git blob 一致的 worktree，不把 EOL 假红计为产品失败。
- `d799d50` 因模块缺失无法让 K1–K6 到达目标断言；K1–K6 另在补齐核心文件的 `84c7fff` 上逐刀实测，只用来回答测试强度与实现方向，**不替代严格基线裁决**。每刀后均还原；最终 `noteBlockLifecycle.ts` blob 为 `20c2804709b81037cc454e7d88f9c1d11d8aeff3`，`toolFaceReceipts.ts` blob 为 `e2ef847ff5c7d653293b375017050f18af89ff4f`，隔离树 `git diff --numstat` 与 `git status --short` 均为空，定向复跑 22/22。

### K1–K7 对抗结果

| 项 | reviewer 实测 | 结论 |
|---|---|---|
| K1 守卫放行 `'mcp'` | `84c7fff` 补充树：两条 killer 0/2。client-create 在常驻测试 `:848` 由预期 source-type 409 落到旧的 `Client create receipt identity mismatch`；cleanup 在 `:905` 落到 `Cleanup conflict receipt identity mismatch`。红点均是“本应在读取边界拒绝却继续下沉”，不是编译、fixture 或 API 缺失。 | **杀死**；两条各自红在相关拒绝断言。严格 `d799d50` 会先被缺模块阻断。 |
| K2 删除两处生产 guard call，helper 保留 | `84c7fff` 补充树：两条 killer 0/2，红点与 K1 相同。 | **杀死**；证明测试保护生产接线，不只保护 helper 字面。严格基线同样先被缺模块阻断。 |
| K3 只守一条 SELECT | 只删 cleanup 回读后的 guard：client-create 绿、cleanup 在 `:905` 红，1/2；只删 `readBatch()` guard：client-create 在 `:848` 红、cleanup 绿，1/2。 | **两条读取路径各有独立 killer，无缺口。** |
| K4 工具收据 INSERT 显式传 ISO `created_at` | `84c7fff` 补充树：immediate 测试 0/1，在 `:954` 期望 SQLite 默认 `YYYY-MM-DD HH:MM:SS`，实际为 ISO `2026-08-23T03:46:41.811Z`。 | **杀死；D-2 有常驻护栏，无新增缺口。** `d799d50` 无此 INSERT 位点。 |
| K5 propose 写成 `'applied'` | `84c7fff` 补充树：propose 测试 0/1，在 `:989` 期望 `proposed`、实际 `applied`。 | **杀死。** `d799d50` 无该生产位点。 |
| K6 revert 恒写 `complete` | `84c7fff` 补充树：partial 测试 0/1，在 `:1040` 期望 `partial`、实际 `complete`。 | **杀死；partial 可观察受护。** `d799d50` 无该生产位点。 |
| K7 03/05 指纹与 21/1 | `15b3d90..d799d50` 的 `noteBlockLifecycle.ts` 恰为 21/1；逐 hunk 分类见下节。`client/src/pages/Notes/canvasEngine` numstat 为 0，目标 diff 对 `applyBlockTextFlowEdit` / `rollbackBlockSlashSession` / recovery receipt 相关标识命中 0。 | **保护面未触及；无“其他”越界 hunk。** 但目标提交本身也没有收据 producer。 |

这些 mutation 位点由发单方点名、由 reviewer 在隔离 worktree 亲测，并分别瞄准已知漏径；符合 5-5 三要素。补充树最终还原与复绿，不以未还原 mutant 的偶然结果承重。

### 全门亲跑

| 门 | 严格 `d799d50` | 补充 `84c7fff`（不替代基线） |
|---|---|---|
| `npm.cmd run docs:check` | **exit 0** | **exit 0** |
| `npm.cmd run verify:v2-bn8-runtime` | **exit 1**；前置 unit/registry/manifest/parity/client build 等已绿，server build 在 `v2NoteBlockLifecycle.test.ts:18` 报 TS2307，缺 `../services/toolFaceReceipts.js` | **exit 0**（隔离资产目录） |
| client `npm.cmd exec -- tsc --noEmit` | **exit 0** | **exit 0** |
| server `npm.cmd exec -- tsc --noEmit` | **exit 1**；同一 TS2307 | **exit 0** |
| `npm.cmd run test:unit` | **exit 0，209/209** | **exit 0，209/209** |
| server `npm.cmd run test:v2`（隔离资产目录） | **exit 1，245/246**；唯一失败文件在装载期 `ERR_MODULE_NOT_FOUND`，该文件内测试未展开 | **exit 0，267/267** |
| noteBlockLifecycle 定向 | **exit 1，0/1**；装载期 `ERR_MODULE_NOT_FOUND` | **exit 0，22/22** |

另在洁净 `84c7fff` worktree 未设资产隔离变量跑默认 server 全套也是 **exit 0，267/267**。所以 Result 中的绿门数字与后继完整树相符，但不属于点名的 `d799d50` 提交树。

### 触及面与逐 hunk 归类

`git diff --numstat 15b3d90..d799d50` 只有四项：`tech-debt.md` 1/1、本文 Result 64/0、`v2NoteBlockLifecycle.test.ts` 223/0、`noteBlockLifecycle.ts` 21/1；**没有 `toolFaceReceipts.ts`**。

`noteBlockLifecycle.ts` 的 21/1 逐 hunk 为：

1. `recordLegacyPlacementCleanupConflict()` SELECT 后 `+6`：调用 source-type 守卫——**守卫**。
2. 新增共享私有 `assertNoteBlockLifecycleBatchSource()` `+12`——**守卫**。
3. `readBatch()` 将直接 `return` 改为局部 `batch`，`+1/-1`——**守卫接线所需 plumbing**。
4. `readBatch()` SELECT 后 `+2` 调 guard 再 return——**守卫**。

合计：守卫 21/1，收据轴 0/0，其他 0/0。测试文件的两个 hunk是 `+6` import 与 `+217` 测试体；后者恰为 2 条守卫 killer + 3 条收据轴测试，无 03/05 保护面测试改写。核心收据轴生产文件缺席不是“其他 hunk”，而是 BLOCKER-1 的交付缺件。

共享树 `client/.../useNoteCanvasRuntimeController.ts` 的 porcelain `.M` 是题述 EOL/stat 假阳性：目标 diff 的 client numstat 为 0，当前 `git diff --numstat` 也为空，过滤后的 blob 与 HEAD 都是 `3efe5f820e2077850611b54d4d09482845e89545`；未据 `.M` 误判越界。

### D-2、TD-6 与 Windows EPERM

- **D-2：口径正确，目标打包不完整。** 同一结构探针先在 `15b3d90`、`d799d50`、当前 HEAD 各命中 4 个生产 `operation_batches` INSERT 显式列 `created_at`，再扫工作树仍为同 4 个：`noteBlockLifecycle.ts` 三处、`sourceProjectionMaterializer.ts` 一处。阳性来自既有生产源码，不来自本 Review、Result 或测试 fixture。后继 `toolFaceReceipts.ts` 有 1 个 operation-batch INSERT，显式 `created_at` 命中 0；K4 也会把违规写法打红。Result 明写“本单未修既有四处，故全表仍混格式”，没有申报已统一。只是 `d799d50` 自身没有新工具写入文件，不能承载“新路径遵守默认”的交付事实。
- **TD-6：在工单边界内，不记 LOW。** 虽然“边界”段没有泛列 docs，本工单交付物第 4 项明确点名 `tech-debt.md` 及窄注内容；实际 diff 只把跨资源 revert 的 `complete|partial` 可观察、非原子承诺写回 TD-6，专项仍为“未清”。TD-8 也仍未清，没有被本单冒充解决。
- **Windows EPERM：确认是既有共享目录环境债，不是本单引入。** 共享树默认 server 全套复现为 exit 1，262/267，5 项均在 `server/uploads/canvas-assets/<uuid>` mkdir 报 EPERM；把 `15b3d90` 的资产变量显式指向同一共享目录也复现 exit 1，257/262、同 5 项；而洁净 `15b3d90` 默认目录为 262/262，洁净 `84c7fff` 默认目录为 267/267，隔离目录也为 267/267。TD 候选修法：测试默认使用每次运行独立的临时资产根并负责自身回收，或修复共享 `server/uploads` 的权限/残留状态；本项不计入本单分级。
- **机械锁事故只记事实、不判。** Result 所载事实为：mkdir 失败后 owner 写入覆盖，原 owner 不可恢复，builder 未删锁。本复核未读取、修改或删除 `.codex-tmp/builder.lock.d`；清理的只有 reviewer 自建且逐路径验明的 `review-12-2a2-*` worktree/bare clone。

### 5-2 跨条与下一状态扫描

- `sourceMaterialization.ts` 的最近 batch 查询先限定 `source_type='source_materialization' AND source_id=?`，再 `ORDER BY created_at DESC, id DESC LIMIT 1`。新 `'mcp'` 行在排序前已被 source_type 排除，故其 SQLite 默认时间格式不会参与该候选集；收据轴与该排序轴互不干扰。
- 当前生产代码没有 `toolFaceReceipts` 调用者，引用者只有该测试文件；`15b3d90..d799d50` 也没有 routes/transport/package diff。12.2a-3 仍是“先交方案短笺，不施工”，预告只含 stateless Express transport + `ping` + `resolve_selection`，不实装读/写业务工具。
- 下一 transport/执行层若按设计写收据，将消费/生成的边界字段是：认证上下文 `userId`、可选 `courseId`，请求 `callId`，registry 的 `tool/name`、有效 `tier`、`human_entry`，调用侧 `harness`、`inputDigest`，handler 的 `resources[]`；收据返回/后续推进会消费 `id`、`status`、`source_type/source_id`、metadata、三类时间戳，以及 revert 的 `outcome/details`。它不应靠 `created_at` 猜 source identity。
- registry 的 tier 允许 `confirm`，但 receipt writer 只接受 `immediate|propose`。这是 12.2a-3 必须显式处理的状态转移：按客户端 `input_required` 能力先把 confirm 解析为可执行/待确认状态，不支持时立即降为 propose，再调用 receipt writer；不得把 `confirm` 原样喂入，也不得在 writer 内静默降级。此项是下一单接口义务，不倒算成本单缺陷。
- `tools/list` 属 12.2b：必须消费同一忠实 manifest 的 `name/description/input_schema/output_schema/truth/tier/human_entry/exposure/scopes`，在列表层独立做 `exposure==='public'` 且剔除 `__` kind；不得把过滤搬回 generator，也不得另造目录。

### 5-1 完备性、范围排除与阴性对照

- 已取得用户点名的 K1–K7、两套精确提交树、全门、D-2、TD-6、EPERM、03/05 指纹与 5-2 跨条收据；没有把 builder 自报数字直接当 reviewer 结论。严格基线 K1–K6 因缺模块不能抵达目标断言，已显式标 N/A/阻断，并以 `84c7fff` 补充实证而非偷换基线。
- Spark UI 单前/单后百分比不在 CLI 可见范围，沿 Result 的明确申报作范围排除；本单没有 live MCP route/transport，故不启动 live MCP/server/browser 来冒充未落地链路的收据。human reachability、JWT/scope enforcement、12.2a-3 transport、12.2b `tools/list` 与真实业务回滚均不是本次 PASS 主张。
- 阴性探针均先过阳性：同一 D-1 探针在 `15b3d90` 的生产 `server/src` 命中 89 个既有 `operation_batch(es)` 字符串后，`findOperationBatch` 为 0；同一 D-2 结构探针先命中 4 个生产显式时间戳 INSERT 后，才断言工具 INSERT 为 0；同一 target-diff 探针先命中 `noteBlockLifecycle.ts` 21/1 后，才断言 client 保护面、db/routes/transport 与 package numstat 为 0。Git-object 探针先在 `84c7fff` 命中 `toolFaceReceipts.ts`，而在 `15b3d90`/`d799d50` 均不命中；命中者是后继提交写入的生产文件，不是 Result 里的文件名回显或 reviewer 自写文字。
- 未改产品代码、常驻测试、header 或 main；未 commit、push。所有 reviewer 临时 worktree 已删除，未触碰 builder lock。共享树唯一有意写入是本 `## Review`。
