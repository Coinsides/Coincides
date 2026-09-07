> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.1 单 3=3a 打印通道 v1 + 3b 保真判据;段内最后一单)
> **日期 (Date)**: 2026-09-07
> **性质**: 施工单(client,中单;冻结裁定 4 的降级梯在案)

# 13.1 · 单 3 · 打印通道 v1 + K-比例保真

## 〇 · 上游(先读,顺序)

1. 段 plan 冻结裁定 4(单 3 两步制与降级梯):`plans/v13-1-paper-viewport-plan.md`;
2. K-0 报告 §三(现物无最终 PDF 输出链;print profile 已进几何;Preview 是统计层不是导出器);
3. 单 1/单 2 已交付现物:physicalScale(print profile 全精度)、page 档位通道、`client/scripts/pageReadingSmoke/` 冒烟 fixture(可复用扩展)。

## 一 · 口径(冻结)

**3a · 打印通道 v1(浏览器打印即导出,⛔ 造 PDF 引擎⛔ 新依赖):**

1. `@media print` 样式路径,page 模式下生效:隐藏 app chrome/控件/托盘类 UI,只呈现页栈;每个 page frame=一张打印页,frame 间强制分页(`break-after: page`);
2. **纸族页物理严格**:`@page` size 按 pageSize(A4 portrait / Letter portrait),margin 0;frame 内容按 **physicalScale 全精度**缩放落到物理尺寸——屏幕档位(gear/stepFactor)⛔ 影响打印,打印永远物理;
3. **网页族页 v1 实用主义**:`@page` A4 portrait,内容 fit A4 可用宽(缩放比现算);此判走查①可改;
4. 打印路径⛔ 改动屏显 DOM 结构语义(print CSS + 必要的打印专用包装类为限);⛔ 触碰导出 Preview 统计层语义。

**3b · K-比例保真判据(降级梯,按序尝试,申报停在哪级):**

1. **首选**:若 client 已有可用的 headless 打印通道(如 playwright/puppeteer 依赖已在)——用 Chrome print-to-PDF 出一号样本(冒烟 fixture 笔记),对 100% 物理档屏显做布局盒对齐断言(容差=抗锯齿);**⛔ 为此新装依赖**;
2. **无 headless 时(预期路径)**:机械判据=打印样式计算值断言(单测):frame 打印宽高=物理 mm 换算值 ±0.5px、分页规则、chrome 隐藏、gear 不泄漏进 print;外加冒烟 fixture 扩展一个"打印预览检查页"(列出应见/不应见清单),供走查①人眼对照;
3. 真实一号证物笔记(Henry 库内)⛔ builder 触碰——走查①时 Henry 亲眼验,本单只备 fixture 样本+检查单。

## 二 · 验证(段纪律)

1. client typecheck/build;
2. 单测:print 样式计算(纸族物理尺寸/网页族 fit 宽/分页/gear 不泄漏);
3. 一条功能冒烟:fixture 打开打印预览路径,纸族 frame 物理尺寸与 physicalScale 相符(以计算样式采样为证)。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+3b 停在降级梯哪一级+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 动 server;⛔ 查询用户数据。现物冲突(如 print CSS 与现有导出 Preview 样式打架)⇒ 停线举证。
