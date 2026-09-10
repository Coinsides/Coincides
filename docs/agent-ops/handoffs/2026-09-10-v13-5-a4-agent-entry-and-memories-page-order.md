> **状态 (Status)**: done（builder 施工回执；docs 检查 / 完整总门停线待 HQ）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: Henry 09-10 走查反馈(A线通过;B线三provider迁移成功;C线两缺口);V14.5 Agent-first Home=完全体⛔本单,本单只补最小门
> **单号**: 13.5 · A4 · Home 的 Agent 对话入口 + Agent memories 独立页

# 13.5 A4 · Agent 入口 + 记忆独立页

## 一 · A4a:Home 的 Agent 对话入口

**背景**:AgentPanel 现物存在(client/src/components/AgentPanel,App.tsx 挂载,useUIStore.setAgentPanelOpen 开关)但**无明确 UI 入口**——V2 时代至今的疏漏,Henry 点名补在 homepage。

- Home(DailyBrief)页加一个显眼入口(按钮/卡片,形制沿 Home 现有款式)→ 点击打开既有 AgentPanel;
- **⛔ 改 AgentPanel 本体**;⛔ V14.5 家族(任务队列栏/通知徽标/焦点规则/悬浮窗重设计)——只做门,不做厅;
- 入口文案/图标 builder 裁量申报。

## 二 · A4b:Agent memories 从 Settings 区升独立页

**背景(Henry 原话)**:记忆会越来越多,Settings 内嵌列表装不下;应是"能展开的独立页面"。

- Settings 的 Agent memories 区改为**摘要形态**:计数 + 最近数条预览 + "View all" 入口;
- 新增**独立路由页**(HashRouter 下如 `#/agent-memories`)承载全量列表:分页或增量加载(builder 裁量申报),行内编辑/删除/确认/空态全部沿 A1 现物;
- 大量记忆下可用性:合成 200+ 条验证滚动/加载不卡;
- ⛔ 新语义功能(搜索/按 category 过滤=候裁项,便宜顺手则做、申报即可,⛔为此扩架构);⛔ 动 Agent 读写路径(A1 铁律沿用)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①Home 显示 Agent 入口,点击打开 AgentPanel(与既有开启机制等效,合成会话可发一条消息);②Settings 摘要形态正确(计数/预览/View all);③独立页全量列表+分页/增量,编辑/删除/确认回归(A1 冒烟等价沿用);④200+ 合成记忆下独立页可用;⑤两处空态正常。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触(全走内存合成);⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

> **From**: codex(builder) · **日期**: 2026-09-10（Toronto）
> **结论**: A4a / A4b 施工完成，五条合成冒烟通过；交 HQ 复核。**不代表主观验收、放行或完整 runtime gate 通过**，停线见末段。

### 实现与裁量申报

- Home 页头增加 **MessageSquare 图标 + `Chat with Agent`** 按钮，直接调用既有 `useUIStore.setAgentPanelOpen(true)`；首次 Brief 加载中同样可见。沿 Home 圆角、边框和色彩 token，正文色保证入口可读。未更改 AgentPanel 或任何开启 / 发送机制。
- Settings 的 Agent memories 改为总数、API 创建时间倒序的最近 **3 条**预览及 **View all** 链接；预览仅视觉限制两行，未改写正文。返回 Settings 时重新读取，反映刚完成的编辑 / 删除。
- 新增受现有 ProtectedRoute 保护的 **`#/agent-memories`**，带 Back to Settings。采用**客户端分页，每页 25 条**，顶部 / 底部均有 Previous / Next、页码和当前范围；删除末页最后一条会回退到有效页。编辑 / 删除确认期间禁用翻页，保留草稿。
- A1 全量管理组件与其原 7 条行为测试迁入独立页，继续使用原人类 GET / PUT / DELETE API；原文、时间戳、来源会话、行内保存 / 取消、删除确认 / 取消、加载 / 重试 / 空态与失败恢复保留。新增 205 条分页、末页删除与 Settings 摘要 / Home 入口覆盖。
- 分页只限制 DOM 行数；HTTP 仍沿既有全量 GET，未扩展服务端分页架构。没有新增搜索、分类过滤或记忆语义功能。

### numstat

tracked 用 `git diff --numstat`；新增文件用 `git diff --no-index --numstat /dev/null <file>` 计入，未 stage。

| 文件 | + | - |
|---|---:|---:|
| `client/src/App.tsx` | 2 | 0 |
| `client/src/pages/DailyBrief/DailyBrief.tsx` | 20 | 5 |
| `client/src/pages/DailyBrief/DailyBrief.module.css` | 31 | 0 |
| `client/src/pages/DailyBrief/DailyBrief.test.tsx` | 81 | 0 |
| `client/src/pages/Settings/AgentMemoriesSection.tsx` | 24 | 137 |
| `client/src/pages/Settings/AgentMemoriesSection.test.tsx` | 37 | 127 |
| `client/src/pages/Settings/Settings.module.css` | 29 | 0 |
| `client/src/pages/AgentMemories/AgentMemories.tsx` | 212 | 0 |
| `client/src/pages/AgentMemories/AgentMemories.module.css` | 37 | 0 |
| `client/src/pages/AgentMemories/AgentMemories.test.tsx` | 192 | 0 |
| **代码与功能测试小计（10 文件）** | **665** | **269** |

本工单 header 状态与 Result 为 **+63 / -1**；合计 **11 文件，+728 / -270**。临时合成外壳、构建 / 测试日志与数据面证据均在 ignored `.codex-tmp/a4-memories-validation/`，未加入产品代码。

### 五冒烟逐条

浏览器运行**实际 App / HashRouter / AppLayout / DailyBrief / Settings / AgentPanel / Agent store**；隔离外壳只挂实际 `agentMemories` 人类路由，SQLite 为 `initDb(':memory:')`，固定合成用户、205 条合成记忆。其它接口及对话 SSE 为内存合成响应，不启动生产后端、真实模型或凭据服务。重开持久指同一内存服务存活期间重新 GET，不声称磁盘重启持久。

| # | 结果 | 证据与边界 |
|---|---|---|
| ① Home 入口 → AgentPanel → 发消息 | PASS | Chrome 实际点击 `Chat with Agent` 打开原面板，输入并发送一条合成消息，显示合成回复。HTTP 证据为 1 个合成会话、1 条 user / 1 条 assistant；实际 client store 的创建会话、发送、SSE 消费路径均经过。另有完整 client 套件覆盖加载中入口和重复点击保持打开。未调用真实模型。 |
| ② Settings 摘要 | PASS | Chrome 显示 `205 memories`、001/002/003 三条预览及 View all，点击进入 `#/agent-memories`。编辑 001、删除 002 后返回 Settings，显示 204 条与编辑后的 001/003/004，计数及预览同步。 |
| ③ 独立页列表 / 分页 / 编辑 / 删除 / 确认 | PASS | 独立页显示 1–25 / Page 1 of 9；保存带首尾空格及换行的编辑，reload 后原文仍在，既有 `MemoryManager.retrieveMemories` 同库读取精确匹配。对 002 先 Delete→Cancel 保留，再 Confirm delete 后消失；数据面仅收到一次 DELETE，既有 Agent 读取不再返回该 ID。原 A1 服务端整文件测试 1/1 通过，覆盖原 `extractMemories`、编辑、FTS / 向量清理、删除和空集；原 Agent 实现未改。 |
| ④ 200+ 条可用性 | PASS | Client 测试将 205 条逐页遍历，9 页所有 ID 对应正文无遗漏、无重复，最多 25 行；另覆盖末页最后一条编辑 / 删除回退。Chrome 从 205 条开始，删除后 204 条仍为 9 页；实际滚动并点击遍历至 201–204 / Page 9 of 9，Next 禁用，底部 Previous 可返回第 8 页，无交互卡死或失败业务请求。此为合成规模功能验证，未声称帧率基准或更大数据量保证。 |
| ⑤ 两处空态 | PASS | 仅将夹具内存记忆重置为 0；Chrome Settings 显示 `0 memories` + `No agent memories yet.`，View all 仍可进入独立页；独立页同样显示 0 和空态，没有列表或分页操作。两处完整 client 测试也通过。 |

### 验证记录

- Client / server `tsc --noEmit --project .../tsconfig.json`：均 PASS；client `npm.cmd --prefix client run build`（含 `tsc -b`）、server `npm.cmd --prefix server run build`：均 PASS。最终仅提高两处入口文字对比度后，client build 再跑 PASS。既有大 chunk 提示仍为非阻塞 warning。
- Client **`npm.cmd --prefix client run test:unit` 全库整跑：93 文件 / 809 测试 PASS，零过滤**，含 Home 2、Settings 摘要 3、独立页 9 条。原 A1 server 文件 `node --import tsx --test src/__tests__/v13AgentMemories.test.ts`：1/1，0 skip，完整执行。
- 16 个允许的原始补充 npm 入口独立执行：**15 PASS / 1 FAIL**。registry 5/5、manifest 10/10、parity 10/10、manifest freshness / parity、server shared import、canvas boundary、gallery / rail / single-editor shell、source experience、legacy shutdown、relation freshness、canvas model / performance 均 PASS；`docs:check` 的原链在索引检查失败，后续 inventory / glossary 未执行。未改脚本或过滤用例。
- `git diff --check`：PASS。指定禁区 `server/src/agent`、`client/src/components/AgentPanel`、`agentStore.ts`、`uiStore.ts`、人类记忆路由与 shared 记忆类型均零 diff。工作前已有未跟踪文件原样保留。
- Vite / Vitest 显式指向空 `COINCIDES_VALIDATION_ENV_DIR` / `envDir`；未读 `.env` 或实际 key 值，未接触用户库。浏览器 API 证据中失败业务请求为 0。
- 证据目录：`client-tests.log`、`client-build.log`、`server-build.log`、`server-memory-tests.log`、`gate-results.json` / `gate-*.log`、`browser-after-edit.json`、`browser-after-delete.json`、`browser-final-evidence.json`；实际 UI 截图 / AX 与九页点击记录在本线程工具记录。外壳源为 `browser-fixture.mts`，验证后关闭。

### 未做与停线

- **STOP-1 / needs HQ：完整 `npm run verify:v2-bn8-runtime` 未调用。** 原链末尾必跑 `check:changed-file-secrets`，与本单「凭据扫描留 HQ」直接冲突；没有删改 / 过滤该链，没有把独立入口通过冒称为总门通过。
- **STOP-2 / needs HQ：`docs:check` 红。** `docs/agent-ops/INDEX.md` 过期，失败发生在追加本 Result 之前；未越权更新 HQ 管辖的现状 / 索引文档。
- 未改 AgentPanel 本体、Agent 读写路径、Agent store、UI store、schema / migration / 服务端路由；未做 V14.5 Agent-first Home 的任务队列、通知徽标、焦点规则或悬浮窗重设计。
- 未做搜索 / category 过滤、人类创建记忆、软删 / 恢复、新 event verb；未调用真实 provider / embedding，未接触 OS 凭据或用户库，未设计 / 新增 / 执行专项安全测试，未扫描凭据。A1 已登记的异步旧向量竞争边界未在本单修复或重新保证。
- 未 stage / commit / push / PR / merge；未改 Agent 指令或权限配置。主观验收和最终放行留 HQ / Henry。
