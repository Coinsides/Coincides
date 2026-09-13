> **状态 (Status)**: complete
> **层 (Layer)**: 审计 / Builder 夹具普查
> **记录日期**: 2026-09-13（运行环境日期 2026-09-12）

# 挂载期 palette-colors 请求夹具台账

全量扫描 client/src 的 153 个测试文件，并检查 client/scripts 的 Note/Board 运行壳与 HTTP 传输。检索实际 SkinControls / SkinEditor / useNoteSkin / useBoardSkin 挂载、NoteCanvasRuntimeController 与 NoteCanvasDataAdapter 消费；类型导入不当作运行时请求。保留所有未知请求报错，不新增全局测试旁路。

## 测试消费端：full=25 / processed=25 / remaining=0

以下 21 个文件显式登记 GET /palette-colors（axios 返回 { data: [] }），其中适配器单测为扩展预登记：

- client/src/pages/Settings/Settings.test.tsx
- client/src/pages/Boards/BoardNoteModal.rangeSession.test.tsx
- client/src/pages/Boards/BoardPage.bookmarks.test.tsx
- client/src/pages/Boards/BoardPage.chalk.test.tsx
- client/src/pages/Boards/BoardPage.item.test.tsx
- client/src/pages/Boards/BoardPage.modal.test.tsx
- client/src/pages/Boards/BoardPage.smoke.test.tsx
- client/src/pages/Boards/BoardPage.staging.test.tsx
- client/src/pages/Boards/BoardPage.unboxing.test.tsx
- client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.skin.test.tsx
- client/src/pages/Notes/canvasEngine/hooks/pageFrameWallsPersistence.test.tsx
- client/src/pages/Notes/canvasEngine/hooks/usePaperInkCommands.test.tsx
- client/src/pages/Notes/canvasEngine/layers/NoteTrayInteraction.integration.test.tsx
- client/src/components/Skin/SkinControls.test.tsx
- client/src/components/Skin/SkinEditor.test.tsx
- client/src/components/CourseModal/CourseModal.test.tsx
- client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx
- client/src/pages/Boards/useBoardSkin.test.tsx
- client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.test.ts
- client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx
- client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx

以下 4 个 Board 文件通过现有共享 client/scripts/boardToolsSmoke/mockApi.ts 登记，无需逐文件重复：

- client/src/pages/Boards/BoardPage.layers.test.tsx
- client/src/pages/Boards/BoardPage.selection.test.tsx
- client/src/pages/Boards/BoardPage.snapping.test.tsx
- client/src/pages/Boards/BoardPage.tools.test.tsx

## 浏览器合成传输：full=7 / processed=7 / remaining=0

- client/scripts/boardOpenNoteSmoke/mockApi.ts
- client/scripts/boardTextRangeSmoke/mockApi.ts
- client/scripts/cFix1Smoke/mockApi.ts
- client/scripts/paperInkSmoke/inkMockApi.ts
- client/scripts/boardToolsSmoke/mockApi.ts
- client/scripts/pageFrameHealingSmoke/mockApi.ts
- client/scripts/pageReadingSmoke/mockApi.ts

## 实施说明

- SkinControls、SkinEditor 与直接外观壳均保留真实调色板 hook；仅 HTTP 做本地显式登记。新增 authStore 导入依赖的夹具补 getToken/setToken 合成导出。
- Settings 的 auth mock 现在遵循 selector 签名，避免返回对象被当作 owner。
- useBoardSkin/useNoteSkin 的既有项目请求一次性 mock 保持原语义，palette GET 单独路由。
- NoteChromeLayer 的纸面改色操作由旧文本框变为纸面按钮 → Hex 颜色 → Escape，保存断言不减。
- useNoteCanvasRuntimeController.test.tsx 原本只替换 document controller，真实 useNoteSkin 会挂载；本轮普查补登，未遗漏。
- useNoteCanvasDataAdapter(.skin)、pageFrameWallsPersistence、usePaperInkCommands 当前适配器测试不直接挂载颜色解析 hook，按扩展普查显式预登记。
- 全部被编辑旧文件的原始字节保存在 .tmp/palette-builder-baseline 的镜像路径。

## 定向验证

采用 COINCIDES_VALIDATION_ENV_DIR=.tmp/palette-empty-env；npm.cmd run test:unit，完整文件执行，无子例过滤。

- 外观壳 + 解析 hook + runtime controller：8 文件 / 42 测试通过。
- Board 全族 + rangeSession + tray + adapter：17 文件 / 227 测试通过。
- 合计 25 文件 / 269 测试通过；仅既有 React Router future-flag 提示。
- 初轮发现 5 文件缺 api mock 的 getToken 导出，修正并按整文件重跑通过。
- 本文不替代 root 执行的 client 全库与 server 全量验收。
