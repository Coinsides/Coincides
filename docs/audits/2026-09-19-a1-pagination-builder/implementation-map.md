> **状态 (Status)**: active（builder 交付索引，非 HQ 放行）
> **层 (Layer)**: audit / 蒸馏证据
> **日期 (Updated)**: 2026-09-19

# A1 逐件实现索引

以下行号对应本次冻结工作树，源码路径均以 `client/src/pages/Notes/canvasEngine/` 为根。

| 工单件 | 文件与入口行 | 实现 / 证据 |
|---|---|---|
| 分页引擎数据形 | `documentPageFlowService.ts:77`、`:114`；原 `pageStackContentFlowService.ts` 再导出 | collection / frames / fragments / placementUpdates / appendedFrameIds / excludedBlockIds / overflows；完整行切分、目标页宽重测、整块下移、超高独页、确定性续页。16项纯引擎测试 |
| TextFlow→分页输入 | `notePageFlowService.ts:13`、`:49`、`:66` | 逻辑 unit 连续范围、角色/缩进/隐藏状态；相同 plan 转现役 fragment projection 与首片 layout，不改内容 schema |
| 度量承重 | `typographyMeasurementService.ts:78`、`:152`；`typographyDomMeasurementService.ts:49`、`:152` | 共用 CSS 字体度量、indent、角色字号/行高比率、逐行UTF-16；DOM回填、有限派生cache、字体失效；14项定向+5组真实Chrome |
| 生产入口与收敛 | `hooks/useNotePageFlow.ts:11`、`:43`；`hooks/useNoteCanvasRuntimeController.ts:273` | 先保存页集合，再调用既有placement首片换籍；签名含几何，过滤重复保存，异步变化用最新计划；4项hook回归 |
| runtime唯一plan | `hooks/useNoteCanvasLayoutModel.ts:181`、`:306`；`hooks/useRuntimeFrameModelController.ts` | runtime/导出预览拿同一对象；既有非flow片保留；draft默认位置看到所有续片 |
| 跨片编辑 | `blocks/PaginatedTextBlockProjection.tsx:37`；`paginationEditingService.ts:27`、`:67`、`:77` | 单一逻辑editor，多textarea投影；光标/选择/复制/删除/粘贴/Enter/IME/撤销；canonical end与displayEnd区分硬换行；垂直软缝caret affinity |
| 现役历史与剪贴板 | `fragmentTextareaService.ts:2`；`hooks/useTextFlowHistory.ts:106`；`hooks/useBoardReferenceClipboard.ts:10`、`hooks/useBoardStagingSelection.ts:8` | caret与范围加减片起点，历史还原按包含逻辑offset的片定位；不增加历史栈或第二份文本 |
| 把手/章/来源 | `hooks/useTextUnitHandleDrag.ts:16`；`layers/BlockSourceReferenceLayer.tsx`；`pageFlowSourceReferenceService.ts:6`；`layers/BlockEditorLayer.tsx:157` | 续页拖拽命中真实片区；每unit把手和标注章只有首片入口；来源首片固定56px可横向滚动，预算与实际CSS同源 |
| 阅读面续纸 | `layers/NoteWritingSurfaceLayer.tsx:306`、`:1546` | 逐页纸面/墙/页号/插槽，所有续片参与可滚动范围；保留模板/纸肤；结构化溢出提示。x遵循现役reading列投影，y使用页世界位置 |
| 打印/Overview/导出 | `layers/NotePrintLayer.tsx:21`；`layers/NoteReadOnlyPageContent.tsx:35`；`layers/NotePageThumbnail.tsx`；`pagePrintProjectionService.ts:11`、`:43`；`exportPreviewService.ts:196` | 同一fragment范围与目标页几何，逐页named @page；真实浏览器65个slice逐项相同 |
| 异形纸高 | `pageFramePrintScaleService.ts:83` | 明确pageSize的宽/高均保留；旧缺省纸型回填仍在；A4/Letter短页两项断页+固定点回归 |
| 墨水页籍 | `layers/PaginationProjection.test.tsx` | 沿用原PaperInkSvg/CanvasPlacement路径，两个测试证明文字首片迁移且新建页时墨水只留原页；同源projection+只读层8/8 |
| 说明书 | `docs/agent-ops/current-state/app-operating-manual.md:25` | §一补5条：纸型分页、改版/页籍、跨片编辑、整块溢出、manual/Web/墨水与保留页 |

最终全部客户端测试 **183文件 /1853测试 PASS**；各组件原始日志、server环境欠项、HQ两组件分工见 [验证报告](verification-components.md)。详细交互剧本见 [验收剧本](acceptance-scenario.md)，实测数字见 [度量证据](typography-measurement-evidence.md)，最终浏览器结果见 [runtime与浏览器](runtime-integration-and-browser.md)。

未动 server产品源码、Relation域、注册表/写门、Agent机关、TextFlow schema、墙九条、依赖或agent操作指令。读过Git status/diff；未作Git写操作、commit、push、PR或merge。工作树交HQ验收代账。
