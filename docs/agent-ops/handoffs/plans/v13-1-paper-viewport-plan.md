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

## 冻结裁定(HQ 2026-09-07,依 K-0 报告 `analysis/2026-09-07-v13-1-k0-recon.md`;四冲突裁毕,单序改为 单2→单1→单3)

1. **范围更正**:page 现无自由缩放可"取消"——单 1 性质改为**新增 page 阅读档位呈现通道**(状态/派生/呈现/输入坐标四层一体);canvas 行为与公共 clamp/手势零变化;
2. **物理基线=映射制**(⛔ 重定内部几何):内部布局单位(A4/Letter 内部宽 904)**原样保留,⛔ 改任何存量 page_frame_local 几何**;print profile 扩员物理字段(pageSize→physicalWidthMm:A4=210、Letter=215.9),`physicalScale = 物理宽@96dpi ÷ 内部宽`,**单一定义点在 print profile**;"100% 物理"档=整页呈现乘 physicalScale;导出/打印走同一映射。图一 §二"96dpi A4≈794×1123 已建模"前提**不成立,以本条取代**;
3. **双族判定按 templateId 不按 pageSize**:a4_portrait/letter_portrait=纸族(pt 系,正文 11pt——pt→物理 px→÷physicalScale 由 profile service 经 print profile 计算,⛔ 硬编码换算结果);screen_note=网页族(px 系,16px 族,physicalScale=1);custom 随其 pageSize(A4/Letter→纸族,Custom→网页族)。**用户 activeProfile 覆盖永远优先**(现有 note metadata 通道沿用),模板默认只补位;排版 CSS 唯一出口维持 `documentTypographyToCssVars`,⛔ 动 pageFrameTemplateToCssVars(不造第二套排版真相);混合纸族 note 取首帧族为默认(罕见场景,细则归 13.5);
4. **单 3 改两步**:现物无最终 PDF 输出链——3a=**打印通道 v1**(@media print 打印样式,几何走同一 physicalScale 映射,浏览器打印即导出,⛔ 造 PDF 引擎);3b=K-比例回归对 3a 的打印光栅(一号证物样本+盒对齐检查)。3a 试做遇深坑即停线,K-比例降级为"100% 档屏显几何=映射计算值"的机械判据+走查①人眼对照,真 PDF 引擎挂停车场;
5. **档位状态**:page 专用视图状态(语义档位名+手动步进值,显示比例现算),note 作用域、组件内存态;⛔ 接旧 LearningCanvas 表、⛔ 扩 server 持久化(候真实需求);
6. **两条施工边界**(K-0 §四):外层适配显示、**内层布局盒固定**(fit 比例⛔ 反灌 clientWidth→正文布局);page 显示比例必须在输入/叠层边界闭合(拖动/双击/drop/控制条/文本命中/caret 浮层的 page 路径),⛔ 向纯测量函数签名塞 zoom。

## 单 2 · 物理映射基线 + 双族 profile(先行)

- print profile 物理字段+physicalScale 单一定义点;templateId 定族;纸族 11pt/网页族 16px 默认 profile,经映射计算;用户覆盖优先;有效 profile 一致进入屏显 CSS vars/估高/续页/Preview;
- 顺带修 K-0 揪出的现物漏:`useBlockPlacementInteractions.ts:242` estimateBlockHeightForText 未传 profile;
- 冒烟判据:换纸型 profile 等比跟随;测量族签名维持零 zoom(K-解耦);canvas 零变化。

## 单 1 · 视口档位机(page 模式;候单 2 落地)

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
