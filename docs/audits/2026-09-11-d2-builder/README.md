> **状态 (Status)**: active
> **层 (Layer)**: builder 合成验证证据（非 HQ 放行）
> **日期**: 2026-09-11
> **工单**: [13.5 D2](../../agent-ops/handoffs/2026-09-11-v13-5-d2-header-chrome-order.md)

# D2 builder 验证回执

交付纸上 title + description、顶栏功能迁移、page 路由保存边界。产品代码与测试共 **24 文件，+1156 / -334 行**；逐文件散列及计数见 [diff-manifest.json](diff-manifest.json)。此计数包含 5 个新产品/测试文件，不含本目录、两个合成入口和工单回执。没有服务端、schema、迁移、坐标持久化或 TextFlow 契约改动。

## 验证环境与重放

真实 Chrome 浏览器，1920 × 911 视口，实际 React client 的 `AppLayout`、`NoteDetail`、`NoteCanvasRuntime`、`ProjectNotesSection` 和 `BoardNoteModal`。`browser-fixture.tsx` 使用与生产一致的 data hash router；全部 axios 请求由本地合成 adapter 截获，未知请求报错，不回退网络。数据仅存在该浏览器的 `coincides-d2-synthetic-browser-v1` localStorage，未访问真库。静态模板为空提示由 fixture 的空模板响应产生。

重放入口：从 `client/` 启动 `npm.cmd run dev -- --host 127.0.0.1 --port 5179 --strictPort`，打开 `http://localhost:5179/d2-header-smoke.html#/projects`。测试入口为 `client/d2-header-smoke.html` / `.tsx`，实现留在本证据目录。`Reset synthetic rows` 只重置此 fixture 的三条合成笔记；`Inspect synthetic saved rows` 展示保存的行、PageStack collection 和请求账本。单次失败可能被原保存链自动重试成功；连续失败请用 `Fail next 3 synthetic saves`。

## 浏览器冒烟

| 项目 | 实测结果 | 证据 |
|---|---|---|
| 纸上改名与列表 | Enter 保存后导航到 Projects，实际列表显示 `D2 renamed on paper` | [03](03-list-after-rename.png) |
| description 持久化 | 录入后刷新，值仍为 `Description saved through the existing note row.` | [04](04-description-after-reload.png)、[05 请求](05-immediate-route-save.json) |
| 空 description | 非 hover/focus 时 opacity=0；hover 表头而未聚焦字段时占位显影 | [01](01-empty-header.png)、[01 几何](01-empty-geometry.json)、[02](02-hover-description.png) |
| 有界与无重叠 | 长标题/描述实测：title clientHeight=80、description=72、header=208 CSS px；编辑态内部滚动，失焦隐藏溢出。header bottom=367.52，正文 top=426.76 | [12](12-long-header.png)、[12 几何](12-long-header.json) |
| More 及上弹 | New PageStack、收藏、Info、删除、已删块、Typography 均在 More；popup 底边位于工具条顶边上方 8px | [06](06-more-upward.png)、[06 几何](06-more-upward.json) |
| Info / 回收站 / 删除 | Info 原内容可读；已删块空抽屉正常；删除原确认框打开并取消 | [07](07-info.png)、[08](08-trash.png)、[09](09-delete-confirmation.png) |
| Typography | 字体切为 Georgia，关闭/重开及刷新仍保留 | [13](13-modal.png)、[18 保存行](18-stack-saved-rows.json) |
| Layout / Preview | Layout 可开关，面板向上弹；Preview 可开关，block type overlay 可切换 | [10](10-layout-panel.png)、[11](11-preview.png) |
| New PageStack | 两次触发原创建函数，最终 collection 含 3 个 frames / 3 个 stacks；没有 layout_updates，表头仍单实例 | [18 请求](18-stack-saved-rows.json)、[21 最终行](21-final-synthetic-rows.json) |
| 收藏 | 原 handler 仍显示 `Favorites will become persistent in a later Better Notebook patch`；本单未扩建收藏持久化 | More handler 定向测试；浏览器亲点确认原 toast |
| Modal | 仅 1 个 `Close note`；编辑描述后立即关闭，列表和重开均显示新值；Escape 也可关闭 | [13](13-modal.png)、[15](15-modal-reopened.png) |
| Modal 弹层锚点 | 拖动 modal 150px/16px 后 popup 仍在工具条上方 8px，保持右边对齐；关闭钮仍唯一 | [16](16-modal-drag-anchor.png)、[16 几何](16-modal-drag-anchor.json) |
| 来源只读 | title / description 均 readOnly；Source locked 在底部；Layout/写入工具保持原禁用语义 | [17](17-source-readonly.png)、[17 属性](17-source-readonly.json) |
| 打字立即路由离开 | 正文改为 `D2 immediate route departure persisted this body.` 后立即点 navigator，保存行与重新打开均为新文本 | [05](05-immediate-route-save.json) |
| 失败与重试 | 单次正文保存失败后，屏障自动重试成功才离开；连续 metadata 保存失败则停留原 note、toast，草稿仍在，之后能编辑重试并离开 | [19 首次现象](19-route-failure-ax.txt)、[19 重试请求](19-single-failure-retry-rows.json)、[20 留页](20-route-failure-stays-ax.txt)、[20 截图](20-route-failure-stays.png)、[21](21-final-synthetic-rows.json) |
| 块控制条裁切 | Layout 下点击正文出现原控制条；page 裁切重算为 2px，滚动后按钮仍可见、锚点随正文移动 | [22](22-block-control-clipping.png)、[22 几何](22-block-control-clipping.json)、[23](23-block-control-scrolled.png)、[23 几何](23-block-control-scrolled.json) |

`14-modal-more.png` 为 locator 点击的中间截图：自动化工具的 scroll-into-view 曾把纸面滚动。后续原生点击重放没有此滚动，`16` 是原生点击/拖动的最终锚点证据。`19-route-failure.*` 文件名保留首轮采样名称，实际结果是单次失败后成功重试，不能将它误读为连续失败挽留证据；挽留证据以 `20` 为准。

所有合成存量块前后维持 x=0、y=0、width=650、height=120；metadata 与 New PageStack 请求未写块坐标。负 y、多页单表头、D1 inset 联动及真实 pointer controller 的 body 原点换算另由集成测试覆盖，详见 [保存与集成验证](save-boundary-validation.md)。

## 保存与投影的边界

正常应用内 pathname 离开（navigator、push/replace、历史返回、note → note）通过 `useBlocker` 保持旧 runtime，执行 dismiss → 焦点恢复微任务 → blur → header 保存 → TextFlow flush → draft/write registry drain，成功才放行，失败 toast 并 reset。等待期间暂停 page 与 portal 输入，避免慢存中新草稿越过保存批次，结束后恢复。modal 继续宿主已有 requestClose 保存链。

物理刷新/关闭只能在 `beforeunload` 同步开始 dismiss/blur/flush，浏览器不会等待异步 Promise，不能保证完成或失败挽留；没有无条件离页确认框。非 router 强制卸载仅通过保留 handle 尽力 drain，不能保证已失活 scope 内未登记草稿。相同 pathname 的 query/hash 变化不拦截，当前也不替换笔记 runtime。生产总是 data router，旧 MemoryRouter 单元 fixture 不安装 blocker。

打印与 overview 保持旧投影，**不呈现此次 title/description 表头，也不计入表头显示带**；ExportPreview 继续旧 block/page boundary 模型，同样不含该显示带。表头只在可编辑纸面首部出现。navigator 当前只投影项目名，没有 note-title 行；本次改名同步由实际 notes 列表重读验证，不另造 navigator 真相。Board 卡面标题保持原状。

## 完成态检查

由 `node docs/audits/2026-09-11-d2-builder/validate.mjs all` 执行；可读命令、耗时、退出码和原始输出全部在 `validation/`。最终结果：

| 检查 | 结果 |
|---|---|
| client 定向 20 文件 | **261 passed / 0 failed / 0 skipped** |
| 新保存边界套件（包含在上行） | 9 passed |
| client `tsc -b` | exit 0 |
| server `tsc --noEmit` | exit 0 |
| client `npm run build` | exit 0 |
| server `npm run build` | exit 0 |
| runtime boundary | 159 checks passed |
| model contract smoke | 60 groups passed |
| `git diff --check`（只读） | exit 0 |

初次定向运行有 7 项旧 layer fixture 缺 description 入参的失败，修复 fixture 后 260/260；最后新增慢存输入屏障回归后 261/261。历史 attempt 日志保留，最终以无 attempt 后缀的 JSON 为准。构建有既有 chunk 大小提示，退出码为 0。未运行安全类测试；`verify:v2-bn8-runtime` 总门因包含工单禁止的安全测试，留 HQ 执行，以上独立检查不冒充总门通过。

没有 commit/push/PR/merge，没有写入 `.git`、agent 指令或权限配置；开工时已有的其他未跟踪文件未处理。工作树交 HQ，本回执不作主观验收或放行。
