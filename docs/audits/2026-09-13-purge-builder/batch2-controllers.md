> **状态 (Status)**: completed (builder controller slice; final aggregate verification belongs to root)
> **日期 (Updated)**: 2026-09-12 (America/Toronto; order/evidence directory uses 2026-09-13)
> **范围**: purge order batches 2/3 controller and navigation fixtures; no Git calls

# 批二控制器/服务收据

按图纸一·6/7/8/10/12/21拆死枝。Page工厂、可见性过滤、草稿snap早退、viewport状态与setViewportSize、Page焦点requestAnimationFrame滚动仍在；canvas专用policy分流、snap、viewport seed/world/offset、草稿authority三块及五个viewport回调已拆。五回调及props传递与root的NWSL删除同刀；focusViewportOnRect保Page滚动。viewportService的reserve类型/死options另由model分片接续，勿重复计数。

placementService只拆两个canvas宽度臂；原417的模式+历史surface读判据保留，所有canvas_world/canvas_workspace历史分类、坐标工具、Page authority/恢复收据判据保留。第一次定向曾因把417误简化成单surface条件而红5条，立即恢复原式后仅固定宽夹具缺manual红1条；最终生产只保留图纸两刀，历史fixture按下面补齐固定宽契约后103/103绿。未修改分类生产逻辑或放宽历史断言。

## 夹具迁移与死断言退役清单

| 文件 | 精确处置 |
|---|---|
| textFlowBlockNavigation.test.tsx | STOP-2方案：宿主canvas→page，real Layout上下两块canvas_workspace→formal_page；保历史同排坐标测试；原130条expect表达式逐字保留，34/34通过。 |
| useCanvasSurfacePointerController.test.tsx | 按补遗一明确退役canvas×0.5与canvas×1.5两场景；Page两个场景继续运行；唯一混合宽度断言`surfaceMode === 'page' ? 640 : 760`收敛640，坐标和激活断言逐字保留。 |
| useSurfaceModeController.test.tsx | 批二仅退役G-X1中`getVisibleBlocksForSurface(...createSurfaceModePolicy('canvas')...).toEqual(mixedSpecimen)`的死canvas可见性断言；Page过滤断言原样留；批四替身见另一收据。 |
| surfaceAuthorityContract.test.ts | 历史outside-left/right两参数夹具的width=100/120补`width_mode:'manual'`，明确固定几何，避免再借已删canvas分支保宽；仍测试canvas_world/canvas_workspace历史读，未迁成全formal。原23条assertion逐字保留，全部历史边界/坐标断言绿。 |
| layers/textFlowNavigation.surface.test.tsx | 随批三NWSL画物层退出，把宿主迁Page，块坐标迁page_frame_local/formal_page，旧generic image/table障碍物改为Page media与item_ref壳（原第三个item_ref仍在）；增加jsdom缺失URL.revokeObjectURL替身。两个完整导航用例保留。仅退役3条`data-canvas-*-selected`断言（循环selected=true、image=false、table=false）；原18条expect中15条逐字保留，包括双向焦点、Shift阻挡、Enter/x不编辑、原anchor、无写入。active清除断言原表达式留，前提由canvasObjectId改为非末尾文本目标，防变成不执行的空断言。 |

## 验证

- [mode/pointer/TextFlow](batch2-mode-pointer-after.log)：3文件44/44通过（当时surface桥测试仍8条）。
- [viewport/natural/Page](batch2-viewport-natural.log)：7文件102/102通过，runner明确exit0；PowerShell将测试预期stderr包装为NativeCommandError，记录不冒充测试红。
- [placement/坐标](batch2-placement-final.log)：8文件103/103通过，包含coordinateContractIntegration、placementContractService、genericPlacementContract、surfaceAuthorityContract、placementAutoWidth、mediaBlockLayout、boundaryAccount、useBlockPlacementInteractions。
- [导航真组件](batch3-navigation-surface-final.log)：2/2通过。
- [最终控制器组合](controllers-all-final.log)：8文件67/67通过。
- [逐字断言审计](controllers-assertion-preservation.log)：用TypeScript AST读取基线和现文的expect/assert表达式，记录原字节留存及唯一删除项。TextFlow生产文件零改动。
- [numstat](controllers-numstat.md)：基线为续工前保存的源码快照，不调用Git；共享文件勿在总表重复叠加。

最终[类型门](controllers-typecheck-green.log)：client tsc、shared声明构建、server tsc全部exit0。静态门改红由root与model分片记录；本分片没有修改任何client/scripts门。

## NWSL剩余props收口

root完成消费侧删除后追加下刀：NWSL接口及writingSurface装配、三个层fixture删15个死字段：onPushStructuredMutationHistory、onAddPageBelow、onCreatePageFrame、onCreatePageStack、onDeletePageFrame、onDetachPageFromStack、onDuplicatePageFrame、onMovePageFrame、onSelectPageFrame、onResizePageFrame、onSetPrimaryPageFrame、onTogglePageStackCollapse、onForgetBlockLocally、onRestoreBlockById、onViewportSizeChange。主runtime删4个仅给NWSL的输出，presentation仅抽onMove/onResize输出；Chrome仍消费的PageFrame callbacks保留。hook的setViewportSize保留。

**selectedPageFrameId核为活件并保留**：NoteRuntimeDocumentLayer把writingSurfaceProps交给NoteOverviewLayer，OverviewInput通过Pick借此字段显示当前选择；不能因NWSL自身不解构便删。曾移除时类型门精确报OverviewInput断链，立即原样恢复字段、传递及fixture。

`NoteRuntimeDocumentLayer.test.tsx`额外退役两条`expect(props.onMovePageFrame).not.toHaveBeenCalled()`及对应mock赋值；这两个回调随唯一画布消费口删除，属死写入口断言。两个用例本身留，Page头/正文坐标、原布局JSON、onPersistCanvasObject/onSaveBlock零写断言原样留。Overview的writers列表仅摘4个已删除的PageFrame专用回调，其他写回调仍全受零写断言覆盖。

[props定向](controllers-props-final-tests.log)：NoteRuntimeDocumentLayer 15、pageFrameAlignment 23、textFlowNavigation.surface 2、runtimeController 3、runtime pageReading 3，共5文件46/46通过。NWSL主文件与这两个root共享fixture的整文件numstat由root总表统一计数，本分片局部表不重复归算整块NWSL删除。

## 最终全库回扫补刀

root全库1571/1572定位到`useNoteCanvasLayoutModel.affiliationVisibility.test.tsx` K-2：crossingBlock夹具要求固定120px几何，却仍靠已删canvas自动保宽；与surfaceAuthority固定宽夹具同因。本分片仅给该crossingBlock补`width_mode:'manual'`，不改任何expect或历史canvas世界坐标/越界分类值。workspace-only负控仍留；K-1/K-2两用例均绿。

经root续派，一·14新孤儿`handleMovePageFrame`/`handleResizePageFrame`已核全库仅余定义，同族删除其本体与专属imports/两个options输入及主runtime传递。保留PageFrame CRUD全部其他handler、Page滚动聚焦、layoutAffiliationService和pageFrameCollectionService几何历史工具。未删任何live几何service。

[末次定向](controllers-presentation-fixture-final.log)：上述affiliationVisibility 2、runtimeController 3、NoteRuntimeDocumentLayer 15、pageFrameAlignment 23，共4文件43/43；[client即时类型](controllers-presentation-typecheck.log)exit0。

**新增门改因果红**：[正确client工作目录原日志](batch3-presentation-boundary-causal-red.log)。门名`Runtime presentation controller routes PageFrame object geometry updates`；唯一删除供货方的9 token为movePageFrameInCollection、resizePageFrameInCollection、handleMovePageFrame、handleResizePageFrame、onMovePageFrame、onResizePageFrame、movePageFrameAffiliatedBlockLayouts、onPersistChangedBlockLayouts、onApplyBlockLayoutDrafts。门改与绿色证明交root同批收口。`batch3-presentation-boundary-red.log`是误从repo根运行导致找不到src路径的无效演示，仅保留原日志，不计因果证据。
