> **状态 (Status)**: active
> **层 (Layer)**: 审计收据 / Builder evidence
> **日期**: 2026-09-11
> **权威 (Authoritative)**: 否；仅记录本次实现与实跑，不代替 HQ 放行

# E2 标注章施工证据

交付对应 [E2 工单](../../agent-ops/handoffs/2026-09-11-v13-5-e2-annotation-stamp-order.md)。未提交 Git；没有改 annotation/range 真相、TextFlow 契约、权限、服务端或安全类测试。

## 验证结果

| 验证 | 结果 | 证据 |
|---|---|---|
| Client typecheck + production build | exit 0；`tsc -b && vite build`，Vite 5.86s | [build.log](build.log) |
| 定向测试 | 9 文件，191/191，2.84s；新增纯几何 21 + DOM 13 | [targeted-tests.log](targeted-tests.log) |
| 受影响秒级静态门 | 167/167；新增 E2 8 组断言 | [static-gate.log](static-gate.log) |
| 真实 Chrome 合成冒烟 | 6 场景 × 2 缩放轮次，12/12 | [browser-dom-results.json](browser-dom-results.json) |

定向套件：annotationStampPlacement 21、annotationStampLayout 13、pageTextCoordinates 8、PaperInkProjection 4、BlockEditorLayer 16、NotePrintLayer 15、TextBlockProjection.unitHandle 27、TextBlockProjection.input 63、pageFrameAlignment 24。

两轮分别使用缩放 `[1,1,1,1,1,0.65]` 和 UI 点击后的 `[0.8,0.8,0.8,0.8,0.8,0.52]`。共观察 18 个章、686 个正文字符 DOM rect，进行 **1,218 次章—字符比较、8 次章—章比较**：遮字 **0**、叠章 **0**、越框 **0**、隐藏 **0**。annotation JSON 前后相同。浏览器 oracle 对现役高亮文本层的每个 UTF-16 字符独立构造原生 DOM Range，不调用实现的障碍收集函数；正面积比较容差为屏幕 CSS 0.01px。

场景包含：上方有空位；高亮首行恰贴物理纸顶、章降至下方；同块 2 父章 + 1 子章（上/上/下）；相邻块；跨行高亮；缩放。截图已在会话中目视检查，未归档 PNG。合成内容不写入用户笔记。左右方位、边界、无空位、重复 annotation id 分属不同文本单元、整块章、textarea 障碍、偏移父容器边框/滚动等由定向套件覆盖。

构建日志包含既有 taskStore 静态/动态混合导入和大 chunk 警告；测试日志包含 React Router future flag 警告，均不影响 exit 0。曾有一次新增测试使用 Node 类型导致 typecheck 失败，已移除 Node 导入并重跑上述最终构建。PowerShell 对原生命令 stderr 的 `NativeCommandError` 包装不是失败判定，以上以进程退出码及测试汇总为准。

按本单收口范围，只跑受影响秒级静态门，没有运行含安全检查/服务端套件的全库 `verify:v2-bn8-runtime`。

## 定位算法与边界

- 以已绘制 `mark.getClientRects()` 为来源，按当前 TextUnit 中同一 annotation 的全部段取**整体包围盒**，包含跨行及不连续段；仅增 DOM 关联属性，高亮分段、样式、范围和数据均不变。同一 annotation 跨 TextUnit 时保留既有各单元章实例，分别定位。
- 严格按上→下→左→右枚举。法向贴边留 2px，切向只沿仍与高亮投影相接的范围滑动；候选来自页框和障碍边缘，优先距离高亮起点最近的位置。字号缩放随纸面，父/子章原有最大宽度 220/170px 保留；整块章 180px。
- 整个 writing surface 共用一批正文障碍和已放章，包含相邻块、未标注 textarea 镜像、DOM 正文、KaTeX 整框（覆盖 SVG 数学字符）。章尺寸另留 1px 包络，涵盖选中子章轮廓。页模式使用 `data-paper-ink-layer`，canvas 使用 `data-page-frame-index`，每个章必须完全落在对应物理页框内。
- 一个 surface 一个 observer；React 内容更新、行/页框 resize、字体加载、纸面缩放、内部文字滚动触发按帧重测。普通祖先滚动无需重算；卸载时释放 observer，移除节点会停止尺寸监听。坐标换算含缩放、父边框及双轴滚动。
- **整块章例外**：既有 `block` annotation 没有范围高亮，以块内正文文字包围盒（无文字时块内容框）定位；保留既有聚合章，不新增高亮。
- **无可用空位时**：四方位都被文字/章/页框排除，或整体高亮跨框而没有单一页框能包含时，章暂隐，DOM 标记 `data-stamp-layout="no-space"`；未测量为 `unmeasured`。空间变化后重试。数据和高亮保留，绝不退回遮字/叠章位置。本次真实浏览器 12 场景均未触发隐藏；无空间路径有独立测试。此分支是可见性的明确边界，不宣称任意拥挤页都能显示全部章。

## 投影申报

打印与 overview 共用 `NoteReadOnlyPageContent.tsx`，原本就传 `annotations={[]}`、`showLabelOverlay={false}`，**两者仍不投影高亮或标注章**。本单未扩展这两条投影的数据通路；相关打印/overview 套件通过。ExportPreviewLayer 只是元数据/开关面板，背后纸面仍使用本次共用 renderer，因此纸面标签预览适用新规则。

## 重跑浏览器夹具

在仓库根运行 `node docs/audits/2026-09-11-e2-builder/prepare-fixture.mjs`，使用现有 client dev server 打开 `http://localhost:5173/e2-smoke.html`。展开 DOM assertion report，点击 Change scale 后再看报告；Recheck DOM 可手动重取。

最后运行同一命令追加 `--clean` 清理两个临时文件。夹具源见 [fixture.tsx](fixture.tsx)。没有改 Vite 白名单、安装包或 Chrome 配置。browser-harness 因 Chrome DevToolsActivePort 读取权限失败，实际冒烟使用已连接 Chrome 的 CUA 工具完成。

## Diff

源代码与测试的完整补丁见 [implementation.diff](implementation.diff)，包含 4 个既有文件修改与 4 个新增文件。收据/日志/夹具与工单 Result 不混入实现补丁。
