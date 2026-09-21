> **状态 (Status)**: recorded
> **层 (Layer)**: Audit evidence
> **日期 (Updated)**: 2026-09-21
> **权威 (Authoritative)**: 否

# T6 浏览器夹具观察

使用 Chrome 的单独 agent tab，地址 `http://127.0.0.1:5198/`，标题 `T6 isolated UI fixture`。源码存 `.codex-tmp/t6-link/ui/`。只导入真实 TextBlockProjection、InlineLinkPicker、CSS 和现役文本创建服务；chapter/block/note 与导航回调全部为合成数据，未开用户应用页面，未启动后端或请求 `/api`。

| 操作 | 实际 AX/画面观察 |
| --- | --- |
| 初始渲染 | `link Description: 章节链接, Help: 打开链接`；编辑器保留完整中文正文；状态 `Ready` |
| 点击链接 | 状态变为 `Navigation clicked: heading`，证明实际覆盖层可接收点击 |
| Open target picker | 弹窗显示“链接到…”；左栏“本笔记章树”，含目标章节/目标内容块；右栏“本项目笔记”，含同项目笔记；焦点落关闭按钮 |
| 查看截图 | 1920×951 浏览器视口；正文链接 accent 下划线，未出现重复正文；双栏面板无溢出或遮断 |
| 点击同项目笔记 | 弹窗关闭，状态变为 `Picked: note`；焦点回到打开按钮，证明面板 pointer-events 生效 |
| Toggle deleted target | AX 中原 link 消失，仅剩 `text 章节链接`；正文与 `Picked: note` 保留 |

上述仅验证真实呈现组件的可点击性、失效惰性、面板布局与焦点恢复；三靶正式保存/导航、分页、B8、print/read_note 由定向集成断言覆盖，不将此夹具称为完整产品 E2E。未调用系统打印、未输出实际 PDF，主观验收留 HQ。

启动过程实报：第一次通过 `/@fs/.../.codex-tmp/.../index.html` 打开被浏览器报 `ERR_BLOCKED_BY_CLIENT`。独立根目录首次缺 React 依赖解析，随后 scratch Vite 配置指定现有 client node_modules 别名并使用内置 esbuild JSX，根地址成功打开。所有修正仅在 scratch；未安装依赖、未改产品 Vite 配置、未绕过安全提示。
