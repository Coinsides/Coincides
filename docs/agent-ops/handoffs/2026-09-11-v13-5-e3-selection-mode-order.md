> **状态 (Status)**: done(builder 工作树交付；待 HQ 复核放行)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · 波次 E3 · Selection 模式(默认态兼写兼选,墨水可选中)
> **上游**: 09-11 设计日会议记录 §三.2-.3(Henry 拍);现症=Write 模式选不中纸墨水笔画(C4 墨水只有整笔橡皮一条出路)

# E3 · Selection 模式

## 零 · 裁定原文

1. **默认态更名 Selection,兼写兼选**:点空白处=落笔写(现役 Write 行为零变),点对象=选中——把"写"从模式降格为默认态里的一个动作;
2. **墨水笔画升格为可选中对象**:Selection 态下点击 freehand 笔画→选中态视觉(描边/高亮,气质与块选中同族)→可**拖动移动**与 **Delete 键删除**;删除与移动入**现役纸面撤销栈**(机械闸:撤销覆盖不到的操作不许有);v1=单选,⛔框选多选(候后续);
3. **Pen/Eraser=临时工具**:用毕(完成一笔/一擦)⛔自动弹回——维持现役显式切换(Henry 只裁了"临时工具"定位,自动弹回体感待真机再裁,本单⛔做);
4. **三钮 icon 化**:Selection/Pen/Eraser 以 icon 呈现(lucide 现成:MousePointer2/Pen/Eraser 类),tooltip 带全名;Selection 为默认激活态;
5. 文本块/媒体块的现役点击语义零变(点块=进块编辑,不受本单影响)。

## 一 · 交付面

- 模式模型:Write→Selection 更名(状态值/持久化键若有存量,兼容申报);
- 墨水命中:笔画 hit-test(描边邻域容差,细线可点中)、选中态渲染、拖动(placement 移动,复用既有 canvas object 移动语法)、Delete 删除(走 C4 现役删除动词);
- 撤销:移动/删除各成撤销条目入现役栈,undo/redo 对称;
- 工具条:三钮 icon 化+tooltip;E1 的视图钮/⋯钮布局零变。

## 二 · 禁区

⛔框选/多选;⛔自动弹回;⛔动墨水数据 schema(freehand kind 现役);⛔TextFlow 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响秒级静态门。

## 三 · 验收

- typecheck+build 绿;定向绿+新增:hit-test 容差/选中态/拖动落库/删除入栈 undo-redo 用例;
- 冒烟(真浏览器):①Selection 态点空白打字正常(写行为零变);②点笔画→选中态显现;③拖动笔画→落库,undo 回原位;④Delete→笔画删,undo 复活;⑤Pen 画一笔后仍是 Pen(⛔自动弹回);⑥三钮 icon+tooltip;
- 证据落 `docs/audits/2026-09-11-e3-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff、hit-test 设计说明、撤销接线申报、冒烟证据、测试数字。冲突停线⛔自作主张。

## Result

2026-09-11 · codex builder · 工作树交付，未 git commit。未发现与本单相撞的受管文件改动。未修改墨水 schema、服务端、TextFlow 内核/契约、权限配置或安全类测试；Git 仅作只读 status/diff 检查，无 `.git` 写操作。

### 交付清单与 diff

- `freehandService.ts`：`PaperInkTool` 默认态值由 `write` 更名 `selection`，增加基于原生 SVG 描边的单点命中。模式仅为组件内存状态，无 localStorage/sessionStorage/服务端模式键或存量迁移。
- `NoteWritingSurfaceLayer.tsx`：默认 Selection；Selection/MousePointer2、Pen/Pencil、Eraser/Eraser 三个 icon 按钮，`title` tooltip 与 `aria-label` 带全名，`aria-pressed` 保留。E1 的视图钮与 ⋯ 布局关系不变。复用现有 `selectedCanvasObjectId` 在整张 Note 跨页单选，存量 world 刷新 effect 保留仍 active 的墨水选中。
- `PaperInkLayer.tsx`：纸面背景命中选笔、拖动预览、松手持久化、Delete 走 C4 删除动词；3 CSS px 拖动阈值，点击不生成保存；页界钳制与现役服务端约束一致，取消/失败回退预览。独立 enabled 守卫覆盖只读、Layout 与 Overview。
- `PaperInkSvg.tsx`：选中笔画以既有 accent token 加宽高亮，print 不显示选中态。文本/媒体块、draft、页边墙与嵌套控件仍接收原有点击。Pen/Eraser 完成手势不改模式；未加框选、多选或自动弹回。
- `usePaperInkCommands.ts`：扩展存量 freehand 保存的 before/after 可逆条目。新增/扩展 4 份测试文件，共新增 13 项。
- [完整实现 diff](../../audits/2026-09-11-e3-builder/implementation.diff)；[交付证据目录](../../audits/2026-09-11-e3-builder/README.md)。共 8 个既有源码/测试文件修改 + 1 个新增测试文件，生产实现涉及 5 个客户端文件。

### hit-test 设计说明

墨水 overlay 在 Selection 态保持 `pointer-events: none`，在所属写作面捕获背景 pointerdown。先排除文本/媒体块、draft、页边墙、内嵌表单/菜单等原有目标；排除范围限定在写作面内部，因此 Board 外层 dialog 不阻断 Selection。命中后截断同节点后续捕获监听，跨页不抢笔；未命中不阻断原有书写事件。

按渲染 zIndex 逆序逐笔查原生 `SVGPathElement.isPointInStroke`，不采用包围盒选中。屏幕点经实际 CTM 逆变换进入笔画局部坐标；查询宽度为 `max(原笔宽, 16 / scale)`，即细线两侧各约 **8 CSS px**。Chrome 原生实验确认 `vector-effect` 不参与此几何查询，故只在同步查询期间调整透明 path 宽度，`finally` 恢复。原始 path/points、样式、schema 不改；兼容 path-only 曲线与既有旋转投影。真实 Chrome 三档缩放的 12 场景 / 72 采样已验证边界。

拖动只更新现役 placement 的 x/y，保留 objectId/placementId/frameId、宽高与笔画数据；world→frame-local 转换仍由 `paperFreehandSavePayload → saveGenericCanvasObjectForNote` 正门负责，UI 不重复减 inset。拖动限制在所属页的合法矩形内。

### 撤销接线申报

沿用 `useNoteCanvasRuntimeController` 已接好的 `textHistory.boundary → enqueueRuntimeHistoryOperation → pushHistoryEntry(reversibleEdit)`，没有新栈、新持久化或新命令队列。UI 的 `onPersistCanvasObject/onDeleteCanvasObject` 均使用 C4 的 `usePaperInkCommands` 包装。

原 persist 对存量笔画直接跳过 history，本单补为：同队列内读取 before → 保存 after 成功 → 入一条 reversibleEdit，undo 保存 before，redo 保存 after。Delete 继续调用原 remove，undo 恢复同一对象/placement 的完整快照，redo 再调用原删除。失败不入栈，失败回放保留可重试条目；新建→连续移动→删除的快速链路在同一 act 中验证。复用 C4 已存在的 confirmed snapshot 缓存以覆盖 adapter 尚未发布下一次 render 的窗口，未新造平行状态/恢复机关。

### 冒烟证据与测试数字

- 定向套件：**11 文件 / 99 项全部通过**，新增 **13 项**，Vitest **6.34s**。三档容差、选中态、跨页单选/修饰键替换、modal、拖动落库、失败/取消/页界、禁用面及原块点击路径均有覆盖。
- 受影响秒级静态门：`canvasRuntimeBoundaryCheck.mjs` **167/167 PASS**，**64ms**。按本工单仅跑受影响静态门，未执行含安全检查的全库 omnibus、未改验收链接线。
- Client typecheck/build：`tsc -b` **PASS / exit 0**（30.427s）；`vite build` **PASS / exit 0**（Vite 5.93s）。既有混合导入与 chunk 体积警告。
- 真实 Chrome + 真实笔记/服务端：默认 Selection 经现役空白入口写字并刷新保留；Pen 画一笔后仍 Pen；邻域点击选中高亮；拖动落库与 undo/redo 回位；Delete 与 undo/redo 同 ID 复活/再删；另验“拖动落库后直接 Delete”成功；三钮 icon + tooltip DOM 已核对。笔记 ID `eb0fa550-c96a-41a7-bf1c-2aaf7ded9fd9`，保留供复核。
- 真浏览器几何夹具：**12/12 场景、72/72 采样 PASS**，含 50%/100%/200%、细线、曲线、旋转与点状路径。夹具、观测 JSON、构建/测试/静态日志及 diff 均在 **[`docs/audits/2026-09-11-e3-builder/`](../../audits/2026-09-11-e3-builder/README.md)**。

**行为/证据边界申报**：现役空白入口为“双击启动写入”，单击只聚焦纸面；本单保持写行为零变，没有新增单击写入。现役历史回放会暂置只读并清 UI 选中，因此回放后 Delete 需重新点选；对象数据与坐标 undo/redo 对称。截图已在会话中目视检查，未归档 PNG。真实 Board modal 全旅程未运行，modal 宿主与跨页单选由组件测试覆盖。独立只读复查最初发现的 modal 祖先误拦、world 重建清选、拖出页界三项均已修复并补回归；复查未发现新增显著问题，不代替 HQ 放行。
