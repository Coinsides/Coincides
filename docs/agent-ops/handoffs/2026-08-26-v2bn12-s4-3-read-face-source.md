> from: claude(opus,工程调度会话) | to: codex(builder) | status: done(S4-3 + `get_relation` 追溯摘牌) | re: v2bn12-S4-3 | date: 2026-08-26

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

### ⭐ 新规则「调用点必须活着」的合规核实(2026-08-27,发单方补做)

Fable 于 `0f877b7` 修订 `human_entry` 口径:**`client_call_site` 指向的函数须有上层消费链(至少一跳、链头在真实 UI 面)**;零调用者的 repository 函数 = **死调用点,不构成人类门**;「至少一跳」是**机械地板**不是可达性证明;**字面与立法理由冲突时以理由为准**。

**本单四条逐条核过,全部合规**:

| 工具 | 调用点函数 | 上层消费链(链头) |
|---|---|---|
| `list_source_scopes` | `CourseDetail.tsx:497` `fetchSourceScopes` | ✅ `:560` `useEffect` 内调用(挂载即拉);另 `:778`/`:811` 写操作后重拉 |
| `get_source_scope_jump_target` | `CourseDetail.tsx:787` `handleOpenSourceScope` | ✅ `:1151` `onClick={() => handleOpenSourceScope(scope.id)}` —— **链头就是真实 UI 事件** |
| `list_source_anchors` | `useNoteCanvasDataAdapter.ts:667` `fetchSourceAnchors` | ✅ `:688` `useEffect` 内调用 |
| `get_source_anchor_jump_target` | `useNoteCanvasDataAdapter.ts:2144` `handleViewSource` | ✅ `:2224` 由 adapter 导出 → `useNoteCanvasRuntimeController.ts:141` 接收 → `:443` 作为 `onViewSource` 下发到层 |

⇒ **无 S4-3 伤亡**,四条照原计划做。

⚠️ **一处不对称如实记(非缺陷,不改交付)**:`fetchSourceAnchors` 在 GET 之前**还先发了一个 `POST /source-anchors/generate`**(`:669-672`)。⇒ **人类门做的事比本工具多** —— 本工具只绑 `listSourceAnchors`(纯读),**⛔ 不得因人类门带生成而给工具加生成语义**,也 ⛔ 不得在 `human_entry` 或描述里暗示该工具会生成锚。

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

### 4b. ⭐ 搭车一行断言(Fable 2026-08-26 裁定落点定本单)

在你本单触及的 server 测试面里,**加一条断言守住 TD-26 的钩子**:读 `server/package.json`,断言 `scripts["pretest:v2"]` **同时包含** `check:tool-face-manifest` 与 `copy:tool-face-manifest` 两个命令名。

**为什么要这条**:TD-26 已清,但复核发现**没有任何常驻机关守着「钩子还在」** —— 现有常驻测试只证「copy 能按字节重建缺失目标」,**不检查钩子是否还挂在 `test:v2` 上**;真正证明接线的是那单 K-1 的四步人工验证,**那是一次性验证,不是守卫**。⇒ 病名:「**机关在,但没有守机关的机关**」(与 TD-22 同族)。

- **必红**:把 `pretest:v2` 里的 `check:tool-face-manifest` 那一半临时删掉 ⇒ **该断言必须红**;恢复后绿。(⚠️ 这一刀改的是 `server/package.json`,**改完务必还原**,并以 `git diff` 自核。)
- ⛔ **只加断言,不改钩子本身**;⛔ 不要顺手给别的脚本加钩子(TD-26 单里已实测 `test:mcp-transport` 不同病)。
- 断言放哪个文件由你定(可放本单新增的读面测试里,也可放既有 server 测试面),但**必须在常驻门内被跑到**(📌 TD-22)。

### 5. 台账

`current-state/deferred-tests.md` 追加一行,成对写。已知略过:jump-target 的失效/悬空目标分支、`listSourceAnchors` 的过滤组合矩阵、跨 course 越权矩阵(ownership 由 service 承担,只留最小正控)。

### 6. ⭐ 独立 hunk:`get_relation` 摘牌(Fable `0f877b7` 追溯适用)

**背景**:S4-2 已落地的 `get_relation`,其 `client_call_site`(`relationRepository.ts:40-42` `loadRelation`)经复核为**零上层调用者的死调用点** ⇒ 按新规则**不构成人类门**。Fable 裁:**追溯摘牌**,理由原文 ——「**同一天同样的答案必须得到同样的结论,这比留着一个好用的工具重要**」(对照:`get_content_group` 因无调用点被裁)。

**⛔ 这是与读面四条**并列的独立 hunk**,请分开做、分开记**:

- **四处摘净**:①`server/src/toolFace/registry.ts` 的 `get_relation` 注册项(及其**专属** schema —— ⚠️ 若某个 schema 与 `list_relations` **共用**,只删专属的那部分,⛔ 不要连坐)②`server/src/mcp/bindings.ts` 的 `getRelationBinding` 与 `TOOL_BINDINGS` 里那一行 ③`server/src/__tests__/v2McpTransport.test.ts` 里 `S4-2 tools/call get_relation` 那条端到端正控 ④重生成 manifest。
- ⛔ **`list_relations` 与 `list_relation_types` 不动**(它们的调用点均有活的上层消费链:`ContentGroupPanel.tsx:448`/`:612`/`:449`)。
- ⛔ **`services/relations.ts` 的 `getRelation` 本体不动** —— 它是 route 的正门实现,摘的只是工具面的牌。
- ⛔ **不要动 `client/src/.../relationRepository.ts` 的 `loadRelation`** —— 那份死 client 码已被 Fable 记入**收口批退役候选**(与 `proposalStore` 同清,断言同样用精确词),**不在本单**。

**摘牌 killer(独立于读面三刀)**:
- **K-4**:`docs/generated/tool-face-manifest.json` 的条目数**回落**(S4-2 后为 9 条;本单加四条读工具、摘一条 ⇒ 应为 **12 条**,全 public)—— **贴生成器输出原文**。
- **K-5**:`check:tool-face-parity` / `test:tool-face-parity` **两门仍绿**(摘牌后注册表与 binding 仍一一对应,没摘出孤儿)。
- **K-6**:全套件绿,且 `test:mcp-transport` 的条数**相应回落一条**(S4-2 后 43;本单 +4 读工具正控 −1 摘牌 ⇒ 应为 **46**)。⚠️ **若实际数字与此不符,不要凑数** —— 如实写你数到的数与差异原因。

📌 **历史不改写**:S4-2 的 `## Result` / `## Review` 与其提交**保持原样**,⛔ 不要回头修改它们;摘牌是本单的动作,不是对历史的更正。

## 必红判据(每刀记红在哪条断言)

- **K-1**:任一 binding 换成固定空返回的 stub ⇒ 该工具端到端**必须红在内容断言**。恢复后绿。
- **K-2**:任一 `output_schema` 必填字段改名 ⇒ 该工具端到端**必须红在 schema 校验**。恢复后绿。
- **K-3**:manifest 不重生成而直接跑 `check:tool-face-manifest` ⇒ **必须红**。恢复后绿。
- 既有 `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / parity 两门 / 契约专项 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/toolFace/registry.ts`(+4 及其 schema,**并摘除 `get_relation` 注册项及其专属 schema**)· **§4b 那条断言所在的测试文件**· `server/src/mcp/bindings.ts`(+4,**并摘除 `getRelationBinding` 与其 map 行**)· `docs/generated/tool-face-manifest.json`(**生成**)· `server/src/__tests__/v2McpTransport.test.ts` · `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`services/sourceScopes.ts` · `services/sourceAnchors.ts`(⛔ 一个字节都不改,只调用)· `services/sourceRecords.ts` / `sourceSnapshots.ts` / `sourceMaterialization*.ts` / `sourceProjection*.ts`(⛔ 本批不碰任何抽取/物化侧)· `routes/**` · `selectionResolve.ts` · `textFlowIdentity.ts` · `projections.ts` · `shared/` · transport 骨架 Host/Origin/auth 段 · 任何 migration/schema · 任何 tsconfig · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— **判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain**。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⚠️ ⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因,⛔ 不自己改 docs。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:K-1/K-2/K-3 各一段(贴红点断言原文与行号)· **§4b 那条断言的先红后绿**(含删掉 `check` 半边后的红点原文,以及 `server/package.json` 还原自核)· 四条 `human_entry` 的**你自己复核的现物出处**(文件:行)· `git diff --numstat` 对照边界(⚠️ `server/package.json` 最终应为**零 diff** —— §4b 只加断言不改钩子)· **§6 摘牌的 K-4/K-5/K-6 三项数字与出处** · 显式范围排除。

⏱ 预估 40–55 分钟。

## Result

### 状态与交付

`done`。四条 Source 纯读工具已落到既有工具面；§4b 的常驻断言已接进原有 `test:v2`；§6 的 `get_relation` 追溯摘牌作为独立动作完成。没有新增或迁移业务真相。

- `server/src/toolFace/registry.ts:389-590`：按 service 实际输入/返回形状增加严格 Zod schema；`:689-744` 登记 `list_source_scopes`、`get_source_scope_jump_target`、`list_source_anchors`、`get_source_anchor_jump_target`。四条均为 `provenance / immediate / public`，`scopes: ['sources:read']`。
- `server/src/mcp/bindings.ts:61-96`：四条 binding 只做入参适配并直调既有 service；`:121-124` 接入 `TOOL_BINDINGS`。没有 SQL、hydrate、ownership 判断或新连接。
- `server/src/__tests__/v2McpTransport.test.ts:865-939`：四条真实 `POST /api/mcp` / `tools/call` 正控，均以直调 service 作 oracle；共用断言在 `:437-450` 校验运行时 `output_schema`、`structuredContent` 等值及 text JSON 等值。
- `server/src/__tests__/v2TestV2ManifestHook.test.ts:71-85`：新增 T-2 常驻断言，同时守 `check:tool-face-manifest` 与 `copy:tool-face-manifest`；该文件原已由 `server/package.json:22` 显式接入 `test:v2`。
- `docs/generated/tool-face-manifest.json`：用既有生成器重生成，最终 12 条、12 条 public；没有手写。
- `docs/agent-ops/current-state/deferred-tests.md:28`：追加一条成对台账，覆盖略过项及其所挡风险。

TD-14 口径保持不变：`scopes` 只是描述性元数据，本轮未新增 scope enforcement，也不把它声称为权限模型。TD-22 已守住：新增正控和 §4b 断言都位于现有常驻门内。

### 四条 `human_entry` 现物复核

| 工具 | 纯读 service / route | client 调用点 | 活消费链 |
|---|---|---|---|
| `list_source_scopes` | `services/sourceScopes.ts:230`；`routes/sourceScopes.ts:20` | `CourseDetail.tsx:497`，GET 在 `:500` | `:560` 挂载 `useEffect` 调用；`:778` / `:811` 写后重拉 |
| `get_source_scope_jump_target` | `services/sourceScopes.ts:332`；`routes/sourceScopes.ts:31` | `CourseDetail.tsx:787`，GET 在 `:790` | `:1151` 真实 UI `onClick` 调用 |
| `list_source_anchors` | `services/sourceAnchors.ts:362`；`routes/sourceAnchors.ts:14` | `useNoteCanvasDataAdapter.ts:667`，GET 在 `:673` | `:688` 的 `useEffect` 调用 |
| `get_source_anchor_jump_target` | `services/sourceAnchors.ts:396`；`routes/sourceAnchors.ts:33` | `useNoteCanvasDataAdapter.ts:2144`，GET 在 `:2147` | `:2224` 导出 → `useNoteCanvasRuntimeController.ts:141` 接收、`:443` 下发 → `BlockSourceReferenceLayer.tsx:39` 真实 UI `onClick` |

两处 `ensureCourse` 也重新读过：`sourceScopes.ts:52-55` 与 `sourceAnchors.ts:39-42` 均只有按 `id + user_id` 的 SELECT 和 404，没有写库。`fetchSourceAnchors` 的人类路径在 GET 前另有 `POST /source-anchors/generate`（`useNoteCanvasDataAdapter.ts:669-672`）；工具只绑定纯读 `listSourceAnchors`，没有继承或暗示生成语义。

排除项保持排除：没有登记 `get_source_scope` / `get_source_anchor`，也没有为了填 `human_entry` 去补客户端调用点。

### 必红判据

#### K-1：binding 内容刀

临时把 `listSourceScopesBinding` 换成固定 `[]`；先跑 server `tsc --noEmit`，exit `0`，证明 mutation 自身可编译。再单跑：

```text
node --import tsx --test --test-name-pattern="S4-3 tools/call list_source_scopes" src/__tests__/v2McpTransport.test.ts
```

exit `1`，准确红在 `assert.deepEqual`（`v2McpTransport.test.ts:445`；调用点 `:881`）：

```text
list_source_scopes structuredContent must match the direct service result
actual: []
expected: [ ...非空 Source Scope... ]
```

恢复真实 binding 后，同一 targeted test exit `0`（1/1）；`bindings.ts` 恢复到施刀前 blob `cb9a41ab812e1183cd95c9a6a94421cb6bf662c6`。

#### K-2：output schema 字段刀

临时把 `sourceScopeOutputSchema` 的必填字段 `label` 攨名为 `scope_label`；server `tsc --noEmit` 先证 exit `0`。同一 targeted test exit `1`，准确红在 schema 断言（`v2McpTransport.test.ts:438`；调用点 `:881`）：

```text
list_source_scopes output_schema rejected structuredContent:
invalid_type at [0,"scope_label"]: Required
unrecognized_keys: "label"
```

恢复 `label` 后同一 targeted test exit `0`（1/1）；`registry.ts` 恢复到施刀前 blob `231e798397a0a24afee42db3a47d457c56a83378`。

#### K-3：旧 manifest freshness

注册表改完、重生成前直接跑 `npm.cmd run check:tool-face-manifest`，exit `1`，红点来自生成器 `scripts/generate-tool-face-manifest.ts:168-169`：

```text
过期: docs/generated/tool-face-manifest.json
请运行: npm run docs:tool-face-manifest
```

随后 `npm.cmd run docs:tool-face-manifest` exit `0`；最终 freshness check exit `0`（12 条、12 条 public）。

#### §4b：守 `pretest:v2` 钩子

临时只删 `server/package.json` 的 `check:tool-face-manifest` 半边、保留 copy；JSON parse 成功后单跑 T-2，exit `1`。红在 `v2TestV2ManifestHook.test.ts:77`，消息字面量在 `:83`：

```text
pretest:v2 must retain both check:tool-face-manifest and copy:tool-face-manifest
actual:   { check: false, copy: true }
expected: { check: true,  copy: true }
```

恢复后 targeted test exit `0`（1/1），全量 `test:v2` 亦跑到 T-2。最终 `git diff --exit-code -- server/package.json` exit `0`；filtered worktree blob 与 HEAD 均为 `72c7b1e926524e56154a67d50adb41b82a8c251a`。钩子本身仍是 `server/package.json:21` 的 `check + copy`，本轮只新增断言。

### §6 独立 hunk：`get_relation` 追溯摘牌

本项与四条 Source 工具分开处理：

1. 从 `server/src/toolFace/registry.ts` 删除 `get_relation` 注册项及仅供它使用的 input/output alias；共享 Relation output 与 `list_relations` / `list_relation_types` 保留（注册项现位于 `:661` / `:675`）。
2. 从 `server/src/mcp/bindings.ts` 删除 `getRelationBinding` 及 map 行；另两条 Relation binding 保留（`:119-120`）。
3. 从 `v2McpTransport.test.ts` 删除 `S4-2 tools/call get_relation` 正控；`list_relations` / `list_relation_types` 正控保留（`:828-861`）。
4. 由生成器重建 manifest。对上述 registry / binding / transport test / manifest 精确搜索，`get_relation` 和 `getRelationBinding` 均为 0 处。

明确没有改 `services/relations.ts` 的 `getRelation`（仍在 `:375`），也没有改死 client 码 `relationRepository.ts:40-42` 的 `loadRelation`；两文件均为零 diff。S4-2 的 Result / Review 与提交历史未改写。

- **K-4**：生成器原文为 `tool-face manifest 已生成：12 条条目，其中 12 条 public。`；解析最终 manifest 也得到 `Count=12`、`Public=12`，且无 `get_relation`。
- **K-5**：`test:tool-face-parity` exit `0`（10/10）；`check:tool-face-parity` exit `0`，原文为 `[PASS] ... 12 public entries checked`。
- **K-6**：隔离资产目录的全量 `test:v2` exit `0`（实际 279/279）；`test:mcp-transport` exit `0`（实际 46/46）。数字正好是 S4-2 后 43 − 1 摘牌 + 4 Source 正控 = 46，没有凑数。

### 门禁收据

严格按 docs-first 顺序执行：

| 顺序 | 门 | exit | 实际收据 |
|---:|---|---:|---|
| 1 | 根 `npm.cmd run docs:check` | 0 | object inventory 最新 |
| 2 | client `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 3 | server `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 4 | 根 `npm.cmd run test:unit` | 0 | 22 files / 222 tests |
| 5 | server `npm.cmd run test:v2` | 0 | 独立 GUID 命名的 OS Temp `CANVAS_ASSET_DIR` / `SOURCE_BLOB_DIR`；279/279；`pretest:v2` 的 check + copy 同时运行 |
| 6 | server `npm.cmd run test:mcp-transport` | 0 | 46/46 |
| 7 | 根 `npm.cmd run test:tool-face-registry` | 0 | 5/5 |
| 8 | 根 `npm.cmd run test:tool-face-manifest` | 0 | 10/10 |
| 9 | 根 `npm.cmd run check:tool-face-manifest` | 0 | 12 条、12 条 public，fresh |
| 10 | 根 `npm.cmd run test:tool-face-parity` | 0 | 10/10 |
| 11 | 根 `npm.cmd run check:tool-face-parity` | 0 | 12 条 public 必要条件通过；门自身仍注明 human reachability 未验证 |
| 12 | server `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 4/4 |

另跑 `git diff --check`，exit `0`；只有既有 LF→CRLF 提示，没有 whitespace error。两路独立只读复核均未发现 P0–P2 或阻断问题。

### `git diff --numstat`、边界与现场

追加本 Result 前的精确 numstat：

```text
2       1       docs/agent-ops/INDEX.md
1       0       docs/agent-ops/current-state/deferred-tests.md
38      3       docs/agent-ops/handoffs/2026-08-26-v2bn12-s4-3-read-face-source.md
2034    279     docs/generated/tool-face-manifest.json
181     16      server/src/__tests__/v2McpTransport.test.ts
16      0       server/src/__tests__/v2TestV2ManifestHook.test.ts
41      6       server/src/mcp/bindings.ts
214     19      server/src/toolFace/registry.ts
```

- 本单实现面是 deferred ledger、manifest、两处测试、bindings、registry；`server/package.json` 最终零 diff。
- handoff 的 `38/3` 是发单方预置的 `ready`、活调用链补裁与 §6 修订；本轮完整保留，只把 header 翻为 `done` 并追加本 Result。
- `docs/agent-ops/INDEX.md` 的 `2/1`、未跟踪 `docs/agent-ops/handoffs/2026-08-27-v2bn12-s4-4-read-face-notes.md` 与 `.claude/settings.local.json` 均为他人现场，本轮未改。
- 写回后本 handoff 的最终 numstat：`187 / 3`。

显式范围排除：未改 `services/sourceScopes.ts`、`services/sourceAnchors.ts`、`services/relations.ts`、任何 `routes/**`、任何客户端、抽取/物化 service、`selectionResolve.ts`、`textFlowIdentity.ts`、`shared/`、transport Host/Origin/auth 骨架、migration/schema、tsconfig、`server/package.json`、S4-2 历史或其他 handoff/analysis 文档。

### D 段与收尾

- 三处 porcelain `M` 均用 filtered hash 对 HEAD 判真：`useNoteCanvasRuntimeController.ts` 两侧 `3efe5f820e2077850611b54d4d09482845e89545`；`SelectionToolbarLayer.tsx` 两侧 `29de8952e37a29bda051d6f82e17508d8c694637`；`server/src/routes/projections.ts` 两侧 `561902a449b50ce254b650de5a337973a8fbc26d`。三处均为 EOL 假阳性，没有内容差异。
- `.codex-tmp/builder.lock.d` 与 `owner.json` 未取、未覆盖、未删；未杀或尝试杀任何 Codex 进程，也未用命令行正文或 PID 数字识别 Codex。
- 当前分支仍为 `fable/v2-bn12-exoskeleton`，HEAD `d6982a2`。开工时 S4-2 基线已在该 HEAD，而非仍为未提交修改；所需基线内容完整，属于现场描述的时间性差异，没有改变本单施工语义。
- 未 commit、未 push、未切换或触碰 `main`。
- 本 Result 以 UTF-8 由 `apply_patch` 写入；写后再做严格 UTF-8 解码、唯一标题及最终边界自检。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **PASS 0/0/0/0**

### 1. 收工判定(两条并用)

进程 `14264` **消失** ∧ **三块交付物均出现**(`registry.ts` +214/−19 · `bindings.ts` +41/−6 · `v2McpTransport.test.ts` +181/−16 · `v2TestV2ManifestHook.test.ts` +16 · `manifest.json` +2034/−279 · `deferred-tests.md` +1)。

### 2. 三块逐块复核(⭐ 亲手施刀,不吃回执)

#### 2.1 读面四条

| 位点 | 复核方验证 | 结果 |
|---|---|---|
| 注册与绑定 | 读 diff | 四条 `provenance / immediate / public`,binding 均为薄适配直调既有 service,**零 SQL / 零 hydrate / 零 ownership 判断** |
| 排除项 | grep | `get_source_scope` / `get_source_anchor` **未登记**;⛔ 未为填表补客户端调用点 |
| 门 | 复核方自跑 `test:mcp-transport` | **46/46** |

⭐ **它把活链查得比我细**:`get_source_anchor_jump_target` 我只追到 `useNoteCanvasRuntimeController:443` 的 `onViewSource` 下发,**它继续追到 `BlockSourceReferenceLayer.tsx:39` 的真实 UI `onClick`** —— 链头落到真正的用户动作上,比我给的行号更硬。

#### 2.2 §6 `get_relation` 追溯摘牌

| 检查 | 结果 |
|---|---|
| 四处摘净 | `grep -c "get_relation"` 于 `registry.ts` / `bindings.ts` / `manifest.json` **均为 0** |
| 未连坐 | manifest 现 **12 条**,`list_relations` 与 `list_relation_types` **仍在**;实测名单:`list_notes, list_items, get_item, list_content_groups, list_relations, list_relation_types, list_source_scopes, get_source_scope_jump_target, list_source_anchors, get_source_anchor_jump_target, resolve_selection, trash_notes` |
| 本体与死码未动 | `services/relations.ts` 与 `client/.../relationRepository.ts` **`git diff --numstat` 双双为空**(零 diff)⇒ 只摘工具面的牌,`getRelation` 正门实现与 `loadRelation` 死码原样保留(后者归收口批) |
| 历史未改写 | S4-2 的 `## Result` / `## Review` 未被触碰 |
| 数字 | K-6 自报 `test:mcp-transport` 46 = 43 − 1 + 4;**复核方自跑得同一数字**,非凑数 |

#### 2.3 §4b 守钩断言(⭐ 本轮我亲施的那一刀)

把 `server/package.json` 的 `pretest:v2` 缩成只剩 `copy`(⭐ **先证 mutation 自身合法**:`JSON.parse` 通过)⇒ **T-2 红**:
```
pretest:v2 must retain both check:tool-face-manifest and copy:tool-face-manifest
+ actual: check: false   - expected: check: true
```
`v2TestV2ManifestHook.test.ts` —— **与回执自述吻合**。还原后 `server/package.json` sha256 与备份**逐位相同**、对 HEAD **零 diff**;`test:v2` 复跑 **279/279**(复核方自跑,与回执同数)。
⇒ **「机关在,但没有守机关的机关」这条口子已经堵上**,且堵得住(刀能让它红)。

### 3. builder 的三处诚实,记功

1. ⭐ **「mutation 必须先可编译」被当场执行**:K-1 与 K-2 **各自先跑 `tsc --noEmit` 证明 mutation 自身 exit 0**,再取红点。⇒ 这条教训**从发单方昨夜的自曝到进入 builder 的实操,只用了一轮**。
2. **恢复用 blob 自证**:两次施刀后分别贴出恢复到的 blob(`cb9a41ab…` / `231e7983…`),不靠「我改回去了」的口头保证。
3. **数字不凑**:K-6 明确写出 `43 − 1 + 4 = 46` 的算式与实际值,而不是只报一个吻合的数。

### 4. 一条声明(不是缺陷,记此免得下次有人误判)

**`v2TestV2ManifestHook.test.ts` 不可独立运行**:直接 `node --import tsx --test <file>` 会红在
```
T-1 … error: 'npm_execpath is required to exercise the npm lifecycle hook'
```
—— 因为 `npm_execpath` **只有经 npm 启动时才存在**。这是该测试**自己写明的前置条件**(`assert.ok(npmExecPath, …)`),失败即刻自解释,**属良好设计而非缺陷**;经真实门 `npm run test:v2` 跑则 **279/279**。
⚠️ **复核方本人踩过一次**:我直跑该文件得到 `1 pass / 1 fail`,差点当成回归 —— **与「启动器层的红不算红」同族**。记此以免下一位重踩。

### 5. 结论

**PASS 0/0/0/0**。三块(读面四条 / §4b 守钩 / §6 摘牌)各自独立完成、各有独立 killer、边界零越界。
📌 **S4 读面至此覆盖四组真相**(知识 / 语义 / 溯源 各已落地,内容真相待 S4-4);`human_entry` 新口径(调用点必须活着)在本单**首次作为发单前置执行**,四条全过、零伤亡。
