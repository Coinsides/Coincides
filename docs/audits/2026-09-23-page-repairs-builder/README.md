> **状态**: completed（builder 实现与功能回归完成；完整门有既有文档索引失败，未放行）
> **日期**: 2026-09-23
> **对应单**: [V14 纸页两修单](../../agent-ops/handoffs/2026-09-23-v14-page-repairs-order.md)
> **范围**: 页眉预留、纸页默认 10pt；不承载主观验收或发布批准

# V14 纸页两修证据

## 1. 现物诊断与写点

修 A 的根因是分页正文从内容区局部 `y=0` 开始，没有扣除当前启用的 binding header 槽。新建 A4/Letter 本来已有 `top=72`，而页眉槽为纸页顶部 `18 + 30 = 48px`；不是新页默认缺少 top。历史/已保存页的 `top=0/24/40` 会被规范化保留，续页继承这组几何，所以正文能进入页眉带。首张纸外侧的 `NotePaperHeader` 题名带是另一条布局路径，不能充当每页 binding 页眉预留。

修复按现有槽几何求 `reservation = max(0, enabledHeaderBottom - contentTop)`，加入正文分页起点并扣减可用高度。默认 top=72 不重复加空白；历史 top=0 则预留 48px。每页按 binding 分节、机械页号、槽位 offset 独立计算。`headerFooterEnabled=false` 时手写页眉不占位；若另启用了页眉位置的页码，仍为这个有效槽占位。封面排除正文流，Web 不加预留。

多页叠插页可能改变已排页面的机械页号，包括合并页叠的 frameIds 顺序与集合顺序不同的情况。分页完成后校验实际使用的预留与最终页序；有变化才保留新增页并重算。不改变原块遍历顺序。重跑一致性、反序/交错/合并反序三种边界均有测试。

| 生产文件（均位于 `client/src/pages/Notes/canvasEngine/`） | 写点 |
| --- | --- |
| `pageFrameSlotService.ts` | 新增 `resolvePageFrameHeaderReservation`，复用现役 binding 槽计算；槽尺寸、文案和样式不改 |
| `documentPageFlowService.ts` | 首/续页 cursor 使用预留，可用高度及 overflow 同步扣减；空页判断使用预留起点，避免超高块无限翻页；最终机械页序稳定后返回 |
| `hooks/useNotePageFlow.ts` | 完整计划、折叠呈现计划都接 binding，并响应 binding 变更 |
| `hooks/useNoteCanvasRuntimeController.ts` | 将现役 binding 传到分页和纸型编辑入口 |
| `paperSizeEditService.ts` | 纸型/墙编辑后的重排接收同一 binding |
| `pageFrameTypographyService.ts` | 纸页物理默认裸数 `10.75 → 10`；Web 默认和行高比 1.65 不改 |

屏幕、Overview、打印消费同一分页计划；没有另造打印补丁或迁移历史墙坐标。写作层与打印层的实际 DOM/CSS 定位输入另有联动断言。

## 2. 查档结论与完整档表

“双纸型 × 三阅读档”来自 `pageReadingViewportService.ts`，属于视口缩放，不是正文字号预设。没有可表达 10pt 的字号档表，故按单修改现有裸数，未新建档位。档表及默认均保持：

| 阅读档 | baseScale | 默认/边界 |
| --- | --- | --- |
| `fit_width` | `availableWidth / paperWidth` | 默认档；默认 `stepFactor=1` |
| `fit_page` | `min(availableWidth/paperWidth, availableHeight/paperHeight)` | 纸页高宽比 >3 时有效档回退为 `fit_width` |
| `physical` | `physicalScale`（打印物理映射） | A4 标准宽下 0.8779875967；Letter 0.9026548673 |

三档统一 `displayScale = baseScale × stepFactor`。step 最小 0.5、最大 2、步长 0.1、默认 1；只量化用户 step，不量化物理或拟合比例。既有 Typography 数字输入为布局 px，范围 10–28、步长 1，仍可上调；不是 pt 预设档。已有 metadata 字号覆盖继续优先，不强改用户覆盖值。

## 3. 27 条常驻标尺与容量论证

保留原有 **27 条**：双纸型 × 三档 × 四 step（0.5/1/1.5/2）=24，加两条表格与一条页眉/页码标尺。正文旧共享区间改为按纸型独立推导的精确值和现役一次 0.1px 量化误差上限；没有扩大容差。原行高/字号比 `[1.60, 1.75]`、显示缩放消去不变量、表格 0.85 比例、家具槽 12px 断言全部保留。

独立公式：`scale=(paperWidthMm/25.4×96)/904`；`exactFont=(10×96/72)/scale`；字体、行高（exactFont×1.65）、平均字宽各自只做一次 0.1px 量化；同尺度字号 `fontPx/904×900`。

| 纸型 | mm / 纸页高 | 字号 px | 行高 px | 平均字宽 px | 同尺度 px@900 | 量化后行高比 | 表格字号 px（0.85） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A4 | 210 / 1278 | 15.2 | 25.1 | 7.3 | 15.13274336 | 1.65131579 | 12.92 |
| Letter | 215.9 / 1170 | 14.8 | 24.4 | 7.1 | 14.73451327 | 1.64864865 | 12.58 |

家具槽保持 12px / 11.94690265px@900。两纸型布局字号不同是物理映射不同；两者目标均为 10pt。

容量采用既有合成 ASCII 估算器、纸页宽 904、正文宽 760、文字可用宽 740、top=72、bottom=96、文本 chrome=16。列数 `floor(740/averageCharWidth)`，行数 `floor((pageHeight−72−96−16)/lineHeight)`，容量=列×行。

| 纸型 | 旧 10.75pt：列×行=容量 | 新 10pt：列×行=容量 | 永久断言 |
| --- | --- | --- | --- |
| A4 | 94×40=3760 | 101×43=4343 | 4344 字符 → 首片 `[0,4343)`，次片 `[4343,4344)`，43 行 |
| Letter | 97×37=3589 | 104×40=4160 | 4161 字符 → 首片 `[0,4160)`，次片 `[4160,4161)`，40 行 |

这些是指定合成输入的分页容量，不冒充中文、比例字体或浏览器字形实测容量。实际 DOM 行测量入口保留。完整数值见 [capacity.json](capacity.json)。

## 4. 逐处断言改点（13 文件，最终 216 条均通过）

下表文件除最后一项外均在 `client/src/pages/Notes/canvasEngine/`；所有测试仍在完整 client 测试入口中。

| 文件 / 最终条数 | 变更与保留约束 |
| --- | --- |
| `paperTypographyRuler.test.tsx` / 27 | 24 个矩阵正文值改为独立 10pt 物理公式、纸型精确结果、≤0.05px 量化误差；其余三条及比例/缩放不变量保留 |
| `pageFrameTypographyService.test.ts` / 18 | 10.75pt 期望改 10pt；0.05px 舍入及 0.005 相对物理误差约束保留 |
| `hooks/useNoteCanvasRuntimeController.test.tsx` / 16 | 默认 15.2/14.8px 与 10pt；换纸型探针 96→103 字符，介于 A4 101 列与 Letter 104 列之间，继续检验换行、高度、rerender 和导出 |
| `hooks/usePaperSize.test.tsx` / 17 | 探针 3500→4000 字符：Letter 默认 39 行高 967.6≤1002，显式保留 A4 字号 40 行高 1020>1002；1 页/2 页、独立高度守卫、撤销重做均保留 |
| `documentPageFlowService.test.ts` / 17 | 合成夹具 top10→48、总高 body+20→body+58，保持原正文净容量与精确字符范围；历史零 top 由新增族直接覆盖 |
| `pageFrameSlotService.test.ts` / 18 | 页计数夹具高100→138、top10→48，净容量80不变，精确计数保留 |
| `pageFramePrintScaleService.test.ts` / 5 | 历史400高、top30、bottom40，预留18后净高312，16 chrome+3×100不再装下；精确预期改为3页每页2行、局部y18，400原高不变 |
| `componentBlockIntegration.test.tsx` / 8 | top40应补8；正文起点0→8，可用高540→532，超高700溢出160→168；完整块与页数约束保留 |
| `tableBlockIntegration.test.tsx` / 7 | 同上，保留表格整体分页约束 |
| `hooks/useNotePageFlow.test.tsx` / 7 | pending wall-save夹具top10→48、总高220→258，净高200与原ID不变；新增1条binding偏移/关闭同时驱动完整与折叠计划、不写存储 |
| `layers/pageFrameAlignment.test.tsx` / 46 | 新增4条：封面有/无×页眉开/关，历史top0；真实写作层与打印层beforeprint生命周期，首/续片零重叠、屏打位置相等、封面无槽、文本无损 |
| 新增 `pageHeaderReservation.test.ts` / 23 | 16条双纸型×top0/72×封面×开关；分节偏移/页眉页码1；超高块终止1；反序/交错/合并反序3；精确capacity+1边界2 |
| `client/src/test/visualRelationsGeometry.test.tsx` / 7 | 将历史top0/24的已知重叠期望提升为 `violations=[]`，正文从纸页+48开始；扫描器其余对照不删 |

## 5. 阳性对照与测试结果

先写页眉测试再修实现，[header-before.log](header-before.log) 为 18 条中 **6 失败 / 12 通过**。最终对照脚本 [header-positive-control.mjs](header-positive-control.mjs) 临时让生产预留函数直接返回 0，运行两个文件中页眉修复测试，再用 `finally` 恢复原字节并重跑：

- 去预留：**11 失败 / 16 通过 / 42 未选中**，exit=1；见 [header-positive-red.log](header-positive-red.log)。
- 恢复：**27 通过 / 42 未选中**，exit=0；见 [header-positive-restored.log](header-positive-restored.log)。42 条是 `-t` 过滤的其他现役用例，完整门中正常运行。
- 修改前后 SHA-256 相同：`430c66ce1e1fc11b17885e03050623d8719092992c5b4bc139e2d1b3610fc46d`；见 [header-positive-control.json](header-positive-control.json)。

最终版本执行了必跑 `npm run verify:v2-bn8-runtime`，完整输出见 [runtime-gate-after-stabilization.log](runtime-gate-after-stabilization.log)：

| 项目 | 结果 |
| --- | --- |
| client 全套（含上述定向族） | **239 文件、2492/2492 通过，0 失败、0 跳过** |
| 常驻标尺 | **27/27**（包含在 client 数字中） |
| 本单新增 | **28 条**（页眉/容量23、屏打4、binding hook1；包含在 client 数字中） |
| test-wiring | 111 文件，111 wired，0 exempted，0 unwired |
| agent-knowledge | 29/29 |
| tool-face registry / manifest / parity | 5/5、10/10、10/10 |
| owned-helper | 12/12 |
| Canvas runtime / model contract | 175 checks / 60 groups 通过 |
| client TypeScript + Vite、server build | 通过 |
| 其他 gate 边界/契约及 performance seed | 通过；没有扩大为额外性能任务 |
| `docs:check` | **失败：两个既有 INDEX 过期；因此完整命令 exit=1，不能记为全绿** |

失败文件是 `docs/agent-ops/INDEX.md`、`docs/agent-ops/current-state/INDEX.md`。两者及其来源 `app-operating-manual.md` 都与 HEAD 一致；现役 manual 日期已是 09-23，索引仍列 09-21。[scope-boundaries.json](scope-boundaries.json) 保存只读 HEAD 比较。未改索引、未豁免此门，留交接明确处理。

为补齐 `&&` 截断的检查，单独执行 `node scripts/docs-inventory.mjs --check` 与 `npm run check:glossary-shape-vs-capability`，均通过（[inventory](docs-inventory.log)、[glossary](glossary-check.log)）；最终 diff 空白和 changed-file secrets 检查结果见 [final-checks.json](final-checks.json)。初期失败与中间定向日志保留用于复盘，最终结果以上述 stabilization 日志为准。

## 6. 测试边界与未做清单

- 屏打证据是 jsdom 中真实组件提交的 CSS 几何输入和打印生命周期；没有宣称真实浏览器字形边界、纸质/PDF 输出或 Henry 主观验收。
- 1.65 行高比保持；字号变小引起行高 px 按同一比例变小属于本单默认值联动。没有改标题层级、封面题名、衬线栈、页眉文案/样式、槽高或新建阅读档 UI。
- 不改历史墙参数、手工框坐标契约和用户字号覆盖；沿用现有分页/持久化通路，没有单独几何迁移。
- 未执行 git 写操作（无 add/commit/push/PR/merge/checkout）；未读取 `.env` key 值、未调用真实模型、未接触用户数据库。验证使用空 env 目录和 `DB_PATH=:memory:`。本单未新增凭据表单值。
- 无新的用户操作入口；未修改 current-state 操作手册或 agent 权限文件。只读辅助审查检查档位、容量和页序边界，未启动并行 builder。
- [scope-boundaries.json](scope-boundaries.json) 同时证明阅读档服务、排印基线/测量、标题层级、封面预设、外部题名带、NoteDetail CSS、打印物理配置等 8 个受保护生产文件均未变。
