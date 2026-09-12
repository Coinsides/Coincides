> **状态 (Status)**: complete（批二/三写入面与静态门施工收据；总验收以工单 Result 为准）
> **日期 (Updated)**: 2026-09-12（America/Toronto；目录沿工单日期）
> **依据**: 工单补遗二；现物 recheck 图纸，非旧清册行号

# 写入面与静态门收据

## 交付

`NoteWritingSurfaceLayer.tsx` 按图纸抽除 Canvas 独占的 wheel/pan/zoom、PageFrame/Stack 自由画布 DOM、shape/image/table/connector/Inspector 画物层及其菜单、选中、拖动、resize、上传入口。相互闭包引用的一·8/14/13/16/17/18 与一·25 CSS 同组处理，没有整删混居写入面。原 Canvas guides 的 +56px 分支随所属渲染面删除。

删除五个零活消费者的模块：`ShapeObjectLayer.tsx`、`ImageObjectLayer.tsx`、`TableObjectLayer.tsx`、`VisualConnectorLayer.tsx`、`ObjectInspectorLayer.tsx`。保留媒体资产服务、历史对象构造/持久化、世界坐标工具、Inspector model 服务及其他现役读取者；本单没有扩张到纯历史模型服务清扫。

保留 Page 写入、PageFrameWallLayer、PaperInkLayer、媒体 NoteBlock 粘贴、TextFlow 与 Source 只读面、annotation、准备区提取/drop、页面模板、Overview。特别保留图纸原 3437/3442 所在的整个提取函数及两个坐标分支。ink 的选中状态和保存后清选中仍在。`selectedPageFrameId` 经类型门证实由 Overview 借 `writingSurfaceProps` 转递，原字段与传递完整保留。

`NoteCanvasRuntime.tsx` 的宿主类固定为现役 `page`；CSS 删除 Canvas 死头，合并选择器仅摘死头。B1e 的 `:not(.pageCanvas)` 收敛为 Page 选择器；B1d 的 `.writingSurfaceCanvas` 后代规则随死头删。Page 已收编的 `.canvasZoomControl` / `.canvasZoomButton` / `.canvasZoomReset` 保留，仅删死 slider。独立 AST/CSS 核查：**660 条 rule 原文不动，4 条仅 selector 改动且声明/上下文相同，68 条死 rule 删除**。[独立复核](batch3-independent-check.md)列出活函数、JSX 与 BlockEditor props 对账。

## 静态门先红后绿

未用跳过/删除整个 boundary 门换绿。先在原门不改的情况下删供货死枝，原门 exit 1；原门首错会短路，另用只替换早退 throw 的诊断包装收集每一个**原谓词**失败。该诊断末尾原脚本的“passed”固定文本不代表全绿，以后面的 FAIL 清单和包装 exit 1 为准。

| 阶段 | 原始证据 | 射程 |
|---|---|---|
| 写入面/CSS 删除，原门红 | [original red](batch3-boundary-original-red.log)、[旧谓词逐组红](batch3-boundary-all-old-predicates-red.log) | 模板、Frame/Stack、五画物消费族、Canvas zoom、CSS 与 policy 原断言失去供货 |
| 五文件删除，旧文件存在/内容断言红 | [deleted layers red](batch3-boundary-deleted-layers-red.log) | 缺失文件；诊断 wrapper 以空内容收集已删模块的原内容谓词 |
| reserve/viewport/mode 桥删，原门红 | [final old red](batch3-boundary-final-old-red.log) | CanvasObjectReserve、reserve input、旧 viewport 回调、transition 与前述全部旧谓词 |
| presentation 两个新孤儿拖拽 handler 删除，原门红 | [presentation causal red](batch3-presentation-boundary-causal-red.log)、[原断言独立红](batch3-presentation-original-red.log) | `Runtime presentation controller routes PageFrame object geometry updates` 的 9 个独占 token 消失 |
| 新门绿 | [正式 runtime](final-runtime.log) | **174/174**，保留活 Page 正向锁、添加死枝与五文件不复活锁 |
| 新门逐处牙齿复核 | [40 条 mutation 对账](batch3-boundary-mutations.json) | **40/40 单输入 mutation 红 → 174/174 clean 绿** |

最终 40 个变更/新增检查（35 个内容谓词 + 5 个文件不存在谓词）均使用现物真实门代码验证。每次仅在读取层替换一个输入：正向锁删其必需 token，否定锁重放其禁用 token，文件锁模拟退役文件重新存在；不改谓词、不写生产源码。逐条的门名、文件、token 与失败消息完整存 JSON。本演示验证的是静态文本门的检出能力，不冒充运行时行为测试。

替换后的门继续要求 Page template/background/slots、PageFrameWallLayer、PaperInkLayer、Page 阅读控件与保留的三类 zoom CSS、viewport 状态和实测尺寸、PageFrame 活 CRUD；三种普通对象生成器必须保留 tray 否则落 formal_page。旧图纸之外、由同组删枝直接产生的 reserve/viewport/presentation 门耦合也已同单登记。

## 测试与活断言

- [Page alignment/centering 定向](batch3-page-targeted.log)：23 + 3 条通过；死 Canvas +56px 与 Canvas host offset 断言退役，历史坐标提取用例继续在岗。
- [根层测试逐字对账](root-layer-test-preservation.md)：逐项登记 Page centering、alignment、DocumentLayer 的死用例/断言与保留部分。
- [控制器与 Page 导航](batch2-controllers.md)：130 条 TextFlow 导航断言逐字保留，媒体/item_ref Page 障碍物替代退役画物 DOM。
- [model 收据](batch3-reserve.md)：保留 1094 条活模型 assertion，14 条死 Canvas policy/world/toggle 断言逐条退役，60/60 组通过。
- [正式验证汇总](final-verification-results.md)：client 150 文件/1572 条通过，三端类型/构建及全部代码静态门通过。安全测试排除与两条 Python 环境红另列，不混报为无过滤全库绿。

本轮补遗二续工没有 Git 调用或 `.git` 访问，没有读取 `.env` 值、触及用户数据库或改动安全测试。构建输出在原构建目录/scratch，本审计目录仅收据、测试日志和浏览器证据。
