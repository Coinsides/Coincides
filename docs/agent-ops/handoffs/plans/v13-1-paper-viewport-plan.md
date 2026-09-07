> **状态 (Status)**: active(13.1 段 plan;Henry 2026-09-07 亲令「每段开工前单独出 plan」的第一份)
> **层 (Layer)**: 计划
> **日期 (Updated)**: 2026-09-07
> **权威 (Authoritative)**: 是(13.1 拆单与验收依据);设计上游=图一(`analysis/2026-08-31-paper-viewport-design.md`)
> **组织**: 两层制(Fable 直派 Codex;验收认实质;commit 归 HQ——新版 codex 沙箱锁 .git)

# V13.1 · 纸的视口(标尺锁定)—— 段 plan

**段使命**:页面模式取消自由缩放,视口改三档阅读标尺(适合页宽/适合整页/100% 物理)+步进;文字度量与 viewport.zoom 彻底解耦;所见比例=导出比例。比例病一号证物平反。
**段纪律**:测试=每单 typecheck/build+一条功能冒烟,⛔ 马拉松;段收口做一次定向核查;⛔ 动 canvas 模式/野地语义(13.2 财产);⛔ 安全类测试;codex 交工作树,HQ 验实质代账。

## 单 0 · K-0 侦察(只读,先行)

产出 `analysis/2026-09-07-v13-1-k0-recon.md`,五问必答(图一 §五 + 一):

1. `CanvasViewport.zoom` 全部消费者清单,按 渲染/测量/命中判定 三类归档(含文件:行号);
2. 文本测量(averageCharWidthPx/行高族)与 zoom 的现有耦合点逐一列举;
3. 导出管线 scale 来源(是否已走 `createPageFramePrintProfile`);
4. page/canvas 模式视口控制器的分叉点(13.1 只动 page 侧的切口在哪);
5. 三档档位状态的天然存放点(现有 viewport 持久化通道现状)。

**闸**:K-0 报告到手后,由 HQ 按其结论冻结单 1/2 口径再放行——⛔ 凭图纸直接施工(M3 教训:裁前必查)。

## 单 1 · 视口档位机(page 模式)

- 三档+步进(50%–200%,10% 级)替换自由缩放;默认=适合页宽;档位=整页等比呈现,⛔ 改纸内布局度量;
- 无级捏合/滚轮 zoom 在 page 模式摘除;canvas 模式行为零变化(分叉点按 K-0);
- 冒烟判据:三档切换下任意块 page_frame_local 几何零变化(K-档位)。

## 单 2 · 度量解耦与双族绑定

- 排版 profile 选择随 pageSize 族:纸族(A4/Letter)=pt 系(正文 11pt),网页族(screen_note/custom-web)=px 系(16px 族);机制沿用 DocumentTypographyProfile + pageFrameTemplateToCssVars,⛔ 新造通道;
- 文本测量函数输入清除 viewport.zoom(K-解耦=机械验证:测量族函数签名/调用点 grep 零 zoom);
- 冒烟判据:换纸型 profile 等比跟随;度量函数签名验证过。

## 单 3 · 导出保真回归(K-比例)

- 100% 档屏幕光栅 vs 导出 PDF 光栅,布局盒逐一对齐(容差=抗锯齿;⛔ 盒位移/换行差);
- 回归样本=一号证物笔记(2026-08-30 Henry 截图那篇);样本对照入 audits;
- 开放问题落地:超长网页式页的"适合整页"档退化为"适合页宽+回顶"(图一 §六 倾向,单内实现,走查①请 Henry 过目)。

## 段收口 · 定向核查 + 走查①

- 定向核查:仅对本段所动之面(视口/度量/导出)跑既有相关测试+三判据(K-比例/K-档位/K-解耦)申报;
- **⭐ 走查①(Henry)**:比例体感终验 + 翻旧裁定批(「允许溢出」改判亲批,连动图三收编规则与图四 OverflowPolicy)+ 4a 视口居中旧案眼验;
- 收口后开 13.2 段 plan。

## 工单模板条款(每单沿用)

先读工单全文→按口径实施→停线条款(现物冲突即停,举证不改判)→Result(numstat+验证命令输出摘要+未做清单,apply_patch 落盘)→⛔ commit(工作树交 HQ)→⛔ key 出境→⛔ 打印 env。
