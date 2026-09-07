> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.1 单 1,候单 2 已落地——现物:physicalScale 在 print profile、有效 profile 单点派生在 runtime controller)
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
