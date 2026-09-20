> **状态 (Status)**: active
> **层 (Layer)**: 验证证据 / Audit
> **日期 (Updated)**: 2026-09-19
> **权威 (Authoritative)**: 否（A2 builder 定向验证证据；设计以工单及 note-page-design 为准）

# A2 折缝实现与验证

折缝采用仅供阅读呈现的 frame 副本：压缩机械相邻页之间的正 gap，保留页高、页宽、contentInset 与全部内容局部坐标。A1 分页 plan、原 frame collection、TextFlow 和持久化 placement 均不改写。Web 长页选择**隐藏折缝菜单项与页间件**。

| 交付 | 现物位置 |
|---|---|
| 正 gap 压缩、显示/原 y 双向映射、Web 判定 | `client/src/pages/Notes/canvasEngine/pageFramePresentationService.ts:5` |
| 纸面/墙/手动块/墨水显示帧与阅读总高度 | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:468` |
| A1 fragment 显示矩形；保留 flowFragment 原对象 | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:549` |
| 折后空白拖放反解 frame-local、双击还原 canonical clientY | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:1322` |
| 页间开合件；保留编辑焦点 | `client/src/pages/Notes/canvasEngine/layers/NotePageGapLayer.tsx:4` |
| View 菜单 checkbox 与 Arrow/Home/End 键盘导航 | `client/src/pages/Notes/canvasEngine/layers/ViewOptionsMenu.tsx:82` |
| 笔记会话内显示偏好、导航/Overview 回页坐标；打印/缩略图仍吃原 runtime | `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx:59` |

装订槽的显示 y 接线由主 builder 在同一 `displayFrame(frame)` 上合并。原有 Agent ambient hook 未修改。

验证结果：7 个定向文件，**86 tests passed**。覆盖新增纯投影 4 例、菜单 1 例、真实 writing surface 4 例、导航/Overview 回页 1 例，以及原有 A1、打印、墨水、墙/坐标、View 菜单和编辑恢复回归。实测折缝开合后手动块位置只移除间隙，宽度不变；墨水 path transform 不变；跨页文本各片随目标页平移；折前折后打印及 Overview DOM 投影相同；拖放反解到原第二页局部坐标；双击交给现有控制器的坐标已还原。测试使用实际 React 层和 jsdom，未声称浏览器像素验收。

命令（client 工作目录）：

```text
npm run test:unit -- src/pages/Notes/canvasEngine/pageFramePresentationService.test.ts src/pages/Notes/canvasEngine/layers/ViewOptionsMenu.test.tsx src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx src/pages/Notes/canvasEngine/layers/PaginationProjection.test.tsx src/pages/Notes/canvasEngine/layers/PaperInkProjection.test.tsx src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx
node node_modules/typescript/bin/tsc -b --pretty false
```

TypeScript 检查 exit 0。原始日志：`.codex-tmp/a2-binding/fold-targeted.log`、`.codex-tmp/a2-binding/fold-typecheck.log`。最初测试中的 jsdom DragEvent 坐标与浮点严格等值断言已修；初始日志保留 `fold-targeted-initial.log`。

本条证据仅声明定向验证与 TypeScript 检查。完整工单门由主 builder 汇总，git 检查/secrets 扫描留 HQ；不声明完整 `verify:v2-bn8-runtime` 已绿。

## 最终手势复核与修复

发现并修复一项折缝回归：原 `useBlockPlacementInteractions` 直接把屏幕指针 y 差除以缩放当作持久化 local y 增量，拖过已折叠的缝时会少计该缝（例如 80 px）。同页拖动不受影响。现在 writing surface 在折缝手势开始时提供仅本次手势的屏幕→canonical clientY 映射；现有交互控制器先映射两端再求差，仍沿用既有 frame_id、局部坐标、clamp、撤销与保存路径。相关入口：`NoteWritingSurfaceLayer.tsx:1345`；delta 接口及消费：`hooks/useBlockPlacementInteractions.ts:150`、`:158`、`:166`。

手动块允许延伸出其归属帧，因此其折后显示需按实际 canonical world y 计算，不能只使用归属帧的固定偏移；修复位于 `NoteWritingSurfaceLayer.tsx:475`。其存储 frame_id/x/y 保持原契约。处于被折空白内的原 y 在 `pageFramePresentationService.toDisplayY` 映射到缝线。resize 只消费横向指针差，无生产修改；墨水固定所属帧，已用折后 DOM rect 反解帧内点、原 frame 生成保存值并夹边，无生产修改。

新增 4 条定向回归：真实拖动 hook 跨缝保存值（50% 缩放下应保存 local y=470、canonical y=910、折后 y=750）；跨缝指针 y 不影响横向 resize；真实 Surface 传递映射并渲染越出归属帧的手动块；真实 Surface 折后墨水创建以原第二页 y=680 保存且捕获手势仍夹在该页边缘。`hooks/useBlockPlacementInteractions.test.tsx:157`、`layers/pageFrameAlignment.test.tsx:161`、`:184`。

最终补验 **3 文件 / 56 tests passed**，覆盖全部新增手势回归、之前折缝回归及现有拖动/resize/撤销相关回归。命令：

```text
npm run test:unit -- src/pages/Notes/canvasEngine/pageFramePresentationService.test.ts src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.test.tsx
```

日志：`.codex-tmp/a2-binding/fold-gesture-regression.log`。主 builder 在这些最终变更后重跑 client 全库、build 与静态边界门。说明书现役菜单名称已对齐为 `Fold page gaps（折叠页间空白）`。
