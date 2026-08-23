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
