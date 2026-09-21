> **状态 (Status)**: recorded
> **层 (Layer)**: 审计证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-21
> **范围 (Scope)**: T1 客户端插入双入口；builder 子任务收据，非独立复核/放行

# T1 插入入口证据

新增「目录」菜单项与 `/目录`（同时接受 `/toc`、`/contents`、`/agenda`）命令。两入口读取同一注册对象、调用同一 insert host；host 转发 `onCreateToc`，经现役 runtime history 队列创建 `block_type: toc`、`contentJson: {}`，沿 `defaultDraftLayout` 保存 placement，并记 `createdBlock` 撤销收据。没有写入章数据、显示参数或新视觉值。

## 实现与验收行号

| 项目 | 路径及行号 |
|---|---|
| 唯一新增注册对象，菜单/斜杠同词「目录」 | `client/src/pages/Notes/noteSlashCommands.ts:44` |
| 菜单现役注册表消费点、调用点（未改） | `client/src/pages/Notes/canvasEngine/layers/NoteInsertMenu.tsx:66`、`:70` |
| slash 现役共用 host 调用点（未改） | `client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts:488` |
| Surface 能力与执行接线 | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:256`、`:426`、`:1575`、`:1590` |
| layer props 转发 | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayerProps.ts:233` |
| 创建、空载荷、布局与撤销收据 | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts:662`、`:665`、`:666`、`:670` |
| 中文检索与键盘执行（原有参数化测试自动覆盖新增项） | `client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.test.tsx:199`、`:205` |
| 八项菜单键盘导航、目录双入口与无编辑器 | `client/src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx:377`、`:403`、`:424` |
| 创建空目录并记录撤销、创建未完成不记历史 | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx:294`、`:312` |

## 测试数字

从 `client/` 执行：

```text
npm.cmd run test:unit -- --reporter=verbose src/pages/Notes/canvasEngine/hooks/useSlashCommandController.test.tsx src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx
```

结果：**3 文件、92/92 测试通过、0 失败**；其中 slash 39、runtime controller 14、surface alignment 39，Vitest duration 4.04s。原始日志：`.codex-tmp/t1-toc/insert-targeted.log`。初次使用 `npm` 命中 Windows 的 `npm.ps1` ExecutionPolicy 拒绝，未启动测试；随后使用现成 `npm.cmd` 执行成功，未改执行策略。

原有斜杠对象核对：施工前完整复制 `noteSlashCommands.ts` 至 `.codex-tmp/t1-toc/insert-noteSlashCommands-before.ts`；使用仓库现有 TypeScript 转译前后文件并执行 `assert.deepEqual`。**原 15 + 7 共 22 个 slash 对象全字段完全相同，原 7 个菜单对象全字段完全相同；仅新增 1 个 slash / 1 个菜单项，二者为同一个注册对象。** 比较程序 `.codex-tmp/t1-toc/insert-compare-slash.mjs`，原始输出 `.codex-tmp/t1-toc/insert-slash-object-equality.log`。

## 出生公约与未做项

- 出生公约自查：**零字面视觉值**。本子任务仅新增词汇和执行接线；复用菜单原有样式，未新增颜色、字体、间距、发丝线或 skin token。目录渲染的取值点与五皮肤断言由主 builder 汇总。
- 未改 `NoteInsertCommandsContext.tsx`、`NoteInsertMenu.tsx`、`useSlashCommandController.ts`、`useRuntimeNaturalWritingController.ts`；现役共用注册/host 已直接承接新目录项。
- 没有 git 写操作、依赖/账号/用户库/真实模型调用；没有新表新列、TextFlow 真相/坐标契约/提案/schema/prompt/Relation 变动；没有新安全对抗类用例。
- 客户端全库、服务端全量与 agent 族、verify 非 git/secrets 组件、渲染/页码/flat text 投影证据留主 builder 汇总。本子任务没有代替 HQ 放行，也没有更改工单状态。
