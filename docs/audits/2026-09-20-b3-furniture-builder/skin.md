> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；实现与亲跑收据，放行归 HQ

# B3 绢本皮：考古、实现与定向证据

工单：`docs/agent-ops/handoffs/2026-09-20-v14-b3-furniture-skin-order.md` §二、§四。UI 名称选 **绢本**，出厂枚举 `silk`。

## 现物与存法

- B1a 纸面九 token 为 `desk / paper / ink / ink-muted / accent / annotation / hairline / danger / wall`；现役共享表已由 B1b 扩为十三项，另含 `board-desk / card / edge / chalk`。本单未增 token 名、未新建列或真相表。定义在 `shared/types/skin.ts:8`。
- 三级挂点仍为全局 `user.settings.skin` → 项目 `course.skin` → 本纸 `note.metadata.skin`，后一个非空选择替换前一个完整预设快照，再叠自身 overrides；空选择继承父级。现役板沿同一方式将本地挂在 `board.skin`。解析在 `client/src/styles/skinPresets.ts:52`，纸/板入口分别在 `client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.ts:22`、`client/src/pages/Boards/useBoardSkin.ts:14`。
- 皮存值仍为 `{preset, materialPreset?, overrides?, components?}`；颜色覆盖支持六/八位 hex 或现役 `palette:<uuid>`。`silk` 进入原出厂枚举与服务端校验表（`shared/types/skin.ts:2`、`server/src/validators/skin.ts:5`）；沿既有 settings/course/note/board 路径保存，未新开写门。
- 考古确认旧四皮原本是单份完整快照，应用亮暗设置来自 `user.settings.theme`。本单只给第五皮添加亮伴生值；`resolveSkin` 新增第六可选 theme 参数，默认 dark，旧四皮解析结果不随 theme 改变。用户套装保持现役完整快照语义：保存当时亮/暗的实际色值，后续主题切换不改其快照。

## Token 表

| token | 亮 | 暗 | 依据 |
|---|---|---|---|
| desk | `#e7dfcf` | `#17130e` | 工单明示 |
| paper | `#faf5e9` | `#f2ead7` | 工单明示；暗桌暖亮纸 |
| ink | `#2d2418` | `#2d2418` | 墨族沿亮值 |
| ink-muted | `#6a5c46` | `#6a5c46` | 墨族沿亮值 |
| accent | `#5f8f81` | `#5f8f81` | 汝青沿亮值 |
| annotation | `#9a7016` | `#9a7016` | 批注金沿亮值 |
| hairline | `#d8cbae` | `#d2c4a2` | 工单明示 |
| danger | `#a63b2a` | `#a63b2a` | 朱沿亮值 |
| wall | `#d8cbae` | `#d2c4a2` | 申报：复用各模式发丝线 |
| board-desk | `#e7dfcf` | `#17130e` | 申报：同桌面 |
| card | `#faf5e9` | `#f2ead7` | 申报：同纸面 |
| edge | `#5f8f81` | `#5f8f81` | 申报：同汝青 |
| chalk | `#2d2418` | `#f2ead7` | 申报：亮桌墨、暗桌暖亮粉笔 |

没有另做暗色微调。代码位置：暗快照 `client/src/styles/skinPresets.ts:10`；亮伴生 `:14`；绢本部件默认 `:24`（衬线题名、系统标签、舒适密度、胶囊把手、表头线显示/content/solid）；UI 名称 `:29`；模式分支 `:63`。

## 接线与旧件保留

- 纸面实际样式与悬停预览同读主题：`client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.ts:23`、`:39`、`:41`。既有纸面/portal/打印的 skin style 传播路径继续消费该解析结果。
- 板面同族取色：`client/src/pages/Boards/useBoardSkin.ts:15`、`:31`。
- 编辑器预览：`client/src/components/Skin/SkinEditor.tsx:20`、`:33`。
- 套装馆卡片与摘要：`client/src/pages/DesignStudio/SuiteDrawer.tsx:18`、`:31`、`:65`。第五卡继续由 `SKIN_PRESET_IDS.map` 产生，无单独缩略图资产。
- `SkinControls.tsx` / `SkinFloatCard.tsx` 的模式参数由表头部件并行任务接入，仍用原卡片生成机制；没有新存储字段表示亮暗。
- 只读 `git show HEAD:client/src/styles/skinPresets.ts` 对照：旧四 token 行、四部件行、合并名称行共 **9 行原定义字节一致**（仅归一行尾再比较）。SHA256 `0ec4a11122535650df31df323c35963924ac779ba20fbba0ae6f95e3e0e9fe9f`。脚本及原始结果在 `.codex-tmp/b3-furniture/skin-preservation.mjs`、`skin-preservation.log`。未运行 git 写操作。

## 定向验证

1. `npm.cmd run test:unit -- --reporter=verbose src/styles/skinPresets.test.ts src/pages/Notes/canvasEngine/hooks/useNoteSkin.test.ts src/pages/Boards/useBoardSkin.test.tsx src/pages/DesignStudio/SuiteDrawer.test.tsx src/components/Skin/SkinEditor.test.tsx`：**5 文件、62 测试通过**。日志 `.codex-tmp/b3-furniture/skin-client-targeted.log`。
2. `node --import tsx --test src/__tests__/v13PaperSkin.test.ts`：**6 测试通过**。原有往返/数据库重开测试的预设矩阵扩到第五项，覆盖 settings、project、note 和 board。日志 `.codex-tmp/b3-furniture/skin-server-targeted.log`。
3. 新定向断言位置：`client/src/styles/skinPresets.test.ts:42`（亮暗九色、旧四皮模式不变、三挂点覆盖、palette 引用、套装快照）；`client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.test.ts:180`（实际纸面及 hover preview 主题切换且无皮写入）；`client/src/pages/Boards/useBoardSkin.test.tsx:85`（板面伴生）；`client/src/pages/DesignStudio/SuiteDrawer.test.tsx:60`（生成卡及 token 摘要）；`server/src/__tests__/v13PaperSkin.test.ts:21`、`:98`（五预设存取往返）。
4. 已按 `vercel:react-best-practices` 做已改 TSX 检查：主题订阅使用 primitive selector，memo 依赖含 theme，未加额外 effect、监听或请求。没有新依赖。

原始现物摘录在 `.codex-tmp/b3-furniture/skin-archaeology.log`。首次 `npm` 命中被 Windows 策略禁用的 `npm.ps1`，未开始测试；随后使用既有 `npm.cmd` 成功，说明留 `skin-environment.log`。

## 边界

本页只申报皮子任务定向验证，不替代 client 全库、server 全量及非 git/secrets 验证组件；完整门未宣称通过。真实浏览器截图、家具样式、去盒及说明书回填由主 builder 汇总。本子任务未改变旧四预设、TextFlow schema、page_frame_local、Relation 或 Agent 机关。

## 后续正向往返补验：绢本套装材质

表头部件与套装往返补验发现旧 migration 072 的 `skin_suites.material_preset` CHECK 仍枚举四旧皮。第五皮解析和笔记 JSON 保存都可用，但「存为套装」携 `materialPreset:'silk'` 时返回 500；原始失败在 `.codex-tmp/b3-furniture/paragraph-server-targeted-suite.log:85`。该失败已修复，未改历史 072。

新增 `server/src/db/migrations/080_v14_silk_skin_material.ts:9`，只扩既有外观表同列 CHECK 的 `silk` 值；沿原 CREATE SQL 重建同表，保留全部七列、旧 rowid、旧行、显式索引/trigger 与原 users 外键。没有入向表外键；过渡表迁移后消失，未增加逻辑真相表。`server/src/__tests__/v14ParagraphFurniture.test.ts:27` 验证旧四值和 null 行、精确 schema 差异、索引/外键、幂等与无残余表。

同文件 `:105` 的现役 HTTP 测试已覆盖笔记 skin 表头三开关及绢本套装创建/修改/数据库重开；与两家具往返共 **4/4 通过**，日志 `.codex-tmp/b3-furniture/paragraph-server-targeted-migration.log`。服务端全量结果另见本目录 `paragraph-server.md`。
