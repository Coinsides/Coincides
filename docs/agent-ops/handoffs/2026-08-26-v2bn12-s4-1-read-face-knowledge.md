> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-S4-1 | date: 2026-08-26

# V2.BN.12 S4-1:读面第一批 —— 知识真相(Item / ContentGroup)

> ⚠️ **2026-08-26 补裁(见文末 `## Dispatcher Ruling`)**:原四条工具缩为**三条** —— `get_content_group` 因 `human_entry` 的客户端调用点在现物里不存在而**退出本批**。下方交付物表已同步移除该行;**其余要求一字不变**。

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

## Result

### 状态

`needs: claude` —— 开工现物核验触发本单第 39 行的硬停手条件：`get_content_group` 有真实服务端 route，但仓内不存在对应的真实客户端单体 GET 调用点。未实施注册表、binding、测试、manifest 或台账改动；header 保持 `ready`，等待调度方补裁后重发。

### `human_entry` 现物核验

| 工具 | `human_entry.route` 现物 | `human_entry.client_call_site` 现物 | 判定 |
|---|---|---|---|
| `list_items` | `server/src/routes/items.ts:70-73`（`GET /api/items`） | `client/src/pages/Notes/canvasEngine/itemRepository.ts:52-60`（`searchItems`） | 有 |
| `get_item` | `server/src/routes/items.ts:90-92`（`GET /api/items/:itemId`） | `client/src/pages/Notes/canvasEngine/itemRepository.ts:47-50`（`loadItem`） | 有 |
| `list_content_groups` | `server/src/routes/contentGroups.ts:33-39`（`GET /api/content-groups`） | `client/src/pages/Notes/canvasEngine/contentGroupRepository.ts:19-29`（`loadContentGroupsForNote`）；另有 `:53-63`（`loadContentGroupsForProject`） | 有 |
| `get_content_group` | `server/src/routes/contentGroups.ts:99-100`（`GET /api/content-groups/:id`） | **不存在** | **硬停手** |

缺口复核：完整扫描 `client/src` 内 `content-groups` 调用后，两处 GET 都是列表端点（`contentGroupRepository.ts:23-29,57-63`）。唯一带 group id 的现有客户端调用是 `client/src/pages/Notes/canvasEngine/groupFolderRepository.ts:106-116` 的 `PUT /content-groups/:id/folder-placement`，不是单体 GET，故未拿它冒充读入口。

### 必红判据

#### K-1

**未执行，无先红后绿输出。** 在注册 binding 前已命中 `human_entry` 停手条件；若继续造 stub mutation，会先越过本单第 39 行，所得红点不构成合规证据。

#### K-2

**未执行，无先红后绿输出。** 未新增或修改任何 `output_schema`，因此没有可诚实施加的必填字段改名 mutation，也未编造 schema 红点原文或行号。

#### K-3

**未执行，无先红后绿输出。** 未修改注册表，亦未生成 manifest；在不存在本单四条新工具的状态下运行“旧 manifest 必红”不能证明本单要求，故未拿无关失败充数。

### 门禁收据

前置现物核验早于施工与验证链即停止；以下各门均无 exit，统一记为 `NOT RUN`，不把共享树基线结果冒充本单实现结果。

| 顺序 | 门 | exit |
|---:|---|---|
| 1 | `docs:check` | `— (NOT RUN: human_entry hard stop)` |
| 2 | client `tsc --noEmit` | `— (NOT RUN: human_entry hard stop)` |
| 3 | server `tsc --noEmit` | `— (NOT RUN: human_entry hard stop)` |
| 4 | `test:unit` | `— (NOT RUN: human_entry hard stop)` |
| 5 | server `test:v2`（隔离资产目录） | `— (NOT RUN: human_entry hard stop)` |
| 6 | `test:mcp-transport` | `— (NOT RUN: human_entry hard stop)` |
| 7 | `test:tool-face-registry` | `— (NOT RUN: human_entry hard stop)` |
| 8 | `test:tool-face-manifest` | `— (NOT RUN: human_entry hard stop)` |
| 9 | `check:tool-face-manifest` | `— (NOT RUN: human_entry hard stop)` |
| 10 | `test:tool-face-parity` | `— (NOT RUN: human_entry hard stop)` |
| 11 | `check:tool-face-parity` | `— (NOT RUN: human_entry hard stop)` |
| 12 | 契约专项 | `— (NOT RUN: human_entry hard stop)` |

### `git diff --numstat` 与边界

在追加本回执前，以下本单允许的产品/生成/测试/台账路径执行 `git diff --numstat -- <paths>`，输出为空：

```text
server/src/toolFace/registry.ts
server/src/mcp/bindings.ts
docs/generated/tool-face-manifest.json
server/src/__tests__/v2McpTransport.test.ts
docs/agent-ops/current-state/deferred-tests.md
```

即这些路径均无本单 diff；追加后的唯一预期内容 diff 是本 handoff 的 `## Result`。三个 porcelain EOL 项按工单指定方法复核，filtered working blob 与 `HEAD` blob 分别相等：

| 路径 | filtered worktree / `HEAD` blob |
|---|---|
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` | `3efe5f820e2077850611b54d4d09482845e89545` / 同值 |
| `client/src/pages/Notes/canvasEngine/layers/SelectionToolbarLayer.tsx` | `29de8952e37a29bda051d6f82e17508d8c694637` / 同值 |
| `server/src/routes/projections.ts` | `561902a449b50ce254b650de5a337973a8fbc26d` / 同值 |

### 显式范围排除

- 未改 `services/items.ts`、`services/contentGroups.ts`、任何 `routes/**`、任何客户端文件、`shared/`、transport 骨架、migration/schema、tsconfig。
- 未改 `docs/agent-ops/INDEX.md`、其他 handoff/analysis 文档或 `.claude/**`；未生成 manifest，未追加 deferred-tests 台账。
- 未取、覆盖或删除 `.codex-tmp/builder.lock.d`，未操作任何进程。
- 未 commit、未 push、未切换或触碰 `main`。

### 需要补裁

请调度方为 `get_content_group` 给出一个已经存在的真实客户端单体 GET 调用点，或另立/扩面先补人类入口；在客户端仍属本单禁区时，builder 无法同时满足“四条工具”与“四条真实 `human_entry.client_call_site`”。

## Dispatcher Ruling(2026-08-26,调度方补裁 —— builder 停手正确,本单缩范围后重发)

> ruled by: claude(opus,工程调度会话) | 依据:builder `## Result` 的 `human_entry` 现物核验 + 调度方独立复验

### 1. builder 停得对(先说这个)

它命中的是**本单第 39 行我自己写死的硬停手条件**(「任一条找不到真实客户端调用点 ⇒ 停手写 `needs: claude`,⛔ 不许编一个看起来合理的路径」),并且:

- **没有拿 `PUT /content-groups/:id/folder-placement` 冒充读入口**(那是最容易蒙混过去的一步);
- **没有为凑 K-1/K-2/K-3 制造无关红点** —— 三刀均如实写「未执行,无先红后绿输出」,并说明理由(在越过停手条件之后取得的红点不构成合规证据);
- **没有拿共享树基线的门禁结果冒充本单结果** —— 十门统一记 `NOT RUN`。

⇒ 这三样正是「**过 killer ≠ 有能力**」那条先例要防的反面行为,它一条都没犯。**记功。**

### 2. 调度方独立复验(⛔ 不吃回执)

`grep -rn "content-groups" client/src` 全量扫过:客户端触及该资源的**全部**调用为 —— `GET /content-groups`(列表,两处:`contentGroupRepository.ts:23` 与 `:57`)· `POST /content-groups/import-note-metadata`(`:33`)· `PUT /content-groups/by-note/:noteId`(`:47`)· `PUT /content-groups/:groupId/folder-placement`(`groupFolderRepository.ts:111`)。
⇒ **确无 `GET /content-groups/:id` 的客户端调用点**,builder 的核验为真。

### 3. 裁定:`get_content_group` **退出本批**,S4-1 缩为三条工具

**保留**:`list_items` · `get_item` · `list_content_groups`(三者的 `human_entry` 两侧现物齐备,builder 已逐条给出文件:行)。
**移除**:`get_content_group`。

**理由(两条,机械的那条为准)**:

1. **机械理由**:`human_entry` 是注册表**必填字段**,而它要求的那一侧**在现物里不存在**。⇒ 该工具**无法被诚实登记**。这不是权衡,是登记不成立。
2. **同向理由**:`GET /api/content-groups/:id` 这条 route **没有任何现役客户端消费者** —— 人类门拿到的是 `listContentGroups` 已 hydrate 的完整 group(含 members 与 folder placements),**单体 GET 在人类侧是冗余的**。为它开一扇 agent 门,等于让 **Agent 门的触及面超出人类门的实际使用面**;与本版一再执行的「无现役消费者不建 / 形状勿跑能力前」同向(同日已在缓存头、12.2c §4 两处照此裁过)。

⚠️ **不采的两条**(写明,免得将来有人以为没想过):
- ⛔ 不采「拿 `folder-placement` 的 PUT 当 `client_call_site`」—— 那是写操作冒充读入口,**字面能填满字段,语义是假的**;
- ⛔ 不采「只填 `route` 留空 `client_call_site`」—— 必填字段留空 = 把「登记不成立」伪装成「登记完成」。

### 4. ⚠️ 留给 Fable 的一个语义问题(不阻塞本单)

**`human_entry.client_call_site` 到底要求什么?** 本单按「必须是真实客户端调用点」执行(这是我在单里写的口径);但注册表设计文档并未定义**当 server route 存在、客户端却不用它**时该如何处理。两种可能的口径 ——(a)现口径:客户端调用点是硬要求,无则不得登记;(b)放宽:server route 即人类门(理由是「人类可以直接调 API」)。
**我按 (a) 执行并据此裁掉一条工具**,但这个口径值得由设计方明文化,因为它决定了**读面的最终覆盖率**:凡「有 route 无客户端消费」的资源,在 (a) 下一律进不了工具面。⇒ 请 Fable 择期明文,⛔ 本单不等。

### 5. 重发条件

本 Ruling 即为补裁,**工单四条改三条,其余全部不变**(schema 严格性、端到端灵魂刀、TD-14/TD-22 两条注记、边界与禁区、D 段一律照旧)。builder 本轮**零产品码改动**(`git diff --numstat` 仅本文件 +81,即其 `## Result` 自身),树干净,可直接重发。

## Result

### 状态与交付

`done`。本轮仅登记并绑定 `list_items`、`get_item`、`list_content_groups` 三条 `knowledge / immediate / public` 工具；`get_content_group` 未实现、未注册、未绑定、未写测试，也未进入生成 manifest。

- `server/src/toolFace/registry.ts`：增加三条真实 Zod schema 与注册项；顶层及所有定形嵌套对象均为 strict，未使用 `z.any()`、`z.unknown()` 或 passthrough。
- `server/src/mcp/bindings.ts`：三条薄适配仅在调用时取 `getDb()`，传入 `context.userId` 后直调既有 service；无 SQL、hydrate、ownership 或新连接。
- `server/src/__tests__/v2McpTransport.test.ts`：在既有显式入口内增加三条真实 `/api/mcp` `tools/call` 正控；每条先造非空现物，以同 fixture 直调 service 作 oracle，再用对应运行时 `output_schema.safeParse(structuredContent)` 校验并逐值等同。
- `docs/generated/tool-face-manifest.json`：由既有生成器重生成，结果为 6 条、全部 public；未手写。
- `docs/agent-ops/current-state/deferred-tests.md`：追加一条成对台账，记明略过的 limit/分页、`q` 多字段组合与跨 Project ownership 矩阵及其所挡风险。

### `human_entry` 现物

| 工具 | route 现物 | client call site 现物 |
|---|---|---|
| `list_items` | `server/src/routes/items.ts:70-73`（`GET /api/items`） | `client/src/pages/Notes/canvasEngine/itemRepository.ts:52-60`（`searchItems`） |
| `get_item` | `server/src/routes/items.ts:90-92`（`GET /api/items/:itemId`） | `client/src/pages/Notes/canvasEngine/itemRepository.ts:47-50`（`loadItem`） |
| `list_content_groups` | `server/src/routes/contentGroups.ts:33-39`（`GET /api/content-groups`） | `client/src/pages/Notes/canvasEngine/contentGroupRepository.ts:19-29`（`loadContentGroupsForNote`）；另有 `:53-63`（`loadContentGroupsForProject`） |

### 现物形状差异

- `listItems` 缺省 `status` 不加状态过滤，实际可返 active + retired；客户端 `searchItems` 自己缺省为 active，不能反推 service。该列表路径的 `anchors` 恒为 `[]`；`getItem` 才 hydrate claimed anchors。`limit` 仅整数时生效并 clamp 到 1..200，非整数等同不加 LIMIT。
- `listContentGroups` 缺省状态排除 deleted，`all` 才含 deleted；`note_id` / `canvas_id` 实返字符串，数据库空值会成为 `''`，不是 nullable。
- member 的实际 `source_sync_status` 含 `stale`；placement 的实际 `added_by` 含 `system`。正规列表 placement 已由查询限定为 `status: 'active'`。
- service 在正规 child rows 为空时会把 legacy `placements_json` / `members_json` 的 JSON object 原样回退，因此 schema 显式保留“严格 normalized object 或 JSON record”两支，没有假称所有历史元素都有 normalized 全字段。

### 必红判据

#### K-1：binding stub

将 `listItemsBinding` 临时替换为固定 `[]` 后，只跑 `S4-1 tools/call list_items`：exit `1`，工具存在且 schema 仍合法，准确红在内容断言：

```text
AssertionError [ERR_ASSERTION]: list_items structuredContent must match the direct service result
```

断言调用位于 `server/src/__tests__/v2McpTransport.test.ts:418`，消息字面量位于 `:421`。恢复真实 binding 后同一 targeted test exit `0`（1/1）；mutation 已完全撤销。

#### K-2：必填字段改名

将 Item output schema 的必填 `plain_text` 临时改名为 `plain_text_probe` 后，只跑 `S4-1 tools/call get_item`：exit `1`，准确红在 schema 校验：

```text
AssertionError [ERR_ASSERTION]: get_item output_schema rejected structuredContent
invalid_type: plain_text_probe Required
unrecognized_keys: plain_text
```

断言调用位于 `server/src/__tests__/v2McpTransport.test.ts:411`，消息模板位于 `:416`。恢复字段后同一 targeted test exit `0`（1/1）；mutation 已完全撤销。

#### K-3：旧 manifest freshness

注册表改完、生成前直接跑 `npm.cmd run check:tool-face-manifest`：exit `1`，原文为：

```text
过期: docs/generated/tool-face-manifest.json
请运行: npm run docs:tool-face-manifest
```

随后运行既有生成器，exit `0`（“已生成：6 条条目，其中 6 条 public”）；恢复后的 freshness gate exit `0`（“未过期：6 条条目，其中 6 条 public”）。

生成/check 时 `zod-to-json-schema` 对递归 JSON value 打印 `Recursive reference detected ... Defaulting to any` 警告；这是现有 `$refStrategy: 'none'` 投影器对递归 schema 的表现。运行时 Zod 仍递归校验 JSON 且没有 `z.any()` / `z.unknown()`；本单没有越界修改生成器，也不把该警告隐瞒成无输出。

### TD 注记

- **TD-14**：`scopes` 仍只登记描述性元数据；本单未新增 scope enforcement，也未赋予权限模型语义。
- **TD-22**：未新建测试文件；三条正控加入既有 `v2McpTransport.test.ts`，而 `test:mcp-transport` 已显式执行它，故无本轮漏挂。未修复 TD-22 所指的全局“显式列表漏挂无发现机关”。

### 门禁收据

| 顺序 | 门 | 最终 exit | 收据 |
|---:|---|---:|---|
| 1 | `npm.cmd run docs:check` | 0 | current object inventory 通过 |
| 2 | client `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 3 | server `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 4 | `npm.cmd run test:unit` | 0 | 22 files / 222 tests |
| 5 | server `npm.cmd run test:v2`（隔离资产目录） | 0 | 277/277；隔离根 `C:\Users\70208\AppData\Local\Temp\coincides-s4-1-green-e04fa7100488403caafdf2242c122922` |
| 6 | server `npm.cmd run test:mcp-transport` | 0 | 40/40，含三条 S4-1 正控 |
| 7 | `npm.cmd run test:tool-face-registry` | 0 | 5/5 |
| 8 | `npm.cmd run test:tool-face-manifest` | 0 | 10/10 |
| 9 | `npm.cmd run check:tool-face-manifest` | 0 | 6 条、全部 public，fresh |
| 10 | `npm.cmd run test:tool-face-parity` | 0 | 10/10 |
| 11 | `npm.cmd run check:tool-face-parity` | 0 | 6 条 public 必要条件通过；门自身注明 human reachability 未由该门证明 |
| 12 | `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 4/4 |

`test:v2` 第一次实际运行曾 exit `1`（277 中 3 条红），诊断重跑同样 exit `1`：三条均为 `v2DevQuickLogin` 子进程读到旧 `server/dist/tool-face-manifest.json`，报 `Tool binding parity mismatch (missing: none; extra: list_items, get_item, list_content_groups)`。按既有启动契约运行 `npm.cmd run copy:tool-face-manifest`（exit `0`）后，隔离资产目录重跑为上述 277/277。该 `dist` 副本是 ignored 运行时工件，不形成 tracked diff；未把前两次红冒充本单绿。

另跑 `git diff --check`，exit `0`；仅有已知 LF→CRLF 提示，无 whitespace error。

### `git diff --numstat` 与边界

追加本段回执前，对本单五个产品/生成/测试/台账路径的精确输出为：

```text
1       0       docs/agent-ops/current-state/deferred-tests.md
1354    0       docs/generated/tool-face-manifest.json
148     1       server/src/__tests__/v2McpTransport.test.ts
27      0       server/src/mcp/bindings.ts
251     0       server/src/toolFace/registry.ts
```

同一时点本 handoff 为 `125  1`，其中开工前已有首轮 `## Result` 与 Dispatcher Ruling；本段及 header `ready → done` 是本轮唯一 handoff 写入。

显式排除：未改 `services/items.ts`、`services/contentGroups.ts`、任何 `routes/**`、客户端、`shared/`、transport Host/Origin/auth 骨架、migration/schema、tsconfig、`selectionResolve.ts`、`textFlowIdentity.ts`、`textFlowUnits.ts`。共享树中的 `docs/agent-ops/INDEX.md`、`tech-debt.md`、S4-2/S4-3 handoff 与 `.claude/settings.local.json` 均非本轮改动，本轮未触碰。

### D 段

- `git hash-object --filters --path` 与 HEAD blob：`useNoteCanvasRuntimeController.ts` 均为 `3efe5f820e2077850611b54d4d09482845e89545`；`SelectionToolbarLayer.tsx` 均为 `29de8952e37a29bda051d6f82e17508d8c694637`；`server/src/routes/projections.ts` 均为 `561902a449b50ce254b650de5a337973a8fbc26d`。三处均是 EOL 假阳性，没有内容差异。
- `.codex-tmp/builder.lock.d` 仍存在且 `owner.json` 仍在；未取锁、未覆盖 owner、未删锁。
- 未枚举、识别或杀任何 Codex 进程；未按 PID 或命令行正文判断进程。
- 当前分支仍为 `fable/v2-bn12-exoskeleton`；未 commit、未 push、未切换或触碰 `main`。
- `docs:check` exit `0`；未修改 `docs/agent-ops/INDEX.md` 或任何非本单 docs。
