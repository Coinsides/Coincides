> **状态 (Status)**: completed (builder integration evidence; not HQ release approval)
> **日期**: 2026-09-20
> **范围**: B2 客户端沿 B1 的建模消费、hydration、保存、撤销、分页、检索、呈现入口

# 客户端整合证据

## 先例与链路

以 `git show 15f36573` 只读考古 B1；逐个扩展其现役接缝，未另建块存储、分页或撤销系统。

| 接缝 | B2 实物位置（`client/src/pages/Notes/canvasEngine/` 相对路径） | 行为 |
| --- | --- | --- |
| 纯 payload 与扁平投影 | `blockContentService.ts:172` | `component` 使用 `componentBlockPlainText`；模板、文字保存/转换辅助保留组件 envelope，不把 params 转成 TextFlow |
| hydration / 创建落点失败回滚 | `hooks/useNoteCanvasDataAdapter.ts:1419` | 复用既有 `hydrateClientBlock`；组件 placement/order 不完整时沿 B1 删除未完整安置的新块 |
| 专用保存 | `hooks/useNoteCanvasDataAdapter.ts:1795` | 校验后通过现役 writeRegistry + PUT `/note-blocks/:id` 保存 `content_json`；数据库 `plain_text` 保持 null，read_note 读时从 payload 投影；route generation 防陈旧回写；普通 body flush 为 no-op |
| 历史 | `hooks/useComponentBlockHistory.ts:16`；`hooks/useNoteCanvasRuntimeController.ts:509` | 深拷贝前后 payload，排入现役 `enqueueRuntimeHistoryOperation`，记录 `reversibleEdit`；无新撤销栈 |
| 三 kind 创建入口 | `hooks/useNoteCanvasRuntimeController.ts:641`；`layers/NoteWritingSurfaceLayer.tsx:1924` | Timeline / Bar chart / Line chart → 浮层编辑器 → `component.<kind>` 模板 → createBlock → `createdBlock` 历史 |
| 共用投影与编辑 | `layers/BlockEditorLayer.tsx:271,570,652` | component 独立于 TextFlow body；双击已知 kind 打开浮层；未知 kind 无编辑器入口；readonly 不打开编辑器 |
| Overview / print / export | `layers/NoteReadOnlyPageContent.tsx:72`；`layers/ExportPreviewLayer.tsx:39` | 同一 `ComponentBlockProjection`；共享既有 flow fragments，打印时间线保持默认折叠，不在打印时擅自扩大已分页高度 |
| 初始估高 / 实测 | `measurementService.ts:102` | 同 B1 的估高加 block chrome；现役 BlockEditorLayer 的 `useBlockMeasurement` 实测：组件没有文本 fragment，`paginated=false`，因此 ResizeObserver 保持启用 |
| 分页 | `notePageFlowService.ts:22` | component 映射 A1 `media` 分页类别：整块不裂、顶爆下移、超高独占并报告溢出；未改坐标契约 |
| 检索 | `noteNavigationSearch.ts:42` | 每次从活 payload 投影，覆盖 timeline title/year/label/detail 与 chart title/x_labels/series.name/y_label，忽略陈旧 plain_text |

## 定向结果

原始最终测试输出：

- `.codex-tmp/b2-component/integration-directed.log`：3 files，**133 / 133 PASS**。
- `.codex-tmp/b2-component/integration-runtime.log`：1 file，**12 / 12 PASS**。

合计 **4 files，145 / 145 PASS**；其中本整合新增 **25 cases**，其余是对应文件既有回归。命令使用现有 `npm.cmd run test:unit --prefix client -- <files>`，无 timeout 修改、无筛掉既有用例。

| 测试文件 | 数量 | 本次覆盖 |
| --- | ---: | --- |
| `hooks/useComponentBlockHistory.test.tsx` | 9 | 三 kind 真正 usePlacementHistory undo/redo、payload 拷贝、顺序、边界拒绝、失败重试、不变 no-op、route generation 与 in-flight 隔离 |
| `componentBlockIntegration.test.tsx` | 8 | 三分页形态（每条遍历三 kind）；三 kind 的 Overview/print/export 同一 flow plan、readonly 不开编辑器；检索活内容与替换；真实 block shell cancel/save 不触发 TextFlow |
| `hooks/useNoteCanvasDataAdapter.test.tsx` | 116 | 含新三 kind hydrate/create/save/no-TextFlow；组件 placement/order 失败补偿；既有 adapter 回归全部跑 |
| `hooks/useNoteCanvasRuntimeController.test.tsx` | 12 | 含新三 kind → 正确 template / createBlock / selection / existing history 桥接；既有 runtime 回归全部跑 |

## 边界

- 本报告只申报客户端整合定向结果；client 全库、server 全量与 runtime gate 由总 builder 汇总，不以本报告冒充完整门绿。
- `read_note` 服务端扁平投影、params 校验表、注册表、UI 全动作与两张样张证据由对应施工报告提供。
- 未修改 Relation、Agent 注册表、写门、TextFlow 真相 schema、page_frame_local 九条、依赖或任何 git 状态。
- 未设计安全对抗用例；新增 fixture 不含凭据形合成值。
