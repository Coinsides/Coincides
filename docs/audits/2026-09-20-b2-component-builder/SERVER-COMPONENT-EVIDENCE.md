> **状态**: builder evidence (2026-09-20)
> **工单**: `docs/agent-ops/handoffs/2026-09-20-v14-b2-timeline-chart-order.md`

# B2 后端与共享建模证据

## B1 同构链路

先考古 `15f36573` 的 B1 后端变更；只读原始摘要保留 `.codex-tmp/b2-component/b1-server-archaeology.log`。第四族沿同一 NoteBlock 路径扩入，没有新增存储表、迁移、路由或依赖：

| B1 接点 | B2 对应 |
|---|---|
| shared/server `NoteBlockSystemType` + `NOTE_BLOCK_TEMPLATES` | `component` 家族，三手工模板 `component.timeline` / `component.chart_bar` / `component.chart_line`，均为 `legacy_block_type:'component'`。共享与服务端定义在定向测试中深相等；默认 payload 可通过同一校验。 |
| `validators/index.ts` create refinement | `server/src/validators/index.ts:773` 使用组件 envelope 与参数校验。 |
| `noteBlockLifecycle` client-create / replay / discard | `server/src/services/noteBlockLifecycle.ts:441`，沿既有创建收据、hydration 与撤销清理。 |
| `noteBlockContent` stored-type update | `server/src/services/noteBlockContent.ts:37`，无 block_type 的更新仍按当前已存类型校验。 |
| 通用 `noteHydration` / `listNoteBlocks` | 原实现未变；四种 payload（含未知 kind）逐份 create/reopen/replay/discard 覆盖。 |
| B1 `read_note` text 分支 | `server/src/services/agentReadSurfaces.ts:93` 仅新增组件的 text 选择；工具 schema / registry 没有修改。 |

`shared/types/index.ts` 增加 `ComponentKind`、`TimelineComponentParams`、`ChartComponentParams`、`ComponentBlockContent` 与已知 payload 辅助联合型；模板 fallback 为 `component.timeline`，真实渲染类型始终由 payload 的 `component_kind` 指定。未知 kind 不借 fallback 推断参数。

## 参数校验声明

实现位置：`server/src/validators/componentBlock.ts`。

| 内容 | 规则 | 代码 |
|---|---|---|
| envelope | 仅 `{component_kind,params}`；kind 非空且非纯空白，最多 128 UTF-16 code units；params 必须 object | 38 |
| 手工闭集 | `timeline` / `chart_bar` / `chart_line`；无动态加载，无自由 HTML | 32 |
| timeline | `title?:string`；entries 1–64 条；每条必填 string year/label，可选 string detail；额外参数/条目字段拒绝；保留输入顺序、不猜年份 | 8 |
| 两种 chart | `title?:string`、`y_label?:string`；x_labels 1–32 个 string；series 1–4 条，每条 name 为 string、values 为有限 number[] 且长度必须等于 x_labels；额外字段拒绝 | 15 |
| 已知组件文字预算 | title/year/label/detail 或 title/y_label/x_labels/series.name 合计 ≤65536 UTF-16 code units；与 B1 总量口径一致；不截断 | 51 |
| 未知 kind | 合法 envelope 原样持久化；params 保持 opaque object；读面显示 kind 和「未注册组件」 | 44 / `services/componentBlocks.ts:32` |

数值允许负数、零、小数；不引入图表 DSL、日期解析或数值求值。

## read_note 扁平投影

`server/src/services/componentBlocks.ts:10`：

- `kind` 忠实为 `component`；输出 keys 仍为 `id / kind / placement_id / role / text`。通过现役 `read_note` strict schema 验证，零新键。
- timeline：非空 title 一行，entries 逐行输出 year / label / 可选 detail，以 TAB 分隔；显式空 detail 仍保留该槽。
- chart：非空 title 一行、非空 y_label 一行、x_labels 制表分隔一行、series 逐行 name + values。
- 内部 CRLF/TAB/CR/LF 替为空格。未知 kind 输出 `${kind}\n未注册组件`，不猜 params 内字段。
- 结构化读槽仍留 C 波；本单不加 Agent 写动词。

## 既有封面呈现分类

`server/src/services/noteCoverRules.ts:81` 仅在现有 `const component` 分类补入 `blockType === 'component'`，保持 A3 已有「组件不能放封面」。其函数已有注释将该分类与授权分离；本单不改写门、授权、`assertCoverPlacement` 或 page_frame_local 九条契约。功能回归位于测试第 135 行。

## 验证

- 新增 `server/src/__tests__/v14ComponentBlocks.test.ts`：11 项功能测试，覆盖三模板与闭集、两类参数边界、UTF-16 总量、未知占位、封面分类、client-create/replay/hydration/discard、编辑/退档恢复、strict read_note、空白扁平化与 HTTP create/update/reopen/delete。自铸宋史阳性 fixture 包含 13 条年表、三期两系列柱图；数据为功能样本。
- B2 + B1 定向：**20/20 PASS**。命令在 `server/` 执行：`node --import tsx --test src/__tests__/v14ComponentBlocks.test.ts src/__tests__/v14TableBlocks.test.ts`；原始日志 `.codex-tmp/b2-component/server-component-targeted-rerun.log`。
- 服务端构建：**PASS**，`npm.cmd run build`；日志 `.codex-tmp/b2-component/server-build.log`。既有 manifest 工具输出 recursive-reference warnings，最终明确 manifest 未过期、构建 exit 0；未改 manifest/registry。
- 全量 `npm.cmd run test:v2`：**FAIL，exit 1**，已按原清单整跑、无排除。首轮 **786 tests / 779 pass / 7 fail**；其中 5 项为 Node 22 test-runner `Unable to deserialize cloned data due to invalid or unsupported version` 文件级 IPC 故障，现役 wrapper 自动逐文件复跑 **5/5 PASS**（MaterialLibrary 59、NoteBlockLifecycle 25、Relations 8、SourceContainerIntake 14、SourceIdentityFloor 7）。剩余两项 Python 环境失败见下段。原始日志 `.codex-tmp/b2-component/server-v2-full.log`；不能据此声称 server 全绿。
- 首次定向从仓库根执行，因该目录无 tsx 而失败，随后从 server 执行通过；失败日志保留 `.codex-tmp/b2-component/server-component-targeted.log`。首次 `npm` 被 PowerShell 执行策略阻止，实际验证改用系统 `npm.cmd`，未改策略。

说明书由 root 统一申报与更新。原始测试整跑包含现有功能/安全回归，无排除、无新增安全对抗类用例；新增账户 fixture 的凭据形合成值只有 `synthetic`（9 字符）。未运行 git 写命令；git/secrets 总门留 HQ，不声称完整 runtime gate 通过。

### 全量环境欠账（B2 断言均通过）

1. `server-v2-full.log:43624` 起：`v2SourceMineruWiring.test.ts:60` 在 import 阶段调用 `python.exe` 失败，`spawnSync python.exe ENOENT`；不是测试断言失败，PATH 无可执行 Python。
2. `server-v2-full.log:44459` 起：`v2SourceRegionCells.test.ts:203` 的既有 MinerU 真样本测试失败。它使用硬编码 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`，shim 回指用户 `AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe`，退出 101：`Unable to create process`。
3. 只读检查 `.codex-tmp/b2-component/server-python-environment.log`：Python 不在 PATH；uv Python 父目录存在但当前托管环境列目录被拒绝（AccessDenied）；选择集的 venv shim 存在。没有请求升级、绕过 sandbox、安装依赖、替换解析器或跳过测试。留 HQ 在可运行既有 Python 的环境收口。
4. 只读 `git diff -- server/src/__tests__/v2SourceMineruWiring.test.ts server/src/__tests__/v2SourceRegionCells.test.ts server/src/services/sourceArtifact.ts server/src/services/sourceMineruParser.ts` 输出为空；原始空日志 `.codex-tmp/b2-component/server-python-baseline-diff.log`。这四个失败链路文件本单未改；该证据不被冒充为未改基线的全量通过。

### 客户端 / 服务端独立交叉核验

对 root 的 `client/src/pages/Notes/canvasEngine/componentBlockService.ts` 与服务端校验/纯文本投影直接执行 **45 组普通领域边界向量**，有效数据 16 组：校验接受/拒绝结果 **45/45 一致**，有效内容扁平投影 **16/16 字节相等**。包含 64/65 时间线边界、4/5 系列、32/33 点数、数值及长度不匹配、严格字段、空 detail、混合换行、最大 UTF-16 文本、unknown envelope、负数/零/极大有限值。未发现正常 JSON payload 路径的校验或投影差异；两端默认图表种子点数不同（共享模板 1 点、客户端新建草稿 2 点），两者均合法，不影响持久化协议。

脚本与原始输出分别为 `.codex-tmp/b2-component/check-component-parity.ts` / `.codex-tmp/b2-component/server-client-component-parity.log`。此项证明校验和文本投影一致，不替代 SVG 极值布局、浏览器交互、分页或打印检验。
