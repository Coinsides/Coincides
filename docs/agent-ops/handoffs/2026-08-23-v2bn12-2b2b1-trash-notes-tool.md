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

## Review

> Codex reviewer · 2026-08-23 · 洁净室复核。复核对象严格固定为 f1cedf90fc4d5539a19b852c9cb8070916e63bfe，直接父提交 afc91f25fd1b873785f47c86d8e8b90a828901f9；共享分支在复核期间继续前进，所有承重取证均来自仓外隔离树中的精确 Git 对象，不以移动中的共享 HEAD 代替目标提交。未改产品代码、常驻测试或 header，未 commit、未 push、未碰 main / builder.lock / 生产 DB。

### 判定

**FAIL（方向成立）**。分级计数：BLOCKER 0 / HIGH 0 / MED 1 / LOW 1。

实现方向与本单主合同成立：真实 HTTP、同源 lifecycle 守卫、幂等前态、threshold、因果收据、revert 以及 K-b0…K-b8 / T1…T6 都经对抗探针成立；未发现当前产品路径的写错对象、越权或不可撤数据缺陷。FAIL 来自一条常驻回归护栏被放宽且 T7 明定的“测试 diff 为空”不成立。

1. **[MED][测试护栏 / 边界合同] T7 的 list_notes 测试指纹不为空，且放宽后的 A-1 可被旧 R5 同族接线骗绿。**
   - afc91f2..f1cedf9 对 server/src/__tests__/v2NotesListService.test.ts 的真实结果是 exit 1、numstat 1/1；唯一改动把“canonical import 只能是 listNotes”放宽为“同一 named import 中出现 listNotes 这个词”。
   - reviewer mutation 将 canonical import 写成 listNotes as canonicalListNotes，另从复制模块导入本地 listNotes 供 MCP binding 调用。该错误接线 server tsc exit 0，v2NotesListService 常驻测试仍 3/3、exit 0；直接调用 TOOL_BINDINGS 的 list_notes 则返回复制模块标记 [{"marker":"reviewer-copy"}]。也就是说测试看见的 canonical 字符串与实际被调用的 symbol 可以不是同一个。
   - 当前生产 listNotes service 与 binding 本体指纹确实没变，故这是“现码正确、回归护栏失去同源证明力”，不是把潜在 bug 冒充当前业务 bug。
   - 建议修法：像同文件的人类 route 检查一样，用 TypeScript checker/AST 把 MCP initializer 内的 callee symbol 解析回 ../services/notes.js 的 listNotes export；或至少结构化锁住 canonical import 的本地 binding 与 initializer callee 为同一 identifier。修复后复刻上述 alias + copy mutation 必须红。
2. **[LOW][收据准确性] Result 把非空行计数标成了 Git numstat。**
   - 精确提交中两个新文件分别是 v2TrashNotesTool.test.ts 356/0、toolFaceReceiptRevert.ts 59/0；Result 写 327/0、53/0。
   - 差额 29 + 6 均为空行，未藏未申报逻辑；但精确区间实际是 19 文件、1302 additions / 56 deletions，排除本 handoff 的 95 行后是 1207/56，不是 Result 所记 1172/56。

### 复核依据、5-1 完备与范围

- 已逐字读取 reviewer charter 5-1…5-10、本工单两节 Result 与 §补裁、总计划 §2 b-2 / §3 / §7、tool-face design §3.1 补注 / §5.3 / §12、b-1 §补裁、b-2a Result/Review 与修正 Review、adjudication §7；builder 自报只作导航，判定所需因果均另取。
- commit message 明示 Builder: Codex、Fable 代调度；未使用本仓不承载执行者信息的 Git author 字段归因。
- 可取收据均已取得：精确树、真实 TCP HTTP、SQLite 行与收据、标准门与程序化补证、全部点名 mutation、SQL 参数、diff 指纹、下一状态合取、隔离树还原与删除。
- 显式范围排除：b-3 Apply/Revert 门与 b-2b-2 MRTR 门尚不存在，不能伪造“live 门”收据；对二者只做同一 binding/service 的状态转移探针。client 零 diff，不做主观 UI 验收；不读写生产 DB；无 transaction/竞态修复授权。
- 共享树复核期间出现未跟踪 .claude/settings.local.json，且 HEAD 多次前进；它不在 f1cedf9、不是本 reviewer 写入，未触碰。点名的两处 porcelain .M 均另验 worktree hash == index hash 且 git diff --quiet exit 0，确为 EOL/stat 假阳性。

### K-b0…K-b8 逐刀

每刀均在 C:\Users\70208\AppData\Local\Temp 下的 detached f1cedf9 worktree 施加；RED 后用反向同补丁还原，重跑同一探针为 GREEN，且每刀后 git status tracked/untracked 计数为 0。

| 位点 | 对抗结果（RED） | 还原 / 结论 |
|---|---|---|
| K-b0 | binding 全报 missing：真实 HTTP 断言 expected trashed / actual missing，exit 1 | 同探针 1/1，exit 0；DB 与 applied receipt 正控成立 |
| K-b1 | 无 form 时误进 confirm：proposal 正常结果处 expected isError undefined / actual true，exit 1 | 1/1，exit 0；n>1 零执行 |
| K-b2 | 有 elicitation.form 时删声明性降级：同一真实 HTTP isError 断言红，exit 1 | 1/1，exit 0；能力确实到达 policy |
| K-b3 | n==1 threshold 分支改 propose：expected immediate / actual propose，exit 1 | policy 探针 1/1，exit 0 |
| K-b4 | 生成器丢 threshold：own-key expected true / actual false，unit exit 1；真实 freshness 同时报“过期”，exit 1 | unit 与 check:tool-face-manifest 均 exit 0 |
| K-b5 | binding 改为真实内联 UPDATE：同源 killer 在必须调用 trashNoteAsUser 的断言红，exit 1 | 1/1，exit 0；内联 SQL / prepare 阴性仍在 |
| K-b6 | applied resources 只取第一条：binding 正控先给 2 条，receipt expected 2 / actual 1，exit 1 | 1/1，exit 0，逐项顺序一致 |
| K-b7(a) | partial 恒写 complete：expected partial / actual complete，exit 1 | hard-delete fixture 1/1，exit 0 |
| K-b8 | 真实 check:tool-face-parity 基线 exit 0；call site 改 handleRestoreNote 后 exit 1，命中“does not construct DELETE /api/notes/:id” | 还原后同一生产 subprocess exit 0，2 public entries |

### T1…T7 逐条

| 位点 | baseline / mutation 实测 | 判定 |
|---|---|---|
| T1 | reviewer-only 同 note 探针 baseline：人类 DELETE 409、details.code=source_projection_read_only、行不变；MCP 为 skipped/read_only_projection、行不变，exit 0。binding 改裸 trashNote 后，人类门仍先通过上述 409 断言，但 MCP 后 DB expected active/null / actual trashed/新时间，exit 1；结构同源 killer亦 exit 1 | PASS；两门一致性与绕守卫后的真实删除均被看见，恢复 exit 0 |
| T2 | 去掉 already_trashed 前态：MCP expected skipped/already_trashed / actual trashed，exit 1；人类 DELETE 仍 200 但整行时间被重盖，deepEqual exit 1 | PASS；两探针恢复均 exit 0 |
| T3 | reviewer-only 独立 A/B：A 为 causal trashed，B 为本就在回收站的 skipped。baseline revert 后 A active、B trashed；把 skipped 放入可撤集合后 B actual active / expected trashed，exit 1 | PASS；恢复 exit 0 |
| T4 | already_active 从成功集合删掉：expected complete / actual partial，exit 1 | PASS；K-b7(b) 恢复 exit 0 |
| T5 | policy 两处均误读 input.ids：n==1 真实 HTTP 变 proposed，expected 一条 trashed / actual results=[]，exit 1 | PASS；恢复 exit 0 |
| T6 | DELETE route 回旧的 getOwnedNote → projection guard → trashNote：同源结构断言 exit 1；b-2a pre-extraction byte golden 与 missing/foreign golden 仍 2/2；幂等行断言因重盖时间 exit 1 | PASS；结构、golden、幂等三组恢复均 exit 0 |
| T7 | 已知阳性 DELETE handler 指纹 unequal，证明探针能见差异；随后 list service、list binding、A-3 onward、Host/Origin/auth、PUT、note-block/canvasObjects 均按下表核验。但 list 测试 whole-file diff exit 1，且 alias+copy mutation 在错误接线下仍 3/3 绿 | **FAIL，形成上述 MED** |

### T7 指纹、阴性断言与字符串归因

| 探针 | afc91f2 vs f1cedf9 |
|---|---|
| 已知阳性：DELETE handler | unequal；baseline / target SHA-256 分别 89591fb8… / b870ce18… |
| listNotes service | equal；0e7784c90951716d35e621a0ae63a147ab0d8ca2f001f655257f8e81cd98f9e7 |
| listNotesBinding initializer | equal；d36ef941ffab66a08cfa73281b986a534b1eb2ce2812939c11f6beca116f9847 |
| A-3 onward list 行为测试 | equal；e93665bb55fc9481ce7c697cd1567a23f23151b32402aa75a426e6303b010fc3 |
| v2NotesListService whole file | **unequal，diff exit 1，numstat 1/1** |
| Host/Origin guard | equal；51415c28… |
| K-3 Host/Origin/auth test | equal；1b972b64… |
| auth middleware、server index | whole-blob diff exit 0 |
| PUT handler | equal；2300f1d5… |
| routes/noteBlocks、routes/canvasObjects、services/canvasObjects、services/noteBlockLifecycle | 各 whole-blob diff exit 0 |
| parity script / parity test | 各 diff exit 0 |
| client tree | diff exit 0 |

“放宽后的 listNotes 字符串是谁写进去的”：它存在于精确 f1cedf9 diff，且本工单续跑 Result 明确申报了“为同一 canonical import 加入 trashNoteAsUser 而放宽 import killer”的理由；因此归属本次 builder delivery，不是共享树 EOL 假阳性，也不是并发未跟踪文件。理由解释了改动动机，但 alias+copy 反例证明实现方式削弱了原同源答案。

### 真实 HTTP、同门语义与收据合同

| 场景 | 实测 |
|---|---|
| n==1 | JWT + Express + TCP，HTTP 200、resultType complete、structuredContent 为一条 trashed；DB active → trashed；receipt applied、applied_at 非 NULL、resources=[trashed]、intended_input 原对象、pointer 指向同 receipt |
| input_digest | reviewer-only 真实 HTTP 校验为 sha256:335ef25232ae5259d4e4b135f11884681a2d52a325a5f53c22ff5da9164ddaac，等于原始 {"note_ids":["3333…"]} 的 JSON digest |
| n>1，无能力 | HTTP 200、正常 proposal、structuredContent={results:[]}；两行 status/trashed_at/updated_at 全不变；receipt proposed、applied_at=NULL、resources 两条 pending、intended_input 原样 |
| n>1，有 elicitation.form | 同上仍 proposed；supportsFormElicitation 正控为 true，证明是声明性降级而非能力没到 |
| already trashed | MCP skipped/already_trashed，行与 trashed_at 不变；人类 DELETE 200，字节 {"message":"Note moved to trash"}，整行不变 |
| source projection | MCP skipped/read_only_projection；人类 DELETE 409；T1 锁住同一 note 的两门一致与零副作用 |
| missing | MCP missing 并入 receipt；人类 missing/foreign 仍 404 golden |
| active restore | 人类 POST 200，字节 {"message":"Note restored"}，整行不变 |

registry / generated manifest 的 output schema 与 receipt resources 使用同一词汇：trashed、missing、skipped(reason=already_trashed 或 read_only_projection)。proposal 的 results=[] 是 SDK outputSchema seam 下的 schema-valid“零执行”投影，意图留在 pending resources / intended_input。

b-2a 测试改动逐项核过：新增 DELETE/restore 幂等 golden；两个 route killer 改锁 AsUser 编排且 T2/T6 能杀；裸 executor 断言只从 void 改为 changes 并保留 SQL 实测；missing/foreign、响应字节、PUT golden 未削弱。唯一不成立的是另文件的 list_notes import killer，已单列 MED。

### manifest、SQL、revert 与触及面

- check:tool-face-manifest fresh：2 条、2 public；threshold={batch_field:"note_ids"} 与 registry 一致。真实 check:tool-face-parity 对 trash_notes 正控 exit 0，K-b8 反例 exit 1。
- 生成器仍不过滤：注入 internal_probe、test_probe、__reserved_probe 的“按原顺序忠实投影”探针 1/1、exit 0；过滤仍只住 tools/list。
- receipt writer 的 INSERT：9 columns = 8 placeholders + source_type literal mcp = 8 run args；未显式列 created_at。apply UPDATE 为 2 placeholders / 2 args；revert UPDATE 为 3/3。
- lifecycle 裸 SQL：trash UPDATE 4/4、restore UPDATE 3/3，SQL/取时/WHERE 与基线相同。新增 transport fixtures 两处 UPDATE 分别 3/3、1/1；新 revert 测试 fixture 的 users INSERT 各 5 slots=4 placeholders+literal / 4 args，course 5/5，notes 14 slots=7 placeholders+7 literals / 7 args（循环两篇）。真实 DB 门全绿，未发现 TD-8 式错位。
- intended_input 仅为 metadata 可选字段；server/src/db/schema.sql 与 migrations diff exit 0。
- revert service 无门，专项覆盖 complete、hard-delete partial、already_active complete、非本用户 403、非 applied / wrong tool / already reverted 409。T3 证明 skipped 不进 causal set。SELECT→UPDATE 无事务的竞态按 §补裁为记录态，不计本提交缺陷。
- 精确区间 19 文件、1302/56。client、schema/migrations、parity script/test 均 diff exit 0。routes/notes.ts raw diff 是 5 个物理 hunk：2 个业务 handler + import、getOwnedNote export、status 字段 3 处 §补裁授权 plumbing；除 DELETE/restore 同门所需接线外无第三处业务逻辑。

### docs-first 门表与提交完整性

正式门在 LF、无 reparse、detached f1cedf9 隔离树执行；最初两棵 autocrlf checkout 只产生 EOL 噪声，未作为承重结果。

| 顺序 | 门 | exit / 实际输出 |
|---:|---|---|
| 1 | npm run docs:check | 0；object inventory 最新 |
| 2 | npm run check:tool-face-manifest | 0；2 entries / 2 public，fresh |
| 3 | npm run verify:v2-bn8-runtime | 标准入口 exit 1，Vite config 在隔离长路径向上探测时报 Cannot read directory "../../../../..": Access is denied，首个 unit 尚未执行断言；按先例程序化同配置补证：20 files / 211 tests 全绿，registry 4/4、manifest 10/10、parity 10/10 + production 2 public、canvas 159、model contract 60、performance 5、server build/docs/diff/secret 等其余子门均 exit 0；programmatic production Vite build 2184 modules、exit 0 |
| 4 | client tsc --noEmit | 0 |
| 5 | server tsc --noEmit | 0 |
| 6 | npm run test:unit | 标准入口同一 Vite config 环境拒读而 exit 1、0 assertions；programmatic 同配置 211/211、exit 0 |
| 7 | server test:v2（外置 CANVAS_ASSET_DIR / SOURCE_BLOB_DIR） | 0；270/270；两隔离资产目录最终各 0 entries、0 reparse |
| 8 | server test:mcp-transport | 0；15/15 |
| 9 | server test:mcp-artifact | 0；2/2 |
| 10 | server test:trash-notes-tool | 0；24/24 |

Vite 两个标准入口的 nonzero 如实保留，不冒充标准命令绿；其失败发生在 config 装载、不是测试断言，且同源码、同插件/alias/setup 的 programmatic unit/build 与 verify 其余子门补齐。此项符合工单对隔离长路径拒读的程序化补证约定，不另记 finding。

精确 HEAD 再验为 f1cedf90fc4d5539a19b852c9cb8070916e63bfe；client/server tsc 均 exit 0。两个新文件 server/src/__tests__/v2TrashNotesTool.test.ts 与 server/src/services/toolFaceReceiptRevert.ts 均由 git ls-tree 确认已入库。

### 5-2 跨条耦合与下一状态

1. **b-3 replay：字段形状足够，但现有 applied 转态不够。** intended_input 的 {note_ids:[...]} 可直接经 registry schema 重验后重放同一 TOOL_BINDINGS trash_notes binding；reviewer 状态转移探针实际得到两条 trashed。随后若只调用现有 markToolFaceReceiptApplied，metadata.resources 仍是两条 pending；revert 只认 outcome=trashed，于是实测 receipt 会标 complete、revert_details={restored:[],failed:[]}，两篇却仍在 trash。此为下一单潜在 HIGH 防线，不计 f1 当前缺陷：b-3 成功转态必须把真实 binding results 投影回 causal resources，并与 proposed→applied 做条件更新（最好同一次 UPDATE）；同时重验 owner/status/tool/schema/input_digest，不能直接信任 metadata。
2. **b-2b-2 MRTR 接点。** policy.ts 继续只做纯分类：无 form → propose，有 form 时下一单才从临时 propose 改 confirm；实际 driver 接点是 transport.ts 的 effectiveTier===confirm 分支。createFreshServer 当前 callback 只下传 envelope，需把 ctx.mcpReq.inputResponses 与 verified requestState 带入：首轮 inputRequired，decline/cancel 零执行零收据，accept 才调同一 binding 并写 applied receipt。
3. **MRTR 状态完整性。** 本地安装 SDK 2.0.0 声明明确：requestState 回传后是攻击者可控，影响授权/资源/业务时必须 HMAC/AEAD 并配置 requestState.verify；inputResponses 也未经 SDK 业务校验。当前 server/src 对 inputResponses/requestState/inputRequired 命中 0，McpServer 未配置 verify。下一单至少绑定 userId + tool + input_digest + expiry，否则批准可被伪造或跨输入错配；建议按 HIGH 防线验收。
4. **TD-14 仍描述性。** AuthRequest/JWT 只有 userId；scopes 只投影为 tool metadata。server/src 对 authInfo.scopes / req.scopes 的执行命中 0，故不得把 notes:write 写成已强制授权；这符合本单声明边界，不计缺陷。
5. accepted b-3/MRTR 之后仍需重新看 binding 成功与 receipt 转态的失败窗口、长队列跨 schema/version 重放，以及本单已记录的 SELECT→UPDATE 竞态。

### 隔离树还原与自清收据

- 正式 gate/tree 与 mutation/tree 均为仓外 $TMPDIR 普通目录，reparse count 0；client/server 各自 npm ci --offline，分别安装 202 / 212 packages，无共享 node_modules junction。
- reviewer-only T1、T3、digest、5-2 probe 均临时注入、运行后删除；所有 mutation 恢复后精确 HEAD=f1cedf9、tracked/untracked status 0。沙箱拒绝其外部 worktree 使用 apply_patch executable，故源码探针以 Git patch stdin 施加并以同补丁 -R 还原；未用 reset/checkout 或直接写文件。
- 删除前 LF gate 与 LF mutation 树 status 均为空，隔离 CANVAS/SOURCE 资产目录各 0 entries；4 棵 worktree、bare clone、两个资产目录与临时 patch-tool 空目录均逐一解析为 C:\Users\70208\AppData\Local\Temp 下的精确目标且 reparse 0。
- 自清后复验 8 个点名路径 Test-Path 全为 false（REMAIN=0）。未删除共享树或生产数据。
