# V2.BN.8 Debug Workflow

> 本文是 V2.BN.8 / V2.BN.8.x 的局部 debug / intensive workflow。它参考 `docs/workflow/Coincides-Workflow.md`，但不替代全局 workflow。全局 workflow 仍然是 Coincides 的总流程；本文只负责 Canvas Engine Foundation 这个高风险重建阶段。

## 1. Workflow 定位

V2.BN.8 是一次 runtime 地基重建，不是普通 patch。它会拆分成多个 `V2.BN.8.x` 小版本反复打磨，因此需要比普通 release 更密集的同步规则。

本 workflow 的目标：

```text
让每个小版本都先读正确 reference
让局部 spec / contract / review 不漂移
让外部 PRODUCT / PRD / Architecture / Data Model / Roadmap 在正确时机同步
让 patch 不无限堆成技术债
让 benchmark 和 browser smoke 变成固定节奏
让 V2.BN.8 收口时能清楚 promotion 哪些文档
```

## 2. 与全局 Workflow 的关系

必须遵守全局 workflow 的这些原则：

- 版本计划先于实现；
- engineering spec 锁工程细节；
- review / experience review / changelog 必须跟随；
- Henry 拥有最终体验验收；
- 不要让 implementation 跑赢 written contract；
- 如果 scope 变化，先更新 plan 和相关 contract。

V2.BN.8 的额外规则：

- 每个 `V2.BN.8.x` 小版本都必须先读本文件夹；
- 每个交互 patch 都要判断是否触发 Architecture / Interaction / State contract 更新；
- 每个性能相关 patch 都要更新 benchmark plan 或 review；
- 每个影响写作手感的 patch 都要更新 experience review；
- 如果同类 bug 反复出现三次，停止继续补丁，转为 architecture/spec 更新。

## 3. 每个 V2.BN.8.x 开工前必须读取

### 固定读取

- `docs/releases/V2.BN.8/README.md`
- `docs/releases/V2.BN.8/Plan.md`
- `docs/releases/V2.BN.8/Workflow.md`
- `docs/releases/V2.BN.8/Engineering-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R9-route-decision-report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Interaction-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-State-And-Data-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Spike-And-Benchmark-Plan.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Fallback-Strategy.md`
- `docs/releases/V2.BN.8/Review.md`
- `docs/releases/V2.BN.8/Experience-Review.md`
- `docs/releases/V2.BN.8/CHANGELOG.md`

### 上游读取

- `docs/workflow/Coincides-Workflow.md`
- `docs/Coincides-Better-Notebook-Roadmap.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Requirement-Draft.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Route-Decision-Draft.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/Editor-State-Rebuild-Contract.md`

### 条件读取

- 触碰 source badge / source anchor 时，读 `docs/contracts/Source-Provenance-Contract.md`。
- 触碰 link / source / relation 边界时，读 `docs/contracts/Link-Source-Relation-Boundary-Contract.md`。
- 触碰 template variant / category 时，读 `docs/contracts/Template-Category-Contract.md`。
- 触碰 AFFiNE / BlockSuite 参考时，读 PI-046 R10 / R11 和 Better Notebook R7 / R9。

## 4. 局部文档实时同步规则

### Plan.md

更新时机：

- phase priority 变化；
- V2.BN.8.x 小版本新增；
- scope/out-of-scope 改变；
- acceptance criteria 改变；
- document promotion 规则改变。

不能记录：

- 低层实现细节；
- 临时 bug 复现日志；
- 未经确认的脑洞。

### Engineering-Spec.md

更新时机：

- 新增/移动 Canvas Engine 模块；
- 新增 route/API/schema；
- 改变测试命令；
- 改变 clean reset / migration 策略；
- 改变 browser smoke 或 benchmark requirement。

必须同步：

- 如果实现改变 architecture，更新 Architecture Spec；
- 如果实现改变交互，更新 Interaction Contract；
- 如果实现改变 state/data truth，更新 State/Data Contract。

### Canvas-Engine-Architecture-Spec.md

更新时机：

- 坐标系、viewport、layer、measurement、selection、frame model、rendering strategy 变化；
- DOM/SVG/canvas/WebGL/hybrid/existing engine 路线被拍板；
- relation endpoint reserve 变化；
- performance architecture 变化。

当前 V2.BN.8 route lock：

```text
Self-owned Minimal Hybrid NoteCanvas Engine
  DOM NoteBlock content layer
  SVG/DOM overlay layer
  CSS transform viewport
  explicit world/screen coordinate conversion
  CanvasObject / RelationEndpoint placeholders
```

如果后续想把 tldraw / BlockSuite / React Flow / Konva / Fabric.js / PixiJS 改成主 runtime，必须先更新 `Canvas-Engine-Research/R9-route-decision-report.md` 和 `Summary-Report.md`，再更新本 Architecture Spec。

停止补丁规则：

```text
如果同一类坐标、selection、overlay、measurement、z-index 问题连续出现三次，
不要继续 patch。
必须先更新 Architecture Spec，重新定义 engine 机制。
```

### Canvas-Engine-Interaction-Contract.md

更新时机：

- 用户点击/双击/拖动/resize 行为变化；
- slash command 行为变化；
- toolbar/preview/context menu 行为变化；
- page/workspace visibility 行为变化；
- keyboard shortcut 行为变化；
- snap/elastic avoidance 行为变化。

同步对象：

- Experience Review；
- UX Inventory；
- Engineering Spec。

### Canvas-Engine-State-And-Data-Contract.md

更新时机：

- content truth / placement truth / runtime state 边界变化；
- viewport state、selection state、undo/redo boundary 变化；
- clean layout reset 策略变化；
- future migration stance 变化。

同步对象：

- `docs/DATA_MODEL.md`；
- `docs/ARCHITECTURE.md`；
- Editor State Rebuild Contract；
- Engineering Spec。

### Canvas-Engine-Spike-And-Benchmark-Plan.md

更新时机：

- 新增 benchmark fixture；
- 发现性能瓶颈；
- browser smoke 失败；
- 100/500/1000 blocks 结果变化；
- formula-heavy / media-heavy / relation-heavy 风险变化。

如果 benchmark 证明 self-owned route 无法支撑基础写作体验或可见性能，先更新 `Canvas-Engine-Fallback-Strategy.md` 和 route decision，不要直接在实现里替换底层路线。

同步对象：

- Review；
- Experience Review；
- Plan 的 V2.BN.8.x 打磨项。

### Canvas-Engine-Fallback-Strategy.md

更新时机：

- self-owned engine 出现高风险；
- benchmark 低于接受线；
- pan/zoom text editing 无法稳定；
- overlay/selection/measurement architecture 反复失败；
- 需要重新评估 BlockSuite / AFFiNE route。

同步对象：

- Roadmap；
- Review；
- Route decision draft。

## 5. 外部大文档同步规则

### 必须立即同步

以下情况不能只改局部文档：

- 改变 Coincides truth ownership；
- 改变 NoteBlock / placement / SourceReference / ObjectRelation / TemplateDefinition 的边界；
- 改变 V2.BN.8 / V2.BN.8.x / V2.BN.9 顺序；
- 改变 product purpose 或用户心智；
- 改变全局 workflow；
- 改变 roadmap gate。

对应同步：

```text
PRODUCT.md
docs/PRD.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/Coincides-Better-Notebook-Roadmap.md
docs/workflow/Coincides-Workflow.md
docs/internal/Better-Notebook-Phase-Plan-Template.md
```

### 可以收口时同步

以下情况可以先在 V2.BN.8 文件夹内稳定，再在收口时 promotion：

- Canvas Engine internal module naming；
- benchmark matrix；
- overlay z-index policy；
- interaction edge cases；
- frame thumbnail future；
- relation endpoint reserve details；
- clean branch debug steps。

## 6. Patch / Polish / Bugfix 流程

每个小 patch 必须走：

```text
复现问题
  -> 判断属于 architecture / interaction / state / benchmark / fallback 哪类
  -> 更新对应局部文档或确认无需更新
  -> 修改代码
  -> targeted test
  -> browser smoke if visual/interaction
  -> update Review / Experience Review
  -> update CHANGELOG
```

如果 patch 属于视觉/交互：

- 必须更新 `Experience-Review.md`；
- 必须做 browser smoke，除非 Henry 明确只要文档或只要代码；
- 如果用截图判断，记录截图观察点。

如果 patch 属于性能：

- 必须更新 benchmark plan 或 review；
- 记录 fixtures；
- 记录机器/浏览器条件；
- 不要只写“感觉不卡”。

如果 patch 属于数据/状态：

- 必须检查 State/Data Contract；
- 必须检查是否影响 DATA_MODEL / ARCHITECTURE。

## 7. Plan / Spec / Review / Changelog 更新时间

### Plan.md

更新于：

- 小版本拆分；
- scope 改变；
- acceptance 改变；
- promotion 规则改变。

### Engineering-Spec.md

更新于：

- 工程模块变化；
- test matrix 变化；
- build/smoke command 变化；
- implementation boundary 变化。

### Review.md

更新于：

- 每个 V2.BN.8.x 小版本收口；
- benchmark 结果出现；
- architecture risk 出现；
- Henry 待拍板事项变化。

### Experience-Review.md

更新于：

- 每个视觉/交互 patch；
- browser smoke 后；
- Henry 体验反馈后；
- 旧 runtime 对比结论变化后。

### CHANGELOG.md

更新于：

- 每次 patch/polish/bugfix；
- 每个小版本收口；
- 文档 promotion / merge review 后。

## 8. Browser Smoke 规则

需要 browser smoke 的情况：

- 影响 NoteCanvas 显示；
- 影响 pan/zoom；
- 影响 block create / selection / drag / resize；
- 影响 slash menu；
- 影响 overlay / toolbar / preview；
- 影响 PageFrame / workspace 可见性；
- 影响 formula / definition 编辑；
- 影响大量 blocks 的渲染。

不需要 browser smoke 的情况：

- 纯文档；
- 纯类型注释；
- 未触碰 runtime 的 server-only schema 草案。

Browser smoke 必须至少记录：

```text
目标页面
操作路径
观察结果
是否通过
未通过的截图/描述
下一步
```

## 9. Benchmark 规则

需要 benchmark 的情况：

- 引入或重写 coordinate/viewport；
- 引入 virtualization；
- 改动 measurement；
- 改动 overlay layer；
- 改动 relation endpoint/path reserve；
- 改动 formula/media rendering；
- 进入 V2.BN.8.3 或 scale polish。

最低 fixtures：

```text
100 text blocks
500 text blocks
1000 text blocks
100 formula blocks
mixed definition / formula / code blocks
workspace outside PageFrame blocks
```

Benchmark 结果必须写入：

- `Canvas-Engine-Spike-And-Benchmark-Plan.md`
- `Review.md`
- 必要时 `Experience-Review.md`

## 10. 停止打补丁规则

出现以下情况，必须停止继续 patch，转成 architecture/spec 更新：

- 同类 overlay / z-index bug 出现三次；
- 同类 measurement / overlap bug 出现三次；
- pan/zoom 下 selection 或 caret 长期漂移；
- page/workspace object 反复污染边界；
- 同一 interaction 在 patch 后反复引入新 bug；
- benchmark 显示 500 blocks 以下就不可接受；
- Henry 体验反馈认为新 Canvas 不如旧 runtime，但 patch 找不到稳定方向。

停止后流程：

```text
记录 bug family
  -> 更新 Architecture Spec / Interaction Contract / State Contract
  -> 更新 Fallback Strategy
  -> 重新拆 V2.BN.8.x 小版本
  -> 再继续实现
```

## 11. Document Promotion / Merge Review

V2.BN.8 收口时必须执行 document promotion / merge review。

步骤：

1. 列出本文件夹所有文档；
2. 判断每份文档的内容属于：
   - global contract；
   - architecture；
   - product / PRD；
   - roadmap；
   - workflow；
   - release evidence；
   - deprecated local note；
3. 把稳定规则 promotion 到全局；
4. 把临时探索保留在 release evidence；
5. 把过时规则标注 superseded；
6. 更新 README；
7. 更新 CHANGELOG；
8. 更新 Review 和 Experience Review；
9. Henry 做最终 acceptance。

推荐 promotion 目标：

```text
Canvas architecture -> docs/ARCHITECTURE.md or docs/contracts/
Canvas state/data -> docs/DATA_MODEL.md or docs/contracts/
Canvas interaction -> UX Inventory or docs/contracts/
Workflow rules -> docs/workflow/Coincides-Workflow.md or phase template
Roadmap changes -> docs/Coincides-Better-Notebook-Roadmap.md
Product meaning -> PRODUCT.md / docs/PRD.md
Canvas Engine Research final copy -> docs/brainstorm/产品完善/Canvas Engine Research/
```

## 12. V2.BN.8.x 小版本收口清单

每个小版本收口前必须确认：

- [ ] Plan 是否需要更新；
- [ ] Engineering Spec 是否需要更新；
- [ ] Architecture Spec 是否需要更新；
- [ ] Interaction Contract 是否需要更新；
- [ ] State/Data Contract 是否需要更新；
- [ ] Benchmark Plan 是否需要更新；
- [ ] Fallback Strategy 是否需要更新；
- [ ] Review 是否记录工程结果；
- [ ] Experience Review 是否记录体验结果；
- [ ] CHANGELOG 是否记录变更；
- [ ] 是否需要 browser smoke；
- [ ] 是否需要 benchmark；
- [ ] 是否触发 document promotion；
- [ ] 是否有 Henry 必须拍板的问题。
