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

## 停线

2026-09-07 · Codex builder。**施工未完成，status 保持 ready；产品代码零修改，不追加完工 Result。** 已按 §〇 顺序核对段 plan 冻结裁定 4、K-0 §三与单 1/单 2 现物。停线依据为本单 §三及段 plan 裁定 4 的「3a 试做遇深坑即停线」：现役 page DOM 并非逐 frame 的页栈投影，仅补 print CSS 与包装不能完整兑现 §一.3a.1，而增建内容投影超出 §一.3a.4 的限制。以下含独立只读复核与内存合成样本实跑，不以单帧文本可打印冒充完整交付。

### 现物与冲突

下文 `E/` = `client/src/pages/Notes/canvasEngine/`，行号均为本次未修改的工作树源码。

| 现物 | 证据 | 对施工的影响 |
|---|---|---|
| page 仅有一个主帧纸盒，文本块共用一个 blockList | `E/layers/NoteWritingSurfaceLayer.tsx:3298–3314,3732–3750`；逐 frame 边界 map 仅在 `:3363` 的 canvas 条件内 | 缺少逐 frame 的分页容器。普通单归属文本可考虑补包装，**单凭这一项尚不足以断言不能做**。 |
| 跨帧裁片已有模型，没有逐片内容 DOM | `E/pageStackBlockFragmentService.ts:64–85` 计算每帧 visibleRect；`E/layers/NoteWritingSurfaceLayer.tsx:875–882,3750` 把同一块的多个 fragment 一起传入；`E/layers/BlockEditorLayer.tsx:183–192,333–344,376–382` 只渲染一个 article 与续页 badge | 一个 article 不能仅靠新增外层包装同时成为不同打印页中各自裁剪、重定位的内容。需新挂载/复制内容裁片或建立打印专用投影；把一个长盒交给浏览器自然分页，不能保证按已有 frame 边界、间距与坐标分页。 |
| page 未挂载部分对象内容层 | `E/layers/NoteWritingSurfaceLayer.tsx:3569,3593,3625,3679` 的 Connector / Image / Table / Shape 均限 canvas | CSS 无法显示未挂载的页内对象；补齐需要内容渲染接线，不能描述成单纯隐藏 app chrome。 |
| 当前纸盒还会随内容增长 | `E/hooks/usePageReadingPresentation.ts:22` 取 max(frame.height, pageContentHeight + inset.top) | 不能直接把这个长盒整体乘 physicalScale，便宣称每 frame 已对应一张固定物理页。 |

**范围纠正**：非主帧普通文本不一定被过滤。`E/modePolicyService.ts:116–127` 允许与其他 frame 关联的普通块进入 visibleBlocks；问题是它们共用当前纸盒，而不是「次帧内容全部未挂 DOM」。未发现已有 print CSS 与 Preview 样式打架；本次停线理由是上述实际投影缺口，不是照抄工单举例。

**不构成停线的项**：单 2 physicalScale 全精度可用。默认 A4 904×1278 映射为 793.700787×1122.068149px，相对 210×297mm 的高差 −0.451536px；Letter 904×1170 映射为 816×1056.106195px，高差 +0.106195px，均在 ±0.5px 内。未以 preset 舍入为由重开已裁精度规则。

### 合成样本实跑

在现有 `NoteRuntimeDocumentLayer.test.tsx` 的**内存转换结果**后追加一个临时探针，用既有 Vitest/jsdom 与真实 `derivePageStackBlockFragments`、`NoteRuntimeDocumentLayer` 渲染；未修改该测试文件或产品源码。样本为两张默认 A4，第二帧 y=1358（1278+80），一个 x=0/y=1100/w=760/h=420 的合成块，world offset X=72。两个 frame 的 fragment 由生产函数推导，不手填 fragment 数量。继承原测试的 floating panel mock，ResizeObserver 为局部 stub；不加载账号或数据库。

实跑输出：

```text
S3_STOP_LINE_EVIDENCE {"frames":2,"fragments":2,"paperContainers":1,"articles":1,"continuationMarkers":1,"secondaryFrameNodes":0}
Test Files  1 passed (1)
Tests       1 passed | 3 skipped (4)
Duration    1.71s
exit        0
```

三个既有用例由 `testNamePattern: 'S3 stop-line specimen'` 排除，**不申报它们通过**。该探针证明真实组件对两个裁片仍只挂一个纸盒/一个 article；这是停线取证，**不是 print 计算样式测试、浏览器打印冒烟或打印保真 PASS**。

复跑方法：在 client 目录用 `node --input-type=module` 从 stdin 执行 `startVitest('test', ['src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx'], {run:true,testNamePattern:'S3 stop-line specimen'}, {envFile:false,plugins:[probePlugin]})`；`probePlugin` 为 `enforce:'pre'` 的 transform，仅对上述文件追加测试。测试复用其 `writingSurfaceProps`/`codeBlock`/`runtimeModel`，把 `pageFrames`、`primaryPageFrame`、`pageStacks` 和生产函数生成的 `blockFragmentProjections` 传入真实 document layer。断言选择器依次为 `[data-page-display-scale]`、`article[data-note-block-shell]`、`[data-cross-page-continuation-marker]`、`[data-page-frame-id="specimen-frame-1"]`，数量为 1/1/1/0。此记录给出输入、生产入口与全部判据；未新增常驻测试或基建。

### 3b 降级梯申报

已检查第一级前提：client/package.json 未声明 playwright/puppeteer；client/node_modules 与 root node_modules 均无 playwright、playwright-core、puppeteer、puppeteer-core 的 package.json；client/scripts 未发现对应 headless 打印入口。结论只限 **client 已有通道未发现**，不代表系统没有 Chrome/CDP。

**停点：3a 结构冲突；3b 第一级前提不成立，第二级尚未实施，不能申报降级验收通过。** 不能因为无 headless 就越过 3a 缺口，把屏显样本换个标签当作打印计算样式证据。工单预期的第二级仍可作为 HQ 补裁后续工的验证路径。

### 待 HQ 补裁与交付边界

需冻结是否允许**仅打印时使用的独立页栈投影**：复用内容渲染与有效 typography，按现有 frame/fragment 做裁片、重定位并补齐页内对象，屏显 DOM 与 Preview 统计语义保持现状。该方案仍可使用浏览器打印、无需 PDF 引擎或新依赖，但范围超过当前「print CSS + 必要包装类」。若收窄为仅主帧文本单页，须显式改判 §一.3a.1；builder 未自行选择或实施任一分支。

- 仅本工单追加停线证据，`git diff --numstat` 为 **53 additions / 0 deletions**，限定该文件的 `git diff --check` 通过；产品代码与常驻测试为 **0 / 0**。无 agent 指令/权限配置变更，status 未前翻。
- 未执行 §二 client typecheck/build、print 单测、打印预览功能冒烟；未生成 PDF、未做人眼/真实笔记验收；未跑完整 runtime 验证门、安全类测试或马拉松。上述一条探针不替代任何完工验证。
- 未使用或扩展一帧的 pageReadingSmoke fixture 冒充多帧打印样本；未实施 3a/3b，未改 Preview 或物理映射。
- 未新装依赖、未读 .env、未打印 key、未动 server、未查询用户数据；探针显式 envFile:false。CodeGraph CLI 与 rg 不可用，按定向 PowerShell 读取回退，未索引或安装工具。
- 未 commit/push/PR/merge；开工已有 server/src/routes/projections.ts 修改及三份未跟踪材料保持原状。停线证据随工作树交 HQ。

## 补遗一(2026-09-07,发单方 Fable,针对 ## 停线;停线成立,四项现物举证有效)

1. **批准打印专用纸叠投影**(builder 提案分支):新建 print-only 挂载的逐帧分页投影——复用现有块渲染与单 2 有效 typography,按 `pageStackBlockFragmentService` 的逐帧 visibleRect 做**裁片重定位**(fragments 模型正是为此而生);屏显 DOM 结构与 Preview 统计语义**零变化**(投影仅在打印路径挂载);仍走浏览器打印,⛔ PDF 引擎⛔ 新依赖。§一.3a.4 的"print CSS+必要包装类"限制**由本条显式放宽至打印投影**;
2. **canvas 对象层⛔ 不入打印投影**:停线证据里 Connector/Image/Table/Shape 属 canvas_objects 内容层——那是野地财产、13.2 退役对象,纸的打印 v1 只管纸上块内容(文本/媒体块经现有块渲染);块可见性沿用 page 现行规则(modePolicyService),⛔ 新造可见性判定;
3. **每帧=固定物理页**:打印投影按 frame 冻结几何取**固定物理高**(A4/Letter 映射值),溢出内容凭 fragment 裁片归属各帧;屏显那个随内容增长的纸盒(usePageReadingPresentation:22)⛔ 进打印;
4. **3b 直接走第二级**(第一级前提已证不成立):机械判据=打印投影计算样式断言(逐帧物理宽高 ±0.5px/打印页数=帧数/gear 与 stepFactor 不泄漏进 print)+ fixture 打印预览检查页供走查①人眼;
5. **规模改判**:本单由中单升格中大单,允许多轮内部推进;实施中再遇结构级缺口照停线条款;
6. 其余口径不变(网页族 fit A4 宽、§二、§三)。按本补遗续作至完工 Result。

> 战役级备注(HQ 自记,非 builder 义务):本停线揭示屏显 page 模式的"真纸叠 DOM 化"尚未发生——本单的打印投影即其原型,屏显侧迁移候 13.x 排期,走查①一并向 Henry 报。
