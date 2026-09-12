# 根层测试逐字保留账

> 状态：complete；日期：2026-09-13；执行者：Codex server_fixtures 子代理。
> 基线：`.tmp/purge-resume-baseline.json`；范围：本次续工前快照与当前三个测试文件。仅核查和写证据，未修改或运行测试。

结论：当前 41 个展开用例（23 + 3 + 15）保留；当前 219 处 `expect(...).matcher(...)` 调用全部能在基线同一用例或同一 helper 中逐字匹配，未新增或改写活断言。共退休 10 处：8 处 Canvas UI 死语义、2 处 NWSL 已删回调断言。`it.each` 按数组行展开计数；断言按 AST 调用出现次数计数，包含 helper、循环体、重复表达式，非运行时断言次数。

| 文件 | 展开用例（前→后） | expect 调用（前→后） | 当前逐字保留 |
| --- | ---: | ---: | ---: |
| `pageCenteringContract.test.ts` | 3 → 3 | 10 → 9 | 9 |
| `layers/pageFrameAlignment.test.tsx` | 25 → 23 | 136 → 131 | 131 |
| `layers/NoteRuntimeDocumentLayer.test.tsx` | 15 → 15 | 83 → 79 | 79 |

## 用例及参数行退休、改名

1. `pageCenteringContract.test.ts` 原 45 行 `keeps canvas at zero presentation offset` 改名为 `keeps the writing surface presentation offset contract`，保留原 46 行 `.writingSurface` 的活偏移断言，仅删原 47 行 Canvas 专属样式期待。其余两用例测试体逐字不动。
2. `pageFrameAlignment.test.tsx` 原 573 行参数用例 `F16: header/footer/page-number use the %s coordinate frame without moving stored slot geometry` 的参数数组由 `['page', 'canvas']` 变为 `['page']`，只退休展开的 Canvas 参数行及其分支 2 断言；Page 分支断言逐字保留。
3. 同文件原 610 行整个用例 `preserves canvas world frame geometry while the page-only repair leaves its separate mismatch explicit` 退休。它调用 `alignment(80, 'canvas')` 挂载退役 Canvas DOM，并期待 ruler/frame-boundary 的 +56 px 旧错位，属于 Canvas UI 呈现锁，并非纯模型历史坐标读测试。
4. 同文件原 618 行 `preserves a collection whose frame content origin already matches page offset` 保留，删 Canvas 调用分支，原 619 行 Page 断言逐字保留。另 16 个用例声明的测试体逐字不动。
5. `NoteRuntimeDocumentLayer.test.tsx` 原 216 行 `renders the effective page typography without a frame extension and preserves the canvas fallback` 改名为 `renders the effective page typography without a frame extension`；原 240–242 行 Page 字号/行高 3 断言逐字保留。两个 D2 用例只清理已退役 `onMovePageFrame` fixture/断言；另 10 个用例声明的测试体逐字不动。

## 全部退休断言（行号均为快照原行）

| 文件 / 原行 | 原断言源文 | 分类 |
| --- | --- | --- |
| pageCentering / 47 | `expect(cssRuleBody('.writingSurfaceCanvas')).toMatch(/left:\s*0\b/)` | Canvas 专属 CSS rule 退休 |
| pageFrameAlignment / 596 | `expect(Number.parseFloat(slot.style.left)).toBe(pageFrame.x + pageFrame.contentInset.left)` | F16 Canvas slot DOM 分支退休 |
| pageFrameAlignment / 597 | `expect(Number.parseFloat(slot.style.top)).toBe(pageFrame.y + topInFrame)` | F16 Canvas slot DOM 分支退休 |
| pageFrameAlignment / 614 | `expect(sample.rulerOffset).toBe(56)` | 完整 Canvas DOM 错位用例退休 |
| pageFrameAlignment / 615 | `expect(sample.boundaryOffset).toBe(56)` | 完整 Canvas DOM 错位用例退休 |
| pageFrameAlignment / 621 | `expect(alignment(canvasOffset - 72, 'canvas').rulerOffset).toBe(0)` | 混合用例的 Canvas DOM 分支退休 |
| NoteRuntimeDocumentLayer / 246 | `expect(surface().dataset.documentFontSize).toBe(String(canvasDefault.fontSizePx))` | Canvas 字体 fallback 分支退休 |
| NoteRuntimeDocumentLayer / 247 | ``expect(surface().style.getPropertyValue('--document-font-size')).toBe(`${canvasDefault.fontSizePx}px`)`` | Canvas 字体 fallback 分支退休 |
| NoteRuntimeDocumentLayer / 495 | `expect(props.onMovePageFrame).not.toHaveBeenCalled()` | D2 title/description 用例引用已删除 NWSL 回调 |
| NoteRuntimeDocumentLayer / 517 | `expect(props.onMovePageFrame).not.toHaveBeenCalled()` | D2 negative-local-y 用例引用已删除 NWSL 回调 |

最后两条所属用例分别为 `D2 title and description edits move only the outer paper origin within the bounded display band`、`D2 keeps a negative local-y block after the header without rewriting its stored position`。其他几何、持久化写入不发生、历史位置不改等活断言均原文保留。

## 活坐标分支及回调夹具边界

`pageFrameAlignment.test.tsx` 原 281 行、现 274 行的 `round-trips canvas zoom/pan and nonzero frame origin to the actual release point on paper` **整个测试体逐字保留**，其 7 处断言原文保留。它继续通过历史 viewport/非零 frame origin 检验文字单元落到 Page 的真实坐标；未以退役 Canvas DOM 为由抹去该活用例。生产 `handleExtractTextUnit` 原 3437 与 3442 两条路径的逐字保留证据另见 [独立交叉检查](batch3-independent-check.md)。

两个 TSX 文件各清理 19 个已退出 NWSL props 接口的 fixture 回调字段，原字段名及原行完整列在 JSON 的 `removedCallbackFixtureProperties`。DocumentLayer 的 `writers` helper 原 424–425 行另去掉 `onMovePageFrame`、`onResizePageFrame`、`onSelectPageFrame`、`onSetPrimaryPageFrame` 四项，其余活写回调仍在；所有 `writers(props).forEach((callback) => expect(callback).not.toHaveBeenCalled())` 断言逐字保留。这是写入面已退役接口的清理，不表示 Chrome 中仍在用的 Page 集合操作全局退休。

此账以最终三文件与基线逐次调用配对为准，纠正早期 `batch3-reserve.md` 的 DocumentLayer 82 → 80 汇总口径：最终为 **83 → 79，4 处退休（2 个 Canvas 字体 + 2 个死回调）**。早期原始 JSON/日志保留。

机器证据：[root-layer-test-preservation.json](root-layer-test-preservation.json)，包括每个保留断言原行/现行/源文、全部用例名和 `it.each` 参数行、退休断言分类、两侧 SHA-256。复现：`node .tmp/purge-root-layer-test-preservation.cjs`。
