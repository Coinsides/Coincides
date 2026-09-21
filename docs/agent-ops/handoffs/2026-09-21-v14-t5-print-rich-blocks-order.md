> **状态 (Status)**: ready(HQ 按代理权翻牌;收尾批第五单;Henry 2026-09-21 晨令「先继续」)
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
