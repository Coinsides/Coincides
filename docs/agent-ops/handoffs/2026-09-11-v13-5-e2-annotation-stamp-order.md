> **状态 (Status)**: done(builder 工作树交付；待 HQ 复核放行)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · 波次 E2 · 标注章邻近自适应
> **上游**: 09-11 设计日会议记录 §三.1(Henry 拍);现症=真机章(LABEL 徽章)压正文首行(Henry 多次截图在案)

# E2 · 标注章邻近自适应

## 零 · 裁定原文

1. **章贴高亮**:标注章(LABEL 徽章)锚定其标注范围高亮的**包围盒**,紧邻摆放;
2. **方位自适应**:空间优先级 **上→下→左→右**——包围盒上方有空间放上方,依次降级;取位后**⛔遮压正文任何字符**;
3. **避让同侪**:多章相邻时避让(同方位排开或降级次方位),⛔叠章;
4. 纯渲染层:⛔动 annotation 数据/锚定真相;纸面/打印/overview/导出预览投影同规则或显式申报差异。

## 一 · 交付面

- 章定位改造(现状=块首固定位压首行);范围包围盒来源=现役高亮 rect(跨行范围取首行段或整体包围盒,实施申报取舍);
- 方位判定含页框边界(靠纸顶的高亮不许把章挤出纸外);
- 多章场景:同块多范围、相邻块各有章;
- 高亮本体零改动(整 range 高亮为现役,⛔动)。

## 二 · 禁区

⛔动 annotation/range 数据与锚定;⛔TextFlow-Contract 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响的秒级静态门(canvasRuntimeBoundaryCheck 若含相关断言)。

## 三 · 验收

- typecheck+build 绿;定向套件绿+新增方位判定用例(四方位+边界+避让);
- 冒烟(合成/真浏览器):①上方有空间→章在高亮上方且零遮字(DOM 断言:章 rect 与正文文字 rect 零相交);②贴纸顶高亮→章降级下方;③多章避让零叠;④打印/overview 投影一致或申报;
- 证据落 `docs/audits/2026-09-11-e2-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff、定位算法说明(含包围盒取舍)、冒烟证据、测试数字。冲突停线⛔自作主张。

## Result

2026-09-11 · codex builder · 工作树交付，未 git commit；未发现与本单相撞的受管文件改动。未修改 annotation/range 数据或锚定、高亮本体、TextFlow 契约、服务端、权限配置或安全类测试。Git 仅用于只读工作区与 diff 检查，无 `.git` 写操作。

### 交付清单与 diff

- 新增 `client/src/pages/Notes/canvasEngine/annotationStampPlacement.ts`：纯几何四方位取位、正文与章避让、页界约束。
- 新增 `annotationStampLayout.ts`：整 surface 共用 DOM 测量/布局协调器，处理相邻块、缩放、换行、字体加载及内部滚动。
- 修改 `blocks/TextBlockProjection.tsx`：父/子章改为关联现役高亮 rect，移除起点坐标钳制与 `badgeIndex % 2` 交错位置；高亮仅增加测量用关联属性，分段与样式不变。
- 修改 `layers/BlockEditorLayer.tsx` 与 `NoteDetail.module.css`：整块章纳入同域避让，章宽度不再依赖定位坐标，未取到合法位置时不绘制章。
- 新增纯几何 21 项、DOM 集成 13 项测试；`canvasRuntimeBoundaryCheck.mjs` 增加 8 组相关静态断言。
- [实现完整 diff](../../audits/2026-09-11-e2-builder/implementation.diff)；[交付及证据说明](../../audits/2026-09-11-e2-builder/README.md)。实现补丁为 4 个既有文件修改 + 4 个新增文件。

### 定位算法说明

同一 TextUnit 内同一 annotation 的现役 `mark.getClientRects()` 取**整体包围盒**，包含跨行与不连续段；跨单元保留现有各单元章实例，分别测量。上→下→左→右依次尝试，法向保持贴高亮边缘，切向按最近距离沿空位排开。正文障碍包含所有 textarea 的 DOM 镜像、普通正文文字 rect 和 KaTeX 整框；同页所有已放章共同参与避让。以页模式 `data-paper-ink-layer` / canvas `data-page-frame-index` 的实际框界限定章及 1px 轮廓包络；转换回本地坐标时补偿缩放、边框和滚动。

整块 annotation 原无范围高亮，章改贴块正文文字包围盒，空正文时用块内容框；保留既有聚合章，不新增高亮。若四方位都无合法空位，或整体高亮不能由单一页框包含，章暂隐并标记 `data-stamp-layout="no-space"`，空间变化后重测；数据与高亮保留。未测量时为 `unmeasured`。这是严格零遮字/零叠章的空间耗尽边界，**不宣称任意拥挤页都能显示全部章**；独立用例已覆盖，本次真实浏览器章隐藏数为 0。

### 冒烟与测试数字

- Client `npm.cmd run build`：**PASS / exit 0**，含 `tsc -b && vite build`，Vite **5.86s**；有既有混合导入及 chunk 体积警告。
- 受影响定向套件 **9 文件 / 191 项全部通过，2.84s**，其中新增定位 **21** + DOM **13**。
- `npm.cmd run check:canvas-runtime-boundary`：**167/167 PASS**，秒级；只运行本单受影响静态门，未启动含安全检查的全库 omnibus。
- 已连接 **真实 Chrome** + 真实 `TextBlockProjection` + 合成内容：6 场景 × 2 缩放轮次 = **12/12 PASS**。上方优先；纸顶降下；同块父/子章排开；相邻块；跨行；缩放。两个缩放轮次共 **18 个章观察、686 个正文字符 rect、1,218 次章—字符比较、8 次章—章比较**；**遮字 0、叠章 0、越框 0、隐藏 0**，annotation JSON 前后相同。
- 零遮字 oracle 使用原生 DOM Range 逐 UTF-16 字符独立测量，不调用生产障碍收集器；正面积容差 0.01 屏幕 CSS px。左右方位、无空位、第二页框、重复 id 各单元、整块章和父容器滚动由定向套件覆盖。
- 证据归档在 **[`docs/audits/2026-09-11-e2-builder/`](../../audits/2026-09-11-e2-builder/README.md)**：浏览器 DOM JSON、三份最终日志、可重跑夹具及实现 diff。截图在会话中目视检查，无归档 PNG。

### 投影差异申报

**打印与 overview 维持现役排除标注的行为**：共用 `NoteReadOnlyPageContent`，传 `annotations={[]}`、`showLabelOverlay={false}`，不显示高亮和章；本单未扩展投影数据通路。打印/overview 相关回归通过。ExportPreviewLayer 是元数据与标签开关面板，其背后的纸面继续使用本次 renderer，适用同一定位规则。
