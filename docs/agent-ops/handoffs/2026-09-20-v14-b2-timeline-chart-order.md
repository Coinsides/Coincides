> **状态 (Status)**: done(builder 一轮交付+HQ 收口全绿,2026-09-20:client 214 文件 2181/2181 亲跑定案;git diff --check+secrets(58 文件)双门绿;server 余 2 红=Python/MinerU 环境基线)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 组件墙 · B2 时间线件+图表件 v1(组件块第四族首批)
> **上游**: `design/note-page-design.md` §1.3(组件族=修宪记录一,随行法四条;判据「行为独异才配当块型」——时间线折叠交互/图表数据绘制均过判据)+ 方向档修宪记录一(组件块入籍类型系统)+ 产房三段律(骨/皮/实参=组件 payload 通用格式)+ 宋史手册基准件(时间线七条/财政柱图为阳性样张)+ B1 表格块先例(媒体族建模链路,commit 15f36573)。**设计裁量已完成,照拍施工⛔重开设计。**

# B2 · 时间线件+图表件 v1

**性质**:组件块第四族的**首批两名内置公民**。⛔产房⛔OpenDesign 接线——这两件是手工闭集内置件(第四族的地基验证),自由组件候产房批。

## 一 · 组件块族地基(第四族入籍,一次立法两件受益)

1. 新 block_type `component`(第四族;修宪记录一已铺),`content_json` 照产房三段律:`{ component_kind: string, params: object }`(骨=component_kind 指向内置注册项;皮=渲染取 token;实参=params);
2. **内置件注册表(手工闭集)**:v1 仅 `timeline`/`chart_bar`/`chart_line` 三 kind;未知 kind=占位渲染(显示 kind 名+「未注册组件」)⛔崩;⛔任何动态加载⛔自由 HTML;
3. 分页:照 A1 媒体规则(整块不裂/顶爆下移/超高独占);
4. read_note 投影:照 B1 先例走现役 schema(kind 照实,text 键装扁平化内容;结构化槽记账 C 波);
5. 检索:组件内文本(时间线条目/图表标签与标题)入现役检索面。

## 二 · 时间线件(timeline)

1. params=`{ title?: string, entries: [{ year: string, label: string, detail?: string }] }`(上限申报,建议 ≤64 条);
2. 渲染:纵向轴线+年份铅锤+条目标签,detail 折叠展开(呈现态⛔真相);token 化(轴线=发丝线族,年份=强调色族);
3. 编辑:浮层编辑器(增删条目/上下移/逐字段编辑),入现役撤销栈;
4. 阳性样张:宋史手册第一章年表(960-997,13 条)等价内容自铸夹具。

## 三 · 图表件(chart_bar / chart_line)

1. params=`{ title?: string, x_labels: string[], series: [{ name: string, values: number[] }], y_label?: string }`(series ≤4,点数 ≤32,校验申报);
2. 渲染:SVG 同一坐标系(轴/刻度/图例/数值标注),token 配色(⛔hex;系列色从皮的强调/中性族派生申报);分组柱状与折线两种 kind 共用轴系;
3. 编辑:浮层编辑器(表格式数据网格编辑 x/series,增删列与系列),入撤销栈;
4. 阳性样张:宋史手册「岁入的换血」(三期两系列分组柱)等价数据自铸夹具;
5. ⛔自由图表 DSL⛔第三方图表库(⛔新依赖照旧)。

## 四 · 验收与禁区

1. 定向:第四族建模+未知 kind 占位+两件 params 校验边界+编辑器全动作+撤销+分页三态+打印导出 Overview 同源+检索命中+两张阳性样张复刻渲染;client 全库+server 全量;既有回归零破(A1-A5/B1/媒体族/墙九条);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 补组件块条目(含「内置件=闭集,自由组件候产房」边界);
3. 证据落 `docs/audits/2026-09-20-b2-component-builder/`(蒸馏件),原始日志留 `.codex-tmp/b2-component/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关(read_note 走现役 schema,零新键);⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:第四族建模申报+两件 params 校验表+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

**2026-09-20 · Codex builder · 施工完成，工作树交 HQ，未作放行。** 先只读考古 B1 `15f36573`，沿其建模→校验→hydration→现役撤销→A1 媒体分页→检索→read_note 扁平投影链路扩入第四族，没有另起存储或渲染架构。原始日志留 `.codex-tmp/b2-component/`；总证据见 [BUILDER-REPORT.md](../../audits/2026-09-20-b2-component-builder/BUILDER-REPORT.md)，附后端、UI、整合分项报告与可打开的 [阳性样张](../../audits/2026-09-20-b2-component-builder/POSITIVE-SPECIMENS.html)。

### 第四族与 params 校验申报

`block_type='component'`；payload 仅 `{component_kind,params}`；骨取 kind、皮取现役 token、实参取 params。手工闭集仅 timeline/chart_bar/chart_line；未知 kind 持久化 opaque object 并显示 kind +「未注册组件」，不加载代码、不执行 HTML。

| 对象 | 实施规则 |
| --- | --- |
| envelope | 只含 component_kind/params；kind 非空、非纯空白，≤128 UTF-16；params 为 object |
| timeline | title 可选 string；entries 1–64；每条 year/label 必须 string，detail 可选 string；严格字段 |
| chart_bar/chart_line | title/y_label 可选 string；x_labels 1–32 个 string；series 1–4，每条 name string、values 有限 number[] 且长度严格等于 x_labels；允许负数/零/小数；严格字段 |
| 总量 | 已知件全部领域文本合计 ≤65536 UTF-16，不截断；未知 kind 仅查 envelope，params 不解释 |

### 逐件行号

客户端简称相对 `client/src/pages/Notes/canvasEngine/`，完整逐层表在总报告。

- 第四族/三模板：`shared/types/index.ts:489,500,514,655,661,667`；客户端 registry 与校验 `componentBlockService.ts:21,39`；服务端 `server/src/validators/componentBlock.ts:8,15,32,38,51`。
- 时间线：`blocks/ComponentBlockProjection.tsx:95,100`；编辑器 `blocks/ComponentBlockEditor.tsx:75`；自铸 960–997 十三条 `fixtures/songTimeline.ts:4`。折叠仅呈现态。
- 图表：`blocks/ComponentBlockProjection.tsx:29,51,71` 共用轴/SVG；编辑器 `blocks/ComponentBlockEditor.tsx:120,137,150`；三期两系列等价数据 `fixtures/songRevenueChart.ts:4`。系列色取 accent、ink-muted、accent 65% 混 ink、ink，折线以线型辅助，无 hex。
- 创建/hydration/保存：`hooks/useNoteCanvasDataAdapter.ts:1419,1795`；后端 `server/src/validators/index.ts:773`、`server/src/services/noteBlockLifecycle.ts:441`、`server/src/services/noteBlockContent.ts:37`。既有通用 hydration 不另改。
- 历史/入口：`hooks/useComponentBlockHistory.ts:16`、`hooks/useNoteCanvasRuntimeController.ts:509,641`、`layers/NoteWritingSurfaceLayer.tsx:1924`，进入现役 createdBlock/reversibleEdit。
- 分页/检索/静态面：`notePageFlowService.ts:22`、`measurementService.ts:102`、`noteNavigationSearch.ts:42`、`layers/NoteReadOnlyPageContent.tsx:72`、`layers/ExportPreviewLayer.tsx:39`；整块不裂、顶爆下移、超高独占，共用投影与现役 flow plan。
- read_note：`server/src/services/agentReadSurfaces.ts:93`、`server/src/services/componentBlocks.ts:10`；kind 照实为 component，既有 text 装扁平内容，schema 零新键。
- A3 封面分类：`server/src/services/noteCoverRules.ts:81` 只补新类型到现役呈现分类，保持组件不能放封面，未改授权/写门。

### 测试与说明书

- 客户端定向：service **22/22**；UI **25/25**；整合 **145/145**（含新增 25 项）。最终代码冻结后全库 **214 文件 / 2181 测试全部通过**，执行 `npm.cmd run test:unit -- --maxWorkers=2`，不排除文件、不调宽超时。最终 client build 通过。
- Server B2+B1 定向 **20/20**（B2 新增 11），build 通过。全量 `test:v2` 已整跑但 **exit 1**：首轮 786 tests / 779 pass / 7 fail，其中 5 个 Node IPC 文件故障被既有 wrapper 自动复跑全部恢复，剩 **2 项 Python 环境失败**：MineruWiring 的 python.exe ENOENT；SourceRegionCells 的既有外部 venv shim 无法启动（exit 101）。未改失败链路、未跳过测试，详情见后端报告与原始日志。
- 双端独立核验 **45/45** 参数接受/拒绝一致，**16/16** 有效扁平投影字节一致。
- `verify:v2-bn8-runtime` **非 git/secrets 的 23 组件分次验证通过**。初轮 21/23，最终全库与文档检查复跑补齐；初始失败/后续复跑均保留，索引为 `runtime-gates.json` / `runtime-gates-final.json`。这不是完整门通过声明。
- 实际浏览器检查生产组件：时间线展开/移序/取消，图表保存、负数过渡串与回显，未知占位、390px 窄屏、两皮 token；隔离 harness 未冒充登录后完整 Note E2E。阳性 HTML 由生产 renderer/CSS 生成，财政数据明示为教学等价示意。
- **说明书已更新**：`docs/agent-ops/current-state/app-operating-manual.md:43` 起，补内置三件入口、参数、API、read_note、打印边界及「内置件=闭集，自由组件候产房」。生成 `docs/agent-ops/INDEX.md` 后复跑 docs:check。

### 未做项与边界

仓库级 git/secrets 两组件留 HQ；后端子任务曾做局部只读 `git diff --check -- server shared/types/index.ts`（exit 0，`server-whitespace.log`），不代替整门收口。没有 git 写操作、commit、push、PR。Server 两项 Python 环境失败留可运行既有 Python 的环境收口；主观验收与放行仍归 HQ。未接产房/OpenDesign/自由组件、未添结构化 read_note 键或 Agent 动词；未动 Relation、Agent 注册表/写门、TextFlow 真相 schema、page_frame_local 九条、权限配置或依赖；未新增安全对抗用例。新增凭据形合成值仅 `synthetic`（9 字符）。

时间线 Overview/打印实例默认折叠，不继承阅读展开态；若 flow plan 已按展开高度测量，静态面可能留下预留空白。图表长 x 标签三行后省略，完整值仍在辅助描述与检索；宽图打印缩放，密集数据可读性须按目标纸型验收。未发现工单冲突；环境失败与上述呈现边界均已明示。
