> **状态 (Status)**: ready(候 D1 收口后派发,单 builder 串行)
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
