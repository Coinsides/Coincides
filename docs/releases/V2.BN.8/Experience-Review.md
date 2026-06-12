# V2.BN.8 Experience Review

## 负责什么

本文负责 V2.BN.8 / V2.BN.8.x 的体验验收。

核心问题：

```text
新 Canvas Engine 的体验是否至少接近 V2.BN.1-V2.BN.5 已经磨出的稳定效果？
如果没有，差在哪里？
如果超过了，超过在哪里？
```

## 不负责什么

- 不替代工程 review；
- 不记录完整 benchmark 数据；
- 不定义底层 architecture；
- 不做 Henry acceptance 代签。

## 体验基准

必须对比旧 runtime 的这些成功经验：

- natural writing；
- block resize / text reflow；
- slash command；
- block control bar；
- preview/debug overlay；
- structured field editing；
- PageFrame / workspace boundary；
- type/AI/export badge on demand。

本轮调研后的体验路线：

```text
第一版先恢复旧 runtime 已经证明有效的自然写作手感；
再用 NoteCanvas runtime 解决旧实现反复出现的坐标、overlay、measurement、workspace 边界问题；
不为了无限画布感牺牲普通写作体验。
```

## Review 表

| 场景 | 当前体验 | 与旧 runtime 对比 | 风险 | 下一步 |
| --- | --- | --- | --- | --- |
| NoteCanvas 打开 | Pending | Pending | Pending | V2.BN.8 implementation 后填写 |
| PageFrame 写作 | Existing runtime preserved | 与旧 runtime 一致 | 新 engine seed 尚未接管 interaction | V2.BN.8.1 继续拆 engine shell |
| workspace 创建 block | Existing runtime preserved | 与旧 runtime 一致 | 仍是旧 NoteDetail 模拟 workspace | V2.BN.8.1 迁移到 engine runtime |
| resize/reflow | Existing runtime preserved | 与旧 runtime 一致 | 旧 runtime 的 measurement 仍在 NoteDetail 内 | 后续抽到 measurement service |
| slash menu | Existing runtime preserved | 与旧 runtime 一致 | caret anchor 仍未进入 engine overlay contract | 后续 overlay portal 化 |
| formula/definition | Existing runtime preserved | 与旧 runtime 一致 | structured field 的展开仍靠现有 measurement | 后续统一 content measurement |
| preview/debug overlay | Existing runtime preserved | 与旧 runtime 一致 | overlay 还没有和 engine z-index service 合并 | 后续统一 overlay layer |
| pan/zoom | Pending | New capability | Pending | V2.BN.8 implementation 后填写 |

## 本次体验结论

本次第一版 engine seed 是“地基接入”，不是视觉重写。用户能看到的写作体验基本保持现状，变化主要在内部：页面开始拥有明确的 NoteCanvas runtime model、PageFrame model、block placement 世界坐标和可见窗口计算入口。

这符合 V2.BN.8 的保守策略：先不要牺牲已经磨出来的普通写作体验，再逐步把坐标、overlay、measurement、workspace 边界从 `NoteDetail` 中拆出去。

## V2.BN.8.1 Experience Baseline

```text
L0 baseline: completed
L1 clean local smoke data: completed
active smoke note: V2.BN.8.1 Smoke Note
```

体验基线更新：

- 当前 smoke Note 是干净 note，不继承旧 `better_notebook_layout` payload；
- 下一轮体验测试应从空 note 创建 text / definition / formula / code blocks；
- 如果新 runtime 的表现低于 V2.BN.5 旧 runtime，需要记录为 regression，而不是把旧数据问题当作原因；
- Henry 手动确认之前，V2.BN.8.1 体验验收不能标记 passed。

## V2.BN.8.1 L3-L5 Experience Risk Note

```text
L3/L4 service extraction: implemented, not browser-smoked
L5 placement service extraction: implemented, not browser-smoked
L7 measurement seed extraction: implemented, not browser-smoked
L6 block projection layer: implemented, not browser-smoked
L9 slash menu layer seed: implemented, not browser-smoked
```

体验风险：

- PageFrame height 现在不再被 Canvas workspace 高度撑开，理论上应减少 Canvas mode 巨大空白；
- workspace block 不应继续影响 formal PageFrame height，但还需要浏览器里创建 workspace block 验证；
- placement 读写、snap、reflow 已迁入 service，理论上行为应保持不变；
- textarea resize、DOM measured height、text estimated height 已进入 measurement service seed；
- 如果后续出现 block 位置、snap、reload 后布局变化，应优先检查 `placementService.ts`。
- 如果后续出现 Definition / Formula 展开穿模，应优先检查 `measurementService.ts` 和后续 measurement registry。
- 如果后续出现 Definition / Formula 内容保存、plain text、preview 文本不一致，应优先检查 `blockContentService.ts` 和 `layers/BlockEditorLayer.tsx`。
- 如果后续出现 block toolbar、source badge、resize handle、structured field editing 视觉或操作异常，应优先检查 `layers/BlockEditorLayer.tsx`。
- 如果后续出现 slash menu 样式或点击回调异常，应优先检查 `layers/SlashMenuLayer.tsx`。
- slash menu anchor 仍由 runtime 主文件计算，本轮没有声明其体验问题已修复。

## 同步规则

- 每次视觉/交互 patch 后更新本文。
- Browser smoke 后更新本文。
- 如果体验低于旧 runtime，必须同步 `Review.md` 和 `Canvas-Engine-Fallback-Strategy.md`。
- 如果体验规则稳定，收口时考虑 promotion 到 UX Inventory 或 interaction contract。
