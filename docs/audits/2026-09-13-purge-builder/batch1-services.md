> **状态 (Status)**: implementation-complete / 定向验证由 verification 汇总
> **日期**: 2026-09-12（机器本地日期；目录沿用工单日期）
> **范围**: 单1 补遗一，批一服务子集：图纸一·9 / 一·11 / 一·19 / 一·20

# 批一服务施工收据

一·9：`useCanvasContentWidth` 移除 Canvas 扣 `pageOffsetX` 宽度臂，保留 Page 原 `width`、最小宽度和 ResizeObserver/window resize 链。两个无用入参及 effect 依赖已删。生产调用点 `useRuntimeLayoutModelController` 由主 builder 同步；本子任务同步阅读测试夹具调用。

一·11：`useBlockPlacementInteractions` 的 drag bounds 收敛为原 Page `contentWidth`，删无用 `CANVAS_WORKSPACE_WIDTH` import。两条 `canvas_world` 历史读判据及 Page 交互主体原样保留；没有改此文件的测试。

一·19：现场函数粒度与图纸有偏差：`hasMeaningfulWritingSurfaceContent` 在 Canvas guard 前已有可返回 true 的 Page 可见块/active annotation 判断，因此**不整删该函数**。按补遗通例“活语义零动”保留这两段和 `hasLegitimatePendingWritingEditor` 全文，仅 guard 及之后 Canvas image/table/shape 后半枝改为 `return false`。保留输入类型，使活 Page 夹具及原调用契约不变；删无用 destructure 和 `textFromContent` import。此偏差已报主 builder，并由其独立读现物后确认最小拆分；未新增业务判断。

一·20：`resolveEffectiveDocumentTypographyProfile` 仅删 Canvas 原 typography 对象旁路及无用 destructure。原显式 override 和 Page 首帧物理字号路径不变；输入类型保留。Page 测试的原断言逐字保留。

## 明确 Canvas 死语义测试退役清单

| 文件 | 原用例名称 | 处理 |
|---|---|---|
| `hooks/usePageReadingPresentation.test.tsx` | `leaves canvas viewport, transform and all block geometry unchanged when page gear state changes` | 整用例退役，原专测 Canvas viewport/transform 在 Page gear 修改时不动；其余 4 个 Page 用例断言未改 |
| `meaningfulRenderableContent.test.ts` | `counts placed Canvas image, table, and mounted shape text outside visible NoteBlocks` | 整用例退役；其 Canvas image/table/shape 可见性断言全属被删后半枝 |
| `meaningfulRenderableContent.test.ts` | `keeps the Page entry visible for a live-shaped inside table that only Canvas renders` | 仅删最后 `surfaceMode: 'canvas'` 的 true 断言；Page entry false / empty prompt true 活断言逐字保留 |
| `meaningfulRenderableContent.test.ts` | `counts visible block content on both Page and Canvas surfaces` | 仅删 Canvas 输入对应的 true 断言；保留 Page 断言，用例名收敛为 `counts visible block content on the Page surface` |
| `pageFrameTypographyService.test.ts` | `preserves active user overrides even when they reuse the legacy default profile ID` | 参数循环仅删 `'canvas'` 值；Page 的 A4/Letter override 断言原文保留 |
| `pageFrameTypographyService.test.ts` | `uses the first frame only as the page default and leaves canvas hydration unchanged` | 仅删 Canvas hydration 身份断言；保留 Page 首帧断言和 hydrated baseline 数值断言，用例名收敛为 `uses the first frame only as the page default` |

合计：2 个完整死用例退役、4 组混合用例的 Canvas 断言退役。`meaningfulRenderableContent` 空夹具默认模式同步为 Page；该文件所有活测试均原本显式指定 Page，原 Page 测试的有效输入未变。

## 验证及计数

- 已运行 `node ./client/node_modules/typescript/bin/tsc -p client/tsconfig.json --noEmit`：exit 0，7.65 秒。无应用启动、无环境文件加载。
- 初次尝试根 `node_modules/typescript/bin/tsc` 因依赖不在根目录而 exit 1；改用现装的 client TypeScript 后通过。未安装依赖。
- 受影响定向（typography、block placement、meaningful content、Page reading）由 verification 统一运行；本收据不先称通过。
- 此子任务未运行/修改安全类测试、Git、secrets 扫描、用户库、静态门或浏览器。全批门和最终冒烟由主 builder/verification 汇总。

原文均在首次编辑前备份到 `.tmp/purge-baseline/<同相对路径>`，已有备份不覆盖。以下是原文→现文按文本行 LCS 计算的 numstat，非 Git 整仓差异；不含主 builder 改的调用点及本证据文件：

| 文件（均在 `client/src/pages/Notes/canvasEngine/`） | + | - |
|---|---:|---:|
| `hooks/useCanvasContentWidth.ts` | 2 | 7 |
| `hooks/useBlockPlacementInteractions.ts` | 1 | 2 |
| `writingEntryVisibility.ts` | 1 | 40 |
| `meaningfulRenderableContent.test.ts` | 2 | 54 |
| `pageFrameTypographyService.ts` | 1 | 2 |
| `pageFrameTypographyService.test.ts` | 2 | 5 |
| `hooks/usePageReadingPresentation.test.tsx` | 1 | 14 |
| **合计** | **10** | **124** |

源码净删除 114 行。活 Page typography、双缩放、历史坐标读判据未更改。尚未翻工单状态；本子任务不写工单 Result。
