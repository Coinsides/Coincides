> **状态 (Status)**: completed (builder evidence; 非验收放行)
> **日期**: 2026-09-21
> **工单**: `docs/agent-ops/handoffs/2026-09-21-v14-t8-visual-relations-order.md`
> **范围**: T8 纸面墨色修与同病排查；关系扫描与全量回归见本目录其他报告。

# 墨色修与排查收据

本子项改动 14 个生产文件及 1 个既有功能测试。没有修改皮肤工厂快照、持久化 token/schema、几何、分页算法、依赖或用户数据；没有 git 写操作。生产 TSX 仅增加一个颜色 class 和槽位墨色表达式。

## 1. 真正的纸外颜色继承缺陷

| 位置（修后行号） | 原问题与覆盖面 | 修复 |
|---|---|---|
| `client/src/pages/Notes/canvasEngine/blocks/NoteRefBlockProjection.module.css:12` | `.projection` 原为 `color: inherit`。纸面只设置皮肤变量不等于设置元素颜色，正常视图题名/述名 textarea 会继承纸外壳近白色；只读 div 使用同 class。 | 显式 `var(--sk-ink)`；题名与述名、编辑与只读、正常/Overview/print 共用同一个声明。占位文本 `:21` 显式 muted/ink 派生并设 opacity=1。 |
| `client/src/pages/Notes/canvasEngine/blocks/PaginatedTextBlockProjection.tsx:496`；`client/src/pages/Notes/NoteDetail.module.css:1763` | 分页列表序号/项目符号的 span、折叠 marker button 无墨色声明，外层定位块也没有颜色声明。 | 新 class `paginatedTextMarker` 仅声明 span/button 的纸内墨色，不改变任何尺寸、定位、状态或处理器。 |

以上两项与下面的声明加固区分：原有 `--text-primary` / `--text-secondary` 在 `buildPaperSkinStyles` 中已经分别映射到 `--sk-ink` / `--sk-ink-muted`，不能把所有旧别名消费都声称为纸外继承 bug。

## 2. 声明加固与关系扫描发现的低对比文本

下表列出其余每处改动；所有行号以本批生产修改完成时为准。

| 文件 | 行号 / selector | 变化 |
|---|---|---|
| `client/src/pages/Notes/NoteDetail.module.css` | `1419` blockStatusBadge；`1429` On；`1433` Muted；`1437` Warning | 显式纸内 muted/annotation + ink 派生；原有文字别名退出这些纸上状态标签。 |
| 同上 | `1539` pageTextArea | TextFlow、普通/标题/草稿编辑及 code/formula 编辑共有基类显式 ink。 |
| 同上 | `1745` textUnitMarker；`1760` markerButton/todo | 非分页列表标记显式可读 muted/ink。 |
| 同上 | `1827` inlineLinkTextLayer；`1831` 普通 span；`1836` caret；`1840` inlineLink；`1856` unavailable；`1866` anchorLost | 普通文字显式 ink；链接/降级标签使用可读 accent/muted 派生；透明原生编辑层保留，光标显式 ink。 |
| 同上 | `3682` pageFrameSlot；`3696` pageFramePageNumberSlot | 默认六槽文字加深 muted；移除旧页码 opacity=0.78，防止已加深文字再次被透明化而降低对比。 |
| 同上 | `3709` placeholder；`3714` structuredEyebrow/fieldLabel | 纸面占位及字段说明显式 muted/ink。 |
| 同上 | `3725` definitionBlock/formulaBlock；`3729` definitionName；`3736` definitionDescription；`3756` fieldInput | 保留现有投影，文字显式 ink。 |
| 同上 | `3772` formulaInputHeader；`3788` formulaHelpButton；`3803` help hover/focus；`3827` formulaPreview；`3833` formulaName；`3840` formulaExplanation；`3846` emptyStructuredField | 公式本体 ink；说明/空状态/帮助标记可读 muted；浮动帮助弹层保留自身表面配色。 |
| 同上 | `3879` codeLineGutter；`3888` gutter span；`3896` codeTextArea；`3902` quoteTextArea；`3910` draftHint | 行号、引文、草稿提示可读 muted；代码正文显式 ink。 |
| 同上 | `3967` sourceRef；`3978` sourceRefAction；`3985` action hover | 来源条/来源操作文字显式纸面 token。 |
| `client/src/components/KaTeX/KaTeXRenderer.module.css` | `7` `.katex :global(.katex)` | 优先 `--sk-ink`，非纸面使用保留 `--text-primary` 回退。KaTeX 生成内部节点从此本体声明继承，不从壳继承。 |
| `client/src/pages/Notes/canvasEngine/blocks/ComponentBlockProjection.module.css` | `11` title；`15` year；`20` summary/entryLabel；`22` detail；`24` axisLabel；`29` SVG text/tspan；`41` legend；`44` unknown strong；`45` unknown/invalid | 标题、时间线标签、图例显式 ink；时间线年份 accent/ink；说明和坐标文字 muted/ink；SVG 采用 fill。图形线/条/点、装饰色不改。 |
| `client/src/pages/Notes/canvasEngine/blocks/TableBlockProjection.module.css` | `26` caption；`36` th/td；`57` invalid | 单元格显式 ink；说明和无效状态可读 muted。原 viewport 已声明纸内 ink，并非原 shell 继承缺陷。 |
| `client/src/pages/Notes/canvasEngine/blocks/TocBlockProjection.module.css` | `8` title；`14` entry；`21` hover/focus；`23` chapter；`24` page/empty | 显式 ink；`all: unset` 后重新声明颜色；页码与空状态可读 muted。原 `.toc` 根已有 ink。 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.module.css` | `20` status/placeholder；`27` span | 媒体错误/占位文本显式 ink。 |
| `client/src/pages/Notes/canvasEngine/blocks/ItemRefBlockProjection.module.css` | `14` summary | 引用卡正文显式 ink；未改 Item/Relation 真相或读取行为。 |
| `client/src/pages/Notes/canvasEngine/blocks/ParagraphFurniture.module.css` | `7` label；`8` source | callout 标签用 annotation/ink 50% 混合；出处用 muted/ink 65% 混合。衬底与几何不动。 |
| `client/src/pages/Notes/canvasEngine/layers/ChapterHeadingFurniture.css` | `1` furniture；`2` button；`4` number | 章节边栏数字及按钮显式可读 muted。 |
| `client/src/pages/Notes/canvasEngine/layers/NoteCoverMetadata.module.css` | `1` row；`3` chip；`4` chip span；`6` add/disclosure；`9` disclosure span；`17` rowError | 纸上标签行显式 ink/muted。metadata popup 是独立浮面，不按纸色改它。 |
| `client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.module.css` | `7` header；`22` title/description；`29` description；`34` description placeholder | 旧题名带/打印题名声明显式 ink；副文加深 muted。原 title 从已绑定纸内墨色的 header 继承，属于声明加固。 |
| `client/src/pages/Notes/canvasEngine/layers/PageFrameSlotsLayer.tsx` | `20–21` color override | 显式 ink 保持原值，accent/muted 选择保留其 token 但以 65% 原色 + 35% ink 投影，满足五皮肤小字对比度。 |
| `client/src/pages/Notes/canvasEngine/layers/BindingProjection.test.tsx` | `38` | 更新既有 override 功能测试的投影期待，继续检查用户色族选择；独立关系扫描计算实际对比度。 |

## 3. 数值证据与实现选择

工厂 token 原值未改。纸内小字采用 `color-mix(in srgb, var(--sk-ink-muted/--sk-accent) 65%, var(--sk-ink))`；annotation 小字采用 50% 混合。没有新增 `--sk-` token。

| 项目 | 原最低对比度 | 修后最低对比度 |
|---|---:|---:|
| 五工厂 muted 文字 vs 纸色 | 3.819051（warm-paper） | 5.896689 |
| 五工厂 accent 文字 vs 纸色 | 3.057245（silk） | 4.981391 |
| 五工厂 annotation 文字 vs 纸色 | 2.660497（warm-paper） | 5.831808 |
| warm-paper 封面题名 | 1.015757（继承壳 #f5f5f5） | 13.537189 |
| 修后题名五皮肤最低 | — | 12.726461（silk） |

warm-paper 渐变最暗端 `#F5F0E5` 上，修后 muted 小字仍为 5.745810。以上是独立 token 计算侦察值，不替代常驻 scanner 在挂载 DOM、真实 CSS 声明、实际衬底上的断言。计算脚本及原始数据为 `.codex-tmp/t8-relations/ink-contrast.cjs`、`ink-contrast.log`、`ink-title-contrast.log`。

## 4. 排查射程与明确豁免

排查了 `BlockEditorLayer` 的现役投影分支：TextFlow（普通与分页）、note_ref、toc、formula、code、table、component、media、item_ref；另外读了六槽、段落装饰、章节标记、纸上题名/metadata、来源条、草稿入口、只读共享投影及这些分支的 textarea/输入面。对比度常驻扫描覆盖及样本数字由关系报告单列。

- 表格/组件/图片编辑对话框、ParagraphFurnitureEditor、metadata popup、ReferenceTag details、工具栏/右侧面板和其他纸外浮面有自己的底色和显式壳 token，不作为“纸色上的文字”替换；它们不是未声明的纸面编辑字段。
- `textUnitAnnotationTextLayer`、`inlineLinkEditor` 原生 textarea 的透明文字是双层渲染设计；用户实际看到的是显式墨色的 InlineLinkTextLayer/正文层。装饰高亮与隐藏副本不当成独立可读文字。
- staging/tray 未采纳内容、用户媒体位图内的字、视频原生控件、封面任意图片像素，不由本次 CSS 纸色扫描保证。尤其任意封面图与文字的局部像素对比度需要另一个像素来源，不可声称已由 jsdom 验证。
- 用户自定义 token 任意组合、作者自选批注色、不可见/禁用交互状态不获得“五工厂默认可读性”的泛化保证；工厂 token 及声明衬底的正常可读文本属于本次验证。
- SVG 图表线/条/点/色块、纸纹、墙线、纯图标不是 WCAG 文本对比度扫描对象；SVG text/tspan 是文字并已修。
- KaTeX 生成内部 span、已绑定墨色文本容器内的普通嵌套文本可以在投影内部继承；本次没有使用一个纸面根 `color` 掩盖失去自己墨色声明的编辑器。

## 5. 验证与未做项

- 最终定向：14 文件 / 126 用例通过，原生日志 `.codex-tmp/t8-relations/ink-targeted-final.log`，命令显式返回 Node exit code 0。
- Canvas runtime boundary：175 checks 通过，`.codex-tmp/t8-relations/ink-canvas-boundary.log`。
- 行号清单与只读 diff：`ink-declarations.log`、`ink-diff.log`。这两个日志只包含此墨色子项，不包含其他 agent 的几何/scanner 工作。
- 已按 `vercel:react-best-practices` 检查两处生产 TSX：没有新增 hook、数据读取、事件监听、状态、组件定义、依赖或渲染阶段 DOM 操作；只加纯 CSS class/颜色表达式，既有键盘和 aria 行为保留。
- client 全库、server 111 文件全量、非 git/secrets 验证组件与三型关系断言由主 builder 汇总；本子项不重复冒领其结果。主观视觉验收、git 检查、secrets 留 HQ。
