# VPS-F9 builder 证据索引(2026-11-01 · 临时工程对话1)

> `*.log` 被仓库 `.gitignore` 忽略,本页是可提交的摘要;原始日志与截图在同目录。复现全部在本会话 scratchpad 的临时实例与临时库上进行。

| 证据 | 内容 |
|---|---|
| `before-a17-lock-lost-frame.jpg` | 修前:截停 rAF 后在空块打「# Sec7」→ busy 恒真、6 个编辑框全部 readOnly、Sec7 被吞;恢复 rAF 后仍锁(刷新才解) |
| `after-a17-lost-frames-no-lock.jpg` | 修后:同一操作(rAF 截停,156 帧未回调)→ busy 释放、0 个 readOnly、「Sec10」显示且失焦后落盘 |
| `positive-control-text-half-off.log` | 去掉结构编辑的 text 半边发布 → 「# 转换后两半一致」用例红 |
| `positive-control-frame-fallback-off.log` | `afterFrame` 退回只等 rAF → 「帧永不来」用例红(另 3 条连带红:挂起的 run 不卸载全局按键捕获,后续用例的键被吞——正是线上锁死的全局形态) |
| `positive-control-watchdog-off.log` | 看门狗失效 → 「写入永不结算」用例红 |
| `client-canvasEngine-vitest.log` | canvasEngine 全目录回归:163 文件 1903/1903 |
| `client-pagination-rerun.log` | PaginationProjection 单跑 5/5 |

## 临时库实证(A-17 丢字链)

- 空块快打「# Sec4」→ flow 为 heading「Sec4」,text 半边仍 ""(探针日志:结构 applyEdit 只发 flow;普通键入经 onTextChange + onTextFlowChange 两半都发)。
- 编辑器显示空、章节树显示「Sec4」;在「空」块打「x」→ 服务器该块为「x」,「Sec4」永久丢失。即 Tester 所见「服务器空标题」的成因。
