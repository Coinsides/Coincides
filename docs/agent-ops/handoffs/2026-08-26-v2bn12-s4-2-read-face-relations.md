> from: claude(opus,工程调度会话) | to: codex(builder) | status: draft(等 S4-1 复核通过后翻 ready) | re: v2bn12-S4-2 | date: 2026-08-26

# V2.BN.12 S4-2:读面第二批 —— 语义真相(Relation)

## 定位

S4 读面第二批,只做 Relation 一组。**形状照 S4-1**(挂既有 service,零业务语义新增,C-6 红线不动)。S4-1 通过后本单翻 `ready`。

## 发单前已核实(⭐ 现物;含 `human_entry` 两侧,这一步是本批的重点)

**教训来源**:S4-1 首轮因 `get_content_group` 的客户端调用点不存在而停手(口径 (a) 已由 Fable 成文 `ff4ca7d`:**客户端调用点是硬要求,route 存在不算人类门**)。⇒ 本单的三条工具,**两侧我都先核过了**:

| 工具 | service(纯读已验) | `human_entry.route` | `human_entry.client_call_site` |
|---|---|---|---|
| `list_relations` | `services/relations.ts:452` `listRelations(db, userId, input)` | `GET /api/relations` | `client/src/pages/Notes/canvasEngine/relationRepository.ts:45-47` `loadRelations` |
| `get_relation` | `services/relations.ts:375` `getRelation(db, userId, relationId)` | `GET /api/relations/:relationId` | `relationRepository.ts:40-42` `loadRelation` |
| `list_relation_types` | `services/relations.ts:371` `listRelationTypes()` | `GET /api/relations/types` | `relationRepository.ts:35-37` `loadRelationTypes` |

⚠️ **仍须你自己复核一遍**(我给的是行号,不是免检金牌):若任一侧与现物不符 ⇒ **停手写 `needs: claude`**,⛔ 不许编。

### ⛔ 已排除的一条(写明,免得你以为漏了)

`services/relations.ts:541` 的 **`listRelationAssessments` 不进本批** —— 我核过:`server/src/routes/relations.ts` 里 `assessments` **零命中**,客户端亦无对应调用 ⇒ **两侧人类门都不存在**,按口径 (a) 无法诚实登记。⛔ 不要顺手补一个 route 或客户端调用点来「让它能登记」——那是**为了填表而造门**,方向反了。

### ⭐ 读函数已扫写操作(本批新增的检查项)

四个候选读函数逐个扫过 `INSERT|UPDATE|DELETE|ensureXxx(|.transaction(`:`listRelations` / `getRelation` / `listRelationTypes` / `listRelationAssessments` **全部纯读**。
📌 背景:同日 `listNotePurposes` 被扫出**读时 INSERT**(读会写),purposes 因此退出读面(TD-25)。**「这个读,动没动『什么存在』?」现为读面复核的常备一问。**

⚠️ **`list_relation_types` 的特殊性(如实记,不是缺陷)**:`listRelationTypes()` **不收 `db`、不收 `userId`**,返回的是进程内静态定义表 ⇒ **它没有 ownership 维度,对所有用户返回同一份**。这是它的本性(类型定义不是用户数据),但 binding 与 output_schema 都不得因此假装有用户维度。

## 交付物

### 1. 注册表三条(`server/src/toolFace/registry.ts`)

| name | truth | tier | exposure | scopes | 绑定目标 |
|---|---|---|---|---|---|
| `list_relations` | `semantic` | `immediate` | `public` | `['relations:read']` | `listRelations` |
| `get_relation` | `semantic` | `immediate` | `public` | `['relations:read']` | `getRelation` |
| `list_relation_types` | `semantic` | `immediate` | `public` | `['relations:read']` | `listRelationTypes` |

- `truth: 'semantic'` 系发单方按 `ToolTruth` 现有七值(`content|knowledge|spatial|provenance|semantic|purpose|package`)择定。**若你在码里或文档里找到与此冲突的既有归类,停手上报,⛔ 不自行改归类。**
- schema 规矩**同 S4-1,一字不改**:真 zod `.strict()`;输入照 service 现物(⛔ 不照抄 route 的 query 解析);输出照 service 实际 hydrated 形状(⛔ 不放宽成 `z.unknown()` 蒙混,类型不符就点名)。
- 📌 **TD-14**:`scopes` 是描述性的、无机关强制 —— ⛔ 不得当权限模型使用或声称。

### 2. binding 三条(`server/src/mcp/bindings.ts`)

只做入参适配 + 调既有 service;⛔ 不写 SQL、不写 hydrate、不做 ownership 判断(service 自带;`list_relation_types` 本就无此维度)。加进 `TOOL_BINDINGS`。

### 3. manifest 重生成 + parity

跑既有生成器重生成 `docs/generated/tool-face-manifest.json`(⛔ 不手写);parity 两门必须绿。

### 4. 端到端正控(灵魂,不可省)

**三条工具各一条真实 `tools/call` 端到端**,经 `/api/mcp`,断言 `structuredContent` 通过该工具 `output_schema` 校验且与直调 service 结果一致。
📌 **「过 killer ≠ 有能力」**(12.2a-3 D-a 补注先例):placeholder binding 能过等集合 killer 却不执行能力 ⇒ **不接受只有注册表/parity 层的断言**。
测试加进既有 `server/src/__tests__/v2McpTransport.test.ts`;若新建文件**必须同时接进 `server/package.json` 对应 script**(📌 TD-22:漏挂没有任何机关会提示)。

### 5. 台账

`current-state/deferred-tests.md` 追加一行,成对写。已知略过:`listRelations` 的过滤组合矩阵、方向/类型的全枚举、跨用户矩阵(ownership 由 service 承担,只留最小正控)。

## 必红判据(每刀记红在哪条断言)

- **K-1**:把任一条 binding 换成返回固定空集合的 stub ⇒ 该工具端到端正控**必须红在内容断言**(不是红在「工具不存在」)。恢复后绿。
- **K-2**:把任一条 `output_schema` 的某必填字段改名 ⇒ 该工具端到端正控**必须红在 schema 校验**。恢复后绿。
- **K-3**:manifest 不重生成而直接跑 `check:tool-face-manifest` ⇒ **必须红**。恢复后绿。
- 既有 `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / parity 两门 / 契约专项 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/toolFace/registry.ts`(+3 及其 schema)· `server/src/mcp/bindings.ts`(+3)· `docs/generated/tool-face-manifest.json`(**生成**)· `server/src/__tests__/v2McpTransport.test.ts` · `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`services/relations.ts`(⛔ 一个字节都不改,只调用)· `routes/**` · `services/purposes.ts` · `selectionResolve.ts` · `textFlowIdentity.ts` · `textFlowUnits.ts` · `projections.ts` · `shared/` · transport 骨架 Host/Origin/auth 段 · 任何 migration/schema · 任何 tsconfig · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— **判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain**。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⚠️ ⛔ 不用整条命令行做子串匹配(提示词正文会污染匹配),⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因,⛔ 不自己改 docs。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:K-1/K-2/K-3 各一段(贴先红后绿的红点断言原文与行号)· 三条 `human_entry` 的**你自己复核的现物出处**(文件:行)· `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 35–50 分钟。
