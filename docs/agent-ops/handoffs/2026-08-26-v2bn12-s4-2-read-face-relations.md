> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-S4-2 | date: 2026-08-26

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

## Result

### 状态与交付

`done`。本轮只登记并绑定 `list_relations`、`get_relation`、`list_relation_types` 三条 `semantic / immediate / public` 读工具；没有登记被排除的 `listRelationAssessments`，没有新增业务语义。

- `server/src/toolFace/registry.ts`：增加三条严格输入 schema、hydrated Relation 严格输出 schema、静态九项 Relation type 严格输出 schema 与三条注册项。所有定形对象均 `.strict()`，未使用 `z.any()`、`z.unknown()` 或 passthrough；`relation_type` 按 service 实际 `string` 保留，只有静态类型表的 `id` 使用九值 enum。
- `server/src/mcp/bindings.ts`：三条薄适配只调用既有 service；`list_relations` / `get_relation` 在调用时取 `getDb()` 并传 `context.userId`，`list_relation_types` 直接调无 `db` / `userId` 参数的静态函数。无 SQL、hydrate、ownership 或新连接。
- `server/src/__tests__/v2McpTransport.test.ts`：在既有显式测试入口增加三条真实 `/api/mcp` `tools/call` 正控；每条以同 fixture 直调 service 作 oracle，并断言 `structuredContent` 通过对应运行时 `output_schema`、逐值等同 service 结果，文本 content 解析后亦等同。
- `docs/generated/tool-face-manifest.json`：由既有生成器重生成，结果为 9 条、全部 public；未手写。
- `docs/agent-ops/current-state/deferred-tests.md`：追加一条成对台账，记录略过的 `listRelations` 过滤组合、方向/类型全枚举、跨用户矩阵及所挡风险。

### `human_entry` 现物复核

| 工具 | route 现物 | client API 调用点现物 |
|---|---|---|
| `list_relations` | `server/src/routes/relations.ts:33-41`（`GET /api/relations`，`:36` 调 `listRelations`） | `client/src/pages/Notes/canvasEngine/relationRepository.ts:45-47`（`loadRelations`，`:46` 发 `GET /relations`） |
| `get_relation` | `server/src/routes/relations.ts:53-55`（`GET /api/relations/:relationId`，`:54` 调 `getRelation`） | `client/src/pages/Notes/canvasEngine/relationRepository.ts:40-42`（`loadRelation`，`:41` 发 `GET /relations/:id`） |
| `list_relation_types` | `server/src/routes/relations.ts:29-31`（`GET /api/relations/types`，`:30` 调 `listRelationTypes`） | `client/src/pages/Notes/canvasEngine/relationRepository.ts:35-37`（`loadRelationTypes`，`:36` 发 `GET /relations/types`） |

`loadRelation` 的 repository API 调用点真实存在；本回执不把它扩称为已有上层 UI 可达消费者。`listRelationTypes()` 的现物是进程内静态定义表，不取 `db`、不取 `userId`，本轮 binding 与 output 均未伪造 ownership 维度；MCP 外层鉴权与用户收据不改变该 service 本性。

### 必红判据

#### K-1：binding 固定空集合

将 `listRelationsBinding` 临时替换为固定 `[]` 后，只跑：

```text
node --import tsx --test --test-name-pattern="S4-2 tools/call list_relations" src/__tests__/v2McpTransport.test.ts
```

exit `1`；工具仍存在、数组 schema 仍通过，准确红在内容断言：

```text
list_relations structuredContent must match the direct service result
+ actual - expected
+ []
- [ ...非空 Relation... ]
```

`assert.deepEqual` 位于 `server/src/__tests__/v2McpTransport.test.ts:430`，消息字面量位于 `:433`。恢复真实 binding 后同一 targeted test exit `0`（1/1）；mutation 已完全撤销。

#### K-2：output schema 必填字段改名

将 Relation output schema 的必填 `id` 临时改名为 `relation_identifier` 后，只跑 `S4-2 tools/call get_relation`，exit `1`，准确红在 schema 校验：

```text
get_relation output_schema rejected structuredContent
invalid_type: relation_identifier Required
unrecognized_keys: id
```

schema 断言位于 `server/src/__tests__/v2McpTransport.test.ts:423`，消息模板位于 `:428`。恢复字段后同一 targeted test exit `0`（1/1）；mutation 已完全撤销。

#### K-3：旧 manifest freshness

注册表改完、生成前直接跑 `npm.cmd run check:tool-face-manifest`，exit `1`；带行号终端取证的红点原文为：

```text
43: 过期: docs/generated/tool-face-manifest.json
44: 请运行: npm run docs:tool-face-manifest
```

随后 `npm.cmd run docs:tool-face-manifest` exit `0`（`已生成：9 条条目，其中 9 条 public`）；恢复后的 freshness gate exit `0`（`未过期：9 条条目，其中 9 条 public`）。首次误用裸 `npm` 时 Windows `npm.ps1` 执行策略在启动器层拦截，未触达 manifest 断言，故未冒充 K-3 证据；有效取证均使用 `npm.cmd`。

生成/check 时 `zod-to-json-schema` 对既有递归 JSON value 打印 `Recursive reference detected ... Defaulting to any` 警告；这是现有投影器行为。运行时 Zod 仍递归校验，且本单未越界修改生成器。

### 台账与范围口径

- **TD-14**：三条 `scopes: ['relations:read']` 仍只是描述性元数据；本轮未新增 scope enforcement，也未声称它是权限模型。
- **TD-22**：未新建测试文件；三条正控加入既有、已由 `test:mcp-transport` 显式执行的文件，未修改 `server/package.json`，也未夹带修复全局漏挂发现机关。
- `listRelationAssessments` 未注册、未绑定、未测试；没有为它补 route 或客户端入口。

### 门禁收据

| 顺序 | 门 | 最终 exit | 收据 |
|---:|---|---:|---|
| 1 | 根 `npm.cmd run docs:check` | 0 | object inventory 最新；未改 INDEX |
| 2 | client `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 3 | server `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 4 | 根 `npm.cmd run test:unit` | 0 | 22 files / 222 tests |
| 5 | server `npm.cmd run test:v2`（隔离 `CANVAS_ASSET_DIR` / `SOURCE_BLOB_DIR`） | 0 | `pretest:v2` 先 check + copy；278/278 |
| 6 | server `npm.cmd run test:mcp-transport` | 0 | 43/43，含三条 S4-2 正控 |
| 7 | 根 `npm.cmd run test:tool-face-registry` | 0 | 5/5 |
| 8 | 根 `npm.cmd run test:tool-face-manifest` | 0 | 10/10 |
| 9 | 根 `npm.cmd run check:tool-face-manifest` | 0 | 9 条、全部 public，fresh |
| 10 | 根 `npm.cmd run test:tool-face-parity` | 0 | 10/10 |
| 11 | 根 `npm.cmd run check:tool-face-parity` | 0 | 9 条 public 必要条件通过；门自身注明 human reachability 未验证 |
| 12 | server `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 4/4 |

另跑 `git diff --check`，exit `0`；只有已知 LF→CRLF 提示，无 whitespace error。独立只读 diff 复核结论为 PASS，并复跑 MCP transport 43/43、registry 5/5、manifest 10/10 与 freshness 皆绿。

有效 `test:v2` 取证使用隔离根 `C:\Users\70208\AppData\Local\Temp\coincides-s4-2-green-6a54d046608248d8a1b18b9d77399d19`。首轮因没有保留 exec session id 而未拿到最终 exit，待其自然结束后重新完整取证，未把半截输出冒充 PASS。沙箱拒绝递归清理两个已确认位于 OS Temp 的测试根，故未换 shell 绕过；它们在仓库外，不形成 diff。

### `git diff --numstat` 与边界

追加本段回执前，本单五个产品/生成/测试/台账路径的精确输出为：

```text
1       0       docs/agent-ops/current-state/deferred-tests.md
744     0       docs/generated/tool-face-manifest.json
95      1       server/src/__tests__/v2McpTransport.test.ts
19      0       server/src/mcp/bindings.ts
139     0       server/src/toolFace/registry.ts
```

同一时点本 handoff 为 `1  1`，来自发单方开工前已有的 `draft → ready` 基线；本轮对 handoff 的写入只有 header `ready → done` 与本 `## Result` 追加。

显式排除：未改 `server/src/services/relations.ts`、`listRelationAssessments` 所在实现、任何 `routes/**`、客户端、`services/purposes.ts`、`selectionResolve.ts`、`textFlowIdentity.ts`、`textFlowUnits.ts`、`projections.ts`、`shared/`、transport Host/Origin/auth 骨架、migration/schema、tsconfig、`server/package.json`、其他 handoff/analysis 文档。树上另有 S4-3 handoff 与 `.claude/settings.local.json`，均非本轮改动，本轮未触碰。

### D 段

- 三处 EOL 探针用 `git hash-object --filters --path` 对 HEAD blob：`useNoteCanvasRuntimeController.ts` 两侧均为 `3efe5f820e2077850611b54d4d09482845e89545`；`SelectionToolbarLayer.tsx` 两侧均为 `29de8952e37a29bda051d6f82e17508d8c694637`；`server/src/routes/projections.ts` 两侧均为 `561902a449b50ce254b650de5a337973a8fbc26d`。三处均是 EOL 假阳性，没有内容差异。
- `.codex-tmp/builder.lock.d` 与 `owner.json` 仍存在；未取锁、未读取或覆盖 owner、未删锁。
- 未枚举、识别或杀任何 Codex 进程。为等待一次失去 session id 的 `test:v2` 自然结束，仅只读检查过 Node 测试进程状态；未将其识别为 Codex，未终止任何进程。
- 当前分支仍为 `fable/v2-bn12-exoskeleton`，HEAD `5e3f62dae955be79490c963c31cd7b46030ad464`；未 commit、未 push、未切换或触碰 `main`。
- 回执由 `apply_patch` 以 UTF-8 写入；写后另做严格 UTF-8 解码与唯一 `## Result` 标题检查。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **PASS 0/0/1/0**(MED-1 见 §4,**归口径不归本单施工**)

### 1. 收工判定(两条并用)

进程 `38332` **消失** ∧ **本单交付物出现**(`registry.ts` +139 / `bindings.ts` +19 / `tool-face-manifest.json` +744 / `v2McpTransport.test.ts` +95 / `deferred-tests.md` +1)。⛔ 未用 `## Result` 计数当判据。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 复核方的独立验证 | 结果 |
|---|---|---|
| **范围** | 读 diff | 三条 `list_relations` / `get_relation` / `list_relation_types` 落地;**`listRelationAssessments` 未登记**(排除项守住) |
| **binding 形状** | 读 diff | 三条均为薄适配:前两条 `getDb()` + `context.userId` + 直调 service;`list_relation_types` 直调无参静态函数。**零 SQL / 零 hydrate / 零 ownership 判断 / 零新连接** |
| ⭐ **K-1 内容刀(复核方亲施)** | 令 `getRelationBinding` 在真实 service 结果之上把 `id` 换成 `"stub-mutated-id"` 后单跑该条 | **红在内容断言**:`get_relation structuredContent must match the direct service result`,`v2McpTransport.test.ts:430:10`,diff 明确显示被注入的 `id: 'stub-mutated-id'` ⇒ **与回执自述的 `:430` 逐字吻合**,且**不是**红在「工具不存在」或 schema 层 |
| **还原保真** | sha256 对照 | `d0612862…335a06` 与备份**逐位相同**;`numstat` 回到 `19 0`;`test:mcp-transport` 复跑 **43/43**,S4-2 三条 **3/3** |
| **`list_relation_types` 的无 ownership 维度** | 读 diff + 回执 | binding 与 output schema **均未伪造用户维度**,回执明写「MCP 外层鉴权与用户收据不改变该 service 本性」⇒ 与工单 §「特殊性」要求一致 |
| **TD-14 / TD-22** | 读回执 | `scopes` 仍描述性、未声称强制;未新建测试文件(加进既有显式入口),无漏挂 |

### 3. builder 的两处诚实,记功

- **`human_entry` 的自我设限**:它给出 `loadRelation` 的现物行号后,**主动写明**「本回执**不把它扩称为已有上层 UI 可达消费者**」—— 没有把「repository 里有这个函数」偷换成「人类真的走得到」。**这正是 MED-1 的入口,是它自己留的。**
- **裸 `npm` 的失败没被冒充证据**:K-3 首次误用裸 `npm` 时被 Windows `npm.ps1` 执行策略在**启动器层**拦截、**未触达 manifest 断言**,它如实记录并改用 `npm.cmd` 重取 ⇒ **「红在别处的红不算红」**,与本仓「必红判据须红在指定断言」同源。

### 4. ⚠️ MED-1(归 `human_entry` 口径,不归本单施工):`loadRelation` **零上层调用者**

**复核方实查**(`grep` 全 client,排除 repository 自身与测试):

| repository 函数 | 上层调用者 |
|---|---|
| `loadRelations` | ✅ `panels/ContentGroupPanel.tsx:448`、`:612` |
| `loadRelationTypes` | ✅ `panels/ContentGroupPanel.tsx:449` |
| **`loadRelation`** | ❌ **零**(repository 之外无任何调用) |

⇒ `get_relation` 的 `client_call_site` 指向一个**客户端里没人调用的函数**。

**按口径 (a) 的字面**(「客户端调用点是硬要求」)它**成立** —— 调用点确实存在且确实发 `GET /relations/:id`。
**但按口径 (a) 的立法理由**(Fable `ff4ca7d`:放宽为「有 route 即算」会让**整个 REST 面每个端点自动获得人类门**,parity 闸对 CRUD 镜像的拦截力归零)—— **一个没人调用的 repository 函数,离「人类真能走到」只差一步,离「裸 route」也只差一步**。

⭐ **口径的裂缝在于**:同一天里,`get_content_group` 因**没有调用点**被裁掉,而 `get_relation` 凭**一个死调用点**进场。两者对「人类是否真能走到这个读」的答案其实相同(都是否),结论却相反。
⇒ **这不是本单的施工缺陷**(builder 逐字守了口径,还主动标出了边界),**是口径本身需要补一句**。**升 Fable**,三条可能的补法(我不替你选):①口径 (a) 加一句「调用点须有上层调用者(至少一跳)」②维持现状但要求 `human_entry` 标注「可达性未证」③按具体资源逐案裁。
⛔ **在裁定前我不动 `get_relation`**——它已落地且工程无瑕;若将来口径收紧,退场是另一次动作。

### 5. 复核方自己的测量错误(常设自查位)

⚠️ **我第一次施 K-1 的 mutation 是坏的**:用正则把 binding 整体替换,产出**语法不合法**的 TS,测试确实 exit 1 —— 但红点是 `esbuild` 的 `Transform failed: Unexpected "}"`(`bindings.ts:59`),**根本没跑到断言**。
若我就此收工,我会把**一个编译错误记成「K-1 复现」** —— 与我今天要求 builder 的「红在别处的红不算红」是同一条,**这次是我自己差点犯**。
**处置**:还原 → 读出 binding 的**精确原文** → 施一个**语法合法且语义定向**的 mutation(保留真实调用,只替换 `id` 字段)→ 才拿到真红点(`:430` 内容断言)。
**教训**:**mutation 必须先证明它自己是可编译的**;否则「测试变红」只证明了树被我改坏,没证明测试有鉴别力。

### 6. 结论

**PASS 0/0/1/0**。工程面无瑕:三条工具落地、binding 薄、K-1 内容刀由复核方独立复现于同一行号、还原逐位保真、`test:mcp-transport` 43/43。
**MED-1 不阻塞本单放行**,已升 Fable 裁 `human_entry` 口径;⛔ 记录里不得把 `get_relation` 的人类门描述为「已被真实使用」。
