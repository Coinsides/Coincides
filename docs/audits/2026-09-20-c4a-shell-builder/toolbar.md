# C4a 二轮 · 四群工具条与插入双入口实施证据

2026-09-20 · Codex builder 子任务；按工单补遗一施工。本件只申报工具条领域及协作接入，不代替 HQ 放行或全量总回执。

## 已落地

- `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:2037`：纸的状态 / 手上的笔 / 插入内容 / 看的方式四群；发丝线与间距分群。Preview、Layout、外观、装订、More、失败重试保留在纸群；Selection/Pen/Eraser 三 icon 及条件「问 Agent」在笔群；视图、导航、Overview、阅读 ± 与百分比在看群。原 19 个按钮位置的行为全部留有入口，四平铺插入按钮收编菜单。
- `NoteToolbarGroup.tsx:4` 与 `NoteDetail.module.css:1168`：宽屏纸→笔→插入→看；≤1100px 折叠「看」，≤760px 再折叠「纸」，窄屏视觉顺序笔→插入→纸→看，笔与插入始终保留。折叠按钮可 Tab/Enter，Escape 回到触发钮；发丝线只在群边界，一层容器皮。
- `client/src/pages/Notes/noteSlashCommands.ts:36`：七条唯一词表「表格 / 时间线 / 柱图 / 折线图 / 媒体图 / 引文框 / 提示框」。菜单直接消费该表，斜杠追加同一批对象；中文 `/表格` 等可直接匹配，旧 ASCII 触发分支保持。
- `NoteInsertCommandsContext.tsx:12`、`NoteCanvasRuntime.tsx:61`：仅会话级 React ref，将现役 writing surface 插入执行器提供给斜杠 hook，无 store、API、持久化表或真相写门。
- `useSlashCommandController.ts:476`：键盘和鼠标提交新增命令时，以现役 owner 校验 rollback 清理斜杠片段，再调用共享 host；既有 15 命令分支不变。host 执行前重新检查只读/Layout/Overview/组合输入，失败不打开编辑器。
- `NoteWritingSurfaceLayer.tsx:1566`：菜单优先取已选块，再取当前输入 owner/focus 块；斜杠显式取自己的目标块。表格/时间线/柱图/折线图打开原 editor 与原 save handler；媒体图通过文件选择复用 `pasteMediaBlock`；两个 B3 样式打开原 `ParagraphFurnitureEditor` 与 placement 外观 save handler。媒体图须有纸上的已保存块，B3 样式须有已保存正文段落，缺目标显式禁用，不发明正文或新保存路径。
- `NoteInsertMenu.tsx:8`：七项同词、保留原四钮 tooltip；方向键/Home/End 导航并跳过禁用项，Escape/外点/失焦关闭；进入编辑器前归还触发焦点。B3 editor 关闭后归还原焦点。

以上文件省略前缀者均在 `client/src/pages/Notes/canvasEngine/`，CSS 在其上级 Notes 目录。

## 旧行为保护证据

`.codex-tmp/c4a-shell/toolbar-preservation.mjs` 比对施工前副本与现物的旧 15 项对象文本（仅统一 CRLF/LF）：完全相同，SHA-256 两侧均为 `be61a50a6962c93acf1c766e681e525d3efb7bded627e393900eb3fdee06ffce`。Source Quote 仍为 `convert_block / writing_role / quote`；新增「引文框」为 placement 外观，两者不混用。`NoteChromeLayer.tsx` 整文件字节内容与施工前相同。结果在 `toolbar-preservation.json`。

## 协作接入与额外闭环

`NoteWritingSurfaceLayer.tsx:544` 挂主 builder 的 `useNoteDocumentShell`：现有 paper ink 页壳充当 page 高亮目标，既有 `displayFrame`/`resolveScreenRect` 完成坐标投影，零坐标契约改动。focus 若落在折叠章节，通过现役 `onRevealChapter` 展开自身/祖先，Overview 通过现役 toggle 退出。`useNoteDocumentShell.ts:52` 等滚动恢复完成且目标 DOM 挂载，再使用最新投影重算位置；不取折叠前旧几何。

## 验证

- 最终定向：**8 files / 180 tests PASS**，`.codex-tmp/c4a-shell/toolbar-targeted-final.log`。包含斜杠控制器、rollback、reducer、真实 writing surface、NoteChrome、NoteRuntimeDocumentLayer、B3 furniture 及标签条协作回归。
- 新增功能断言：七项菜单与 host 分别打开同一个现役编辑器并保存同样 payload；媒体同一 paste handler；七项斜杠键盘提交清掉触发片段、保留正文并调用同一 host；七项中文命令词；四群实际 DOM 顺序/键盘菜单；执行时模式变化；折叠章节先展开、按新 y=960 投影滚动与短亮，三个域 save/create spy 均零次。不是安全对抗类用例。
- `npx.cmd tsc --noEmit -p tsconfig.json` 最终退出 **0**，日志 `toolbar-typecheck-final.log` 无诊断。
- 初次 78/128/137/174 项与折叠专项 43 项日志同目录留档，最终数以 180 为准；它们与最终套件重叠，不能相加。React Router future-flag 警告来自现役测试环境，没有隐藏或排除用例。
- React 最佳实践技能检查：host ref 不造成输入重渲染；全局事件监听在关闭/卸载清理；键盘与焦点反馈显式；provider 不改变真相层；无新增依赖。
- 全库、runtime 门、前后截图由主 builder / verification 汇总；本子任务没有独立宣称全库或浏览器视觉验收。

## 边界

无 git 写/commit、无新依赖、无新真相表/schema、无既有 Agent 动词改动、无用户库/真实模型。当前文件副本留 `.codex-tmp/c4a-shell/before/`，供 verification 生成同种子前后截图。未改 Home、悬浮窗、队列、托盘、Staging/Recent/Favorites、Relation 或判断域。
