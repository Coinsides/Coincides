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
