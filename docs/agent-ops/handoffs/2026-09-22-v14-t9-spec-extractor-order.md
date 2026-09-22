> **状态 (Status)**: done(2026-09-22 HQ 收官:唯一红项=文档索引,HQ 重生成后 docs:check 绿;client 2464/2464 逐字对上;双门绿。76 项 delta 对照表=采值候拍材料,并入翻牌日呈批案)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-22
> **单号**: V14 收尾批 · T9 规格提取器(量尺)+宋史手册首航
> **上游**: ①设计线会议记录 §十六·六(2026-09-21):**别让模型学产品语法,让模型在母语里创作,机器负责翻译**——成品→蒸馏管线五步(标准件→提取→归格→翻牌→断言守门),缺的零件只有提取器;②标准件已由 HQ 归档:`docs/agent-ops/design/specimens/2026-09-19-song-handbook.html`(SHA-256 前缀 217d2e38,⛔改动标本);③T3 教训:测量守同尺度纪律(标本 900px 纸宽为归一基准);④宪章第四条血统法:提取值必须**归格**(snap 到 token/角色/刻度),⛔字面值直灌——否则提取器=违约制造机。

# T9 · 规格提取器 + 首航

## 一 · 工具本体

1. 落点 `client/scripts/specExtractor/`(享 client 现役 jsdom/deps,先例 paletteSmoke/canvasEngineModelContractCheck;**⛔新依赖**);入口 npm script `spec:extract -- <specimen.html>`;
2. **测量面(值层=气质的低频层)**:对标本 HTML 做 jsdom 级联解析,按**语义角色**归组测量——正文/各级标题/图注/页眉页脚(folio)/表格 cell/引文/提示框:字号、行高比、字距、字重、字族栈;全局:色板(全部出现色+使用频次+用于文字/底/线的分类)、间距声明值聚类(节奏候选)、表格 cell/正文比;
3. **同尺度归一**:全部字号折算 900px 纸宽等效(标本纸宽从其 CSS 现读,⛔硬编码 900);申报归一公式;
4. **诚实边界申报**:jsdom=级联可解量(声明/计算样式),⛔布局量(实际盒距/换行)——报告里逐项标「级联量/布局量(未测)」,⛔冒充;
5. **归格(snap)**:每个测得值给三列——原始值/最近的产品格点(token/角色/排印刻度/比例档)/距离;⛔工具自动改任何产品值;
6. 输出:JSON(机器)+MD 规格报告(人读,含与**当前产品值**的对照表:profile 字号行高/表格档/装订件——逐项 delta)。

## 二 · 首航

1. 对归档标本跑一次完整提取,产物落 `docs/audits/2026-09-22-t9-extractor-builder/`(JSON+MD 报告);
2. 对照表的 delta 逐项列出,**⛔本单落值**——采哪几项候 HQ/Henry 翻牌(报告即候拍清单);
3. 最小自检测试一条:对一个小合成夹具 HTML 跑提取,断言输出形状与关键值(接 client 全库自动发现);⛔把 221KB 标本塞进单测热路径(首航是一次性运行,产物落审计)。

## 三 · 验收与禁区

1. **本单零产品代码改动**(工具+测试+报告);定向:自检测试+首航产物齐全;回归:client 全库(工具在 client 树内);server 不受影响可免全量,跑接线静态检查即可——若 builder 判需全量,照常 111 文件预算 ≥600000ms;
2. **环境红处置**:builder 沙箱已知环境病(Python/MinerU 的 ENOENT/EPERM/101、npm_execpath 缺失类)不构成停线条件——能跑尽跑,如实申报环境阻断,HQ 机复验;⛔因环境红中断施工;
3. 原始日志留 `.codex-tmp/t9-extractor/`;
4. **禁区(带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔改标本文件⛔改产品值(profile/token/CSS 一律零动)⛔新依赖⛔新表新列⛔新工具面⛔prompt⛔TextFlow/坐标契约⛔Relation/判定域⛔用户库⛔真实模型调用(射程=远程 LLM/API 与凭据消耗;本地工具子进程明文允许);⛔新设计安全对抗类用例;合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符(本单⛔新 token,防御条款);
5. Result:测量面清单(级联量/布局量分账)+归一公式+首航 delta 对照表+自检数字+未做项;真冲突停线举证。

## Result

2026-09-22 · Codex builder：工具与宋史手册首航已完成，**零产品代码/值改动、零依赖新增、零标本改动**。此回执不构成采值或放行；非 git/secrets 验证门有一项既存文档索引红，见下。

### 交付与复跑

- `client/scripts/specExtractor/`：jsdom CSSOM/选择器解析 + 有限优先级/继承/变量解析，当前产品格点读取，JSON/MD 报告与一条合成测试；`client/package.json` 仅新增 `spec:extract` script。
- [审计入口](../../audits/2026-09-22-t9-extractor-builder/README.md)、[JSON](../../audits/2026-09-22-t9-extractor-builder/2026-09-19-song-handbook.spec.json)、[规格报告及 76 行逐项 delta 表](../../audits/2026-09-22-t9-extractor-builder/2026-09-19-song-handbook.spec.md)。当前产品值从 17 份源码动态读取，随产物附 SHA-256，不读用户库。
- 在 `client/` 运行：`npm run spec:extract -- ../docs/agent-ops/design/specimens/2026-09-19-song-handbook.html --out-dir ../docs/audits/2026-09-22-t9-extractor-builder`。当前 PowerShell 的 npm.ps1 被执行策略阻止，实际用 `npm.cmd` 同入口跑通；未改权限。
- 原始日志、逐组件 stdout/stderr/退出码/耗时、完整验证摘要和完整性证明均留 `.codex-tmp/t9-extractor/`；主索引 `verification-summary.json`、`first-voyage.log`、`self-test-final.log`、`integrity.json`。

### 测量面、归一与诚实边界

| 测量面 | 本次账目 |
| --- | --- |
| 正文、H1–H6、封面题名、图注、表格 caption、页眉/页脚、table cell/表头、引文、提示框的字号/行高比/字距/字重/字族栈 | 级联量：声明与继承/单位派生；16 角色组、1136 样本；H3–H6 无样本保留空组 |
| 色板、声明频次、文字/底/线分类、显式元素应用频次 | 级联量：39 色；声明频次与元素属性槽次数分账，非像素面积 |
| 间距声明值聚类、表格 cell/正文比 | 级联量：28 簇、2 比例；原值/最近产品格点/距离齐全，未采用 |
| 实际盒距、内容盒/纸盒、换行、分页、溢出、字体实际命中/字形尺寸 | **布局量（未测）**；不拿 jsdom 零尺寸充当测量 |

全局枚举 851 条声明、2435 静态元素；827 个未归入指定语义角色的文字元素不充正文。标本脚本/事件处理器不执行，外链字体样式不加载；动态 TOC、图形与页码内容未测。桌面 screen / 1280px / light 基线，非当前媒体、交互与伪元素规则保留排除说明。`line-height:normal` 与未支持字号保持 null，字距 normal 只记0em排印基线。间距 var()/相对单位保留声明，不拿根变量冒充逐元素值。

**归一公式**：`标本字号900等效 = CSS字号px × 900 / 标本CSS声明纸宽`；`产品字号900等效 = 产品内部逻辑px × 900 / 产品纸宽`。绝对间距同法；行高比/em/字重/字级比例不缩放。

实物证据：标本 `.book max-width=920px`，故系数 `900/920=0.9782608695652174`；900 是比较目标，未硬编码为源宽。产品 A4 内部纸宽现读904，当前正文16.3px/26.9px由现役物理映射及量化函数取得。该差异按工单「现读 CSS」处理，不改标本。标本前后 SHA-256 均为 `217d2e38029da4d781ddff9a6dce90429c2537cd4b60666b5948268d8adef782`。

### 首航 delta 摘要（完整 76 项见报告）

以下字号均为900等效；delta=标本−产品。每个测量记录另有原始值/最近产品格点/距离，最近不等于获准采用。

| 项目 | 当前产品 | 标本 | delta |
| --- | ---: | ---: | ---: |
| 正文字号 | 16.227876px | 15.652174px | -0.575702px |
| 正文行高比 | 1.650307 | 2.06 | +0.409693 |
| H1 字号 / 行高比 | 22.719027px / 1.519032 | 32.282609px / 1.35 | +9.563582px / -0.169032 |
| H2 字号 / 行高比 | 19.473451px / 1.581544 | 19.565217px / 1.35 | +0.091766px / -0.231544 |
| table cell 字号 / 行高比 | 13.793695px / 1.650307 | 12.717391px / 1.7 | -1.076304px / +0.049693 |
| table cell / 正文比 | 0.85 | 0.8125 | -0.0375 |
| 页眉/页脚字号 | 11.946903px | 11.25px | -0.696903px |
| 封面 serif 题名字号 / 行高比 | 35.840708px / 1.5 | 86.086957px / 1.1 | +50.246249px / -0.4 |

图注和表格 caption 分账；封面与无封面标题带分账（无对等标本值者 null）；提示框用正文众数，不用空壳 UA 默认值。未用边界外的字体或视觉判断替 HQ/Henry 翻牌。

### 验证与红项

- 合成定向自检 **1 文件 / 1 测试 PASS**，自动接 client 发现；覆盖声明优先级、继承、相对单位、同尺度、三列归格、normal/未知值与报告形状。221KB 标本未进入测试路径。
- 最终工具树 client 全库 **239 文件 / 2464 测试 PASS**；client build、server build PASS；server 接线 **111/111 wired，0 exempt / 0 unwired**。
- 总门27组件；按单 git/secrets 两组件留 HQ，**非 git/secrets N=25，全部运行，24 PASS / 1 FAIL**。唯一 FAIL=`docs:check` 的 `docs/agent-ops/INDEX.md` 过期，首批检查在本单审计文档/Result落笔前即重现。因串行 `&&` 跳过的 inventory/glossary 已只读补跑，均 PASS，不重复计 N。未擅自更新索引，**不申报总门全绿**，留 HQ 派生索引处置与复验。
- 其他门内数据：agent-knowledge 29、registry 5、manifest 10、parity 10、owned-helper 12 全 PASS；canvas model 60 groups、performance 5 scenarios PASS。构建 chunk 警告保留原始日志。
- 工具环境：CodeGraph/rg 缺失已只读 fallback；npm.ps1 策略红已用 npm.cmd/现役 npm CLI 继续。未出现 Python/MinerU/npm_execpath 环境阻断；没有因环境红停工，也未把索引过期冒充环境红。

### 未做项与范围

按工单未执行 git/secrets 两组件、server 全库、浏览器布局测量、真实模型/API调用、产品落值或主观验收。未改标本、profile/token/CSS、产品源码、数据库、TextFlow/坐标/Relation/判断域、用户库或权限配置；无任何 git 写操作。现状层没有产品事实变化，未扩改 current-state。余下为 HQ 索引复验与候选采纳决定；builder 完工不代表放行。
