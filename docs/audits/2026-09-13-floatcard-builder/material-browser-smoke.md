> **状态 (Status)**: passed
> **层 (Layer)**: 审计 / Builder 真浏览器复验
> **日期 (Updated)**: 2026-09-13
> **权威 (Authoritative)**: 否；施工验收证据，HQ 保留放行权

# 补遗一：暖纸完整外观复验

最终产品代码在新隔离库重启后，由真实 Chrome 完成「暖纸 → 统一取色器绑池色 → 存套装 → 切工作台 → 切回套装 → 删除 → 刷新」全链。纸纹、阴影、墙材质保留；此前 [材质缺口](material-contract-blocker.md) 已关闭。

## 环境与操作

运行 `node client/scripts/skinFloatCardSmoke/serve.mjs`，本轮目录 `.tmp/floatcard-smoke/run-nFqARJ`，API 5195 / Vite 5196，使用空 dotenv、独立 SQLite / 资产目录和短合成登录值。夹具为 [smoke-fixture.json](smoke-fixture.json)，前轮夹具留在 `smoke-fixture-before-material.json`。没有接触用户库、真实 key 或既有登录数据。

自动化先尝试 browser-harness，因 DevToolsActivePort 访问不可用，改用 CUA 的 Chrome 浏览器接口；使用本单新建标签页，视口 1920×911。常规 UI 登录，首次导航到夹具笔记；笔记间切换通过项目导航和「打开笔记」操作完成。

浮卡打开后拖至视口左上，释放 clamp 为 (8, 8)；宽 280px、展开高度约 546.6px（60vh）、opacity 1。双击 header 折叠为 42px 标题条；刷新后重开，位置与折叠态保留，再展开继续。见 [折叠截图](material-collapsed.png)。十条完整壳规格的测试及上一轮证据仍见 [builder-result](builder-result.md)。

## 暖纸存、换、回、删、刷新

「阅读札记」原为暖纸，经现役统一取色器将 ink 绑定到池色「阅读/蓝」`#315D83`，保存为「暖纸蓝墨」。新卡即时出现在 Custom 区并选中。套装记录 `materialPreset: warm-paper`，之后切到工作台，再点回该套装；右键删除后，从数据库重载仍保持完整暖纸外观。

| 阶段 | 生效材质 | 与保存前完整样式相等 | 图像证据 |
| --- | --- | --- | --- |
| 保存前 | warm-paper | 基线 | [before-save](material-before-save.png) |
| 存为套装后 | warm-paper | 是 | [after-save](material-after-save.png) |
| 切到工作台 | workbench | 应发生变化 | [away](material-away.png) |
| 切回套装 | warm-paper | 是 | [after-return](material-after-return.png) |
| 删除套装 | warm-paper | 是 | [after-delete](material-after-delete.png) |
| 刷新后 | warm-paper | 是 | [after-reload](material-after-reload-top.png) |

逐阶段读取真实 DOM 的 `[data-note-skin-preset]` 根、页面框和阅读区及其全部子节点，共 22 节点；每个节点采集自身、`::before`、`::after` 的全部 `getComputedStyle` 属性，单阶段 13,200 个值。对保存后、切回后、删除后、刷新后四阶段，Node `isDeepStrictEqual` 比较整个对象及键集均为 true，见 [完整相等收据](material-full-style-equality.json) 与 [差异明细](material-style-comparisons.json)。原始快照为 `material-styles-{before-save,after-save,away,after-return,after-delete,after-reload}.json`。

截图已人工查看；保存及刷新可能改变阅读滚动位置，故不宣称全屏截图像素一致。上述完整样式比较覆盖本夹具渲染的纸、阴影、伪元素和墙；其他挂点由定向测试补足。

服务端 DELETE 后实际记录为 `preset: default`、`materialPreset: warm-paper`、完整 13 项既有颜色字面快照和 5 个部件，套装列表为空；这 13 项包含既有 Board 扩展颜色，并非新增 token。ink 已按池色冻结为 `#315D83`。见 [删除后数据库/API账本](material-db-after-delete.json)、[返回后记录](material-db-after-return.json)、[保存前记录](material-db-before-save.json)。刷新后仍相等，排除了只靠内存 tombstone 维持材质的假通过。

## 四预设 hover 与更新套装

切到原始 `quiet-ink` 的「研究札记」，记录 hover 前后数据库及全部请求。四张出厂卡均使整纸颜色与材质临时变化，当前绑定保持 quiet-ink；离开恢复 quiet-ink。hover 区间没有任何非 GET 请求，见 [零写收据](material-hover-no-writes.json) 和 [逐项观察](material-hover-checks.json)。

| hover 卡 | 纸色 | 材质 | 墙参数 |
| --- | --- | --- | --- |
| default | #101114 | default | 0 |
| quiet-ink | #17181C | quiet-ink | 0 |
| warm-paper | #F7F3EA | warm-paper，含完整阴影 | 0.55 |
| workbench | #1A1E25 | workbench | 1 |
| 移开 | #17181C | quiet-ink | 0 |

本 CUA 接口没有纯移动指针操作，采用坐标中键进入卡片触发真实 pointer-enter，避免主键应用；每次先移到桌面、结束前再离开卡片。早期 drag 尝试有两次未命中 hover，原观察保留在 JSON 中，未计作通过。通过截图使用 `material-hover-final-{default,quiet-ink,warm-paper,workbench}.png`。

另保存 quiet-ink 套装「谱系更新」，切暖纸，右键该套装选择「更新套装为当前样子」，再绑定该套装：实际记录和纸面均变为 warm-paper，套装小样与暖纸出厂小样的渐变相同。见 [更新结果](material-update-result.json)、[截图](material-update-result.png)、[最终数据库账本](material-db-final.json)。

## 结束与边界

本单浏览器标签页已关闭，隔离服务已停止；`netstat` 查询 5195/5196 无残留连接或监听。中断结束未生成该 run 的 server.log，API 账本及截图已单独保存。收集范围内的 [浏览器日志](material-browser-console.json) 无错误，有一条 React Router future warning；期间 CUA 会话曾因不可见保存按钮超时而重置，随后通过真实滚动恢复，因此该日志不声称覆盖全程。真实触屏未复验，HQ 主观验收仍由 HQ 执行。
