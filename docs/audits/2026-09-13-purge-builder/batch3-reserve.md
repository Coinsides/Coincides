> **状态 (Status)**: complete（本收据涵盖图纸一22，以及同 model 门内并行删枝的死语义拆分）
> **日期 (Updated)**: 2026-09-12（America/Toronto；目录沿工单指定日期）
> **上游**: [清除工单与补遗](../../agent-ops/handoffs/2026-09-13-v13-6-deadcode-purge-order.md)

# 批三 reserve 与投影生成器收据

生产 reserve 全族已删；shape/image/table 新投影的无帧兜底收敛到 formal_page。model 编译与运行均 exit 0、**60/60 组 PASS**；DocumentLayer **15/15 PASS**。相关日志：[model 红](batch3-reserve-model-red.log)、[model 绿](batch3-reserve-model-green.log)、[DocumentLayer 红](batch3-reserve-document-layer-red.log)、[DocumentLayer 绿](batch3-reserve-document-layer-green.log)。

## 生产交付

- `engineModel.ts`：删除 CanvasObjectReserve import、两个 reserve 工厂、入参/type、map/spread 与返回字段；generic 历史对象/placement、所有 block/page/mount/AI 路径原地保留。
- `types.ts`：删除 CanvasObjectReserve interface 和 NoteCanvasRuntimeModel 对应字段；RelationEndpointReserve、surface/mode 等历史类型不动。
- `useNoteCanvasLayoutModel.ts`：删唯一生产空数组输入。
- `viewportService.ts`：与 controllers 协调后仅补删 reserve import 和 options 字段；三条 canvas 分支由 controllers 先行删除，纯几何工具保留。
- `shapeProjectionService.ts` / `imageObjectService.ts` / `tableObjectService.ts`：仅改各自 surfaceForLayout 末臂，tray 仍为 tray，其余生成 formal_page；全部原导出保留，image 服务未删除。

边界：图纸未点名的 `createVisualConnectorProjection` 历史模型构造器未扩刀；boundary 静态门由 root 负责，本子任务没有编辑该门、NWSL、CSS 或主工单。

## 活测试如何保留

1. model 原 reserve shape seed 改用显式 genericCanvasObjects + genericCanvasPlacements 历史行；`shape-kernel-1`、坐标620/180/120/80、workspace/outside/free 及原 scene 命中/选择断言全部保留。
2. 6 个 shape/image/table 历史投影 fixture 先取得合法 Page 结构，再在测试侧声明原历史 placement（workspace/outside/free、无 frameId）。它们继续覆盖 shape fill/demote、Inspector/duplicate、command dispatcher 和 AI tree 的历史语义，**没有把纯模型历史值一律转 formal_page**。
3. 仅 table mutation math 与 structured history 两个与布局无关的创建夹具迁 Page，数据断言逐字保留。
4. 纯几何 viewport/focus/scroll 测试以显式历史 viewport/world 夹具代替退役的 Canvas 自动扩展生成器；保原180/64偏移换算、pan/zoom、远端focus/scroll断言。
5. 两处旧归一/restore夹具补显式 `coordinate_space:'canvas_world'` 以走现役历史读规则，原 x/height/surface 等断言逐字保留。第一处仅在 normalizedInCanvas 的 block.canvas_layout 输入声明该标签，**未改原分类与Page fallback用的隐式坐标夹具**；第二处在 workspace paragraph projection 历史 fixture 声明该标签。第一次尝试将第一处标签加在共同分类夹具中会改变world/page-local边界判据，已撤回，过程日志 [world fixture probe](batch3-reserve-model-world-fixture-probe.log)。
6. DocumentLayer fixture 删除 reserve 空字段和4个已删除回调 no-op props。其混合 typography 用例仍有批一已退役的 Canvas 默认字号期待，按补遗通例只退役该尾段2断言，Page字号/行高3断言逐字保留，15个用例均保留。

AST 按 assertion call 原始源文本逐字、多重计数核对：model 原 1108 条→1094 条，恰14条死行为断言退役，其余全在；DocumentLayer 原 82 条→80 条，恰2条死Canvas字体断言退役，其余全在。[完整源码断言对账](batch3-reserve-comparison.json)。

> **最终口径纠正（2026-09-13）**：上一段 DocumentLayer 的 82→80 为早期汇总，不作为最终总数。后续完整 TS AST 对基线与收口现文逐次配对结果为 **83→79**，退休 4 处：原 246/247 行两个 Canvas 字体断言，以及原 495/517 行两个已删除 NWSL `onMovePageFrame` 回调断言；现有 79 处断言全部原文保留，15 个展开用例仍在。原始 JSON 与日志不改；最终逐条账见 [root-layer-test-preservation.md](root-layer-test-preservation.md) 及 [JSON](root-layer-test-preservation.json)。

## 逐条退役断言（原源码行号）

| 文件 | 原行 | 死语义 |
|---|---:|---|
| model gate | 547 | assert(canvasViewport.x < 0, 'canvas viewport starts with left-side workspace headroom') |
| model gate | 548 | assert(canvasViewport.y < 0, 'canvas viewport starts with top-side workspace headroom') |
| model gate | 550 | assert(canvasViewport.width > pageViewport.width, 'canvas viewport is wider than the formal page') |
| model gate | 552 | assert(canvasWorld.width > pageWorld.width, 'canvas world is wider than page world') |
| model gate | 591 | assertAtLeast(     dynamicWorld.width,     farPageFrame.x + farPageFrame.width + 800,     'canvas world expands to include far PageFrame width',   ) |
| model gate | 596 | assertAtLeast(     dynamicWorld.height,     farPageFrame.y + farPageFrame.height + 800,     'canvas world expands to include far PageFrame height',   ) |
| model gate | 654 | assertEqual(canvasPolicy.showWorkspaceBlocks, true, 'canvas mode shows workspace blocks') |
| model gate | 655 | assertEqual(canvasPolicy.useGlobalPageScroll, false, 'canvas mode disables global page scroll') |
| model gate | 657 | assertEqual(canvasVisible.length, 2, 'canvas mode preserves workspace block') |
| model gate | 3957 | assertEqual(shouldResolvePageCollisions(canvasPolicy), false, 'canvas mode does not force page collision resolution') |
| model gate | 3960 | assertEqual(shouldUseElasticAvoidance({ policy: canvasPolicy, snapEnabled: false, deltaY: 12 }), false, 'canvas mode disables page elastic avoidance') |
| model gate | 3963 | assertEqual(transition.nextMode, 'canvas', 'page transition targets canvas') |
| model gate | 3964 | assertEqual(transition.closeOverlay, true, 'mode transition closes overlay') |
| model gate | 3965 | assertEqual(transition.clearBlockSelection, true, 'mode transition clears block selection') |
| DocumentLayer test | 246 | expect(surface().dataset.documentFontSize).toBe(String(canvasDefault.fontSizePx)) |
| DocumentLayer test | 247 | expect(surface().style.getPropertyValue('--document-font-size')).toBe(`${canvasDefault.fontSizePx}px`) |

## 红绿演示射程

先只删生产，未改测试，即取得旧门红：原588与3185两处 reserve 属性 TS2353；同时并行删 transition 导致 TS2724，runtime 先在已退役 Canvas headroom 断言红。随后一次性按上述边界改 fixtures/死断言，compiler 与 model 绿。DocumentLayer 先14绿1红（Canvas默认15px实际Page16.7px），后15全绿。旧门运行首失败具有截断性，**不申报未到达断言也分别亲跑红**；boundary 全组红演示由 root 单列。初次 runner 因 NODE_OPTIONS Windows反斜线转义失败，保存在 [runner setup error](batch3-reserve-model-runner-setup-error.log)，改成正斜线后才取得本节有效红证，该环境错误不计作门有牙。

直接 node 运行 compiler/model 与已审 client-test worker，OS环境白名单、dotenv读取阻断、Vitest envFile:false；没有 Git/npm 调用，没有安全测试/.env值/用户库接触。产物在 .codex-tmp，审计目录仅日志与收据。未单独跑三端全量构建/全client；root统一执行。

## Numstat（非 Git）

逐行 LCS 对 root 开工源码快照（行尾归一）。本子任务计 **+54/-146，净-92**；viewport全文件差异含controllers先改部分，故本刀只归属其中 -2 行，合并总计须按文件去重。

| 文件 | + | - | 归属 |
|---|---:|---:|---|
| `client/src/pages/Notes/canvasEngine/engineModel.ts` | 0 | 42 | this subtask |
| `client/src/pages/Notes/canvasEngine/types.ts` | 0 | 7 | this subtask |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.ts` | 0 | 1 | this subtask |
| `client/src/pages/Notes/canvasEngine/shapeProjectionService.ts` | 1 | 1 | this subtask |
| `client/src/pages/Notes/canvasEngine/imageObjectService.ts` | 1 | 1 | this subtask |
| `client/src/pages/Notes/canvasEngine/tableObjectService.ts` | 1 | 1 | this subtask |
| `client/src/pages/Notes/canvasEngine/viewportService.ts` | 6 | 45 | shared with controller batch 2; reserve contribution is only -2 lines |
| `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx` | 2 | 27 | this subtask |
| `client/scripts/canvasEngineModelContractCheck.ts` | 49 | 64 | this subtask |

## 全量发现的 TextFlow identity 静态引用尾项

root 全量验出 `server/src/__tests__/textFlowIdentityContract.test.ts` 的 `CLIENT_CALL_SITES` 数组仍列已删除 `ShapeObjectLayer.tsx`。依 root 指派，只删原23行该死路径；整文件与开工快照相比**除这一行外逐字节一致**，TextFlow 活断言、canonical import/definition 机制全留。

追加定向红绿演示：[删路径前](batch3-textflow-identity-red.log) **4条，3 PASS / 1 FAIL / 0 SKIP**，失败在 canonical shared call-site 静态审查；[删路径后](batch3-textflow-identity-green.log) **4/4 PASS、0 SKIP**。仍用已审 server runner、无 Git 调用。

此尾项另计 **+0/-1**，本子任务加尾项合计 **+54/-147、净删93行**（viewport共享文件仍仅计本刀2行）。已加入结构化对账，原生产/模型收据不覆盖历史日志。
