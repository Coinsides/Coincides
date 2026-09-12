# B1d 材质实现与修正记录

范围：`NoteDetail.module.css`、`paperSkinStyles.ts` 及其测试、`PageFrameWallLayer.tsx` / `.module.css` 及其测试、`NoteWritingSurfaceLayer.tsx`。原件均保存在本目录 `baseline-source/` 的同相对路径。未改持久化 token schema、块坐标、TextFlow、墙拖动逻辑或网络请求。

- `buildPaperMaterialStyles(tokens, preset)` 仅产生预设内部 CSS 别名。默认/静墨无材质绘制，墙 idle 为 0；暖纸 0.55，工作台 1。
- 暖纸桌面光晕、纸三段渐变、三层影均逐值采用 spec §八；完整纸面由现有 `pageReadingHeaderBand` 绘制，透明正文容器不叠加第二层渐变或纸影。左缘增加 10px 向右淡出装订影。
- 暖纸 idle 左墙为 `rgba(194,109,90,.45)`，再应用共同 idle 0.55；右墙为 `--sk-wall`（出厂 #D8CFBC），两侧从纸顶至 72px 同步渐入。纸顶延伸只改变伪层 paint，不移动墙命中带或块坐标。
- 工作台出厂桌面网格保持 24px / #1B2028，补到曾遮挡外层网格的 canvas / overview 桌面；overview 纸描边改消费既有 #2A313C 派生别名。idle 墙刻度位于两侧边距外侧。
- hover / active 原 `.line` 的颜色、宽度、透明度、过渡与命中逻辑保持；hover / active 抑制新增 idle 与刻度。readonly / ink 模式仅绘制 `aria-hidden`、`pointer-events:none`、无回调的墙材质。
- 每次预设变化显式重置内部别名，防嵌套纸面/portal 继承上一张纸的材质。已有 desk / paper / wall 用户颜色覆写仍生效。

## 像素复核发现的两项实现回归

1. 初版将 `overflowClipMargin` 从字面长度改成 `calc(var(...) * scale)`。真机 Chrome 的 `CSS.supports('overflow-clip-margin', 'calc(32px * 1.08)')` 为 false，实际 computed 为 `0px`，导致纸边被裁剪。已改为 JS 计算后输出字面 px：默认/静墨/工作台严格保持既有 `32 * displayScale`，仅暖纸为 `80 * displayScale`，保护 54px 纸影。无用 clip CSS 变量已删除。
2. 初版在默认/静墨生成 `opacity:0` 的 idle 伪层，仍改变了 Chromium 的文字抗锯齿。浏览器单变量移除伪层探针在默认皮 **2,592,000 像素中 0 差异、最大通道差 0**（`browser/pseudo-probe-regression.json`）。已改为 `content:var(--paper-wall-idle-content,none)`：默认/静墨为 `none`，只在暖纸/工作台生成伪层。最终未经 DOM 补丁的产品截图，在补偿授权表头改动后，默认/静墨各 **2,592,000 像素中 0 差异、最大通道差 0**（`browser/pixel-regression.json`，PASS）。

## 定向验证

最后一轮：`paperSkinStyles.test.ts` 6、`PageFrameWallLayer.test.tsx` 4、`pageFrameAlignment.test.tsx` 25、`NoteRuntimeDocumentLayer.test.tsx` 15，合计 **4 文件 / 50 测试通过**。全库与四预设 E1 结果由主 builder 收口记录。

## 右侧孤线调查边界

原源码两侧墙均 idle `opacity:0`，只对 hover 一侧显影；浏览器已复现把指针放入右墙 12px 命中带时，右线 1、左线 0，移开后两侧都为 0。该机制与单侧竖线现象一致；若没有 Henry 原始截图的精确指针/DOM 记录，不能声称已对原截图逐像素同位归因。最终证据与表述由主 builder 按浏览器记录收口。
