> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次三单 7;现物证据=单 0 侦察附录⑧(placed 需显式契约,零几何≠状态;mounted 只记一次的承接面已在);Henry 拍定三(装卸区双向=码头)
> **单号**: 13.4 单 7 · 板级装卸区(双向码头)

# 13.4 单 7 · 板级装卸区

**使命**:板长出**装卸区**——收货零决策成本(先拿进来),落位才付摆放成本(延迟分类);同时预铸 Agent 交付码头(actor 字段)。**⛔ 第二自由画布:只列名字。**

## 零 · HQ 已裁(⛔ 复议)

1. **数据契约**:新迁移 board_members 加 **`placed` INTEGER NOT NULL DEFAULT 1**(存量成员默认已摆位)+ **`mounted_actor` TEXT NOT NULL DEFAULT 'human'**(Agent 码头预铸,本版恒 'human',⛔ 开 agent 写路);⛔ 新表;
2. **语义**:进装卸区=mount(记 mounted 一次,placed=0,几何列无语义);拖上板=PATCH 赋几何+placed=1(⛔ 再记事件——既有"几何 PATCH 无事件"契约不变);板面渲染过滤 placed=0(unplaced 不上画布、不参与连线/删除命中);
3. **UI**:右侧**略窄边栏**(约 280px),初始隐藏;板 chrome 加"Staging (n)"按钮唤出(n=unplaced 计数);行=kind 图标+名字/摘要一行+来源标签(源笔记名或"Board chalk"或 kind)+actor 徽章(human 隐式不显,留将来 agent 显);**⛔ 预览/⛔ 缩略图/⛔ 自由摆放**;
4. **卸货入口(v1 两条)**:①板 picker 每类候选加 "Stage" 动作(mount placed=0);②open-note 弹窗内选区工具栏加 **"Send to staging"**(复用单 2 铸锚+mount 链,placed=0)——弹窗与装卸区同开时正好演全流程;拖拽进装卸区手势候后⛔本单;
5. **triage 动词(行内)**:**Place**(拖行到板面落点→赋几何 placed=1;或按钮"Place on board"落网格默认位)+ **Remove**(unmount,走既有 unmounted 记账);对引用语义"退回来源"="Remove"(名单除名,真相无损),⛔ 另造第三动词;
6. **布局联动**:装卸区展开时 open-note 弹窗**让位靠左**(modal 定位偏移,两者并存不遮);装卸区关闭恢复居中;板面本身⛔缩放;
7. 文案家族=Staging/准备区(与笔记侧 tray 同心智不同器官);⛔ 动笔记侧 tray 代码。

## 一 · 交付面

- 迁移+base schema(placed/mounted_actor,含 059/060 后续号)+validators/DTO/hydrate(placed 进 member DTO;mount 契约加 staged 参数或 placed 显式);
- BoardPage:Staging 侧栏组件+按钮+计数;板面 placed 过滤;Place 拖放(HTML DnD 或 pointer,拖到板面 world 坐标落卡)+按钮落位兜底;Remove;
- picker "Stage" 动作;弹窗选区工具栏 "Send to staging";
- 弹窗联动定位(单 6 modal 加偏移态)。

## 二 · 裁量与停线

- 停线举证不改判;⛔ 动 tray/搬迁批次;⛔ 新 event verb;⛔ agent 写路;
- unplaced 成员在 GET 解析照常(reference 照解析,staging 行显示要用);
- 单 A 删板确认框的成员计数含 unplaced(数字要真)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards+modal+tray 面)不破;
- 冒烟六条:①picker Stage 一个 item→装卸区列出、板面不出现、重开仍在装卸区;②从装卸区 Place 上板→落卡 placed=1 有几何,重开保持;③弹窗内选段"Send to staging"→装卸区出现 range 行(带源笔记名),⛔ 板面直落;④装卸区行 Remove→名单除名(events 见 unmounted);⑤装卸区展开时弹窗让位靠左、关闭复原;⑥存量板成员迁移后全部 placed=1 显示如常(迁移保全)。

## 四 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。

## Result

> **From**: codex(builder) · **日期**: 2026-09-09 · **交付**: 工作树施工完成，待 HQ 复核/代账；未 commit。

已按 §零完成：061 迁移/base schema 给 board_members 加两列，无新表；mount / text-range 铸锚 mount 接受 placed=false，actor 恒写 human；Place 单次 PATCH 完整几何+placed=true，不新增事件；GET 继续解析全部成员。前端交付 280px 名单/计数、三类 picker Stage、弹窗选区 Send to staging、拖放/按钮 Place、Remove，以及弹窗让位和焦点环。未摆位成员不参与卡面、连线、删除命中、空板判定或板面 Z 计算；删板计数仍含全部成员。

客户端仅为旧在途响应保留读兼容：省略 placed 视为 true，省略 actor 视为 human；本版服务端 hydrate 始终返回明确字段。没有 actor 输入写路，没有修改笔记 tray 代码。

### Numstat

实现/测试 **24 文件，+972 / -57**，含 7 个新文件实际行数；不含本工单回执与开工前已有未跟踪文件。

文档另含本回执，以及自动生成的 docs/agent-ops/INDEX.md **+1 / -1**（仅同步本单 ready→done）。追加后 docs:check 曾报告此索引过期，运行既有生成器仅更新该索引，复跑已通过。

```text
58	7	client/scripts/boardOpenNoteSmoke/mockApi.ts
2	0	client/src/pages/Boards/BoardNoteModal.module.css
95	3	client/src/pages/Boards/BoardNoteModal.test.tsx
63	19	client/src/pages/Boards/BoardNoteModal.tsx
96	15	client/src/pages/Boards/BoardPage.tsx
4	1	client/src/pages/Boards/Boards.module.css
1	1	client/src/pages/Boards/boardRepository.test.ts
7	1	client/src/pages/Boards/boardTypes.ts
5	1	client/src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider.tsx
6	0	client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx
24	1	client/src/pages/Notes/canvasEngine/layers/SelectionTypographyToolbarLayer.tsx
6	0	server/src/__tests__/helpers/v13BoardsFixture.ts
2	0	server/src/__tests__/v13BoardServices.test.ts
2	1	server/src/__tests__/v13BoardTextRanges.test.ts
2	0	server/src/db/schema.sql
9	5	server/src/services/boards.ts
3	2	server/src/validators/boards.ts
213	0	client/src/pages/Boards/BoardPage.staging.test.tsx
24	0	client/src/pages/Boards/BoardStaging.module.css
63	0	client/src/pages/Boards/BoardStaging.tsx
83	0	client/src/pages/Notes/canvasEngine/hooks/useBoardStagingSelection.test.tsx
40	0	client/src/pages/Notes/canvasEngine/hooks/useBoardStagingSelection.ts
149	0	server/src/__tests__/v13BoardStaging.test.ts
15	0	server/src/db/migrations/061_v13_board_staging.ts
```

### 六条冒烟（逐条）

1. **PASS · Stage 与重开。** Chrome 合成夹具内通过真实 picker Stage “Synthetic staging Item”，Staging (1) 出现名字/源笔记行，板面无该卡；reload 后计数仍为 1，重新展开仍在名单。前端定向测试另覆盖 Note/Group/Item 三类。隔离 HTTP GET 验证 placed=false、reference 正常解析；同 id 重试不重复 mounted。
2. **PASS · Place 与重开。** 浏览器真实拖行落板，PATCH 得到 x=923、y=323、w=260、h=156、scale=1、placed=true；reload 后卡仍在原位置。按钮兜底和 zoom=2 下 world 换算有定向测试。隔离库逐行比较 Place 前后 events，完全不变；浏览器调用记录同样只有首次 mount 与后续一个 PATCH。
3. **PASS · 弹窗选区送入。** 真实 NoteCanvasRuntime 选中 “The selected passage stays alive.”，点击真实工具栏 Send to staging，新 text_range 行显示该摘要及 “Synthetic source note”，placed=false，未直落板。复用单 2 receipt/铸锚链；额外测试保存屏障、失败保留选区、重试及仅 modal 暴露入口。
4. **PASS · Remove。** 弹窗与侧栏并开时点击 range 行 Remove，计数归零、行消失；浏览器合成收据显示一次 unmounted。真实服务端隔离 HTTP 测试另查 events 最末 verb=unmounted，重复 Remove 不再记账，源笔记/Item 存续。board-owned 范围锚清理沿用单 2 unmount 逻辑。
5. **PASS · 左让位与复原。** 1920px 浏览器实测侧栏宽 280px、x=1640；modal 左边界约 172.8px→32.8px，右边界 1607.2px，与侧栏不遮；关闭后回到约 172.8px。board world 始终为 translate(0px, 0px) scale(1)。Tab 在弹窗/侧栏允许控件间显式循环；普通板面快捷键仍暂停。
6. **PASS · 存量迁移保全。** v13BoardStaging.test.ts 使用真实 pre-061 结构内存库，覆盖四类旧成员（含零宽、负坐标、非整数几何、pin/metadata）；迁移后全为 placed=1、actor=human，原字段/边不变，无新表，fresh/upgrade schema 一致，重复迁移保全。浏览器既有三张卡继续显示。未在用户库运行迁移。

### 验证实跑

- client 定向 **16 文件 / 119 tests PASS**：Boards 全目录、useBoardStagingSelection、trayService/useTrayController/useTrayRelocation；HTTP 为合成 mock。
- server 定向 **21 tests PASS**：BoardStaging/BoardSchema/BoardServices/BoardRoutes/BoardTextRanges/BoardChalk；仅 :memory: 与 127.0.0.1 随机端口，未启动产品服务。
- client tsc -b / npm.cmd run build、server tsc --noEmit / npm.cmd run build **PASS**。Vite/Vitest build/test 使用既有 COINCIDES_VALIDATION_ENV_DIR 指向本次新建空目录；浏览器 fixture 使用既有 configFile:false、envFile:false。
- 非安全静态/模型门 **PASS**：canvas-runtime-boundary（159）、group-gallery-shell（8）、groups-rail-shell、single-editor-shell、v2-bn11-legacy-shutdown、v2-bn11-relation-freshness、server-shared-runtime-import、source-experience、canvas-engine-model-contract（60 groups）、canvas-engine-performance（5 scenarios）、tool-face manifest freshness/parity、docs:check、git diff --check。
- 浏览器采用 client/scripts/boardOpenNoteSmoke/start.mjs：真实生产 UI + 合成内存/sessionStorage API；无 Vite 错误覆盖层，捕获 console error=0。**不是生产 API→DB 全链证明**，服务端契约由上述隔离库测试另证。浏览器标签与 5186 夹具服务已关闭。
- 编译有既有 recursive schema、混合 import、大 bundle 警告；测试有既有 React Router future warnings，均未阻断。

### 未做清单

- **未原样运行 npm run verify:v2-bn8-runtime**：末尾 check:changed-file-secrets 是用户明令禁止的凭据扫描。只执行上列允许子门，不声称总门全绿。
- 未跑全量 client/server 测试及 test:tool-face-registry、test:tool-face-manifest、test:tool-face-parity 的边界类测试；安全类与凭据扫描留 HQ。
- 未读任何 .env、未打印/传出 key、未读写或迁移用户数据库、未触碰 3001 产品服务。
- 未实现拖入装卸区手势、预览/缩略图/第二画布、agent 写路、新事件动词/新表；未改笔记 tray 或搬迁批次。
- 未 commit/push/PR/merge，未代做 HQ 放行或用户主观验收。

### 停线事项

**无未解决的施工阻断，未改 HQ 裁定。** 完整 verify 与安全类门因用户明确禁令未启动，交 HQ 执行，不等于全门放行。CodeGraph CLI/MCP 不可用后使用定向源码读取；browser-harness 因 Chrome 端口文件权限不可用后改用已连接 Chrome CUA 完成冒烟，没有申请或修改权限。
