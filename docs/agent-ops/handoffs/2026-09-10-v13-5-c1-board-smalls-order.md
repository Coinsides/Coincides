> **状态 (Status)**: done（builder 施工回执；docs 索引/完整总门留 HQ）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: Henry 09-10 小件清单全拍(波次 C);item 卡调大小=13.4 修一时代 finding;板吸附=板打磨族
> **单号**: 13.5 · C1 · 板面两小件(item 卡调大小 + 拖动吸附)

# 13.5 C1 · 板面两小件

## 一 · item 卡调大小

- 板上 item 投影卡获得与其他成员同族的 resize 手柄;拖拽改 w/h 持久化(board_members 现有 w/h 列);最小尺寸护栏(裁量申报);进 BoardCommandHistory 可撤;
- ⛔改 item 卡内容渲染语义;⛔动其他成员 resize 行为。

## 二 · 板拖动吸附

- 拖动板对象(成员/粉笔/搬入物)接近其他对象**边缘/中线**时:显示对齐参考线+吸附(阈值按屏幕像素,裁量申报,建议 ~6px);松手位置=吸附位;
- 修饰键旁路吸附(键位裁量申报,⛔与既有 Alt 减选/Ctrl 累加撞车);
- ⛔吸附网格(只做对象间对齐);⛔动 marquee/选区手势;群拖吸附以拖动主对象为准(裁量申报)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①item 卡 resize 手柄出现,拖拽改大小持久+刷新保持+undo/redo(修前断言现状:无手柄);②最小尺寸护栏;③拖动接近另一对象边/中线→参考线显示+吸附,松手=吸附位,undo 一步;④修饰键旁路生效且不与减选/累加冲突;⑤板命令栈/选区精修/修四全回归+全库。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 裁量申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder。板对象边缘/中线吸附与参考线已完成；item resize 已存在，本单保留实现并补齐命令历史验证。未 stage / commit / push。工程结果待 HQ 复核，不代行放行。

### 修前现状断言

- **①「无手柄」假设不成立**：开工未改代码时，`BoardPage.tsx` 已对所有未 Pin 的成员渲染 `Resize …` 按钮，item 无排除分支；`BoardPage.item.test.tsx` 原有 resize smoke 已验证 zoom=2、w/h PATCH、160×100 护栏及重开。修前 client 全库 **109 文件 / 1148 tests PASS**。Chrome 合成场景选中 item 后也能看到右下手柄。因此没有重复新增手柄、改动 item 正文或其他成员 resize 算法。
- **③修前无吸附**：Chrome 现有 `mixed sample`，A 初始 `(80,80)`，相同实拖从屏幕 `(120,280)` 到 `(517,430)`，合成 transport 记录唯一 PATCH `{x:477,y:230}`；另一卡左边缘为 x=480，3px 差距未对齐。源码 move 路径只加原始 dx/dy，无参考线/吸附计算。修后同样操作唯一 PATCH 为 `{x:480,y:230}`。

### numstat

修改文件取 `git diff --numstat`；三个未跟踪新文件按完整新增行数计，未为取数而 stage。除本回执外共 **8 文件，+498 / -7**。

| 文件 | + | - |
|---|---:|---:|
| `client/src/pages/Boards/BoardPage.tsx` | 50 | 5 |
| `client/src/pages/Boards/Boards.module.css` | 2 | 0 |
| `client/src/pages/Boards/boardSnapping.ts`（新） | 59 | 0 |
| `client/src/pages/Boards/boardSnapping.test.ts`（新） | 79 | 0 |
| `client/src/pages/Boards/BoardPage.snapping.test.tsx`（新） | 190 | 0 |
| `client/src/pages/Boards/BoardPage.item.test.tsx` | 108 | 0 |
| `client/scripts/boardToolsSmoke/fixture.tsx` | 1 | 1 |
| `client/scripts/boardToolsSmoke/mockApi.ts` | 9 | 1 |

本工单 **+68 / -1**（状态行替换和 Result 追加，原工单正文保留）；含回执总计 **9 文件，+566 / -8**。

### 五项冒烟

| # | 结果与证据 |
|---|---|
| ① item resize / 持久 / 重读 / undo-redo | **PASS（修前假设纠偏如上）**。原有 4 条测试保留，新增后 item 文件共 8 tests。zoom×scale 分别为 `0.5×2`、`2×1.5`：预览零写入，松手仅一次 w/h PATCH，undo 一步耗尽、redo 恢复，卸载重挂后 GET 保持尺寸/scale/正文。Chrome 实拖 `260×156 → 380×236`；Ctrl+Z 回到 `260×156`，Ctrl+Shift+Z 恢复 `380×236`，`Reopen saved board` 后 DOM 仍为 `380px×236px`。 |
| ② 最小尺寸护栏 | **PASS**。沿用成员本地尺寸 `w≥160 / h≥100`，原 zoom=2 测试覆盖越界缩小；Chrome 实拖缩至护栏，唯一尺寸 PATCH `{w:160,h:100}`。新增验证 Pin 无手柄/几何不动，pointercancel 恢复原尺寸、零写入/零历史。 |
| ③ 边/中线参考线+吸附/松手/一步撤销 | **PASS（证据分层）**。`BoardPage.snapping.test.tsx` 11 tests + `boardSnapping.test.ts` 9 tests：边/中线与两轴对齐、0.5/1/2 zoom、6px inclusive/界外、SVG 线的屏幕位置、最终 pointerup 位置、一步 undo/redo、GET 重挂；粉笔和旋转缩放 shape 复用可见 bounds。Chrome 同修前实拖保存 `(480,230)`，单步 undo 回到 `(80,80)`。拖动中线段存在及坐标由组件 DOM 断言证明；没有将松手后截图冒称拖动中线段截图。 |
| ④ 修饰键旁路/选区不冲突 | **PASS（组件事件验证）**。已开始拖动后按 Shift，参考线立即消失，位置从 x=480 回到原始 x=477；不移动鼠标而松 Shift 会恢复吸附；pointerup 携 Shift 时保存 x=477。Ctrl 点击累加、Alt 点击减选、Shift 点击 toggle、Alt marquee 保持原语义。修四既有 Ctrl 累加/Alt 缩框恢复等 7 tests 全绿。 |
| ⑤ 板命令栈/选区精修/修四/全库 | **PASS**。既有 `useBoard.history` 11、`BoardPage.tools` 6、`BoardPage.selection` 7 全绿；群拖仍一次命令、Pin 跳过、取消不写入、旧保存回包不清新拖动 draft/参考线。B4–B10 的 TextFlow history/document/rangeRecovery/extraction、unitHandle 21、inlineLifecycle 56、graphemes 9 等均随全库执行；相关生产代码未修改。最终全库 **111 文件 / 1172 tests PASS**，无用例或文件过滤。 |

### 验证命令与过程

- 修前：`npm.cmd --prefix client run test:unit`，109 / 1148 PASS；日志 `.codex-tmp/c1-baseline-tests.log`。
- 修后最终：`npm.cmd --prefix client run test:unit -- --maxWorkers=4`，111 / 1172 PASS，32.00s；只限制并发，不过滤测试；日志 `.codex-tmp/c1-client-tests.log`。
- 过程如实记账：第一轮整跑新增首条拖动测试未等挂载效应完成，断言得到原位；加 `act` 等待后 C1 全绿。下一轮默认并发整跑中既有 `groupGalleryPurposeRetirement` 出现一次保存读回旧标题；未改该测试或实现，最终降低并发的完整整跑通过。未将前两轮写成全绿。
- `npm.cmd --prefix client run build`：**PASS**（含 `tsc -b` typecheck + Vite build）；`npm.cmd run build`：**PASS**（server tsc + manifest 校验/复制）。client 仍有 bundle >500kB 提示，非失败。
- 原 runtime 总门按组成命令执行：tool-face registry / manifest / parity 的既有整套测试与检查、server shared runtime import、canvas runtime boundary、group-gallery / groups-rail / single-editor shell、source experience、V11 legacy shutdown / relation freshness 均 PASS；model contract **60 组 PASS**、performance **5 场景 PASS**。日志 `.codex-tmp/c1-gate-*.log`。
- `git diff --check` PASS；`git diff --cached --stat` 为空。`docs:check` 因索引过期失败，另行检查 docs inventory 与 glossary 均 PASS；总门边界见停线。

### 裁量申报

1. **item 最小尺寸**：沿用已有成员护栏 `160×100`（乘 projection scale 后呈现）；resize delta 仍除 `zoom×scale`。未改 visual 的 `16×16` 或其他成员行为。
2. **吸附阈值**：每轴 **6 屏幕 px，含边界**；比较两对象各自左/中/右、上/中/下，允许边对中。每轴只选最近命中；精确平局按目标场景顺序，再按边/中/边遍历顺序稳定取首个。
3. **旁路键**：**先开始对象拖动，再按住 Shift**。按/松无需额外 pointermove 即更新；Shift 起手点击仍执行既有 toggle。Alt/Ctrl/Meta 选区入口未改，无额外字母快捷键。
4. **群拖主对象**：采用实际抓取的可移动对象，整组共享其吸附 delta，排除整组移动对象作为候选。沿用既有从已选 Pin 对象/连接边带动群拖的入口，此时抓取物不在 movable 中，回退该组场景顺序首个 movable；Pin 自身不移动。
5. **候选与边界**：当前板所有可见、已放置的成员/visual，允许跨可见图层；Pin 可作参考；隐藏层、暂存卡排除。旋转/scale visual 沿用 `visualBounds` 的世界轴对齐包围盒。连接边不单独当吸附目标，不做网格、等距分布或 resize 吸附。
6. **显示与机关**：每轴至多一条参考线，覆盖命中双方范围，端点外扩 8 屏幕 px；沿用 accent token，1 屏幕 px 线宽、pointer-events:none。新增 helper 只算几何，临时 guides 只负责显示；保存、撤销、失败恢复继续走既有 `groupDraftsRef → updateGeometryBatch → BoardCommandHistory`，没有平行持久化或历史机关。开始新手势/松手/取消/换板清参考线，异步保存不参与其后清理。

### 未做

- 未 stage / commit / push；未读取 `.env` 或 key 值；未接触用户库；未新增或专项运行安全类测试，未做凭据扫描。既有客户端及上述总门测试均以整套命令执行。
- 未改 item 正文语义、成员 resize 算法、marquee/选区规则、B4–B10 TextFlow 生产代码、server schema/board_members 列或 API。
- 浏览器只使用 `client/scripts/boardToolsSmoke/start.mjs` 合成 fixture（`envFile:false`、内存 transport、无后端连接）。本单的「重读保持」证明已保存 transport 数据经 GET 重新挂载后保持；**未拿用户库做真实服务重启或整页刷新持久化验证**。Shift 按住期间的实鼠标拖动未单独真机走查，已由组件事件测试覆盖。
- 原样 `npm run verify:v2-bn8-runtime` 未执行，因为尾项含本单明禁的凭据扫描；不得据分项通过宣称完整总门通过。HQ 主观验收与完整总门仍保留。

### 停线 / needs: HQ

- **docs 总门停线**：`docs:check` 报 `docs/agent-ops/INDEX.md` 过期，发现时本单尚未写任何 docs，且该 INDEX 无工作区 diff。未越域重写权威目录索引；本回执状态变化后的索引同步也留 HQ。docs inventory / glossary 单独检查已绿。
- **完整 runtime 总门/凭据扫描留 HQ**：功能项和可执行分项通过，不代表扫描或总门放行。
- **工单假设差异备案**：①无手柄被现物否定，采用保留既有 resize + 补验证；无其他功能停线、无设计翻牌请求。
