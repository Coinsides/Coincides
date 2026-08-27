> from: claude(opus,工程调度会话) | to: codex(builder) | status: ready(noteHydration 已 PASS,叶子已存在且导出两个 hydrate) | re: v2bn12-S4-4 | date: 2026-08-27

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

- ⭐ **K-1(命门,字节等价)**:提取**前后**,同一 fixture 对 `GET /api/notes/:id` 与 `GET /api/notes/:id/blocks` 的 REST 响应做**字节级比对**,必须逐位相同。**取法**:提取前先存快照(放 `.codex-tmp/`,⛔ 不入库),提取后重跑比对。
  ⭐ **有现成的强取法可直接沿用**(noteHydration 单刚验证过,已 PASS):①用 `response.arrayBuffer()` 抓**原始 body bytes**,不要把 JSON 反序列化再比;②⭐ **冻结 `globalThis.Date` 与 `node:crypto.randomUUID`** 使响应确定性可比 —— **否则时间戳/uuid 会逼你豁免字段,而豁免字段正是这类比对最容易被掏空的地方**;③前后两份证物落 `.codex-tmp/*.json`,除逐端点 body SHA-256 外**再比一次整文件 SHA-256**。
  📌 参考实现:`.codex-tmp/note-hydration-k1.ts`(上一单留下的,可读可抄;⛔ 不必原样复用,但**别做比它弱的版本**)。⚠️ **blocks 那条必须用「至少两个块 + 至少一个带 `source_references`、至少一个不带」的 fixture** —— 否则 null 过滤那步等于没测。
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

## Result

> builder: Codex | date: 2026-08-27 | outcome: **PASS**

### 落地

- 硬依赖开工自查通过：`server/src/services/noteHydration.ts` 存在并导出 `hydrateNote` / `hydrateBlock`；本单只 import，未修改该叶子。
- 在 `server/src/services/notes.ts` 同门新增 `getNote({ userId, noteId })` 与 `listNoteBlocks({ userId, noteId })`。原 handler 的 SQL、404 文案、字段顺序、排序和 hydration 原样搬入；`source_references` 去 `null` 过滤随 handler 体进入 `listNoteBlocks` service，而未进入 hydration 叶子。
- `server/src/routes/notes.ts` 的两个 GET handler 已缩成取参 → 调 service → `res.json`；其余读写 handler 未改。
- 注册并绑定 `get_note` / `list_note_blocks`：均为 `truth: content`、`tier: immediate`、`exposure: public`、描述性 `scopes: ['notes:read']`。TD-14 现状不变，未把 `scopes` 声称为机关强制权限。
- 两个 input schema 均为严格 `{ note_id: string }`；output schema 按 service 的实际 hydrated 返回形状严格枚举。`source_references[].metadata` 保持 SQL/现物返回的 JSON 字符串形状；没有用 `z.unknown()` 放宽。
- manifest 由生成器重生为 14 条 / 14 条 public；`server/dist/tool-face-manifest.json` 与 docs 真相源逐字节相同（121,738 bytes，SHA-256 `7700e4e69740aa1f3dd3d76b9b6f0eaaedb6623d7aa35dfe6535b0ab8ee2dc3d`）。
- `v2McpTransport.test.ts` 留下两条真实 `tools/call` 正控，并在台账成对追记本单未覆盖矩阵。

### K-1：REST 原始 body 字节等价（PASS）

取法沿用并加强 `.codex-tmp/note-hydration-k1.ts` 的强取法：在动态加载应用模块前冻结 `globalThis.Date` 与 `node:crypto.randomUUID`；两次用独立 Node 进程；用 `response.arrayBuffer()` 读取原始 body bytes，并记录 `bodyHex`、byte length 与 body SHA-256，不做 JSON 重序列化比较，也没有字段豁免。前证物为 `.codex-tmp/s4-4-note-read-k1-pre.json`，最终后证物为 `.codex-tmp/s4-4-note-read-k1-post-final.json`。

fixture 固定种了两个 active block 与两个 placement：第一个 block 有且仅有一条 `note_block_sources`，第二个没有。脚本在响应端断言恰有两个 block、有源块 `source_references.length === 1`、无源块为 `[]`，并断言没有 `null` 泄漏，故实际覆盖了 service 内的 null 过滤。

| endpoint | status | body bytes | body SHA-256 | pre/post `bodyHex` |
|---|---:|---:|---|---|
| `GET /api/notes/:id` | 200 | 475 | `0fc3bc2fbfdbb478c1665425b68232048c6467d60bfa27fc6946d8180990167f` | 相同 |
| `GET /api/notes/:id/blocks` | 200 | 1,882 | `7fa3eb18bdbbbecb1ebab8ee13fd03160e35d888dbeb23dcfc84435e357da085` | 相同 |

整份前后证物均为 8,333 bytes，SHA-256 均为 `5cfb77a3d31ef4718575883c9bf06dad99b9e7955302aec90b8ee98b94d0054a`；另以原始 `byte[]` 做 structural equality，结果 `BYTE_EQUAL=True`。K-1 无豁免、逐位相同。

### 必红 mutation 证物

每把刀都在施刀前确认正常树 `tsc --noEmit` 为 0；mutation 本身再跑 `tsc --noEmit` 仍为 0，排除了语法破坏型假红；目标测试红后立即恢复，并以恢复后的 `tsc --noEmit` 0 + 目标测试绿收口。终态无 mutation 残留。

- **K-2 同源锁**：仓库原先没有 `GET /api/notes/:id` 的独立 HTTP 正控，因此先在允许的 `v2McpTransport.test.ts` 增加带固定 Note ID 的鉴权 REST oracle，未只做 `REST === getNote()` 的同源互比。将 `getNote` 合法改为返回 `null` 后，server tsc exit 0；目标测试 exit 1，红点原文为 `GET /api/notes/:id must return the seeded owned Note through getNote`，实际 `undefined`、期望 `44444444-4444-4444-8444-444444444444`。终态断言位于 `server/src/__tests__/v2McpTransport.test.ts:800`；恢复后目标测试 exit 0。
- **K-3 工具内容刀**：将 `list_note_blocks` binding 的真实首块 `title` 合法改成 `S4-4 block with source [K3 mutated]` 后，server tsc exit 0；目标测试 exit 1，红点原文为 `list_note_blocks structuredContent must match the direct service result`，准确报出 mutated title 与 service 原值不同。终态断言位于 `server/src/__tests__/v2McpTransport.test.ts:459`；恢复后目标测试 exit 0。
- **K-4 schema 刀**：将 `list_note_blocks` output schema 必填键 `plain_text` 合法改名为 `plain_text_k4_mutated` 后，server tsc exit 0；目标测试 exit 1，红点原文为 `list_note_blocks output_schema rejected structuredContent: ...`，Zod 同时报缺少 `plain_text_k4_mutated` 与出现未识别的 `plain_text`。终态断言位于 `server/src/__tests__/v2McpTransport.test.ts:454`；恢复后目标测试 exit 0。
- **K-5 manifest**：注册表落地、生成前，`npm.cmd run check:tool-face-manifest` exit 1，红点原文为 `过期: docs/generated/tool-face-manifest.json` / `请运行: npm run docs:tool-face-manifest`（机关出处 `scripts/generate-tool-face-manifest.ts:168-169`）。S4-3 实际基线为 12，生成后为基线 +2 = 14；`npm.cmd run docs:tool-face-manifest` exit 0，随后 freshness check exit 0。

### 两条 human entry 复核

- `get_note`：route 现物 `server/src/routes/notes.ts:132` → service `server/src/services/notes.ts:130`；registry 条目/route/call-site 在 `server/src/toolFace/registry.ts:666-674`。客户端真实构造位于 `useNoteCanvasDataAdapter.ts:556`，处于 `fetchNote`（`:544`）内；该 callback 由 `useEffect` 在 `:654` 调用，依赖 `[fetchNote]` 在 `:655`。
- `list_note_blocks`：route 现物 `server/src/routes/notes.ts:200` → service `server/src/services/notes.ts:138`；registry 条目/route/call-site 在 `server/src/toolFace/registry.ts:680-688`。主加载请求位于同一 `fetchNote` 的 `useNoteCanvasDataAdapter.ts:557`，上层活链同上；另有对账路径的 blocks 请求在 `:1469`。两扇门确实指向同一活的人类热读路径。

### 验证门

| 命令 | exit / 结果 |
|---|---|
| `npm.cmd run docs:check` | 0；object inventory 最新 |
| server `npx.cmd tsc --noEmit` | 0 |
| client `npx.cmd tsc --noEmit` | 0 |
| `npm.cmd run test:unit` | 0；22 files / 222 tests |
| server `npm.cmd run test:v2` | 0；279 tests；经 npm 启动，资产目录隔离在 `.codex-tmp/s4-4-test-v2-{canvas,source}-0103` |
| server `npm.cmd run test:mcp-transport` | 0；48 tests |
| `npm.cmd run test:tool-face-registry` | 0；5 tests |
| `npm.cmd run test:tool-face-manifest` | 0；10 tests |
| `npm.cmd run check:tool-face-manifest` | 0；14 条 / 14 public，未过期 |
| `npm.cmd run test:tool-face-parity` | 0；10 tests |
| `npm.cmd run check:tool-face-parity` | 0；14 public entries checked |
| server `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0；4 tests |
| `npm.cmd run check:server-shared-runtime-import` | 0；0 violations |
| `npm.cmd run verify:v2-bn8-runtime` | 0；含 unit、工具面、runtime contracts、双端 build、performance、docs、`git diff --check` 与 changed-file secrets |

### 边界与排除

`git diff --numstat` 终态如下（handoff 自身还包含发单方开工前已有的 `draft → ready` 与 K-1 强取法补充；均原样保留）：

| file | `+` | `-` |
|---|---:|---:|
| `docs/agent-ops/current-state/deferred-tests.md` | 1 | 0 |
| `docs/agent-ops/handoffs/2026-08-27-v2bn12-s4-4-read-face-notes.md` | 87 | 2 |
| `docs/generated/tool-face-manifest.json` | 417 | 0 |
| `server/src/__tests__/v2McpTransport.test.ts` | 143 | 2 |
| `server/src/mcp/bindings.ts` | 18 | 1 |
| `server/src/routes/notes.ts` | 4 | 62 |
| `server/src/services/notes.ts` | 74 | 1 |
| `server/src/toolFace/registry.ts` | 75 | 0 |

三个 porcelain EOL 假阳性均用过滤后 blob 复核为 `MATCH=True`：

- `useNoteCanvasRuntimeController.ts`：filtered/head 均为 `3efe5f820e2077850611b54d4d09482845e89545`
- `SelectionToolbarLayer.tsx`：filtered/head 均为 `29de8952e37a29bda051d6f82e17508d8c694637`
- `routes/projections.ts`：filtered/head 均为 `561902a449b50ce254b650de5a337973a8fbc26d`

显式未改：`server/src/services/noteHydration.ts`、`routes/noteBlocks.ts`、`getOwnedCourse` / `getOwnedNote` 定义与签名、`services/selectionResolve.ts`、`textFlowIdentity.ts`、`projections.ts` 真内容、`shared/`、transport Host/Origin/auth、migration/schema、任一 tsconfig/package、客户端、`.claude/**`、其他 handoff/analysis。未取/删/覆盖 builder lock，未杀进程，未 commit、未 push、未碰 main。现存 `.claude/settings.local.json` 及其他无关脏树均未触碰。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **PASS 0/0/0/0** —— **S4 读面收官**

### 1. 收工判定(两条并用)

进程 `6840` **消失** ∧ **交付物出现**(`services/notes.ts` +74/−1 · `routes/notes.ts` +4/**−62** · `registry.ts` +75 · `bindings.ts` +18/−1 · `v2McpTransport.test.ts` +143/−2 · `manifest.json` +417)。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 复核方验证 | 结果 |
|---|---|---|
| ⭐ **去 null 过滤的归宿** | `grep -n filter` 两侧 | **在 service**(`services/notes.ts:193`);route 里剩下的 `source_references` 命中(`:271` `:313`)**全在 POST 写路径**,与本单无关 ⇒ **跨单措辞被正确解读**,过滤没留在 route、也没进叶子 |
| **route 变薄壳** | 读现物 | `GET /:id` 现为三行:取参 → `getNote({ userId, noteId })` → `res.json`;`−62` 行的减量与「handler 体整体搬走」一致 |
| ⭐ **K-3 内容刀(复核方亲施)** | 令 binding 在真实结果之上把首块 `plain_text` 改成 `REVIEWER-MUTATED`;⭐ **先跑 `tsc --noEmit` 证 mutation 自身 exit 0** | **红在内容断言** `list_note_blocks structuredContent must match the direct service result`,`v2McpTransport.test.ts:456`,diff 显示注入值 ⇒ **不是红在「工具不存在」或 schema 层** |
| **还原保真** | sha256 + tsc + 全套 | bindings 与备份**逐位相同**;还原后 `tsc --noEmit` exit 0;`test:mcp-transport` **48/48**、`v2NotesListService` **7/7**(均复核方自跑) |
| **manifest** | 解析实测 | **14 条**,含 `get_note` / `list_note_blocks`;S4-3 基线 12 + 2,**与 K-5 自报一致** |

### 3. ⭐ 本轮最值钱的一处:它拒绝了一把**循环的刀**

工单 K-2 我写的是「把 `getNote` 改成返回 `null` ⇒ **既有 HTTP 正控必须红**」。
**它发现仓库里根本没有 `GET /api/notes/:id` 的独立 HTTP 正控** —— 于是它**没有**退而求其次去做 `REST === getNote()` 的同源互比,而是**先建了一条带固定 Note ID 的鉴权 REST oracle**,再施刀。

⚠️ **这个区别是决定性的**:`REST === getNote()` 这种自比,**两边同时坏掉时会一起绿** —— 它证明的是「两条路一致」,不是「结果正确」。它换成固定期望值(`44444444-…-444444444444`)之后,刀才真的有鉴别力(红点:实际 `undefined`,期望那个固定 id)。
⇒ **「我的 K-2 指向了一个不存在的机关」是本轮第六查的又一次命中,而这次是 builder 替我兜住的。** 记功。

### 4. K-1 字节等价(复核方核方法,未重跑取证)

它沿用并加强了上一单的强取法:冻结 `globalThis.Date` 与 `crypto.randomUUID` · **两次用独立 Node 进程** · `response.arrayBuffer()` 抓原始 bytes · **无字段豁免**。
两端点 body SHA-256 前后相同(`0fc3bc2f…`/`7fa3eb18…`),整份证物 8,333 B、SHA-256 `5cfb77a3…0054a`,另做 `byte[]` 结构等价 `BYTE_EQUAL=True`。
⭐ **fixture 按单里要求同时含「有源块」与「无源块」**,并**在响应端断言无源块为 `[]` 且无 `null` 泄漏** ⇒ **那步 null 过滤确实被覆盖到了**,没落进盲区。
📌 复核方**未重跑该取证**(需重建提取前状态);**以方法审查 + 其余四刀独立复现 + 全门禁绿**作为替代证据,**如实记此边界**。

### 5. 其他

- **超额跑了 `verify:v2-bn8-runtime`**(exit 0)—— 工单没要求,它自己把全链门跑了一遍。
- **两条 human_entry 的活链**它自己复核了一遍,并点明「两扇门确实指向同一活的人类热读路径」。
- 禁区零越界:`noteHydration.ts` 只 import 未改;写路径 handler 未动;ownership helper 定义未动。

### 6. 结论

**PASS 0/0/0/0**。⇒ **S4 读面全部落地**:内容 / 知识 / 语义 / 溯源 四组真相共 **14 条公开工具**,全部经真实 `tools/call` 端到端正控,`human_entry` 两侧 + 上层活链逐条现物。
**队列第 2 项完成**,下一项为 **TD-12**(测试默认 `mkdtempSync` 隔离资产目录)。
