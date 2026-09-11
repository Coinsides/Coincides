> **状态 (Status)**: done(builder 工作树交付；待 HQ 复核放行)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · 波次 D2 · 纸上表头 + 顶栏拆解
> **上游**: 09-11 表头案对谈(Henry 拍板:表头=标题+description,⛔emoji 图标⛔封面图;功能钮下沉底部工具条;返回钮死);顶栏清点=`NoteChromeLayer.tsx` 现物;`notes` 表 title/description 两列已在(schema.sql:405-406)——**零新真相**

# D2 · 纸上表头 + 顶栏拆解

## 零 · 裁定原文

1. **表头上纸**:首页顶部渲染 note 标题(大字)+ description(小字、弱色),Notion 式素净;**⛔emoji 图标,⛔封面图**(Henry 09-11 逐项拍);
2. **同一真相**:表头标题=notes.title(纸上改名=改名,与既有 onSaveTitle 同一保存链);description=notes.description 列(若现役 note 更新路由不收 description,在**既有人类路由**最小扩面,⛔新开专用路由);
3. **顶栏杀**:返回 Project 钮死(navigator 在);标题输入随表头上纸;功能钮**下沉底部工具条**(现物 NoteWritingSurfaceLayer 的 Write/Pen/Fit 一家);
4. **安静纸气质**:description 空态平时零可见,hover/聚焦表头区才显影占位("Add a description");⛔常驻占位噪音。

## 一 · 交付面

### 1. 纸上表头(首页)

- 只在首页(primary/首帧)渲染;标题与 description 内联可编辑(blur/Enter 保存;contentReadOnly 时只读);
- 表头文本区左右随墙(D1 的 contentInset.left/right 同样约束表头);
- **不变式**:①存量块存储坐标零改写;②表头与正文块零视觉重叠——机制自选(首页 top 位移/等效渲染带,实施申报),表头带高度**有界**(标题≤2 行+description≤3 行实测高,上限封顶,超限显示截断、编辑态内滚);③打印/overview/导出投影中表头呈现与纸面一致或显式申报差异。

### 2. 顶栏拆解(NoteChromeLayer 逐钮清点处置)

| 现物 | 处置 |
|---|---|
| 返回 Project 钮 | **杀**(page 宿主);modal 宿主保留一个安静关闭钮(右上浮点),接现 onRequestClose |
| 标题输入 | 上纸(§1),同保存链 |
| Source locked 徽章 | 迁底部工具条,安静 chip |
| Preview pill / Layout pill | 迁底部工具条(实功钮,Henry 拍) |
| New PageStack / 收藏 / Info / More(删笔记/已删块/Typography) | 收进底部工具条"⋯"菜单 |
| 折叠/展开钮(chromeCollapsed 全套) | **随栏死**,相关状态清理 |
| 各 popover(Info/Layout 面板/More/块回收站/导出预览) | 改锚底部工具条,向上弹出;功能零变 |

### 3. 保存边界语义保留(⚠️ 正确性件)

- 现 backToProject 在离开前 dismissTransientUI→blur→flushPendingSaves,失败 toast 挽留(NoteCanvasRuntime.tsx:29-46)。返回钮死后用户经 navigator/路由离开——**该冲洗边界必须保留**:路由离开/卸载时等效冲洗;若路由层无法完整复刻挽留语义,实施最大可行并在 Result 申报差距;
- BlockControlBarLayer 的 topBarSafeTop(顶栏避让裁切)按无顶栏重算。

## 二 · 禁区

⛔emoji 图标/封面图/背景图任何形态;⛔板卡封面改造(title 现役显示维持,联动候后续);⛔TextFlow-Contract 面;⛔改写块坐标;⛔新真相字段(title/description 两列足);⛔安全类测试;⛔碰 .git(工作树交 HQ);⛔改 CLAUDE.md/AGENTS.md/权限配置。

## 三 · 验收

- typecheck + build 绿;client 定向套件(chrome/runtime/相关 layers+hooks)绿;
- 冒烟(合成,⛔真库):①纸上改标题→保存→列表/navigator 同步新名;②录入 description→刷新仍在;③description 空态安静、hover 显影;④modal 宿主开关正常、关闭钮在;⑤底部工具条各钮/popover 全功能(Layout 开关、Preview、删笔记对话框、块回收站、Typography);⑥打字后立即路由离开→内容已存(冲洗边界);⑦无顶栏后块控制条/浮层裁切正常;
- 证据落 `docs/audits/2026-09-11-d2-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff 规模;顶栏逐钮处置对照表(计划 vs 实做);保存边界实现方式与差距申报;description 路由扩面申报(若做);冒烟证据路径;测试数字;冲突停线⛔自作主张。

## Result

**2026-09-11 · from: codex(builder) · to: fable(HQ)**

施工完成，工作树交 HQ；本回执不作主观验收或放行。未遇到需要改写工单的现物冲突。

### 交付清单与 diff 规模

- 新增 `NotePaperHeader`，只绑定既有 `notes.title` / `notes.description`。首部单实例，blur/Enter 保存、IME Enter 不误提交、来源只读；空 description 平时零可见，hover/focus 表头显影。没有 emoji 图标、封面或新增背景图片。
- 标题 40px 行高、最多 80px；description 24px 行高、最多 72px；表头总高封顶 **208 CSS px**。测量在显示层完成，超限失焦隐藏溢出、编辑态内部滚动；输入长度对齐既有路由 title≤300 / description≤2000。
- 采用**正文坐标原点之前的独立显示带**：只调整外部纸面 top / display extent / fit scale，正文 blockListRef 及原布局坐标不变。负 y 正文通过既有 display bounds 补偿；左右内距直接使用 D1 primary frame 的 contentInset.left/right。浏览器长文本实测 header bottom=367.52、正文 top=426.76，无重叠。
- 顶栏控件迁入现有 Write/Pen/Fit 工具条，清除 chromeCollapsed 全套状态和按钮；块控制条 page 顶裁切由 90px 改为宿主视口顶部+2px，modal 按其内容视口重算。
- page 新增路由保存屏障；modal 保留原宿主关闭链，原唯一关闭按钮改为右上安静浮点。
- **产品与测试：24 文件，+1156 / -334 行**（19 个修改、5 个新增）。不含工单回执、合成入口 `client/d2-header-smoke.html/.tsx` 和审计证据。逐文件计数及最终散列见 [diff-manifest.json](../../audits/2026-09-11-d2-builder/diff-manifest.json)。服务端/schema/migration/块坐标写入链/TextFlow 契约均无 diff。

### §一.2 逐钮处置对照

| 现物 | 工单计划 | 实做 |
|---|---|---|
| 返回 Project | page 杀；modal 安静关闭 | page 按钮及 backToProject 移除；modal 仅原 `Close note`，原 requestClose 链 |
| 标题输入 | 上纸、同保存链 | `NotePaperHeader` textarea → adapter 原 note PUT 保存链 |
| Source locked | 底部安静 chip | 已迁入底部，原 readonly 语义保留 |
| Preview / Layout | 底部功能钮 | 与 Write/Pen/Fit 同条；开关及原 handler 保留 |
| New PageStack / 收藏 / Info | 底部 ⋯ | 已收进 More，原 handler；收藏仍是既有后续持久化提示 |
| More 内删笔记 / 已删块 / Typography | 底部 ⋯ | 原删除确认框、回收站、字体控件保留；modal 删除仍按原规则禁用 |
| chromeCollapsed 折叠/展开 | 随栏删除 | 状态、props、controller 方法及按钮已清除；PageStack 自身折叠功能保留 |
| Info / Layout / More / 已删块 / ExportPreview popover | 底部锚点、向上弹 | 统一量测现有工具条，popup 底边位于工具条上方8px；scroll/resize/modal 拖动后重算，视口内滚动 |

### §一.3 保存边界实现与差距申报

`App.tsx` 用 `createHashRouter` / `RouterProvider` 保留原 hash 路径及路由树；`NoteDetail` 将当前 runtime handle 交给 `useBlocker` 边界。正常应用内 pathname 离开（含 navigator、push/replace、历史返回、note→note）保持原 runtime，按 **dismissTransientUI → 焦点恢复微任务 → 同步 blur → flushPendingSaves** 执行；flush 内先存 header metadata，再 TextFlow、draft idle、write registry idle。成功才 proceed；失败 toast + reset，留在原笔记。多个离开目标共用待存屏障，旧 note 的异步回执不能覆盖新 note。

慢保存等待期间暂时暂停 page runtime、浮层及编辑快捷键输入，blur 后设置临时 inert；成功/失败/卸载均解除，防止等待时的新草稿越过保存批次。modal 原 requestClose 的 dismiss/blur/flush 与失败挽留机制保留。浏览器连续失败实测已留页，恢复编辑后重试成功。

**已知差距**：物理刷新/关页只能在 beforeunload 同步启动 dismiss/blur/flush，不能让浏览器等待异步请求，也不能保证失败挽留；未增加无条件离页确认。非 router 强制卸载仅通过保留 handle 尽力 drain，不能保证已失活 TextFlow scope 内未登记草稿。相同 pathname 的 query/hash 变化不拦截，当前不会替换 note/runtime。生产统一使用 data router；旧 MemoryRouter 单测 fixture 不安装 blocker。

### description 路由及投影申报

**没有扩面、没有新增路由**：既有 `PUT /notes/:id` 已接收 nullable description；client 复用其字段保存，空白描述归一为 null。title/description 以同一 note 的队列、字段回执和草稿 revision 护栏避免相互覆盖，仍以 notes 两列为唯一真相。

**显式投影差异**：print 与 overview 保持原投影，不渲染新 title/description 表头、不计入表头显示带；ExportPreview 继续既有块/页面边界模型，也不含该显示带。navigator 当前只有项目投影，没有 note-title 行；改名同步通过实际 Notes 列表重新读取验证。Board 卡面标题保持现状，未施工联动。

### 冒烟证据与测试数字

证据目录：[docs/audits/2026-09-11-d2-builder/](../../audits/2026-09-11-d2-builder/README.md)。真实 Chrome + 实际 client runtime + 全量截获的本地合成行，未访问真库。已覆盖：改名列表同步、description 刷新、空态 hover、有界长文本、modal 关闭保存/重开/Escape、底栏菜单与各 popover、New PageStack、readonly 来源、打字立即路由离开、连续失败留页/重试、块控制条滚动裁切。合成请求账本显示存量块 x/y/width/height 始终为 0/0/650/120，header 编辑没有坐标写请求。

| 检查 | 完成态结果 |
|---|---|
| client 定向 layers/hooks/runtime/modal/navigator | **20 文件，261 passed / 0 failed / 0 skipped** |
| 其中新增 route save boundary suite | **9 passed** |
| client typecheck（tsc -b） | exit 0 |
| server typecheck（tsc --noEmit） | exit 0 |
| client build | exit 0 |
| server build | exit 0 |
| runtime boundary 独立检查 | **159 passed** |
| model contract smoke | **60 groups passed** |
| 只读 diff whitespace 检查 | exit 0 |

原始命令/退出码/测试 JSON 见证据目录 `validation/`；初跑 fixture 缺字段的失败和修正后重跑记录均保留，完成态以无 attempt 后缀回执为准。**未运行安全类测试**；`npm run verify:v2-bn8-runtime` 总门包含本单禁止的安全检查，留 HQ 执行，独立检查不替代总门。未 commit/push/PR/merge，未写 `.git`、agent 指令或权限配置；开工已有无关未跟踪文件保持原状。
