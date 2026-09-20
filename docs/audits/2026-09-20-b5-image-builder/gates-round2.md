> **状态 (Status)**: active（builder 验证证据；不代替 HQ 放行）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（事实以原始日志为准）

# B5 二轮：验证组件与纠偏记录

**非 git/secrets 的 23 组件均有最终 PASS 收据。完整 `verify:v2-bn8-runtime` 未运行、未申报通过；`git diff --check` 与 `check:changed-file-secrets` 两组件留 HQ。**

client 最终全库为 **219 文件、2248 测试全部通过**，实际命令为 `npm --prefix client run test:unit -- --maxWorkers=4`：只控制并发，维持默认 timeout，未筛文件、未排除或跳过测试。两次默认并发失败保留如下，不能把它们改写成通过。server 全量测试及浏览器体验证据由主 builder 的其他收据申报，不计入本文件组件统计。

## 执行口径与原始证据

工具实物：`C:\Program Files\nodejs\node.exe`，Node `v22.22.1`；npm 由同目录 `node_modules/npm/bin/npm-cli.js` 启动，子进程 PATH 补入该 Node 目录。未安装依赖、未更改 package/验证脚本、未调整执行策略。

原始目录统一为 `.codex-tmp/b5-image/`。`run-round2-gates.cjs` 从当前 package.json 拆分 25 个顶层组件、保留 23 个允许组件，逐组件运行、失败后继续，每项写 `.log` 与 `.json`；`aggregate-round2-gates.cjs` 机械合并全部尝试，汇总为 `round2-gates-aggregate.json`。**共 36 次组件执行 = 5 次早诊 + 正式首轮 23 次 + 后续 8 次复核；其中 31 次 PASS、5 次 FAIL。** 最终按组件取最新结果为 23/23 PASS。另有 1 次 shared 声明预编译，不冒充顶层门组件。

以下短编号指向原始目录中的子目录：

| 编号 | 目录 | 执行与结果 |
|---|---|---|
| P | `gates-round2-2026-09-20T07-20-36-629Z` | 5 项静态早诊，5 PASS |
| A | `gates-round2-2026-09-20T07-22-57-574Z` | 正式 23 组件，19 PASS、4 FAIL |
| B | `gates-round2-2026-09-20T07-26-55-379Z` | client 全库 / model smoke / client build，2 PASS、1 FAIL |
| C | `gates-round2-2026-09-20T07-28-57-808Z` | server build，1 PASS |
| D | `gates-round2-2026-09-20T07-30-16-775Z` | docs:check，1 PASS |
| E | `gates-round2-2026-09-20T07-32-41-165Z` | client 全库（maxWorkers=4）及最终 client build，2 PASS |
| F | `gates-round2-2026-09-20T07-40-11-542Z` | 工单二轮回执及最终索引生成后的 docs:check，1 PASS |

每目录 `summary.json` 含命令、开始/结束 UTC、exit code、耗时、逐件日志路径；不得只取 stdout 的最后一行遮盖前面的失败。

## 23 组件最终状态

除 client 全库明确列出的并发参数外，均运行 package.json 原组件命令。

| 序号 | 组件 | 最终证据 / 状态 |
|---:|---|---|
| 1 | `check:test-wiring` | A / PASS |
| 2 | `test:agent-knowledge` | A / PASS |
| 3 | `check:agent-knowledge` | A / PASS |
| 4 | `check:tech-debt-table` | A / PASS |
| 5 | `test:unit` | E / PASS，219 文件、2248 测试 |
| 6 | `test:tool-face-registry` | A / PASS |
| 7 | `test:tool-face-manifest` | A / PASS |
| 8 | `check:tool-face-manifest` | A / PASS |
| 9 | `test:tool-face-parity` | A / PASS |
| 10 | `check:tool-face-parity` | A / PASS |
| 11 | `check:server-shared-runtime-import` | A / PASS |
| 12 | `check:canvas-runtime-boundary` | A / PASS |
| 13 | `check:group-gallery-shell` | A / PASS |
| 14 | `check:groups-rail-shell` | A / PASS |
| 15 | `check:single-editor-shell` | A / PASS |
| 16 | `check:source-experience` | A / PASS |
| 17 | `check:v2-bn11-legacy-shutdown` | A / PASS |
| 18 | `check:v2-bn11-relation-freshness` | A / PASS |
| 19 | `smoke:canvas-engine-model-contract` | B / PASS |
| 20 | `build:client` | E / PASS |
| 21 | `build` | C / PASS |
| 22 | `smoke:canvas-engine-performance` | A / PASS |
| 23 | `docs:check` | F / PASS |

## 首次失败与闭合证据

1. **client 全库**：A = 216 文件中 7 失败 / 209 通过，2225 测试中 11 失败 / 2214 通过；失败为 9 项 5000ms timeout 与 BoardPage.bookmarks 两项未找到 `Go to Chapter two`。B = 218 文件中 6 失败 / 212 通过，2245 测试中 10 失败 / 2235 通过；失败为 8 项 timeout 与相同两项 bookmarks 等待失败。E 在新增编辑器/消费测试落定后，以 maxWorkers=4 完整执行 219 文件、2248 测试全过。未改这些既有失败测试或无关业务源码。这里证实受控并发的全量配置通过，不把默认并发两次失败未经隔离证明归因为某个唯一根因。
2. **model contract smoke**：A 报 `Cannot find module '@shared/types'`，require 链从新增 `mediaBlockService` 运行时校验 import 进入。施工者将该运行时 import 改为相对路径；B 的原组件命令重跑 PASS，未修改 smoke 或路径配置。
3. **server build**：A 报 TS6305，新 `shared/types/mediaImageEdit.ts` 尚无现役 composite project 对应声明。执行现有编译器 `node server/node_modules/typescript/bin/tsc -b shared`，exit 0，记录在 `shared-declarations-round2.log/.json`；随后 C 原 `build` 组件 PASS。未改 package、TS 配置或依赖。
4. **docs:check**：A 报 `docs/agent-ops/INDEX.md` 过期。主 builder 通过现役索引生成器更新必要索引后，D 原组件 PASS；未跳过文档门。

## 独立只读复核

原始 `round2-independent-review.txt` 记录了检查范围与限度；本子任务没有改业务源码。

- 发现 SVG `viewBox` 不会自动裁掉 meet 留白区里的框外图像，已由施工者在 `MediaBlockProjection.tsx:48–49` 加上显式 crop clipPath。
- 发现 Cropper `objectFit="cover"` 在 quarter-turn 场景先按未旋转比例定基础尺寸，导致 full-image seed 被 minZoom=1 裁断。安装库数值证据在 `quarter-turn-inspection.json`；改为 `contain` 后同样例初值回到完整图 zoom=1。主 builder 另持有真实浏览器证据，本文件不把数值检查冒充浏览器验收。
- 复核 `useMediaImageHistory.ts:28–56` 使用现役 Note 串行历史队列与 reversibleEdit，保留 absent/null 的撤销差异；metadata 保存保留兄弟键、走现役块 PUT。未发现新增独立持久化栈或 image-extension 桥接。
- `round2-consumption-source.txt` 与 SHA256 记录：Overview 与导航缩略复用 NotePageThumbnail → NoteReadOnlyPageContent → BlockEditorLayer → MediaBlockProjection；打印仍传 `mediaPlaceholder={print}`，导出预览仍直接用 MediaBlockPlaceholder。符合补遗一，占位面未扩成图像渲染。
- 主 builder 发现并交由施工者修复浮层键盘穿透：编辑器本地拦截 undo/redo、隔离 portal 冒泡；E 的全库执行已包含对应普通交互及同源消费测试。

本文件不承担 HQ 主观验收或放行；未执行 git 写操作、commit、两项 HQ 门或新设计安全对抗用例。
