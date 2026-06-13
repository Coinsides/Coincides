# CHANGELOG - V2.BN.8

## Changed - V2.BN.8.1 L3-L5 Layout Model Hook Seed

- 新增 `hooks/useNoteCanvasLayoutModel.ts`。
- 将 visible blocks resolution、resolved `blockLayouts`、default draft layout、PageFrame height、primary PageFrame、canvas block placements、runtime model composition 和 export preview model 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- 将 formula-like block 高度估算辅助函数从 `NoteCanvasRuntime.tsx` 迁入 `measurementService.ts`，让 root runtime 不再直接持有 formula preview height heuristic。
- `NoteCanvasRuntime.tsx` 继续保留 placement persistence callback、measured-height reflow decision、field draft -> text draft derivation 和 controller composition；本轮只收口 L3-L5 的 layout/model composition 边界。
- 本轮不改变 Page / Canvas mode 行为、layout payload、PageFrame 尺寸规则、export preview 分组、block measurement tolerance 或 persistence API。
- L3-L5 layout model hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L6/L9 Writing Surface Layer Seed

- 新增 `layers/NoteWritingSurfaceLayer.tsx`。
- 将 writing surface shell、block list data attributes、PageFrame boundary seed、scratch workspace label、snap guide rendering、visible block projection map、draft textarea、slash menu 和 empty prompt 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- `NoteCanvasRuntime.tsx` 继续持有 layout resolution、measurement reflow decision、field draft text derivation、draft persistence、slash command controller 和 placement callbacks，只把它们作为 props 注入 writing surface layer。
- `BlockEditorLayer` 与 `SlashMenuLayer` 不改变内部行为；本轮只改变它们被挂载的位置。
- 本轮属于 L6 block projection layer 与 L9 overlay layer 的交界 seed，不改变 block content truth、field value 写入、draft blur 保存、slash command 选择、snap guide 坐标或 empty prompt 文案。
- L6/L9 writing surface layer seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L9 Note Chrome And Floating Panel Layer Seed

- 新增 `layers/NoteChromeLayer.tsx`。
- 将顶部 note chrome、collapsed chrome、note info popover、more actions popover、export preview 入口编排从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- 将 Insert floating panel 与 source jump panel 从 `NoteCanvasRuntime.tsx` 迁入同一层文件中的 `NoteFloatingPanelLayer`。
- `NoteCanvasRuntime.tsx` 继续持有 controller / adapter / callback 边界，只把 title save、surface mode、layout mode、preview overlay、snap toggle、insert block、source jump close 等动作作为 props 传入 layer。
- 本轮属于 L9 floating overlay layer seed，不改变按钮顺序、popover 样式、insert 行为、source jump 内容、preview overlay state 或 top chrome collapsed state。
- L9 note chrome / floating panel layer seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L5/L7 Layout Draft Controller Hook Seed

- 新增 `hooks/useLayoutDraftController.ts`。
- 将 `layoutDrafts` state、单 block draft 写入/清理、note load reset、history draft merge、measured height draft update 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 仍保留 resolved `blockLayouts` 的计算，因为它目前需要等待 `useNoteCanvasDataAdapter()` 提供 `visibleBlocks` 后才能安全计算，避免在 data adapter 和 placement service 之间制造依赖环。
- `useNoteCanvasDataAdapter()`、`useBlockPlacementInteractions()`、`usePlacementHistory()` 继续通过 hook 暴露的 draft writer 工作，保持 layout persistence / undo history / move / resize 行为不变。
- 本轮属于 L5 placement service 与 L7 measurement / reflow service 的交界 seed，不改变 block layout truth、collision resolution、measurement tolerance 或 persistence payload。
- L5/L7 layout draft controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Layout Interaction Controller Hook Seed

- 新增 `hooks/useLayoutInteractionController.ts`。
- 将 `layoutMode` / `snapGuide` / `snapEnabled` state 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- Layout 按钮和 Snap alignment 开关现在调用 `toggleLayoutMode()` / `toggleSnapEnabled()`，并由 hook 统一清除当前 snap guide。
- `NoteCanvasRuntime.tsx` 继续把 `setLayoutMode` / `setSnapGuide` / `snapEnabled` 传给 placement interaction hook，保持 move / resize 行为不变。
- 本轮属于 L8 layout interaction state seed，不改变 snap 计算、guide 渲染、layout mode 视觉或 More actions 面板内容。
- L8 layout interaction controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Canvas Surface Pointer Controller Hook Seed

- 新增 `hooks/useCanvasSurfacePointerController.ts`。
- 将 document shell 空白点击清 selection、block list 空白点击清 selection、PageFrame 空白双击创建 draft 的交互编排从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接导入 `createBlankDraftLayout()`；snap on/off 下的新 draft 落点计算由 surface pointer controller 触发。
- 本轮保持既有行为：只有点到真正空白 surface / block list 时才取消选中，双击 PageFrame 空白处仍按 `surfacePolicy` 与 `snapEnabled` 创建 draft。
- L8 canvas surface pointer controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Block Selection Controller Hook Seed

- 新增 `hooks/useBlockSelectionController.ts`。
- 将 `focusBlockId` / `activeBlockId` / `selectedBlockId` state，以及 block focus / select / clear selection 编排从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 继续把 selection setters 传给 draft / slash / placement hooks，保持当前 block 创建、slash 转换、move / resize 的既有边界。
- block focus / select 仍写入 `editingTextInteraction(blockId)` / `selectedBlockInteraction(blockId)`，debug interaction state 不变。
- 本轮属于 L8 selection controller seed，不改变 block 视觉选中态、layout mode、drag / resize、空白双击创建或 surface click 清空行为。
- L8 block selection controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Draft Block Controller Hook Seed

- 新增 `hooks/useDraftBlockController.ts`。
- 将 draft block state、draft textarea focus / height effect、draft persistence、empty draft discard、draft activation 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 继续把 draft controller 暴露的 `draftText` / `draftTextRef` / `persistDraft` / `activateDraft` 接给 slash command controller，保持 `/` 创建或转换 block 的现有行为。
- draft textarea onChange 现在通过 `resizeDraftFromTextarea()` 进入 draft controller，不再由 runtime 主文件直接计算草稿高度。
- 本轮属于 L8 natural writing / blank draft creation 的 controller seed，不改变 draft block 视觉、保存 API 或 slash command 行为。

## Changed - V2.BN.8.1 L10 Surface Mode Controller Hook Seed

- 新增 `hooks/useSurfaceModeController.ts`。
- 将 `surfaceMode` state、`surfacePolicy` 派生、`pageOffsetX` 派生，以及 Page / Canvas mode toggle 的副作用从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接调用 `createSurfaceModePolicy()` 或 `getNextSurfaceMode()`；runtime 只消费 controller 返回的 mode / policy / toggle。
- mode toggle 仍会统一关闭浮层、清除 snap guide、取消当前 block selection，保持前序体验不变。
- 本轮属于 L10 Page / Canvas Mode Policy 的 controller seed，不改变 pan / zoom / viewport scroll 行为。

## Changed - V2.BN.8.1 L9 Floating Overlay Controller Hook Seed

- 新增 `hooks/useFloatingOverlayController.ts`。
- 将 top chrome collapsed state、Insert / Note info / More actions / Preview 的互斥浮层状态，以及 preview 中 block type / AI visibility / export status overlay toggles 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接调用 `openingMenuInteraction('noteInfo' | 'moreActions' | 'insert')` 或 `previewingInteraction()`；这些 interaction state 写入现在由 floating overlay controller 统一处理。
- Preview overlay toggle 状态仍然在关闭 preview panel 后保留，保持前序体验约定。
- 本次迁移不改变浮层视觉、位置或面板内容，只收口顶部 chrome / floating overlay state orchestration。
- L9 floating overlay controller hook seed 迁出后 client build passed。

## Changed - V2.BN.8.1 L9 Slash Command Controller Hook Seed

- 新增 `hooks/useSlashCommandController.ts`。
- 将 slash command 的 target state、命令过滤、template availability 判断、draft/block 文本触发检测、Esc / Ctrl+Enter 键盘处理和命令选择后的 template 转换流程从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接导入 `detectSlashTrigger`、`filterSlashCommands`、`findTemplateForCommand`、`removeSlashTrigger` 或 `getSlashMenuAnchor`。
- Slash menu rendering 仍由 `layers/SlashMenuLayer.tsx` 负责；本次迁移只抽离 controller / state orchestration，不改变菜单视觉或命令行为。
- `NoteCanvasRuntime.tsx` 继续提供 draft persistence、block save、template conversion、focus setter 和 interaction state setter 作为边界输入，后续可继续收口到 Floating Overlay Layer / overlay portal。
- L9 slash command controller hook seed 迁出后 client build passed。

## Changed - V2.BN.8.1 L8 Placement Interaction Session Hook Seed

- 新增 `hooks/useBlockPlacementInteractions.ts`。
- 将 block move / resize 的 pointer session orchestration 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接调用 `attachWindowPointerSession`，也不再内联 drag / resize session 的 pointermove / pointerup lifecycle。
- move / resize 仍复用 `interactionController.ts` 中已有的 layout calculation helpers，行为目标保持不变。
- `NoteCanvasRuntime.tsx` 继续提供 layout drafts、history、persistence 和 measurement suppression refs 作为边界输入，后续可继续收口到 placement writer / interaction controller。
- L8 placement interaction session hook seed 迁出后 client build passed。

## Changed - V2.BN.8.1 L3 Content Width Hook Seed

- 新增 `hooks/useCanvasContentWidth.ts`。
- 将 `NoteCanvasRuntime.tsx` 中的 content width state、`ResizeObserver` 和 `window.resize` 监听迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 继续使用 `contentWidth` 作为 block layout / visible block / PageFrame 计算输入，但不再直接拥有宽度监听职责。
- 这一步属于 L3 Viewport And World 的窄迁出，为后续 viewport / pan / zoom / world-screen transform 接管减少主 runtime 里的直接 DOM 监听。
- L3 content width hook seed 迁出后 client build passed。

## Added

- 新增 `docs/releases/V2.BN.8/` 局部密集文档区。
- 新增 `Canvas-Engine-Research/` 正式调研目录。
- 新增 `Canvas-Engine-Research/Outline.md` 和 `R0-R9/Summary` 调研报告。
- 新增 `README.md` 说明 V2.BN.8 文档区职责。
- 新增 `Workflow.md` 作为 V2.BN.8 debug / intensive workflow。
- 新增 `Engineering-Spec.md`。
- 新增 `Canvas-Engine-Architecture-Spec.md`。
- 新增 `Canvas-Engine-Interaction-Contract.md`。
- 新增 `Canvas-Engine-State-And-Data-Contract.md`。
- 新增 `Canvas-Engine-Spike-And-Benchmark-Plan.md`。
- 新增 `Canvas-Engine-Fallback-Strategy.md`。
- 新增 `Experience-Review.md`。
- 新增 `Review.md`。
- 新增 `client/src/pages/Notes/canvasEngine/` 第一版 engine seed：
  - `types.ts` 定义 NoteCanvas / PageFrame / BlockPlacement / CanvasObject reserve / RelationEndpoint reserve；
  - `geometry.ts` 定义 world/screen coordinate transform、viewport rect、visible block 计算；
  - `engineModel.ts` 定义 `Self-owned Minimal Hybrid NoteCanvas Engine` 的 runtime model seed。

## Changed

- 将 `docs/releases/V2.BN.8-plan.md` 迁移为 `docs/releases/V2.BN.8/Plan.md`。
- V2.BN.8 plan 将在局部文档区内继续维护，避免旧位置和新位置长期并存。
- 锁定 V2.BN.8 第一版推荐路线为 `Self-owned Minimal Hybrid NoteCanvas Engine`。
- 更新 `Plan.md`、`Workflow.md`、`Engineering-Spec.md`、Canvas Engine specs 和 Roadmap，使其引用调研结论和路线排除理由。
- `NoteDetail.tsx` 轻量接入 `noteCanvasRuntime`：
  - 当前 UI 仍沿用 V2.BN.1-V2.BN.5 打磨出的写作体验；
  - block list 带上 engine version / route / visible block / page frame data attributes；
  - formal PageFrame width、canvas world width 从 engine seed 读取；
  - `better_notebook_layout` payload 预留 `rotation`，版本标记升为 `V2.BN.8`。

## Not Changed

- 尚未重写真正的 viewport pan / zoom / hit-testing / virtualization runtime。
- 没有新增 migration。
- 没有把外部 engine 引入为主 runtime。

## Next

- 基于 engine seed 继续实现第一版 visible window / hit-testing / overlay portal。
- 做 server build 和 browser smoke。
- 根据 smoke 结果更新 Review / Experience Review。
## Added - V2.BN.8.1 Planning

- 新增 `V2.BN.8.1-Runtime-Replacement-Plan.md`，作为 Canvas Engine 第一个小版本的逐层接管蓝图。
- 明确 `V2.BN.8.1` 的目标是让 Canvas Engine 接管旧 `NoteDetail.tsx` runtime，使 `NoteDetail.tsx` 退化为 route/data shell。
- 明确本地测试数据 reset 策略：停止 server、备份 `server/coincides.db*`、重建本地 dev database、重新创建 smoke account/project/note。

## Changed - V2.BN.8.1 L0-L1

- 完成 V2.BN.8.1 startup baseline：
  - 当前 branch 确认是 `codex/v2-bn-canvas-engine`；
  - client build passed；
  - server build passed；
  - `NoteDetail.tsx` 仍是旧 runtime 主体，`canvasEngine/` 仍是 seed。
- 完成本地 dev data reset：
  - 旧 `server/coincides.db*` 已备份到 `.codex-tmp/local-db-backups/20260612-155215`；
  - 本地 `server/uploads` 测试文件已备份并清空；
  - 新 dev database 已通过 `initDb()` 重建；
  - 已创建本地 smoke account / Project / Note。

## Changed - V2.BN.8.1 L2

- 将旧 `NoteDetail.tsx` 中的大段 runtime 主体迁入 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx`。
- 将 `NoteDetail.tsx` 缩成 route shell：
  - 读取 `noteId`；
  - 通过 `NoteCanvasRuntimeProvider` 注入 runtime context；
  - 渲染 `NoteCanvasRuntime`。
- 新增 `NoteCanvasRuntimeProvider.tsx` 和 `hooks/useNoteCanvasRuntime.ts`，作为后续 viewport、placement、overlay、interaction 分层接管的上下文入口。
- `canvasEngine/index.ts` 导出 runtime provider。
- L2 迁移后 client build passed。

## Changed - V2.BN.8.1 L2 Data Adapter Seed

- 新增 `hooks/useNoteCanvasDataAdapter.ts`。
- 将 note / blocks / template options / source anchors / block CRUD / title save / source jump target loading 从 `NoteCanvasRuntime.tsx` 迁入 data adapter hook。
- `NoteCanvasRuntime.tsx` 继续负责 focus、draft、selection、placement draft、interaction state 和 canvas UI composition。
- `canvasEngine/index.ts` 导出 `useNoteCanvasDataAdapter`。
- L2 data adapter seed 抽离后 client build passed。

## Changed - V2.BN.8.1 L11 Placement History Seed

- 新增 `hooks/usePlacementHistory.ts`。
- 将 placement move / resize 的 undo stack、redo stack 和 Ctrl+Z / Ctrl+Y keyboard listener 从 `NoteCanvasRuntime.tsx` 迁入 placement history hook。
- `NoteCanvasRuntime.tsx` 继续提供 layout draft application 和 layout snapshot persistence callbacks。
- `canvasEngine/index.ts` 导出 `usePlacementHistory`。
- L11 placement history seed 抽离后 client build passed。

## Changed - V2.BN.8.1 L3-L4

- 新增 `viewportService.ts`，集中处理 runtime viewport / world / primary page offset seed。
- 新增 `pageFrameService.ts`，集中处理 default draft placement、PageFrame height 和 runtime PageFrame 构造。
- `NoteCanvasRuntime.tsx` 不再直接手写 viewport/world/PageFrame 构造。
- Canvas mode 下 PageFrame height 不再使用完整 workspace height，改为 formal page 内容底部驱动，避免把 PageFrame 撑成巨大空白。
- L3-L4 抽离后 client build passed。

## Changed - V2.BN.8.1 L5

- 新增 `placementService.ts`，集中处理 placement 读写和布局计算。
- 从 `NoteCanvasRuntime.tsx` 迁出：
  - `readStoredLayout`；
  - `isCanvasWorkspaceBlock`；
  - `normalizeBlockLayout`；
  - `buildDefaultBlockLayouts`；
  - `buildLayoutPayload` / `writeLayoutOverride`；
  - `layoutsEqual` / `buildLayoutHistoryEntry`；
  - `getBoundaryKind`；
  - `getEffectiveExportRole` / `getEffectiveAIVisibility`；
  - `resolveStackedLayoutCollisions`；
  - `reflowLayoutsAfterHeightChange`；
  - `snapToTargets` / `applyMoveSnap`。
- `placementService.ts` 使用泛型 placement seed，不直接绑定 `NoteBlock`，为后续 CanvasObject placement 预留接口。
- L5 抽离后 client build passed。

## Changed - V2.BN.8.1 L7 Seed

- 新增 `measurementService.ts`。
- 新增 `hooks/useBlockMeasurement.ts`。
- 从 `NoteCanvasRuntime.tsx` 迁出第一批 measurement seed：
  - textarea content resize；
  - block DOM content height measurement；
  - text block estimated height。
- `measurementService.ts` 新增 measured height / resized layout -> placement reflow application helpers：
  - `applyMeasuredBlockHeightToLayouts`；
  - `applyMeasuredBlockLayoutToLayouts`。
- `BlockEditorLayer.tsx` 不再直接拥有 `ResizeObserver` / block content height measurement wiring。
- `NoteCanvasRuntime.tsx` 仍保留 React state update entrypoint，但不再直接拼装 measured height / resize reflow。
- L7 seed 抽离后 client build passed。

## Changed - V2.BN.8.1 L6/L9 Layers

- 新增 `blockContentService.ts`，集中处理 block content truth / projection helper：
  - field values 读取；
  - definition / formula fields；
  - structured block save payload；
  - plain text projection；
  - presentation kind detection；
  - formula preview text。
- 新增 `runtimeDataTypes.ts`，把 Note / NoteBlock / SourceAnchor / SourceJumpTarget 从 runtime 主文件迁出。
- 新增 `layers/BlockEditorLayer.tsx`，把 block DOM projection 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- 新增 `layers/SlashMenuLayer.tsx`，把 slash command menu 渲染迁入 floating overlay layer seed。
- 新增 `SlashMenuAnchor` runtime layout type。
- `NoteCanvasRuntime.tsx` 不再内联 slash menu 渲染函数。
- `NoteCanvasRuntime.tsx` 不再内联 `BlockEditor` 组件本体。
- L6/L9 layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L9 Overlay Preview Layer

- 新增 `overlayService.ts`，把 slash menu anchor 计算从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `exportPreviewService.ts`，集中生成 export preview model、row label、AI visibility label 和 export role label。
- 新增 `layers/ExportPreviewLayer.tsx`，把 export preview panel 与 preview group rendering 从 runtime 主文件迁出。
- `NoteCanvasRuntime.tsx` 继续保留 preview 开关状态和 callbacks，但不再内联 preview panel 结构。
- L9 overlay preview layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L9 Block Control Bar Layer

- 新增 `layers/BlockControlBarLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 block control bar 的移动、导出、AI 可见性、保存、删除按钮结构。
- block control bar 仍复用当前 block 内部定位样式，后续再接入 selected block anchor / overlay portal / z-index service。
- L9 block control bar layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L9 Source Reference Layer

- 新增 `layers/BlockSourceReferenceLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 source reference badge 和 View source jump button。
- source jump 仍是 block 内 entry seed，后续再接入统一 source jump overlay / z-index service。
- L9 source reference layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L6 Status Badge Layer

- 新增 `layers/BlockStatusBadgeLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 block type、AI visibility、export status、Page boundary badges。
- status badges 仍是 projection sublayer，后续是否 viewport overlay 化取决于 preview/debug overlay 体验。
- L6 status badge layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L6 Block Projection Sublayers

- 新增 `blocks/DefinitionBlockProjection.tsx`。
- 新增 `blocks/FormulaBlockProjection.tsx`。
- 新增 `blocks/TextBlockProjection.tsx`。
- 新增 `layers/BlockResizeHandleLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 Definition / Formula / Text 的具体 JSX projection。
- `BlockEditorLayer.tsx` 不再内联 resize handle。
- `BlockEditorLayer.tsx` 继续保留 block shell 和 control/source/status/content sublayer composition，后续再迁入 shell boundary / selected overlay anchor。
- L6 block projection sublayers 抽离后 client build passed。

## Changed - V2.BN.8.1 L8/L10 Seeds

- 新增 `interactionController.ts`，建立 Canvas Engine 第一版 interaction state boundary：
  - idle；
  - hoveringBlock；
  - selectedBlock；
  - editingText；
  - draggingBlock；
  - resizingBlock；
  - panningCanvas；
  - openingMenu；
  - previewing。
- `NoteCanvasRuntime.tsx` 开始在 block focus/select、drag、resize、slash menu、preview、info/more/insert panel 等入口写入 interaction state。
- canvas root 新增 interaction debug data attributes，方便后续 smoke 和 browser harness 验证：
  - `data-canvas-interaction-mode`；
  - `data-canvas-interaction-target`；
  - `data-canvas-interaction-block`。
- `interactionController.ts` 新增 drag/resize layout calculation helpers：
  - `calculateDraggedBlockLayouts`；
  - `calculateResizedBlockLayouts`。
- `interactionController.ts` 新增 `attachWindowPointerSession`，集中处理 drag / resize 期间的 window pointermove / pointerup session lifecycle。
- `NoteCanvasRuntime.tsx` 不再内联 drag move / resize move 的布局计算，也不再直接 add/remove window pointer listeners。
- `NoteCanvasRuntime.tsx` 仍暂时保留 begin move / begin resize session orchestration、finish callbacks 和 React state entrypoint。
- 新增 `modePolicyService.ts`，集中处理第一批 Page/Canvas policy：
  - visible block filtering；
  - PageFrame offset；
  - mode label；
  - collision resolve policy；
  - elastic avoidance policy；
  - blank double-click draft placement。
- 双击空白创建 block 的规则调整为：
  - Page mode + snap alignment on：进入自然写作流；
  - snap alignment off 或 Canvas mode：落在双击位置。
- L8/L10 seed 抽离后 client build passed。
- L8 pointer session helper 抽离后 client build passed。
