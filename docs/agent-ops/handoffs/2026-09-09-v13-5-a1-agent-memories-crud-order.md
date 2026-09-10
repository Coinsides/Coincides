> **状态 (Status)**: done（builder 施工回执；docs 检查 / 完整总门停线待 HQ）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.5 段 plan 草案波次 A(Henry 09-09 放行非门控先行);红线清偿案(停车场 C 区在案,Henry 已裁 13.5)
> **单号**: 13.5 · A1 · agent_memories 人类 CRUD(红线清偿)

# 13.5 A1 · agent_memories 人类 CRUD

**使命**:清偿现役红线违章——**"Agent 能编辑的,人类必须 100% 都能编辑"**:agent_memories 表 Agent 可写,而人类至今零查/零改/零删入口。补齐人面,⛔ 动 Agent 面。

## 一 · 射程

1. **侦察现物先行**:agent 记忆的表结构/manager(`server/src/agent/memory/manager.ts` 起)/现有路由;申报现状再动工;
2. **Server**:人类 CRUD 路由(列表/单条编辑/删除;创建不做——人类造"Agent 的记忆"语义存疑,留候裁),走既有 auth 中间件与校验风格;删除=真删(记忆非用户内容资产,⛔软删体系新建);
3. **Client**:Settings 页新增 "Agent memories" 区——列表(内容+时间戳+来源会话若有)、行内编辑保存、删除带确认、空态文案;形制沿 Settings 现有款式,⛔新设计语言;
4. **⛔ 禁区**:Agent 写路径/读路径零改动(Agent 面照旧);⛔ 新 event verb;⛔ 记忆内容的语义加工(原文显示);⛔ Agent 面 UI。

## 二 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Settings+agent 面既有测试)不破;
- 冒烟五条:①合成记忆若干→Settings 列表正确显示(内容/时间戳);②行内编辑→保存→重开页面持久;③删除带确认→行消失→**Agent 读侧不再返回该条**(读路径本身零改动,只验数据面);④Agent 写路径回归不破(既有 agent 测试整跑);⑤空态(零记忆)显示正常。

## 三 · Result 格式

`## Result`:现物侦察申报 + numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触(全走内存/合成);⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

> **From**: codex(builder) · **日期**: 2026-09-09（Toronto）
> **结论**: 人类列表 / 原文编辑 / 确认真删除已施工完成，五冒烟通过；交 HQ 复核，**不代表放行或完整 runtime gate 通过**。`docs:check` 红及凭据扫描禁令见停线段。

### 现物侦察申报

- 施工前已在本线程申报：`server/src/db/schema.sql:280` 的 `agent_memories` 已有 `id/user_id/category/content/source_conversation_id/relevance_score/created_at/last_accessed`；来源会话可空，删除会话时 SET NULL；没有 `updated_at`、软删列。没有新增 schema / migration。
- `server/src/agent/memory/manager.ts:118/144` 的 `retrieveMemories` / `extractMemories` 是既有读取与抽取写入。Settings 原有路由只管理 settings/onboarding，`server/src/index.ts:127` 已在 `/api/settings` 外挂 `authMiddleware`；原 Settings 无记忆管理区，也无 Settings / MemoryManager 专属既有测试。
- 补充静态侦察：`server/src/agent/tools/executor.ts:413/475` 另有 `search_memories` / `save_memory`；`save_memory` 会异步生成向量。上述 Agent 源文件、orchestrator、AgentPanel / agentStore、embedding 写读实现均未修改。
- `db/init.ts` 已建 FTS 同步触发器，更新 / 删除正文沿用它们；向量表为可选。人类写操作在一个 DB 事务内复用 `VectorStore.deleteMemoryEmbedding` 清除当时已有的旧向量，不调用模型、不重嵌入。无新 event verb、平行存储、恢复系统或 Agent 执行通道。
- 实现挂载：`GET /api/settings/agent-memories` 返回全量原文记录，按创建时间倒序（兼容 ISO / SQLite 时间文本）；`PUT /:id` 仅编辑 `content`；`DELETE /:id` 真删并返回 204。沿现有 auth / Zod 风格，限定当前用户；编辑只判空、不 trim 保存、不重算分类、评分、时间或来源。
- 客户端新增 `AgentMemoriesSection`，Settings 仅导入 / 挂载；沿既有 card、input、button 与 token。显示原文、创建时间、最近访问时间（若有）、来源会话 ID（若有），含行内保存 / 取消、删除确认 / 取消、加载 / 重试 / 空态与请求失败恢复。
- 工作分支为 `fable/v2-bn12-exoskeleton`；开工时无 tracked 改动。原有 `.claude/settings.local.json` 及 audits / brainstorm 未跟踪文件原样保留。`.codegraph/` 存在但 CLI / MCP 不可调用；`rg` 也不可调用，已降级 PowerShell 文件检索。

### numstat

tracked 文件用 `git diff --numstat`；新增文件用 `git diff --no-index --numstat /dev/null <file>` 计入，未 stage。

| 文件 | + | - |
|---|---:|---:|
| `client/src/pages/Settings/Settings.tsx` | 3 | 0 |
| `client/src/pages/Settings/Settings.module.css` | 79 | 0 |
| `client/src/pages/Settings/AgentMemoriesSection.tsx` | 174 | 0 |
| `client/src/pages/Settings/AgentMemoriesSection.test.tsx` | 145 | 0 |
| `server/src/routes/settings.ts` | 3 | 0 |
| `server/src/routes/agentMemories.ts` | 71 | 0 |
| `server/src/__tests__/v13AgentMemories.test.ts` | 94 | 0 |
| `shared/types/agentMemories.ts` | 9 | 0 |
| **代码与功能测试小计（8 文件）** | **578** | **0** |

本工单 numstat 为 **+63 / -1**（追加回执及 header 状态）；合计 **9 文件，+641 / -1**。临时合成外壳 / 日志在 ignored `.codex-tmp/a1-memories-validation/`，构建生成物仍在既有 ignored 输出目录，无用户数据库文件。

### 五冒烟逐条

验证数据全部合成。Server 用 `initDb(':memory:')` 的真实 schema / FTS / sqlite-vec；浏览器临时外壳渲染**实际 SettingsPage 与新增组件**，调用实际 Settings router，仅在夹具内注入固定合成身份，不启动生产 app 或认证服务。每次外壳重启都是新的内存库，重开页面持久指同一夹具进程内重新 GET，不声称磁盘重启持久。

| # | 结果 | 证据与边界 |
|---|---|---|
| ① 合成记忆 → 列表 | PASS | Server 功能冒烟用原 `extractMemories` 生成两条、SQL 合成一条无来源记录，列表三条且正文 / 时间 / 来源保留。真实 Chrome Settings 显示两条合成记录、ISO 与 SQLite 创建时间、可空来源及多行原文。Client 功能套件另核验最近访问时间。 |
| ② 行内编辑 → 保存 → 重开 | PASS | Chrome 将首条改为带首尾空格和换行的 `I prefer evening study.` 原文，点击 Save 后回显，reload 重开仍保留。Server PUT 回包与重新 GET 精确相等，原 `retrieveMemories('evening')` 读到修改内容；FTS 更新，旧向量清除。 |
| ③ 确认删除 → 行消失 → Agent 不返回 | PASS | Chrome 先 Delete → Cancel，行保留；再次 Delete → Confirm delete，行消失。同一内存库调用未改的 `MemoryManager.retrieveMemories('',100)` 后仅余 `a1-browser-no-source`，被删 ID 不返回。Server 功能冒烟另验 FTS 与当时已有向量清理。未对异步向量竞争作保证，见下。 |
| ④ Agent 写路径既有回归 | PASS（现有覆盖范围） | `node --import tsx --test src/__tests__/v13AgentMemories.test.ts src/agent/providers/index.test.ts`：14/14，0 skip；其中既有 provider 文件 13/13 完整执行，无用例过滤。新增正常数据冒烟直接调用未改的 `extractMemories`。现有套件没有 `save_memory` / MemoryManager 专属回归；未把 provider 13 条冒称为所有 Agent writer 的直接覆盖。 |
| ⑤ 零记忆空态 | PASS | Chrome 经确认删除最后一条后显示 `No agent memories yet.`；同一内存库 Agent 读取结果为 0 条。Client 合成功能测试及 Server 清空后 GET `[]` 均通过。 |

### 验证记录

- `node server/node_modules/typescript/bin/tsc -b shared`：PASS；client `npm.cmd run build`（含 `tsc -b`）与 server `npm.cmd run build`（含 `tsc`）：均 PASS。初次 server build 的新增测试计数类型与 shared 声明未生成问题已修正 / 构建后重跑通过。
- Client `npm.cmd run test:unit`：**86 文件 / 764 测试 PASS，含本次 7 条 Settings 合成功能测试**，整套执行。Server 上述两文件 14/14 PASS。没有新增 / 设计 / 派发安全类测试，没有过滤既有套件用例。
- 其余原脚本逐项执行：registry 5/5、manifest 10/10、parity 10/10；manifest freshness / parity、server shared runtime import、canvas runtime boundary、gallery / rail / single-editor shell、source experience、legacy shutdown、relation freshness、canvas model（60 groups）与 performance（5 场景）全部 PASS。共 16 个补充入口中 15 绿、1 红（`docs:check`）。
- `docs:check`：exit 1，`docs/agent-ops/INDEX.md` 过期；其原有 `&&` 链在 docs-index 阶段停下，inventory / glossary 未执行，未过滤或改脚本。此红在写入本 Result 之前已取得。
- `git diff --check`：PASS；Agent 源目录、原 DB / embedding 实现及 Agent UI 的指定文件 numstat 为空。独立子代理静态复查未发现人类 CRUD 主流程阻塞项。
- Vite / Vitest 全部显式使用空 `COINCIDES_VALIDATION_ENV_DIR` 或空 `envDir`，没有加载 `.env`。全部 DB 调用只到合成 `:memory:`。浏览器外壳无真实用户 / provider 配置，验证完已关闭。
- 日志：`.codex-tmp/a1-memories-validation/client-tests.log`、`client-build.log`、`server-build.log`、`server-memory-agent-tests.log`、`gate-*.log`、`review-scope-gates.jsonl`。Chrome 列表、编辑、确认与空态截图 / AX 证据在本线程工具记录；临时外壳为 `browser-fixture.mts`。

### 未做与停线

- **STOP-1 / needs HQ：完整 runtime gate 未放行。** 未调用根 `npm run verify:v2-bn8-runtime`，因其末尾必跑 `check:changed-file-secrets`，与本次「凭据扫描留 HQ」直接冲突；未改该脚本，未用删掉禁项的命令冒称总门通过。允许的原子入口已如上分别执行。`docs:check` 的索引过期红留 HQ 处理，没有越界更新现状 / 索引文档。
- **已知数据边界（静态发现，未扩大施工）**：既有 Agent `save_memory` 的异步嵌入若晚于人类编辑 / 删除完成，可能再次写回旧向量；删除后的主表记录不会由现有 join / 主表读返回，但编辑后的语义排序可能受旧向量影响。修复要动 Agent 写路径，按本单铁律未做，也未为此设计专项测试。若已有向量表而 sqlite-vec 扩展本次不可用，人类写事务会报错并整体回滚；不宣称该环境可写。
- 未做人类创建、分类或记忆语义加工、新 event verb、软删 / 撤销体系、Agent 读写路径及 Agent 面 UI 改动；未启动真实模型或 embedding 服务；未验证所有 Agent 工具执行分支或真实用户会话。
- 未读 `.env` 或实际 key 值，未接触用户数据库，未扫描凭据；未 stage / commit / push / PR / merge，未更改权限或 Agent 指令文件。主观验收及放行仍留 HQ / Henry。
