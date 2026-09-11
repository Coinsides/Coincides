> **状态 (Status)**: completed — builder evidence，非 HQ 主观验收 / 放行
> **日期**: 2026-09-11
> **对应工单**: [13.5 E5](../../agent-ops/handoffs/2026-09-11-v13-5-e5-cover-metadata-order.md)

# E5 封面元数据交付证据

交付包括唯一新真相 `note_tags`、既有 notes 路由族内的人类 CRUD 与只读聚合 GET、封面单行标签与上下游浮层，以及旧 View info 的完整退役。聚合查询只读，标签不接入检索或 Agent。产品及定向测试共 27 个文件（18 修改、9 新增）；逐文件 SHA-256 见 [source-manifest.json](source-manifest.json)，包含新增文件的完整补丁见 [product.diff](product.diff)。工单 Result 申报迁移、接口与逐列取数口径。

## 浏览器环境与复现

Chrome 真浏览器通过 CUA 操作本地完整前后端，专用端口 5185 / 3105。数据库为 `.codex-tmp/e5-builder/smoke.db`，全部是 `e5-browser-*` 合成数据；没有连接正常应用数据库或修改用户原有浏览器标签页。测试账号仅为本地 fixture：`e5-browser@example.test` / `E5-browser-fixture-only`。源文档、引用笔记、板、内容组、Source 投影由 [fixture](../../../server/src/__tests__/helpers/v13NoteMetadataFixture.ts) 构造。

启动两个终端：

```powershell
# 从 server/ 运行隔离后端
node --import tsx ../docs/audits/2026-09-11-e5-builder/smoke-server.mts
```

```powershell
# 从仓库根运行前端，代理只指向隔离后端
node docs/audits/2026-09-11-e5-builder/smoke-vite.mjs
```

打开 `http://127.0.0.1:5185/` 登录，主纸为 `#/notes/e5-browser-e5-paper`，安静态纸为 `#/notes/e5-browser-e5-empty`。复用此 DB 时已存在的 fixture 不被重置。启动脚本在创建 fixture 时保存 before-placements.json。完成本轮操作后已停止测试进程。

## 冒烟结果

| 验收 / 扩展检查 | 实际结果与证据 |
| --- | --- |
| 标签持久化 | 输入带首尾空白的 `E5 smoke` → 添加 → 整页刷新仍在：[tag-after-reload.png](tag-after-reload.png)。删除 → 刷新后 DOM 删除按钮计数 0：[tag-removed-after-reload.png](tag-removed-after-reload.png)。存在截图仍带高度测试的长说明，随后正常 UI 恢复短说明；标签检查独立成立。 |
| 折叠条与三节 | [aggregate-final.png](aggregate-final.png)：Upstream 4（源 2 + 笔记 2），Downstream 3（板 2 + 内容组 1）；源明细计数 1/2，引用笔记各 1，板卡 4/1，组内相关 Item 2。浮层内滚动，Statistics 为 Page / Blocks 2 / Sources 3 / active。 |
| 空态 | [quiet.png](quiet.png)：无标签无引用；DOM `data-empty=true`、Add tags computed opacity=0。hover / focus 表头才显影；键盘仍可访问。 |
| View info 退役 | [more-menu.png](more-menu.png)：旧菜单项消失；统计迁入浮层。产品 handler、info state、旧弹窗、旧 CSS 均移除。 |
| Overview | [overview.png](overview.png)：进入 overview 后元数据行 visibility=hidden，浮层 DOM 数量=0；沿用原表头排除方式。 |
| Print | [print-stylesheet-synthetic.png](print-stylesheet-synthetic.png) 与 [print-stylesheet-result.json](print-stylesheet-result.json)：在真浏览器触发 `beforeprint`，再合成应用实际生产 `@media print` 规则。生产 NotePrintLayer 输出 1 页；print root 内表头/元数据数 0，打印内容可见，应用根 visibility=hidden，元数据行 display=none。**这不是系统打印对话框验收**；原生打印预览未能通过自动化完成检查，未提交打印任务。 |
| Source 导航 | [source-anchor.png](source-anchor.png)：legacy source reference 经现役 anchor 跳回实际 parsed source page。global Source 经 retained projection_note_id 到源投影；[readonly-statistics.png](readonly-statistics.png) 同时证明只读纸仍有统计入口。fixture 没有 raw-file blob，未将此冒烟算作原文件下载/预览验证。 |
| 下游导航 | [board-navigation.png](board-navigation.png)、[group-navigation.png](group-navigation.png)：分别进入真实 BoardPage 和 SingleContentGroupEditor。板卡重叠是合成 fixture 的零布局，截图用于导航验证。笔记/板/组使用现役 Router Link，保留离开写入拦截。 |
| 窄视口 | [narrow-390.png](narrow-390.png)：390×844，浮层 x=14..382、y≈100.30..795.30，宽368高695，处于视口内并可内滚；纸张自身按现役阅读缩放显示。 |
| 表头上限 | [max-height.png](max-height.png)：长标题和长说明，实际 header offsetHeight=244、maxHeight=244px；title80 / description72 / metadata28。左右墙的对齐与显式非零坐标由 NoteRuntimeDocumentLayer 定向测试覆盖。 |
| 存量坐标零改写 | [placement-comparison.json](placement-comparison.json)：主纸两条 note_block_placements 全字段 before/after 相等，包括 overrides、order、updated_at。fixture 无显式 canvas_placements，不能把此 DB 比较说成非零 canvas 坐标冒烟；非零 x/y 与负 y 的不改写由集成测试覆盖。 |

仅测试用前端插件在 URL 含 `e5-smoke=1` 时增加打印检查按钮。它触发现役打印层并复制现役打印 CSS，不改产品打印实现。此插件不会随正常应用构建部署。

## 最终测试与静态门

| 命令 / 检查 | 数字 / 结果 | 日志 |
| --- | --- | --- |
| Client 定向 Vitest（8 文件） | **82 / 82**，3.45 秒；新增 NoteCoverMetadata 23 项 | [client-tests.log](client-tests.log) |
| Server 定向 Node tests（4 文件） | **25 / 25**，5.85 秒；新增 E5 7 项 | [server-tests.log](server-tests.log) |
| Client `npm.cmd run build` | PASS；包含 `tsc -b` + Vite | [client-build.log](client-build.log) |
| Server `npm.cmd run build` | PASS；包含 manifest check + `tsc` + copy | [server-build.log](server-build.log) |
| `check:canvas-runtime-boundary` | **167 checks PASS** | [canvas-runtime-boundary.log](canvas-runtime-boundary.log) |
| `check:groups-rail-shell` | PASS | [groups-rail-shell.log](groups-rail-shell.log) |
| `check:source-experience` | contract + model PASS | [source-experience.log](source-experience.log) |
| `check:tool-face-parity` | **14 public entries PASS**；必要条件检查，不宣称全部人面旅程已验 | [tool-face-parity.log](tool-face-parity.log) |
| `check:server-shared-runtime-import` | **222 product files，0 violations** | [server-shared-runtime-import.log](server-shared-runtime-import.log) |
| `git diff --check` | PASS（只读） | 本轮工具记录；LF/CRLF 提示无 whitespace error |

总计 **107 个不同用例通过，新增 30 个（Client 23 + Server 7）**。client-projection-tests.log 是此前两个投影文件 30 项单独执行的记录，最终已合并到 82 项，不重复计数。新增测试覆盖 CRUD/trim/48 上限/唯一性/actor enum/级联、Source 保留用户工作、聚合去重及现算、GET 零 DB 写、空态/只读/浮层导航/错误重试/写入追踪/慢 GET 与 mutation 竞态。

复跑 Client：从 client/ 执行：

```powershell
npm.cmd run test:unit -- NotePaperHeader.test.tsx NoteCoverMetadata.test.tsx NoteChromeLayer.test.tsx ViewOptionsMenu.test.tsx useNoteCanvasRuntimeController.test.tsx inFlightWriteRegistry.test.ts NotePrintLayer.test.tsx NoteRuntimeDocumentLayer.test.tsx
```

复跑 Server：从 server/ 执行：

```powershell
node --import tsx --test src/__tests__/v13NoteMetadata.test.ts src/__tests__/v2NoteFoundation.test.ts src/__tests__/v2NotesListService.test.ts src/__tests__/v2SourceLifecycleClosure.test.ts
```

按照本单要求仅跑受影响秒级门，未跑全量 `verify:v2-bn8-runtime`、安全测试或秘密扫描。构建保留现役 recursive JSON schema、Vite chunk/static-dynamic import 提示；测试保留 React Router future flag 提示，所有命令 exit 0。日志中的 PowerShell NativeCommandError 包装来自 stderr 警告，不是失败退出。

## 交付边界

没有新增封面聚合副本表、层级标签、Agent 动词或 retrieval/embedding 接线；没有 TextFlow 实现改动；没有修改权限、AGENTS/CLAUDE、current-state 或 Git 元数据，未 commit/push/PR。未发现工作区冲突。开工前存在的无关未跟踪文件未改动。早期自动化曾过早截取 Loading 帧，标签存在/删除与安静态证据已经等待实际 DOM 水合后重拍核验；最终引用以上命名证据。
