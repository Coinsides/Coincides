> **状态 (Status)**: active
> **层 (Layer)**: B1a builder 合成浏览器证据（非 HQ 放行）
> **日期**: 2026-09-11

# B1a 四皮 E1 复跑

最终 [summary.json](summary.json)：**252 passed / 0 failed**。默认、静墨、暖纸、工作台各 **63 passed / 0 failed**；每皮覆盖 **8 类浮层、10 个命名状态、20 份 rest / hover 样式采样、82 个强制 hover 控件**。总计 80 份样式采样、328 个强制 hover 控件；嵌套边框、后代阴影、圆角和静态卡底全部为 **0**。每皮 16 条允许的单侧水平发丝线；浏览器运行时与 console error 均为 0。

| 皮 | 最终报告 | More 外观展开 | 当前 Info |
|---|---|---|---|
| 默认 | [报告](default/smoke-report.json) | [截图](default/01b-more-appearance.png) | [截图](default/03-info.png) |
| 静墨 | [报告](quiet-ink/smoke-report.json) | [截图](quiet-ink/01b-more-appearance.png) | [截图](quiet-ink/03-info.png) |
| 暖纸 | [报告](warm-paper/smoke-report.json) | [截图](warm-paper/01b-more-appearance.png) | [截图](warm-paper/03-info.png) |
| 工作台 | [报告](workbench/smoke-report.json) | [截图](workbench/01b-more-appearance.png) | [截图](workbench/03-info.png) |

八类为 More、Info（现役 header metadata）、Deleted blocks、Layout / PageStack、Export preview、Delete confirmation、View options、Source snapshot。More 另在“外观展开”和“纸级覆写已选择”两态采样，所以命名状态为 10。每个状态都检查原 E1 全量 DOM 后代，并以 `CSS.forcePseudoState` 强制可用控件 hover 后复查；没有排除 option、input 或新的 SkinControls。

新生产 More → `SkinEditor` → `SkinControls` 的继承选项 + 四预设、切换回调、清除覆写回落，均通过真实组件验证。额外断言 `summary`、字段 label、select 三处 computed color 等于当前 `--sk-ink`；四色均通过。这条检查是在截图发现暖纸新外观字段错误继承白字后补入，最终暖纸图已亲看确认深墨字。

## 验证边界

[browser-fixture.tsx](browser-fixture.tsx) 直接挂载生产 NoteChromeLayer、NotePaperHeader / NoteCoverMetadata、NoteFloatingPanelLayer、ViewOptionsMenu、FloatingOverlayLayer、PaperSkinContext 与真实皮合成样式。metadata 的两个请求只由本 fixture 的 axios adapter 回合成数据；其他动作只记内存回调。没有数据库、用户笔记或持久化后端，**不作为全页零变化或持久化证明**；主 B1a 浏览器证据承担那些检查。左侧是合成诊断页，不是生产纸面，尤其没有给 header 构造一张纸底。

原 E1 runner 的旧 “View info” 已因 E5 迁移而不存在。本次没有跳过 Info：fixture 增加现役 NotePaperHeader，点击实际 Add tags，审计 `data-note-cover-popup`，读取其 Statistics。保留原零嵌套判据，允许且仅允许恰好一条水平、≤ 1px 的后代边线；外层框不计为嵌套。原 Typography 回调检验仍测试已有独立 Typography 功能后 Reset，皮预设本身不更改字体。

初次完整复跑 [pre-fix-complete-report.json](pre-fix-complete-report.json) 为 53 / 2：失败集中于当前 Info 的 input 四边框、input / button 圆角和 button 静态底，见 [修前截图](pre-fix-info.png)。生产 CSS 按原 E1 纪律修复后，全部通过。根层旧 `smoke-report.json` / 截图是尚未接入 SkinContext 时的中间诊断；**最终结论只取四个皮子目录及 summary.json**。原 `docs/audits/2026-09-11-e1-builder` 的脚本与证据未回写。

## 重放

仓库根目录先启动 `node docs/audits/2026-09-11-b1a-builder/e1-recheck/serve.mjs`（仅 127.0.0.1:5192），另一个终端运行：

```powershell
node docs/audits/2026-09-11-b1a-builder/e1-recheck/smoke.mjs default
node docs/audits/2026-09-11-b1a-builder/e1-recheck/smoke.mjs quiet-ink
node docs/audits/2026-09-11-b1a-builder/e1-recheck/smoke.mjs warm-paper
node docs/audits/2026-09-11-b1a-builder/e1-recheck/smoke.mjs workbench
node docs/audits/2026-09-11-b1a-builder/e1-recheck/aggregate.mjs
```

runner 使用独立本地 Chrome headless profiles、CDP 端口 9342–9345、1280 × 960 视口；沿用原 E1 本机合成进程参数，不接触用户 profile。每次脚本结束关闭自己的 Chrome。源码最终更新后已重启 Vite 再取上述最终收据，避开本机 watcher 曾出现的旧模块缓存。未运行安全类测试或 git 命令。
