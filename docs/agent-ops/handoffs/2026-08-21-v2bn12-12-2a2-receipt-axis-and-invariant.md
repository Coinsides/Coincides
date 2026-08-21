> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready(开工条件:12.2a-1 闭环后;builder 档位=Spark 实测单,若不可用则 5.6) | re: v2bn12-12.2a-2 | date: 2026-08-21

# V2.BN.12.2a-2:收据轴扩展('mcp' / 'proposed')+ 消费方不变式守卫(单交付物)

## 上游与定位

设计稿 v0.4 §2.2(已拍板)+ Review-1 ①/①-b。本单只做**收据轴**:让 `operation_batches` 能安全承载工具面收据,并把「非 mcp 消费方不得解引用 mcp 批次」从命名空间巧合变成**声明不变式**。零 MCP、零工具实现。

## 交付物(单项)

1. `server/src/services/toolFaceReceipts.ts`:`writeToolFaceReceipt({userId, courseId?, callId, tool, tier, harness, inputDigest, humanEntry, resources[]})` → 写一行 `operation_batches`,`source_type='mcp'`,`source_id=callId`,`status` 由 tier 决定(`immediate`→`applied`;`propose`→`proposed`);`metadata` 携 tool/tier/harness/input_digest/human_entry/resources。`markToolFaceReceiptApplied(id)` / `revertToolFaceReceipt(id, {outcome:'complete'|'partial', details})` —— **revert 只写收据状态与 `revert_outcome`,不执行业务回滚**(业务回滚归各工具,且跨资源不承诺原子:设计稿 §2.2)。
2. **不变式守卫**:`noteBlockLifecycle.ts` 经 `findOperationBatch(id)` 的路径(Review-1 指出的 :390/:951 一带)加 `source_type` 守卫——仅接受该服务自己的取值(`client_note_block_create` 等),遇 `'mcp'` 批次 fail closed 为明确错误(非静默非误判 applied)。
3. 测试(RED 先行):a)写 immediate 收据→status applied;b)写 propose 收据→status proposed;c)revert 写 `revert_outcome:'partial'` 可观察;d)**killer**:把一条 `'mcp'/'proposed'` 批次 id 喂给 noteBlockLifecycle 的 findOperationBatch 路径→必须拒绝(改回无守卫时该测试红);e)既有 noteBlockLifecycle 16/17 项测试零回归。
4. `tech-debt.md`:TD-6 行补注「工具面跨资源撤销以 revert_outcome 可观察,原子性待本专项」。

## 边界

schema 零改动(新 status 值属词汇扩展);不碰 routes/transport;不碰 03/05 保护面(仅 noteBlockLifecycle 守卫一处,逐 hunk 申报)。

## 验证与回执

server 全套(262+新增)/ noteBlockLifecycle 定向 / 双 tsc / verify 链。## Result 追加进本文件,回执措辞不得宽于实现;附 Spark 单前/单后读表。不自评 PASS,不 commit。
