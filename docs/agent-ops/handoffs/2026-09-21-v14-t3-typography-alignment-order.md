> **状态 (Status)**: done(2026-09-21 HQ 收官:两轮——一轮双停线拦下 HQ 测量混尺度+禁令无射程,补遗一双裁后二轮落靶;builder 环境两红=Python/EPERM 沙箱病,HQ 机 server 主集真全绿;client 2368/2368 逐字对上;双门绿)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T3 排印对齐批(Q3 字偏大 + G9 表格比例)
> **上游**: [纸面线走查报告](../analysis/2026-09-21-paper-line-walk-report.md)(2026-09-21 夜,HQ 实机 DOM 取数)——Q3/G9 两项 🅰 实锤;样张标尺=宋史手册基准件(16px 正文 / 900px 纸宽恒定比)。**本单是标尺修正,⛔机制改动⛔字族更换**(字族归设计契约/皮肤线,V15)。

# T3 · 排印对齐批

## 一 · 病灶与目标标尺(走查实测数字)

| 项 | 现状(实测) | 目标 | 备注 |
|---|---|---|---|
| 正文等效字号(fs÷页框显示宽×900) | **22.6px**(16.7px @665px 框) | **16px ± 0.5** | 样张恒定比;病根方向=阅读步进缩放抬字号而纸宽缩放不同步 |
| 正文行高比 | 1.47 | 1.6~1.75 区间(随字号回落后复测) | 样张观感更疏朗 |
| 表格占页宽 | **98.6%**(3 列小表满幅) | 内容自适应宽(上限 100%)+**居中** | 样张同类=收身居中 |
| 表格 cell 等效字号 | 19.9px | **正文×0.85 档** | 样张 ~13.6px@900 |
| 表格 cell padding | 显示 8×10(归一 ~11×14) | 随字号同比例收敛 | 视觉过得去即可 |
| 装订件(页眉/页码) | 12px 显示(归一 16.2px) | **与新正文标尺成比例(约正文×0.72~0.78)** | ⛔单独放大——正文回落后先复测观感再定 |

## 二 · 修法边界

1. **诊断先行**:定位 22.6 的构成(默认 Typography profile 字号 × 阅读步进缩放 × 页框缩放),Result 申报构成分解——⛔只在某一层硬除以 1.41 了事,要修在错位那一层;
2. 修点限:排印 profile 默认参数 / 阅读缩放与纸宽的耦合系数 / 表格块显示样式(宽策略+字号档+padding)——全部**数据与显示层**;⛔TextFlow 真相 schema⛔坐标契约(A4 画布几何常量 904/1278/760 一字不动)⛔分页算法⛔字族更换;
3. 出生公约照守:改动值走 token/刻度/比例,⛔新字面 hex⛔新硬编码字体;
4. 文本重排的连锁:字号变 → 度量变 → 分页/对齐类测试的既有断言若需更新,**逐处申报「旧值→新值+为何合法」**,⛔静默改断言⛔为过测弱化断言;
5. 表格宽策略若涉块 content/metadata 新键:⛔——纯 CSS/显示层实现,现役 display_overrides 透传若需键,申报键名与形状(允许,B3 先例)。

## 三 · 验收

1. **标尺验收=走查报告同法**(DOM 计算样式,fs÷框宽×900):正文 ∈[15.5,16.5],表格 cell=正文×0.85±0.05,表格宽≤内容自适应且居中——写成常驻断言(jsdom 计算样式级,⛔截图);
2. 定向+回归:client 全库+server 全量(**全量补集含 v13WildernessExecute,文件预算 ≥600s,⛔按 120s 超时判红**);
3. 证据落 `docs/audits/2026-09-21-t3-typography-builder/`,原始日志 `.codex-tmp/t3-typo/`;
4. **禁区(带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔新表新列⛔新工具⛔prompt⛔Relation/判定域⛔新依赖⛔用户库(冒烟笔记的 heading 补种归 HQ 收口,⛔builder 碰)⛔真实模型调用;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符。Result:构成分解+逐件行号+新旧断言申报表+标尺复测数字+未做项;冲突停线举证。

## 补遗一(HQ 双裁:标尺口径更正 + 真实模型禁令射程)

> 2026-09-21 · HQ 按代理权裁定,回应下方 Result 双停线。两处缺陷都在 HQ:走查测量混尺度、禁令无射程(第①型)。builder 双双拦对。

1. **标尺口径更正(采 builder 同尺度公式)**:常驻断言与验收一律用同尺度归一(computed 字号 ÷904×900,或分子分母同取已缩放值);走查报告的 22.6/19.9/16.2 三数作废,以 builder 复测 16.6261/14.63496/11.94690 为准(HQ 已在走查报告追加更正节);
2. **修正后的目标表**:①正文同尺度 ∈ **[15.7, 16.3]**(现 16.63,微调一档——修在纸张默认覆盖层或其换算处,申报落点);②**行高比 1.60~1.75**(现 1.467,**本单第一知觉修**);③表格:**撤 `min-width:100%`**(fit-content+居中,上限 100%——G9 真病灶),cell 档位 0.85±0.03(现 0.88,微收),padding 现值可留;④装订件 11.95 **不动**(样张带宽内);
3. **「⛔真实模型调用」射程裁定**:该禁令射程=**远程 LLM/API 与凭据消耗**;本地 MinerU OCR 子进程(v2SourceRegionCells 真解析路)=构建内确定性工具,**全库整跑明文含它**(HQ 机例行真跑绿);此射程注入本单并自此进工单模板;
4. 其余照原单:断言更新逐处申报、出生公约、全量预算、禁区照旧。

## Result

**2026-09-21 · Codex builder：BLOCKED / 诊断停线，needs: HQ。未完成施工，header不翻done。** 依本轮用户「冲突停线举证」，零产品代码及既有断言修改。完整证据见 [T3 builder诊断](../../audits/2026-09-21-t3-typography-builder/README.md)，原始记录 `.codex-tmp/t3-typo/`。

1. **构成分解与第一处冲突**：通用profile=15/22（`typographyProfileService.ts:19`）；纸张默认覆盖=11pt÷物理映射（`pageFrameTypographyService.ts:38`），A4物理映射 `(210/25.4×96)/904=0.8779875967`，得到16.7048677→16.7px、行高24.5px。阅读缩放仅为 `baseScale×stepFactor`（`pageReadingViewportService.ts:76`），纸和正文共享 `NoteWritingSurfaceLayer.tsx:1706` 的transform，正文CSS variables在`:1744`。665px框对应S=665/904；**22.6015=未缩放computed字号16.7÷已缩放框宽665×900**。同尺度应为 `16.7×S/665×900=16.6261`。Chrome合成DOM在0.5/1/1.5/2步进下同尺度归一均为16.6261，真实字形宽/纸宽也恒定；未复现“阅读步进单独抬字号”的路径。不能把混尺度公式写成常驻断言或据其硬缩字。需HQ修订标尺口径。此结论不代表目标已经达标：16.6261略高于16.5，行高比1.4671仍低于目标。
2. **表格与装订件诊断**：`TableBlockProjection.module.css:10` 当前14.7px=正文减2px，档位0.88024，同尺度900等效14.63496；`:16-17` 的max-content配min-width:100%确实撑满内容区；`:37-39` 为8em最小列宽与8×10px padding。`NoteDetail.module.css:3594` 装订件12px对应同尺度11.94690、正文比0.71856。合成测量不是原用户笔记重走；用户库未碰。按停线要求，表格三修及装订调整均未施工。
3. **第二处冲突**：全量现役 `server/src/__tests__/v2SourceRegionCells.test.ts:183-209` 会清除command mock、指定真实MinerU Python并调用parser；`sourceMineruParser.ts:147-155` 明确运行pipeline/ocr并开启公式与表格识别，`:774-790` 启动子进程。“全库零排除”与“禁真实模型调用”在该本地OCR路径上需HQ明确边界；没有执行、跳过或伪造此测试。
4. **新旧断言申报**：现有排印/分页/对齐断言全部“旧值→原值”，零处更新；T3常驻标尺“无→未新增”，因公式冲突停线。临时DOM诊断不冒充常驻验收。没有弱化断言。
5. **验证申报与未做项**：验证门盘点为“**非git/secrets 25组件，执行0/25（诊断停线）**”；git diff检查及secrets两组件留HQ。server全量盘点111文件=84主集+27补集，含v13WildernessExecute，恢复时预算须≥600000ms/文件。本轮未跑client全库、server全量或验证门；未申报绿。未完成默认参数修正、表格三修、常驻标尺与回归。
6. **禁区射程**：本轮及只读辅助agent没有git写操作/改.git、用户库操作、heading补种、真实模型调用、新依赖/工具面/prompt/Relation判定改动、schema或content/metadata/display_overrides新键、分页/坐标机制修改、字族/颜色/新token、合成凭据或新设计安全对抗用例；904/1278/760不动。辅助agent零写零测试，单builder串行。仅新增诊断证据与本Result，原走查/工单正文未改。

## Result 第二轮

**2026-09-21 · Codex builder：施工完成；全量验收 BLOCKED（固定 Python/MinerU 路径执行被拒绝），needs: HQ 环境复验。header 保持 ready，不冒充 done。** 已重读全文、补遗一与原 Result；原正文及第一轮收据保留。完整逐处证据见 [第二轮施工与验收](../../audits/2026-09-21-t3-typography-builder/ROUND2.md)，机器结果见 [verification-summary.json](../../audits/2026-09-21-t3-typography-builder/round2/verification-summary.json)；原始日志 `.codex-tmp/t3-typo/round2/`。

1. **构成与落点**：通用15/22不动；`pageFrameTypographyService.ts:38`纸张默认 **11pt→10.75pt**（四分点刻度），`:46`纸张行高 **22/15→1.65**；现有物理比例、指标一次归一、web与显式用户覆盖保持。A4比例仍`(210/25.4×96)/904=0.8779875966831581`，字号换算得到16.3px、行高26.9px；Letter15.9/26.2px。阅读档与纸面共同transform原样；采用补遗一 **computed÷904×900**，没有硬除1.41。
2. **表格与装订**：`TableBlockProjection.module.css:10`、`:11`字号/行高由正文减2px→各自×0.85；`:15`至`:18`改fit-content、max-width100%、margin0 auto，撤满幅min-width；`:37`撤cell8em最小宽（改0，防多列抵消上限），原padding与anywhere换行保留。装订件`NoteDetail.module.css:3594`12px不动；无新内容/metadata/display_overrides键。
3. **标尺实数与常驻断言**：A4正文同尺度 **16.227876**、行高比 **1.650307**；Letter **15.829646 / 1.647799**；cell比例均 **0.85**，装订件 **11.946903**。`paperTypographyRuler.test.tsx:50/:80/:103`新增27用例（双纸型×三阅读档×四步进24例、表格2例、装订1例）。jsdom只展开生产document变量，保留真实CSSOM calc/继承读取；表宽锁CSS声明，非伪造布局。另用Chrome未经展开CSS实测16组合：3列小表约101.578/100.547px、居中；8列长词表760px，最大溢出0，两侧空白差≤0.015654px。均为隔离合成DOM，不是原用户笔记重走。
4. **既有断言逐处申报**（详细表及源码行号见上链）：`pageFrameTypographyService.test.ts:50/:59/:71/:82`的11pt→10.75pt，`:62`行高22/15→1.65，原0.05量化与0.005相对误差阈值不变；`useNoteCanvasRuntimeController.test.tsx:412/:480`物理刻度11→10.75，`:472/:473`字号16.7/16.2→16.3/15.9，`:435/:436`夹具94→96字，使新94/97字每行容量下仍2行>1行；`TableBlockProjection.test.tsx:45`减2px表达式→乘0.85；`usePaperSize.test.tsx:96`临界夹具3975→3800字，使新行高下仍Letter一页、显式A4覆盖两页（原`:107`的`custom ? 2 : 1`及undo/redo原样）。共4既有测试文件调整，零断言弱化，分页算法未改。
5. **验收**：最终client全库 **231文件/2368测试通过**，零排除；定向64/64及分页夹具17/17通过。**非git/secrets 25组件均通过**：最终参数批次24项通过，client因上述分页夹具曾红一次，合法调整后全库复跑通过，原失败日志保留。git检查与secrets两组件仍留HQ。server **111文件=84+27，零排除**，两次均600000ms文件预算、并发4，含v13WildernessExecute及真OCR路径；最终 **1118测试、1116过、2失败、0跳过/取消/IPC重试**。初次13红中的仓内app-data拒绝及npm_execpath缺失等仅修临时runner后重跑，产品/回归用例未动。
6. **停线证据与未做项**：最终`server-rerun/server-all.log:61783`为`v2SourceMineruWiring.test.ts:60`调用Python时 **EPERM**，模块内部用例无法开始；`:62646/:62652`为`v2SourceRegionCells.test.ts:203`真实解析调用约1937ms即失败，固定venv **code101，无法启动绑定的UV基础Python**。同一基础解释器直接`--version`亦“拒绝访问”。不是120s/600s超时；未改产品OCR预算、未换解释器/绑定、未mock/skip或提权。**server全量绿未实现**，需HQ在可执行该固定Python的环境复验；原用户库、heading补种、主观验收及git/secrets仍未做。
7. **禁区**：无git写、.git/agent操作指令改动；无用户库操作、远程LLM/API与凭据消耗；无schema、新表列、工具面、prompt、Relation/判定域、依赖、内容键、坐标/分页机制、字族/颜色/新token或新安全对抗用例。904/1278/760不变；本地OCR按补遗一真实调度并保留失败，未以假路径冒充。辅助agent只读零写零测试，单builder串行施工；诊断标签与本轮临时HTTP服务已关闭。
