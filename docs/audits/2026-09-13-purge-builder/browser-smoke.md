> **状态 (Status)**: complete（隔离真浏览器冒烟）
> **日期 (Updated)**: 2026-09-12（America/Toronto；目录沿工单日期）
> **环境**: Chrome 真实标签页；本单合成数据库与资产；隔离 origin 127.0.0.1:51122

# 纸页与 Board 冒烟

按[隔离服务启动记录](isolated-app-start.md)使用新建的 synthetic DB、合成 project/Note/Page/ink/Board。服务未接触用户库，浏览器只打开本单 origin。文本、皮肤、墙与媒体保存全部经真实应用 UI；最终另作只读 DB 回验。

| 操作 | 观察与刷新后证据 |
|---|---|
| 纸页读写 | 在首段尾输入 ` Verified after purge.`，失焦保存、刷新后原文和后缀仍在；[刷新截图](browser-paper-reloaded.png) |
| 皮肤切换 | 从外观面板选择 warm-paper；刷新后纸面与 `data` 皮肤值保持；[暖纸与墙截图](browser-warm-paper-wall-before.png) |
| Page 左墙拖动 | Layout 模式拖左墙，left inset **72 → 107.0530612244898**，right **72** 未变；正文随版心移位；刷新后参数仍在；[墙后截图](browser-wall-after.png) |
| 媒体粘贴 | 在第二段尾粘贴本单生成的 180×90 PNG，真实 `clipboard.png` 图片 complete=true/naturalWidth=180/naturalHeight=90；刷新后仍在；[媒体刷新截图](browser-media-reloaded.png) |
| Overview | 打开单页缩略图，文字、媒体、原有墨水可见；Esc 返回阅读，内容仍在；[Overview 截图](browser-overview.png) |
| Board 附加回归 | 合成 chalk 从世界坐标 **550,100 → 768,252**；Saved 后刷新，坐标与大小一致，Note 卡仍可见；[拖前](browser-board-before.png)、[刷新后](browser-board-reloaded.png) |

逐步 DOM 值与矩形存于 [browser-smoke-steps.json](browser-smoke-steps.json)，数据库落盘另见 `browser-readback.json`。原剪贴板读取结果为空；工具不接受空 item 数组，已以空文本清除合成 PNG。

施工尚在热更新时曾遇到一次 Hook 顺序 HMR 错误；该次媒体操作没有计入通过。源码稳定后在 **2026-09-12T18:35:18.087Z** 完整刷新，再执行媒体/Overview/Board 链。此刷新之后 **0 条 console error**；完整日志（包括之前错误）保存在 [browser-console.json](browser-console.json)。仍有开发态 React Router future-flag 提示，不影响上述操作。

截图为现场真实浏览器；没有用 jsdom/静态截图替代冒烟。最终隔离服务停止记录见验证收据；未停止任何其他应用进程。
