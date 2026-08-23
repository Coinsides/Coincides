> from: claude(fable,上将军代发——Opus 调度会话阻塞;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;设计:plans/v2-bn12-2b-first-write-tool-and-review-queue.md b-1,Fable 点名 log 08-23 #14) | re: v2bn12-2b-1 | date: 2026-08-23

# V2.BN.12.2b-1:note 生命周期执行器提取(零语义)—— 一个执行体,三道门

## 定位(b-1 核实结论,Fable 用 CodeGraph/grep 亲核后点名)

- **门**:`DELETE /api/notes/:id`(`server/src/routes/notes.ts:191-199`)= 软删:单条 `UPDATE notes SET status='trashed', trashed_at=?, updated_at=? WHERE id=? AND user_id=?`,逻辑内联,**无 service、无收据、无 HTTP 测试**。恢复 = `PUT /api/notes/:id` 的 status 分支(`:165-168`:`status = ?` + `trashed_at = (status==='trashed' ? now : null)`)。
- **有 route ≠ 有 executor**:当前没有任何函数可供 MCP binding 调用。本单把这一个执行体提取出来,供 REST DELETE、REST PUT 的 status 分支、将来的 MCP binding(b-2)三道门共用。

## 交付物(单项)

`server/src/services/notes.ts`(S1a 已建,同一文件)新增 **`setNoteLifecycleStatus({ userId, noteId, status: 'active' | 'trashed' })`**:
- **零语义提取**:SQL、`trashed_at` 取值规则、`updated_at` 写法、`WHERE id AND user_id`、未命中时的行为(现为?——按现码逐字,**不得顺手改进**:不加不存在的校验、不改返回形状)。返回值以现 DELETE/PUT 调用方所需为准(如 `changes` 数或行),**不为 b-2 预留额外字段**。
- `DELETE /api/notes/:id` → 薄壳:调 `setNoteLifecycleStatus(..., 'trashed')`,响应**逐字节不变**(`{ message: 'Note moved to trash' }` 等)。
- `PUT /api/notes/:id` 的 status 分支 → 委托同一函数;**其余字段更新逻辑一字不动**;若该分支与其他字段在同一条 UPDATE 里无法拆分而不改语义 → **停手 `needs: claude`**,写明原因(不要为了拆而改 SQL 形状)。
- 常驻测试(`server/src/__tests__/v2NotesLifecycle.test.ts`,真实 Express + 临时 DB):①DELETE 正控(前无测试——先写,记录现行为即 golden);②PUT status→active 恢复正控;③**killer**:删掉 route 对 `setNoteLifecycleStatus` 的调用、内联旧 UPDATE → 对应测试须红(测「两门同源」);④响应字节 golden 提取前后等价(提取前先建 golden);⑤service 单测:trashed/active 两向 + 非本用户 noteId 不受影响。先红后绿两段输出入回执。

## 硬闸
- ⛔ 零语义:校验/默认值/SQL/返回形状一处不改;不加收据写入(收据归 MCP dispatch 层,b-2);不碰 note_blocks/canvasObjects 的 trash 逻辑(那是别的表的执行体,不在本单)。
- ⛔ 不新增 MCP binding、不改注册表/manifest、不碰 transport。
- ⛔ 不得搬走 `routes/notes.ts` 内被多处共用的私有 helper(`getOwnedCourse`/`hydrateNote`),只复用(同 S1a)。
- 越界/无法零语义 → 停手 `needs: claude`。

## 边界(触及面申报)
允许:`server/src/services/notes.ts` · `server/src/routes/notes.ts`(仅 DELETE handler 与 PUT status 分支两个 hunk)· 新测试文件 · `server/package.json`(如需加测试脚本)。其余禁区。

## D 段(`adjudication §7`,含反面分则)+ 锁纪律
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts` porcelain `.M` 为 EOL 假阳性。`.codex-tmp/builder.lock.d` 非你所有,只读确认,不写不删。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ 新测试单跑。逐门 exit 入表。回执 **UTF-8** 追加 `## Result`(写 Result 是交付一部分,不需确认);含先红后绿、golden 前后、`git diff --numstat` 对照边界、显式范围排除;header 保持 `ready`;不 commit、不 push、不碰 main。
