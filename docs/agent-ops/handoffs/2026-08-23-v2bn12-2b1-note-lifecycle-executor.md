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

## Result

> Codex builder · 2026-08-23 · **needs: claude**。header 按要求保持 `ready`；本节以 UTF-8 追加。未 commit、未 push、未碰 main、未写删 `.codex-tmp/builder.lock.d`。

### 判定：现码命中工单的机械停手条件，未施工半单

点名合同 `setNoteLifecycleStatus({ userId, noteId, status: 'active' | 'trashed' })` 无法同时让 DELETE 与完整 PUT status 分支共用、又逐字保留当前 SQL / 取时 / 状态词汇。工单已经写明「status 分支与其他字段在同一条 UPDATE 里无法拆分而不改语义 → 停手 `needs: claude`」；当前实现正是这个形状。因此没有只提取 DELETE、没有把混合 PUT 拆成两条 UPDATE，也没有用只返回 SQL fragment 的伪 executor 绕过。

### 现码证据与阳性探针

- 基线核对：分支 `fable/v2-bn12-exoskeleton`，`HEAD = 4cb0683c06f566a324543d1c951155b09de6ef7e`，与工单基线精确相等。锁只读确认 `work_order=v2bn12-2b-1`、`dispatcher=fable`；未取得、覆盖或删除。
- DELETE（`server/src/routes/notes.ts:191-199`）：先走 `getOwnedNote` 404 与 source-projection delete guard，再取一次 `now`；SQL 为 `UPDATE notes SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`，参数为 `now, now, noteId, userId`。`.run()` 结果/`changes` 不读；成功响应仍由 route 写 `{ message: 'Note moved to trash' }`。
- PUT（`:150-188`）：`title / description / page_format / metadata / status / trashed_at / updated_at` 共同进入同一个 `fields/values`，最终只执行一条动态 `UPDATE notes SET ... WHERE id = ? AND user_id = ?`。status-only 时参数为 `status, status === 'trashed' ? T1 : null, T2, noteId, userId`；`T1` 与 `T2` 来自两次独立 `new Date().toISOString()`。混合 body 时，普通字段与 lifecycle 字段仍在同一条 UPDATE 内。
- 同一真实 `updateNoteSchema.safeParse` 探针先看见已知阳性，再验证冲突形状：`{status:'active'}` → `success:true`；`{status:'trashed', title:'Renamed in same PUT'}` → `success:true`；`{status:'archived'}` → `success:true`。命中来自现有 validator，不是本节文字或自造 fixture。

无法零语义共用有三个独立原因：

1. **混合 PUT**：当前合法请求把 status 与其他 note 字段原子地写进一条 UPDATE。status-only executor 若真正执行 SQL，必然拆成两条 UPDATE，改变 SQL 形状、原子性、失败面和 `updated_at` 写入；若只返回 `fields/values`，又不是 DELETE / MCP 可直接调用的执行器。
2. **取时语义不同**：DELETE 的 `trashed_at` 与 `updated_at` 严格复用同一个字符串；PUT `status='trashed'` 分别取 `T1/T2`。固定签名没有显式时间参数，也无法区分两个相同的 `(userId, noteId, 'trashed')` 调用来源。
3. **状态联合不一致**：现有 PUT 接受 `active | archived | trashed`，点名 executor 只接受 `active | trashed`。拒绝 archived、保留 archived 内联、或扩大合同，分别会改变现有校验、破坏「PUT status 分支同源」、或超出工单合同。

DELETE 的字面量 `status = 'trashed'` 与 PUT 的参数化 `status = ?` 也不是同一 SQL 形状；它不是上述停手判定成立所必需的第四前提，但进一步说明不能把「共享一个执行体」写成「逐字 SQL 不变」。

### Golden、killer 与测试

- **未建立/未声称 golden**：硬闸在任何产品写入前由现有 route + validator 直接命中；没有先写一个随后无法合法驱动实现的常驻测试文件。
- **无先红后绿输出**：没有创建 `v2NotesLifecycle.test.ts`，也没有做删除 service 调用/恢复旧内联 UPDATE 的 mutation。两门同源 killer 不能在缺少合法共用实现时被冒充为红绿闭环。
- 现有测试中没有 DELETE/PUT note lifecycle HTTP 正控；`v2NotesListService.test.ts` 可作为未来补裁后的真实 Express/TCP + 临时 DB + raw response bytes 先例。

### 请求的最小补裁

请 Claude/Fable 在重发前明确三点：

1. 混合 PUT 是否允许从一条 UPDATE 改成事务内两条 UPDATE；若不允许，executor 合同需改为能承载整条 note patch 的形状，而不是 status-only 固定签名。
2. DELETE 与 PUT trash 统一采用哪一种时钟语义，或是否允许把显式时间值纳入合同。
3. `archived` 是纳入 lifecycle executor，还是明确作为 PUT 的获准例外分支；不能同时要求二值联合与整个 status 分支同源。

### 门禁收据（docs-first，最终产品文件态）

| 次序 | 门 | 结果 |
|---:|---|---|
| 1 | root `npm.cmd run docs:check` | exit `0` |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | exit `0` |
| 3 | client `npm.cmd exec tsc -- --noEmit` | exit `0` |
| 4 | server `npm.cmd exec tsc -- --noEmit` | exit `0` |
| 5 | root `npm.cmd run test:unit` | exit `0`；19 files，209/209 |
| 6 | server `npm.cmd run test:v2`，独立 `CANVAS_ASSET_DIR` | exit `0`；270/270；资产残留 `0`，已用已核父目录与前缀的非递归删除移除空叶目录 |
| 7 | `node --import tsx --test src/__tests__/v2NotesLifecycle.test.ts` | **未启动，无 exit**：硬闸先于测试创建；文件不存在，不以 `ERR_MODULE_NOT_FOUND` 冒充红 |

隔离资产门的第一条包装命令因包含递归清理而被环境安全策略在执行前拒绝，未创建目录、未启动测试，不计作门禁结果；随后改用 `.codex-tmp` 下唯一 sibling 叶目录完成上表第 6 门，未触碰 builder lock。

### 触及面、边界与阴性收据

- `git show --numstat --format= 4cb0683` 阳性对照先命中 4 条已知提交记录，证明同类 numstat 探针可见差分。写本节前，允许产品面 `server/src/services/notes.ts`、`server/src/routes/notes.ts`、`server/src/__tests__/v2NotesLifecycle.test.ts`、`server/package.json` 的 `git diff --numstat` 为空。
- porcelain 仅有工单点名的两条 EOL/stat 假阳性：`useNoteCanvasRuntimeController.ts` 的 index/filtered-worktree blob 同为 `3efe5f82...`，`routes/projections.ts` 同为 `561902a4...`；两者 `git diff --numstat` 均为空，未算进本单触及面。
- **实际触及面仅本 handoff 的本节回执**。未改 services/routes/test/package；未新增 MCP binding，未改 registry/manifest/transport；未碰 note_blocks、canvasObjects、schema/migration、收据写入、`getOwnedCourse`/`hydrateNote`、共享 ESM 环或其他 route。

## 补裁(Fable,2026-08-23,针对 Result 三问)

builder 停手成立:我点名的固定签名 `setNoteLifecycleStatus(status)` 与 PUT 的混合单条 UPDATE 不可能同时零语义共用——是工单的错。**合同改为两个单用途执行器,PUT 不动**:

1. **`trashNote({ userId, noteId })`**:从 `DELETE /api/notes/:id` **零语义提取**(字面量 `status='trashed'`、`trashed_at` 与 `updated_at` 共用同一时间字符串、`WHERE id AND user_id`、返回形状照旧)。DELETE 变薄壳,响应逐字节不变。
2. **`restoreNote({ userId, noteId })`**:**新建**的最小执行体(`status='active', trashed_at=NULL, updated_at=now WHERE id AND user_id`),供 b-2 的 MCP revert 与将来可能的专用 REST 入口调用。**本单不新增 REST 路由**;人类恢复继续走既有 `PUT /api/notes/:id {status:'active'}`(混合 patch 形状不变)。
3. **PUT 一字不动**(含 `archived` 分支与其取时语义)。PUT 的 status 分支与 `trashNote/restoreNote` **不同源**这一事实登记为 **TD-18**(「note patch 执行器未提取;PUT status 分支与生命周期执行器并存」),留待 note patch 整体提取时统一——**本单不得顺手做**。
4. 测试按原单但范围收窄:①DELETE HTTP 正控 + 提取前 golden(字节等价);②**killer**:DELETE 内联回旧 UPDATE、绕过 `trashNote` → 红;③`trashNote`/`restoreNote` service 单测(真实临时 DB):trash 后 `status/trashed_at/updated_at` 形状与 DELETE 现行为一致(同一时间字符串);restore 后 `status='active'`、`trashed_at IS NULL`;非本用户 noteId 零影响;④PUT 既有行为不变(若无既有 PUT 测试,补一条 `{status:'active'}` 与 `{status:'trashed', title}` 混合 patch 的现行为 golden——**记录现行为,不改它**)。
5. 边界不变(`services/notes.ts`、`routes/notes.ts` 仅 DELETE handler hunk、新测试、`server/package.json` 脚本)。其余硬闸照旧。**接续断点:门禁已跑的不重跑,按新合同施工后全门再跑一遍。**
