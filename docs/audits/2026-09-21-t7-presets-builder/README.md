> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Builder Receipt
> **日期 (Updated)**: 2026-09-21
> **权威 (Authoritative)**: 否（施工与验证事实；放行留 HQ）

# T7 · 封面版式与装订预设施工回执

Codex builder 完成两款封面、一款装订及设计室模板抽屉。client 全库 **236 文件 / 2431 项全绿**；server 全量 **111 文件 / 1120 项，1118 通过、2 项 Python 环境阻断**。遵守 [T5 补遗一](../../agent-ops/handoffs/2026-09-21-v14-t5-print-rich-blocks-order.md)，没有因已知沙箱病停工、排除用例或冒称 server 全绿。未发现需要停线的新冲突。本回执不代表 HQ 放行。

工单：[T7](../../agent-ops/handoffs/2026-09-21-v14-t7-cover-binding-presets-order.md)。原始日志、私有启动器及隔离 UI fixture 全部保留于 `.codex-tmp/t7-presets/`；本轮 22 份代码/测试文件的最终 SHA-256 见 [source-manifest.json](source-manifest.json)。

## 逐件交付与行号

下表 `CE/` = `client/src/pages/Notes/canvasEngine/`；`DS/` = `client/src/pages/DesignStudio/`。

| 交付 | 实现与定位 |
| --- | --- |
| 手册式封面 | `shared/types/notePresets.ts:5`；`CE/noteCoverPresets.ts:15`。居中窄列题名、下方述名；窄列通过现役 note_ref 自然换行形成，无新竖排引擎。 |
| 简明式封面 | `shared/types/notePresets.ts:7`；`CE/noteCoverPresets.ts:18`。横排题名与述名行，使用同一笔记现役字段。 |
| 封面人手套用 | `CE/layers/NoteCoverPageControls.tsx:67`；`CE/hooks/useNoteCanvasRuntimeController.ts:756`。仅已有封面页语境显示，进入现役历史队列和普通块/placement 写通道。 |
| 封面补偿与历史 | `CE/applyCoverPreset.ts:21`、`:24`、`:49`。复用该封面首个同字段 note_ref；没有则创建。失败逆序补偿；一项 reversibleEdit 提供 undo/redo。其他内容不删不重排。 |
| 手册式装订 | `shared/types/notePresets.ts:20`；`CE/layers/NoteBindingPanel.tsx:60`；`CE/layers/NoteChromeLayer.tsx:763`。眉中取套用时笔记题、脚中「第 N 纸」、脚右可填；套用直接走现役 binding save/PUT，面板留开继续编辑。 |
| 三款库存与缩略 | `DS/TemplateDrawer.tsx:21`、`:61`、`:68`；`DS/DesignStudio.tsx:45`。三张真实缩略，支持名称过滤和空结果；无应用/保存/创建动作。缩略消费同一配方、runtime 和 NoteReadOnlyPageContent。 |
| 字体角色与完整显示 | `CE/blocks/NoteRefBlockProjection.module.css:19`；`CE/blocks/NoteRefBlockProjection.tsx:13`。题名/述名使用现役字体角色，每次实际 render 重测 textarea，覆盖换配方、换字体/字号时文字不变的场景。 |
| 失败与切笔记边界 | `CE/hooks/useNoteCanvasDataAdapter.ts:1426`、`:2698`；`CE/hooks/useNoteCanvasRuntimeController.ts:47`、`:215`。note_ref 落位失败清理新块；迟到 restore 应答检查 route、generation、hydration epoch 与 mount；离开原笔记后停止剩余套用写入。 |

## 最小数据形状申报

现役 suite 保存的是皮肤/外观组合，不承载封面块摆放或装订结构。本轮新增单个静态共享模块 `shared/types/notePresets.ts`，作为出厂库存；**没有新增持久化目录、表列、schema、preset API 或 suite 保存机制**。

- 封面目录：`id / name / kind / title / description / layout / underlay`。title、description 是字段角色，layout 是配方标识，underlay 是 `cover-or-paper` 角色。
- 装订目录：`id / name / kind / header / folio / footer`，分别声明 `note.title / sheet-number / optional-text`；`NOTE_PRESETS` 只合并上述三项库存。
- 套用封面只产既有 `note_ref` 的 `{ field: 'title' | 'description' }` 与 manual placement。题名和述名没有复制成普通文本，后续编辑仍写笔记真相。配方使用现役 content-origin / page_frame_local / formal_page 契约。
- 满幅衬底继续使用 A3 `binding_settings.cover` 资产槽和原纸页 underlay 投影；两配方都保留已有封面图，空槽继承现役纸色 token。
- 套用装订只 materialize 现役 `NoteBindingSettings`：启用、首内容页起单段、眉中题名、脚中页码、可选脚右；保留 cover 与 coverPage。眉中是套用时标题快照，随后可手改；没有发明装订动态字段 schema。

## 验证

| 验证层 | 最终事实 / 证据 |
| --- | --- |
| client 全库 | **236 文件 / 2431 pass / 0 fail**，退出 0；152.36s。`client-full-direct.log`、`client-full-direct.json`。 |
| 定向范围 | 9 文件，最终在全库中 **182/182**；独立定向最后一轮为 181/181，随后新增的字体变化测高用例由全库覆盖。 |
| server 全库 | **111 文件零排除**，单文件 600000ms，含 v13WildernessExecute 与本地真 OCR；**1120 tests / 1118 pass / 2 fail / 0 skipped / 0 cancelled**，退出 1。详见 [server 验证记录](server-verification.md)。 |
| 装订真实落库 | `server/src/__tests__/v14NoteBinding.test.ts:167`：真实 PUT→GET/关闭重开 DB→继续手改 PUT→再次重开；该文件 7/7，新用例 pass。 |
| 非 git/secrets 验证门 | 从 `verify:v2-bn8-runtime` 拆出 **25/25 组件最终通过**，逐项日志与最终补跑收据见 [验证门记录](gate-verification.md)。git 检查和 secrets 两组件留 HQ。 |
| 最终 client 构建 | `verified-build-client.log/.json`，退出 0，tsc 与 Vite 均通过。现役大 chunk 提示仍在，不是构建失败。 |
| 浏览器实物 | [manual-cover.png](manual-cover.png)：隔离页三款缩略与手册式四字衬线题名完整显示；范围见下。 |

定向文件及最终全库数量：`applyCoverPreset` 8、`NoteCoverPageControls` 11、`NoteBindingPanel` 7、`NoteRefBlockProjection` 7、`useNoteCanvasRuntimeController` 16、`useNoteCanvasDataAdapter` 121、`TemplateDrawer` 2、`DesignStudio` 5、既有 `A3CoverProjection` 5。覆盖两配方落位、重复套用、undo/redo、部分失败补偿、套后编辑、三缩略、无库存应用控件、跨笔记迟到应答及封面投影回归。新增 server 用例在原文件内，文件总数仍为 111。

首轮定向暴露运行时导入别名、测试 fixture 依赖及预览缺少 pageStack，修复后通过；原始 `client-targeted-1` 至 `-4` 日志全部保留。独立只读复查发现的题名列宽、配方切换测高和迟到 restore 问题均已修复，最后一轮复查确认关闭；复查不是 HQ 二级复盘或放行。

### 私有测试基建分账

最初 `gates.mjs` 与 `recheck.mjs` 通过仓根 npm 包装调用 client 测试；原始日志明确显示外层 `cd client && npm run test:unit --maxWorkers=2`，内层实际只有 `vitest run`，并发参数被 npm 吞掉。两次全库分别为 2417/2430、2418/2430，含 5s 超时、异步查询超时等资源争用失败；首次还包含已修复的空缩略断言。没有把这些失败删除或记为通过。

改用私有 `client-full.mjs`，在 client cwd 直接执行 `node node_modules/vitest/vitest.mjs run --maxWorkers=2`，全库 2431/2431 通过。没有修改项目测试配置、测试超时、现役 package scripts、断言或筛选排除来绕红。server 私有 runner 的隔离路径、空 dotenv、显式 npm_execpath 与环境清理沿用 T6/T5 先例，细节分账在 server 报告。

## 出生公约自查

依据 [视觉设计宪章](../../agent-ops/design/visual-design-charter.md)。新增预设没有自带色值、字体族、字号、色板或 `--sk-` token：

- 题名使用 `--sk-title-font / --sk-paper-title-size / --sk-paper-title-weight`；述名使用 `--sk-label-font / --document-font-size`，替换现役 note_ref 原有 36px/18px 硬编码字号。
- 纸色和墨色使用 `--sk-paper / --sk-ink`，同源 skin/material/component/typography 生成器提供缩略外观。
- 抽屉复用现役 SuiteDrawer 样式与间距；封面列宽来自 `MIN_BLOCK_WIDTH`、`BLOCK_HORIZONTAL_CHROME`，坐标和尺寸是实际 content box 的比例配方，未写死纸宽/纸高或新坐标系。
- `第 ` / ` 纸` 是工单指定页码格式文案；预览「笔记题名/笔记述名」是无用户数据的角色占位。它们不是外观覆盖，也不写进用户封面真相。

## 浏览器范围、限制与未做项

私有 fixture 在 `127.0.0.1:5187` 使用实际 TemplateDrawer、NoteBindingPanel、NoteRefBlockProjection、配方和皮肤消费器，以内存回调承接操作；无 server 代理、无用户库。浏览器确认三款缩略可见，点击手册式封面后「宋史手册」四个衬线字完整竖列显示，截图已保存。随后浏览器连接中断，未将后续编辑/装订动作冒记为实物完成；这些路径由 client 与 server 功能测试覆盖。测试 dev server 已停止。没有真实用户库端到端、系统打印/PDF 栅格或主观视觉验收。

封面是既有多次普通写入加失败补偿，不是跨接口原子事务。笔记切换时停止后续写入，不继续跨语境补偿；切换前已保存的普通块可能仍留在原笔记。手册式用窄列换行，长题名/自选字号可按普通块调整；不新增多列竖排、标题自动缩字或新块型。

未新增工具、prompt、Agent 写权、TextFlow 真相 schema、坐标契约、Relation/判定域、依赖、安全对抗用例、合成凭据或 agent 操作指令/权限配置；贴纸与部件抽屉仍为原占位。无 git 写操作、真实远程模型/凭据消耗或用户库操作。开工已有无关改动未处理。Python 两项及 git/secrets 两组件交 HQ 收口。

**说明书同步交接给 Fable**：设计室模板抽屉已由占位变为三款只读库存；套用入口在笔记装订面板，封面必须先有封面页，装订可选脚右文案，套用后可继续编辑。请 current-state 守门在验收后同步上述操作事实；本轮未改 agent 操作说明书。
