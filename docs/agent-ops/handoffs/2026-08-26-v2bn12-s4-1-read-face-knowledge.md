> from: claude(opus,工程调度会话) | to: codex(builder) | status: ready | re: v2bn12-S4-1 | date: 2026-08-26

# V2.BN.12 S4-1:读面第一批 —— 知识真相(Item / ContentGroup)

## 定位

S4 是「五真相读面由注册表派生」。本单是**第一批**,只做 Item 与 ContentGroup 两组读工具,把形状立住;其余真相按同一形状随后成批。

**⛔ 本单不是新造能力,是把既有 service 挂上工具面。** 四个工具全部**直调既有 service**,零业务语义新增(C-6 红线:禁的是新增业务语义/第二 schema/第二 handler)。

## 发单前已核实(⭐ 现物,不是设计稿转述)

- `server/src/routes/items.ts` 与 `routes/contentGroups.ts` 的 `prepare(` 命中数 **均为 0** ⇒ 读逻辑**已经在 service 里**,**不需要任何提取**(与 `list_notes` 当初的处境相反 —— 那次是逻辑内联在 route 里,才要 S1a)。
- 四个 service 均已存在且自带 ownership:
  - `services/items.ts:354` `listItems(db, userId, input?)` · `:350` `getItem(db, userId, itemId)`
  - `services/contentGroups.ts:392` `listContentGroups(db, userId, input)` · `:428` `getContentGroup(db, userId, groupId)`
- ⚠️ **签名与 `listNotes` 不同**:这四个是 `(db, userId, …)` 位置参数,`listNotes` 是 `({userId, …})` 具名对象。**binding 是适配层,按各自真实签名调用即可;⛔ 不要为了「统一」去改任何 service 签名。**

## ⛔ 本单明确不做(已升级 Fable,等裁定)

设计稿(`analysis/2026-08-21-mcp-tool-face-design.md` §131/§141)把「**缓存头 `ttlMs`/`cacheScope`**」算在读面里。**我发单前核过:注册表与 manifest 里没有任何缓存字段** —— `ToolRegistryEntry`(`toolFace/registry.ts:27-38`)九个字段无一与缓存相关,`registry.ts`/`mcp/manifest.ts`/`mcp/policy.ts` 三个文件 `ttl|cache` **零命中**。

⇒ 缓存头是**新增注册表字段 + manifest 渲染 + 门**的新面,属设计级,**不夹带进本单**。⛔ 回执里不要提缓存,也不要「顺手」加字段。

## 交付物

### 1. 注册表四条(`server/src/toolFace/registry.ts`)

| name | truth | tier | exposure | 绑定目标 |
|---|---|---|---|---|
| `list_items` | `knowledge` | `immediate` | `public` | `listItems` |
| `get_item` | `knowledge` | `immediate` | `public` | `getItem` |
| `list_content_groups` | `knowledge` | `immediate` | `public` | `listContentGroups` |
| `get_content_group` | `knowledge` | `immediate` | `public` | `getContentGroup` |

- `input_schema` / `output_schema` 一律**真 zod `.strict()`**(照 `resolve_selection` 的样式,⛔ 不用 `z.any()`、⛔ 不用 passthrough)。
- **输入 schema 必须与 service 实际接受的入参逐字段对齐**(照读 service 源码,⛔ 不照抄 route 的 query 解析)。
- **输出 schema 必须与 service 实际返回的 hydrated 形状对齐**。⚠️ 若发现某字段的实际类型与你的预期不符,**以 service 现物为准**并在回执里点名该字段;⛔ 不要放宽成 `z.unknown()` 蒙混。
- `human_entry.route` 与 `human_entry.client_call_site`:**必须是现物**。逐条打开对应 route 文件与客户端调用点确认存在后再写;**任一条找不到真实客户端调用点 ⇒ 停手写 `needs: claude`,⛔ 不许编一个看起来合理的路径**(本仓有三次「点名不存在的机关」先例,不再添第四次)。
- `scopes`:`['items:read']` / `['content_groups:read']`。📌 **TD-14:`scopes` 目前是描述性的,无任何机关强制** —— ⛔ 不得在本单里把它当权限模型使用或声称它是。

### 2. binding 四条(`server/src/mcp/bindings.ts`)

- 每条**只做入参适配 + 调既有 service**,⛔ 不写 SQL、⛔ 不写 hydrate、⛔ 不做 ownership 判断(service 自己带)。
- `db` 从既有取法拿(照 `selectionResolve` 用 `getDb()` 的先例,或 service 已有的取法);⛔ 不新建连接。
- 加进 `TOOL_BINDINGS` map。

### 3. manifest 重生成 + parity

- 跑既有生成器重生成 `docs/generated/tool-face-manifest.json`(⛔ 不手写该文件)。
- 既有 parity 门(`check:tool-face-parity` / `test:tool-face-parity`)必须绿。

### 4. 端到端正控(⭐ 本单的灵魂,不可省)

**四条工具各一条真实 `tools/call` 端到端**,经 `/api/mcp`,断言返回的 `structuredContent` 通过该工具的 `output_schema` 校验且内容与直调 service 的结果一致。

📌 **先例明令(12.2a-3 D-a 补注)**:`placeholder binding` 能过等集合 killer 却不执行能力 ——「**过 killer ≠ 有能力**」。⇒ 本单 killer **必须含真实 `tools/call` 端到端**,不接受只有注册表/parity 层的断言。

测试加进既有 `server/src/__tests__/v2McpTransport.test.ts`(它已是 `test:mcp-transport` 的显式入口);**若你新建测试文件,必须同时接进 `server/package.json` 的对应 script**(📌 TD-22:显式列表漏挂**没有任何机关会提示你**)。

### 5. 台账

`current-state/deferred-tests.md` 追加一行,成对写(略过什么 / 本来会挡什么)。本单已知略过:分页/limit 边界矩阵、`q` 搜索的多字段组合、跨 course 越权矩阵(ownership 由 service 承担,本单只留最小正控)。

## 必红判据(builder 前置自查;每刀记红在哪条断言)

- **K-1**:把任一条 binding 换成返回固定空集合的 stub ⇒ **该工具的端到端正控必须红**,且红在**内容断言**上(不是红在「工具不存在」)。恢复后绿。
- **K-2**:把任一条 `output_schema` 里的某个必填字段改名 ⇒ **该工具的端到端正控必须红**,红在 schema 校验。恢复后绿。
- **K-3**:manifest 不重生成而直接跑 `check:tool-face-manifest` ⇒ **必须红**(证明四条新工具确实进了 manifest,不是只进了注册表)。恢复后绿。
- 既有 `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / parity 两门 / 契约专项 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/toolFace/registry.ts`(+4 条及其 schema)· `server/src/mcp/bindings.ts`(+4)· `docs/generated/tool-face-manifest.json`(**生成,不手写**)· `server/src/__tests__/v2McpTransport.test.ts`(加端到端正控)· `docs/agent-ops/current-state/deferred-tests.md`(加一行)。

**禁区**:`services/items.ts` · `services/contentGroups.ts`(⛔ **一个字节都不改**,只调用)· `routes/**` · `selectionResolve.ts` · `textFlowIdentity.ts` · `textFlowUnits.ts` · `projections.ts` · `shared/` · transport 骨架的 Host/Origin/auth 段 · 任何 migration/schema · 任何 tsconfig · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— porcelain 显 `M` 但内容等于 HEAD,**判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain**。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。Henry 的桌面应用识别方式是 **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`** —— ⚠️ **不要用整条命令行做子串匹配**(提示词正文可能包含该字符串,会把 builder 自己误判成桌面应用;调度方 2026-08-26 亲踩),也**不要按 PID 数字认**(每次重启就变)。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若因新增文档变红,**如实记 exit 与原因即可**,⛔ 不要自己改 `docs/agent-ops/INDEX.md`(生成件归发单方)。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`(**不需确认**):K-1/K-2/K-3 各一段(须贴先红后绿的红点断言原文与行号)· 四条 `human_entry` 的**现物出处**(文件:行)· `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 40–60 分钟。
