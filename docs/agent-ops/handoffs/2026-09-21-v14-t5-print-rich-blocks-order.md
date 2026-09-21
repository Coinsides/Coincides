> **状态 (Status)**: done(2026-09-21 HQ 收官:一轮环境红停线→补遗一立环境红处置条款→二轮交齐;builder 环境两红=Python 系,HQ 机 server 主集真全绿;client 2380/2380 逐字对上;双门绿)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T5 打印/导出富块真渲染(G4)
> **上游**: ①缺口清单 G4:样张打印所见即所得;产品媒体/组件/表格三族在打印与导出预览=占位符(B2/B5 交付时如实申报);「同源 flow plan 已在,只欠消费端」;②T1 先例:toc 打印静态化已走通 NotePrintLayer+getPagePrintSlices 路(TocPrint.test 四情形);③T2 后果:Agent 现在能产这三族块,打印占位=正门开了货出不了门。

# T5 · 打印/导出富块真渲染

## 一 · 目标与同源律

1. **三族真渲染**:媒体块(含 `edit_v1` 裁切/缩放/旋转参数生效)、表格块(T3 后的收身居中样式)、组件块(timeline/chart_bar/chart_line)在**打印面与导出预览**渲染真容,替换占位符;
2. **同源律**:打印渲染消费**与纸面同一投影组件/同一数据参数**(允许 print 变体壳,⛔平行取数⛔第二套渲染逻辑——T1 toc 的做法为准);
3. **分页零变**:纸面渲染本就是真的,flow plan 的块几何不因本单改变——打印层只换消费端;若发现占位符高度与真渲染高度在打印切片里不一致的既有缺陷,如实申报⛔顺手改分页;
4. 未知 component_kind 在打印面照占位符降级(与纸面一致);媒体资产缺失走现役 409/占位语义,⛔打印时崩。

## 二 · 出生公约(照守)

打印样式取值走 token/系统刻度;⛔字面 hex⛔硬编码字体;打印专用的黑白/灰度处理若需要,申报做法(允许 print media query 内的合法降饱和,⛔另立色板)。

## 三 · 验收与禁区

1. 定向:三族各自打印/导出预览断言(T1 TocPrint.test 同法:真 print portal、跨页、有无封面);edit_v1 参数在打印面的生效断言;
2. 回归:client 全库+server 全量(**111 文件零排除,补集含 v13WildernessExecute 与本地真 OCR 路,文件预算 ≥600000ms,⛔按 120s 判红**);
3. 证据落 `docs/audits/2026-09-21-t5-print-builder/`,原始日志 `.codex-tmp/t5-print/`;
4. **禁区(带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔分页算法⛔坐标契约(904/1278/760 不动)⛔TextFlow 真相 schema⛔新表新列⛔新工具⛔prompt⛔Relation/判定域⛔新依赖⛔用户库⛔真实模型调用(射程=远程 LLM/API 与凭据消耗;本地 MinerU OCR 子进程=构建内确定性工具,全库整跑明文含它);⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符;
5. Result:逐族结论+逐件行号+测试数字+出生公约自查+未做项;冲突停线举证。

## 补遗一(HQ 裁定:环境红处置条款——沙箱已知病不构成停线)

> 2026-09-21 · HQ 按代理权裁定,回应下方 Result 停线。缺陷在 HQ:五张单的 builder 在环境红面前行为各异(四单续跑一单停线),因为工单从未明文处置规则。

1. **环境红处置条款(自此进工单模板)**:builder 沙箱的已知环境病(Python/MinerU 的 ENOENT/EPERM/退出码 101、npm_execpath 缺失类)**不构成停线条件**——施工照常完成,能跑的验证尽跑,环境红**如实申报为环境阻断**(⛔冒充绿⛔豁免⛔跳过),HQ 机复验收口(既有协议:HQ 机 Python 全绿已五次实锤);**⛔因环境红中断施工**;
2. **测试启动器自修先例追认**:T2 builder 修自家测试启动器(npm_execpath 传递/临时目录出仓)属测试基建⛔产品码,允许,分账申报;
3. 二轮任务:完成三族施工与测试草稿校准(含预览重复计数断言)、client 全库、非 git/secrets 25 组件;server 全量照跑如实报环境红;Result 第二轮照原单要求。

## Result

**2026-09-21 · Codex builder：stopped / incomplete，未完成、未验收。header 保持 ready，不翻 done。**

必跑本地真 OCR 遭执行权限冲突：pinned MinerU venv 所依赖的 Python 启动失败（原始 server 日志 exit **101**）；直接只读启动该 base Python 报 **Access is denied**。确认后按本单「冲突停线举证」停止实现及新测试，只整理回执。未修改外部 Python、依赖、权限或用户库，未请求越权。

证据总表：[T5 builder 停线回执](../../audits/2026-09-21-t5-print-builder/README.md)；执行细节：[server 验证记录](../../audits/2026-09-21-t5-print-builder/server-verification.md)。原始日志与停线代码快照：`.codex-tmp/t5-print/`。

### 逐族现状

- **媒体**：已落未验收草稿，打印/预览改接纸面同一 `MediaBlockProjection` 与 `edit_v1` 几何；共享资产读取，打印前隐藏挂载相同投影作准备。图片未准备完成即打印、decode 时机、资源交接仍待验证，不能宣称已完成真打印交付。
- **表格**：开工现物已复用 `TableBlockProjection`，保留 T3 收身居中样式；本单增加集成测试草稿，未执行，不另建渲染。
- **组件**：开工现物已复用 `ComponentBlockProjection`，保留 timeline/chart_bar/chart_line 及未知 kind 占位。timeline 详情仍初始折叠；图表 print 按宽度缩放与纸面滚动投影的既有高度差异如实保留，未改分页补偿。
- **分页**：算法、切片、flow plan、TextFlow schema、904/1278/760 坐标契约均未修改；因停线未完成分页零变断言。

### 逐件落点（行号为停线现物）

| 文件（均相对仓根） | 行号 / 作用 |
| --- | --- |
| `client/src/pages/Notes/canvasEngine/hooks/useMediaImageAsset.ts` | 11、42：共享读取、同步 snapshot、URL 生命周期草稿 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.tsx` | 14：同一投影接共享读取，复用 edit_v1 与失败态 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx` | 28、172：隐藏媒体准备、保留真实 print portal 生命周期 |
| `client/src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent.tsx` | 70：取消打印强制媒体占位，保留其余 print 变体 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.tsx` | 46：原矩形中消费真实媒体投影 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx` | 272：打印同步真图断言草稿 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaImageConsumption.test.tsx` | 72、76：共享读取及打印 edit_v1 断言草稿 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.media.test.tsx` | 13：预览真图及共享读取断言草稿 |
| `client/src/pages/Notes/canvasEngine/layers/RichBlocksPrint.test.tsx` | 125、228、249：三族真实 portal/预览/跨页/封面/降级共 6 用例草稿；尚有预览重复计数断言待校准 |

### 测试数字与未做项

- **server 全量已跑但失败**：111 文件、零排除、600000 ms/文件；1118 tests，1115 pass / 3 fail / 0 skipped / 0 flaky retries，100311.6327 ms。包含 v13WildernessExecute 与真 OCR 路径，未按 120s 判红。
- 三败：`v2SourceMineruWiring` 的 PATH 缺 python.exe；`v2SourceRegionCells` 的 pinned Python 无法启动 101；`v2TestV2ManifestHook` 的 direct-node 调用缺 `npm_execpath`。权限冲突确认后均未补跑、未豁免。
- **client 定向/全库未跑**；**非 git/secrets 25 组件未跑**；真实浏览器/打印/PDF 视觉验证未做。git 检查及 secrets 两组件留 HQ。现有测试内部 server build 不算整个验证门通过。
- 恢复后须完成测试草稿校准、资源生命周期与打印时机验证、client 全库、server 完整重跑、非 git/secrets 25 组件，才能申请复核。

### 出生公约自查

本单未新增 CSS、字面 hex、硬编码字体、色板或 `--sk-` token；不引入灰度策略，复用现役 token 与投影。未新增依赖/表列/schema/产品工具/prompt/Relation/判定域代码、合成凭据或安全对抗用例。未操作用户库或启用真实远程模型调用；未做 git 写操作；未改 agent 权限/指令。操作说明书/current-state 尚未更新，待恢复验收后由守门同步。

## Result 第二轮

**2026-09-21 · Codex builder：施工完成，可交 HQ 复核；server 仍有两项已知环境阻断，非全绿、非验收放行。** 按补遗一继续完成实现与全部指定验证，不再以 Python 环境红停线。header 翻 done 仅表示 builder 本轮任务完成；第一轮 Result 原文保留。完整证据：[第二轮施工回执](../../audits/2026-09-21-t5-print-builder/round2.md)、[server 第二轮](../../audits/2026-09-21-t5-print-builder/server-round2.md)；原始日志 `.codex-tmp/t5-print/round2-*`。

### 逐族结论

- **媒体完成**：纸面/打印/导出预览共用 `MediaBlockProjection` 与原 `edit_v1` 几何。资产读取共享，在同一个 Blob URL 上完成 decode 后才发布 loaded；隐藏同源投影提前准备未显示页。真实 beforeprint portal 同步消费准备好的图像，保留原矩形、crop/zoom/rotation。409、缺元数据、解码失败均走可读失败态。
- **表格完成**：开工现物已使用共享 `TableBlockProjection`；验证了真实 caption/headers/rows、T3 收身居中和 0.85 字号比例、print clip。本轮没有另建渲染。
- **组件完成**：开工现物已使用共享 `ComponentBlockProjection`；timeline/chart_bar/chart_line 真渲染与未知 kind 占位均通过。时间线仍初始折叠；图表按原 print 变体缩放。图表缩放高度与纸面滚动高度、时间线展开后的预留高度可能有既有差异，照单申报，未顺手改分页。
- **分页零变已断言**：三种封面组合、多页真实 flow plan；逐块纸面/print clip 和 article 矩形相同，预览指向同一 flowFragment；blocks/plan/fragments/preview 快照零修改。分页算法、切片、904/1278/760 坐标契约与 TextFlow schema 未动。
- **预览重复计数已校准**：各 PageFrame/export/AI 分组按各自 rows 验证 0/1 份，再核对 overlay 总数；每份 bar=6 柱，line=2 线/6 点，删除草稿的全局乘 3 断言。

### 逐件最终行号（相对仓根）

| 文件 | 位置 / 作用 |
| --- | --- |
| `client/src/pages/Notes/canvasEngine/hooks/useMediaImageAsset.ts` | 11 共享订阅；24 decode；45 末订阅微任务回收；53 同步 snapshot |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.tsx` | 14 同源资产读取，原 edit_v1/失败态复用 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx` | 28 媒体预热；144 冻结任务；174 预热/portal 资源交接 |
| `client/src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent.tsx` | 70 附近撤销媒体强制占位，table/component/toc print 变体保留 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.tsx` | 38/46 三族共享组件与媒体原矩形 |
| `client/src/pages/Notes/canvasEngine/layers/RichBlocksPrint.test.tsx` | 128/135 分组计数；179 三封面组合；218 同矩形；239 edit_v1；295 零变；299 预热；320 降级 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaImageConsumption.test.tsx` | 66/93 同源纸面与打印；109/133 decode/失败；149/165 引用/回收；179/198 切 note 与冻结资产 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.test.tsx` | 24/39/52 回收断言等待已声明微任务边界 |
| `client/src/pages/Notes/canvasEngine/layers/NoteNavigationPages.requests.test.tsx` | 99/118/125 teardown、懒卸载、最终回收断言校准，HTTP/重挂载数量断言保留 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx` | 272 同步真图、原矩形、单次读取 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.media.test.tsx` | 13 预览真图与共享读取 |
| `docs/agent-ops/INDEX.md` | 现役生成器同步 426 条工单索引，补既存 T4 状态及 T5/T6/T7 缺项 |

### 测试数字与基建分账

- **定向 7 文件、49 个不同用例通过**：媒体投影 8、跨消费/生命周期 8、NotePrintLayer 20、ExportPreview.media 1、TocPrint 4、RichBlocksPrint 6、Navigation requests 2。
- **client 全库最终 232 文件、2380/2380 通过，146.99s，零排除**。首跑 2366 pass / 14 fail 原日志保留：10 超时、3 元素等待失败、1 导航旧同步回收断言。校准最后一项后仅以 `--maxWorkers=2` 完整复跑；未放宽默认 5000ms 超时、未修改其余 13 项测试/产品码，全部通过。
- **非 git/secrets 25 组件最终均有通过证据**：首遍 23/25，client 全库和 docs:check 失败；完整 client 复跑、现役索引生成后的 docs:check 均通过。不是单次首跑全绿，也不冒称完整 27 组件门；git 检查和 secrets 两组件留 HQ。25 项逐项账见第二轮施工回执。
- **server 全量已完整重跑但未全绿**：111 文件、零排除，含 v13WildernessExecute 与真实 OCR；600000ms/文件，1118 tests / 1116 pass / 2 fail / 0 skipped / 0 cancelled / 0 flaky retries，214636.1826ms。两败为 `v2SourceMineruWiring` 的 `python.exe ENOENT`（stdout 61783/61806）和 `v2SourceRegionCells` 的 pinned Python **101**（62652），均待 HQ 机复验，没有豁免或隐藏。
- **测试基建分账**：仅私有 `.codex-tmp/t5-print/round2-server-runner.mjs` 显式传 `npm_execpath`、临时数据/空 dotenv 出仓至系统 Temp；未改 server 产品码或共享启动器。旧 `v2TestV2ManifestHook` 失败本轮已 PASS（stdout 63715–63726）。25 门也通过私有 runner 逐组件保存原始日志和退出码，未修改现役门来绕过断言。

### 出生公约、未做项与交接边界

没有新增 CSS/hex/硬编码字体/色板/`--sk-` token/灰度策略；没有新增依赖、表列、schema、工具、prompt、Relation/判定域代码、安全对抗用例或合成凭据；没有用户库、真实远程模型调用、git 写操作或 agent 权限/指令修改。只更新生成索引和本单收据，未触开工无关改动。

`beforeprint` 不能等待尚未完成的 IO/decode：提前打印仍显示 Loading，准备完成后重开打印显示真图；无 decode API 的宿主保留兼容路径。本轮没有真实系统打印/PDF 栅格/主观视觉验收，不用 jsdom 冒充实物成品。表格宽裁切、timeline 初始折叠、图表 print 缩放沿用现役边界。server Python 环境与 git/secrets 两组件交 HQ 收口。

**说明书同步交接**：`current-state/app-operating-manual.md:43` 仍有「打印与导出预览是媒体占位」旧句，现已与本轮实现不符；准确替换措辞和 Loading/失败边界已写入审计回执，交 current-state 守门 Fable 同步。本单未新增 UI 入口/API，未擅改 agent 操作说明书。未发现需按工单停线的新冲突。
