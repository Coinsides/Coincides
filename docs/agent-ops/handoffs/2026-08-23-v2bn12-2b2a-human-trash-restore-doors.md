> from: claude(fable,上将军代发——Opus 调度会话阻塞;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;设计:plans/v2-bn12-2b-first-write-tool-and-review-queue.md + 本单「裁定」;log 08-23 #18) | re: v2bn12-2b-2a | date: 2026-08-23

# V2.BN.12.2b-2a:人类的回收站门(先于 Agent 工具)—— note 移入回收站 / 恢复

## 裁定(Fable,2026-08-23;产品事实 + 红线)

**产品事实(grep 亲核)**:client 对 `/api/notes/:id` **没有任何调用**(只有 `/notes/:id/blocks*`);`DELETE /api/notes/:id` 是一扇没有人类入口的服务端门;服务端也**没有**恢复路由(恢复只能经 `PUT {status:'active'}`,client 同样不调)。⇒ **今天用户在 UI 里无法把一篇 note 移入回收站,也无法恢复。**
**红线**:Agent 能编辑的,人类必须 100% 能编辑。在给 Agent `trash_notes` 之前,**先补人类的门**,且人类门与 Agent 门共用 b-1 的执行器(`trashNote` / `restoreNote`)。

## 交付物(单项:一对人类门 + 一个恢复路由)

1. **服务端** `POST /api/notes/:id/restore`(`server/src/routes/notes.ts`):薄壳,调 `restoreNote({ userId, noteId })`;响应 `{ message: 'Note restored' }`(与 DELETE 的 `{ message: 'Note moved to trash' }` 同形);未命中(不存在/非本用户)的行为**与 DELETE 现行为一致**(DELETE 现在对未命中返回什么就照搬——builder 先核 DELETE 现行为再写,回执贴出)。
2. **客户端**(两处,最小):
   - Project 页的 note 列表(`client/src/pages/Courses/CourseDetail.tsx`,`fetchSummary` 所在页)每条 note 加一个「移到回收站」动作(图标按钮 `Trash2`,与既有 `DocumentManager`/`CardViewModal` 的删除按钮同形),**单条即时**(Henry 阈值规则:单条删除=immediate),调 `api.delete(\`/notes/${id}\`)`,成功后刷新列表并 toast;
   - 同页加「回收站」切换(最小:一个切换按钮/分段,列出 `GET /api/notes?course_id=…&status=trashed`——`listNotes` 已支持 status 过滤),每条有「恢复」调 `api.post(\`/notes/${id}/restore\`)`。
   - **不做**:批量多选、确认对话框(单条即时可撤,与人手点删同门)、新页面/新路由、导航项、动画。
3. **测试**:①server:restore 路由真实 Express + 临时 DB 正控(trash → restore → status active、trashed_at NULL)+ 未命中行为 golden + **killer**:route 内联绕过 `restoreNote` → 红;②client:现有 client 单测框架(Vitest)下,为两个新动作各写一条「点击后以正确 method + URL 调用 api」的测试(mock api),**并确保 parity 门的 client 探针能在该符号内部看见 `DELETE /api/notes/:id` 的构造**(b-2b 的 `trash_notes` 将以此为 `human_entry.client_call_site`——builder 在回执写明符号名 `文件#函数`);③既有 `v2NotesLifecycle` 7/7 与 `v2NotesListService` 保持绿。

## 硬闸
- ⛔ 不改 `trashNote`/`restoreNote`(b-1 已复核 PASS);不碰 PUT;不碰注册表/manifest/transport/policy(那是 b-2b);不新增依赖。
- ⛔ client 改动只在 `CourseDetail.tsx`(及其直接的样式/测试文件);不动 Notes 画布面、03/05 保护面、v1 学习规划线。
- 越界/需要新接缝 → 停手 `needs: claude`。

## 边界(触及面申报)
允许:`server/src/routes/notes.ts`(仅新增 restore 路由 hunk)· server 新/既有测试 · `client/src/pages/Courses/CourseDetail.tsx`(+ 同目录测试文件,如需新建)· 如需极小样式,同目录 css。其余禁区。

## D 段(`adjudication §7`,含反面分则)+ 锁纪律
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts` porcelain `.M` 为 EOL 假阳性。`.codex-tmp/builder.lock.d` 非你所有,只读确认。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ 新测试单跑。逐门 exit 入表。回执 **UTF-8** 追加 `## Result`(不需确认);含先红后绿、`git diff --numstat` 对照边界、client 调用点符号名、显式范围排除;header 保持 `ready`;不 commit、不 push、不碰 main、不碰锁。

## Result

> builder: Codex | date: 2026-08-23 | baseline/head: `bd92e0a6f24b96a7e7a8c531e6f56eaa7c184754` | branch: `fable/v2-bn12-exoskeleton`

### 交付

- 写 restore 前先用生产 `noteRoutes` + `errorHandler` 的真实 Express/TCP 探针锁定 DELETE 未命中现行为：不存在与非本用户 note 均为 HTTP `404`，`content-type: application/json; charset=utf-8`，原始 UTF-8 body 均为 `{"error":"Note not found"}`；两者都在 `getOwnedNote` 短路，foreign row 不变。
- 新增 `POST /api/notes/:id/restore` 薄壳，执行顺序为 `getOwnedNote(noteId, req.userId!)` → `restoreNote({ userId: req.userId!, noteId })` → `res.json({ message: 'Note restored' })`。因此未命中行为与 DELETE 同形，命中后复用 b-1 executor 恢复为 `active` 并清空 `trashed_at`。
- Project Notes 增加 Notes/Trash 分段；查询直接使用 `GET /notes?course_id=${courseId}&status=${noteStatus}`。active 卡片提供即时 `Trash2`，trashed 卡片提供即时 `RotateCcw`；成功后刷新并 toast，无确认框、批量能力、新页面/路由、导航项或动画。卡片打开与生命周期动作使用 sibling buttons，避免嵌套按钮。
- client 调用点（供 b-2b `human_entry.client_call_site`）：`client/src/pages/Courses/CourseDetail.tsx#handleTrashNote`，其函数体内直接构造 `api.delete(\`/notes/${noteId}\`)`。恢复调用点为 `client/src/pages/Courses/CourseDetail.tsx#handleRestoreNote`，函数体内直接构造 `api.post(\`/notes/${noteId}/restore\`)`。runtime parity 门通过。
- 未新增平行 lifecycle executor：服务端继续唯一复用 `trashNote` / `restoreNote`；client 两个符号仅是人类入口调用点。

### 先红后绿与测试证据

- 前置 DELETE 未命中 golden 单跑：exit `0`；missing/foreign 的 status、header、raw bytes 与 foreign row 不变均命中。
- restore route killer 在写生产 route 前单跑：exit `1`，唯一失败为 `POST /:id/restore route must exist`；该 killer 要求 route 调用 `restoreNote`，并拒绝 route 内出现 `UPDATE notes` 或 `.prepare(`，所以内联绕过会红。
- 写入薄壳后 `v2NotesLifecycle.test.ts`：exit `0`，`11/11`；真实 HTTP 正控完成 trash → restore → `status = active` / `trashed_at = NULL`，未命中 parity 与结构 killer 同时为绿。
- 第一次正式链在最后的 server 合跑出现 `13/14` 假红：旧 A-1 结构断言把 notes service import 硬编码为仅 `{ listNotes }`。只把该断言收窄为“同一 import 含 `listNotes`”，专项恢复为绿，并从 docs 第 1 门重新跑完整最终链；未为测试改生产行为。

### 最终 docs-first 七门

| 门 | 命令（cwd） | exit | 结果 |
|---|---|---:|---|
| 1 | `npm.cmd run docs:check`（root） | 0 | docs index / inventory 均最新 |
| 2 | `npm.cmd run verify:v2-bn8-runtime`（root） | 0 | runtime、build、parity、secret scan 等完整通过 |
| 3 | `npm.cmd exec tsc -- --noEmit`（client） | 0 | 无类型错误 |
| 4 | `npm.cmd exec tsc -- --noEmit`（server） | 0 | 无类型错误 |
| 5 | `npm.cmd run test:unit`（root） | 0 | `20/20` files，`211/211` tests |
| 6 | `npm.cmd run test:v2`（server，隔离 `CANVAS_ASSET_DIR`） | 0 | `270/270` tests；最终目录 `server/.codex-tmp/v2bn12-2b2a-assets-5f7d27cf194d4bd78574d6eac4ef592e`，结束后 leaf count `0` |
| 7a | `npm.cmd exec vitest run src/pages/Courses/CourseDetail.test.tsx`（client） | 0 | `2/2`：trash / restore 点击各自锁定 method + URL、刷新与 toast |
| 7b | `node --import tsx --test src/__tests__/v2NotesLifecycle.test.ts src/__tests__/v2NotesListService.test.ts`（server） | 0 | `14/14` |

### 边界与 numstat

追加本回执前的施工代码/测试 `git diff --numstat`（新文件另计）如下，全部在允许面：

| 文件 | + | - |
|---|---:|---:|
| `client/src/pages/Courses/CourseDetail.module.css` | 54 | 2 |
| `client/src/pages/Courses/CourseDetail.tsx` | 157 | 46 |
| `client/src/pages/Courses/CourseDetail.test.tsx`（new） | 78 | 0 |
| `server/src/__tests__/v2NotesLifecycle.test.ts` | 80 | 1 |
| `server/src/__tests__/v2NotesListService.test.ts` | 1 | 1 |
| `server/src/routes/notes.ts` | 9 | 1 |

- 显式排除：`server/src/services/notes.ts`（`trashNote` / `restoreNote`）零 diff；PUT handler 由 byte-for-byte killer 保持不变；未碰 registry / manifest / transport / policy、依赖、Notes 画布面、03/05 保护面或 v1 学习规划线。
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` 与 `server/src/routes/projections.ts` 仍仅为工单已裁定的 porcelain EOL/stat `.M`；两者 `git diff --quiet` 均 exit `0`，没有内容改动。
- `git diff --check` exit `0`（仅现有 LF→CRLF 提示）；无 staged diff。独立只读终审无 finding。
- header 保持 `status: ready`；未 commit、未 push、未切换/触碰 main，`.codex-tmp/builder.lock.d/owner.json` 仅只读核验且 owner 仍为本工单。
