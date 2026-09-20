> **状态 (Status)**: completed（builder UI 子任务证据；不作最终放行）
> **日期**: 2026-09-20
> **范围**: B2 内置组件投影、浮层编辑器、自铸阳性样张与对应定向测试

# UI 组件证据

延用 B1 `TableBlockProjection` / `TableBlockEditor` 的块投影、CSS Modules、skin token、portal 浮层与单次 Save 事务边界。未新增依赖、动态模块加载、自由 HTML 或持久化呈现字段。CodeGraph 目录存在，但当前会话 CLI 不可用且无对应 MCP 工具，定点读取 B1 现物后施工。

## 实现定位

| 内容 | 文件与行号 |
| --- | --- |
| 手工闭集渲染分流、未知 kind 名称与「未注册组件」占位 | `client/src/pages/Notes/canvasEngine/blocks/ComponentBlockProjection.tsx:86`、`:108` |
| 时间线列表与原生 detail 折叠 | `ComponentBlockProjection.tsx:95`、`:100` |
| 分组柱/折线共用 SVG 轴系与数值标签 | `ComponentBlockProjection.tsx:29`、`:51`、`:71` |
| x 标签分行、完整标签辅助描述 | `ComponentBlockProjection.tsx:13`、`:50`、`:61` |
| 独立本地草稿、原始数值键入串、Save 防重复/失败重试 | `client/src/pages/Notes/canvasEngine/blocks/ComponentBlockEditor.tsx:19`、`:22`、`:36` |
| Esc / Ctrl 或 Cmd+Enter、焦点循环与还原 | `ComponentBlockEditor.tsx:45` |
| timeline 增删、上下移动、逐字段编辑 | `ComponentBlockEditor.tsx:75`、`:83`、`:96` |
| chart 标题/轴标签、网格、增删列/series、有限数值提交 | `ComponentBlockEditor.tsx:120`、`:137`、`:150` |
| 年份强调色与纵轴发丝线 | `client/src/pages/Notes/canvasEngine/blocks/ComponentBlockProjection.module.css:15`、`:17` |
| 四系列颜色、线型、打印适配 | `ComponentBlockProjection.module.css:29`、`:35`、`:44` |
| 13 条 960–997 自铸年表 | `client/src/pages/Notes/canvasEngine/fixtures/songTimeline.ts:4` |
| 三期两系列财政示意数据 | `client/src/pages/Notes/canvasEngine/fixtures/songRevenueChart.ts:4` |

以上简称均相对于表内首个完整路径目录，行号为子任务完工工作树定位。

## 参数和呈现边界

所有 Save 均输出 `{ component_kind, params }`，类型/校验统一取 `componentBlockService.ts`；UI 不另建真相 schema。时间线保持 1–64 条；图表保持 1–32 列、1–4 series，删维度后各 values 与 x_labels 同步。空数值或 `-` / `-1e` 等未完成输入保留原串并阻断保存，完成的负数、小数或指数数值只按有限 number 写回。总文本超限在浮层显示既有校验信息。

图表先按最大绝对值归一再计算坐标，正负 `Number.MAX_VALUE` 的有限域不会因相减溢出；全零与全负数据也有有效轴系。数值标签全部呈现，折线各系列标签横向错开，负值数值标签与 x 标签首行至少间隔 26px。x 标签按列宽最多显示三行，余文显式省略，完整值保留于 SVG `desc` 和标签 `title`；该边界没有改变 payload 或检索文本。

配色依次为 `--sk-accent`、`--sk-ink-muted`、强调色 65% 与正文墨色混合、`--sk-ink`；全部沿用现役强调/中性族，无 hex。折线再以实线/长虚线/点线/点划线辅助区分。

时间线折叠只属于原生 `details` 的局部呈现。初始阅读与打印都折叠，打印不强开 detail，以免将展开内容放入折叠高度的 flow plan；折叠字段从未写入 payload。图表阅读时宽数据集在块内横滚，打印缩放至块宽；列数较多时打印字号会随之缩小，应按实际纸型复核可读性。Overview / 打印接线、DOM 测高、分页、检索、保存与撤销的跨层验证由主任务集成证据申报。

## 定向验证

执行：

```text
npm.cmd --prefix client run test:unit -- src/pages/Notes/canvasEngine/blocks/ComponentBlockProjection.test.tsx src/pages/Notes/canvasEngine/blocks/ComponentBlockEditor.test.tsx --maxWorkers=2
```

最终结果：**2 文件 / 25 测试通过**，Projection 13、Editor 12。原始日志：`.codex-tmp/b2-component/ui-tests.log`。

覆盖十三条年表及局部折叠、三期六值柱图、折线共享轴、打印同源初始内容、正/负/零/有限极值坐标、长标签、未知占位、token；两编辑器所有动作与上下限、原始数值过渡串、草稿隔离、取消、键盘焦点、失败重试、防重复保存和超限阻断。没有新增安全对抗类用例。

子任务独立 `tsc -b` 曾通过；首轮 `npm exec` 误用根 cwd 的 TS5083 保存在 `ui-typecheck-launch-error.log`，纠正执行收据在 `ui-typecheck.log`。该单独检查早于最后数值输入/标签间距改动，最终 TypeScript 与全库数字以主任务最终 build / gate 证据为准。

## 可复核样张

[POSITIVE-SPECIMENS.html](./POSITIVE-SPECIMENS.html) 含时间线、分组柱及同数据折线；由生产 `ComponentBlockProjection`、生产 CSS Modules 的 Vite 编译输出和自铸 fixtures 生成，零脚本，原生 detail 可展开。财政数据已标注「教学示意等价数据，不作史料引用」。

生成脚本和日志分别留 `.codex-tmp/b2-component/ui-static-specimens.mjs` / `ui-static-specimens.log`。该 HTML 是投影蒸馏件，不充当应用内完整分页/撤销证明。浏览器实测记录由主任务附入总证据。
