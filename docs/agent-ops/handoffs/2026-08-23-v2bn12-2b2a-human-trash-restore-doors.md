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
