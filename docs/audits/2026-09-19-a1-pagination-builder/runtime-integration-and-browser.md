> **状态 (Status)**: active（builder 实现与亲跑证据，非 HQ 放行）
> **层 (Layer)**: audit / 蒸馏证据
> **日期 (Updated)**: 2026-09-19

# A1 runtime 集成与浏览器验收

## 唯一分页输入与输出

`useNotePageFlow` 在 v2 纸型入口把现役 block/TextFlow 草稿、逐帧几何、Typography 交给纯 `resolveDocumentPageFlowPlan`。DOM 字体测量是共用 adapter，页内没有独立 paginator。plan 的 `collection`、`fragments` 同时供 writing、只读 `NoteReadOnlyPageContent`、print、Overview 与导出预览。打印按每个 flow frame 的实际宽高生成 named @page，不把显式异形短页静默放大成默认纸高。

`DocumentPageFlowPlan` 包含 collection、frames[{frame,fragments}]、扁平 fragments、placementUpdates、appendedFrameIds、excludedBlockIds 和结构化 overflows。fragment 包含 blockId、frameId、startFrameId、fragmentIndex、isFirst/isLast、UTF-16 textRange、lineRange、lines 与临时 local layout；没有新增持久化分片列。只有新增页 collection 和首片 frame_id 经现役保存入口写回；原 x/y/width 不因墙/分页改写。pending 保存期间几何变化也进入签名，先存页再更新首片，四项 hook 回归验证收敛、顺序、只读/Web 与保存中调墙。

既有页保留，文字收缩不删除留有墨水的纸。墨水 API/placement/SVG 路径不改，墨水属于原纸页。manual、workspace、衬底/浮面/钉视口不进入 flow；Web 仍走现役单长页路径。

## 浏览器亲跑

使用真实 Chrome 和产品组件，夹具只把保存回执接到内存，不写用户笔记。HQ 原文 31 个非空段落，解析后 62 units/2672 UTF-16 字符，赋四层缩进；补充 3600 字符单 unit 用于跨片，另有 9 字符末块。复现：先 `node .codex-tmp/a1-pagination/build-fixture.cjs`，再 `node .codex-tmp/a1-pagination/serve-fixture.cjs`，浏览器打开 `http://127.0.0.1:5177/fixture-bundle.html`。使用已有 esbuild，无安装依赖。Vite 根入口曾扫描研究目录并在 transform 前挂起，原日志保留；最终使用本地静态 bundle。

原始 UI/DOM 抽样结果保存在 `.codex-tmp/a1-pagination/browser-journey-evidence.json`。首次旅程（角色字号缩放修正前）实测：

| 操作 | 结果 |
|---|---|
| A4 / Letter / 异形第二页 | 分别 5 页7片 / 5页6片 / 8页10片；异形续页宽480，首纸宽760；无结构化溢出 |
| 调墙、21px字号、恢复 | 窄墙首纸宽584；异形+窄墙+21px 为13页15片；回原设置5页7片，文本与范围相同 |
| 第一片 Ctrl+End → 右箭头 | 同 block/unit，续片 start1932、local caret0 |
| 续片输入“验收”→Undo→Redo | 3600→3602→3600→3602；完整文本恢复；浏览器发现并推动修复历史光标抢回，复测 Undo caret2→0 |
| 从长块1931到正文第5 unit偏移75的跨页跨块选择 | 复制1774字符，逐字等于现役 B9 两换行分隔规则；删除后4页5片；Undo恢复全文、5页7片 |
| 打印/Overview 开关 | 65 个 textarea 的 block/unit/起止偏移/value 与编辑投影逐项相同 |

硬换行片缝实测曾出现 firstClientHeight1143 / firstScrollHeight1170 的隐藏空行；初始失败证据保留，最终修正复测见本报告后续记录。原生中文输入法的操作系统候选窗未人工验收；compositionStart/update/end 与重复尾 input 使用组件定向测试，不冒充真人 IME 主观验收。未调用 OS 打印对话框、未输出实体 PDF；print 共享组件/几何与 beforeprint 生命周期由定向测试覆盖。

最终冻结树复测（原始 `.codex-tmp/a1-pagination/browser-final-boundaries.json`）：

- 硬换行：canonical end1933 / displayEnd1932，第一片 clientHeight=scrollHeight=1143，第二片 start1933/caret0；左键回首片1932且 scrollTop0，右键回续片0。换行保留于逻辑范围，展示不造额外空行。
- 垂直软换行 affinity：首片1932 ↓ 续片local46 ↑ 首片1932；已修复原先错误留在续片local0的问题。使用现役 textarea navigation 的行位提示与浏览器原生 affinity。
- A4仍5页7片，Letter5页6片，异形页8页10片；异形+窄墙+21px在标题也响应字号后为14页16片。恢复A4/16px/原墙后5页7片，文本和完整范围均回固定点。
- 最终编辑/只读输出65个 slice的 block/unit/start/end/value 仍逐项相同。
- 墨水追加两项真实 runtime→print/Overview 回归：全文首片换籍并新建续页，原 ink placement未改，原笔迹只在原页 SVG 中出现；连同同源projection和既有只读层共8/8通过。

## 可点入口

block 外壳控制与状态入口仅一份；每个 TextUnit 把手只在该 unit 首片，跨多 unit 标注章只在首个命中 unit 的首片，continuation 不克隆公民入口。来源引用仅首片，分页专用固定单行横向滚动区域预算56px（10px间隔+28px条带+18px原生滚动条预留），与引擎同源；全部来源可点击/Tab 到达。现役非分页来源展示不变。

## 边界

此处证明真实布局/交互和内存保存端的集成行为；服务端持久化、真实账户刷新及 HQ 主观验收不由夹具替代。最终测试数字、环境失败与完整门的分工见 `verification-components.md`。没有 Git 写操作、commit 或依赖变更。
