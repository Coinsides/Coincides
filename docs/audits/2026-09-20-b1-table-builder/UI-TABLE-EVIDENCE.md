> **状态 (Status)**: completed（builder 定向施工证据；不替代 HQ 放行）
> **日期**: 2026-09-20
> **范围**: B1 客户端新表格 helper、独立编辑器和渲染器；主线程另外申报运行时接线与全量验证。

# 表格 UI 施工证据

## 接口和行为

- `client/src/pages/Notes/canvasEngine/tableBlockService.ts:5`：纯文本 payload 为 `{caption?:string,headers:string[],rows:string[][]}`，无 TextFlow 或公式解释。
- `tableBlockService.ts:15`：1–64 列、0–64 数据行，可额外有一行表头；无表头时至少一数据行。必须矩形，只准 caption/headers/rows 三键，caption+全部单元格总长 ≤65,536 UTF-16 code units。空字符串单元格允许。
- `tableBlockService.ts:56`：caption 非空先一行；表头存在则下一行；数据逐行。行内以 TAB 分隔，caption/单元格内 CRLF、TAB、CR、LF 折成一个空格，与服务端扁平读面格式一致。
- `tableBlockService.ts:84`：CSV/TSV 无新依赖解析；引号外 TAB 优先，否则逗号。支持开头 BOM、CRLF/CR 归一、双引号包裹分隔符与换行、成对双引号转义。末尾单个换行不造空行，中间空行保留，短行补空字符串；超尺寸/未闭引号/结束引号后多余字符报错，不替换现表。
- `blocks/TableBlockEditor.tsx:18`：浮层本地 draft；编辑 caption/cell、增删行列、表头开关、粘贴导入均先改本地状态，Save 一次发出完整独立 payload 给现役撤销集成。保存前无持久化写入。Esc 取消、Ctrl/Cmd+Enter 保存，异步保存锁、错误保留、焦点圈与焦点归还有实现。
- `blocks/TableBlockEditor.tsx:83`：关表头把原表头移入第一数据行；开表头把第一数据行升为表头。64 数据行+表头时拒绝关表头，保留全表并提示先删一数据行；不静默丢数据。
- `blocks/TableBlockEditor.tsx:105`：在表格单元格粘贴多行且含引号外分隔符自动导入替换网格，caption 保留。单列/单行可用显式 Import grid，普通多行单元格文字不自动替换整表。
- `blocks/TableBlockProjection.tsx:6`：语义 table/caption/thead/tbody；阅读与打印共用同一 DOM 数据投影。宽表容器可键盘聚焦并块内横滚，print 开关及打印媒体规则按块宽裁切。
- `blocks/TableBlockProjection.module.css:1`：字体用文档字号/行高各减 2px；皮色全来自 token，表头 9% ink 底纹、偶数行 3% ink 底纹、1px hairline；无 hex。
- `tableBlockService.ts:123`：初始高度估算给现役 DOM 实测替换，不把表格交给 TextFlow 行计量。
- `fixtures/xiningReformsTable.ts:4`：熙宁新法阳性夹具，9 数据行 × 3 列，另有表头和 caption；包含青苗、免役、农田水利、方田均税、市易、均输、保甲、保马、将兵九项。

## 定向验证

执行：`npm.cmd run test:unit -- src/pages/Notes/canvasEngine/tableBlockService.test.ts src/pages/Notes/canvasEngine/blocks/TableBlockProjection.test.tsx src/pages/Notes/canvasEngine/blocks/TableBlockEditor.test.tsx`。

结果：**3 文件、26 测试全部通过**（helper 12、Projection 5、Editor 9）。原始日志：`.codex-tmp/b1-table/ui-targeted.log`。

覆盖 payload 边界/UTF-16 合计、CSV/TSV 常见引号与换行、表头开关与满容量保护、全部结构操作、caption/cell 编辑、保存单次提交与失败重试、Esc/焦点圈、9×3 中文渲染、宽表/打印裁切规则与零 hex。已按 `vercel:react-best-practices` 核对 local draft、effect 清理、焦点、ref 保存锁与无新增依赖；修正了关闭的 import details 内输入不应进入焦点圈的问题。

本文件不宣称浏览器视觉通过、runtime gate 完整通过、全库通过；这些由主线程另外取证。未触现役 TextFlow 真相、Relation、写门、注册表、Agent executor 或 git 写操作。

## 可分享同源阳性样张

交付件：[xining-table.html](./xining-table.html)。自足单文件，包含默认、静墨、暖纸三个项目现役皮预设，每份都是 9 数据行 × 3 列，另含表头与 caption；页面及 metadata 均声明「同源静态复刻，非可编辑应用」。

生成命令：`node .codex-tmp/b1-table/build-xining-sample.mjs`。脚本把现役 `TableBlockProjection`、`XINING_REFORMS_TABLE`、`buildPaperSkinStyles(SKIN_PRESETS[...])` 和 `documentTypographyToCssVars()` 直接导入，经现有 esbuild + React `renderToStaticMarkup` 生成静态 HTML；真实 `TableBlockProjection.module.css` 使用 esbuild `local-css` 编译并内联，类名与 SSR markup 一致。没有手写第二份 table 渲染器，无新增依赖、外部资源或可执行脚本。外围介绍与皮标题仅属于样张包装。

生成脚本、临时 TSX 入口、CJS bundle 与编译 CSS 均留 `.codex-tmp/b1-table/`；原始构建核对日志 `.codex-tmp/b1-table/xining-sample-build.log`。jsdom 核对：3 张表、每张 9 数据行、所有行 3 单元格、同名 caption、三皮绑定、CSS module 与横滚规则、零 script 共 **7 项 true**。本小节只声明生成与结构验证，浏览器应用的真实 TSV 导入/保存/显示证据由主线程单列。
