# CHANGELOG - V2.BN.8

## Changed - V2.BN.8.1 Non-Browser Verification Refresh

- 刷新 `V2.BN.8.1` 非浏览器验收证据：
  - `npm run build:client` passed；
  - `npm run smoke:canvas-engine-performance` passed；
  - `server/npm run build` passed；
  - `git diff --check` passed；
  - changed-file secret scan 无新增文件可扫。
- `Review.md` 明确记录：Browser Harness 暂按 Henry 指示延后到全部工程完成后统一跑。
- `Open-Issue-And-Brainstorm-Checklist.md` 明确区分 `V2.BN.8.1` runtime replacement 硬门槛与后续 `V2.BN.8.x` polish backlog。
- 新增 `V2.BN.8.1-Layer-Acceptance-Audit.md`，逐层记录 L0-L12 当前证据、剩余硬门槛和后续 polish backlog。
- 新增 `V2.BN.8.1-Final-Smoke-Protocol.md`，固定最终 Browser Harness / Henry manual pass 的执行范围与记录格式。
- 记录最终 Browser Harness retry 仍被 Chrome remote debugging authorization / CDP websocket handshake timeout 阻塞；本小版本仍不能关闭。

## Changed - V2.BN.8.1 Runtime Presentation Controller Seed

- 新增 `hooks/useRuntimePresentationController.ts`，把 PageFrame / Canvas runtime model composition 与 `NoteChromeLayer` / `NoteRuntimeDocumentLayer` props composition 收进一个 L4/L9/L12 presentation boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useRuntimeFrameModelController()` 或 `useNoteCanvasLayerProps()`。
- `useNoteCanvasLayerPropsInput` 现在作为导出类型供 presentation controller 复用，避免重复手写 layer props contract。
- 本轮不改变 PageFrame height、export preview、chrome props、writing surface props、floating panel props 或任何用户可见行为。

## Changed - V2.BN.8.1 Runtime Layer Props Side Effect Boundary Seed

- `useNoteCanvasLayerProps()` 现在自己读取 route navigation 和 favorite toast callback，不再要求 `useNoteCanvasRuntimeController()` 传入 `navigate` 或 favorite `addToast`。
- `useRuntimeBlockOperationsController()` 现在自己读取 slash/natural-writing 所需的 toast callback，不再要求 runtime root 传入 `addToast`。
- `useNoteCanvasRuntimeController()` 不再直接导入 `useNavigate()` 或 `useUIStore()`；root 继续只组合 runtime controllers、frame model 和 layer props。
- 本轮不改变返回 Project、Favorite 提示、slash command disabled/template warning toast 或任何用户可见行为。

## Changed - V2.BN.8.1 Runtime Block Operations Controller Seed

- 新增 `hooks/useRuntimeBlockOperationsController.ts`，把 block lifecycle history、natural writing、structured field editing、measured reflow、move / resize placement interaction 组合进一个 L6/L7/L8/L11 block operations boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useRuntimeBlockHistoryController()`、`useRuntimeNaturalWritingController()`、`useRuntimeBlockEditingController()` 或 `useRuntimePlacementInteractionController()`。
- 本轮不改变 create / trash / undo-redo、slash command、draft persistence、Definition / Formula field draft、measured height reflow、move / resize、snap 或 elastic avoidance 行为，只继续压缩 runtime root 对 block operation 细节的直接感知。

## Changed - V2.BN.8.1 Runtime Document Data Controller Seed

- 新增 `hooks/useRuntimeDocumentDataController.ts`，把 layout draft state、note load reset、note data adapter 和 note-level source stats 组合进一个 L2/L5/L6 document data boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useLayoutDraftController()`、`useNoteLoadResetController()`、`useNoteCanvasDataAdapter()` 或 `useRuntimeDocumentStatsController()`。
- 本轮不改变 note/block API、layout draft truth、source reference count、title 保存、block 创建/保存/删除或 source jump 行为，只继续压缩 runtime root 的 document data composition。

## Changed - V2.BN.8.1 Runtime Surface State Controller Seed

- 新增 `hooks/useRuntimeSurfaceStateController.ts`，把 interaction state、layout/snap mode、floating overlay、block selection、surface mode 和 layout refs 组合进一个 L8/L9/L10 surface state boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useRuntimeInteractionController()`、`useRuntimeLayoutRefsController()`、`useLayoutInteractionController()`、`useFloatingOverlayController()`、`useBlockSelectionController()` 或 `useSurfaceModeController()`。
- 本轮不改变 Page / Canvas 切换、preview / insert / more / info overlay、block 选中、layout mode、snap on/off 或 measured reflow suppression 行为，只继续压缩 runtime root 的 surface state composition。

## Changed - V2.BN.8.1 Runtime Natural Writing Controller Seed

- 新增 `hooks/useRuntimeNaturalWritingController.ts`，把 draft block lifecycle、slash command controller 和 blank surface pointer creation/selection clearing 组合进一个 L8/L9/L10 natural writing boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useDraftBlockController()`、`useSlashCommandController()` 或 `useCanvasSurfacePointerController()`。
- 本轮不改变 draft 持久化、`/` 命令、Ctrl+Enter、新 block 落点、snap on/off 或空白点击取消选中行为，只继续压缩 runtime root 的自然写作入口 composition。

## Changed - V2.BN.8.1 Runtime Placement Interaction Controller Seed

- 新增 `hooks/useRuntimePlacementInteractionController.ts`，把 block move / resize interaction session 与 text height estimate dependency 收进一个 L5/L7/L8 controller boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useBlockPlacementInteractions()`，也不再直接导入 `estimateBlockHeightForText()`。
- 本轮不改变 move / resize、snap、elastic avoidance、layout history 或 measured reflow 行为，只继续压缩 runtime root 对 placement interaction 细节的感知。

## Changed - V2.BN.8.1 Runtime Document Stats Controller Seed

- 新增 `hooks/useRuntimeDocumentStatsController.ts`，把 note-level source reference count 从 runtime root 中迁出。
- `useNoteCanvasRuntimeController()` 不再直接使用 `useMemo()` 计算 `sourceReferenceCount`，而是消费 document stats controller 的输出。
- 本轮不改变 source reference truth、Note chrome 展示、Preview 统计或 Source Library 行为，只继续压缩 runtime root 的 document stats composition。

## Changed - V2.BN.8.1 Runtime Block Editing Controller Seed

- 新增 `hooks/useRuntimeBlockEditingController.ts`，把 structured field draft update 和 measured block height reflow 组合进一个 L6/L7 block editing boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useBlockFieldDraftController()` 或 `useMeasuredBlockReflowController()`。
- 本轮不改变 Definition / Formula 字段 truth、不改变 measured height reflow、不改变 active structured block 展开推开下方 block 的行为，只继续压缩 runtime root 的 block editing composition。

## Changed - V2.BN.8.1 Runtime Frame Model Controller Seed

- 新增 `hooks/useRuntimeFrameModelController.ts`，把 PageFrame height、primary PageFrame、Canvas runtime model、relation endpoint reserve 和 export preview model 的组合放进 L4 frame model boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useNoteCanvasFrameModel()`。
- 本轮不改变 PageFrame 计算、workspace policy、export preview 内容、relation endpoint reserve 或用户可见布局，只继续压缩 runtime root 的 frame/model composition。

## Changed - V2.BN.8.1 Runtime Layout Model Controller Seed

- 新增 `hooks/useRuntimeLayoutModelController.ts`，把 content width、visible blocks、resolved block layouts、default draft layout 和 layout persistence callbacks 组合进一个 L3-L5 controller boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useCanvasContentWidth()`、`useNoteCanvasResolvedLayoutModel()` 或 `useLayoutPersistenceController()`。
- 本轮不改变 placement 计算、Page / Canvas mode policy、layout draft truth、layout persistence payload 或用户可见行为，只继续压缩 runtime root 的 layout/model composition。

## Changed - V2.BN.8.1 Runtime Block History Controller Seed

- 新增 `hooks/useRuntimeBlockHistoryController.ts`，把 `usePlacementHistory()` 与 block trash history glue 从 `useNoteCanvasRuntimeController()` 中迁出。
- `useNoteCanvasRuntimeController()` 继续组合 runtime controllers，但不再直接拥有 placement history hook 或 toolbar trash 后的 history 登记逻辑。
- `trashBlock()` 成功后登记 `trashedBlock` history 的行为保持不变；draft 创建仍直接接入 `pushCreatedBlockHistory`。
- 本轮不改变 create / trash / undo / redo 的用户可见行为，只继续压缩 runtime root 的历史状态边界。

## Changed - V2.BN.8.1 Runtime History Direct Draft Bridge Cleanup

- `useNoteCanvasRuntimeController()` 不再用 `pushCreatedBlockHistoryRef` 桥接 draft 创建历史。
- `usePlacementHistory()` 现在在 draft controller 之前初始化，`onDraftPersisted` 直接接入 `pushCreatedBlockHistory`。
- 该改动不改变 create / trash / undo / redo 行为，只减少 runtime root 内的临时 ref glue。

## Added - V2.BN.8.1 Canvas Engine Performance Seed

- 新增 `npm run smoke:canvas-engine-performance`，作为不依赖浏览器的 Canvas Engine 纯逻辑性能 seed。
- 覆盖 50 blocks、200 blocks、long paragraph、formula-heavy、page + workspace mixed note 五个场景。
- 该 seed 调用 `placementService` / `engineModel` 的生产纯函数，验证 placement、reflow、snap、runtime model、relation endpoint reserve 和 layout history diff 的基础路径。
- 本 seed 不替代 Browser Harness 或 Henry 手动体验验收；它只证明核心布局模型在非 DOM 场景下没有明显算法退化。

## Changed - V2.BN.8.1 Runtime History Keyboard Intent Service Seed

- 新增 `historyService.ts`，集中定义 `RuntimeHistoryEntry`、`RuntimeHistoryKeyboardIntent` 和 `getRuntimeHistoryKeyboardIntent()`。
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 的按键意图判断从 `usePlacementHistory()` 中迁出，进入纯 history service。
- `usePlacementHistory()` 继续持有 undo / redo stacks 和真实数据 mutation callbacks，但不再自行解释快捷键语义。
- 本轮不改变 move / resize / create / trash 的 undo-redo 行为，也不实现 source / relation / inline formula undo。

## Changed - V2.BN.8.1 Surface Mode Transition Policy Seed

- `modePolicyService.ts` 新增 `SurfaceModeTransitionPolicy` 和 `createSurfaceModeTransitionPolicy()`。
- Page / Canvas 切换时的 transient cleanup 规则现在由 mode policy 产出：关闭 overlay、清空 snap guide、清除 block selection。
- `useSurfaceModeController()` 不再自行决定这些副作用，只执行 mode policy 返回的 transition record。
- 本轮不改变 Page / Canvas 的用户可见行为，也不实现 pan / zoom；它只是 L10 mode policy 的进一步收口。

## Changed - V2.BN.8.1 Overlay Callers Anchor Record Migration

- `getSlashMenuAnchor()`、`getBlockControlAnchor()` 和 `getTooltipAnchor()` 现在先创建 `ViewportOverlayAnchor`，再通过 `placeAnchoredOverlay()` 进入 shared placement helper。
- 这让当前三个真实 overlay 调用点开始使用 normalized anchor record，而不是各自直接把 DOM rect 塞进 placement helper。
- 本轮不改变用户可见 placement 行为；DOM rect 仍是当前 fallback 来源，后续再逐步替换为真正的 world/caret anchor。
- 这一步关闭 “individual overlay callers 尚未全面迁移到 anchor record” 的第一版技术缺口，但不关闭完整 caret/world anchor service。

## Changed - V2.BN.8.1 World Overlay Anchor Seed

- `overlayService.ts` 新增 `ViewportOverlayAnchor`、`createViewportOverlayAnchor()`、`worldRectToViewportRect()`、`createWorldOverlayAnchor()` 和 `placeAnchoredOverlay()`。
- 这一步把 L9 的 overlay anchor 从“直接拿 DOM rect 摆位置”推进到“可以表达 viewport anchor，并能从 Canvas world rect 转成 browser viewport rect”。
- 当前只是 world/screen anchor seed，不改变现有 slash menu、block control bar、Formula help tooltip 的用户可见行为。
- 后续 pan/zoom、virtualization、canvas object、relation endpoint 等功能可以复用这套 anchor record，而不是各自硬算浮层位置。
- 这仍不是完整 overlay collision / flip / viewport clamp engine，也不是最终 cursor/caret world anchoring。

## Changed - V2.BN.8.1 Shared Overlay Placement Helper Seed

- `overlayService.ts` 新增 `placeOverlayInViewport()`，作为第一版 shared viewport overlay placement helper。
- Slash menu、selected block control bar、Formula help tooltip 现在都通过同一个 helper 做 viewport padding、基础 clamp 和简单 fallback placement。
- Slash menu 继续优先出现在 caret 下方，空间不足时可翻到上方。
- Block control bar 继续优先出现在 selected block 右侧，右侧空间不足时可翻到左侧。
- Formula help tooltip 继续优先出现在 help button 下方，底部空间不足时可翻到上方。
- 这仍是 L9 seed，不是完整 collision / flip / viewport clamp engine；未来 pan/zoom/world transform 仍需要更正式的 anchor service。
- client build passed。

## Changed - V2.BN.8.1 Formula Help Overlay Portal Seed

- `FormulaBlockProjection` 的 `?` help tooltip 现在通过 `FloatingOverlayLayer` free placement 渲染，不再作为 block-local hover 子元素参与 block DOM 层级。
- `overlayService.ts` 新增 `getTooltipAnchor`，用 help button 的 viewport rect 计算第一版 tooltip anchor，并在靠近 viewport 底部时向上翻转。
- Formula help tooltip 继续只说明独立 FormulaBlock 的 LaTeX body / delimiter 规则，不改变 `latex_input` field truth、paste sanitizer、preview render 或保存路径。
- `NoteDetail.module.css` 新增 `formulaHelpTooltipFloating`，让说明气泡作为 pointer-events isolated 的 viewport overlay 显示。
- 本轮仍不实现完整 overlay collision / flip service，也不实现正文 inline formula conversion。
- client build passed。

## Changed - V2.BN.8.1 Slash Menu And Block Control Overlay Portal Seed

- `SlashMenuLayer` 现在通过 `FloatingOverlayLayer` free placement 渲染，菜单坐标从 block-list-relative seed 改成 viewport/caret anchor seed。
- `BlockControlBarLayer` 现在通过 `FloatingOverlayLayer` free placement 渲染，只在 active block 上显示。
- `BlockEditorLayer` 为当前 active block 计算 viewport anchor，使 control bar 不再作为 block DOM flow / measurement 的一部分。
- `overlayService.ts` 新增 `getBlockControlAnchor`，先用 selected block 的 viewport rect 做第一版锚点计算。
- `NoteDetail.module.css` 新增 `blockToolbarFloating`，让 portal 内 control bar 可交互且不依赖 `.blockActive .blockToolbar` 局部层级。
- 本轮不改变 control bar 的按钮能力；Move、AI visibility、export status、save、trash 仍沿用既有回调。
- 完整 overlay collision / flip service 仍留给后续 L9 work。
- client build passed。

## Changed - V2.BN.8.1 Insert And Source Overlay Portal Seed

- 新增 `canvasEngine/layers/NoteFloatingPanelLayer.tsx`，把 Insert floating action / Advanced Insert panel / Source jump panel 从 `NoteChromeLayer.tsx` 中拆出。
- `FloatingOverlayLayer` 增加 `free` placement，用来承载 viewport-fixed controls，而不是强制所有浮层进入右上角 stack。
- `+ Insert` / Advanced Insert 现在通过 `FloatingOverlayLayer` free placement 渲染，继续保持 viewport floating action，不参与 PageFrame / block measurement。
- Source jump panel 迁入 `FloatingOverlayLayer` viewport overlay stack，不再作为 document shell 内部内容撑开页面。
- `NoteRuntimeDocumentLayer` 改为消费独立的 `NoteFloatingPanelLayer`，`NoteChromeLayer` 回到只负责 note top chrome / info / actions / preview。
- 本轮仍不迁移 slash menu、block control bar、formula help tooltip；这些继续保留为后续 L9 overlay anchor work。
- client build passed。

## Changed - V2.BN.8.1 Floating Overlay Portal Seed

- 新增 `canvasEngine/layers/FloatingOverlayLayer.tsx`，作为第一版 viewport-level overlay portal / z-index stack。
- `NoteChromeLayer` 中的 Note info、More actions、Export preview 面板迁入 `FloatingOverlayLayer`，不再依赖 `noteChrome` 局部 absolute stacking context。
- `ExportPreviewLayer` 增加 floating panel class，使 preview 面板在 portal 中使用统一层级和尺寸规则。
- `NoteDetail.module.css` 新增 `floatingOverlayPortal` / `floatingOverlayStack` / `floatingPanelPopover`，让 floating panels 覆盖 block toolbar，而不吞掉页面其它点击。
- `Canvas-Engine-Interaction-Contract.md` 同步 overlay portal 规则：主浮层进入 viewport overlay stack，portal shell 不吞掉页面点击。
- 本轮不迁移 slash menu、insert panel、source jump、block control bar 或 formula help tooltip；这些仍是后续 L9 work。

## Changed - V2.BN.8.1 L12 Decommission Evidence Audit

- `V2.BN.8.1-Runtime-Replacement-Plan.md` 更新当前状态：`NoteDetail.tsx` 已经不是旧 runtime 主体，而是 `noteId` route shell + `NoteCanvasRuntimeProvider` + `NoteCanvasRuntime`。
- `Review.md` 新增 L12 decommission evidence audit，明确旧 startup snapshot 已被当前代码状态 superseded。
- `Experience-Review.md` 新增 L12 runtime ownership note，说明用户进入 note 页面时已经进入 Canvas Engine runtime path。
- 本轮不改产品代码；仍不把 V2.BN.8.1 标记为完成，因为 browser smoke、performance seed 和 Henry manual pass 仍未完成。

## Changed - V2.BN.8.1 PageFrame Content Inset Seed

- `PageFrameModel` 新增 `contentInset`，用来区分 formal page outer boundary 和正式书写 content area。
- 默认 PageFrame 现在由 `760px` content width 加左右 `72px` inset 组成；block placement 坐标仍保持为 content area 坐标，避免现有测试布局大迁移。
- Canvas mode 的 formal PageFrame boundary 现在使用 outer frame 起点和宽度渲染，不再把正文起点当作页面外框起点。
- Writing surface 增加 `data-page-frame-inset-left/right` debug attributes，便于后续 Browser/DevTools 验证。
- 本轮不实现完整 Word-like ruler UI，也不改变 Page mode 的自然文档滚动与 block content truth。

## Changed - V2.BN.8.1 Runtime History Boundary Seed

- `usePlacementHistory` 升级为第一版 runtime history boundary，不再只保存 placement move / resize snapshot。
- Runtime history 当前支持三类可撤回动作：
  - `layout`: move / resize 的 before / after layout snapshot；
  - `createdBlock`: draft 持久化创建出的 block lifecycle seed。
  - `trashedBlock`: toolbar 删除 block 后可通过 soft-restore 撤回，也可通过 redo 再次 trash。
- Draft block 持久化成功后会登记 `createdBlock` history entry。
- `Ctrl+Z` 在非输入框焦点下可以撤回最近创建的 block：通过现有 note block soft-delete 路径把 block 标记为 `trashed`。
- `Ctrl+Y` / `Ctrl+Shift+Z` 可以恢复刚撤回的 created block：通过现有 `PUT /api/note-blocks/:id` status update 把 block 恢复为 `active`。
- `useNoteCanvasDataAdapter` 新增 `restoreBlock()`，并让 `trashBlock()` 支持 silent history 调用。
- 本轮仍不实现 cross-note undo、source/relation mutation undo、完整历史版本 UI、inline formula conversion undo。
- client build passed；server build passed。

## Changed - V2.BN.8.1 Runtime Placement Record Seed

- L5 placement service now owns a first-version runtime placement record builder.
- Runtime placements now include `placementId`, `objectId`, `objectKind`, `canvasId`, optional `frameId`, `boundaryRole`, `zIndex`, `snapState`, and `visibilityState`.
- The runtime now reserves left/right relation endpoint anchors for every block placement without enabling relation runtime.
- `useNoteCanvasLayoutModel` now asks `placementService` to build Canvas runtime placements instead of assembling them inline.
- No database migration, API change, multi-frame productization, or relation runtime behavior is included in this patch.

## Fixed - V2.BN.8.1 Formula Input Sanitizer And Help Seed

- `FormulaBlock` 的 `latex_input` 现在在读取旧内容、保存新内容时都会归一成纯 LaTeX body。
- Whole-input `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 会被接受，但保存时去掉外层 delimiter，避免用户猜格式后污染 field truth。
- Formula input 增加 paste sanitizer：用户粘贴完整包裹公式时，会把插入内容清洗为 body，再进入预览和保存路径。
- Formula active editor 增加轻量 `?` help 入口，说明纯 body 与常见 delimiter 的处理规则。
- 本轮只处理独立 FormulaBlock；正文 TextBlock 内的 inline formula 仍保留为后续选区右键 `Convert to formula` 能力。
- client build passed。

## Fixed - V2.BN.8.1 Canvas Shell And PageFrame Boundary

- Canvas mode root 现在增加 `pageCanvas` shell，top bar 以下交给 runtime document shell；Canvas mode 不再依赖全局页面滚动。
- `documentShellCanvas` 改为 flex viewport fill，不再使用 `calc(100vw - 320px)` 估算宽度，sidebar 展开/收起时由主内容区自然决定可用宽度。
- `writingSurfaceCanvas` 去掉外层 page/card 边框和阴影，只保留 canvas grid 与 formal PageFrame 自身边界。
- Canvas block list 在 Canvas mode 使用 `noteCanvasRuntime.world.height` 作为 workspace 高度，同时 formal PageFrame boundary 继续使用 `pageContentHeight`，避免把 PageFrame 撑成 2600px 的巨大空白。
- Canvas mode 的 `+ Insert` 入口改为 viewport floating action，放在右侧中部，并限制展开面板最大高度。
- `CANVAS_PRIMARY_PAGE_OFFSET_X` 从 640 调整为 96，让 Canvas mode 初始视野中能完整看到主 PageFrame，而不是只露出页面右侧。
- client build passed；browser smoke passed：Canvas mode `bodyCanScroll=false`、`surfaceOverflowY=auto`、formal PageFrame 横向完整可见、console error 为空。

## Fixed - V2.BN.8.1 Slash Menu Caret Anchor

- `getSlashMenuAnchor()` 现在优先用 textarea / input 的 caret rect 计算菜单位置，不再只用整个输入框的边界。
- `useSlashCommandController()` 将当前 caret index 传入 overlay anchor service。
- 对多行 textarea、长文本 block、页面滚动后的 block，slash menu 应跟随当前输入行附近，而不是漂到 block 顶部或页面上方。
- 本轮不改变 slash command filtering、template conversion、draft persistence 或 command menu content。
- client build passed；browser runtime smoke passed；由于当前 Browser 输入 API 受虚拟剪贴板限制，caret 位置的完整交互仍需 Henry 手动复测。

## Fixed - V2.BN.8.1 Definition Field Truth And Active Reflow

- `DefinitionBlock` 现在把已存在的 `field_values` / `structured_fields` 视为字段 truth。
- 当 Definition 已经有 structured fields 时，`description` 不再从 `body` / `plain_text` fallback 反推，避免只填写 `concept_name` 后把概念名复制进 description。
- `DefinitionBlockProjection` 在 blur 保存时使用最新字段草稿，避免 Tab / blur 时保存上一帧字段。
- block measurement 在 layout effect 内增加一帧复测，降低 textarea resize / structured field 展开后一拍测量不足的风险。
- active structured block reflow 从仅允许 Formula 扩展为 Definition + Formula，Definition 编辑展开时可以推开下方 block。
- client build passed；浏览器手测仍需 Henry 验收。

## Changed - V2.BN.8.1 L2/L12 Runtime Controller Composition Hook Seed

- 新增 `hooks/useNoteCanvasRuntimeController.ts`。
- 将 `NoteCanvasRuntime.tsx` 中的数据加载、selection、layout draft、surface mode、floating overlay、placement interaction、slash command、measurement/reflow、layer props composition 的 controller wiring 迁入 runtime controller hook。
- `NoteCanvasRuntime.tsx` 现在只负责 loading shell 和 `NoteChromeLayer` / `NoteRuntimeDocumentLayer` 渲染，文件约 24 行，不再直接组合 controller graph。
- `canvasEngine/index.ts` 导出 `useNoteCanvasRuntimeController`，作为后续 L12 decommission / runtime acceptance 的明确入口。
- 本轮不改变 Note 页面可见行为、block content truth、layout payload、Page / Canvas mode、slash command、preview overlay、move / resize、undo / redo 或 persistence API。
- L2/L12 runtime controller composition hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L7/L12 Runtime Refs And Load Reset Controller Seed

- 新增 `hooks/useRuntimeLayoutRefsController.ts`，将 `blockListRef`、`movingBlockIdRef`、measured reflow suppression ref 和 selection 前的 measured reflow suppression callback 从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `hooks/useNoteLoadResetController.ts`，将 note loaded 后的 layout draft reset / block selection clear orchestration 从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 不再直接导入 `useRef` 或 `LAYOUT_MEASURE_SUPPRESSION_MS`，measurement suppression hack 已有明确 controller 边界。
- 本轮不改变 block measurement、formula active reflow exception、move / resize session、note load data adapter、selection clearing 或 layout draft truth。
- L7/L12 runtime refs and load reset controller seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L6/L9 Runtime Document Layer Composition Seed

- 新增 `layers/NoteRuntimeDocumentLayer.tsx`。
- 将 document shell、template warning、Insert / source jump floating panel 和 writing surface 的组合挂载从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- `NoteChromeLayer.tsx` 导出 `NoteFloatingPanelLayerProps`，`NoteWritingSurfaceLayer.tsx` 导出 `NoteWritingSurfaceLayerProps`，让 document layer 以明确 props contract 组合下层 UI。
- `NoteCanvasRuntime.tsx` 继续作为 controller / layer props composition root，但不再直接持有 document shell DOM。
- 本轮不改变 Page / Canvas mode、floating panel 内容、writing surface 行为、slash menu、block projection、measurement 或 persistence API。
- L6/L9 runtime document layer composition seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L6/L7/L11 Runtime Decision Controller Seed

- 新增 `hooks/useBlockFieldDraftController.ts`，将 structured field draft -> text draft derivation 从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `hooks/useLayoutPersistenceController.ts`，将 changed layout diff 判断、layout snapshot persistence callback 从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `hooks/useMeasuredBlockReflowController.ts`，将 measured block height -> layout draft reflow decision 从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 继续作为 controller / layer composition root，但不再直接知道 Definition / Formula 字段如何拼接文本，不再直接判断 layout 是否 changed，也不再内联 measured height reflow policy。
- 本轮不改变 field value truth、block save API、layout payload、undo/redo history、measurement tolerance、collision resolution 或 formula active reflow 例外规则。
- L6/L7/L11 runtime decision controller seed 迁出后 client build / server build passed。

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
- 新增 `blocks/CodeBlockProjection.tsx`，让 code snippet 不再走普通 Text projection。
- 新增 `layers/BlockResizeHandleLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 Definition / Formula / Text 的具体 JSX projection。
- `BlockEditorLayer.tsx` 现在把 code snippet 分流到 `CodeBlockProjection`，badge 显示为 `CODE`。
- `BlockEditorLayer.tsx` 不再内联 resize handle。
- `BlockEditorLayer.tsx` 继续保留 block shell 和 control/source/status/content sublayer composition，后续再迁入 shell boundary / selected overlay anchor。
- L6 block projection sublayers 抽离后 client build passed。

## Fixed - V2.BN.8.1 CodeBlock Projection Seed

- Code block 增加独立 projection、代码背景、monospace 输入区域和轻量行号 gutter。
- Code block type badge 从较长的 `CODE SNIPPET` 收敛为 `CODE`。
- 本补丁只完成代码块视觉区分；行级复制 / gutter 多行选择仍保留为后续 polish。
- client build passed。

## Fixed - V2.BN.8.1 Formula Preview Display Body

- Formula block 的裸 `latex_input` 现在默认按 display math 渲染，不再被强行包成单行 inline `$...$`。
- 用户输入已经包裹好的 `$$...$$` 时保持原样。
- 用户输入单 `$...$` 时仍保持 inline；如果单 `$...$` 内是多行或 `\begin...` 环境，会自动升级为 display math。
- Green theorem / `aligned` body 已用 KaTeX display mode 验证可渲染。
- client build passed。

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

## Verified - V2.BN.8.1 Deferred Browser Smoke Recheck

- 按 Henry 要求，Browser Harness 中途测试暂缓到最终统一验收。
- 重新通过 `npm run build:client`。
- 重新通过 `npm run build`。
- 重新通过 `npm run smoke:canvas-engine-performance`。
- 重新通过 `git diff --check`。
- 确认 `NoteDetail.tsx` 仍然只是 route/provider shell。
- 确认旧 runtime 符号没有回流到 `NoteDetail.tsx`。

## Added - V2.BN.8.1 Runtime Boundary Check

- 新增 `client/scripts/canvasRuntimeBoundaryCheck.mjs`。
- 新增 root script：`npm run check:canvas-runtime-boundary`。
- 新增 client script：`npm run check:canvas-runtime-boundary`。
- 该检查固定 `NoteDetail.tsx` shell boundary、`NoteCanvasRuntime.tsx` host boundary、runtime root controller composition、必要 layer/projection 文件和 Browser smoke debug attributes。
- `npm run check:canvas-runtime-boundary` passed。
- `npm run build:client` passed。
- `npm run build` passed。
- `npm run smoke:canvas-engine-performance` passed。

## Added - V2.BN.8.1 Non-Browser Gate Aggregator

- 新增 root script：`npm run verify:v2-bn8-runtime`。
- 该命令聚合 Canvas runtime boundary check、client build、server build 和 Canvas Engine performance seed。
- 更新 `V2.BN.8.1-Final-Smoke-Protocol.md`，把最终 Browser Harness 前置非浏览器检查收束到该命令。
- `npm run verify:v2-bn8-runtime` passed。

## Changed - V2.BN.8.1 Runtime Verification Aggregator

- `npm run verify:v2-bn8-runtime` 现在包含 `git diff --check`。
- `V2.BN.8.1-Final-Smoke-Protocol.md` 同步更新：diff hygiene 已纳入非浏览器聚合 gate。
- changed-file secret scan 仍作为独立检查保留。
- `npm run verify:v2-bn8-runtime` passed。

## Added - V2.BN.8.1 Changed-File Secret Scan

- 新增 `scripts/changedFileSecretScan.mjs`。
- 新增 root script：`npm run check:changed-file-secrets`。
- 该脚本扫描当前 changed / staged / untracked files，跳过二进制和超大文件。
- `npm run verify:v2-bn8-runtime` 现在包含 changed-file secret scan。
- `V2.BN.8.1-Final-Smoke-Protocol.md` 同步更新：changed-file secret scan 已纳入非浏览器聚合 gate。
- `npm run check:changed-file-secrets` passed。
- `npm run verify:v2-bn8-runtime` passed。
