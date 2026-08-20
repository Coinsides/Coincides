> **状态 (Status)**: draft
> **层 (Layer)**: 分析 / Analysis（V2.BN.12 必修① 前置**调研盘**）
> **日期 (Updated)**: 2026-08-20
> **权威 (Authoritative)**: 否 —— **本文是设计稿的输入，不是设计稿**
> **委托**: Fable。分工：Opus 出调研盘 → **Fable 亲自操刀设计稿**
> **上游**: 方向宪章 §2/§6/§8/§10 · `docs/generated/object-inventory.md`（生成物）· `contracts/Notebook-Object-Boundary-Contract.md` · 登记册协议

# MCP 工具面前置调研盘

## 0. 边界：这是调研不是设计

**本文只做四件事**：盘现状 · 查先行艺术 · 草收据形状 · 标依赖箭头。

**本文不做**：不定工具清单 · 不定分级策略 · 不定 schema。凡属设计判断的，一律标注 **`→ 设计稿拍`**，不在此代拍。

全文引用**均已亲核**（命令与位置随条给出）。

---

## 1. 内部操作面盘点

### 1.1 ⭐ 头号发现：**这个应用同时挂着两个产品**

从 `client/src/App.tsx` 的路由声明（已亲核）：

```text
v1 学习规划线   calendar · decks · decks/:deckId · goals · review · statistics
BN 笔记线       notes/:noteId · projects · projects/:courseId · sources
                group-gallery · group-gallery/editor · templates
共用            login · register · settings · courses · courses/:courseId
```

`client/src/pages/` 目录同样两套并存：`Calendar / Decks / Goals / Review / Statistics`（v1）与 `Notes / Sources / GroupGallery / Courses`（BN）。

**这对工具面是第一位的问题，因为红线是「工具面 ＝ 人类已能做的操作的暴露」** —— 而**人类现在能做的操作，横跨两个产品**。

> **→ 设计稿拍**：工具面覆盖 v1 学习规划线吗？
> - 覆盖 ⇒ 工具面暴露一个 `PRODUCT.md` 已不再描述的产品；
> - 不覆盖 ⇒ **红线出现一处例外**：有些「人类能做的」agent 做不到。这不违反红线的方向（红线防的是 agent 有后门，不是 agent 必须全能），但**必须显式声明为范围排除，不能默认掉**。
>
> 我的观察（非裁定）：宪章 §10 明言「⚠️ V1 老 agent(Mr. Zero)启动时正式声明取代」—— 说明 v1 的 **agent 面**已定要取代，但 v1 的**人类操作面**是否随之退役，宪章未言。

### 1.2 路由面机械盘点（48 条，已亲核）

**方法**：`server/src/index.ts` 的 `app.use` 挂载点全扫（不截断），再对 `client/src/**/*.{ts,tsx}` 全量文本做引用比对。

- **客户端有引用：44 条**
- **客户端零引用：4 条** —— `/api/composition-templates` · `/api/material-segments` · `/api/projections` · `/api/study-templates`

> ⚠️ **零引用 ≠ 死**（我今天在 G-7 上栽过一次同样的推断）。这 4 条只说明**当前 client 不调它们**；是否有其他消费方、是否属遗留，**须按活性纪律逐条查**（路由挂载 → 服务层 → 数据活性），**本盘不下结论**。

### 1.3 按真相层归类的候选工具面

以 `Notebook-Object-Boundary-Contract §1` 的五真相为轴（这是唯一稳定的分类基准 —— 路由名是实现史，真相层是设计意图）：

| 真相 | 路由 | 候选工具面性质 |
|---|---|---|
| **内容真相** | `notes` · `note-blocks` · `annotation-truths` | 读写正文与标记。**写操作密度最高、后果最直接** |
| **知识真相** | `items` · `content-groups` · `group-folders` | 铸卡 / 捆绑 / 组织。**agent 最想要的一层** |
| **空间真相** | `canvas-objects` · `canvas-assets` | 摆放。⚠️ 待拍-1 减负后，此面**是否该暴露给 agent 是设计问题** —— 我们刚把「自由摆放」从人的默认面上移走 |
| **出处真相** | `sources` · `source-anchors` · `source-scopes` · `source-snapshots` · `source-boards` · `source-board-nodes` | ⚠️ **血统分裂**：`sources`（045 新线）与 `source-anchors/snapshots/scopes/boards`（020–024 旧线，`Source-Ladder-Contract` G-7 已盘）分属两套。**工具面不能同时暴露两套出处语汇** |
| **语义真相** | `relations` | Item↔Item + 判断收据 |
| **情境** | `purposes` | 意图 / 范围 / role / fitness |
| **v1 学习规划** | `cards` · `decks` · `tags` · `tag-groups` · `goals` · `tasks` · `recurring-tasks` · `time-blocks` · `daily-brief` · `daily-status` · `review` · `statistics` · `sections` | 见 §1.1 —— 范围问题 |
| **提案 / 批次** | `proposals` · `reconciliation` · `domain-refinements` | ⭐ **已有的「AI 提议 → 人审 → 应用」管线** —— 见 §3.3 |
| **打包 / 迁移** | `package-exports` · `package-imports` · `package-manifests` · `templates` · `domain-block-sets` | 大动作，**可撤销要求最高** |
| **基础设施** | `auth` · `settings` · `embedding` · `agent` · `courses` · `course-materials` · `documents` | `auth`/`settings` 属守卫面本身，⚠️ **不该成为工具** |

### 1.4 TD-4 落位：`__` 命名空间过滤

**TD-4 在这里落位，且比记档时更具体。**

已亲核：`KIND_HANDLERS` 注册 6 个 kind（生成物 §3），其中 `__test_probe` 注册在 `canvasObjects.ts:1373`，validator 以 `z.literal('__test_probe')` 放行（`validators/index.ts:807`），**无环境守卫**。

**要求**：任何由注册表派生工具枚举的地方，**必须过滤 `__` 前缀**。

> **我建议把它一般化 → 设计稿拍**：不止 `KIND_HANDLERS` 一处。凡工具面**从代码注册表自动派生可选项**（kind、模板类型、关系类型、purpose role 词表…），都要有一道**「注册 ≠ 可暴露」的显式闸**。
> **理由**：`__test_probe` 的存在证明「注册表里有测试接缝」是**已发生**的事实，不是假想风险。自动派生是工具面的正确做法（避免手写清单腐烂，见对象边界契约 §4），但它把注册表的**卫生问题直接变成对外暴露问题**。

### 1.5 红线视角的两个方向

红线原文：**Agent 能做的，人类必须 100% 能做。同门同钥，无后门。**

| 方向 | 检查 | 状态 |
|---|---|---|
| **← 无后门**（工具面不得引入人做不到的操作） | 每个工具必须能指出对应的人类入口 | **可机械检查**：工具 → 路由 → client 调用点。§1.2 的扫描就是这个检查的雏形 |
| **→ 不残废**（人能做的 agent 原则上也该能做） | v1 线是否覆盖 · 空间真相是否暴露 | **需设计判断**，见 §1.1 与 §1.3 |

> ⭐ **我建议把「←」做成机械门**（→ 设计稿拍是否采纳）：**每个工具声明必须携带它对应的人类入口坐标**（路由 + 客户端调用点），并由脚本校验该坐标真实存在。
> **这样「无后门」就不是一句纪律，而是一条会红的断言** —— 与今天全链复盘的教训同源：**警觉拦不住的，机械纪律拦得住。**

---

## 2. MCP 先行艺术（登记册协议：查过即登记）

> **登记状态**：MCP **协议本体 / TS SDK / guard-consent 模式** 此前**未在登记册**（已全扫 `external-candidate-registry.md`，仅有「别人的 MCP server」条目：playwright-mcp、chrome-devtools-mcp、shadcn registry、Open Design stdio server）。**本节即为首次登记，建议回填登记册。**

### 2.1 协议现状：2026-07-28 修订版

**这是 MCP 自发布以来最大的一次修订。** 与我们直接相关的四点：

| 变化 | 对我们的意义 |
|---|---|
| **无状态核心** —— 移除协议级 session 与 `Mcp-Session-Id`；`tools/list` 等不再随连接变化 | ✅ **与我们的形态天然契合**。我们的后端本就是 HTTP 服务（`Native & deployment` 方向：后端保持服务形态）；无状态核心意味着工具面可以直接架在现有 Express 之上，不需要为 MCP 引入会话层 |
| ⭐ **MRTR 工具级 elicitation（SEP-2322）** —— server 返回 `resultType: "input_required"` + 待答请求；client 带 `inputResponses` 重试原调用 | ⭐⭐ **宪章 §8「分级放行」有了协议原生落点**。三档（即时 / 出候选 / 需确认）中的**「需确认」不必自造机制** —— 这是协议一级公民 |
| **缓存支持（SEP-2549）** —— list 与 `resources/read` 响应携 `ttlMs` / `cacheScope` | 与「零模型荣誉榜」同向：能不问模型就不问，能不重取就不重取 |
| **MCP Apps / Tasks 扩展 · 正式弃用策略** | Tasks（长任务）与我们的解析按需、materialization 管线可能对位；**弃用策略**与我们「格式即承诺」（待拍-4）同构 |

### 2.2 TS SDK 与守卫实践

- 官方 TS SDK：`@modelcontextprotocol/sdk`，`StreamableHTTPServerTransport` 可架在 Express 之后。
- **授权**：发布 `/.well-known/oauth-protected-resource`（RFC 9728）· bearer 校验 · RFC 8707 resource indicators · **在每个 tool handler 内部检查 `authInfo.scopes`**。
- **Origin / Host 校验**：localhost 类默认有 `allowedOrigins` 保护；直接用 Node transport 时 **Host header 校验须自己实现**。
- **通用守卫清单**：校验 · 认证 · 限流 · 超时 · 允许清单 · **审计日志**。

### 2.3 ⭐ 一条我认为最要紧的外部教义

> **工具输入来自 LLM，不是直接来自用户 —— 一律当不可信处理。**

**这条改变了红线的读法。** 红线说「同门同钥」，但**同一道门背后，来访者的可信度并不同**：

- 人类点按钮 ⇒ 输入经过 UI 约束（下拉、校验、确认框）；
- LLM 调工具 ⇒ 输入是模型生成的字符串。

**「同门同钥」保证的是权限对等，不是输入可信度对等。** 守卫层必须假定工具入参是敌意的 —— 这与宪章 §6「外来导入 JS 永不执行」「请求出身不同待遇不同」是同一条纪律的两次出现。

> **→ 设计稿拍**：守卫层与现有 validator 层的关系。我们已有 zod validator（`server/src/validators/index.ts`），**工具面是复用它还是加一层？** 我的观察：复用是对的（同门同钥的字面兑现），但**工具面需要额外的「意图级」守卫**（例如「删除超过 N 项」需确认），那不在 schema 校验的职责里。

---

## 3. 收据接口

### 3.1 ⭐ 收据底座已经存在，而且早就为此留了轴

`operation_batches`（已亲核 `schema.sql`）：

```sql
id · user_id · course_id · source_type TEXT NOT NULL DEFAULT 'manual'
source_id · label · status TEXT NOT NULL DEFAULT 'applied'
metadata · created_at · applied_at · reverted_at
```

**16 个服务在写它**（已亲核：canvasLayoutProposals / compositionTemplates / courseLifecycle(+Policies) / domainRefinementProposals / learningCanvases / materialMapProposals / materialReconciliationProposals / **noteBlockLifecycle** / organizedNoteProposals / packagePortability / reconciliationSafety / sourceLifecycle / sourceMaterialization / sourceProjectionMaterializer / templateMigrationProposals）。

**三条现成的对位**：

| 宪章要求 | 现有列 |
|---|---|
| 「操作暴露 ＝ 工具 + 守卫 + **收据**」 | 整张表 |
| 「大动作全收据**可撤销**」 | `status` + `reverted_at` |
| **来源可辨** | `source_type` **默认 `'manual'`** —— **词汇本身就预留了非人工来源** |

> ⭐ **`source_type DEFAULT 'manual'` 是这次盘点最幸运的发现**：工具面调用不需要新表、不需要新语汇，**它是 `source_type` 上的一个新值**（`'tool'` / `'mcp'` / 具体工具名 → 设计稿拍），`source_id` 承载 tool-call id。
> 这与「外骨骼不为任何穿戴者整容」相容 —— **我们不为 MCP 改真相层形状，只在既有轴上多一个取值。**

### 3.2 ⚠️ 一处需要设计稿处理的现状问题

```sql
course_id TEXT REFERENCES courses(id) ON DELETE CASCADE
```

`course_id` **可空**（是 Containment 不是 Binding，未违反唯一结构律），**但 `ON DELETE CASCADE` 意味着删除一个 Project 会连带删除其审计收据**。

对照 `Notebook-Object-Boundary-Contract` **I-2「删容器不删内容」** —— 收据是不是「内容」？

> **→ 设计稿拍**（我不代拍，且我**未核实**这是否是刻意设计）：
> - 若收据属审计层，`ON DELETE SET NULL` 比 CASCADE 更符合「收据不门禁 / 出处永远保留」；
> - 但也可能是刻意的数据卫生（删项目即清其全部痕迹）。
> **须查 015 migration 的原意，本盘不下结论。**

### 3.3 ⭐ 「提案 → 审 → 应用」管线已经存在

`proposals` / `reconciliation` / `domain-refinements` 路由 + 上述 16 个服务里的一批 `*Proposals.ts`，构成一条**已落地的 AI 提议 → 人审 → 应用 → 可撤销**管线（`PRODUCT.md` 原则 7 与 `Coincides-Agent-Operating-Manual` 的 proposal-first 即此）。

**这对工具面的分级放行是直接可用的第三档**：

```text
即时      → 工具直接执行 + 写收据
出候选    → 工具产出 proposal，人在既有审阅面处理    ← 复用现有管线
需确认    → MCP MRTR：resultType input_required      ← 协议原生
```

### 3.4 ⭐ 活性盘点结果（2026-08-20 补做，D-6 前置）—— **它从未运过一行**

按 5-4 顺序（路由挂载 → 服务层 → **数据活性**）逐步取证：

| 步 | 结果 |
|---|---|
| **① 路由挂载** | ✅ 活。`index.ts:26,38,50` import；`:118,130,142` 挂 `/api/proposals`、`/api/reconciliation`、`/api/domain-refinements`，均带 `authMiddleware` |
| **② 服务层读写** | ✅ 活。**六个** v2 服务写 `proposals`：`canvasLayoutProposals` · `organizedNoteProposals` · `materialMapProposals` · `templateMigrationProposals` · `domainRefinementProposals` · `materialReconciliationProposals` |
| **③ 客户端消费方** | ✅ 有。`pages/Courses/CourseDetail.tsx` · `pages/Templates/TemplateStudio.tsx` · `stores/proposalStore.ts` |
| **④ 数据活性** | ❌ **`proposals` 表 0 行** |

> **取证方式**：把 live DB 字节复制到 scratchpad，**只查副本**（`readonly:true` + `PRAGMA query_only=ON`）。查前查后对 live 的 `db/-wal/-shm` 三件做 SHA-256 + 大小 + mtime 比对，**完全一致**（`2c47907f…` / WAL `0` / SHM `fd4c9fda…`，与 03 链五轮 reviewer 记录相同）。副本及其 sidecar 查完即删。

#### 三条结论

**1. 这条管线「代码活、数据死」。** 它被路由、被服务写、有客户端 store —— 但**从未流入过一行**。
> 这正是我在 `Source-Ladder-Contract §9.1` 立的那条纪律的兑现：**路由活 ≠ 有真实数据流入**。若只做前三步，本盘会得出「管线现役、可复用」的相反结论。

**2. 它的类型词表分裂，且 BN 线从未接入。**

```text
共享 ProposalType enum（shared/types）：study_plan · batch_cards · schedule_adjustment   ← 全是 v1
表里实际出现的 type 字面量（v2 服务）：material_map · source_board_node · source_scope
                                    note_block · template_migration · canvas_layout
                                    organized_note · domain_refinement                  ← 8 个不在 enum 里
```

`proposals.type` 是自由 `TEXT`，所以两套词汇共存于一张表，**只有 v1 那套进了类型系统**。

**BN 线服务对 `proposals` 的引用数：`items` 0 · `relations` 0 · `purposes` 0 · `contentGroups` 0 · `noteBlockLifecycle` 0 · `sourceLifecycle` 0。**
即：**V8–V11 建的整个五真相层，从未使用过这条管线。**

**3. 它焊在 v1 agent 的会话模型上**：`proposals.conversation_id REFERENCES agent_conversations(id)` —— 它本是 **Mr. Zero 的**提案机制，而宪章 §10 已声明取代 Mr. Zero。

#### 对 D-6 的直接影响（结论仍归设计稿）

**「复用现有 proposal 管线作为出候选档」这个说法的前提不成立** —— 那不是**复用一条在跑的管线**，而是**激活一条从未跑过的管线**，且它：

- 焊在将被取代的 v1 agent 会话上；
- course-scoped（`FROM courses` 遍布六个服务）；
- 类型词表一半在类型系统外；
- 在工具面真正要操作的那层真相上**零先例**。

**风险画像与「复用成熟机制」完全不同。** → **设计稿拍**（我不代拍），但建议把 D-6 的问法从「是否复用」改为「**是否值得激活，还是另建**」。

#### 顺带印证 §3.1

`operation_batches` 现有 **101 行，`source_type` 全为 `'manual'`**，最近一条 `2026-08-20 03:07:58`（工单 03 施工）。

**收据轴不仅存在，而且干净** —— 它至今只有过一个取值。**工具面会是第一个非 manual 来源**，不需要与任何历史遗留取值共存。



---

## 4. 切割建议：必修① 的形状如何决定 ②③④

### 4.1 我看到的依赖箭头

```text
              ┌─────────────────────────────────────┐
              │  ① MCP 工具面（末端执行器实体化）    │
              └───────┬──────────┬──────────┬───────┘
                      │          │          │
        「操作的粒度」 │   「收据形状」│  「守卫分级」│
                      ↓          ↓          ↓
   ② 流式装配面    ③ 选区收据      ④ 层0/层1 锚
   地板组件        系统            抽取矩阵
```

| 箭头 | 内容 | 我的把握 |
|---|---|---|
| ① → ② | **工具面的操作粒度反向定义地板组件的粒度**。若工具是「插入一个组件」，组件就必须是可独立寻址的一等公民；若工具是「编辑一段文本」，组件可以是渲染期概念 | **确定**。这是「Agent 能做的人类必须能做」的对偶：**人和 agent 必须操作同一批可寻址单元** |
| ① → ③ | **选区收据是工具的入参形式**。宪章 §8 说「选区收据 ＝ 还没保存的锚」，而工具调用需要指代对象 —— 二者是同一个 `{对象 IDs, 文字范围, 几何, 时刻}` | **确定**。若工具面先定了一套自己的对象指代格式，③ 就会被迫适配它，或产生两套指代语汇 |
| ① → ④ | **锚是工具的返回值形式**，也是跨调用的稳定引用。层1 锚契约（`Source-Ladder-Contract` §4）已 active，工具面应消费它而非另立 | **确定**（契约已在，只需不违背） |
| ③ ↔ ④ | 选区收据与锚是同一事物的两个生命阶段 | **确定**（宪章原文） |

### 4.2 建议切法

**必修① 先切出「指代语汇 + 收据形状」两件，再切工具清单。**

理由：②③④ 全部依赖①，但依赖的**不是工具清单**，而是①里的两个基础决定 ——

1. **对象怎么被指代**（→ ③ 的形状，② 的可寻址粒度）
2. **操作留什么收据**（→ 所有版本的审计与可撤销）

**工具清单本身反而可以最后定、逐步长**（宪章 §6 的成长路径同律：凭使用晋升）。

> ⭐ 这也是我建议的风险规避：**先定工具清单，等于先定操作粒度**，而操作粒度会**倒逼**②的组件模型 —— 那是让实现细节决定产品形状。**先定指代与收据，工具清单就成了可增长的表面。**

### 4.3 明确留给设计稿的（我不代拍）

| # | 问题 | 为什么必须设计稿拍 |
|---|---|---|
| D-1 | **工具面覆盖 v1 学习规划线吗？** | 涉及红线的范围排除声明（§1.1） |
| D-2 | **空间真相（canvas）是否暴露给 agent？** | 待拍-1 刚把自由摆放从人的默认面移走，agent 面是否同步 |
| D-3 | **出处真相暴露哪一套语汇？** | 新旧血统分裂（§1.3），且 `source_anchors` 的处置路径挂在 G-1/G-2 施工单 |
| D-4 | **`source_type` 的新取值是什么** | 收据语汇（§3.1） |
| D-5 | **守卫层与现有 zod validator 的关系** | 复用 + 意图级守卫（§2.3） |
| D-6 | **是否复用 proposal 管线作为「出候选」档** | 须先做活性盘点（§3.3） |
| D-7 | **`operation_batches.course_id` 的 CASCADE 是否要改** | 须查 015 原意（§3.2） |
| D-8 | **「无后门」是否做成机械门** | 我建议做（§1.5），但成本与形制归设计稿 |

---

## 5. 本盘的自我限制（诚实声明）

1. **§1.2 的 4 条零引用路由，我没有下「死」的结论。** 今天我刚在 `source_anchors` 上因「从缺席推断」栽过一次（`claude-log` 条目 17 / `Source-Ladder-Contract §9.1`）。零引用只是一个信号，判活性须走「路由挂载 → 服务层 → 数据活性」三步。
2. ~~**§3.3 的 proposal 管线现役程度未核。**~~ ✅ **已于 2026-08-20 补做，见 §3.4** —— 结果是「代码活、数据死」（`proposals` 表 0 行），BN 线零接入。**若当时只做前三步就下结论，会得出完全相反的答案。**
3. **§3.2 的 CASCADE 语义我未查 015 migration 原意**，因此只提问不判断。
4. **MCP 相关事实来自 2026-08-20 的外部检索**，非我的训练知识（我的知识截止早于 2026-07-28 修订版）。**建议回填登记册**，按协议「查过即登记、永不重查」。
5. **本盘不含任何工具清单。** Fable 要的是设计稿的输入，工具清单是设计稿的产物。

---

## 附：建议回填登记册的条目（§2 首次登记）

| 候选 | 现状（2026-08-20 核） | 判定 | 用途 |
|---|---|---|---|
| **MCP 协议本体** | **2026-07-28 修订版**：无状态核心（移除 session/`Mcp-Session-Id`）· **MRTR 工具级 elicitation（SEP-2322）** · 缓存 `ttlMs`/`cacheScope`（SEP-2549）· MCP Apps / Tasks 扩展 · 正式弃用策略 | ✅ **采纳为工具面协议** | 无状态核心与我们「后端保持服务形态」天然契合；**MRTR 是宪章 §8「需确认」档的协议原生落点** |
| **`@modelcontextprotocol/sdk`（TS）** | 官方 TS SDK；`StreamableHTTPServerTransport` 可架 Express 之后 | ✅ 采纳候选 | 与既有 Express 后端同栈 |
| **MCP 授权模式** | `/.well-known/oauth-protected-resource`（RFC 9728）· RFC 8707 resource indicators · **每个 tool handler 内检 `authInfo.scopes`** · Origin/Host 校验（自建 transport 须自实现 Host 校验） | 🔍 **形态参考** | 我们是本机/私有云单用户，OAuth 全套未必需要；**但「每个 handler 内检 scope」的形制值得照搬** |
| **外部教义** | **「工具输入来自 LLM 不是用户，一律当不可信」** | ✅ 采纳为守卫层前提 | 「同门同钥」保证权限对等，**不保证输入可信度对等** |

---

**Sources**（§2 外部检索，2026-08-20）：
- [The 2026-07-28 MCP Specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [Key Changes — MCP 2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP TypeScript SDK (GitHub)](https://github.com/modelcontextprotocol/typescript-sdk)
- [Understanding Authorization in MCP](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/authorization)
- [Server Guide — MCP TypeScript SDK V2](https://ts.sdk.modelcontextprotocol.io/v2/documents/Documents.Server_Guide.html)
