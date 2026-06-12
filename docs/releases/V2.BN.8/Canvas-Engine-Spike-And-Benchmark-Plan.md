# Canvas Engine Spike And Benchmark Plan

## 负责什么

本文负责 V2.BN.8 的技术 spike 和 benchmark 计划。

它回答：

- 哪些高风险问题必须先验证；
- 哪些性能场景必须有 fixture；
- browser smoke 怎么记录；
- 什么时候进入 V2.BN.8.x 打磨；
- 什么时候触发 fallback review。

## 不负责什么

- 不替代 `Review.md`；
- 不替代 `Experience-Review.md`；
- 不直接决定 architecture route；
- 不写完整自动化测试实现。

## 必读参考

- `docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R4-performance-and-virtualization-strategy.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/brainstorm/BetterNoteBook Research/R9-performance-scale-and-rebuild-benchmark.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`

## 必须 Spike

| Spike | 验证目标 | 失败信号 |
| --- | --- | --- |
| Transform Text Editing | pan/zoom 下 caret、输入法、selection、paste 是否稳定。 | caret 漂移、中文输入异常、paste 重复。 |
| Measurement Service | resize/reflow/formula input 展开是否不 overlap。 | 高度错、文字溢出、block 闪烁。 |
| Overlay Portal | slash menu、toolbar、preview 在 transformed canvas 下是否稳定。 | popover 错位、z-index 混乱、遮挡内容。 |
| Visible Window | viewport 外对象是否可以降级/跳过重交互，同时 selected/editing 对象强制渲染。 | viewport 外对象污染交互，或 selected block 被卸载。 |
| 50/200/1000 Blocks | 大量 block 加载、pan、resize、selection 是否可接受。 | 200 blocks 以下明显卡顿，或 1000 blocks 无明确优化路径。 |
| Relation Endpoint Reserve | connector endpoint/port 预留是否能和 placement 对齐。 | path layer 与 block layer 坐标不一致。 |

## Benchmark Fixtures

最低 fixture：

```text
50 text blocks
200 text blocks
100 text blocks
500 text blocks
1000 text blocks
100 formula blocks
mixed definition / formula / code blocks
workspace outside PageFrame blocks
selected/editing block forced-render case
viewport pan/zoom plus slash menu anchor case
```

后续 fixture：

```text
media placeholder blocks
multi-frame seed
relation endpoint heavy seed
zoomed-out frame preview seed
thumbnail / LOD seed
```

## Browser Smoke 记录格式

每次 browser smoke 记录：

```text
Date:
Version:
Branch:
Scenario:
Steps:
Expected:
Observed:
Pass/Fail:
Screenshot/Notes:
Follow-up:
```

## Benchmark 记录格式

```text
Date:
Machine:
Browser:
Dataset:
Block count:
Formula/media/relation count:
Initial load:
Pan/zoom:
Selection:
Resize/reflow:
Overlay:
Notes:
Decision:
```

## 同步规则

- 每次 benchmark 结果写入 `Review.md`。
- 影响体验的结果写入 `Experience-Review.md`。
- 失败触发 fallback 时写入 `Canvas-Engine-Fallback-Strategy.md`。
- 新 fixture 稳定后，收口时 promotion 到全局测试/benchmark 规则。
