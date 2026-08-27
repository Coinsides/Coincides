> from: claude(opus,工程调度会话) | to: codex(builder) | status: draft(⛔ 硬依赖 noteHydration 单先落地) | re: v2bn12-S4-4 | date: 2026-08-27

# V2.BN.12 S4-4:读面第四批 —— 内容真相(Note / NoteBlocks)

## 定位

S4 读面最后一批,也是**唯一需要提取的一批**。两处零语义提取 + 两条工具。

⚠️ **它动的是全应用最热的读路径**(每次打开 note 都走这两条)⇒ **体量轻但风险等级不低**;`K-1 字节等价`是本单命门,别的都可以商量,它不行。

## ⛔ 硬依赖:noteHydration 单必须先落地

本单的 `listNoteBlocks` 需要 `hydrateBlock`,而它**当前是 `routes/notes.ts` 的私有函数**。
⇒ **必须等 `handoffs/2026-08-26-v2bn12-note-hydration-leaf.md` 落地**(两个 hydrate 搬进 `services/noteHydration.ts` 叶子)之后再做本单。
**开工前自查**:`server/src/services/noteHydration.ts` **存在且导出 `hydrateNote` / `hydrateBlock`**;若不存在 ⇒ **停手写 `needs: claude`**,⛔ 不要自己去导出 route 里的私有函数(那是 (A) 方案,已被明确否掉:会把 TD-16 的环从一个 helper 扩到两个)。

## 发单前已核实(⭐ 两侧现物 + 上层活链)

| 工具 | 提取目标 | `human_entry.route` | `client_call_site` | 上层活链(新规则 `0f877b7`) |
|---|---|---|---|---|
| `get_note` | `routes/notes.ts:153-160` 的 handler 体 | `GET /api/notes/:id` | `useNoteCanvasDataAdapter.ts:556`(在 `fetchNote` 内) | ✅ `fetchNote`(`:544`)被 `:654` 的 `useEffect` 调用(deps `[fetchNote]` 在 `:655`) |
| `list_note_blocks` | `routes/notes.ts:225-286` 的 handler 体 | `GET /api/notes/:id/blocks` | `useNoteCanvasDataAdapter.ts:557`(同 `fetchNote` 内);另 `:1469` 在对账路径 | ✅ 同上 |

**读函数写操作扫描**:两个 handler 体内除 `getOwnedNote`(SELECT + throw 的归属断言)外**无任何写操作** ⇒ 纯读。
📌 「**这个读,动没动『什么存在』?**」—— 答:没动。

## 交付物

### 1. 两处零语义提取(落 `server/src/services/notes.ts`)

⭐ **落点定死**:`services/notes.ts`,**与既有 `listNotes` 同门同源,⛔ 不新建 service 文件**。

- **`getNote({ userId, noteId })`**:搬 `routes/notes.ts:153-160` 的体(`SELECT * FROM notes WHERE id = ? AND user_id = ?` → 无则 `AppError(404, 'Note not found')` → `hydrateNote`)。
- **`listNoteBlocks({ userId, noteId })`**:搬 `routes/notes.ts:225-286` 的体(`getOwnedNote` 归属断言 → 那条 JOIN → `.map(hydrateBlock)`)。
  ⭐ **`source_references` 去 null 过滤(`:281-283`)必须搬进本 service**。
  ⚠️ **这一条与 noteHydration 单的措辞不冲突,读清楚**:那张单说的是「⛔ 不要把过滤搬进**hydration 叶子**」(它不是 hydrate 的一部分);**本单说的是它属于「这个读返回什么」,所以要随 handler 体一起进 `listNoteBlocks`**。⇒ **过滤的归宿是 service,不是叶子,也不是留在 route。**
  **判据**:提取后 route 变薄壳,**agent 门与人类门返回同一形状** —— 若过滤留在 route,工具就会把人类看不到的 `null` 吐给 agent,**那正是「两扇门报告两个不同的世界」**(purposes 那条裁定的同款理由)。
- **签名风格**:照 `listNotes` 的**具名对象**风格(`{ userId, noteId }`),⛔ 不要为了像别的 service 而改成位置参数。
- ⛔ **零语义**:SQL 一字节不改、404 文案不改、字段顺序不改、不"顺手优化"。

### 2. route 变薄壳

`routes/notes.ts` 两个 handler 改为只做 HTTP 搬运(取参 → 调 service → `res.json`)。⛔ 不改路由路径、不改状态码、不改错误处理方式。

### 3. 注册表两条 + binding 两条

| name | truth | tier | exposure | scopes | 绑定目标 |
|---|---|---|---|---|---|
| `get_note` | `content` | `immediate` | `public` | `['notes:read']` | `getNote` |
| `list_note_blocks` | `content` | `immediate` | `public` | `['notes:read']` | `listNoteBlocks` |

- schema 规矩同 S4-1/2/3 **一字不改**:真 zod `.strict()`;输入照 service 现物;输出照 service **实际返回的 hydrated 形状**(⚠️ 含 `content_json` / `metadata` / `display_overrides_json` / `source_references` 四个被 parse 过的字段,以及 placement 侧字段)。⛔ 不放宽成 `z.unknown()` 蒙混,类型不符就点名。
- 📌 **TD-14**:`scopes` 描述性、无机关强制 ⇒ ⛔ 不得当权限模型使用或声称。

### 4. manifest 重生成 + parity + 端到端

- 重生成 `docs/generated/tool-face-manifest.json`(⛔ 不手写);parity 两门绿。
- **两条工具各一条真实 `tools/call` 端到端**,断言 `structuredContent` 过 `output_schema` 且与直调 service 一致。📌 「**过 killer ≠ 有能力**」:⛔ 不接受只有注册表/parity 层的断言。

### 5. 台账

`current-state/deferred-tests.md` 追加一行,成对写。已知略过:trashed note 的读行为、blocks 的 placement 层级/排序边界、跨用户矩阵(ownership 由 `getOwnedNote` 承担,只留最小正控)。

## 必红判据

- ⭐ **K-1(命门,字节等价)**:提取**前后**,同一 fixture 对 `GET /api/notes/:id` 与 `GET /api/notes/:id/blocks` 的 REST 响应做**字节级比对**,必须逐位相同。**取法**:提取前先存快照(放 `.codex-tmp/`,⛔ 不入库),提取后重跑比对。⚠️ **blocks 那条必须用「至少两个块 + 至少一个带 `source_references`、至少一个不带」的 fixture** —— 否则 null 过滤那步等于没测。
- **K-2(同源锁)**:把 `getNote` 的 service 改成返回 `null`(或抛别的错)⇒ **`GET /api/notes/:id` 的既有 HTTP 正控必须红** ⇒ 证明 route 真的走了 service,不是留了旧实现。恢复后绿。
- **K-3(工具内容刀)**:把任一 binding 换成在真实结果之上**篡改一个字段值**(⚠️ **必须语法合法** —— 语法坏掉造成的红只证明树被改坏,不证明测试有鉴别力)⇒ 该工具端到端**必须红在内容断言**。恢复后绿。
- **K-4(schema 刀)**:任一 `output_schema` 必填字段改名 ⇒ 该工具端到端**必须红在 schema 校验**。恢复后绿。
- **K-5(manifest)**:注册表改完、生成前跑 `check:tool-face-manifest` ⇒ **必须红**;生成后绿。**条数以 S4-3 落地后的实际数为基线 +2**;⚠️ **若与你数到的不符,不要凑数**,如实写实际数与差异原因。
- 既有 `test:unit` / `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / parity 两门 / 契约专项 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/services/notes.ts`(+2 个导出函数)· `server/src/routes/notes.ts`(**仅那两个 handler 体改薄壳 + 必要 import**)· `server/src/toolFace/registry.ts`(+2 及其 schema)· `server/src/mcp/bindings.ts`(+2)· `docs/generated/tool-face-manifest.json`(**生成**)· `server/src/__tests__/v2McpTransport.test.ts` · `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`server/src/services/noteHydration.ts`(⛔ 只 import,不改)· `routes/notes.ts` 的**其余 handler**(写路径一律不碰)· `routes/noteBlocks.ts` · `getOwnedCourse` / `getOwnedNote` 的定义与签名(📌 TD-15/TD-16:**收敛前提是先定权威签名**,本单不做)· `services/selectionResolve.ts` · `textFlowIdentity.ts` · `projections.ts` · `shared/` · transport 骨架 Host/Origin/auth 段 · 任何 migration/schema · 任何 tsconfig · `server/package.json` · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— **判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain**。
- 📌 `server/dist/tool-face-manifest.json` 是 ignored 工件,不进 numstat;若你移动它,收工前自己 `ls` 核对还原。
- ⭐ `test:v2` 现有 `pretest:v2` 钩子会自动 `check + copy` manifest ⇒ 不会再撞「dist 陈旧/缺失」;但 ⛔ **仍必须自己跑 manifest 重生成**(钩子搬的是真相源字节,真相源陈旧它会拦下报「过期」)。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因,⛔ 不自己改 docs。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:**K-1 的字节比对方法与结果**(两端点逐条,含 fixture 里 `source_references` 有/无两种块的证明)· K-2/K-3/K-4/K-5 各一段(贴红点断言原文与行号)· 两条 `human_entry` 的**你自己复核的现物出处与上层活链**(文件:行)· `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 45–60 分钟。
