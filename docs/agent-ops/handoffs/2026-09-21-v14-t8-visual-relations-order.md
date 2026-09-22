> **状态 (Status)**: done(2026-09-21 HQ 收官:builder 环境两红=Python 系,HQ 机 server 主集真全绿;client 2463/2463 逐字对上;双门绿。压页眉真路径=新纸默认 top 0,Henry 目击两连胜)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T8 封面墨色修+视觉关系断言首批
> **上游**: Henry 2026-09-21 实机二走查:①封面大标题不可见(HQ 复现实锤:36px textarea `color: rgb(245,245,245)` 近白字打米色纸——**未声明墨色,从纸外深色壳继承**;Overview 缩略走另一条投影用了正确墨色,故只在正常视图隐身);②「正文压页眉」候硬刷新复核(HQ 当前构建测 bbox 净距 57px 无交,疑似旧 bundle 会话);③本质教训=**点检查单点真值,用户看关系**——颜色合法/元素在/不透明度 1 每项都绿,「字色 vs 纸色对比度」这个关系无人查。

# T8 · 封面墨色修 + 视觉关系断言首批

## 一 · 封面墨色修(🅰 级)

1. 封面 note_ref(题名/述名)textarea 及其投影**显式声明墨色**:`--sk-ink` 族 token(题名 ink,述名可 ink-muted),⛔依赖继承;排查同病:凡纸面公民 textarea/可编辑面**未声明 color** 而从纸外壳继承的,一并声明(申报逐处行号);
2. **出生公约细则(本单起执行,候补进宪章)**:纸面公民的可读文本**必须显式声明**其墨色 token——未声明=从纸外继承=与字面值同级违约;
3. Overview 缩略与正常视图的封面题名应同色(同源核对断言)。

## 二 · 视觉关系断言首批(把用户的眼睛机械化)

新增常驻「关系断言」测试(jsdom/计算样式级,⛔截图 diff),首批三型:

1. **对比度断言**:纸面公民可读文本 vs 其实际底色(纸色/衬底)的 WCAG 相对亮度对比 ≥3(大字)/≥4.5(正文档)——五皮肤逐一跑;封面题名案例=首个回归夹具;
2. **相交断言**:正文块 bbox ⛔与装订槽(页眉/页脚六槽)bbox 相交——A4/Letter 两纸型×有无封面;
3. **溢出断言**:块 bbox ⛔越出其页框 content box(横向);
4. 断言写通用扫描器(遍历现役块型与槽位)⛔逐块手列(preflight 规则 2:凡权威集合存在就投影);申报扫描射程与已知豁免(如 staging 未采纳物)。

## 三 · 压页眉复核

1. 以关系断言②在测试里复核页眉/首块间距(多缩放档);若真有挤压路径(特定纸型/缩放/无封面组合)如实报+最小修(top inset 或槽位 Y,⛔动分页算法);测不出=出具净距数据了案。

## 四 · 验收与禁区

1. 定向:墨色修逐处+三型关系断言(含封面题名回归夹具+五皮肤)+同源核对;回归:client 全库+server 全量(**111 文件零排除,补集含 v13WildernessExecute 与本地真 OCR 路,文件预算 ≥600000ms,⛔按 120s 判红**);
2. **环境红处置**:builder 沙箱已知环境病(Python/MinerU 的 ENOENT/EPERM/101、npm_execpath 缺失类)不构成停线条件——施工照常完成,能跑尽跑,环境红如实申报为环境阻断,HQ 机复验收口;⛔因环境红中断施工;
3. 证据落 `docs/audits/2026-09-21-t8-relations-builder/`,原始日志 `.codex-tmp/t8-relations/`;
4. **禁区(带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔TextFlow 真相 schema⛔坐标契约⛔分页算法⛔新表新列⛔新工具⛔prompt⛔Relation/判定域⛔新依赖⛔用户库⛔真实模型调用(射程=远程 LLM/API 与凭据消耗;本地 MinerU OCR 子进程=构建内确定性工具,全库整跑明文含它);⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符;
5. Result:墨色修逐处行号+三型断言射程申报+压页眉复核数据+测试数字+未做项;真冲突停线举证。

## Result

2026-09-21 · Codex builder。施工完成，无真冲突。证据总入口：[T8 builder 收据](../../audits/2026-09-21-t8-relations-builder/README.md)；原始运行日志、失败轮及一次性 runner 留 `.codex-tmp/t8-relations/`。放行与环境复验留 HQ。

### 1. 墨色修与同病排查

确认两处真正的纸外继承缺陷：note_ref 的 `color: inherit`，以及分页列表/折叠 marker 未声明颜色。note_ref 题名/述名 textarea 与只读投影现在显式 `--sk-ink`；正常与 Overview 同源同色的五皮肤断言通过。其余原有纸内别名消费属于声明加固，不能混称纸外继承 bug。扫描另发现小字 muted/accent/annotation 对比不足，改用既有 token 与 ink 混合；不改工厂 token、不新增 token。

以下为修后逐处行号；路径前缀除 KaTeX 外均为 `client/src/pages/Notes/`，详细 selector、原问题及排查豁免见 [ink-audit.md](../../audits/2026-09-21-t8-relations-builder/ink-audit.md)。

| 文件 | 行号与内容 |
|---|---|
| `canvasEngine/blocks/NoteRefBlockProjection.module.css` | 12 题名/述名编辑与只读墨色；21 placeholder |
| `canvasEngine/blocks/PaginatedTextBlockProjection.tsx` | 496 marker class；声明落 NoteDetail 1763 |
| `NoteDetail.module.css` | 1419/1429/1433/1437 状态；1539 编辑基类；1745/1760/1763 markers；1827/1831/1836/1840/1856/1866 inline 文本/光标/链接；3682/3696 六槽/页码（移除降对比 opacity）；3709/3714 占位/字段标签；3725/3729/3736/3756 definition/formula/输入；3772/3788/3803/3827/3833/3840/3846 公式标签/帮助/说明；3879/3888/3896/3902/3910 code/quote/draft；3967/3978/3985 来源条 |
| `client/src/components/KaTeX/KaTeXRenderer.module.css` | 7 KaTeX 本体显式纸内 ink，保留非纸面回退 |
| `canvasEngine/blocks/ComponentBlockProjection.module.css` | 11/15/20/22/24/29/41/44/45 标题、年份、说明、坐标、SVG text/tspan、图例、异常态 |
| `canvasEngine/blocks/TableBlockProjection.module.css` | 26/36/57 caption、单元格、异常态 |
| `canvasEngine/blocks/TocBlockProjection.module.css` | 8/14/21/23/24 标题、条目、交互、章节、页码/空态 |
| `canvasEngine/blocks/MediaBlockProjection.module.css` | 20/27 媒体占位/错误文字 |
| `canvasEngine/blocks/ItemRefBlockProjection.module.css` | 14 引用正文 |
| `canvasEngine/blocks/ParagraphFurniture.module.css` | 7/8 callout 标签/出处 |
| `canvasEngine/layers/ChapterHeadingFurniture.css` | 1/2/4 章节文字、按钮、编号 |
| `canvasEngine/layers/NoteCoverMetadata.module.css` | 1/3/4/6/9/17 纸上 metadata 行/控件/错误 |
| `canvasEngine/layers/NotePaperHeader.module.css` | 7/22/29/34 外置/打印题名、述名、占位 |
| `canvasEngine/layers/PageFrameSlotsLayer.tsx` | 20–21 槽位显式墨色 override；既有色族选择保留 |

14 个生产墨色文件；定向 14 文件/126 测试通过，runtime boundary 175 checks 通过。KaTeX 内部生成 span、已有纸内声明容器的嵌套文字可在投影内部继承；没有用纸根统一 color 掩盖编辑器缺声明。

### 2. 三型常驻关系扫描

新增 `client/src/test/visualRelationsContrast.ts`、`visualRelationsGeometry.ts` 及相应 `.test.tsx`，由现有 client 全库入口自动发现。共用 `visualRelationsFixture.ts`，样式适配器 `visualRelationsStyles.ts` 挂载生产 CSS，不手写另套颜色。

- 对比度扫描实际 DOM 文本、文本输入及 SVG text/tspan，解算实际祖先衬底、变量、RGBA 与 sRGB color-mix；阈值大字 3/正文 4.5，不先舍入。封面题名为首个回归夹具；五皮肤由 `SKIN_PRESET_IDS` 投影。20 个皮肤场景、595 次可读文本测量；封面题名最低 12.726461，扫描到的小字最低 4.981391，全部达标。23 条常驻测试通过，包括原近白字、透明文字、隐藏 twin、渐变和不支持样式失败路径。
- 几何扫描遍历生产正文 fragment/block shell 与六槽标记，比较所有块/槽正面积相交和左右越墙。保留被外层裁切的内层宽度，避免越墙被裁切后假绿。读取生产提交的有限 CSS 像素盒并乘生产 scale；jsdom 不提供原生布局，不用零值 bbox 或理想 bbox mock 冒充实测。
- 夹具自动投影现役 8 个 `listNoteBlockTemplates()`、TOC 插入命令、cover recipe 两个 note_ref、全部 `NOTE_BINDING_SLOT_NAMES`。item_ref 无现役可枚举 registry，只有此一项具名补充；合计 10 个正文投影。分页 writing roles 另从 `WRITING_ROLE_BY_COMMAND` 投影。Item/图片读取用合成内存 mock，未读用户库。
- 射程不含 staging/tray 未采纳物、纸外浮面、媒体位图文字、任意封面底图局部像素、伪元素 placeholder 与全 hover/focus 组合、任意用户色/批注色。透明重复编辑层须有可见同文绘制层才豁免；KaTeX MathML 不重复计数。无法解析的颜色、字体、背景、复杂渐变或非 1 group opacity 报失败，不静默放行。完整边界见 [对比度收据](../../audits/2026-09-21-t8-relations-builder/contrast-audit.md) 和 [几何收据](../../audits/2026-09-21-t8-relations-builder/geometry-audit.md)。

### 3. 压页眉实测与最小修

发现真路径：新 A4/Letter 默认 top=0，首块 `0..44px` 与装订页眉槽 `18..48px` 相交 26px，首块至槽底净距 −48px。按本单第三节，仅在 `pageFramePrintScaleService.ts:27/52/61` 将新普通 A4/Letter 缺省 top 改为 72px，并扣除相应 contentHeight；未改 normalization、共享 Source 原件几何、坐标契约或分页算法。

修后 A4/Letter × 有无封面 × fit_width/fit_page/physical × step 0.5/1/1.5/2，共 **48 场景零相交、零横溢**。正文首页及 continuation 页首块至页眉槽底 canonical 净距 **24px**。step=1 的显示净距：A4 三档依次 24 / 15.023474 / 21.071702px；Letter 24 / 16.410256 / 21.663717px；其余 step 按倍数缩放。保存 top=0、top=24 或人为槽偏移的负控仍能报相交，不迁移用户布局。

外置 `NotePaperHeader` 另以真实 WritingSurface 挂载复核 A4/Letter × 有无封面 × 0.5/1/2，共 **12 组合**。无封面时生产 jsdom fallback 分配带 197px，带底至首块显示净距 54.159292 / 108.318584 / 216.637168px；有封面时外置带消失。这是分配盒净距，不是 HQ 浏览器字形 bbox 的 57px，不冒认真实字体测量。逐场景见 geometry 三份 JSON。

### 4. 验证与环境红

- client 全库最终 **238/238 文件、2463/2463 测试通过**，零排除；`--maxWorkers=2`，仍保留默认 5000ms 时限。首轮 12 条旧预设/夹具联动已按原语义修正；中间高并发 14 条超时/等待失败及完整日志保留，最终同源码降并发全库消除。末次 scanner 命名渐变边界修正另补 **23/23** 定向及 `tsc -b` 通过。
- production client build 通过。几何定向 3 文件 30/30（关系文件 7/7）；外置题名带所在 alignment 全文件 42/42；model contract 60 groups 通过。新 top inset 暴露的既有 5 文件/12 条旧基线已修夹具，不放松物理纸高、坐标或换纸一页/两页断言。
- runtime gate **25/25 个非 git/secrets 组件最终全部通过**；逐组件命令、轮次与最终结果见 [verification.md](../../audits/2026-09-21-t8-relations-builder/verification.md) / [verification-results.json](../../audits/2026-09-21-t8-relations-builder/verification-results.json)。本单状态更新后自动生成索引并通过 docs:check；`git diff --check` 与 secrets 两组件按单留 HQ，未运行。
- server **111 文件零排除**，包括 wildernessExecute 与真本地 OCR；每文件预算 600000ms。最终 **109 文件通过、2 文件环境阻断**。主轮原始数 1077 reported /1074 pass/3 fail；其中一项 Node IPC 文件占位失败，经既有 wrapper 隔离重试 59/59 通过，不与占位重复相加。最终预设落盘后补跑 wilderness **27/27**、96.6s，0 skip/cancel。
- 剩余环境红：`v2SourceMineruWiring.test.ts` 的 `python.exe ENOENT`；`v2SourceRegionCells.test.ts` 真 OCR 的 MinerU exit 101，固定 UV Python 独立启动探针 `EPERM`。两文件确已执行，不豁免、不宣称全绿，按本单交 HQ 机复验。首轮 runner 凭据空目录位置错误及其修正后的完整 111 文件重跑均留原证。

### 5. 未做项与边界

未做任何 git 写操作、用户库修改、远程模型/API 调用、凭据消耗；未新增依赖、表/列、工具、prompt、TextFlow schema 或判定域。无新 token、无新合成凭据。既有页 top=0、自定义墙/槽偏移、其他纸型和 Source 原件不回写；关系扫描会报告其违规布局，但不声称所有既有任意布局已修复。没有截图 diff、浏览器字形/位图像素验收或主观放行。环境红、git/secrets 和主观验收均留 HQ。
