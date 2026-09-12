> **状态 (Status)**: active（停线证据；批一通过，整单未完成）
> **日期 (Updated)**: 2026-09-12（America/Toronto；目录沿用工单日期）
> **权威 (Authoritative)**: 否（亲跑事实及待裁建议）

# STOP-2：批二可见性删枝撞上活 TextFlow 导航测试的旧夹具

依据工单补遗一“活语义断言零动；两可/拿不准仍停线举证”，批一完成并验证后，停在批二一·6 的正式落刀前。没有删除、改写该 TextFlow 测试，也没有保留为了测试而复活 Canvas 的实现。

## 现物与实证

`client/src/pages/Notes/canvasEngine/textFlowBlockNavigation.test.tsx`：

- 74 行：共享夹具给 `useNoteCanvasResolvedLayoutModel` 传 `surfaceMode: 'canvas'`、`createSurfaceModePolicy('canvas')`。
- 137–150 行：`fix1 smoke 3: follows real Layout placement after movement leaves order_index unchanged`，两块的 `order_index` 与空间上下顺序相反，139–140 行布局均标 `canvas_workspace`。
- 145 行断 Shift+ArrowDown 焦点转到空间下方块，148 行断复制跨块文本为 ` paragraph\n\nlower`。这两条是仍活着的 TextFlow 空间序导航/选区语义，不是 Canvas UI 行为断言。
- 同文件 130–135 行另有 v1/v2 历史坐标读取测试；不应把其 `canvas_world` / `canvas_workspace` 一并替换。

图纸一·6 要去掉 `modePolicyService.ts:122–124` 的 `policy.showWorkspaceBlocks ? renderableBlocks : ...` Canvas 可见性分流。为排除旁因，本次只临时剪掉这个三元的 Canvas 臂，未改 policy 工厂、viewport、placement、TextFlow 代码或测试。

| 阶段 | 结果 | 日志 |
|---|---|---|
| 未改批二基线 | 34/34 PASS，exit 0 | [before](stop-2-navigation-before.log) |
| 仅去 Canvas 可见性分流 | 33 PASS / 1 FAIL，exit 1；恰为上述活导航用例 145 行，焦点仍在 upper，未到 lower | [mutation](stop-2-navigation-mutation.log) |
| 恢复原源码后 | 34/34 PASS，exit 0 | [restored](stop-2-navigation-restored.log) |

临时探针 `.tmp/purge-visibility-probe.cjs` 在 `finally` 恢复原始 Buffer，日志记载 SHA-256 与 `Original source restored byte-for-byte: true`。该红演示是**停线因果证据**，不是“门改红→改门绿”完成证明；批二修改未留下。

## 待 HQ 裁定的最小处置

建议仅迁移此活测试的夹具，保留全部活断言：

1. 74 行夹具模式改为 `surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page')`；
2. 139–140 行这两块布局的 `surface: 'canvas_workspace'` 改为 `surface: 'formal_page'`；
3. 145/148 行导航及复制断言逐字保留，130–135 行 v1/v2 历史坐标读取测试逐字保留；不改 TextFlow 生产实现。

以上候选**未实施、未宣称验证通过**。现有通例授权的是明确死语义用例退役，而此处需要调整活 TextFlow 用例的夹具，原单又将 TextFlow 活面列入禁区；builder 不将两者自行等同。待裁范围是夹具迁移，不是恢复 Canvas，也不是删掉活断言。

## 已完成与留存

- 批一（补遗后 9 项：2/5/9/11/19/20/24/27/28）已完成。28 的 body lock effect 依图纸配对要求提前与 CSS 同删；批三一·4 的 pageCanvas class 尚留待第三批。
- 一·19 图纸误将整个函数视为恒 false；现物前半是 Page 内容/批注活判断，故仅剪 Canvas 后半，前半逐字保留。详见 [服务收据](batch1-services.md)。
- 批一源码 14 文件，LCS numstat **+13 / -217，净 -204**，不含审计产物和 scratch。详见 [逐文件计数](batch1-numstat.md)。
- 批一定向 6 文件 **80/80 PASS**；client/shared/server 类型验证绿；边界静态门 **168/168 PASS**；模型门 **60/60 组 PASS**；test-wiring **75/75 已挂，0 豁免、0 漏挂**。
- server persistence 改前基线 **49 条：24 PASS / 25 FAIL / 0 SKIP**，exit 1；图片资产生命周期五条均保留。日志：[before](server-persistence-before.log)。fixture 尚未改，不能称 25 条已转绿。
- 批二/三/四、最终 client 全库/server 57 文件、build 全套、静态门改写及其红绿演示、TD-7/TD-9 桥拆除、隔离真浏览器冒烟未完成。未触及用户库或读取 `.env` key 值，未运行安全类测试。

## 操作偏差申报

本轮开工误调用 `git status --short` **两次**（只读查询，均输出系统 ignore 文件访问警告），与本单将 Git 留给 HQ 的边界不符。发现后已停止所有 Git 调用；没有 Git 写操作、commit、push、PR 或 merge。未做 Git numstat/secrets 扫描，不把文件级基线计数冒称仓库 Git diff；HQ 收口扫描仍未完成。
