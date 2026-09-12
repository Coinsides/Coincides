> **状态 (Status)**: active(单1 死码清除大单的下刀图纸;备料 workflow 现物复核产出,2026-09-13)
> **层 (Layer)**: 分析 / 死代码清册现物复核(13.2 旧清册的行号与耦合更新版)
> **权威 (Authoritative)**: 是(单1 施工按本档行号与建议下刀,⛔按 13.2 旧清册)
> **上游**: `2026-09-13-v13-6-adjudication.md` 议程 A(裁定:全删,四类执行)

# Canvas 死代码清册 · 2026-09-13 现物复核

## 总览

清册共 28 行(一·实现 22 行 + 二·样式 6 行)另加 13.6 随册接续 3 笔(Canvas +56px / 25 条陈旧红 / 骑墙项),本次逐项核现物共 31 项。结论:**零项失踪、零项被产品化复活**——13.4-13.5 全部后续工作(E1 去盒、D2 顶栏拆、B1a-e 皮系统、D1 墙、媒体先遣)都绕开了 CANVAS_MODE_RETIRED 门后的本体,但**四处新增了对死符号的反向/侧向耦合**,是本次复核最重要的增量:①`NoteDetail.module.css:11` B1e 新写的活 Page 规则用 `:not(.pageCanvas)` 反向依赖死类名;②`NoteDetail.module.css:20,30` B1d 新写两条皮肤后代规则挂在死类 `.writingSurfaceCanvas` 下(死上加死);③`ViewOptionsMenu.tsx:88`(E1)新复用 `canvasZoomReset`,连同 NWSL:4210-4241 的 Page reading controls,`canvasZoomControl/Button/Reset` 四类已实质转为 Page 常驻控件,只剩 `canvasZoomSlider` 纯 canvas;④媒体先遣(040c39b)明令"旧 image 符号原地保留"并让静态门继续断言它们。行号方面 `NoteWritingSurfaceLayer.tsx` 已从清册时的 ~3993 行涨到 4443 行(26 次提交),全部行号须按本报告重定位,⛔按清册旧行号下刀。裁决分类计数:**纯死可删 10 项**(2/5/9/10/11/19/20/24/27/28);**删但须连改静态门 7 项**(4/13/16/17/18/22/23)——`client/scripts/canvasRuntimeBoundaryCheck.mjs` 有 5 组 assertContainsAll(canvas zoom 三 token、PageFrame operable 五 token、PageStack 六 token、image/table/connector 各一组、六 CSS 类)唯一供货方在 canvas 死枝内,删枝即断门;**删但须补/改替身测试 3 项**(1/25/30);**拆分(死活混居)9 项**(3/6/7/8/12/14/15/21/26);**复活候选 0 项**——无任何真需求指向,`canvasZoom*` 一族是"已被 Page 收编"而非"待复活",image 面已由媒体块(第四族 NoteBlock)另起炉灶取代。特别提示 25 条陈旧红的最省事解法:`v2CanvasPersistenceCutover.test.ts:190-221` 等 4 个 fixture 工厂把 `surface: 'canvas_workspace'` 写死,改成 `formal_page` 即可一并转绿并**完整保住** 5 个图片资产生命周期用例的活语义,无需"只删不补"。

## 逐项

### 一·1 useSurfaceModeController 双模状态/首次 hydration canvas 自动切换/toggle transition

- **现物**: 现物在,本体零改动;行号漂移 41–47→41–48、72–99→原位、103–109→101–109。13.4-13.5 未动。
- **细节**: 活入口收口点仍是 CANVAS_MODE_RETIRED 早退(:71 resolveInitialSurfaceMode、:102 toggleSurfaceMode)。toggle 传递全链仍在:useSurfaceModeController:101,116 → useRuntimeSurfaceStateController.ts:111,212 → useNoteCanvasRuntimeController.ts:90,616 → useNoteCanvasLayerProps.ts:123 → NoteChromeLayer.tsx:104,159(按钮不挂载)。测试依赖 4 个文件:canvasRetirementPolicy.test.tsx:30、useSurfaceModeController.test.tsx:118,188,189,202,204、useRuntimeSurfaceStateController.pageReading.test.tsx:107,121、useNoteCanvasRuntimeController.test.tsx:32,66,397——均为『调 toggle 断言仍是 page』的退役锁,删 toggle 即全红。返回面 pageOffsetX/surfaceMode/surfacePolicy 是 Page 活用。
- **裁决建议(已照准)**: 删但须补替身测试。删 toggleSurfaceMode/resolveInitialSurfaceMode 本体须同批改写上列 4 个测试文件的退役锁断言(改为断『无 toggle 导出』或删用例),且 surfaceMode/surfacePolicy/pageOffsetX 三个返回值必须留。

### 一·2 NoteChromeLayer Page/Canvas pill JSX+回调+pressed 语义

- **现物**: 现物在,402–414→403–414(B1e 在同区新增 appearance pill,故整体下移)。
- **细节**: `{!CANVAS_MODE_RETIRED && (` 在 :403,pill 在 :405-406。零运行时 DOM、零可访问树入口。styles.modePill 同时服务 :415 Preview、:424 Layout、:439 Appearance(B1e 新增第四个),不能删样式全族。NoteChromeLayer.test.tsx:120 只传 `onToggleSurfaceMode: noop` 占位,无行为断言。
- **裁决建议(已照准)**: 纯死可删(JSX 块 + 常量门)。onToggleSurfaceMode prop 的删除归入第 1 项同批,顺手清 NoteChromeLayer.test.tsx:120 的 noop 占位;⛔删 .modePill 样式族。

### 一·3 toggle 从 controller 到 Chrome 的传递(useNoteCanvasRuntimeController + useNoteCanvasLayerProps)

- **现物**: 现物在;useNoteCanvasRuntimeController 83,503→90,616(B1c/B1e 两次改文件),useNoteCanvasLayerProps 127→123(B1e 改)。
- **细节**: 两文件本身是活装配层(B1c 页型预设、B1e 外观面都往里加线),只有 toggleSurfaceMode 这一根线死。
- **裁决建议(已照准)**: 拆分。只抽 toggleSurfaceMode 一根传递线(controller:90,616 + layerProps:123 + ChromeLayer props 类型 :104,159),⛔整删 runtime/props 装配层。

### 一·4 NoteCanvasRuntime canvas 外层文档 overflow 与 pageCanvas class

- **现物**: 现物在但行号大幅漂移:13–19,32→25–37(body lock effect)、58(pageCanvas class)。文件被 B1a 皮系统改写(新增 PaperSkinContext/skin.style/data-note-skin-preset)。
- **细节**: canvas-runtime-lock class 由 :26-36 effect 管理,消费者是 client/src/styles/global.css:29,33 两条规则。pageCanvas 三元在 :58。**新增反向耦合**:NoteDetail.module.css:11 `.page[data-note-host-mode='page']:not(.pageCanvas)` 是 B1e『暖纸桌面铺满视口 -28px』的**活 Page 规则**,它依赖 .pageCanvas 这个死类名继续存在才能正确排除 canvas 宿主。
- **裁决建议(已照准)**: 删但须连改静态门/活选择器。删 pageCanvas 三元与 body lock effect 时,必须同步把 CSS:11 的 `:not(.pageCanvas)` 去掉(去掉后语义等价,因 canvas 宿主已不可达),否则 CSS 规则挂空选择器;global.css:29-36 随删。

### 一·5 NoteRuntimeDocumentLayer documentShellCanvas 条件 class

- **现物**: 现物在,40→62(B1d/媒体先遣两次改文件)。
- **细节**: `surfaceMode === 'canvas' ? styles.documentShellCanvas : ''`,配对样式 NoteDetail.module.css:107-118。零其他引用,零静态门,零测试断言(NoteRuntimeDocumentLayer.test.tsx 不断此 class)。
- **裁决建议(已照准)**: 纯死可删。三元连同 CSS:107 规则整块删。

### 一·6 modePolicyService canvas policy/next-mode/野地宽度/canvas 草稿 snap

- **现物**: 现物在,81–106→83–107、165→165、173–201→原位(整体 +2 行内)。零改动。
- **细节**: createSurfaceModePolicy(:83-95) 是 Page 也走的活工厂,其中 isCanvasMode/label/nextModeLabel/showWorkspaceBlocks/useGlobalPageScroll 五个字段的 canvas 臂死。getNextSurfaceMode(:97-99) 与 createSurfaceModeTransitionPolicy(:101-109) 唯一调用点是死的 toggleSurfaceMode。createBlankDraftLayout(:155-201) 中 `policy.isCanvasMode ? CANVAS_WORKSPACE_WIDTH`(:167) 与整段 canvas snap 分支(:175-200) 死,Page snap 早退(:165) 活。getVisibleBlocksForSurface 的 showWorkspaceBlocks 分支死但函数活。
- **裁决建议(已照准)**: 拆分。可整删:getNextSurfaceMode + createSurfaceModeTransitionPolicy + :175-200 canvas snap 块;须保留并原地简化:createSurfaceModePolicy/getVisibleBlocksForSurface/createBlankDraftLayout 主体。

### 一·7 viewportService canvas pageOffset/viewport seed/无限 world

- **现物**: 现物在,31→30-32、47–56→原位、88–112→88–103。零改动。
- **细节**: getPrimaryPageOffsetX(:30-32) 函数活(Page 走 0 分支),仅 canvas 臂死,常量 CANVAS_PRIMARY_PAGE_OFFSET_X=96 定义在 engineModel.ts:83。createRuntimeViewport(:42-) 的 canvas seed(:47-55) 死,Page seed(:56-) 活。buildRuntimeWorld(:88-96) canvas 无限 world 死,Page 分支(:104-108) 活。getPageViewportCenteringOffsetX 是纯 Page 活函数,被 pageCenteringContract.test.ts:31-34 三条数值断言锁。
- **裁决建议(已照准)**: 拆分。只删三处 canvas 臂(:31 三元、:47-55 seed、:88-96 world 块),⛔整文件删——坐标工具仍供 Page/打印/历史诊断,且有活测试锁。

### 一·8 useViewportTransformController(骑墙项之一,清册注明『按调用点拆分』)

- **现物**: 现物在,32–87→28–99;整文件 100 行,零改动。
- **细节**: 死活精确分界已核清:**living** = viewportTransform 状态本身(Page zoom 全链读,NWSL:3644/3652 世界尺寸、:1155 等,且静态门 canvasRuntimeBoundaryCheck.mjs:1167 硬断言源码含 'viewportTransform.zoom')+ setViewportSize(:43-49,Page resize observer 供货)。**纯死** = panViewportBy(:51-55)、scrollViewportBy(:57-61)、zoomViewportAt(:63-72)、focusViewportOnRect(:74-82)、resetViewport(:84-89)——五个消费者全在 canvas 死枝:NWSL Space+拖/中键 pan(:1294-1360)、wheel zoom(:1155-1199)、canvas zoom 控件(:4242-4283 的 onResetViewport)。:36-41 的 surfaceMode effect 只在模式切换时跑,运行态恒 page,死。
- **裁决建议(已照准)**: 拆分。保 viewportTransform + setViewportSize;删五个 canvas 专用回调须与第 13/18 项同批(否则 NWSL 编译不过),并连改静态门 :1163-1168。

### 一·9 useCanvasContentWidth canvas 扣 pageOffset 的宽度分支

- **现物**: 现物在,25→原位 25。零改动。
- **细节**: `const availableWidth = surfaceMode === 'canvas' ? width - pageOffsetX : width;` 单行三元。Page resize observer 是整个 hook 的活用途。零静态门、零测试断言。
- **裁决建议(已照准)**: 纯死可删。三元退化为 `const availableWidth = width;`,顺手评估 surfaceMode/pageOffsetX 两个入参是否随之无用。

### 一·10 useCanvasSurfacePointerController canvas 双击草稿免 screen→local 分支

- **现物**: 现物在,66→66-68(handlePageSpaceDoubleClick 内)。零改动。
- **细节**: `activateDraft(nextLayout === defaultDraftLayout || surfacePolicy.isCanvasMode ? nextLayout : screenLayoutToLocal(...))` —— `|| surfacePolicy.isCanvasMode` 是死的短路臂。Page 点击/双击/选区清理(handleBlockListMouseDown、handleSurfacePointerDown)全活。有 useCanvasSurfacePointerController.test.tsx 需同步核。
- **裁决建议(已照准)**: 纯死可删。只去掉 `|| surfacePolicy.isCanvasMode` 一个短路条件;删前跑一遍 useCanvasSurfacePointerController.test.tsx 确认无 canvas 分支用例。

### 一·11 useBlockPlacementInteractions workspace drag bounds

- **现物**: 现物在,157→173(D1 墙/B1 皮两轮改文件后下移)。
- **细节**: `dragBoundsWidth: surfacePolicy.isCanvasMode ? CANVAS_WORKSPACE_WIDTH : contentWidth`(:173)。同文件 :93,:100 的 `coordinate_space !== 'canvas_world'` 是**活的历史读判据**(D1 墙/自动宽度依赖),⛔一起删。Page 布局交互(beginMoveBlock 主体)全活。
- **裁决建议(已照准)**: 纯死可删(仅 :173 三元)。⛔碰 :93,:100 的 canvas_world 读判据。

### 一·12 useRuntimeNaturalWritingController canvasWorldSessionAuthority 与非 Page 草稿激活

- **现物**: 现物在,192–207→原位、235–236→236、367–369→369。B1c 改过本文件但未动这几处。
- **细节**: canvasWorldSessionAuthority 对象(:192-207)、:236 的 canonicalizeLayout 调用、:369 的 activateDraft(nextLayout, canvasWorldSessionAuthority) 三处是死枝。但 :74-75 `layout.surface !== 'canvas_workspace' && layout.coordinate_space !== 'canvas_world'` 与 :127-131 是**活的**——Page authority 用它排除历史 workspace 块,是退役闸的供料判据。
- **裁决建议(已照准)**: 拆分。删 canvasWorldSessionAuthority 三处;⛔碰 :74-75、:127-131 的历史读判据与 Page authority/选帧/自然书写主体;旧恢复收据仍须能读。

### 一·13 NWSL canvas wheel/键盘 zoom、Space+拖动、中键 pan、世界 transform、pan session

- **现物**: 现物在,646–647→723(canvasPanning state)、1017–1090→1155–1199(wheel zoom effect)、1151–1199→1294–1360(pan session + 中键/Space)。文件已从 ~3993 涨到 4443 行,26 次提交。
- **细节**: `if (!surfaceRef.current || surfaceMode !== 'canvas') return undefined;`(:1155)、`if (surfaceMode !== 'canvas') return {};`(:1294 transformedWorldStyle)、:1302/:1320/:1355 pan session 三段、:1392 canvas 帧拖动。消费 useViewportTransformController 的 pan/scroll/zoomAt。静态门 canvasRuntimeBoundaryCheck.mjs:1167 断言源码含 'viewportTransform.zoom'——该 token 在 Page 侧(:3644 等)另有供货,但 canvas zoom 控件三 token(:1163-1166)无 Page 备份。
- **裁决建议(已照准)**: 删但须连改静态门。与第 8、18 项同批;删后须核 :1167 的 'viewportTransform.zoom' 仍有 Page 供货(现已确认有,:3644/:3652),并删 :1163-1166 三条 canvas zoom DOM token 断言。

### 一·14 NWSL page-frame/画物拖动、resize、空白上下文菜单的模式门(清册注明『查共享调用者后才可清本体』)

- **现物**: 现物在,1213,1250,1866,1904,1975→1355,1392,2008,2046,2117,2823。零改动。
- **细节**: 核毕共享情况::1355/:1392(handlePageFramePointerDown/ResizePointerDown)、:2008/:2046(handleShapePointerDown/ResizePointerDown)、:2117(handleShapePointerMove)、:2803(getPageFrameAtCanvasPoint)、:2823(handleBlankSurfaceContextMenu)全部以 `if (surfaceMode !== 'canvas') return` 早退开头。但 handleShapePointerDown/Move/endShapeOperation **被 ImageObjectLayer(:3909 区)与 TableObjectLayer(:3943 区)共用**,是同一族;PaperInkLayer(:3671,Page 活)不走这套。:1356 的 `closest('[data-page-frame-resize-handle="true"]')` 守卫与 :3764 的 DOM 属性互为唯一配对。
- **裁决建议(已照准)**: 拆分。这族 handler 与第 17 项(画物层)是同一删除单元,须整族一起裁;⛔单独删 handler 留下层、或单独删层留 handler。

### 一·15 NWSL canvas overlay 锚、zoom handler、野地空白 drop

- **现物**: 现物在,2495–2504→2645(`if (surfaceMode === 'canvas')` overlay 锚)、2652→2803、2674→2823、3228–3244→3379–3390。
- **细节**: :2645 overlay 锚 canvas 臂死,同函数 Page overlay 定位活;:3379 `if (surfaceMode === 'canvas')` 野地空白 drop 死,:3388 `Math.max(0, worldPoint.x - pageOffsetX)` 在该死枝内;但 :3437/:3442 的 `freeLayout(... - pageOffsetX ...)` 是**准备区拖上纸的活路径**,⛔连坐。
- **裁决建议(已照准)**: 拆分。只删 :2645 的 canvas 臂与 :3379-3390 块;⛔碰 :3437/:3442 Page 准备区落纸路径。

### 一·16 NWSL 多帧 canvas 显示、世界尺寸、canvas frame DOM 分支(含 +56px 错位面)

- **现物**: 现物在,752–756,3292,3340,3369,3385→1000–1004(guides 三元)、1025–1047(slots 三元)、3644–3652(世界尺寸 style)、3678–3790(canvas frame DOM 整块)。零改动。
- **细节**: **这是静态门依赖最重的一项**。canvas 死枝 :3678-3790 是 `data-page-frame-selected`(:3735)、`data-page-frame-resize-handle`(:3764)、六个 `data-page-stack-*`(:3707,:3736-3739)的**唯一供货方**——静态门 assertContainsAll『Writing surface exposes PageFrame operable object controls』(selectedPageFrameId/onMovePageFrame/onResizePageFrame/data-page-frame-selected/data-page-frame-resize-handle)与『PageStack identity and collapsed-tail markers』(六 token)删枝即断。反之 data-page-frame-id/role/primary/exportable 在活的 blockList 容器 :3631-3634 另有供货,『runtime smoke attributes』门安全。:3651-3652 的 --canvas-world-width/height CSS 变量与 :3644 minHeight 三元同属此项。
- **裁决建议(已照准)**: 删但须连改静态门。删 :3678-3790 必须同批删/改 canvasRuntimeBoundaryCheck.mjs 两组断言(PageFrame operable 五 token、PageStack 六 token),否则 `npm run check:canvas-runtime-boundary` 立红。⛔按清册旧行号 3292/3340 下刀。

### 特项③ Canvas guides / outer boundary +56px 错位面

- **现物**: 现物在且**错位仍在**,未修(w4-fix6 按『退役面不投工』只记不修,claude-log 2026-09-09 §39/§41 两次登记入 13.6 清册)。
- **细节**: 错位根因在 NWSL:1000-1004 `createPageFrameGuides(surfaceMode === 'page' ? projectPageFrameToReadingSurface(frame, contract, pageOffsetX) : frame)` —— Page 臂走统一投影(F12 修毕,错位 152/266px→0),canvas 臂直接用 frame 的世界账;而块列走 layout.x + pageOffsetX 偏移账,两账不同源。同形结构在 :1025-1047(pageFrameSlotEntries 的 slotOffsetX)、:3665/:3672(PageFrameWallLayer/PaperInkLayer,均已 Page-only)。CANVAS_PRIMARY_PAGE_OFFSET_X=96(engineModel.ts:83);实测报 +56px 为 guides 相对块列的净差,未复算。零活引用、零静态门直断该三元。
- **裁决建议(已照准)**: 纯死可删(随第 16 项)。裁删即错位随之消失,**零修复成本**;若反向裁『复活』则必须先补 F12 同款单账改造(guides/slots/命中/移动预览四面统一走 resolveScreenRect),工作量远大于删——故不建议复活。

### 一·17 NWSL canvas shape/image/table/connector 渲染分支

- **现物**: 现物在,3591,3615,3647,3701→3885(VisualConnectorLayer)、3909(ImageObjectLayer)、3943(TableObjectLayer)、3999(ShapeObjectLayer),外加 4326 ObjectInspectorLayer 的 `surfaceMode === 'canvas' && !contentReadOnly` 注入。零改动。
- **细节**: 四个 Layer 全部 `{surfaceMode === 'canvas' && (` 包裹,产品不可达。静态门有四组 assertContainsAll 专断 NWSL 源码含这些 token:image 组 10 token(:1051-1061 ImageObjectLayer/createImageObjectProjection/uploadCanvasImageAsset/imageObjectSavePayload/imagePlacements/imageObjectById/buildImageObjectShellMenu/edit_image_caption/edit_image_alt_text/toggle_image_fit)、table 组、visual connector 组(:1042-1050)、Object Inspector 六 CSS 类(:1352-1358)。另有 CSS 类门:shape 五类、image 六类(:1337-1344 .canvasImageObject/.canvasImageOperable/.canvasImageSelected/.canvasImageMedia/.canvasImageCaption/.canvasImageResizeHandle)、table 五类。
- **裁决建议(已照准)**: 删但须连改静态门。四层 + Inspector 注入 + 第 14 项 handler 族 + 四组静态门断言 + 三组 CSS 类门,须作**一个不可分割的删除单元**;⛔碰数据结构/历史读/准备区画物身份/PaperInkLayer(Page 活)。

### 特项① CANVAS_MODE_RETIRED 门后的 image 面(ImageObjectLayer / createImageObjectAtPoint / imageObjectService)

- **现物**: 现物全在,且**媒体先遣(040c39b, 13.6)明令原地保留**:工单 ⛔ 条写死『⛔复活 canvas 模式/generic image 面(NoteWritingSurfaceLayer:3865/2794/2816 休眠门维持);⛔删改静态门断言的旧 image 符号(imageObjectService 五导出/十 token/六 CSS 类原地保留)』。媒体块另起炉灶(MediaBlockProjection + mediaBlockPasteService),仅复用 loadCanvasImageAssetBlobUrl 模式,未碰 ImageObjectLayer 本体。
- **细节**: 可达性核毕:ImageObjectLayer 只在 NWSL:3908 的 `surfaceMode === 'canvas' &&` 内挂载;createImageObjectAtPoint(:1695) 唯一入口链 = handleImageFileChange(:1754) ← triggerImagePickerAtPoint(:1743) ← 仅 :2884(canvas 空白右键,门在 :2823)与 :2913(canvas 页框右键)——两个入口均 canvas-only,**确认纯死**。静态门四处依赖:①canvasRuntimeBoundaryCheck.mjs:372-381 断 imageObjectService 含 createImageObjectProjection/imageObjectSavePayload 两 export + kind:'image'/backing:'asset'/objectClass:'media'/contentMount:null/asset_id/alt_text 共 8 token;②:924,:934 两条『Required runtime file exists』断 ImageObjectLayer.tsx 与 imageObjectService.ts 文件存在;③:1051-1061 NWSL 十 token;④:1121-1127 ImageObjectLayer DOM 标记;⑤:1337-1344 六 CSS 类。另 canvasEngineModelContractCheck.ts:44-46 直接 import createImageObjectProjection/imageObjectSavePayload。活测试:textFlowNavigation.surface.test.tsx:16 import createImageObjectProjection 作夹具。
- **裁决建议(已照准)**: 删但须连改静态门(且须先撤销媒体先遣的保留令)。删除必须打包五处门改 + canvasEngineModelContractCheck 的 import + textFlowNavigation.surface.test.tsx 夹具替换。**⛔复活**:媒体块第四族已覆盖『图片进纸』真需求,image CanvasObject 面无需求指向。若 13.6 不想承担门改成本,合法的保守裁决是『继续原地冻结』——但须把冻结写进裁决,不再挂『死代码』待删。

### 一·18 NWSL canvas zoom 控件 + canvas 专用 Inspector 注入

- **现物**: 现物在但**周边已被 Page 收编**:3911–3957→4242–4283(canvas zoom 控件,`surfaceMode === 'canvas' &&`);3993→4326(Inspector);清册标『Page reading controls :3903–3909 仍用 canvasZoomButton』的那段已涨到 :4210–4241 并**长胖**(E1/E3/C4 往里塞了 Selection/Pen/Eraser 三按钮 + ViewOptionsMenu + Overview 钮 + 加减档 + 百分比 output)。
- **细节**: Page 活用 canvasZoom* 的点已增至七处::4211 canvasZoomControl+pageReadingControl、:4215 canvasZoomButton(三工具按钮)、:4231 canvasZoomReset(Overview 钮)、:4235/:4238 canvasZoomButton(±档)、外加 **ViewOptionsMenu.tsx:88 `noteStyles.canvasZoomReset`(E1 新增,清册未载)**。canvas 死枝 :4242-4283 内是 canvasZoomControl/Button/Slider/Reset 四类 + 三个 data-canvas-zoom-* 属性,后者是静态门 :1163-1168 的唯一供货。
- **裁决建议(已照准)**: 删但须连改静态门。删 :4242-4283 须同删静态门 :1164-1166 三 token(第四条 'viewportTransform.zoom' 保留,Page 有供货);⛔按名字连坐 canvasZoomControl/Button/Reset——它们已是 Page 常驻控件;canvasZoomSlider 是唯一可随之删的 CSS 类(见二·26)。

### 一·19 writingEntryVisibility canvas 空白入口可见性

- **现物**: 现物在,60→原位 60。零改动。
- **细节**: `if (surfaceMode !== 'canvas') return false;` 早退——整个函数在运行态恒返 false,死。同文件其余导出被 meaningfulRenderableContent.test.ts:20 消费(Page 活语义),NWSL:48 从本文件 import。零静态门。
- **裁决建议(已照准)**: 纯死可删(该函数)。删前确认 meaningfulRenderableContent.test.ts 消费的是同文件其他导出而非此函数;⛔整文件删,Page 书写入口仍活。

### 一·20 pageFrameTypographyService canvas 沿用原 typography 的旁路

- **现物**: 现物在,62→原位 62。零改动。
- **细节**: `if (surfaceMode === 'canvas' || hasDocumentTypographyProfileOverride(metadata))` —— 左臂死,右臂(显式 profile override)活。Page 物理字号路径活。有配套 pageFrameTypographyService.test.ts。
- **裁决建议(已照准)**: 纯死可删(仅左臂)。条件退化为 `if (hasDocumentTypographyProfileOverride(metadata))`;删后跑 pageFrameTypographyService.test.ts 确认无 canvas 入参用例。

### 一·21 placementService canvas workspace 布局宽度/归一化分支

- **现物**: 现物在但**行号大幅漂移且文件被 13.6 媒体先遣改过**:351,410→361,369(surface==='canvas_workspace' 分类判据)、417–418、487、517、631、642。
- **细节**: 死活高度混居::417 `!(surfaceMode === 'page' && stored?.surface === 'canvas_workspace')`、:418/:487 `surfaceMode === 'canvas' && ...isWorkspaceLayout` 的 canvas 臂死;但 :91/:95/:107-108/:147-149/:166-177/:256-283/:355-361 的 canvas_workspace / canvas_world **读语义是活的**——它们是 v1/v2 坐标契约与退役闸(canvasRetirementPolicy.assertNoRetiredCanvasWrite)的供料判据,D1 墙的『存量宽度不得凭空造 workspace』分类也依赖它。
- **裁决建议(已照准)**: 拆分。可删:只有 `surfaceMode === 'canvas' &&` 前缀的那几个臂(:418,:487);⛔碰任何纯读的 canvas_workspace/canvas_world 判据——删了退役闸就没牙。删前须重跑坐标契约回归(coordinateContractIntegration.test.tsx / placementContractService.test.ts / genericPlacementContract.test.ts)。

### 一·22 无帧 workspace 生成器与 runtime reserve(shapeProjection:82 / imageObject:33 / tableObject:41 / engineModel:254–273)

- **现物**: 四处现物全在且**行号零漂移**(82/33/41/254–273)。零改动。
- **细节**: 三个服务各有同形兜底 `layout.surface === 'tray' ? 'tray' : layout.surface === 'formal_page' ? 'formal_page' : 'canvas_workspace'` —— 末臂是历史值再生产点。engineModel:254-273 buildPlacementFromReserve 硬写 `surface: 'canvas_workspace'`(:259);核毕其唯一生产调用链 useNoteCanvasLayoutModel.ts:290 传 `canvasObjectReserve: []`,**实际空转**,仅 viewportService:85-92 的死 world 计算消费。静态门:imageObjectService 见特项①;tableObjectService 有 :390- 八 export 断言;shapeProjectionService 有 visual_connector 组断言。现役发送统一经 canvasObjectRepository → canvasRetirementPolicy 写门。
- **裁决建议(已照准)**: 删但须连改静态门。末臂可改为 throw 或收敛到 'formal_page';engineModel reserve 族(:242-273 + types.ts:708 + useNoteCanvasLayoutModel:290 + viewportService:85-92)可整删。⛔把纯模型测试改成全 formal 来掩盖旧值(清册原戒律仍有效)。

### 二·23 CSS .pageCanvas 及后代、.documentShellCanvas

- **现物**: 现物在,6–9,67–72,93–98,112–115→11(新增活反向依赖)、39–45(.pageCanvas 本体)、107–118(.documentShellCanvas)。**B1e 在此区新写了活规则**。
- **细节**: CSS:11 `.page[data-note-host-mode='page']:not(.pageCanvas) { margin:-28px; box-shadow: 0 0 0 100vmax var(--sk-desk) }` 是 B1e『暖纸桌面铺满视口』的活规则,反向依赖死类名。:39-45 .pageCanvas 本体、:107-118 .documentShellCanvas 纯死(唯一挂载点 NoteCanvasRuntime.tsx:58 / NoteRuntimeDocumentLayer.tsx:62,均 canvas-gated)。
- **裁决建议(已照准)**: 删但须连改。删 :39-45 与 :107-118 时必须把 :11 的 `:not(.pageCanvas)` 一并去掉(语义等价,因 pageCanvas 宿主已不可达);⛔连坐同区的 .page 皮系统规则(:3-7,:19-36)。

### 二·24 CSS .pageCanvas .pageToolRail / .pageToolRailCanvas / .pageCanvas .insertPanel / .insertPanelCanvas

- **现物**: 现物在,903–910,950–957→862–863、909–910(B1a/B1d/B1e 三轮 CSS 改动致上移约 40 行)。
- **细节**: 已对实际引用:client/src 全库 grep,`pageToolRailCanvas` 与 `insertPanelCanvas` **零 TSX/TS 引用**(纯死);`.pageCanvas .pageToolRail` / `.pageCanvas .insertPanel` 是后代选择器,随 .pageCanvas 死。普通 .pageToolRail / .insertPanel 规则本体活,⛔连坐。
- **裁决建议(已照准)**: 纯死可删。删四条选择器(:862-863 与 :909-910 各自到花括号闭合为界),保留普通 rail/panel 规则。

### 二·25 CSS .writingSurfaceCanvas / .canvasPanReady / .canvasPanning

- **现物**: 现物在,1046–1050,1078–1085→1005–1035(.writingSurfaceCanvas)、1037–1039(.canvasPanReady)、1041–1044(.canvasPanning)。**B1d(9509220)在 CSS:20,30 新增了两条挂在 .writingSurfaceCanvas 下的皮肤后代规则**(死上加死)。
- **细节**: 新增耦合:`.page[data-note-skin-preset='workbench'] .writingSurfaceCanvas`(:20)与 `.page[data-note-skin-preset='warm-paper'] .writingSurfaceCanvas`(:30)——B1d 把 workbench 网格/暖纸桌面同时铺到 .page、.writingSurfaceCanvas、:global(.noteOverview) 三个选择器,中间那个是死类。**测试依赖**:pageCenteringContract.test.ts:47 `expect(cssRuleBody('.writingSurfaceCanvas')).toMatch(/left:\s*0\b/)` —— 该测试的 cssRuleBody 在规则缺失时显式 `expect(match).not.toBeNull()` 报错,删规则即红。挂载点 NWSL:3546 三元。
- **裁决建议(已照准)**: 删但须补/改替身测试。删除须打包三件:①NWSL:3546 三元;②CSS:1005-1044 三条规则;③从 CSS:20,30 的选择器列表中摘掉 .writingSurfaceCanvas 项(保留 .page 与 .noteOverview 两项,否则 workbench/warm-paper 皮掉样式);④改写 pageCenteringContract.test.ts:46-49 的『keeps canvas at zero presentation offset』用例——.writingSurface 的 `left: var(--page-centering-offset-x)` 断言(:47)是活的须留,只删 :48 那条。

### 二·26 CSS .canvasZoomSlider / .canvasZoomReset(及清册标注的 .canvasZoomControl / .canvasZoomButton 复用)

- **现物**: 现物在,1139–1145,1104–1137→1046–1061(.canvasZoomControl)、1063–1077(.canvasZoomButton,.canvasZoomReset 合并)、1079–1081、1083–1087、1089–1096(hover/focus 合并)、1098–1101(.canvasZoomSlider)。**复用面比清册记载的更广**。
- **细节**: 清册只记了 canvasZoomControl/canvasZoomButton 有 Page 复用;现核实 **.canvasZoomReset 也已被 Page 收编**:NWSL:4231(Overview 钮,Page 分支内)+ **ViewOptionsMenu.tsx:88 `noteStyles.canvasZoomReset`(E1 去盒新增,清册未载)**。四类中仅 `.canvasZoomSlider`(:1098-1101)是 canvas 专属——唯一消费者 NWSL:4257,在 `surfaceMode === 'canvas'` 死枝内。合并规则 :1063-1064(Button,Reset)与 :1089-1092(四个 hover/focus)不能整条删。
- **裁决建议(已照准)**: 拆分。仅 `.canvasZoomSlider`(:1098-1101)纯死可删;.canvasZoomControl/.canvasZoomButton/.canvasZoomReset **全部保留**(已实质复活为 Page 常驻阅读控件)。建议 13.6 顺手做一次**改名而非删除**(canvasZoom* → pageReading*),否则名字会长期误导下一轮死代码扫描——但改名须同步 ViewOptionsMenu.tsx:88、NWSL 七处、静态门若有 CSS 类断言。

### 二·27 CSS .blockListCanvas / .scratchWorkspaceLabel

- **现物**: 现物在,1207–1215,1590–1600→1268(.blockListCanvas)、1652(.scratchWorkspaceLabel)。
- **细节**: .blockListCanvas 唯一消费者 NWSL:3615 三元(canvas 臂);.scratchWorkspaceLabel 唯一消费者 NWSL:3774,位于 `surfaceMode === 'canvas' &&` 死枝(:3678)内。.blockListPage(:1272-) 是 Page 活用,⛔连坐。零静态门、零测试断言。
- **裁决建议(已照准)**: 纯死可删。删两条规则 + NWSL:3615 三元 canvas 臂 + :3774 一行;行尾以 selector 花括号为界(清册原纪律)。

### 二·28 global.css body.canvas-runtime-lock 两条规则

- **现物**: 现物在,29–36→原位 29,33。零改动。
- **细节**: `body.canvas-runtime-lock [data-app-main-scroll='true']`(:29)与 `body.canvas-runtime-lock [data-app-content-shell='true']`(:33)。class 由 NoteCanvasRuntime.tsx:26-36 effect 管理,该 effect 仅在 surfaceMode==='canvas' 时 add,运行态恒不触发。普通 app shell 样式(同文件其余)活。
- **裁决建议(已照准)**: 纯死可删。随第 4 项(NoteCanvasRuntime body lock effect)同批删。

### 特项② v2CanvasPersistenceCutover.test.ts 25 条陈旧红(STOP-1 裁定入册)

- **现物**: 现物在:文件 2743 行 / **49 个 test()**,其中 28 处 fixture 含 `canvas_workspace` 或 `'crossing'`。红因确认:server 侧退役闸 `server/src/services/canvasWritePolicy.ts:8-9` 抛 canvas_workspace_retired / canvas_crossing_retired,`server/src/validators/index.ts:775-778` zod refine 同源拒收,`routes/canvasObjects.ts:24-25` 转 400 —— **闸是活的产品门,红的是 13.2 旧夹具**,与 F10 diff 零交集(STOP-1 推理成立)。运行器为 node:test(非 vitest),入口 `npm run test:v2`。
- **细节**: **关键发现:红不是散落在 25 个用例里,而是集中在 4 个 fixture 工厂**——makeImageCanvasObjectPayload(:190-221)、makeTableCanvasObjectPayload(:223-)、以及 :423/:444 两处 payload 构造,全都硬写 `surface: 'canvas_workspace', boundary_role: 'outside'`。撞闸用例点名(按 test 名):Block CanvasObject identity(:610)、Block placement round-trips coordinate+Page boundary receipt(:654,显式断言 crossing/canvas_world 回读)、Block identity hardening migration(:1430)、Generic probe kind round-trip(:1502)、Shape round-trip(:1564)/delete cascade(:1607)、Visual Connector round-trip(:1635)/endpoint 校验(:1714)/endpoint 删除(:1781)、Block-backed Shape round-trip(:1830)/校验(:2008)/删除(:2050)、Paragraph projection trashed(:1927)、ContentGroupMember 软指针(:2227)、PageFrame kind-flip(:2310)等。**活语义那 5 条(STOP-1 附记所指)**:Image CanvasObject saves as asset-backed media(:685)、Image asset lifecycle keeps shared duplicate blobs(:727)、Course delete releases exclusive image assets(:764)、Course delete keeps cross-course shared assets(:790)、Course delete releases same-course shared assets(:826)——这 5 条测的是**图片资产 refcount/blob unlink/级联释放**,是货真价实的活红线(8.11 期 CR-8.11.7-02 孤儿资产坑的唯一锁),它们红**仅仅因为**共用 makeImageCanvasObjectPayload:202 那一行 surface。
- **裁决建议(已照准)**: 删但须补替身测试 —— 但本次核查给出**更省的主路径**:把 4 个 fixture 工厂里的 `surface: 'canvas_workspace'` 改为 `'formal_page'`、`boundary_role: 'outside'` 改为 `'inside'`,25 条红可一次性转绿,5 条图片资产活语义**原地保住、无需另写替身**。仅 :654『Block placement round-trips the coordinate and Page boundary receipt』(:666-681 显式断言回读 crossing/canvas_world)是真正的历史读用例,应保留并改造为『历史行可读 + 写门拒收』双断言(与 client 侧 canvasRetirementPolicy.test.tsx:36-49 同形)。⛔『只删不补』把 Course delete 资产释放用例一并删掉。删除前建议先跑一次基线确认实际红数(STOP-1 自陈『未跑改前基线,证伪则翻案』)。

### 骑墙项总表(死活混居,须按调用点拆分——不可整删)

- **现物**: 核毕共 9 项,已在上面各项逐条标注,此处汇总供裁决对照。
- **细节**: ①useViewportTransformController(保 viewportTransform+setViewportSize / 删五回调);②modePolicyService(保 createSurfaceModePolicy+getVisibleBlocksForSurface+createBlankDraftLayout 主体 / 删 transition 族+canvas snap 块);③viewportService(保 getPrimaryPageOffsetX 函数+Page world+getPageViewportCenteringOffsetX / 删三处 canvas 臂);④placementService(保全部 canvas_workspace/canvas_world **读**判据 / 删两个 `surfaceMode==='canvas' &&` 臂);⑤useRuntimeNaturalWritingController(保 :74-75,:127-131 历史读 / 删 canvasWorldSessionAuthority 三处);⑥NWSL 画物 handler 族(与画物层同生共死,不可半删);⑦NWSL overlay/drop(保 :3437,:3442 准备区落纸 / 删 :2645 canvas 臂+:3379-3390);⑧CSS canvasZoom 四类(仅 Slider 可删,其余已 Page 化);⑨toggle 传递链(只抽一根线,不动装配层)。
- **裁决建议(已照准)**: 拆分。建议 13.6 按此九项各开一条独立小刀,⛔合并成一次批量删除;每刀后跑 Page + 准备区 + 坐标契约 + Source 四组回归(清册原纪律 :61),并跑 `npm run check:canvas-runtime-boundary` + `npm run smoke:canvas-engine-model-contract` 两道静态门。

### 清册三·明确保留面复核(types/runtimeLayout/canvasSurfaceAuthority/持久化归一/几何服务族)

- **现物**: 全部现物在且**确实仍活**,零项需要改判。
- **细节**: types.ts:1-12、runtimeLayout.ts、shared/types/canvasSurfaceAuthority.ts 的 mode/surface/boundary/export-policy union 仍被活代码消费(placementService.ts:5 直接 import canvasSurfaceAuthority)。canvasPersistenceNormalizer / draftBlockPersistence / server Canvas mapper / 历史 035(:42,:425 仍读 canvas_workspace)/ 055-056 / 13.2 执行器 / Source materializer / events / 准备区 undo-redo 全未受影响。geometry.ts / pageFrameAffiliationService / layoutAffiliationService / exportPreviewService / ExportPreviewLayer / AI tree / badge / Inspector 历史识别均活,且 exportPreviewService 在媒体先遣(040c39b)中被**新写增强**(媒体块打印占位),canvasAiTreeService 被 engineModel.ts:24,444 活调用。
- **裁决建议(已照准)**: ⛔删(维持清册三原判)。特别提醒:`shape/image/table/connector` 类型与 CSS(:1310-1588 区)不能仅凭名称含 canvas 宣判死亡——本次核查确认该区 CSS 类正被 canvasRuntimeBoundaryCheck.mjs:1330-1358 四组类门断言,且其中 Object Inspector 六类经 NWSL:4326 注入(虽 canvas-gated,但属特项①/一·17 的整体单元,不得零散删)。
