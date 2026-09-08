> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.2 单 4a=坐标契约双模改造,client 大单;⛔ 动数据)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(允许多轮内部推进,公共接线一人顺序整合)

# 13.2 · 单 4a · 坐标契约双模改造(client 消费链)

## 〇 · 上游(先读,顺序)

1. 段 plan 修订三(扳机门/不变量/4a-4b 拆分,本单法源):`plans/v13-2-wilderness-retirement-plan.md`;
2. S4 卷宗 §一/§四 A 表(消费点全名单+爆炸半径,本单改动面地图):`analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md`;
3. 冻结裁定二(A 向:存储正典=frame-local 全轴):13.1 段 plan 尾部;
4. 真库 census 收据(144 歧义行的现实分布):`docs/audits/2026-09-08-v13-2-真库-shadow-run.md`。

## 一 · 口径(冻结)

1. **旗标**:库内 meta 存 `coordinate_contract: 'v1' | 'v2'`,默认 v1——先侦察 server 现有 kv/settings 存储,可复用则复用,否则新迁移建极小 meta 表;server 经现有(或极小新增)只读端点暴露;client 在画布数据加载时取一次,⛔ 运行中热切换;
2. **单一语义收口**:新建纯函数层(如 `placementContractService`):`resolveWorldRect(layout, frame, contract)` 等——**v1 分支=现行为逐字保真,v2 分支=全轴 frame-local→world 投影**;S4 §四 A 表所列消费点(buildRuntimeBlockPlacement/fragments 派生/flow/reflow 碰撞/affiliation 随帧移动/屏显定位/打印投影输入)全部改经该层;⛔ 散落 `if(contract)` 遍地——分支只活在语义层内;
3. **v1 逐位不变**:旗标 v1 下,全部既有测试零修改通过(测试基建适配除外,逐条申报);新增对照测试:同一合成数据,改造前后 v1 屏显几何逐位相等;
4. **v2 语义**:存储=frame-local 全轴;碰撞/reflow 在 v2 下**按 frame 分组**(S4 已警告:各帧真 local y 都近 0,全局碰撞会互推);**不变量测试**:合成两帧笔记,(v1 契约+原混合数据) 与 (v2 契约+手工归一数据) 的全部块 DOM 几何逐位相等——这就是扳机日验收判据的测试形态;
5. **打印投影搭车**:NotePrintLayer/pagePrintProjectionService 的 fragments 输入在 v2 下走新语义层(它是 v2 的第一受益者);⛔ 本单验收打印功能本身(仍停放);
6. **零变化面**:⛔ 任何数据迁移/归一(4b 财产);⛔ v1 行为变化;⛔ canvas 模式;⛔ server 业务路由(旗标端点除外);⛔ UI。

## 二 · 验证(段纪律)

1. client+server typecheck/build;
2. 双模对照测试(§一.3/§一.4)+ 既有定向测试 v1 全绿;
3. 一条功能冒烟:合成两帧笔记在 v1/v2 双契约下 DOM 几何逐位相等(浏览器或 jsdom 实跑,申报采样值)。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 查询用户数据。现物冲突(如 A 表消费点已漂移/kv 存储形状不容)⇒ 停线举证,⛔ 自行改判。

## Result

### 2026-09-08 · builder 停线回执（施工未完成，候 HQ 裁范围）

本轮已按 §〇 顺序核读段 plan 修订三、S4 §一/§四 A 表、13.1 冻结裁定二与指定真库 census 收据，并核对 Agent 入口、方向宪章、现状与 active ADR。未修改产品代码；本单仍为 `ready`，本回执不作完成或放行凭据。

**停线点：v2 全轴 local 存储与 Source 现役独立 writer 的施工归属未闭合。** §一.4 冻结“存储=frame-local 全轴”，§一.6 又将 server 业务路由列为零变化面（旗标端点除外）。S4 A 表末行明确要求 local 落库时同步转换 `sourceProjectionMaterializer`；它仍在现役业务链中直接写 world。仅改 client 消费层可全轴解释显式 world 输入，却不能使这条独立新写链成为 local 存储。

| 证据 | 现物与后果 |
| --- | --- |
| `server/src/routes/sources.ts:120`、`:133`、`:134` | `materialize` / `retry` 调用 `scheduleSourceMaterialization`。 |
| `server/src/services/sourceMaterialization.ts:510`、`:523`、`:465` | 调度实际执行后调用 `publishSourceProjection`，并非失效代码。 |
| `server/src/services/sourceProjectionMaterializer.ts:150`、`:201`、`:202` | `buildProjectionLayout` 生成 `x=frame.x+CONTENT_LEFT`、`y=frame.y+localY`。 |
| 同文件 `:529`、`:536`、`:537`、`:546` | 直接将上述 x/y INSERT 到 `canvas_placements`，并写 `coordinate_space: 'canvas_world'`，绕过 client helper。 |
| `server/src/routes/canvasObjects.ts:51`、`:53`；`server/src/services/sourceProjectionPolicy.ts:26`、`:37` | Source 笔记的布局 PUT 被只读守卫拒绝，不能以“下次 client 保存时转 local”补齐持续新写契约。 |
| `server/src/__tests__/v2SourceMaterialization.test.ts:342`、`:350` | 既有 v1 测试明确要求 `x===152` 和 `coordinate_space===canvas_world`。本轮只读其断言，未执行该测试。 |
| `docs/agent-ops/analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md:280` | A 表已登记 Source 独立 writer 的必要转换；这里不是消费点漂移，而是 4a/4b 拆分后尚未明确的持续新写归属。 |

**待 HQ 裁定的最小边界**：Source writer 按同一库级旗标进行双模新写（v1 原样，v2 全轴 local）的 service 改动是否纳入 4a；若留给后单，须明确它是 4b 置 v2 前的必修项。它无需改变路由签名或 Source 只读策略，但会改变现役 materialize/retry 的持久化行为。builder 不自行把“禁止业务路由变化”缩读为“只禁止改 route 文件”，也不自行把 v2 允许 world 混存写入验收口径。

### 旗标存储侦察（不是停线点）

- 源码未发现库级通用 kv/meta；`server/src/db/schema.sql:15` 的 `users.settings` 是每用户 JSON，`server/src/routes/settings.ts:34` 的用户 PUT 会合并它，不适合作库级扳机旗标；`server/src/db/migrate.ts:36` 的 `db_migrations` 是迁移账本。
- 无可复用 kv 时新建极小 meta 表是 §一.1 明确允许的 fallback，不因这一点停线。当前迁移序列最高为 `055_v13_tray_order.ts`；本轮未新建或执行迁移。
- 续工接线候选：受保护的 `/api/canvas-objects` router 下新增只读 `/coordinate-contract`，缺记录默认 v1；client 在 `canvasObjectRepository.ts:58` 的画布加载链确定契约后 hydrate，并冻结该加载会话的契约。此处仅记录候选，未实施。

### 验证输出摘要

- **纯函数现物探针 PASS（Node 进程 exit 0）**：只读取 `sourceProjectionMaterializer.ts` 中数值常量及 `estimateBlockHeight` / `buildProjectionLayout` 两个纯函数片段，用现有 TypeScript 转译器去类型后在独立 VM 中执行；输入为手写的两页合成短文本，UUID 为内存计数替身。未导入服务模块、未连接 DB、未运行服务器。
- 实测第 1 帧 `(80,80)`，块 `(152,176,650,72)`，内容原点 `(152,176)`；第 2 帧 `(80,1239)`，块 `(152,1335,650,72)`，内容原点 `(152,1335)`。两块相对各自内容原点均为 `(0,0)`；这证明现役规划函数产 world 值，SQL 持久化路径由上表源码背书。**这不是双模 DOM 冒烟，也不是迁移实跑。**
- `codegraph explore` 与 `rg` 均因命令不可用失败，未发现可调用的 CodeGraph 工具；后续只读定位使用 PowerShell 文件枚举与 `Select-String`。未进行索引操作。
- 因施工前停线，client/server typecheck/build、双模对照测试、既有 v1 定向测试、DOM 几何冒烟及 `npm run verify:v2-bn8-runtime` **均未运行**，验证门没有通过或豁免。
- `git diff --numstat`：本施工单 **41 行新增 / 0 行删除**，无产品代码变更；`git diff --check` 通过（exit 0）。Git 另提示 LF/CRLF 转换与全局 ignore 文件读取受限；工作树状态仍可列出，三项既有未跟踪内容未变。

### 未做与工作树交接

- 未实施旗标、语义层、碰撞分组、flow/reflow、affiliation、屏显或打印输入接线；未修改既有测试；未验收打印功能。
- 未进行任何数据迁移、归一、备份表创建、旗标切换或 events 写入；未查询用户数据；未读取 `.env`；未打印任何密钥。
- 未启动、停止或重启开发服务器，未占用 3001/5173；未 commit / push / PR。
- 开工已有三项未跟踪内容（`.claude/settings.local.json`、模拟用户现场测试单、09-04 会议记录）保持原状。仅本回执工作树交 HQ；不翻 `done`，候范围裁定后续工。

## 补遗一(2026-09-08,发单方 Fable,针对停线回执;停线成立,举证有效——矛盾出自发单方拆单疏漏)

1. **裁定:Source 独立写手纳入 4a**。理由:4a 的身份=让系统完整双语(读与写都按旗标分支),4b 只做数据手术+翻旗;把持续新写留给 4b 会让执行器单混入语义工程。§一.6 相应修订:server 业务**路由签名/只读策略/调度行为零变化**维持,但 `sourceProjectionMaterializer` 的**持久化数值与 coordinate_space 标签在 v2 旗标下改写 frame-local 全轴**——本条显式授权,⛔ 视为绕过零变化面;
2. **实施口径**:物化器写入前按库级旗标分支(server 侧直接读 meta 表,⛔ 绕 HTTP);v1=现行为逐字保真(既有 v2SourceMaterialization 断言 x===152/canvas_world 在 v1 下零改动通过);v2=写 `(localX, localY, 'page_frame_local')`(其 buildProjectionLayout 本就先算 local 再加原点,拆回即可);新增 v2 对位测试(断言 local 值+新标签);
3. **旗标侦察三候选全部采纳**:新迁移建极小库级 meta 表(承 055 之后,编号开工复核);只读端点挂受保护的 `/api/canvas-objects/coordinate-contract`(缺记录默认 v1);client 在画布加载链取一次、**冻结该加载会话的契约**(⛔ 热切换);
4. 其余口径不变(§一.2-5、§二、§三)。按本补遗续作至完工 Result。
