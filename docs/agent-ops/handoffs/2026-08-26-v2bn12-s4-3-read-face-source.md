> from: claude(opus,工程调度会话) | to: codex(builder) | status: draft(等 S4-2 通过后翻 ready) | re: v2bn12-S4-3 | date: 2026-08-26

# V2.BN.12 S4-3:读面第三批 —— 溯源真相(Source Scope / Source Anchor)

## 定位

S4 读面第三批,只做溯源侧。**形状照 S4-1/S4-2**(挂既有 service,零业务语义新增,C-6 红线不动)。

⛔ **V12.9「基建集成节」边界**(Fable 2026-08-26 周知):抽取侧(PDF 管线 / 云端 VLM / 嵌入检索)的一切形状归 V12.9 现场定 —— 本单**只挂现役的**,⛔ 不为将来的抽取物预留任何字段、参数或工具名。

## 发单前已核实(⭐ 两侧现物;含被排除项)

### 进本批的四条

| 工具 | service(纯读已验) | `human_entry.route` | `human_entry.client_call_site` |
|---|---|---|---|
| `list_source_scopes` | `services/sourceScopes.ts:230` `listSourceScopes(db, userId, input)` | `GET /api/source-scopes`(`routes/sourceScopes.ts:20`) | `client/src/pages/Courses/CourseDetail.tsx:500` |
| `get_source_scope_jump_target` | `services/sourceScopes.ts:332` `getSourceScopeJumpTarget(db, userId, scopeId)` | `GET /api/source-scopes/:id/jump-target`(`routes/sourceScopes.ts:31`) | `client/src/pages/Courses/CourseDetail.tsx:790` |
| `list_source_anchors` | `services/sourceAnchors.ts:362` `listSourceAnchors(db, userId, input)` | `GET /api/source-anchors`(`routes/sourceAnchors.ts:14`) | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:673` |
| `get_source_anchor_jump_target` | `services/sourceAnchors.ts:396` `getSourceAnchorJumpTarget(db, userId, anchorId)` | `GET /api/source-anchors/:id/jump-target`(`routes/sourceAnchors.ts:33`) | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:2147` |

⚠️ **仍须你自己复核一遍**(行号不是免检金牌);任一侧不符 ⇒ **停手写 `needs: claude`**,⛔ 不许编。

### ⛔ 排除两条(写明理由,免得你以为漏了)

- **`get_source_scope`**(`services/sourceScopes.ts:248`):route 存在(`routes/sourceScopes.ts:43` `GET /:id`),但 **客户端零调用** —— 客户端对单个 scope 只调 `/jump-target`(读)与 `/archive`(写)。
- **`get_source_anchor`**(`services/sourceAnchors.ts:389`):route 存在(`routes/sourceAnchors.ts:41` `GET /:id`),**客户端零调用** —— 只调 `/jump-target` 与 `/refresh`。

⇒ 两条按 **`human_entry` 口径 (a)**(Fable 2026-08-26 成文 `ff4ca7d`:**客户端调用点是硬要求,route 存在不算人类门**)**无法诚实登记**,本批不做。
⛔ **不要「顺手补一个客户端调用点」让它们能登记** —— 那是**为了填表而造门,方向反了**(同 S4-2 排除 `listRelationAssessments` 的理由)。

### ⭐ 读函数已扫写操作

四条全部纯读;`ensureCourse`(`sourceScopes.ts:52` / `sourceAnchors.ts` 同名)经复核是 **`SELECT … WHERE id=? AND user_id=?` + `throw AppError(404)`** 的归属断言,**零写操作**。
📌 背景:同日 `listNotePurposes` 被扫出读时 `INSERT`(TD-25)⇒「**这个读,动没动『什么存在』?**」现为读面复核常备一问。

## 交付物

### 1. 注册表四条(`server/src/toolFace/registry.ts`)

| name | truth | tier | exposure | scopes | 绑定目标 |
|---|---|---|---|---|---|
| `list_source_scopes` | `provenance` | `immediate` | `public` | `['sources:read']` | `listSourceScopes` |
| `get_source_scope_jump_target` | `provenance` | `immediate` | `public` | `['sources:read']` | `getSourceScopeJumpTarget` |
| `list_source_anchors` | `provenance` | `immediate` | `public` | `['sources:read']` | `listSourceAnchors` |
| `get_source_anchor_jump_target` | `provenance` | `immediate` | `public` | `['sources:read']` | `getSourceAnchorJumpTarget` |

- `truth: 'provenance'` 系发单方按 `ToolTruth` 现有七值择定;**若在码或文档里找到冲突的既有归类,停手上报,⛔ 不自行改归类。**
- schema 规矩**同 S4-1/S4-2 一字不改**:真 zod `.strict()`;输入照 service 现物(⛔ 不照抄 route 的 query 解析);输出照 service 实际返回形状(⛔ 不放宽成 `z.unknown()`,类型不符就点名)。
- 📌 **TD-14**:`scopes` 描述性、无机关强制 ⇒ ⛔ 不得当权限模型使用或声称。

### 2. binding 四条(`server/src/mcp/bindings.ts`)

只做入参适配 + 调既有 service;⛔ 不写 SQL、不写 hydrate、不做 ownership 判断(service 自带)。加进 `TOOL_BINDINGS`。

### 3. manifest 重生成 + parity

跑既有生成器重生成 `docs/generated/tool-face-manifest.json`(⛔ 不手写);parity 两门绿。

### 4. 端到端正控(灵魂,不可省)

四条各一条真实 `tools/call` 端到端,经 `/api/mcp`,断言 `structuredContent` 通过 `output_schema` 校验且与直调 service 结果一致。
📌 「**过 killer ≠ 有能力**」(12.2a-3 D-a 补注):⛔ 不接受只有注册表/parity 层的断言。
测试进既有 `server/src/__tests__/v2McpTransport.test.ts`;新建文件**必须同时接进 `server/package.json` 对应 script**(📌 TD-22)。

### 5. 台账

`current-state/deferred-tests.md` 追加一行,成对写。已知略过:jump-target 的失效/悬空目标分支、`listSourceAnchors` 的过滤组合矩阵、跨 course 越权矩阵(ownership 由 service 承担,只留最小正控)。

## 必红判据(每刀记红在哪条断言)

- **K-1**:任一 binding 换成固定空返回的 stub ⇒ 该工具端到端**必须红在内容断言**。恢复后绿。
- **K-2**:任一 `output_schema` 必填字段改名 ⇒ 该工具端到端**必须红在 schema 校验**。恢复后绿。
- **K-3**:manifest 不重生成而直接跑 `check:tool-face-manifest` ⇒ **必须红**。恢复后绿。
- 既有 `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / parity 两门 / 契约专项 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/toolFace/registry.ts`(+4 及其 schema)· `server/src/mcp/bindings.ts`(+4)· `docs/generated/tool-face-manifest.json`(**生成**)· `server/src/__tests__/v2McpTransport.test.ts` · `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`services/sourceScopes.ts` · `services/sourceAnchors.ts`(⛔ 一个字节都不改,只调用)· `services/sourceRecords.ts` / `sourceSnapshots.ts` / `sourceMaterialization*.ts` / `sourceProjection*.ts`(⛔ 本批不碰任何抽取/物化侧)· `routes/**` · `selectionResolve.ts` · `textFlowIdentity.ts` · `projections.ts` · `shared/` · transport 骨架 Host/Origin/auth 段 · 任何 migration/schema · 任何 tsconfig · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— **判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain**。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⚠️ ⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因,⛔ 不自己改 docs。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:K-1/K-2/K-3 各一段(贴红点断言原文与行号)· 四条 `human_entry` 的**你自己复核的现物出处**(文件:行)· `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 40–55 分钟。
