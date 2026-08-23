> from: claude(fable,上将军代发——Opus 调度会话阻塞;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;设计:plans/v2-bn12-2b-first-write-tool-and-review-queue.md §2 b-2/§3/§7 + design §12;log 08-23 #22) | re: v2bn12-2b-2b-1 | date: 2026-08-23

# V2.BN.12.2b-2b-1:第一个写工具 `trash_notes`(immediate / propose 两档端到端;confirm 本单一律降 propose)

## 定位

12.2a 立了门,b-1/b-2a 给了执行器(`trashNote`/`restoreNote`)与人类门(DELETE + `CourseDetail.tsx#handleTrashNote`;`POST /notes/:id/restore`)。本单让 Agent **经同一道门、同一执行体**写一次真相,按 Henry 阈值规则(design §5.3):**n==1 → immediate(立即执行 + `applied` 收据,可撤);n>1 → confirm(本单:客户端能力无论如何 → 降 `propose`:写 `proposed` 收据、零执行,等 b-3 人审)**。MRTR `input_required` 往返归 **b-2b-2**,本单不做。

上游(只指针):plan §2 b-2、§3(裁定 1/2/4)、§7;design §12 D-e(降级谓词)、§3.1 补注(manifest 忠实投影);12.2a-2/a-3 的收据与 transport seam;b-1 §补裁(执行器合同);b-2a Review 5-2(`handleTrashNote` 已经 parity 探针正控)。

## 交付物(单项,七个连动面,一次交付)

1. **注册表可选字段 `threshold`**:`shared/types/toolFaceManifest.ts` 的 `ToolFaceManifestEntry` 与 `server/src/toolFace/registry.ts` 的 `ToolRegistryEntry` 各加**可选** `threshold?: { batch_field: string }`;生成器 `buildToolFaceManifest` **忠实投影**(有则原样带出,无则不出现该键);`docs/generated/tool-face-manifest.json` 重生成;现有 freshness/忠实投影测试加一条「threshold 原样投影」正控;parity 门不读此字段(不改 parity 脚本)。
2. **注册表新条目 `trash_notes`**:`input_schema = z.object({ note_ids: z.array(z.string().uuid()).min(1).max(50) }).strict()`;`output_schema = z.object({ results: z.array(z.object({ note_id: z.string().uuid(), outcome: z.enum(['trashed','missing']) }).strict()) }).strict()`;`truth:'content'`;`tier:'confirm'`(上限档);`threshold:{ batch_field:'note_ids' }`;`human_entry:{ route:'DELETE /api/notes/:id', client_call_site:'client/src/pages/Courses/CourseDetail.tsx#handleTrashNote' }`;`exposure:'public'`;`scopes:['notes:write']`(**描述性,TD-14**)。`check:tool-face-parity` 须对它正控绿(1c 门已验该调用点)。
3. **policy 按入参降档**:`resolveEffectiveTier(entry, envelope, input)`(签名扩为带 entry 与 input):若 `entry.tier==='confirm'` 且 `entry.threshold` 存在且 `input[batch_field]` 为长度 1 的数组 → `immediate`;若仍为 `confirm` → 按既有 `supportsFormElicitation` 降 `propose`;**本单额外**:即使 `supportsFormElicitation` 为 true,`confirm` 也降 `propose`(写死一句注释「b-2b-2 接 MRTR 前的声明性降级」,并有测试锁住)。规则只住 `policy.ts`,**不在 handler/binding 里写工具名表**。`dispatchToolCall` 改为传 `entry` 与 `input` 调用新签名;`list_notes` 行为不变(无 threshold → 原样)。
4. **执行器返回 `{ changes }`**:`trashNote`/`restoreNote` 返回 `{ changes: number }`(better-sqlite3 `.run().changes`),**SQL/取时/WHERE 一字不改**;DELETE/restore 薄壳忽略返回;b-1 的 golden 与 killer 必须复跑仍绿(返回值变化不改响应字节)。
5. **binding `trash_notes`**(`server/src/mcp/bindings.ts`):逐 id 调用 `trashNote({ userId, noteId })`,`changes===1 → 'trashed'`,`0 → 'missing'`(不存在/非本用户/已在回收站三者当前都是 `changes` 0 或 1——按实测归类并在回执写明「已在回收站」的实际 `changes` 值,**不得为它发明第三种 outcome**);不做事务(每条独立,与人手逐条删同门);返回 `{ results }`。
6. **收据**:`dispatchToolCall` 的 immediate 路径把 `resources` 写为 `results.map(r => ({ kind:'note', id:r.note_id, outcome:r.outcome }))`;`propose` 路径写 `resources` 为 `note_ids.map(id => ({ kind:'note', id, outcome:'pending' }))`;**两路径都**写 `metadata.intended_input`(原样 input JSON)——`ToolFaceReceiptMetadata` 加可选 `intended_input?: Record<string, unknown>`,`WriteToolFaceReceiptInput` 相应加可选字段(**词汇/字段扩展,schema 零改动**)。`input_digest` 照旧。
7. **revert service**:`server/src/services/toolFaceReceiptRevert.ts`(新)`revertTrashNotesReceipt({ userId, receiptId })`:只接受 `tool==='trash_notes'` 且 `status==='applied'` 的本用户收据,对 `resources` 中 `outcome==='trashed'` 的每个 id 调 `restoreNote`,按 `changes` 统计;全部成功 → `revertToolFaceReceipt(id, { outcome:'complete', details:{ restored:[...] } })`;部分失败 → `'partial'` + `details:{ restored, failed }`;**本单不开 REST/MCP 门**(门归 b-3,声明);service 单测覆盖 complete/partial/非本用户/非 applied 拒绝。

## 硬闸
- ⛔ 过滤只在 `tools/list`(既有);生成器不过滤;不在 transport 造 schema/白名单/内存状态;不碰 Host/Origin/auth 段;不动 PUT(TD-18);不改 `routes/notes.ts` 除非 `{changes}` 返回需要(薄壳忽略返回即可,**应为零改动**)。
- ⛔ 不实现 `input_required`/elicitation(b-2b-2);不建 REST `tool-receipts` 路由与队列页(b-3)。
- ⛔ 零语义:执行器 SQL 不改;`list_notes` 行为与测试不改(除 policy 签名适配)。
- 越界/需新接缝 → 停手 `needs: claude`。

## 必红判据(builder 前置自查;终判归 reviewer;每刀记红在哪条断言)
- K-b0 **真实 HTTP `tools/call trash_notes`,n==1**:note 进回收站(DB `status='trashed'`)+ `applied` 收据(`resources` 1 条 trashed、`intended_input` 原样);binding 改 no-op → 红。
- K-b1 **n>1,客户端不宣告能力**:`proposed` 收据、`applied_at=NULL`、**零执行**(DB 未变);把 policy 改成不降档 → 红。
- K-b2 **n>1,客户端宣告 `elicitation.form`**:本单仍 `proposed`(声明性降级);删掉该降级 → 红。
- K-b3 **n==1 降档规则**:删除 threshold 降档 → K-b0 路径变 proposed → 红。
- K-b4 **threshold 忠实投影**:生成器丢掉 threshold → 投影测试红;manifest 过期门红。
- K-b5 **binding 绕过执行器**(内联 UPDATE)→ 红(同源 killer)。
- K-b6 **resources 与 results 不一致**(少写一条)→ 红。
- K-b7 **revert**:complete 路径 2 篇恢复;partial 路径(一篇已被人手恢复 → `changes` 0)→ `partial` + details;恒写 complete 的 mutation → 红;非本用户/非 applied → 409/403 类拒绝。
- K-b8 **parity 门**对 `trash_notes` 正控绿;把 human_entry 的 client_call_site 改成不构造 DELETE 的符号 → parity 红(用真实 `check:tool-face-parity`)。
- b-1/S1a/b-2a 既有 killer 与 golden 全部复跑仍绿。

## 边界(触及面申报)
允许:`shared/types/toolFaceManifest.ts` · `server/src/toolFace/registry.ts` · `scripts/generate-tool-face-manifest.ts` 及其测试 · `docs/generated/tool-face-manifest.json` · `server/src/mcp/{policy,bindings,transport}.ts` · `server/src/services/notes.ts`(仅返回值)· `server/src/services/toolFaceReceipts.ts`(可选字段)· 新 `server/src/services/toolFaceReceiptRevert.ts` · 新/既有 server 测试 · `server/package.json`(测试脚本)。其余禁区(含 `routes/*`、client、schema/migration、parity 脚本)。

## D 段(`adjudication §7`,含反面分则)+ 锁纪律
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts` porcelain `.M` 为 EOL 假阳性。`.codex-tmp/builder.lock.d` 非你所有,只读确认。`.run()` 实参侧:任何 INSERT/UPDATE 改动须核列数==占位符==实参数。

## 验证与回执
门禁 docs-first:`docs:check` → `docs:tool-face-manifest`(重生成)→ `verify:v2-bn8-runtime`(含五道 tool-face 门)→ client/server `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:mcp-artifact` → 新专项。逐门 exit 入表。回执 **UTF-8** 追加 `## Result`(不需确认):K-b0…K-b8 各一段先红后绿、「已在回收站」实测 `changes` 值、`git diff --numstat` 对照边界、显式范围排除;header 保持 `ready`;不 commit、不 push、不碰 main、不碰锁。

## Result

> Codex builder · 2026-08-23 · **needs: claude**。header 按要求保持 `ready`；本节为 UTF-8 追加回执。未 commit、未 push、未碰 main、未写删 `.codex-tmp/builder.lock.d`。

### 判定：K-b7 与执行器零语义合同不能同时成立，按硬闸停手

- 已按指定顺序读完工单、总计划 §2 b-2 / §3 / §7、design §3.1 补注与 §12 D-e / 补裁三项、12.2a-3 第三节 Result、b-1 §补裁、handoff README Builder 规则 1–3、adjudication §7；并补齐 Agent 开工权威链。
- 当前分支/基线精确为 `fable/v2-bn12-exoskeleton @ 3b2b811`。共享树两个 porcelain `.M` 的 worktree/index blob 逐位相同，确为工单点名的 EOL/stat 假阳性；未触及。
- 在写 RED 或产品代码前，现码证明下列三项互斥：
  1. 交付物 4 要求 `restoreNote` 只把现有 `.run()` 的返回改投影为 `{ changes }`，且 SQL、取时、`WHERE id = ? AND user_id = ?` **一字不改**；
  2. 交付物 7 要求对每个 `outcome==='trashed'` 的 resource 调 `restoreNote`，并只按其 `changes` 统计 complete/partial；
  3. K-b7 要求一篇已由人手恢复为 active 的 owned note 在随后 revert 中得到 `changes=0`，从而判 `partial`。
- 现有 `restoreNote` 每次都匹配 owned row，并写 `status='active', trashed_at=NULL, updated_at=?`；它既无前态谓词，又会刷新 `updated_at`。因此已 active 的 owned row 仍是 `changes=1`，不能产生 K-b7 指定的 partial。

### 阳性对照与实测

使用仓库当前 `better-sqlite3`、`:memory:` 表和生产 SQL 字面量实测；先以已知会命中的状态迁移证明探针看得见，再测反例：

| 生产 SQL 形状 | 前态 / 所有权 | `.run().changes` |
|---|---|---:|
| `restoreNote` | owned `trashed → active`（阳性） | 1 |
| `restoreNote` | owned `active → active`，新时间 | **1** |
| `restoreNote` | owned `active → active`，连时间也相同 | **1** |
| `trashNote` | owned `active → trashed`（阳性） | 1 |
| `trashNote` | owned **已在回收站** | **1** |
| `trashNote` | missing / foreign | 0 / 0 |

故本工单要求回执的「已在回收站」实际值为 **`changes=1`**。K-b7 的 0 只会来自当前 `WHERE` 不匹配（missing / foreign / hard-deleted），不会来自「已人手恢复但仍属本用户」的 note。

### 同一现码审计另见两处未闭合接缝

1. **Agent 路径会绕过人类 DELETE 的 source-projection 守卫。** 人类路径当前是 `getOwnedNote → assertSourceProjectionNoteContentWriteAllowed(..., 'delete_note') → trashNote`；工单点名的 binding 则只直调 `trashNote`。后者只含 UPDATE，不含该 409 read-only guard。因此 owned `source_projection` note 会在人类 DELETE 被拒绝、在 MCP binding 却被软删，与本单「同一道门」前提不符。把 guard 下沉到 canonical executor、或在 binding 复写这段编排，都超出“`services/notes.ts` 仅返回值 / binding 逐 id 直调”的现合同；前者还需裁定 route 的重复 guard 是否移除（`routes/*` 当前禁改）。
2. **`changes` 不能证明本次调用造成了 trash，revert 会撤错状态。** 上表已证 owned、调用前就 trashed 的 note 仍返回 1；按交付物 5 它会被记为 `outcome:'trashed'`，按交付物 7 随后会被恢复 active。也就是 receipt 会把用户原先已在回收站的状态冒充为本次工具影响，再把它撤销。若不允许 `trashNote WHERE ... AND status='active'`，就需要前态/因果收据 seam；现工单既未定义该 seam，又要求不得发明第三种 outcome。

这两项即使把 K-b7 的 partial fixture 改成 missing 也仍存在，故补裁不能只改一条测试文字。

### 请求的最小补裁（三选一，builder 不代拍）

1. **允许收窄执行器语义**：把 `restoreNote` 的 `WHERE` 加上 `AND status='trashed'`，并明确接受已 active 时不再刷新 `updated_at`；这能让 K-b7 原 fixture 成立，但直接放宽了“SQL/WHERE 一字不改”硬闸。
2. **保持执行器零语义**：把 K-b7 partial 的真实 fixture 改为 receipt resource 在 revert 前 missing / foreign / hard-deleted；同时正式承认「已人手恢复」会返回 1，本版按 changes 仍计 restored/complete。
3. **新增前态机关**：授权 revert service 在调用前读取 lifecycle/ownership，并裁定已 active 的分类、是否仍须逐 id 调 `restoreNote`、以及 SELECT→UPDATE 的竞态/事务边界；这会新增工单目前未定义且与“只按 changes”不同的 seam。

另请同时点名 source-projection guard 的唯一归属，以及 already-trashed resource 是否允许进入可撤资源集；否则 builder 无法在不造平行机关的前提下满足「同门同钥 + 可撤」。

### 未执行项、触及面与验证边界

- 按“越界/需新接缝 → 停手 `needs: claude`”，未做七个连动面，未改 registry/manifest/policy/binding/transport/notes/receipt service，未新建 revert service 或测试，未重生成 manifest；K-b0…K-b8 因合同未闭合而没有伪造先红后绿收据。
- 十门产品验证未启动：没有产品实现可验，且 docs-first 链不应被冒充为交付绿。停手后只需对本回执做 UTF-8、`docs:check`、`git diff --check` 与触及面核验。
- 显式范围排除保持：未做 MRTR / `input_required` / elicitation、未开 REST `tool-receipts` 路由或队列页、未碰 Host/Origin/auth、PUT、`routes/*`、client、schema/migration、parity 脚本、锁或 main。

### 写后核验

| 检查 | 结果 |
|---|---|
| UTF-8 fatal decoder | exit `0`，`UTF8_OK` |
| root `npm.cmd run docs:check` | exit `0` |
| `git diff --check` | exit `0`；只报告工单已知的 CRLF 工作树提示，无 whitespace error |
| `git diff --numstat -- <本工单>` | `60  0`；唯一真实 diff 为本回执 |
| header / branch / lock | `status: ready`；仍在 `fable/v2-bn12-exoskeleton`；锁 owner 只读、未改 |

## 补裁(Fable,2026-08-23;针对 Result 的互斥三项与两处接缝——builder 停手正确,是工单的合同错)

**根因**:我把「执行器」定义成裸 UPDATE(`trashNote`),而人类 DELETE 的真正执行序列是 `getOwnedNote → assertSourceProjectionNoteContentWriteAllowed(...,'delete_note') → trashNote`。裸 UPDATE 既绕过守卫(接缝 1),又无法承载因果(接缝 2:已在回收站仍 `changes=1`)。**执行体 = 整段编排,不是最后那条 SQL。**

1. **canonical 执行器升一层**:`server/src/services/notes.ts` 新增 `trashNoteAsUser({ userId, noteId })` 与 `restoreNoteAsUser({ userId, noteId })`:
   - `trashNoteAsUser`:`getOwnedNote`(未命中 → `{ outcome:'missing' }`)→ 若 `status==='trashed'` → `{ outcome:'skipped', reason:'already_trashed' }`(**不再调 `trashNote`,不重盖 trashed_at**)→ `assertSourceProjectionNoteContentWriteAllowed(db, userId, noteId, 'delete_note')`(抛 409 → 捕获为 `{ outcome:'skipped', reason:'read_only_projection' }`,**守卫唯一归属 = 此执行器**)→ `trashNote` → `{ outcome:'trashed' }`。
   - `restoreNoteAsUser`:`getOwnedNote`(未命中 → `missing`)→ 若 `status==='active'` → `skipped/already_active`(不调 `restoreNote`,不刷新 updated_at)→ `restoreNote` → `restored`。
   - 裸 `trashNote`/`restoreNote` **SQL 一字不改**,仍返回 `{ changes }`(交付物 4 不变),但只被上述编排调用。
2. **人类门改走同一编排**(这是一次**声明的语义收敛**,不是零语义):`DELETE /api/notes/:id` → `trashNoteAsUser`;`POST /notes/:id/restore` → `restoreNoteAsUser`。响应:`missing` → 404(与现行为一致);`skipped/read_only_projection` → 409(与现 DELETE 一致,守卫现在住执行器);**`skipped/already_trashed` → 200 `{ message:'Note moved to trash' }`(现行为会重盖 trashed_at,本单起幂等、不重盖——在回执与测试里明写,b-2a golden 若覆盖此例须按新语义更新并申报)**;`already_active` 对 restore 同理 200。`getOwnedNote`/守卫函数若在 route 文件内为私有,**导出复用**(S1a 先例),不复制。
3. **outcome 词汇(拍死)**:`'trashed' | 'skipped' | 'missing'`,`skipped` 附 `reason: 'already_trashed' | 'read_only_projection'`;restore 侧 `'restored' | 'skipped'(already_active) | 'missing'`。输出 schema 与收据 `resources` 用同一词汇。
4. **因果收据**:只有 `outcome==='trashed'` 的资源进可撤集合;`skipped`/`missing` 入 `resources` 留痕但 revert 不碰。
5. **revert 判定**:对每个 `trashed` 资源调 `restoreNoteAsUser`:`restored` 与 `skipped/already_active`(人手已恢复)都算**成功**;`missing`(已硬删/失联)算失败。全部成功 → `complete`;有失败 → `partial`。**K-b7 的 partial fixture 改为「一篇在 revert 前被硬删/失联」**;「已人手恢复」作 complete 的正控(新增一刀:把 already_active 误计为失败 → 红)。
6. **竞态**:SELECT→UPDATE 不开事务,与人类门同形;记录态,不在本单处理(TD 候选由复核判)。
7. **触及面追加**:`server/src/routes/notes.ts`(DELETE 与 restore 两 hunk,改调编排)· `services/notes.ts`(两个编排函数 + 导出复用守卫/`getOwnedNote` 若需)· b-2a 的 `v2NotesLifecycle` 测试按新语义更新(申报每条改动理由)。其余边界不变。**接续断点**:七个连动面按本补裁实施。

## Result — 续跑

### 判定与基线

- **完成,无需 `needs: claude`。** 七个连动面已按 `§补裁` 闭合,K-b0…K-b8 均有定向 RED→恢复 GREEN 证据,docs-first 十门全为 exit 0。
- 施工基线与写后 HEAD 均为 `afc91f25fd1b873785f47c86d8e8b90a828901f9`,分支始终为 `fable/v2-bn12-exoskeleton`;未 commit、未 push、未切/碰 `main`。
- header 仍为 `status: ready`;`.codex-tmp/builder.lock.d/owner.json` 仅只读核验,owner 内容未改。

### 七个连动面

1. `ToolFaceManifestEntry` / `ToolRegistryEntry` 增加可选 `threshold`;生成器用 conditional spread 忠实投影,无 threshold 的 `list_notes` 不产生 own key;generated manifest 已重生成。
2. registry 增加 public `trash_notes`:严格 1…50 UUID 输入、`confirm` 上限档、`note_ids` threshold、既定 human entry / scope;输出按补裁固定为 `trashed | skipped(reason) | missing`。
3. `resolveEffectiveTier(entry,envelope,input)` 只按声明的动态 `batch_field` 判断:长度恰为 1 → `immediate`;其余 confirm 无论有无 `elicitation.form` 都按注释“b-2b-2 接 MRTR 前的声明性降级”落 `propose`;没有工具名表。
4. 裸 `trashNote` / `restoreNote` 的 SQL、取时、WHERE、`.run()` 实参数量均未改,只回投 `{ changes }`;新增 canonical `trashNoteAsUser` / `restoreNoteAsUser`,窄捕获 owned-note 404 与指定 projection 409,其他异常重抛。
5. 人类 DELETE / restore 薄壳改调同一 AsUser 编排;binding 对 `note_ids` 逐项调用 `trashNoteAsUser`,无事务,返回原顺序 `{ results }`。
6. transport 的 immediate 收据从真实 `results` 全量投影 causal resources,propose 收据从 threshold batch 输入投影 pending resources;两路原样写 `intended_input`,响应继续带 canonical receipt pointer。`readToolFaceReceipt` 仅改为导出复用,未复制第二套 receipt SELECT / hydration。
7. 新 `revertTrashNotesReceipt`:先按 owner→tool→applied 校验,只撤 `outcome==='trashed'`;`restored` 与 `skipped/already_active` 均计成功,`missing` 计失败,再写 complete / partial 及 `{ restored, failed }`。

真实 2026 HTTP 另暴露一个 SDK adapter seam:注册了 `outputSchema` 的非错误响应必须带 `structuredContent`;否则 proposed receipt 已落库后 SDK 仍会把 HTTP 响应改成 error。因此 `trash_notes` proposal 返回 schema-valid `{ results: [] }`,明确表示“零执行”;意图仍只在 pending resources / `intended_input` 中。该投影按 threshold 结构触发,没有 transport tool-name switch、白名单或内存状态。

### 声明的语义收敛与 b-2a 测试适配

- 新增“已 trashed 再 DELETE”HTTP golden:仍是 200 与原字节 `{"message":"Note moved to trash"}`,但整行(含 `trashed_at` / `updated_at`)不变。理由:补裁明确把人类门收敛为 canonical 幂等编排,不得再重盖时间。
- 新增“已 active 再 restore”HTTP golden:仍是 200 与原字节 `{"message":"Note restored"}`,整行不变。理由:同一补裁要求 `already_active` 短路且不刷新时间。
- DELETE / restore 的两个结构 killer 从裸 SQL 执行器改锁 AsUser 编排,并禁止 route 再前置 `getOwnedNote`、projection guard、裸 executor 或 SQL。理由:补裁把“执行体”升为整段编排且守卫唯一归属在该编排。
- 裸 executor 的既有 `void` 断言改为 `{ changes:1|0 }`;另锁住 owned already-trashed 的裸 `trashNote` 与 owned already-active 的裸 `restoreNote` 实测仍为 `{ changes:1 }`。理由:交付物 4 只改变返回投影,不改变 SQL 语义。
- `v2NotesListService` 的 import killer 只从“必须是唯一 named import”放宽为“同一 import 中必须含 `listNotes`”。理由:`bindings.ts` 现在合法地从同一 canonical service 另引 `trashNoteAsUser`;`list_notes` 调用、返回与测试语义未改。

特别记录:裸 `trashNote` 对调用前已在回收站、且为本用户的 row 实测 **`changes=1`**;canonical `trashNoteAsUser` 会先判 `already_trashed`,不调用裸 SQL,对 MCP 记 `skipped/already_trashed`,对人类门保持原 200 响应且不改时间。裸 `restoreNote` 对 already-active owned row 同样仍为 `changes=1`,canonical 编排短路为 `skipped/already_active`。

### K-b0…K-b8 定向 RED→GREEN

- **K-b0:** 临时把 binding 改为 no-op / 全报 `missing`,真实 HTTP n=1 在 `structuredContent.results[0].outcome` 处红(`expected trashed, actual missing`,exit 1);恢复逐项 AsUser 后同探针 1/1 绿,DB trashed、applied receipt、causal resource、原样 `intended_input` 与 pointer 全锁。另有真实 HTTP 正控锁 `already_trashed`、`read_only_projection`、`missing` 三种留痕与零伪副作用。
- **K-b1:** 临时取消无 form 的 propose 降级(返回 confirm),真实 HTTP n>1 得 `isError:true` 而在“应为正常 proposal”断言红(exit 1);恢复后 1/1 绿,两篇 `status/trashed_at/updated_at` 全不变,receipt proposed 且 `applied_at=NULL`。
- **K-b2:** 保留 capability 探测但临时删最后的声明性降级(有 `elicitation.form` 时返回 confirm),真实 HTTP 同样在 `isError` 断言红(exit 1);恢复后 1/1 绿。此 mutation 证明 form capability 确实经 HTTP envelope 到达 policy,不是旁路单测假绿。
- **K-b3:** 临时把长度 1 threshold 分支改为 propose,policy 探针红(`expected immediate, actual propose`,exit 1);恢复后 1/1 绿。另用 synthetic `probe_ids` threshold 锁动态字段,硬编码 `note_ids` 也会红。
- **K-b4:** 临时删除生成器 threshold spread,忠实投影在 present-own-key 处红(`false !== true`,exit 1),真实 freshness 门同时以“过期 manifest” exit 1;恢复后 unit 1/1 与 freshness exit 0。
- **K-b5:** 临时把 binding 改成真实内联 `UPDATE notes`,同源 killer 在缺少 `trashNoteAsUser` 调用处红(exit 1),且另有 `.prepare` / `UPDATE notes` 阴性断言;恢复后 1/1 绿。AsUser catch 另有 404/status/message、409/code 与 unexpected rethrow 结构护栏。
- **K-b6:** 临时只投影第一条 applied resource,dispatch-level n=2 探针红(`expected 2 resources, actual 1`,exit 1);恢复后 1/1 绿,resources 与真实 binding results 按序逐项完全一致。这里按工单是 dispatch seam,不冒充真实 HTTP。
- **K-b7:** (a) partial fixture 按补裁使用 revert 前硬删一篇;临时恒写 complete 时红(`expected partial, actual complete`,exit 1),恢复后 1/1 绿;(b) 临时把 `skipped/already_active` 误计失败时红(`expected complete, actual partial`,exit 1),恢复后 1/1 绿。另锁 2 篇 complete、非因果资源忽略、foreign 403、proposed / wrong-tool / already-reverted 409 且业务副作用前拒绝。
- **K-b8:** 同一真实 `check:tool-face-parity` subprocess 严格执行 production GREEN → 把 call site 改为真实但只构造 restore POST 的 `#handleRestoreNote` 后 RED(exit 1,命中 `does not construct DELETE /api/notes/:id`)→ production GREEN;外层探针 1/1 绿。

所有 mutation 均用 `apply_patch` 临时注入并在对应 RED 后原样恢复;恢复后的源码抽检未见 no-op、内联 SQL、截断 resources、错误 policy 或错误 revert 分支残留。

### docs-first 十门

| # | 门 | exit / 结果 | wall |
|---:|---|---|---:|
| 1 | `npm.cmd run docs:check` | 0;inventory 最新 | 0.31s |
| 2 | `npm.cmd run docs:tool-face-manifest` | 0;生成 2 条,2 public | 0.34s |
| 3 | `npm.cmd run verify:v2-bn8-runtime` | 0;含 unit 211/211、registry 4/4、manifest 10/10、parity 10/10、build、runtime contracts、secret scan | 33.71s |
| 4 | client `npm.cmd exec tsc -- --noEmit` | 0 | 5.47s |
| 5 | server `npm.cmd exec tsc -- --noEmit` | 0 | 4.08s |
| 6 | root `npm.cmd run test:unit` | 0;20 files,211/211 | 7.09s |
| 7 | server `CANVAS_ASSET_DIR=server/.codex-tmp/v2bn12-2b2b1-test-v2-assets; npm.cmd run test:v2` | 0;270/270;隔离目录写后 0 个资产文件 | 11.81s |
| 8 | server `npm.cmd run test:mcp-transport` | 0;15/15 | 2.21s |
| 9 | server `npm.cmd run test:mcp-artifact` | 0;2/2 | 10.89s |
| 10 | server `npm.cmd run test:trash-notes-tool` | 0;24/24=`v2NotesLifecycle` 13 + `v2NotesListService` 3 + 新专项 8 | 2.42s |

第 7 门的隔离目录最终为空;managed sandbox 拒绝删除空目录本身,故只留下 ignored empty directory,没有测试资产或 tracked diff。DB-heavy 门均按表串行,未声称可并行。

### `git diff --numstat` 与边界

以下是写后实现面逐文件 numstat;两个新文件以 UTF-8 行数补入。`routes/notes.ts` / lifecycle tests 是 `§补裁` 明示追加面;其余均落在原工单允许面。

```text
95	0	docs/agent-ops/handoffs/2026-08-23-v2bn12-2b2b1-trash-notes-tool.md
113	0	docs/generated/tool-face-manifest.json
27	0	scripts/generate-tool-face-manifest.test.ts
1	0	scripts/generate-tool-face-manifest.ts
1	0	server/package.json
295	13	server/src/__tests__/v2McpTransport.test.ts
52	13	server/src/__tests__/v2NotesLifecycle.test.ts
1	1	server/src/__tests__/v2NotesListService.test.ts
327	0	server/src/__tests__/v2TrashNotesTool.test.ts (new)
12	1	server/src/mcp/bindings.ts
16	4	server/src/mcp/policy.ts
69	7	server/src/mcp/transport.ts
26	9	server/src/routes/notes.ts
80	5	server/src/services/notes.ts
53	0	server/src/services/toolFaceReceiptRevert.ts (new)
4	1	server/src/services/toolFaceReceipts.ts
44	0	server/src/toolFace/registry.test.ts
46	2	server/src/toolFace/registry.ts
5	0	shared/types/toolFaceManifest.ts
```

实现/测试面(不含本回执)合计 `1172 additions / 56 deletions`;INSERT/UPDATE fixture 的列、占位符与实参数量已由实跑路径核对。共享树既有 `client/.../useNoteCanvasRuntimeController.ts` 与 `server/src/routes/projections.ts` 仍仅是 porcelain `.M` 假阳性,两者 `git diff --exit-code -- <path>` 均为 0,本单内容改动为 0。

### 显式范围排除与写后纪律

- 未实现 `input_required` / elicitation 批准流(b-2b-2),未开 receipt REST/MCP 门或队列 UI(b-3),未加事务/竞态处理,未改 schema/migration、Host/Origin/auth、PUT、parity 脚本或 client 产品代码。
- 未把过滤移出既有 `tools/list`;未在 transport 增加 tool-name 白名单、schema 注册表或内存状态;未承诺未来非 note threshold 工具的资源语义。
- 追加本节后已再验:`git diff --check` exit 0、manifest freshness exit 0、parity exit 0、UTF-8 fatal decode 通过、范围/HEAD/header/lock 均保持上述状态;不 commit、不 push、不碰 main、不碰锁。
