> **状态 (Status)**: blocked（诊断阶段停线，未交付修复）
> **层 (Layer)**: 审计证据 / Builder receipt
> **日期 (Updated)**: 2026-09-21
> **权威 (Authoritative)**: 否；供 HQ 裁定，不改写上游工单或走查报告

# T3 排印诊断与停线证据

执行单：`docs/agent-ops/handoffs/2026-09-21-v14-t3-typography-alignment-order.md`。先完整读单和上游走查；T2 已为 done。遵从本轮用户「诊断先行」「冲突停线举证」，在产品修改前停线。没有提交任何排印修复、断言变更或全量验证通过结论。

## 1. Q3 的 22.6px 来自混合坐标尺度

现役数据链：

| 层 | 现役来源 | 值 / 作用 |
|---|---|---|
| 通用 profile | `typographyProfileService.ts:19` | 15px / 22px，字族 Aptos/Calibri 保留 |
| 纸张物理映射 | `pageFramePrintScaleService.ts:92` | `(210 / 25.4 × 96) / 904 = 0.8779875966831581` |
| A4 默认覆盖 | `pageFrameTypographyService.ts:38` | `11 × 96 / 72 / physicalScale = 16.7048677249`，单次舍入为 16.7px；行高 24.5px |
| 阅读档与步进 | `pageReadingViewportService.ts:60`、`:76` | fit-width：`baseScale=availableWidth/904`；`displayScale=baseScale×stepFactor` |
| 纸面与正文共同缩放 | `NoteWritingSurfaceLayer.tsx:1690`、`:1706`、`:1744` | 整张纸祖先 transform，正文在其下使用未乘阅读系数的 profile CSS variables |

665px 显示框、步进 1 的分解：

```text
S = 665 / 904 = 0.7356194690265486
computed fontSize = 16.7px                     （布局尺度）
screen font size = 16.7 × S = 12.2848451327px   （显示尺度）
报告口径 = 16.7 / 665 × 900 = 22.6015037594px （混用两尺度）
同尺度归一 = 16.7 × S / 665 × 900 = 16.6261061947px
等价写法 = 16.7 / 904 × 900
```

本轮采用真实 Chrome 的计算样式和 DOM 矩形，合成页面导入**未改动的生产** profile、物理映射、阅读档函数及表格 CSS。未连接应用后端、未读取用户笔记、未调用模型。该证据复现尺度错误，不宣称重走了原始用户笔记。走查档没有原始 transform/步进记录，不能从其两个数字反推出全部现场状态。

| 可用宽 / 步进 | 页框显示宽 | computed fontSize | 原公式归一 | 同尺度归一 | 实际字形宽 / 纸宽 |
|---|---:|---:|---:|---:|---:|
| 665 / 1 | 665 | 16.7 | 22.601504 | 16.626106 | 0.128145743 |
| 904 / 1 | 904 | 16.7 | 16.626106 | 16.626106 | 0.128145741 |
| 665 / 0.5 | 332.5 | 16.7 | 45.203008 | 16.626106 | 0.128145743 |
| 665 / 1.5 | 997.5 | 16.7 | 15.067669 | 16.626106 | 0.128145743 |
| 665 / 2 | 1330 | 16.7 | 11.300752 | 16.626106 | 0.128145743 |

实际字形 DOM 宽也随共同 transform 同比变化，字/纸比稳定；这条浏览器观测不依赖把期望字体数字回填为矩形。未发现“阅读步进单独抬字号、纸宽跟不上”的现役路径。

**冲突与不能自行越过之处**：工单验收指定 `computed fs / 显示框宽 × 900`，同时要求修在错位层且禁止机制改动。把该混尺度公式固化为常驻断言会把现有等比缩放判错；若强令665px框下原公式等于16，则布局字号须降到11.8222px，真实900等效约11.77px。不能靠这一尺度误差推动约29%的缩字。需要 HQ 修订标尺口径及对应施工基线。

**不扩大结论**：16.6261 仍略高于16.5上限；行高比 `24.5/16.7=1.4671` 仍低于1.6～1.75。因此不是“正文无需修”，而是应按正确尺度评估小幅默认参数修正，不能按22.6→16的量级施工。

## 2. G9 与装订件的未改动现状

`TableBlockProjection.module.css:10` 为正文减2px（16.7→14.7），实际档位0.88024；同尺度900等效14.63496px，原报告19.9同样受混尺度影响。`:16-17` 的 `width:max-content; min-width:100%` 确会撑满内容区；合成小表实测表宽=内容宽。`:37-39` 有8em最小列宽及8×10px padding。本轮没有擅自把合成表的比例当作原笔记98.6%的复测。

装订件 `NoteDetail.module.css:3594` 为12px布局字号，同尺度900等效11.94690px，正文比0.71856。字体族、颜色、token及装订样式均未改。

内容自适应宽居中、0.85档、padding收敛仍是明确待做事项；按“冲突停线”，没有在同批继续提交部分修复。

## 3. 全库验证与模型禁令存在第二处冲突

- `server/src/__tests__/v2SourceRegionCells.test.ts:183-209` 的既有测试清除 `COINCIDES_MINERU_COMMAND_JSON`，指定真实 pinned Python，调用 `parseSourceArtifact({parser_key:'mineru'})`。这不是新设计的测试，也不是本轮执行过的测试。
- `server/src/services/sourceMineruParser.ts:147-155` 调用 `do_parse`，明确 `backend="pipeline"`、`parse_method="ocr"`、`formula_enable=True`、`table_enable=True`；`:774-790` 落 runner 并启动真实子进程。
- 因此“既有功能全库零排除”与未限定为云端 LLM 的“禁真实模型调用”，在本地 MinerU OCR 上存在执行边界冲突。未启动它；未用假失败、强制缺环境、临时跳过或替换模型来冒充全量。
- 需 HQ 明确本地 MinerU 是否属于本单禁止项以及相应验收责任；builder 不自行扩大授权。

验证门盘点为27个顶层组件：**非 git/secrets 25组件，本轮执行0/25，因诊断停线**；`git diff --check` 与 secrets 两组件留 HQ。只读 `git status` / `git diff --stat` 是现场盘点，不作为该两组件通过。server现役111测试文件=主集84+补集27（含v13WildernessExecute），恢复后每文件预算须≥600000ms。本轮没有跑client全库、server全量或验证门。

## 4. 断言与禁区申报

| 断言类别 | 旧值 → 新值 | 原因 |
|---|---|---|
| 现有排印、分页、对齐断言 | 原样 → 原样（零处更新） | 在修改前停线，没有静默改期望或弱化断言 |
| T3常驻DOM计算样式标尺 | 无 → 未新增 | 原验收公式存在上述尺度冲突；诊断脚本不是常驻验收 |

禁区射程覆盖本轮及辅助只读agent：没有git写操作（含add/commit/push/reset/改.git）；没有改agent指令/权限；没有新表新列、TextFlow schema、content/metadata/display_overrides键、工具面、prompt、Relation/判定域、依赖、字族、颜色或`--sk-` token；A4 904/1278/760、坐标契约和分页算法均未改。没有接触用户库或补种heading、没有真实模型调用、没有新增设计安全对抗用例、没有创建合成凭据。辅助agent仅做源码与验证边界复核；没有并行builder。

## 5. 证据与复现

- `chrome-dom-observed.json`：从本轮Chrome诊断页DOM输出摘录的数值，含computed字体、transform、矩形及字形比例；不是截图。
- `source-evidence.txt`、`source-hashes.json`：9份未改源码的逐行摘录与SHA256。
- `verification-inventory.json`：前25项验证组件及HQ保留项，全部明确未跑。
- `diagnostic-server.mjs`、`collect-evidence.mjs`：原脚本副本，**相对路径按原始位置 `.codex-tmp/t3-typo/` 解析**；复现时使用原始位置，或先将副本复制回该目录。
- 原始诊断脚本、源码日志、浏览器数字摘录、只读git盘点及工具受限日志均在 `.codex-tmp/t3-typo/`。复现命令（server cwd）：`node --import tsx ../.codex-tmp/t3-typo/diagnostic-server.mjs`，新标签访问 `http://127.0.0.1:5193` 后读取 `#result`。本轮取证后关闭临时服务与标签。

CodeGraph索引存在，但CLI不在PATH且无可调用MCP；尝试后回退只读本地搜索。browser-harness读取Chrome调试端口受权限限制，未提权，改用已有Chrome扩展通道完成合成DOM取证。没有因这些工具缺口更改产品。
