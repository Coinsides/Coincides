> **状态 (Status)**: active
> **层 (Layer)**: B1a builder 请求夹具普查证据（非 HQ 放行）
> **日期**: 2026-09-11

# B1a 挂载请求台账

新增挂载请求为 `GET /courses/:courseId/summary`，由完整 `useNoteCanvasRuntimeController` 内的皮 hook 在 note 的 `course_id` 可用后发起。它消费既有 summary 路由的 `course.skin`；全局层从现有 `useAuthStore.user.settings.skin` 读取；纸层从现有 note `metadata.skin` 读取。没有新增 Settings 挂载请求，也没有在底层 `useNoteCanvasDataAdapter` 加请求。

普查范围：`client/src` 的所有测试文件、`client/scripts` 的全部浏览器入口和 mockApi、`docs/audits` 内的可运行 TS/TSX 夹具，以及 `scripts` / `server/scripts` 的消费线索。先按 NoteDetail、NoteCanvasRuntime、provider、controller、adapter、Settings、CourseDetail、BoardPage / modal 引用交叉定位，再区别真实挂载、替身组件、type-only 引用和静态 CSS 读取。`.codex-tmp` 根层脚本只见历史 patch / 证据脚本；其中历史 checkout、compiled outputs、browser profiles 不是现役台账，不回改。没有访问 `.git`。CodeGraph / rg 在本轮环境不可用，使用 PowerShell `Get-ChildItem` + `Select-String` 按上述目录作有界普查。

## 已补记的现役账本

下列响应均为明确的已知 synthetic project，形状为 `{ course: { id, name, skin: null }, goals: [], decks: [], documents: [] }`；仍对未知 URL 报错，不用通配兜底掩盖漏账。

| # | 接口账本 | 消费入口 | project ID |
|---|---|---|---|
| 1 | `client/scripts/boardOpenNoteSmoke/mockApi.ts` | 同目录 `fixture.tsx`，完整纸 / modal / 第二张纸 | `open-smoke-project` |
| 2 | `client/scripts/boardTextRangeSmoke/mockApi.ts` | 同目录 `fixture.tsx`，完整纸与板内 modal | `range-smoke-project` |
| 3 | `client/scripts/cFix1Smoke/mockApi.ts` | 同目录 `fixture.tsx`，完整纸 controller | `c-fix1-course` |
| 4 | `client/scripts/pageFrameHealingSmoke/mockApi.ts` | 同目录 `fixture.tsx`，完整纸 controller | `f11-memory-project` |
| 5 | `client/scripts/pageReadingSmoke/mockApi.ts` | `fixture.tsx` / `overviewFixture.tsx` / `printFixture.tsx` / `trayFixture.tsx` | `page-reading-smoke-project` / `overview-smoke-project` / `page-print-smoke-project` / `tray-smoke-course` |
| 6 | `client/scripts/paperInkSmoke/inkMockApi.ts` | 同目录 `inkFixture.tsx`，完整纸 controller | `paper-ink-smoke-course` |
| 7 | `docs/audits/2026-09-11-d2-builder/browser-fixture.tsx` | 真实 NoteDetail / BoardNoteModal；原合成 localStorage 数据 | `d2-project` |
| 8 | `client/src/pages/Boards/BoardPage.unboxing.test.tsx` | 真实 BoardPage → BoardNoteModal → NoteDetail 测试 | 在该测试的 `projects` 数组中按精确 ID 查找 |

计数：**8 个既有账本，10 个既有浏览器入口 + 1 个真实 runtime 测试文件**。pageReading 的四入口共用一份账本。只补了原 D2 可执行夹具的响应；没有重写历史截图、报告或验收结论。B1a 新建的浏览器夹具由主 builder 单独实现其 Settings / project / note 往返账本，不算“既有夹具”。

`BoardPage.unboxing.test.tsx` 的 API module 替身同时补齐 `getToken: () => null` / `setToken: vi.fn()` 命名导出；新皮 hook 复用 authStore 后，该真实 runtime 夹具需满足既有 authStore 的 module import 契约。其余常备 mockApi 原本已提供这两个导出；controller bridge 测试没有替换 API module，不受此 module-export 漏账影响。

## 已审但无需补请求的消费面

| 消费面 / 文件 | 不新增请求的理由 |
|---|---|
| `useNoteCanvasRuntimeController.test.tsx` | `useRuntimeDocumentDataController` 被替换为局部桥接模型，note 只有 `id`（无 `course_id`）；本轮新增皮 hook 不向不存在的 project 请求。定向皮 hook 测试另验真实 course。 |
| `BoardNoteModal.test.tsx` | runtime 和 provider 均为替身；验证 modal 关闭 / 导航协议。 |
| `BoardNoteModal.rangeSession.test.tsx` | 替换 runtime，仅挂载真实 `useNoteCanvasDataAdapter` 的 EditorProbe；未挂载完整 controller。 |
| `BoardPage.modal.test.tsx` / `BoardPage.staging.test.tsx` | `BoardNoteModal` 被显式替换；验证板的宿主 / 暂存协议。 |
| `BoardPage.smoke.test.tsx` | PaperProbe 直接组合 adapter / layout / reading hooks，不调用完整 controller。 |
| 其他 `BoardPage.*.test.tsx`、`boardTextRangeClipboard.test.tsx` | 板选择、工具、层、墨迹、吸附、书签 / 复制测试，不挂载真实纸 runtime。 |
| `boardToolsSmoke` / `boardLayersSmoke` | 合成成员为 item，`reference.note_id = null`；无 note runtime；同一 boardTools mockApi 不加伪纸路由。 |
| `docs/audits/2026-09-11-b4v-builder` | 仅 BoardPage + 合成 item / chalk / 书签，无 note runtime。 |
| `useNoteCanvasDataAdapter.test.tsx` / `pageFrameWallsPersistence.test.tsx` / F19 `browser-fixture.tsx` | 直接挂载 adapter；新请求不在 adapter。 |
| `useNoteRouteSaveBoundary.test.tsx` | 自有 NoteFixture 与 imperative handle，未挂载 controller。 |
| `useBoardStagingSelection.test.tsx` | provider + selection hook；未挂载 controller。 |
| 其余 hooks 的 `BlockSaveOutcome` 引用 | type-only import；不构成 request consumer。 |
| E1 `browser-fixture.tsx`；E4 overview fixture；D1 projection / print / overview fixtures | 直接传 props 给 leaf layer 或 read-only projection，不挂载 controller。 |
| `NoteChromeLayer` / `NotePrintLayer` / `NoteOverviewLayer` / `NoteRuntimeDocumentLayer` / writing / ink 等 layer tests | 同上；没有请求产生处。 |
| `Settings.test.tsx` | 全局皮复用已存在 `updateSettings`；本单没有新增 mount GET。 |
| `CourseDetail.test.tsx` | 仅 ProjectIdentity / ProjectNotesSection 子组件；不挂载 CourseDetailPage 的 summary 请求。 |
| `AppLayout.test.tsx` | Outlet 为普通 div；auth / course / tag 初始化被替换，不挂载 NoteDetail。 |

## 定向验证与 E1 复跑路径

影响到完整 runtime 的既有自动化为 `BoardPage.unboxing.test.tsx`；其 unknownRequests 账本继续严格检查未知请求。执行命令（client 目录）：

```powershell
node node_modules/vitest/vitest.mjs run src/pages/Boards/BoardPage.unboxing.test.tsx src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx --maxWorkers=2
```

最终执行数字及日志与 B1a `## Result` 对齐。上述表是请求普查证据，不声称已经亲跑每一个旧浏览器场景。

E1 原复跑源为 `docs/audits/2026-09-11-e1-builder/{serve,smoke}.mjs`。`serve.mjs` 只服务生产浮层组件 + 合成 props，端口 5187。`smoke.mjs` 用 CDP 逐浮层遍历 DOM 后代、rest / forced hover 两态审计 border / shadow / radius / static background；8 类浮层，旧报告为 55 passed。本轮应将输出指向 B1a 目录保存新收据；不覆盖旧 `smoke-report.json` / 截图。

## 验证门范围

本单要求“受影响秒级静态门 + E1 审计复跑”，并明确禁安全类测试和 `.git`。根 `verify:v2-bn8-runtime` 含完整 client `test:unit`、`git diff --check` 和 `check:changed-file-secrets`，因此本轮不直接执行该聚合入口。两端 typecheck / build、定向皮与受影响 runtime 功能测试、受影响静态门、E1 均按单独命令执行。未运行安全类扫描或 `.git` 命令；没有 commit。
