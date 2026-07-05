# 2026-06-25 - Canvas Engine 路线判断与 V2.BN.8.8+ 候选 Plan

> 目标：给阶段三一个可执行的路线结论。这里不是正式 V2.BN.8.8 plan，而是把后续 plan 应该怎么写、怎么切小版本、哪里不能碰，先固定下来。

## 0. 最终路线判断

Coincides Canvas Engine 应采用：

```text
自研最小混合画布引擎
```

而不是：

1. 直接接入 Excalidraw。
2. 直接接入 tldraw。
3. 直接接入 BlockSuite。
4. 直接接入 React Flow。
5. 完全从零写一个图形软件。

它应该是：

1. 自研数据模型。
2. 自研 runtime kernel。
3. DOM 继续承载 TextFlow。
4. SVG / overlay 承载 connector 和 handles。
5. 外部项目只作为结构参考和交互参考。

## 1. 为什么不是直接接外部引擎

外部引擎强在：

1. 白板交互。
2. 命中测试。
3. selection / resize。
4. element model。
5. history。
6. renderer 优化。

但 Coincides 的特殊点是：

1. TextFlow 已经存在，并且是内容真相。
2. ContentGroup 已经成为知识结构真相。
3. PageFrame 不是普通 frame，而是正式页面系统。
4. Canvas AI Tree 是核心能力。
5. Agent 必须走 proposal，不是白板插件。
6. Relation 不能等于普通箭头。

如果直接接入外部引擎，短期可能快，长期会反复遇到“它的 truth 与我们的 truth 冲突”。

## 2. 外部引擎应该怎么用

使用方式：

1. 克隆研究。
2. 读代码结构。
3. 学它的 interaction kernel。
4. 学它的 element bounds / binding / history。
5. 学它的 renderer layering。
6. 学它的工具状态机。

不使用方式：

1. 不把 store 当数据库。
2. 不把 text shape 当 TextFlow。
3. 不把 frame 当 PageFrame。
4. 不把 connector 当 Relation。
5. 不把 app shell 复制进来。

## 3. V2.BN.8.8 候选 Plan

### 8.8.1 Canvas Data Contract

产物：

1. `CanvasObject` contract。
2. `CanvasPlacement` contract。
3. `ContentMount` contract。
4. `PageFrameExtension` contract。
5. `VisualStyle` contract。
6. `VisualConnector` contract。
7. `CanvasAIReadableSnapshot` contract。

验证：

1. model contract check。
2. migration / adapter test。
3. old metadata compatibility only as import path，不长期兼容。

### 8.8.2 Canvas Runtime Kernel

产物：

1. `NoteCanvasRuntimeProvider`。
2. `CanvasSceneRuntime`。
3. `CanvasViewportController`。
4. `CanvasPlacementIndex`。
5. `CanvasMeasurementService`。
6. `CanvasHitTestService`。

验证：

1. 坐标转换测试。
2. hit test 测试。
3. viewport pan / zoom smoke。

### 8.8.3 PageFrame v1

产物：

1. PageFrame 正式成为 CanvasObject。
2. primary PageFrame。
3. Page Mode 自动聚焦。
4. content rect。
5. basic resize / move。
6. snap / ruler contract。

验证：

1. 创建笔记后主 PageFrame 正常。
2. 切 Canvas Mode 后可看到 workspace。
3. 多 PageFrame 下 primary 规则稳定。

### 8.8.4 Block Projection v1

产物：

1. paragraph block -> CanvasObject projection。
2. PageFrame 内 block 创建。
3. workspace block 创建。
4. block placement persistence。
5. block visual style。

验证：

1. 刷新后位置保留。
2. TextFlow 内容不被 Canvas style 污染。
3. AI snapshot 能读 block text + bbox。

### 8.8.5 Shape / Block-backed Shape / Visual Connector

产物：

1. pure shape。
2. shape 填文字。
3. 空文字退回 pure shape。
4. visual arrow。
5. connector binding seed。

验证：

1. pure shape 不创建 NoteBlock。
2. shape 填文字创建 paragraph block。
3. 清空文字删除空 block / mount。
4. visual arrow 不创建 Relation。

### 8.8.6 Canvas Command / History Seed

产物：

1. CanvasCommand 类型。
2. CanvasDelta 类型。
3. command dispatcher。
4. 最小 undo seed。

验证：

1. move / resize / create shape 走 command。
2. command 能输出 delta。
3. UI 不直接散写 placement。

### 8.8.7 Canvas AI Tree v1

产物：

1. snapshot service。
2. PageFrame node。
3. block node。
4. shape node。
5. connector node。
6. selected context。

验证：

1. snapshot 包含 bbox / zIndex / frameId / visible。
2. snapshot 不作为 durable truth。
3. Browser smoke 可打开 debug panel 或开发检查接口。

### 8.8.8 Experience Gate

产物：

1. 手动 smoke 清单。
2. Browser screenshot。
3. Page Mode / Canvas Mode 对比。
4. Open Issues 更新。
5. 8.8 完成报告。

## 4. V2.BN.8.9 候选 Plan

主题：PageFrame Maturity。

小版本候选：

1. 多 PageFrame 插入 / 删除 / 复制。
2. 标尺与 margin guides。
3. header / footer / page number。
4. PageFrame template。
5. export preview。
6. crossing object export policy。

## 5. V2.BN.8.10 候选 Plan

主题：Object Projection and Reuse。

小版本候选：

1. image object 成熟。
2. table object 成熟。
3. ContentGroup projection tile。
4. reference / duplicate / fork / materialize。
5. ContentGroup projection browser smoke。
6. PageFrame 与 ContentGroup reuse 的手动体验。

## 6. V2.BN.8.11+ 候选 Plan

主题：Structured Object Family。

候选路线：

1. diagram / flowchart。
2. mind map。
3. chart / statistics graph。
4. math graph。
5. 3D viewer。

建议一次只做一到两类，不要把 Object Family 变成版本黑洞。

## 7. 风险

### 7.1 数据迁移风险

CanvasObject / Placement 一旦独立，会涉及旧 block placement 的迁移。

处理原则：

1. 当前未投产，不需要长期兼容旧测试数据。
2. 可以清理测试数据。
3. 仍应保留开发导入脚本，方便从 seed metadata 过渡。

### 7.2 UI 爆炸风险

Canvas 同时有 Page Mode / Canvas Mode / ContentGroup Mode / Gallery / Rail / Editor，容易让用户心智混乱。

处理原则：

1. 8.8 只聚焦 Page Mode / Canvas Mode。
2. ContentGroup Mode 后置。
3. Object toolbar 控制数量。

### 7.3 Agent 过早接入风险

Agent 过早接入会把数据边界变乱。

处理原则：

1. 8.8 只做 snapshot / proposal 留口。
2. 不做直接写入。

### 7.4 Object Family 膨胀风险

图表、数学图像、3D、Raw Ink 都很诱人，但都会拖慢底座。

处理原则：

1. 先做 object contract。
2. 再做 family。
3. family 每次只做少量。

## 8. 8.8 的最小开发顺序

推荐顺序：

1. Canvas Data Contract。
2. Runtime Kernel。
3. PageFrame v1。
4. Block Projection v1。
5. Shape / Visual Connector。
6. Command / History Seed。
7. Canvas AI Tree。
8. Browser / Manual Gate。

这个顺序的原因：

1. 没有数据合同，runtime 会散。
2. 没有 runtime，PageFrame 只是 UI。
3. 没有 PageFrame，Page Mode 没意义。
4. 没有 Block Projection，TextFlow 无法进入 Canvas。
5. 没有 AI Tree，AI-readable layout 只是口号。

## 9. 阻塞条件

如果正式进入 8.8 实现时遇到以下问题，应暂停写入 Open Issues：

1. 需要完整数据库实体迁移但没有清理策略。
2. PageFrame 与现有 note runtime 冲突。
3. TextFlow editor 无法稳定挂在 transformed canvas 中。
4. Canvas AI Tree 无法从 runtime 获得稳定 bbox。
5. UI mode 切换导致阅读体验明显崩坏。

## 10. 路线结论

Canvas Engine 应该自研，但不是孤立自研。

它应该带着前两轮调研学到的成熟工程经验，重新长成 Coincides 自己的第三大支柱：

1. 以 TextFlow 为内容根。
2. 以 ContentGroup 为知识结构根。
3. 以 PageFrame 为第一特殊 CanvasObject。
4. 以 CanvasObject / Placement 为空间根。
5. 以 Canvas AI Tree 为 AI-readable layout。
6. 以 Proposal / Command 为 Agent 安全边界。

这条路线能解释 8.8，也能解释 8.9、8.10 和更远的 GraphRAG / Agent 版本。
