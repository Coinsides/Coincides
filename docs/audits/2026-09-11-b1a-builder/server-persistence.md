> 状态: builder evidence
> 日期: 2026-09-11
> 范围: B1a 服务端持久化与共享类型；不代表整单验收

## 持久化路由与形状

共享 `SkinSelection = { preset, overrides? }`，preset 为 `default` / `quiet-ink` / `warm-paper` / `workbench`，overrides 只含 9 个纸面颜色，支持 6/8 位十六进制值。部件层、Typography、板面不进入此形状。

| 挂点 | 既有写路由 | 储存位置 | 既有读路由 |
|---|---|---|---|
| 全局 | `PUT /api/settings`，`{settings:{skin}}` | `users.settings.skin` | `GET /api/settings` |
| Project | `PUT /api/courses/:id`，`{skin}` | `courses.skin` 可空 JSON TEXT；migration 067 | `GET /api/courses` / `GET /api/courses/:id/summary` 的 `course.skin` |
| 纸 | `PUT /api/notes/:id`，`{skin}` | `notes.metadata.skin` | `GET /api/notes/:id` / `GET /api/notes?course_id=...` 的 `metadata.skin` |

POST project/note 同样支持该字段。字段缺省不修改既有选择，`null` 清除本层并由客户端继承。切换预设提交完整选择，原 override 不带入新预设。

纸使用附件允许的既有 metadata 挂点，保留 Note 顶层 DTO，不改 MCP 的严格 Note 输出 schema，不新增 Agent 工具或路由。纸面 `skin` 专项写入合并既有 metadata；既有 Typography/layout 请求无论缺少 skin 还是带旧 skin 快照，都保留服务端当前 skin，避免晚到的文档属性写入回滚外观。

## 既有夹具普查

查阅 `server/src/__tests__` 中 `/api/courses`、settings/course/note validators、metadata 断言与 note route 静态收据。

- `v2NotesListService.test.ts` A-3 旧 GET 响应字节门无需更新；无皮的 Note 输出字节不变。
- `v2NotesLifecycle.test.ts` 的整段 PUT 源码 hash 断言受本次合法新增 skin 分支影响，仅更新该条测试名称与 hash；其余生命周期、ownership/404 类测试内容未改。
- 旧 hash `6140c7351e061a18a6db23753c98ec3c7bbf146e1c97ddacf88b658387b23c61` → B1a hash `69f60628e10e2930a2c8ab540a85b25a1b569957f9e1e48da33f9af87b2c916e`。旧文件留于 `baseline-code/`。
- `v2CanvasPersistenceCutover.test.ts` 既有 course cards 最近笔记 GET 用例无需夹具修改。
- 未运行安全类测试；旧测试使用 `--test-name-pattern` 只选 GET 字节、PUT 正常往返、PUT 源码 baseline、Course 正常 GET。

## 验证

| 验证 | 结果 | 证据 |
|---|---|---|
| 新增 `v13PaperSkin.test.ts` | 4/4 PASS | `server-skin-tests.log` |
| 既有 Note GET/PUT 定向 | 4/4 PASS | `server-skin-regression.log` |
| 既有 Course GET 定向 | 1/1 PASS | `server-skin-course-regression.log` |
| 完整 server 源码 + shared 源码 typecheck | PASS，0 diagnostics | `server-skin-typecheck.json`；`node server/node_modules/typescript/bin/tsc --project docs/audits/2026-09-11-b1a-builder/server-skin-typecheck.json` |
| 完整 server/shared 编译产物 | PASS，exit 0 | 同命令追加 `--noEmit false`；`server-skin-build-local.log`、`server-skin-build/` |
| 原 `npm --prefix server run build` | 标准输出目录受限，未通过 | `server-skin-build.log` |

新增用例覆盖四预设在三级挂点存取，每次实际关闭并重开临时 SQLite 文件；9 token（含 alpha）往返；预设切换清旧 override；逐层 null 清除；settings 与 Typography 不丢失；迟到 metadata 请求不回滚 skin；既有 Project migration 可重复并保持原记录。

标准构建限制：先执行 shared build，写 `shared/dist/*` 返回 EPERM；server 标准 build 因新增 `skin.d.ts` 未能生成而报 TS6305，连带 schema 推断诊断。其 manifest 检查通过，仍为 14 个 public 工具。未修改权限。审计目录的独立配置仅去除 project-reference 对受限产物的依赖，直接编译同一套 server/shared 源码；typecheck 和 emit 均通过，生产 tsconfig 未改。
