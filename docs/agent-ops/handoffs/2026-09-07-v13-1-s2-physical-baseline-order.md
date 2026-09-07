> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.1 单 2,按冻结裁定先行)
> **日期 (Date)**: 2026-09-07
> **性质**: 施工单(client 引擎,中单)

# 13.1 · 单 2 · 物理映射基线 + 双族 profile

## 〇 · 上游(先读,顺序)

1. 段 plan 含冻结裁定:`docs/agent-ops/handoffs/plans/v13-1-paper-viewport-plan.md`(裁定 2/3/6 是本单法源);
2. K-0 报告:`docs/agent-ops/analysis/2026-09-07-v13-1-k0-recon.md`(§二/§三 现物证据;其「单 2」两行最小改动面清单即本单射程)。

## 一 · 口径(冻结)

1. **print profile 扩员(physicalScale 单一定义点)**:`pageFramePrintScaleService.ts` 的 profile 增加物理字段——pageSize→physicalWidthMm(A4=210,Letter=215.9,Custom=null),`physicalScale = (physicalWidthMm/25.4*96) / 内部宽`;Custom/网页族 physicalScale=1。⛔ 改内部宽高/inset 任何现值;⛔ 触碰存量 frame 几何;
2. **族判定按 templateId**:a4_portrait/letter_portrait=纸族;screen_note=网页族;custom 随 pageSize(A4/Letter→纸族,Custom→网页族)。判定函数放 typographyProfileService 或同层纯函数,单测覆盖四 template × pageSize 组合;
3. **双族默认 profile**:纸族=正文 11pt 族(11pt→物理 px(×96/72)→÷physicalScale 得内部 px,行高/段距同法推导,**由函数经 print profile 计算,⛔ 硬编码换算结果**);网页族=现默认 15px 族升格为 16px 族(K-0 §二:现默认 15px/22px)。DocumentTypographyProfile 结构沿用(px 字段语义=内部 px),⛔ 新造通道;
4. **优先级**:用户 activeProfile(note metadata,hydration/写入通道 `useNoteCanvasDataAdapter.ts:598,935-966` 现物沿用)**永远优先**;模板族默认只在无用户覆盖时补位;混合纸族 note 取首帧族;
5. **有效 profile 一致传递**:屏显(`documentTypographyToCssVars` 唯一 CSS 出口,⛔ 动 `pageFrameTemplateToCssVars`)、估高(`useNoteCanvasLayoutModel` 闭包)、续页(`useRuntimeNaturalWritingController`→`pageStackContentFlowService`)、Preview(`exportPreviewService`)同源;
6. **修现物漏**:`useBlockPlacementInteractions.ts:242` `estimateBlockHeightForText(block,text,width)` 补传当前有效 profile;
7. **零变化面**:canvas 模式行为、测量族函数签名(维持零 zoom 输入)、存量 frame 几何、note metadata 结构(activeProfile 语义不变)。

## 二 · 验证(段纪律:⛔ 马拉松)

1. client typecheck/build(仓库现有脚本,申报命令与输出摘要);
2. 单测:族判定(四组合)+ pt→内部 px 换算(A4/Letter 各一例,数值断言从 physicalScale 推导)+ 用户覆盖优先级;挂既有 client 测试基建,⛔ 新建基建;
3. 一条功能冒烟:同一笔记 a4_portrait→letter_portrait 切换,有效 profile 等比跟随(以估高/换行输出变化为证),canvas 模式对照零变化。

## 三 · 回执与边界

完工在本文件末尾 apply_patch 追加 `## Result`(numstat+验证命令输出摘要+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 动本单射程外文件。现物与口径冲突(如 physicalScale 定义点与现有归一化函数打架)⇒ 停线,在本文件追加 `## 停线` 举证,⛔ 自行改判。
