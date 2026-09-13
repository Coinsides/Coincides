> **状态 (Status)**: done(HQ 本机全量复跑 599/599 定案;收口见末尾)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.2-B2 · contextHint schema 化+notes/boards 发射点(L2 现场语境)
> **上游**: plan §14.2("contextHint schema 化+notes/boards 页面发射点")+A3a 类型单源裁定(shared 纯 union+各端本地闭集)+B1 四读器(语境的消费者)

# 14.2-B2 · 语境线

**性质**:把"用户此刻在看什么"变成 Agent 的结构化输入。现状:contextHint=`{type: string, data: any}` 无闭集无校验(server validators/index.ts:305 z.any),发射仅 `openAgentWithContext` 显式调用。本单:**类型闭集+被动环境语境发射+服务端校验+系统提示接线**。

## 一 · schema 闭集(A3a 范式:shared 纯 union+各端本地)

1. 盘点现役 hint 用法(`openAgentWithContext` 全部调用点+`l1_onboarding`),连同新增两型收进闭集:
   - `l1_onboarding`(现役,形状照旧);
   - 现役其他型逐个建 data 形状(盘点申报,⛔改语义);
   - **新增 `note_view`** `{ note_id, page_index? }`;
   - **新增 `board_view`** `{ board_id }`;
2. shared 落 string-literal union 类型+各型 data 接口;server 本地 zod 闭集校验(sendMessageSchema 的 context_hint 从 z.any 收紧——**非法型/形状=400**);client 本地闭集 satisfies;
3. 行为兼容:hint 仍可缺省;闭集外旧值若存在(盘点定),按申报裁量兼容或迁移。

## 二 · 发射点(L2 环境语境,被动)

1. **NoteDetail 页**:agent 面板打开且无显式 hint 时,环境 hint=`note_view {note_id, 当前页 page_index}`(页随滚动跟随的现值);离开页=清;
2. **BoardPage**:同款 `board_view {board_id}`;
3. 显式 `openAgentWithContext` 恒优先于环境 hint;环境 hint 在 AgentPanel 现有 contextHint 显示区可见(用户看得见 Agent 带了什么语境——可见不变量);
4. **⛔自动发消息⛔自动调用工具**——hint 只随用户消息捎带。

## 三 · 服务端接线

1. sendMessageSchema 收紧(§一.2);
2. 系统提示/augmentedMessage:`note_view`/`board_view` 型把可读描述并入现有 `[Context: ...]` 机制(orchestrator.ts:116 现路),并提示模型可用 read_note/read_board 深读——⛔服务端代调工具(模型自决)。

## 四 · 台账/禁区/验收(照 A2 常备)

零新增挂载期 API;client 全库必跑;server 全量必跑(Python/MinerU 环境红按例申报)。禁区:⛔新写动词/⛔a11y 树/⛔改机关本体/⛔自动触发消息或工具/⛔新设计安全对抗类用例(既有回归照跑零排除)/⛔碰 .git/⛔commit/⛔读 .env key 值/⛔用户库/⛔新依赖/新造凭据形合成值 ≤20 字符(域数据不在射程)。

验收:1) 三端 typecheck/build+全门绿;2) 定向:①闭集校验(非法型 400/现役型全过)②note/board 环境 hint 发射与清除③显式 hint 优先④服务端 [Context] 并入形状⑤面板语境可见;3) server 全量+client 全库;4) 冒烟(隔离库,builder 浏览器不可用则申报留 HQ):开笔记→开面板→语境显示→发消息带 hint→(有 provider stub 即可)模型收到 [Context];5) 证据落 `docs/audits/2026-09-14-b2-context-hint-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 五 · 申报义务

Result 必含:交付清单+numstat、现役 hint 型盘点、闭集落点、发射点实现落点、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**Codex builder · 工程交付完成；Python/MinerU 环境红与 git/secrets 留 HQ 收口，不作放行判定。** 执行环境日期 2026-09-13，证据目录沿用工单日期 2026-09-14。

### 交付清单与 numstat

完整逐文件交付清单、增删行数和合计见 [`numstat.json`](../../audits/2026-09-14-b2-context-hint-builder/numstat.json)。基线为本线程施工前的明确源码路径快照，按文本行 LCS 计算（规范化 CRLF）；**不是 Git diff，零 git 命令**。临时验证入口、smoke host、构建产物与原始日志不列为交付证据。

| 交付 | 落点 |
|---|---|
| 共享纯类型契约 | `shared/types/agentContextHint.ts`；`shared/types/index.ts` 仅新增 type export |
| client 本地闭集和有效语境 | `client/src/lib/agentContextHint.ts`、`stores/uiStore.ts`、`hooks/useAmbientAgentContextHint.ts` |
| 现役显式调用类型收口 | `components/Onboarding/Onboarding.tsx`、`pages/Calendar/Calendar.tsx`、`pages/Decks/DeckDetail.tsx` |
| 被动页面发射 | `pages/Notes/NoteDetail.tsx`、`NoteAgentContextRoute.ts`、`canvasEngine/layers/NoteRuntimeDocumentLayer.tsx`、`canvasEngine/hooks/useNoteAmbientAgentContextHint.ts`；`pages/Boards/BoardPage.tsx` |
| 面板可见与发送 | `components/AgentPanel/AgentPanel.tsx`、`stores/agentStore.ts` |
| 服务端闭集与 Context | `server/src/validators/agentContextHint.ts`、`validators/index.ts`、`agent/orchestrator.ts` |
| 常驻功能回归 | client 的 `AgentPanel.contextHint.test.tsx`、`BoardPage.contextHint.test.tsx`、`useNoteAmbientAgentContextHint.test.tsx`；server 的 `v14ContextHint.test.ts` 并接入 `server/package.json` 的 test:v2 |
| 文档证据 | 本 Result、原生成器刷新的 `docs/agent-ops/INDEX.md`；审计目录 README、validation-summary、browser-smoke、numstat |

### 现役 hint 盘点与闭集落点

盘点 `client/src`、`server/src`、`shared/types` 中全部 `openAgentWithContext/contextHint/context_hint/l1_onboarding` 使用：**3 个现役显式发射点、3 型**，未发现其他旧值需迁移。

- `l1_onboarding { isNewUser: boolean }`：Onboarding 原值 true；保留服务端仅按 type 进入 L1 的行为。
- `calendar { date: string }`：仍传当前月份的 yyyy-MM-dd 日期字符串。
- `deck { deck_id: string, deck_name?: string }`：名称仍可省略，缺 route ID 时不发射。
- 新增 `note_view { note_id: string, page_index?: number }` 与 `board_view { board_id: string }`。

shared 只有 union/interface/类型映射；**无新增运行时值**。client 本地显示闭集 `satisfies Record<AgentContextHintType, string>`；server 本地五型 strict zod discriminatedUnion，每型 satisfies 共享契约并双向校验最终类型一致性。`sendMessageSchema.context_hint` 仍可省略，非法型/形状沿用真实路由的 ZodError → 400。三个显式调用同步改成传完整类型化 hint 对象，线上 data 语义不变。

### 发射点与服务端接线

NoteDetail route 标记经 DocumentLayer 接入被动测量：面板打开时监听既有阅读面的 scroll/resize/显示比例/页布局，以 `(y,x)` 纸序计算当前 0-based page_index，与 read_note 一致；不依赖导航侧栏、不使用保存的 selectedFrameId。overview 用进入时阅读页；无纸阅读位置可省略页码。BoardNoteModal 不带 route 标记，不抢 board_view。BoardPage 按当前 boardId 注册，切 ID/离页清除。

显式 hint 与环境 hint 独立，selector 恒显式优先；发送后显式一次性清除，环境 hint 保留供下一条**用户**消息。环境语境关闭后不会因同页滚动回弹；换视图或重开恢复。owner 防旧页面卸载误清新页面。显示与发送共用有效 selector，环境变化不触发显式 focus effect。**零新增挂载期 API、零自动消息、零自动工具调用**。

`runAgent` 保留旧三型 `[Context]`；note/board 新增可读对象/页描述以及可选 read_note/read_board 提示，消息/图片文本块/持久化使用同一 augmentedMessage。未改工具循环、动词注册或机关本体。

### 测试与冒烟数字

- 定向 client **3 文件 15/15**；server **1 文件 5/5**。含五型、省略字段、工单指定的 2 个最小非法型/形状 HTTP 400 功能反控、真实 router → provider → 持久化、显示/发送一致、显式优先及生命周期。
- client 全库最终 **170 文件，1737/1737 PASS**。首次新增 board 测试统计原有异步读取过早，修正等待条件后整库复跑；未改产品行为或降低断言。
- server 全量最终 **84 文件，768 项，766 PASS / 2 环境 FAIL；skipped/cancelled/todo=0，排除=0**。两红分别为 `v2SourceMineruWiring.test.ts` 初始化 `spawnSync python.exe ENOENT`，与 `v2SourceRegionCells.test.ts` 的 MinerU 指定 Python 无法启动（exit 101）；按例留 HQ。
- shared build、client typecheck/build、server typecheck/build 全过。总 runtime 门的 **21 个非 git/secrets 子门全部通过**（另加 shared build 共 22 项）；registry **5/5**、manifest **10/10**、parity **10/10**、canvas boundary **174**、模型契约 **60 组**、其余 shell/source/runtime-import/performance/docs 门均过；未修改机关脚本。
- 真浏览器：browser-harness 读 Chrome DevToolsActivePort 被权限拒绝，改用已连接 Chrome 扩展通道完成。真实 client build、生产 routes、合成内存库、provider stub；开笔记→开面板 Page 1→用户发送→关面板滚动再开 Page 2→用户发送→Board→用户发送→Home 清 hint→用户发送。**4 条消息 HTTP 200、4 次 provider 调用，hint 顺序为 note/page0、note/page1、board、缺省**；发送前 provider=0。当前 Context 与可见区一致，历史消息中的旧 Context 正常保留。测试标签页与临时服务已关闭。

完整证据：[`README.md`](../../audits/2026-09-14-b2-context-hint-builder/README.md)、[`validation-summary.json`](../../audits/2026-09-14-b2-context-hint-builder/validation-summary.json)、[`browser-smoke.json`](../../audits/2026-09-14-b2-context-hint-builder/browser-smoke.json)。只保留整理后的证据，非原始日志。

### 未做项与边界申报

- Python/MinerU 环境修复与复跑留 HQ；**不把 server 全量写成全绿**。
- `git diff --check` 和调用 Git 的 `check:changed-file-secrets` 未执行，按本单 git/secrets HQ 收口；整个线程零 git、未读 .git、未 commit。
- 真浏览器面板 backdrop 原本挡住底层滚轮，当前页变化以关面板→滚动→重开验证；面板打开期间的滚动/缩放跟随由常驻测试验证。直接 hash 离开笔记时出现过一次保存提示，HTTP 无失败；没有借本单修改保存边界，也不将该次走查作为保存边界验收。
- 完整 server 第二次运行出现既有 wilderness fixture 的 created_at 跨秒比较差异；未改该测试，第三次**全量**运行已过。初次临时验证入口的 appdata 路径/npm_execpath 配置错误已纠正；产品凭据 guard 未动。
- 未新设计安全对抗类用例；既有安全与功能回归零排除。未读 .env key 值、未触用户库、未加依赖、未改 a11y 树或新写动词；新写凭据形合成值均 ≤20 字符。隔离 dotenv 为空文件，凭据目录为新建系统临时空目录，真实 provider 网络调用为 0。

---

## HQ 收口(fable,2026-09-14)

1. 首跑一红=Node test-runner 子进程 IPC 反序列化毛刺(v2MaterialLibrary 文件级 uncaughtException,node:internal 栈)——隔离 59/59 绿+**复跑全量 599/599 零红**,判基建瞬态,挂 flaky 名录观察位(与 K-5 同为载荷敏感族,机制不同:runner IPC);
2. 交付核验:五型闭集(3 现役收口+note_view/board_view)/被动发射页序与 read_note 对齐/显式恒优先/面板语境可见/服务端严格 400/[Context] 接线带读器提示;builder 借 Chrome 扩展通道自跑真浏览器四消息语境序列(note p0→note p1→board→缺省)全对;
3. git/secrets 入收口单链。

B2 关门——**14.2 主体(读器+语境)合拢**:Agent 看得见纸和板、知道你此刻在看哪页。余件:AI-readable 树(随行线)+14.3 板沙箱(装卸区=新用户面,候晨间设计场)。
