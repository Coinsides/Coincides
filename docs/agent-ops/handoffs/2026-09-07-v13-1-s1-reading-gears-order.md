> **From**: fable
> **To**: codex
> **Status**: done(两层制;13.1 单 1 施工完成,工作树交 HQ 验收)
> **日期 (Date)**: 2026-09-07
> **性质**: 施工单(client 引擎,大单;允许多轮内部推进,公共接线一人顺序整合)

# 13.1 · 单 1 · page 阅读档位通道(三档+步进)

## 〇 · 上游(先读,顺序)

1. 段 plan 含冻结裁定:`plans/v13-1-paper-viewport-plan.md`(裁定 1/2/5/6 是本单法源);
2. K-0 报告 `analysis/2026-09-07-v13-1-k0-recon.md` §一/§四/§五 与拆单表「单 1」三行(状态与纯派生/runtime 与显示/坐标边界)——其证据行号即本单改动面地图;
3. 单 2 已交付现物:`pageFramePrintScaleService.ts`(physicalScale)、`useNoteCanvasRuntimeController.ts`(有效 profile 派生)。

## 一 · 口径(冻结)

1. **page 专用视图状态**(⛔ 复用 canvas 数值 zoom 语义):`{ gear: 'fit_width' | 'fit_page' | 'physical', stepFactor: number }`;默认 `fit_width`、stepFactor=1;stepFactor 档位 0.5–2.0、0.1 级;**note 作用域**(noteId 显式入 key,防同模式导航残留——K-0 §五)、组件内存态;⛔ server 持久化、⛔ 接旧 LearningCanvas 表;
2. **显示比例现算**(纯函数,viewportService 同层或独立 helper):
   - `fit_width` = 外层可用宽 ÷ 纸内盒显示宽;`fit_page` = min(可用宽÷纸宽, 可用高÷纸高);`physical` = physicalScale(**全精度直用,⛔ 舍入**——补遗一"常量精确"条);
   - 最终显示比例 = 档位比例 × stepFactor;⛔ 动 canvas 公共 clamp(0.45–2.4)与 slider 值;
   - **长页退化(自单 3 移入)**:纸高/纸宽 > 3 的页,`fit_page` 退化为 `fit_width` 行为+滚动回顶;
3. **外层缩放呈现**:固定内层布局盒——blockList 的 clientWidth 链(→useCanvasContentWidth→布局/估高)必须量到**未缩放宽度**,fit 比例⛔ 反灌正文布局(K-0 施工边界 1);外层 wrapper 做 transform scale+滚动占位(scale 后的视觉高度参与页面滚动范围);page 派生 runtime viewport(`pageFrameService.ts:123-138` 强制 zoom=1 处)与实际呈现一致化;程序性 focus(presentation/natural-writing 链)在 page 下语义=滚动到目标,⛔ 改档位;
4. **输入坐标闭合**(page 显示比例落进所有 page 输入路径,K-0 施工边界 2):拖动/resize delta(`useBlockPlacementInteractions` page 现固定 1 处)、双击(`useCanvasSurfacePointerController`)、空白 drop(`NoteWritingSurfaceLayer:3228-3234`)、块控制条锚点(:2490-2497);**文本右键命中与 caret 浮层**(`TextBlockProjection.tsx:379-443`、`overlayService.ts:196-247`,K-0 §二风险 2/3)在 page 缩放下的坐标投影一并闭合;⛔ 向纯测量函数签名加 zoom/scale 参数;
5. **UI**:page 模式档位控件(三档切换+步进±+百分比只读显示),摆位与现 canvas 控件同区不同显隐;canvas 控件/手势/行为零变化;page 保持 app 主滚动容器语义(`modePolicyService` 边界);
6. **零变化面**:canvas 全行为、存量 frame/block 几何、测量族签名、单 2 的 profile 机制、导出/Preview(单 3 财产)。

## 二 · 验证(段纪律:⛔ 马拉松)

1. client typecheck/build(申报命令与输出摘要);
2. 单测:比例派生纯函数(三档×步进×长页退化)+ **K-档位断言**(切档不改任意块 page_frame_local 几何、不改内层布局宽)+ 输入坐标往返(屏幕点→世界点在 scale≠1 下闭合);
3. 一条功能冒烟:同一笔记 fit_width→physical→fit_page 切换,外层 transform 变化而 blockList clientWidth 与全部块几何零变化;canvas 模式对照零变化。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 动单 3 财产(打印/导出)。现物冲突⇒停线举证,⛔ 自行改判。

## Result

2026-09-07 · Codex builder · **按 §一施工完成，工作树交 HQ；未 commit，验收与放行归 HQ。** 已按 §〇 顺序完整读取段 plan（含冻结裁定）、K-0 指定节与单 2 现物，并补核单 2 补遗一的“常量精确，落地量化”。未遇需要改判的现物冲突。

### 实现与边界

- 新增 page 专用、noteId 显式作用域的内存状态：默认 `fit_width / 1`，三档切换保留步进，0.5–2.0、0.1 级；同模式换 note 即回默认，不接 server/旧 LearningCanvas。
- 纯函数派生三档比例；physical 直接使用 print profile service 的全精度映射。长页高宽比 >3 时 fit_page 按 fit_width 显示并回顶；不经过 canvas clamp。
- page 固定纸盒和未缩放内容宽，外层 transform 与缩放占位分开。占位包含现有越界块的可视边界，clip margin 保留现有局部 badge/handle 外伸；fit 不回写正文布局。page 在 app 可用区内居中，整页档扣除上方 note chrome 与控件区，滚动本身不改变 fit 比例。
- page runtime viewport 由实际 blockList/app DOM 原点、可视尺寸和显示比例发布；同尺寸 chrome 位移、滚动和缩放均同步。新页/续页程序 focus 延后一帧读已提交 DOM，仅滚动 app 容器；note/mode 变化取消未执行的 focus，不改变档位。
- 拖动/resize、双击、空白 drop、块控制条、文本右键命中与 caret 浮层均闭合 page 缩放坐标。纯测量族签名、scrollHeight 读回与 profile 机制未改。
- 新控件为三档、步进 ±、只读百分比。canvas 保留原控制器、clamp、slider、快捷键和手势；导出/Preview 实现、frame/block 存量几何及单 2 物理/profile 定义点未修改。

### numstat

`N/` = `client/src/pages/Notes/`，`E/` = `client/src/pages/Notes/canvasEngine/`。下表为本单产品、测试和浏览器 fixture，合计 **28 文件，1665 additions / 39 deletions**，不含本回执及开工已有的其他改动。已跟踪文件使用仓库默认行尾规范的 `git diff --numstat -- client`；新文件用 `git diff --no-index --numstat -- NUL <path>`，未操作 index。

| 文件 | additions | deletions |
|---|---:|---:|
| N/NoteDetail.module.css | 55 | 1 |
| E/blocks/TextBlockProjection.tsx | 4 | 2 |
| E/hooks/useBlockPlacementInteractions.test.tsx | 49 | 1 |
| E/hooks/useBlockPlacementInteractions.ts | 2 | 2 |
| E/hooks/useCanvasSurfacePointerController.ts | 1 | 1 |
| E/hooks/useNoteCanvasLayerProps.ts | 4 | 0 |
| E/hooks/useNoteCanvasLayoutModel.ts | 4 | 0 |
| E/hooks/useNoteCanvasRuntimeController.ts | 11 | 1 |
| E/hooks/useRuntimeFrameModelController.ts | 3 | 0 |
| E/hooks/useRuntimeSurfaceStateController.ts | 32 | 2 |
| E/layers/NoteWritingSurfaceLayer.tsx | 83 | 26 |
| E/overlayService.ts | 11 | 3 |
| E/pageFrameService.ts | 4 | 0 |
| client/scripts/pageReadingSmoke/fixture.tsx | 187 | 0 |
| client/scripts/pageReadingSmoke/index.html | 12 | 0 |
| client/scripts/pageReadingSmoke/mockApi.ts | 111 | 0 |
| client/scripts/pageReadingSmoke/start.mjs | 45 | 0 |
| E/hooks/useCanvasSurfacePointerController.test.tsx | 41 | 0 |
| E/hooks/usePageReadingPresentation.test.tsx | 253 | 0 |
| E/hooks/usePageReadingPresentation.ts | 88 | 0 |
| E/hooks/usePageReadingViewportController.test.tsx | 49 | 0 |
| E/hooks/usePageReadingViewportController.ts | 64 | 0 |
| E/hooks/useRuntimeSurfaceStateController.pageReading.test.tsx | 133 | 0 |
| E/pageReadingDomService.test.ts | 53 | 0 |
| E/pageReadingDomService.ts | 31 | 0 |
| E/pageReadingViewportService.test.ts | 123 | 0 |
| E/pageReadingViewportService.ts | 79 | 0 |
| E/pageTextCoordinates.test.tsx | 133 | 0 |

### 验证命令与输出摘要

1. repo 根：`client/node_modules/.bin/tsc.cmd -b client/tsconfig.json --pretty false`，**退出 0**。整合中修复了 page 状态解构接错位置及新增测试的 DOM scrollTo 重载类型，最终复核通过。
2. client 目录：`node --input-type=module -e "import {build} from 'vite'; await build({envFile:false,logLevel:'warn'}); console.log('Client production build PASS');"`，**退出 0，Client production build PASS**。保留 taskStore 动态/静态混用及 >500kB chunk 两项非阻塞警告。
3. client 目录定向 Vitest，**11 文件、130 tests 全 PASS**。命令使用现有 Vitest runner，显式关闭 Vite 环境文件加载：

```powershell
$taskTests = @(
  'src/pages/Notes/canvasEngine/pageReadingViewportService.test.ts',
  'src/pages/Notes/canvasEngine/hooks/usePageReadingViewportController.test.tsx',
  'src/pages/Notes/canvasEngine/pageTextCoordinates.test.tsx',
  'src/pages/Notes/canvasEngine/pageReadingDomService.test.ts',
  'src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.test.tsx',
  'src/pages/Notes/canvasEngine/hooks/useCanvasSurfacePointerController.test.tsx',
  'src/pages/Notes/canvasEngine/pageFrameTypographyService.test.ts',
  'src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.affiliationVisibility.test.tsx',
  'src/pages/Notes/canvasEngine/hooks/usePageReadingPresentation.test.tsx',
  'src/pages/Notes/canvasEngine/hooks/useRuntimeSurfaceStateController.pageReading.test.tsx',
  'src/pages/Notes/canvasEngine/writingSurfaceClassName.test.ts'
)
node --input-type=module -e "import {startVitest} from 'vitest/node'; const ctx=await startVitest('test',process.argv.slice(1),{run:true},{envFile:false}); await ctx.close();" $taskTests
```

覆盖：三档 × 全部 16 步进、长页阈值、physical 精确断言、note A→B→A 重置；真实 hooks 的 K-档位链（两个冻结 page_frame_local 块、clientWidth→resolved layout→runtime）；0.5/1.5 坐标往返与拖动/resize/双击；文本命中/caret 的 0.5/1.5/physical；chrome 位移和滚动后原点同步、fit 比例稳定；focus 等新 DOM、取消过期请求及 canvas 同步对照。单 2 profile 与原 affiliation/类名契约作为定向回归保留。

4. `git diff --check -- client docs/agent-ops/handoffs/2026-09-07-v13-1-s1-reading-gears-order.md` 通过；Git 仅提示工作树 LF 在后续 Git 操作中会转为 CRLF。

### 一条功能冒烟

可复跑入口：repo 根执行 `node client/scripts/pageReadingSmoke/start.mjs`，打开 `http://127.0.0.1:5181/scripts/pageReadingSmoke/index.html`。启动配置为 `configFile:false / envFile:false`，只监听本地；使用生产 runtime controller、NoteChromeLayer 与 NoteRuntimeDocumentLayer，API 模块替换为静态内存 fixture，不连接真实后端或账号。

在 Chrome 通过真实控件执行：初始 fit_width → canvas 基线 → page fit_width → physical → fit_page → canvas 对照。页面旁路读取真实 DOM 和生产 layerProps，不替换显示/布局实现。首次视觉检查发现 fit_page 未扣除 note chrome，高度测量已修正；同一场景复跑最终显示 **PASS complete browser smoke**。

| 采样 | blockList.clientWidth | runtime zoom（全精度） | 实际 transform |
|---|---:|---:|---|
| fit_width × 1 | 760 | 1.084070796460177 | matrix(1.08407, 0, 0, 1.08407, 0, 0) |
| physical × 1 | 760 | 0.8779875966831581 | matrix(0.877988, 0, 0, 0.877988, 0, 0) |
| fit_page × 1 | 760 | 0.3791935641627543 | matrix(0.379194, 0, 0, 0.379194, 0, 0) |
| canvas 前 / 后 | 4896 / 4896 | 1 / 1 | matrix(1, 0, 0, 1, 180, 64)，完全一致 |

三档中**全部三个块**的 blockLayouts、存量 page_frame_local 几何保持不变；canvas 前后 viewport、布局、宽度、transform 一致。fit_page 实际纸盒 Y=306.39..791.00，位于 app 可视 Y=194..855 内；纸盒高度 484.61 与映射计算相符。physical 实际纸高 1122.07 与映射相符。无布局/档位写请求；fixture 的 existing hydration `POST /source-anchors/generate` 仅返回内存空对象，故页面标为 unexpected writes=0，不冒称所有请求都是 GET。

### 未做清单与交付

- 按本单 §二段纪律执行定向验证；未跑完整 `npm run verify:v2-bn8-runtime`、server 全套、安全类测试或马拉松。
- 未做单 3 打印/导出/PDF 光栅、Preview 改造；未替 Henry 做比例体感验收或 HQ 放行。冒烟是隔离内存笔记，不冒充真实账号/数据库全链验收。
- 未添加档位持久化，未修改 server、单 2 profile/物理映射机制、纯测量签名、agent 指令/权限配置。
- 未读取 `.env` 内容或凭证材料，未打印任何 key。最终构建、定向单测与浏览器 fixture 均显式 `envFile:false`。
- 未 commit/push/PR/merge；开工已有 `server/src/routes/projections.ts` 及三项未跟踪材料保持原状。源码、测试、可复跑冒烟 fixture 与本回执一并以工作树交 HQ。
