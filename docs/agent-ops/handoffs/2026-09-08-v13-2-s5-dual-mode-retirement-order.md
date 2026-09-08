> **From**: fable
> **To**: codex
> **Status**: done(builder 已交工作树与实跑回执;待 HQ 复核/代账,非放行)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(client+server;迁移已落地(旗标 v2),野地面已清零)

# 13.2 · 单 5 · 双模退役(canvas 入口摘除 + 新写禁令)

## 〇 · 上游(先读,顺序)

1. 段 plan 单 5:`plans/v13-2-wilderness-retirement-plan.md`;
2. 图三 §四(退役语义:退役=新写禁令,⛔ 删值删列):`analysis/2026-09-07-wilderness-migration-mapping.md`;
3. 单 0 侦察第 1 题(workspace/crossing 字面量登记面全表——本单要封的每个写口):`analysis/2026-09-07-v13-2-s0-recon.md`。

## 一 · 口径(冻结)

1. **canvas 模式入口摘除**:page/canvas 切换控件从 UI 移除(page 唯一);任何持久化/深链里的 mode='canvas' 读到即静默落 page;canvas 模式的代码本体⛔ 删除(归清册);
2. **新写禁令**:server validator 拒收新写 `surface='canvas_workspace'` 与 `boundary_role='crossing'`(4xx 带明确错误名);client 写路径类型收窄;既存历史行**读取照旧**(⛔ 删枚举值⛔ 删列⛔ 动历史数据);
3. **登记面逐口封**:按单 0 第 1 题表逐一处置仍可产生 workspace/crossing 新写的现役口(含修复脚本类)——封新写,⛔ 动其读取/历史职能;逐口在 Result 申报处置;
4. **死代码清册**:canvas 模式 UI/手势/控制器/样式的文件+行级清单落 `docs/agent-ops/analysis/2026-09-08-v13-2-canvas-deadcode-inventory.md`(13.6 收官删除时用),⛔ 本单删除任何代码;
5. **零变化面**:page 全行为、准备区、坐标契约 v2 语义、执行器、史记、Source 只读策略。

## 二 · 验证(段纪律)

1. client+server typecheck/build;
2. 单测:validator 拒收两值(错误名断言)+ mode='canvas' 深链落 page;
3. 一条冒烟(fixture):切换控件不存在;带 canvas mode 的旧路由/持久态打开即 page;尝试新写 workspace 被 4xx 且零落库。

## 三 · 回执与边界

apply_patch 追加 ## Result(逐口处置表+numstat+验证输出+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;⛔ 接触用户库;不动 3001/5173。现物冲突⇒停线举证。

## Result

2026-09-08，Codex builder：单 5 工程完成，工作树交 HQ，未 commit。按 §〇 从 `handoffs/plans/v13-2-wilderness-retirement-plan.md` → 图三 §四 → 单 0 第 1 题全表顺读；遵守段 plan 单 builder 纪律，未并行派单。`.codegraph/` 存在但 CLI 不可用，工具表无 CodeGraph；`rg` 亦不可用，源码定位回退限定路径的 `git grep`。开工已有的未跟踪审计/会议材料与 `.claude/settings.local.json` 未改动。

### 实现与逐口处置

Page/Canvas 按钮不再挂载；运行态在 `canvasRetirementPolicy.ts` / `useSurfaceModeController.ts` 固定 Page，旧 hydration 自动切换和 toggle 本体留在早退之后。没有新增 mode 持久化，也没有改写旧路由 state 或历史记录；当前产品的 mode 来源收口在该 hook，legacy canvas 请求/状态不再成为现役 mode。

Server 显式两值的 validator 错误、HTTP 顶层 `error` 和 service 拒写消息分别为 `canvas_workspace_retired` / `canvas_crossing_retired`（400）。缺省/未知 surface 经旧 normalizer 再生 workspace 时同样拒绝。Client 保留完整历史 union，在最终发送 DTO 引入 `WritableCanvasSurface` / `WritableCanvasBoundary`，发送前后两道检查覆盖显式旧值及坐标转换后的再生旧值。没有自动重归属、clamp 或迁移数据。

以下 `E/` = `client/src/pages/Notes/canvasEngine/`，`S/` = `server/src/`。按单 0 第 1 题逐口核销；写口允许汇入同一最终门，纯模型/历史读口不冒充现役 writer。

| 单 0 登记项 | 本单处置 / 当前封口位置 |
|---|---|
| Server 输入总门 | `S/validators/index.ts:717–734` 保留原 enum 成员，加 refine 拒两值；共享 core 覆盖 block 和 paragraph/shape/image/table/connector 等 generic schema。 |
| collection / block / generic / delete 路由 | `S/routes/canvasObjects.ts:22–33` 输出明确退役错误；block/generic 各自 parse 后进入 service。collection 仍固定 formal/inside；delete 非新写旧值，原样保留。 |
| Server 类型与默认值 | `S/services/canvasObjects.ts:451,459` 在输入与默认值解析后各检查一次；不删除原归一化代码、输入/row 旧值兼容。 |
| Server INSERT / conflict UPDATE | 同文件 `:547` 在共同列级 writer 执行 SQL 前封口；`:1913–1915,1996` 覆盖直接 service 调用及 block 委托链，事务失败不落对象/placement/mount。 |
| Server 兼容读 | 同文件 `:300` 的 `projectCanvasPlacementLayout` 与 raw mapper 不动；内存历史 fixture 证明 workspace/crossing 原值仍返回，读前后全表快照不变。 |
| 帧专用 writer | 同文件 `:1715,1805` 固定 formal/inside；不接普通画物/准备区，不改。 |
| Source 独立 writer | `S/services/sourceProjectionMaterializer.ts:395–400` 等既有 formal/inside 写法保留；定向 Source/坐标回归通过。 |
| 共享权威分类器 | `shared/types/canvasSurfaceAuthority.ts` 一字未改；crossing 几何诊断与 fallback 仍可计算，现役发送受 repository 门约束。 |
| Client 类型 / runtimeLayout | `E/types.ts` / `runtimeLayout.ts` 历史 unions 不动；新增 `E/canvasRetirementPolicy.ts:12–17` 定义排除两值的写 DTO。 |
| placementService 持久化链 | `buildLayoutPayload`、`writeLayoutOverride` 与读/几何逻辑保留；实际 block PUT 在 `E/canvasObjectRepository.ts:131,136` 检查原布局及最终 DTO。legacy override 的 server 新写入口原有剥离逻辑 `S/routes/notes.ts:43–45,281,361,368` / `noteBlockLifecycle.ts:146–148,444` 保留。 |
| Client raw normalizer | `E/canvasPersistenceNormalizer.ts` 不动，历史/tray 读法保持；读模型进入保存时仍经最终门。 |
| 草稿收据 / 恢复 | `E/draftBlockPersistence.ts:192–315` 的 workspace/crossing 收据识别不动；adapter 的创建后落位、finalize、恢复、手动保存全部调用同一个 block repository（`:1070,1156,1207,1254,1850`）。旧值恢复落位拒发；收据与现有失败保留逻辑不删除、不静默迁入准备区。 |
| 自然书写 | `E/hooks/useRuntimeNaturalWritingController.ts:192–207,235–236,367–369` canvas authority 本体留存，产品 Page 单模不走 canvas 激活分支；Page 最终保存经 block 门。 |
| shape 创建与 payload | `E/shapeProjectionService.ts:82,145–160`、`layers/NoteWritingSurfaceLayer.tsx:416–469` 纯生成/回传保留；adapter `:2057` → generic repository `:157,161` 拒旧值。 |
| image 创建与 payload | `E/imageObjectService.ts:33,49–64,126–172` 同上，最终 generic DTO 门封口，历史模型不动。 |
| table 创建与 payload | `E/tableObjectService.ts:41,310–325,386` 起同上；表格结构/内容操作不改。 |
| connector 创建与 payload | `E/shapeProjectionService.ts:317–318` 的 workspace 默认与 `visualConnectorService.ts:95` 起的透传留码；generic repository 拒绝发送，canvas UI 不可达。 |
| UI 创建/已有 placement 回传 | `E/layers/NoteWritingSurfaceLayer.tsx` 各 kind 创建/更新共用 generic adapter；固定 workspace 空白 drop `:3228–3244` 位于失去入口的 canvas 分支；Page/准备区 drop 留用。 |
| Runtime 合成 | `E/engineModel.ts:254–273` reserve workspace 是读/展示模型，保留；任何保存候选仍须通过 block/generic repository。 |
| 可执行旧修复脚本 | `server/scripts/v2Bn12LifecycleMigration.ts:924–928,936,1126` 在 apply 备份前与锁内写前检查全部 surfaceUpdates；任一 next 旧值整计划拒绝。dry-run、旧分类、比较、回执/历史分析职能保留。未运行其用户库 CLI。 |
| 历史 035 | `S/db/migrations/035_v2_canvas_objects.ts` 及其后 schema/列/旧 enum 全部不动；没有用重写旧迁移表达停写，也未加全库 trigger 妨碍回滚。 |
| 导出策略全集 | `E/types.ts`、`geometry.ts`、`exportPreviewService.ts`、`layers/ExportPreviewLayer.tsx` 保留；`exclude_workspace` 等是策略词，不是新写 surface；准备区既有排除语义不变。 |
| 几何 boundary | `geometry.ts`、`pageFrameAffiliationService.ts`、`layoutAffiliationService.ts` 保留；输出如要持久化，在 repository 门拒绝两值，不改诊断分类。 |
| 展示 / 索引 | badge、AI tree、objectInspector 与 Inspector layer 的历史读取/准备区身份不改；canvas 专用 Inspector 的产品入口随 mode 关闭。 |
| mode / flow / reading | active controller 固定 Page；`pageStackContentFlowService.ts`、`hooks/usePageReadingPresentation.ts` 及坐标 v2 helper 不改。 |
| 生命周期登记 | course/noteBlock 生命周期和 `trayNotes.ts` 恢复快照保持历史职能，不套全库新写 trigger；Source、执行器/回滚、旗标、events、准备区未改。 |
| 同名异义 | background surface、ContentGroup surface role、learningCanvases、CSS surface token 不作数据库 surface 替换。 |
| 测试登记 | 保留旧值的几何/读模型样本；mode 集成断言改为 Page。response-loss 正向测试仅选 Page 布局，原 workspace 收据样本仍在；v13Tray 的旧成功新写改为“拒写 + 直接 seed 历史后读取”。没有批量把旧测试数据洗成 formal。 |

死代码文件/行级清册：[`2026-09-08-v13-2-canvas-deadcode-inventory.md`](../analysis/2026-09-08-v13-2-canvas-deadcode-inventory.md)。包含 UI、手势、控制器、样式与共享机件保留边界；特别注明 `canvasZoomControl` / `canvasZoomButton` 仍被 Page 阅读控件复用，不能按 canvas 前缀删除。

### 验证实跑

验证设置 `COINCIDES_VALIDATION_ENV_DIR` 为仓内空目录 `.codex-tmp/s5-empty-env`，Vite/Vitest 不读取项目 `.env`。服务端新冒烟明确 `initDb(':memory:')`，HTTP 使用 OS 分配的 localhost fixture 端口，finally 关闭；不使用 3001/5173。

| 命令 / 证据 | 实跑结果 |
|---|---|
| `node client/node_modules/typescript/bin/tsc -b client/tsconfig.json --pretty false` | exit 0 |
| `node server/node_modules/typescript/bin/tsc -p server/tsconfig.json --noEmit --pretty false` | exit 0 |
| server 下 `node --import tsx --test src/__tests__/v13CanvasRetirement.test.ts src/__tests__/v13Tray.test.ts src/__tests__/v13CoordinateContract.test.ts src/__tests__/v2SourceMaterialization.test.ts` | 22 tests，22 pass，0 fail，exit 0；日志 `.codex-tmp/s5-server-regression.log` |
| 新 validator / HTTP fixture | `S5_FIXTURE_PASS retired_HTTP_400=4 zero_write=true direct_defaults_rejected=true history_readable=true db=:memory:`；块/generic 两口 × 两值，均断言错误名和七表快照全等；formal 正写与历史读取对照通过。 |
| client DOM / MemoryRouter fixture | `canvasRetirementPolicy.test.tsx` 的 `?mode=canvas` + route state、legacy hydration、stale toggle 均 Page；两类写 repository、五种 generic kind 的旧值拒发；`NoteChromeLayer.test.tsx` 证明切换控件 DOM 不存在且 Preview 留用。 |
| 根 `npm.cmd run verify:v2-bn8-runtime` | **最终完整 exit 0**，日志 `.codex-tmp/s5-runtime-complete.log`。client 51 files / 470 tests 全过；registry/manifest/parity、边界检查、60 组模型契约、client/server build、性能 smoke、docs、diff、changed-file scan 全链执行。 |
| 文档生成 | `node scripts/docs-inventory.mjs` 仅更新 KIND_HANDLERS 来源行号；`node scripts/docs-index.mjs` 仅新增本清册索引与计数；最终总门已通过两者检查。 |

过程中如实出现过红灯：首轮旧 mode/野地正向样本预期与新政策不符，以及新守卫复制了 generic payload 导致 v1 对象引用不等；引用变化已修复为原对象返回，正向 Page 与历史拒写样本分别保留。新增测试 TS 类型错误已修复。随后两次总门分别提示生成物行号、清册 INDEX 过期，已用原生成器同步；最终未跳门、未改门。`git diff --check` 在仓库原配置下 exit 0；一次误用临时 `core.autocrlf=false` 检查把既有 CRLF 视作空白，未改文件/持久配置，恢复原检查后为 0。

### Numstat

以下为追加本回执前的工作树快照（含生成物与新增清册，**20 文件，+361 / −39**；不含本回执自身）。新增文件按实际行数补列，未 stage。负数是原行替换，不是删除实现/函数/枚举成员；删除文件数为 0。

```text
7   2  client/src/pages/Notes/canvasEngine/canvasObjectRepository.ts
48  0  client/src/pages/Notes/canvasEngine/canvasRetirementPolicy.ts
64  0  client/src/pages/Notes/canvasEngine/canvasRetirementPolicy.test.tsx
2   2  client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx
7   7  client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx
8   8  client/src/pages/Notes/canvasEngine/hooks/useRuntimeSurfaceStateController.pageReading.test.tsx
12 12  client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx
4   1  client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.ts
9   0  client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx
4   0  client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx
10  0  server/scripts/v2Bn12LifecycleMigration.ts
92  0  server/src/__tests__/v13CanvasRetirement.test.ts
6   3  server/src/__tests__/v13Tray.test.ts
6   0  server/src/routes/canvasObjects.ts
4   0  server/src/services/canvasObjects.ts
10  0  server/src/services/canvasWritePolicy.ts
4   2  server/src/validators/index.ts
61  0  docs/agent-ops/analysis/2026-09-08-v13-2-canvas-deadcode-inventory.md
2   1  docs/agent-ops/INDEX.md
1   1  docs/generated/object-inventory.md
```

### 未做 / 交 HQ

- 未删任何实现本体、枚举成员、列或历史数据；未改 shared 分类器、坐标契约 v2、执行器/回滚、旗标、events、Source 策略、准备区实现；未接触用户库、读取 `.env`、打印凭证、调整/重启开发服务器。
- 冒烟证据为 React DOM/MemoryRouter + 真实 HTTP 内存 fixture；未做浏览器用户库旅程或 Henry 走查②，主观验收与放行留 HQ/Henry。
- 未扩跑完整 `server test:v2` 或旧修复脚本全套 apply 测试；历史 writer 成功预期没有批量重写。按本单/总门要求执行上述定向与必要验证，不宣称所有旧套件均适配退役政策。
- 未 commit / push / PR / merge；未更新其他权限或 agent 指令文件。工作树及本回执供 HQ 复核、代账与 13.2 段收口；没有发现需变更冻结设计口径的现物冲突。

回执追加后的收尾复验：`docs:check` exit 0，`git diff --check` exit 0，changed-file scan 28 files PASS；numstat 脚本复算（不含本回执）20 files / +361 / −39，与上表一致。
