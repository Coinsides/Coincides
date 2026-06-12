# Canvas Engine Fallback Strategy

## 负责什么

本文负责 V2.BN.8 自研 Canvas Engine 的失败阈值、退路和路线复盘条件。

## 不负责什么

- 不宣布放弃 self-owned Canvas Engine；
- 不替代 route decision draft；
- 不替代 `Review.md`；
- 不定义完整 BlockSuite / AFFiNE integration。

## 必读参考

- `docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R9-route-decision-report.md`
- `docs/internal/V2.BN.7-Branch-Closure-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Route-Decision-Draft.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`

## 默认路线

```text
Self-owned Minimal Hybrid NoteCanvas Engine on clean branch
  DOM NoteBlock content layer
  SVG/DOM overlay layer
  CSS transform viewport
  CanvasObject / RelationEndpoint placeholders
```

当前 branch 保留为：

```text
experiment / fallback / reference
```

## Fallback Trigger

出现以下情况必须进入 fallback review：

- 500 blocks 以下就明显卡顿；
- 1000 blocks benchmark 长期不可接受；
- pan/zoom 下 text editing 无法稳定；
- measurement service 无法避免 overlap；
- overlay/portal 架构反复失败；
- selection/hit-testing 在 transform 下长期不可靠；
- PageFrame / workspace 边界反复污染；
- V2.BN.8.x 多轮打磨后体验仍明显低于旧 runtime；
- relation endpoint reserve 需要推翻 placement model。

## Fallback 路线

| 路线 | 使用条件 | 代价 |
| --- | --- | --- |
| 当前 branch 有限大画布 | self-owned infinite canvas 过重，但旧体验可接受。 | 降低 open canvas ambition。 |
| PageFrame-first | pan/zoom 或 workspace 不稳定，但 page writing 稳。 | 延后 edgeless。 |
| BlockSuite Edgeless 重新评估 | 自研 engine 的核心能力证明不可控。 | adapter/sidecar 成本上升。 |
| tldraw / Excalidraw 局部嵌入 | future drawing / sketch 层自研成本过高。 | 只能作为 CanvasObject 子系统，不接管 NoteBlock truth。 |
| React Flow 局部借鉴 | relation endpoint / edge routing 自研成本过高。 | 只能借鉴 handle/edge，不接管 notebook runtime。 |
| Konva / Fabric / Pixi 局部渲染层 | 大量 CanvasObject / thumbnail / LOD 需要更强渲染层。 | 只能作为渲染层，不接管内容编辑。 |

## 不允许的 fallback

- 不允许把 Coincides truth 交给外部 runtime；
- 不允许为了短期效果混淆 CanvasEdge 与 ObjectRelation；
- 不允许让 GraphRAG adapter 反向定义 source/relation truth；
- 不允许无记录地悄悄降低用户体验目标。

## 同步规则

- fallback trigger 触发后，必须更新 `Review.md`。
- 体验降级必须更新 `Experience-Review.md`。
- 路线改变必须更新 `Plan.md` 和 roadmap。
- 若外部 substrate 重新进入主线，必须补 ADR。
