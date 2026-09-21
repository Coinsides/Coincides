> **状态 (Status)**: active（第二轮施工与验证收据；非 HQ 放行）
> **日期**: 2026-09-21
> **工单**: `docs/agent-ops/handoffs/2026-09-21-v14-t5-print-rich-blocks-order.md` 含补遗一
> **角色**: Codex builder

# T5 第二轮施工回执

本轮按补遗一继续施工，没有因 Python 环境红停线。第一轮 `README.md` 与 `server-verification.md` 保留为当时的停线记录；本轮结论以本文和 [server-round2.md](server-round2.md) 为准。

## 三族结果与同源边界

- **媒体**：打印与导出预览均消费纸面同一 `MediaBlockProjection`、同一 metadata / `edit_v1` / `mediaImageGeometry`。共享资产订阅复用一次仓储读取；取得 Blob URL 后用同 URL 的 `Image.decode()` 准备图像，再发布 loaded。隐藏准备层覆盖将打印的未显示页，不另行取数；`beforeprint` 同步建立真实 body portal，沿现役流程冻结输入。测试覆盖裁剪、缩放、旋转、409/缺元数据/解码失败，以及 StrictMode、最后订阅者回收、decode 中卸载、旧 note 晚回和打印中替换资产。
- **表格**：开工时打印与预览已经使用 `TableBlockProjection`，本轮确认真实 caption / headers / rows 完整进入输出。保留 T3 的 `fit-content`、居中、正文比例字号和现役 print clip；没有再写一套渲染。
- **组件**：开工时打印与预览已经使用 `ComponentBlockProjection`。验证 timeline 的 13 条时间线、bar 的 6 根柱、line 的 2 条线/6 个点及未知 kind 的同源占位。timeline 静态投影初始折叠，未强制展开详情。
- **分页**：三种封面组合（无封面、有封面不导出、有封面导出）使用真实 flow plan 跨多页；逐块核对纸面/print clip 与 article 矩形、预览的同一 flowFragment，并在卸载 portal 后比较 blocks / plan / fragments / preview 完整快照。没有修改分页算法、切片、坐标契约或 TextFlow schema。

预览界面有 PageFrame、Included in export、AI visible 等多个合法分组，同一块会出现多份。校准后的测试逐组按 model rows 验证每种富块 0/1 份，并回核整个 overlay 总数；图表内部柱/点数量在所属 PageFrame 的单份组件内断言，不再用全局数量乘 3 掩盖意外重复。

## 逐件行号（相对仓根）

| 文件 | 本轮最终位置与作用 |
| --- | --- |
| `client/src/pages/Notes/canvasEngine/hooks/useMediaImageAsset.ts` | 11 共享订阅；24 同 URL 解码准备；45 微任务末订阅释放；53 同步 snapshot 与共享失败态 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.tsx` | 14 接共享读取，保留原始 img / 编辑 SVG 与错误态 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx` | 28 隐藏同源媒体准备；144 同步冻结 job；174 预载与 portal 共同保有资产 |
| `client/src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent.tsx` | 70 附近取消媒体占位开关，原 table/component/toc print 变体保留 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.tsx` | 38 三族同源组件；46 媒体在原宽高矩形内投影 |
| `client/src/pages/Notes/canvasEngine/layers/RichBlocksPrint.test.tsx` | 128/135 分组定位和重复计数；179 三封面情形；218 同矩形；239 edit_v1；295 真相快照零变；299 预热；320 降级 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaImageConsumption.test.tsx` | 66 纸面/Overview/缩略同源；93 真 print；109/133 解码就绪/失败；149/165 引用交接/晚解码；179/198 换 note/冻结 job |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.test.tsx` | 24/39/52 回收断言等待微任务边界，仍断言回收次数和旧 URL 不暴露 |
| `client/src/pages/Notes/canvasEngine/layers/NoteNavigationPages.requests.test.tsx` | 99 teardown；118 滚出缩略图后的末订阅回收；125 卸载回收；现役 HTTP 次数断言不变 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx` | 272 真图同步打印、原矩形、单次资产读取 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.media.test.tsx` | 13 真实媒体、原宽高、跨分组单次资产读取 |

## 可观察边界与未做项

1. `beforeprint` 不能等待仍未完成的网络读取/解码。过早打印保留明确 Loading 状态；准备完成后重开打印会同步消费真图。缺资产与解码失败显示现役失败提示，不声称所有时点都能立即出图。没有 decode API 的宿主保留兼容路径。
2. 图表 print 按块宽缩放，纸面固定图宽且横滚；timeline 的纸面展开态不带入新静态实例。两者可能与现役 flow plan 预留高度产生留白或高度差异，本单没有借此调整分页。宽表仍按既有 print clip 裁切；超高整块沿用既有溢出语义。
3. 本轮验证为真实 React 投影、真实 print portal 的 jsdom 自动断言及构建/契约门，没有实际系统打印对话框、PDF 栅格或主观视觉验收。浏览器位图解码的调度/实物成品仍可由 HQ 后续抽检。
4. server 两项 Python 环境失败不能豁免，待 HQ 机完整复验；git 检查与 secrets 两组件按工单留 HQ。没有 push/PR/merge 或 git 写操作。
5. 操作说明书由 current-state 守门同步：`app-operating-manual.md:43` 的「打印与导出预览仍是媒体占位」已与本轮产品现物不符，建议改为「打印与导出预览共用媒体投影和 edit_v1；打印前提前加载并解码，尚未就绪显示 Loading，失败显示原提示；不改分页」。本文明确交出该差异，不擅改 agent 操作说明/权限文件；本轮没有新增使用入口或 API。

## 出生公约与基建分账

- 没有新增 CSS、字面 hex、硬编码字体、色板、`--sk-` token 或灰度策略；复用三族现役投影和 token。
- 没有新增依赖、表列、schema、工具、prompt、Relation/判定域代码或安全对抗用例，没有新增合成凭据。没有用户库或真实远程模型调用。
- 产品改动与测试基建分账：私有 `round2-server-runner.mjs` 显式传 `npm_execpath` 并把临时数据/空 dotenv 放到系统 Temp；未改 server 产品码或共享启动器。`round2-gates.mjs` 从现役门列出 25 组件，显式排除工单留 HQ 的两组件，逐项保存退出码并继续收集，不把失败隐藏。
- 不触碰开工已存在的 `.claude/settings.local.json` 与其他无关未跟踪文档。CodeGraph CLI/MCP 不可用、`rg` 不在 PATH 后，使用限定路径的 PowerShell 读源码。

## 最终验证收口

| 验证 | 结果 |
| --- | --- |
| 定向断言 | **7 文件、49 个不同用例全部通过**：MediaBlockProjection 8、MediaImageConsumption 8、NotePrintLayer 20、ExportPreviewLayer.media 1、TocPrint 4、RichBlocksPrint 6、NoteNavigationPages.requests 2。 |
| client 全库首跑 | **232 文件，2366 pass / 14 fail**，52.68s。13 项是高并发下的 10 个 5000ms 超时和 3 个元素等待失败；另 1 项是导航缩略图仍同步断言末订阅 URL 已回收。本轮新行为在提交后的微任务释放，已把该测试等待点校准，保留次数/HTTP/重挂载断言。 |
| client 全库最终复跑 | **232 文件、2380/2380 pass**，146.99s；命令 `cd client; npm.cmd run test:unit -- --maxWorkers=2`。零排除、零自动重试，未放宽默认 5000ms 单测试超时；未修改那 13 个 UI 测试或产品代码，它们在该完整复跑中全部通过。 |
| 非 git/secrets 25 组件 | 首遍 **23/25 pass**（client 全库、docs:check 失败）；补跑 client 全库与生成索引后的 docs:check 均通过。**最终 25 组件均有通过证据，非单次首跑全绿**。未执行完整 27 组件命令或留 HQ 的两组件。 |
| server 全量 | **111 文件、1118 tests，1116 pass / 2 fail / 0 skipped / 0 cancelled / 0 flaky retries**，600000ms/文件、零排除，214636.1826ms。失败为 `python.exe ENOENT` 和 pinned MinerU Python **101**；不是 server 全绿。详细账见 [server-round2.md](server-round2.md)。 |

首遍 gate 命令 `node .codex-tmp/t5-print/round2-gates.mjs` 从 `verify:v2-bn8-runtime` 逐项抽出以下 25 个组件；每项原始日志为 `.codex-tmp/t5-print/round2-gate-NN-<脚本名中冒号换连字符>.log`，退出码及开始/耗时见 `round2-gate-results.json`。

| # | 组件 | 结论 |
| --- | --- | --- |
| 01 | check:test-wiring | PASS |
| 02 | test:agent-knowledge（含原 pre hook） | PASS |
| 03 | check:agent-knowledge | PASS |
| 04 | check:tech-debt-table | PASS |
| 05 | test:unit | 首跑 FAIL；全库限并发复跑 PASS，见上表 |
| 06 | test:tool-face-registry | PASS |
| 07 | test:tool-face-manifest | PASS |
| 08 | check:tool-face-manifest | PASS |
| 09 | test:tool-face-parity | PASS |
| 10 | check:tool-face-parity | PASS |
| 11 | check:server-shared-runtime-import | PASS |
| 12 | check:owned-helper-contract | PASS |
| 13 | test:owned-helper-contract | PASS |
| 14 | check:canvas-runtime-boundary | PASS |
| 15 | check:group-gallery-shell | PASS |
| 16 | check:groups-rail-shell | PASS |
| 17 | check:single-editor-shell | PASS |
| 18 | check:source-experience | PASS |
| 19 | check:v2-bn11-legacy-shutdown | PASS |
| 20 | check:v2-bn11-relation-freshness | PASS |
| 21 | smoke:canvas-engine-model-contract | PASS |
| 22 | build:client | PASS；仅现役大 bundle 提示 |
| 23 | build（server） | PASS |
| 24 | smoke:canvas-engine-performance | PASS，五场景合计 13.72ms |
| 25 | docs:check | 首跑 INDEX 过期；自动生成后 PASS |

索引首跑差异是既存 T4 状态过期及缺 T5/T6/T7 三条工单。通过现役 `node scripts/docs-index.mjs` 仅更新 `docs/agent-ops/INDEX.md`：423→426 条并同步工单状态（包括本轮 T5 done）。没有修改规则、权限或 agent 指令正文；生成后 `npm.cmd run docs:check` 的索引、对象清单、词典三段均通过。

定向日志：`round2-directed-media.log`（5 文件 41 用例）、`round2-rich-calibrated.log`（1 文件 6 用例）、`round2-client-failure-diagnostic.log`（导航 2 用例和额外 4 个既有 bookmark 用例通过）。完整 client 复跑为 `round2-client-full-bounded.log`，首跑记录保存在 `round2-gate-05-test-unit.log`；文档补跑为 `round2-docs-index-regenerate.log` 与 `round2-docs-check-final.log`。均位于 `.codex-tmp/t5-print/`。

施工与本会话可执行验证已完成，未发现须依工单停线的新冲突。环境红与上述边界已明示，HQ 仍持复核/放行权。
