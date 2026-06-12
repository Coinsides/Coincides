# CHANGELOG - V2.BN.8

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
- 从 `NoteCanvasRuntime.tsx` 迁出第一批 measurement seed：
  - textarea content resize；
  - block DOM content height measurement；
  - text block estimated height。
- `NoteCanvasRuntime.tsx` 仍保留 block-specific measurement wrapper，后续继续迁入 measurement registry。
- L7 seed 抽离后 client build passed。
