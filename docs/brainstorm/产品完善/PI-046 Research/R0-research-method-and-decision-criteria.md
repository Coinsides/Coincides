# R0: 调研方法与评分标准

## PI-046 阶段定位

本轮 PI-046 调研不是为了立刻继续实现功能，而是为了回答 Coincides 下一阶段到底应该怎样走：

- 继续当前 Coincides 主线并做产品级重构；
- 新开 repo 从更成熟的笔记软件地基重做；
- fork / copy / depend on AFFiNE 或 BlockSuite；
- 或者把现有 Coincides 成果保留为语义层、source 层、proposal 层和 graph-shaped 数据经验，再换一个 editor/runtime 底座。

因此 R0 的作用是建立统一的调研方法。后续 R1-R14 都要使用这套格式、证据等级和评分维度，避免每份报告只凭单点直觉做判断。

## 固定报告结构

每份阶段报告至少应包含以下小节：

1. **本阶段问题**
   - 本报告回答 Outline 中的哪一组问题。
   - 本报告不回答哪些问题，避免越界。

2. **证据来源**
   - 当前 Coincides 代码或文档。
   - PI-046 已完成报告。
   - AFFiNE / BlockSuite 产品体验、官方文档或源码。
   - 第三方资料或外部观察。
   - 明确标注哪些内容只是推测。

3. **核心发现**
   - 用条目列出事实性发现。
   - 每条发现尽量说明对应证据。

4. **解决了什么问题**
   - 本阶段让哪些问题变清楚了。
   - 哪些路线因此更可信或更不可信。

5. **暴露了什么风险**
   - 产品体验风险。
   - 工程复杂度风险。
   - 许可或维护风险。
   - 数据模型或未来 graph migration 风险。

6. **对后续阶段的影响**
   - 哪些后续 R 阶段必须引用本报告。
   - 是否需要反补前序报告。

7. **Roadmap 影响**
   - 是否影响短期 v2.x 工程路线。
   - 是否影响后续重构 / 新 repo / AFFiNE / BlockSuite 路线。
   - 是否影响 3.x graph-native 或 external agent 规划。

8. **待确认问题**
   - 仍然需要后续报告、代码验证或产品体验验证的问题。

## 证据等级

后续报告应尽量把判断拆成不同证据等级。证据等级越高，越适合用来推动路线决策。

### A. 当前代码证据

来自当前 Coincides 工作区或外部研究 repo 的实际源码、schema、route、component、test、package 配置。

典型来源：

- `server/src`
- `client/src`
- `shared`
- `docs/releases`
- `docs/brainstorm`
- `_external_research/AFFiNE`
- `_external_research/blocksuite`
- CodeGraph 对上述 repo 的索引结果

适用场景：

- 判断当前 Coincides 已经有什么；
- 判断某个对象是否真的存在；
- 判断 AFFiNE / BlockSuite 的代码结构和调用关系；
- 判断某个改造是否会触碰核心模型。

### B. 官方文档证据

来自项目 README、官方 docs、license、package metadata、release notes。

适用场景：

- 判断许可、安装方式、设计目标；
- 判断工具或框架的公开能力；
- 判断是否适合依赖、fork 或仅参考。

### C. 产品体验证据

来自实际使用、截图、浏览器 smoke、用户体验观察。

适用场景：

- 判断 AFFiNE / Notion-like 体验是否符合 Coincides 目标；
- 判断当前 Coincides UI/UX 为什么不够；
- 判断用户心智和交互期望。

### D. 第三方观察

来自社区讨论、评测、Issue、PR、非官方总结。

适用场景：

- 了解维护风险、社区痛点、实际限制；
- 只能作为辅助证据，不能单独决定路线。

### E. 推测 / 设计判断

来自我们基于现有证据做出的架构推理。

适用场景：

- 对未来 graph model、external agent、source-grounded note assembly 做设计判断；
- 必须明确标注为推测；
- 需要在后续阶段用代码、产品体验或实验反证。

## 候选路线

R13 和 R14 最终会重点比较以下路线：

1. **继续当前 Coincides 主线**
   - 保留当前 repo、当前 React/SQLite/Express-ish 主线，继续补 editor/canvas/note UX。

2. **新 repo 从零做**
   - 现有 v2.x 作为经验和 schema 实验，不继续承载最终产品。

3. **AFFiNE full fork / copy 改造**
   - 复制或 fork AFFiNE，以完整产品为底座做 Coincides 方向改造。

4. **BlockSuite-first editor runtime + Coincides semantic layer**
   - 使用 BlockSuite 作为 editor/block/canvas runtime，Coincides 保留 source、semantic、proposal、graph-shaped 数据层。

5. **Coincides-owned editor + AFFiNE / BlockSuite 仅作参考**
   - 自研核心 editor/canvas，但系统性学习 AFFiNE / BlockSuite 的结构和体验。

6. **Hybrid bridge**
   - 先用 Coincides 当前主线完成 source / proposal / semantic 层调研或 MVP，再把 editor 层迁移到 AFFiNE / BlockSuite 或新底座。

## 评分维度

每条候选路线在 R13 中至少按以下维度评分。建议使用 1-5 分。

评分语义：

- **1 分**：明显不适合，或需要巨大代价才能成立。
- **2 分**：可行但风险大，存在明显冲突或维护成本。
- **3 分**：可行但需要重要改造，适合作为保守候选。
- **4 分**：较适合，主要风险可控。
- **5 分**：高度适合，和 Coincides 长期目标自然贴合。

维度：

1. **人工笔记体验成熟度**
   - 空白笔记、输入、block、图片、公式、表格、选择、拖动、样式、导出是否足够成熟。

2. **Canvas / Page 混合能力**
   - 是否能支持 formal page area、outside-page workspace、multi-page grid、seamless page stack、page-break guide。

3. **Freeform Block-Box 适配度**
   - 是否能支持 NoteBlock 像文本框一样 resize、move、并排排版，同时保留普通文档输入体验。

4. **Source-grounded NoteBlock 适配度**
   - 是否能保留 SourceRegion、SourceAnchor、SourceScope、Evidence、provenance，而不被 editor 模型吞掉。

5. **ObjectRelation / Graph-shaped Data 适配度**
   - 是否能把视觉边、语义边、局部知识图谱、AI-readable subgraph 分开表达。

6. **AI Note Assembly 适配度**
   - 是否能支撑 source reconstruction、role segmentation、template selection、proposal-first note generation。

7. **外部 Agent / API 适配度**
   - 是否能让外部 agent 通过官方接口触发 proposal、读取结构、导出结果，而不是乱改内部数据。

8. **工程复杂度**
   - 初始接入难度、长期维护成本、调试成本、团队/个人可控性。

9. **许可与商业/自用风险**
   - license 是否允许 fork/copy/depend；
   - 是否存在商用限制、闭源模块、服务端限制或不清晰边界。

10. **长期演化能力**
   - 是否支持未来 GraphDB、package、template studio、style studio、source reconstruction、AI workflow 的演化。

11. **迁移成本**
   - 当前 v2.x 成果迁移过去的成本；
   - 未来从 MVP 到成熟产品的重构代价。

12. **失败回退能力**
   - 如果路线失败，是否能保留阶段成果；
   - 是否能把结果转成经验、schema、adapter 或 research report。

## 阶段依赖规则

每个阶段完成后，都要回到 Outline 对应 R 小节下补充：

- 本阶段已完成报告文件；
- 后续哪些阶段需要引用本阶段；
- 是否发现某个前序阶段需要反补；
- 是否改变后续阶段顺序或重点。

默认依赖关系：

- R0 被 R1-R14 全部引用。
- R1 是 R2、R3、R11、R12、R13、R14 的基础。
- R2 是 R4-R6、R13、R14 的产品目标基础。
- R3 是 R11、R12、R13、R14 的对象模型基础。
- R4-R6 是 R7-R11 的体验需求基础。
- R7-R10 是 R11、R13、R14 的 AFFiNE / BlockSuite 判断基础。
- R11 是 R13、R14 的数据桥接基础。
- R12 是 R13、R14 的 graph model 基础。
- R13 是 R14 的直接输入。

## 反补机制

每完成一个阶段后，必须检查：

1. 新发现是否推翻了前序报告的结论；
2. 新发现是否让前序报告需要补充一个“追加观察”小节；
3. 新发现是否改变了前序报告对 roadmap 的影响判断；
4. 新发现是否暴露了某个前序报告漏掉的证据源；
5. 是否需要在 Outline 中更新后续阶段的局部调查清单。

反补不要求重写整份报告。推荐方式是在前序报告底部追加：

```md
## Follow-up Addendum From Rn

- 新增发现：
- 对原结论的影响：
- 是否改变 roadmap 判断：
```

## 阶段性总结触发规则

不是每个阶段都必须立刻写总结，但以下节点建议写阶段性总结：

- R1-R2 后：当前能力与产品目标总结。
- R3-R6 后：核心对象模型与人工笔记体验总结。
- R7-R11 后：AFFiNE / BlockSuite 产品、代码和桥接总结。
- R12-R13 后：graph model 与架构路线总结。
- R14 后：最终决策文档。

阶段性总结需要回答：

- 这一组报告解决了哪些问题；
- 哪些路线变得更强；
- 哪些路线暴露了不可接受的风险；
- 哪些问题必须进入下一组报告；
- 是否需要调整 roadmap 或 research outline。

## 最终决策报告要求

`R14-product-reset-affine-adoption-decision-report.md` 和最终汇总文档 `Coincides-product-reset-and-editor-foundation-decision.md` 必须至少包括：

- 每条候选路线的评分表；
- 评分背后的证据引用；
- 推荐路线；
- 不推荐路线及原因；
- 保留当前 v2.x 哪些成果；
- 冻结或放弃哪些成果；
- 下一阶段 roadmap 重写建议；
- 是否需要新 repo；
- 是否需要 AFFiNE / BlockSuite fork / dependency / reference；
- 2.x / 3.x 分界是否仍然成立；
- 未来 PI-048 source reconstruction 调研如何接入。

## R0 结论

PI-046 不能只写成一组散乱的研究笔记。它必须形成一个可追踪的决策链：

```text
当前能力盘点
  -> 产品目标重置
  -> 核心对象模型
  -> 人工笔记体验需求
  -> AFFiNE / BlockSuite 产品与代码调研
  -> 数据桥接与 graph model 判断
  -> 架构路线评分
  -> roadmap 重写建议
```

R0 建立的格式、证据等级、评分维度和反补机制，会贯穿 R1-R14。后续任何报告如果没有明确证据等级、风险、roadmap 影响和依赖关系，都不算完成。
