# 批三 NWSL / CSS / boundary 独立交叉检查

> 状态：complete（只读交叉检查）；日期：2026-09-13；执行者：Codex server_fixtures 子代理。
> 范围：根代理本轮删改对比 `.tmp/purge-resume-baseline.json`；不代替末批全量、门改红演示或真浏览器验收。

结论：在指定范围内未发现活语义误删或需要修补的外部引用漏尾。本次未编辑生产代码、测试或主工单；未调用 git、访问 `.git`、读取环境密钥或用户数据库，未启动测试全量。

- NWSL 的 `handleExtractTextUnit` 整个声明与基线逐字一致，明确包含原 3437 与 3442 两条 `freeLayout(...)` 路径。准备区 staging drag/drop、tray/content drop、图片 paste、TextFlow 两种变更入口、文档选择状态与墨水启用条件等共 12 个抽取声明均逐字一致。`layoutForBlankDrop` 仅移除 Canvas workspace 分支，Page 的缩放换算与 `screenLayoutToLocal` 原文保留。
- `PageFrameWallLayer`、`PaperInkLayer`、`DraftWritingEntryLayer` 的 JSX 属性串逐字一致；Page 墙的 `interactive` 只读限制与墨水创建/删除回调仍在。`BlockEditorLayer` 61 个属性全部保留，60 个逐字不变；唯一差异为 `onBlockContextMenu` 删除五个已退役菜单清理调用，活 annotation/block 菜单调用原文保留。TextFlow 编辑、保存、移动、导航与 Source `contentReadOnly` 传递均在这 60 个不变属性内。
- Source 活的 mouse/double-click/drag/drop 禁用门、准备区 drop 的 `contentReadOnly` 早退、图片粘贴及文字单元移动限制保持。删除的 8 个含只读条件的 JSX 属性只属于退役 Canvas 菜单、输入、四个对象层和 Inspector；剩余 12 个含只读条件的属性原文一致。Page guides/slots 的坐标转换保留；navigation 障碍数组原本只在 Canvas 非空，删除后 Page 保持空障碍语义。
- 五个 `ImageObjectLayer` / `ObjectInspectorLayer` / `ShapeObjectLayer` / `TableObjectLayer` / `VisualConnectorLayer` 文件已不存在。扫描 `client/src`、`client/scripts`、`server/src`、`server/scripts`、`shared`、`scripts`，这些名字仅留在 boundary 的禁止注入/文件缺席断言中，无活 import 或调用。
- PostCSS 比对：`NoteDetail.module.css` 732 → 664 个 rule；660 个 selector、声明体、父级 at-rule 上下文完全不变。另 4 个规则只移除已死 selector 成员或 `.pageCanvas` 否定条件，声明体及上下文不变；其中 workbench / warm-paper 的 Page 与 overview、warm-paper overview preview 均保留。其余 68 个完整规则属于退役 Canvas host/pan/zoom-slider/frame壳/五层样式；Page reading 共用的 `canvasZoomControl`、`canvasZoomButton`、`canvasZoomReset` 保留。
- 两个删去的 shape style class key 仍作为 `objectStyleService.ts` 返回值/类型字符串存在；`resolveCanvasObjectStyle` 与 `cssClassName` 在上述源码范围内无外部消费者，不形成活 DOM/CSS 引用。该历史服务未扩大清理。
- boundary 的静态字面量命名调用 134 → 138，103 个调用原文保留；31 个原 Canvas/旧 reserve/旧层调用退休或换为 Page 对应门，增加 35 个 Page 活门及禁止死枝门。已核对 Page 模板、框集合动作、版式、墨水、Page reading 和历史 placement 的替代门。`record` 仍在失败时立即抛错，末尾新增门也参与失败退出。

机器证据：[batch3-independent-check.json](batch3-independent-check.json)，包含逐项原文比较结果、全部变化 selector、引用命中与当前三文件 SHA-256。复现脚本：`.tmp/purge-independent-check.cjs`（读取源码并只写此 JSON）。
