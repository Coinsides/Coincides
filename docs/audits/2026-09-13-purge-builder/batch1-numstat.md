> **状态 (Status)**: active（批一源码计数；非 Git 整仓差异）

范围：首次编辑前保存于 `.tmp/purge-baseline` 的源码原文与当前文件；按逐行 LCS 计算，CRLF/LF 归一。未调用 Git。不含审计日志、scratch 工具或构建产物。

| 文件 | + | - |
|---|---:|---:|
| `client/src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.ts` | 1 | 2 |
| `client/src/pages/Notes/canvasEngine/hooks/useCanvasContentWidth.ts` | 2 | 7 |
| `client/src/pages/Notes/canvasEngine/hooks/usePageReadingPresentation.test.tsx` | 1 | 14 |
| `client/src/pages/Notes/canvasEngine/hooks/useRuntimeLayoutModelController.ts` | 0 | 2 |
| `client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx` | 0 | 13 |
| `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx` | 1 | 1 |
| `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx` | 1 | 2 |
| `client/src/pages/Notes/canvasEngine/meaningfulRenderableContent.test.ts` | 2 | 54 |
| `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx` | 1 | 14 |
| `client/src/pages/Notes/canvasEngine/pageFrameTypographyService.test.ts` | 2 | 5 |
| `client/src/pages/Notes/canvasEngine/pageFrameTypographyService.ts` | 1 | 2 |
| `client/src/pages/Notes/canvasEngine/writingEntryVisibility.ts` | 1 | 40 |
| `client/src/pages/Notes/NoteDetail.module.css` | 0 | 52 |
| `client/src/styles/global.css` | 0 | 9 |
| **合计 14 文件** | **13** | **217** |
