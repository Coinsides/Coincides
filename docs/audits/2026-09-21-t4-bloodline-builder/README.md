# T4 血统检查：builder 回执

日期：2026-09-21。角色：Codex builder。判定：**STOP，普查完成，验收未完成**。上游为 `docs/agent-ops/handoffs/2026-09-21-v14-t4-bloodline-audit-order.md`。本档是审计证据，不是 HQ 设计豁免或放行。

## 普查结果与分母

枚举 `client/src/pages/Notes/canvasEngine/` 全树 467 文件，其中 158 个测试文件不计入实现普查；309 个非测试 TS/TSX/CSS 全部筛查，另加实际被纸面投影 import 的 `client/src/pages/Notes/NoteDetail.module.css`。扩展候选分母 **310 = processed 310 + remaining 0**，每个文件的射程与零命中见 [coverage.md](coverage.md)，SHA-256、全树枚举及结构化逐处记录见 [census.json](census.json)。这里的 310 不是纸面组件数量：也包含为排除遗漏而筛查的壳、hooks 和数据服务，已逐文件标明。

**195 处射程内字面取值：颜色 179、字体栈 16；🅰 0、🅱 191、🅲 4。** 11 文件命中、299 候选文件射程内零命中。额外 5 处排除命中单列，未混入三档数字。

| 层次 | 色 | 字族 | 合计 | 解释 |
| --- | --- | --- | --- | --- |
| 直接投影/CSS | 0 | 8 | 8 | 含 NoteDetail 的纸面选择器；不含其壳选择器 |
| 投影供值链 | 27 | 1 | 28 | 标注、纸笔、便签兼容回退与代码行测量字族 |
| 既有定义源头 | 152 | 7 | 159 | paperSkinDefaults / paperSkinStyles / 页框模板 / 文档排印选项 |
| 合计 | 179 | 16 | 195 | 定义与消费分层；不能把 195 读成 195 个违约 |

表按每个色值出现、每个完整字体栈出现计数；一行可能有多处。`font` 简写及 TS 的间接 `families` 映射也检查了。`inherit`、纯动态引用与已有 `var(--sk-*)` 字体角色不算硬编码字族。色值查 hex/rgb(a)/hsl(a)，包括 fallback 和颜色函数中的字面值。完整逐处表见 [census.md](census.md)。

## 三档判定与修复清单

**🅰 为空，源码/测试修改为 0。** 因此逐处替换前后值、视觉等价论证、被修元素定向断言和新增五皮肤断言的适用集合均为空，不以“全都已 token 化”替代这个有限结论。没有造新 token，也没有把不同字体角色强行视为视觉等价。

🅱 191 处是登记候裁，**不是 builder 给永久豁免**：

- 159 处属于已有颜色/字体工厂与派生源头。`paperSkinStyles.test.ts` 明确要求默认基线保持、用户覆盖有效；源头必须最终有实际值，不能用自身变量递归代替。
- 27 处是已有 token 引用的字面兼容回退。尤其 `annotationColorService.ts` 同时被全局 `components/ReferenceTag/ReferenceTag.tsx:4,40` 消费，而默认别名由 `NoteDetail.module.css:1` 导入；删回退并不能保证其它页面视觉等价。纸笔已首先取 `--sk-ink`；便签已取 `--canvas-sticky-note-*`。
- 5 处是用户排印覆盖及默认回退：`PageFrameSlotsLayer.tsx:13` 的三种字体映射服从显式 slot 样式，默认分支已取 `--sk-label-font`；`NoteDetail.module.css:1540,3648` 保留既有 `--document-font-family` 的默认 profile 字族。

🅲 4 处保留，待后续角色设计，**本单没有新建 token**：

| 文件:行 | 元素 | 为什么不能按 🅰 修 |
| --- | --- | --- |
| `client/src/pages/Notes/canvasEngine/blocks/ParagraphFurniture.module.css:9` | `.source` 引文出处（`font` 简写） | `paragraphFurniture.ts:11–13,45–47` 的固定出处测量使用默认文档字族；改为可变 document 字族或 workbench 的 mono label 会让测量与呈现失配。缺固定出处字体角色。 |
| `client/src/pages/Notes/NoteDetail.module.css:3790` | `.codeLineGutter` 行号 | 需代码等宽角色，现有 title/label 不等价。 |
| `client/src/pages/Notes/NoteDetail.module.css:3802` | `.codeTextArea` 代码输入 | 同上；不能用会随皮肤变为非等宽的角色替换。 |
| `client/src/pages/Notes/canvasEngine/typographyMeasurementService.ts:111` | `code_line` 排版测量/分页投影供值 | 与上述等宽栈配套；把 CSS var 塞进现有测量逻辑也不能证明等价。 |

对 `client/src` 的只读核查中，`--font-mono` 只有消费没有定义，不是可用现成 token。其 NoteDetail 三个消费点（4571、4900、5234）属 ContentGroupPanel 壳层，已排除。另排除 MediaImageEditor 的 body portal 遮罩，以及 visualConnectorSavePayload 的存储默认值。

## 回归、停线与未做项

从当前 `package.json` 的 `verify:v2-bn8-runtime` 定义拆出 **非 git/secrets 的 25 组件**串行执行，保持原顺序；没有改验证链。每步用隔离测试目录、内存 DB、空 dotenv 与不继承 provider 凭据的环境。原始日志位于 `.codex-tmp/t4-bloodline/gate-01-*` 至 `gate-25-*`，结构化结果见 [validation-summary.json](validation-summary.json)。

| 检查 | 结果 |
| --- | --- |
| client 全库 | **231 文件 / 2368 tests 全通过**，33.94s（已含在组件5） |
| 非 git/secrets 门 | **25 已尝试：24 PASS、1 FAIL** |
| client / server build | 均 PASS（组件22、23） |
| server 测试接线静态检查 | **111 文件 / 111 wired / 0 exempted / 0 unwired**；不是执行结果 |
| server 111 文件全量 | **未启动**；发现门失败后按停线要求不再启动后续测试 |
| 新增/被修元素定向与五皮肤断言 | 不适用：A=0、被修元素=0；没有新增测试 |
| git 检查 + secrets 门组件 | 按工单留 HQ，未执行 |

**冲突证据**：`.codex-tmp/t4-bloodline/gate-25-docs-check.log:5` 明确报告 `过期: docs/agent-ops/INDEX.md`，命令退出 1。失败发生时本单尚未修改 handoff、任何 agent-ops 文件或产品源码；只读 `git diff --name-only` 输出为空。新增审计证据在 `docs/audits/`，不在该索引脚本的 `docs/agent-ops` 递归输入中。未擅自运行生成命令改写索引。

`docs:check` 在索引检查首步失败，因此其后 inventory 与 glossary 子步未执行。server 全量仍欠 **111 文件零排除**，尤其 `scripts/v13WildernessExecute.test.ts`、`src/__tests__/v2SourceMineruWiring.test.ts`、`src/__tests__/v2SourceRegionCells.test.ts`，没有拿 T1/T2/T3 历史成绩冒充本次运行。已准备的运行器保留文件预算 `600000ms`，见 `.codex-tmp/t4-bloodline/run-server-all.mjs`；静态枚举计划见 [server-pending-plan.json](server-pending-plan.json)，**计划存在不等于已运行**。

继续条件：HQ 处理现有索引漂移并重新放行继续验证后，补 server 全量及未通过/未执行的门；本工单保持 ready，不翻 done。没有发现源码并行冲突；此次停线原因是验收门失败及修复面在纸面最小修射程之外。

## 证据复导与边界

CodeGraph 目录存在，但本环境没有可调用 CodeGraph MCP，CLI `codegraph` 不在 PATH；`rg` 也不可用。已先尝试 CodeGraph，再使用 PowerShell/Node 目录枚举与源码读取。独立只读交叉核查另扫字体简写/间接映射，确认了四处 C；由主线程定档，子线程未修改文件或跑测试。

从仓库根运行 `node docs/audits/2026-09-21-t4-bloodline-builder/census-recipe.mjs` 可对当前输入重导普查产物；原始字体词法候选、配方、门结果与日志 digest 均入档，避免把派生集合的唯一副本留在临时目录。字体定档是本次人工核查清单，不宣称这份一次性配方是未来的常驻 lint 门；复导时应核对输入 SHA。

本次只写审计产物、scratch 运行记录与工单 Result；没有改几何/间距/尺寸、TextFlow schema、坐标契约、工具/prompt、Relation/判定域、依赖或权限指令。没有 git 写操作；没有访问用户库、远程模型或真实凭据。既有全库功能测试按工单授权运行；未设计新安全对抗用例。没有主观视觉验收或截图对比，也没有把未执行的 server/OCR 称为通过。
