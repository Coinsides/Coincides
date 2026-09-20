> **状态 (Status)**: completed（builder 施工回执；工作树交 HQ，未作放行）
> **日期**: 2026-09-20
> **工单**: `docs/agent-ops/handoffs/2026-09-20-v14-b2-timeline-chart-order.md`
> **验证口径**: 非 git/secrets 的 23 组件分次通过；server 全量仍有两项 Python 环境失败；不宣称完整验证门通过。

# B2 时间线与图表组件 · Builder 交付证据

新增第四族 `block_type: 'component'`，payload 仅 `{ component_kind, params }`。手工闭集为 `timeline`、`chart_bar`、`chart_line`；未知 kind 保留 envelope，显示 kind 名及「未注册组件」。没有动态加载、自由 HTML、图表 DSL、第三方图表库或新依赖。

施工先以只读 `git show 15f36573` 考古 B1，原始记录为 `.codex-tmp/b2-component/b1-root-archaeology.log` 与 `b1-server-archaeology.log`。组件沿 B1 的类型/模板、create/update 校验、通用 hydration、现役历史、A1 媒体分页、活 payload 检索和 `read_note.text` 链路扩展。没有另建存储、分页器、撤销栈或 Agent 动词。CodeGraph 索引目录存在，但本环境 CLI 不可用、工具清单无对应 MCP；记录后定点读取 B1 现物。

## 参数与三段律

骨由 `component_kind` 指向内置项；皮由现役 skin tokens 决定；实参只在 `params`。展开状态、编辑草稿、焦点、布局坐标均不加入组件 payload。

| 对象 | 校验与边界 |
| --- | --- |
| envelope | 仅 `component_kind` / `params`；kind 非空、非纯空白，≤128 UTF-16 code units；params 必须为 object |
| timeline | `title?: string`；`entries` 1–64 条；每条 `year: string`、`label: string`、`detail?: string`；拒绝多余字段，不解析日期、不重排年份 |
| chart_bar / chart_line | `title?: string`、`y_label?: string`；`x_labels` 1–32 个 string；`series` 1–4 条；每条 `name: string`、`values: number[]`，长度须等于 x_labels，数值必须有限；允许负数、零、小数；拒绝多余字段 |
| 已知组件文字 | 所有领域文本合计 ≤65536 UTF-16 code units，不截断；数值不计入文字预算 |
| 未知 kind | 校验合法 envelope 后原样保留 opaque params；占位，不执行、不猜字段、不借默认模板改 kind |

客户端 `componentBlockService.ts:39` 与服务端 `validators/componentBlock.ts:8,15,38,51` 实现同口径。独立执行 45 组普通领域边界向量，接受/拒绝 **45/45 一致**；其中 16 组有效 payload 的纯文本投影 **16/16 字节相等**。共享图表模板是 1 点种子、客户端新建草稿是 2 点种子，均合法，不改变协议。

## 逐件定位

下表客户端路径均相对 `client/src/pages/Notes/canvasEngine/`；其他路径自仓库根起。

| 链路/件 | 文件与行号 |
| --- | --- |
| 第四族、payload 类型、三模板 | `shared/types/index.ts:489,500,514,655,661,667`；`server/src/lib/noteBlockTemplates.ts` |
| 客户端三 kind 与参数、扁平投影 | `componentBlockService.ts:5,16,21,39,110` |
| 服务端校验/文本 | `server/src/validators/componentBlock.ts:8,15,32,38,51`；`server/src/services/componentBlocks.ts:10` |
| 创建/编辑/hydration | `server/src/validators/index.ts:773`；`server/src/services/noteBlockLifecycle.ts:441`；`server/src/services/noteBlockContent.ts:37`；`hooks/useNoteCanvasDataAdapter.ts:1419,1795` |
| read_note | `server/src/services/agentReadSurfaces.ts:93`；kind 如实为 component，继续使用既有 text，输出 schema 零新键 |
| 时间线渲染/折叠 | `blocks/ComponentBlockProjection.tsx:95,100`；CSS `:15,17`，纵轴发丝线、年份强调色 |
| 图表共用轴/SVG/未知占位 | `blocks/ComponentBlockProjection.tsx:29,51,71,86,108`；CSS `:29,35,44` |
| 两类浮层编辑器 | `blocks/ComponentBlockEditor.tsx:19,22,36,45,75,120,137,150`；草稿隔离、增删/上下移、网格、焦点与快捷键、提交失败重试 |
| 创建入口与现役撤销 | `layers/NoteWritingSurfaceLayer.tsx:1924`；`hooks/useNoteCanvasRuntimeController.ts:509,641`；`hooks/useComponentBlockHistory.ts:16` |
| 同源阅读/Overview/打印/导出 | `layers/BlockEditorLayer.tsx:271,570,652`；`layers/NoteReadOnlyPageContent.tsx:72`；`layers/ExportPreviewLayer.tsx:39` |
| A1 三态分页/实测 | `notePageFlowService.ts:22`；`measurementService.ts:102`；沿既有 ResizeObserver 测高，整块不裂、顶爆下移、超高独占 |
| 活 payload 检索 | `noteNavigationSearch.ts:42`；`blockContentService.ts:172`，包括时间线 detail 和图表各标签 |
| 阳性样张 | `fixtures/songTimeline.ts:4`（960–997、13 条）；`fixtures/songRevenueChart.ts:4`（三期两系列等价示意） |
| 说明书 | `docs/agent-ops/current-state/app-operating-manual.md:43` 起，补 UI/API/字段上限/read_note/打印边界及「内置件=闭集，自由组件候产房」 |

四系列配色依次取 `--sk-accent`、`--sk-ink-muted`、强调色 65% 与正文墨色混合、`--sk-ink`；无 hex。折线用不同线型辅助辨识。图表以最大绝对值归一计算，有限极值不会因数值域相减溢出。数值输入保留 `-` / `-1e` 等过渡串，未完成时禁止保存，完成后才转换为有限 number。

`server/src/services/noteCoverRules.ts:81` 只将新 block_type 纳入既有封面呈现分类，保持 A3「组件不能放封面」；未修改授权、写门或 `assertCoverPlacement`。

## 验证收据

原始日志全部在 `.codex-tmp/b2-component/`。各次失败与复跑都保留，没有覆盖为全绿记录。

| 验证 | 最终结果 | 原始日志 |
| --- | --- | --- |
| 客户端 service 定向 | 1 文件，22/22 PASS | `service-tests.log` |
| UI 定向 | 2 文件，25/25 PASS | `ui-tests.log` |
| 客户端整合定向 | 4 文件，145/145 PASS，其中新增 25 项 | `integration-directed.log`、`integration-runtime.log` |
| 客户端全库，代码冻结后 | **214 文件，2181/2181 PASS**；`npm.cmd run test:unit -- --maxWorkers=2`，无排除/改超时 | `client-full-final.log` |
| 最终 client build | PASS（包含最后数值输入和标签间距修改）；既有 bundle size warning | `client-build-final.log` |
| Server B2+B1 定向 | **20/20 PASS**，其中 B2 新增 11 项 | `server-component-targeted-rerun.log` |
| Server build | PASS；manifest 检查未过期 | `server-build.log`、`gate-21-build.log` |
| Server 全量 test:v2 | **FAIL，exit 1**；首轮 786 tests / 779 pass / 7 fail；5 个 Node IPC 文件级故障被现役 wrapper 自动逐文件复跑，5/5 恢复；剩两项 Python 环境失败 | `server-v2-full.log`、`server-python-environment.log` |
| 双端参数与投影一致 | 45/45 校验结果一致；16/16 有效投影字节相等 | `server-client-component-parity.log` |
| 非 git/secrets 23 组件 | 分次验证通过，逐组件收据见下 | `runtime-gates.json`、`runtime-gates-final.json` |

首轮客户端全库高并发为 2177 tests / 2168 pass / 9 fail，失败为既有 Board/A1 超时及 bookmark 时序断言。降低 worker 后再次整跑为 2181 tests / 2178 pass / 3 fail；该轮启动与 UI 最后修改重叠，三个新增标签间距断言读到旧间距。冻结代码后第三次完整整跑 2181/2181 PASS。前两轮日志为 `gate-05-test-unit.log`、`client-full-workers2.log`。未通过删除断言、排除文件或放宽超时取绿。

Server 两项未收口：`v2SourceMineruWiring.test.ts:60` import 时 `spawnSync python.exe ENOENT`；`v2SourceRegionCells.test.ts:203` 的既有外部 MinerU venv shim 启动失败（exit 101），其目标 uv Python 父目录在托管环境读取被拒绝。相关失败链路四文件的只读 diff 为空，见 `server-python-baseline-diff.log`。没有装依赖、改解析器、绕过 sandbox 或跳过测试。这里证明本单未改这些文件，**不等于未改基线全量已通过**；由 HQ 在既有 Python 可运行环境复核。

### 工单 §四.4 的 23 组件口径

按根 `package.json` 拆出原门的 23 个非 git/secrets 组件逐一执行。首轮 21/23 PASS；`test:unit` 以上述最终全库复跑收口，`docs:check` 在更新说明书、工单回执和生成 INDEX 后复跑。`build:client` 也在代码冻结后复跑。最终逐组件记录为 `runtime-gates-final.json`；初始失败记录 `runtime-gates.json` 保留。

| # | 组件 | 收据 |
| ---: | --- | --- |
| 1 | check:test-wiring | `gate-01-check-test-wiring.log` |
| 2 | test:agent-knowledge | `gate-02-test-agent-knowledge.log` |
| 3 | check:agent-knowledge | `gate-03-check-agent-knowledge.log` |
| 4 | check:tech-debt-table | `gate-04-check-tech-debt-table.log` |
| 5 | test:unit | `client-full-final.log` |
| 6 | test:tool-face-registry | `gate-06-test-tool-face-registry.log` |
| 7 | test:tool-face-manifest | `gate-07-test-tool-face-manifest.log` |
| 8 | check:tool-face-manifest | `gate-08-check-tool-face-manifest.log` |
| 9 | test:tool-face-parity | `gate-09-test-tool-face-parity.log` |
| 10 | check:tool-face-parity | `gate-10-check-tool-face-parity.log` |
| 11 | check:server-shared-runtime-import | `gate-11-check-server-shared-runtime-import.log` |
| 12 | check:canvas-runtime-boundary | `gate-12-check-canvas-runtime-boundary.log` |
| 13 | check:group-gallery-shell | `gate-13-check-group-gallery-shell.log` |
| 14 | check:groups-rail-shell | `gate-14-check-groups-rail-shell.log` |
| 15 | check:single-editor-shell | `gate-15-check-single-editor-shell.log` |
| 16 | check:source-experience | `gate-16-check-source-experience.log` |
| 17 | check:v2-bn11-legacy-shutdown | `gate-17-check-v2-bn11-legacy-shutdown.log` |
| 18 | check:v2-bn11-relation-freshness | `gate-18-check-v2-bn11-relation-freshness.log` |
| 19 | smoke:canvas-engine-model-contract | `gate-19-smoke-canvas-engine-model-contract.log` |
| 20 | build:client | `client-build-final.log` |
| 21 | build | `gate-21-build.log` |
| 22 | smoke:canvas-engine-performance | `gate-22-smoke-canvas-engine-performance.log` |
| 23 | docs:check | `docs-check-final.log` |

**完整门中的仓库级 `git diff --check` 与 `check:changed-file-secrets` 留 HQ 收口；未执行 git 写操作、commit、push、PR。以上不是完整 `verify:v2-bn8-runtime` 通过声明。** 后端子任务曾执行局部只读 `git diff --check -- server shared/types/index.ts`（exit 0，`server-whitespace.log`），不代替仓库级 git 组件收口；不得宣称从未执行任何 `git diff --check`。Server 全量另外申报为失败，不能被 23 组件记录掩盖。

## 真实浏览器与阳性样张

在临时本地 harness 使用生产组件与 fixtures 实测：13 条年表、detail 展开、条目下移及取消还原；图表 70→75 保存回显；真实键盘输入 `-` 保留且禁止保存，补成 `-1e2` 后 SVG 呈现 -100；未知 kind 占位。390×844 窄屏无页面横向溢出，图表/数据网格内部滚动；warm-paper 与 quiet-ink 切换后使用对应 token。浏览器 warn/error 查询为空。

浏览器观察原文在 `browser-observations.md`；截图在工具返回中目视检查，Chrome adapter 不支持导出，未声称有截图文件。此项是隔离 harness 的真实 renderer/editor 检查，**不是登录后完整 Note E2E**；保存、撤销、hydration、分页由上列功能测试补证。临时 harness 已从 client 移到原始日志目录，预览服务和标签页已关闭。

可直接打开 [POSITIVE-SPECIMENS.html](./POSITIVE-SPECIMENS.html)：由生产投影与编译 CSS Modules 生成的零脚本蒸馏件，含十三条时间线、三期两系列柱图和同数据折线。财政值为教学示意等价数据，不作史料引用。

## 边界与 HQ 待办

- 时间线展开只在当前投影实例生效。Overview/打印重新挂载时默认折叠，不继承阅读展开态；若 flow plan 已按展开高度测量，静态面可能保留空白。打印不强制展开，避免超出同一 flow plan 的高度。
- 图表 x 标签最多三行后显式省略，完整值仍在 SVG 描述和检索文本；宽数据图打印缩放至块宽，密集数据字号会变小，目标纸型成品可读性留主观验收。
- 自由组件/产房/OpenDesign 未做；结构化 read_note 槽仍留 C 波。Relation、Agent 注册表/写门、TextFlow 真相 schema、page_frame_local 九条、依赖、权限配置均未修改。新增凭据形 fixture 仅 `synthetic`（9 字符）；没有新设计安全对抗用例，既有全库照跑。
- HQ 收口两项 git/secrets 组件、两项 Python 环境失败、主观验收及后续 git 交付。工作树交接，builder 不放行。

分项详证：[后端与共享建模](./SERVER-COMPONENT-EVIDENCE.md)、[UI 与样张](./UI-COMPONENT-EVIDENCE.md)、[客户端整合](./INTEGRATION-EVIDENCE.md)。未发现需要触发工单冲突停线的事项。
