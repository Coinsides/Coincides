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
