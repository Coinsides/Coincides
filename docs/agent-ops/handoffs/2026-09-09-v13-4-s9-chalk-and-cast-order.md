> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次三单 9;裁定依据=对谈拍定一(铸造论:板上写字升格目标=item ⛔随手成笔记)+量水深报告题三(`analysis/2026-09-09-v13-4-s1-item-depth.md` §三)
> **单号**: 13.4 单 9 · 板上写字(粉笔 + 铸卡)

# 13.4 单 9 · 粉笔 + 铸卡

**使命**:板上能写字——**粉笔**(板自有短注记,不进知识体系)与**铸卡**(粉笔升格为 item,领户口)。

## 零 · HQ 已裁(⛔ 复议)

1. **粉笔=board_visuals 新 kind `sticky`**:纯文本短注记,⛔ 富文本/⛔ 字号面板(简陋是立场);长度上限 280 字符(常量,可调);⛔ 被引用/⛔ 进组/⛔ 进准备区——想进知识体系唯一出路=铸卡;
2. **入口**:select 工具下**双击板面空白**=原位起草粉笔(输入框就地,Escape 弃,失焦/Enter 存);双击既有粉笔=编辑;拖移/删除/pinned 走单 A 已通的 visual 通道;
3. **铸卡=board 域新端点单事务**:createItem(body=粉笔文本,origin=板)→ mount item member(几何继承粉笔位置,z 保留)→ 删粉笔 visual→记 mounted(既有通用记账,⛔ 新 verb);入口=选中粉笔的 selectionBar "Cast to item"(右键有则同挂);
4. **origin 扩展(量水深题三定案)**:新迁移 `items.origin_board_id` nullable FK REFERENCES boards **ON DELETE SET NULL**;resolveOrigins 扩 board(同用户校验);**note/board 出生地互斥**(schema 校验两者不同时给);**course 留空**(⛔ 从板弱标签快照);createItem 写门开 origin_board_id;**castItem ⛔ 动**(board ⛔ 冒充 CG pool);
5. 消费面:Item Inspector 与摘要 DTO 补出生板显示("Born on board <name>";板已删=出生地不可达降级文案,item 正文照常);板生 item=standalone(无 origin note),沿单 1 已裁"双击禁用有提示"。

## 一 · 交付面

- 迁移+base schema(origin_board_id)+validators/DTO/hydrate/资源链(量水深 §三.3 生产者清单按实需接线,⛔ 顺手扩所有清单);
- sticky visual:schema data(text)+渲染(便签样式小卡,与 item 卡明显区别:无徽章无源名)+就地起草/编辑 UI+280 上限(超限拒绝有提示);
- cast 端点+client 接线(selectionBar 按钮→确认或直接执行→板上原位换卡)。

## 二 · 裁量与停线

- 停线举证不改判;⛔ 动 047 既有列/castItem/annotation 面;⛔ 新 event verb;
- sticky 的 data schema 沿 board_visuals data JSON 惯例(freehand 先例);
- 铸卡后粉笔文本若超 item 正文规约(空白等),normalizeItemBody 拒绝时给用户可读错误,⛔ 静默吞。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards/items 测试面)不破;
- 冒烟五条:①双击空白写粉笔,重开仍在;②粉笔可拖/可编辑/可删/可 pin;③选中粉笔铸卡:粉笔消失、原位 item 卡、GET /items 可见该 item 且 origin_board 正确;④Inspector/摘要显示出生板名;⑤删出生板(单 A DELETE):item 仍在、origin 降级显示、正文无损。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。

## Result

**2026-09-09 · Codex builder 续工完成；仅施工回执，不代 HQ 放行。** 先完整读本单，再以 `git status --short` / `git diff` 核对中断现物。接手时已有 20 个 tracked 文件差异（+256/-32），另有 BoardChalk、chalk 测试、060 与共享常量半成品；本轮保留这些实现，只补缺口。§零五裁未改判。

### 完成面与续修点

- 保留并验证 sticky visual、280 上限、就地新建/编辑、Escape 弃稿、Enter/失焦保存、visual 拖移/删除/pinned 通道；修复共享常量的 Vite runtime alias 解析失败。
- 保留 `POST /api/boards/:boardId/visuals/:visualId/cast`：同一 recorded-action 事务内创建 Item、继承 x/y/w/h/scale/z/pinned 挂板、删除粉笔、写既有 `mounted`。空白正文给固定可读提示，失败保留粉笔；存储收据失败时 Item/Snapshot/挂载/粉笔/事件一起回滚。
- 保留 migration 060/base schema 的 nullable `origin_board_id` FK / `ON DELETE SET NULL`；note 与 board 互斥，board 出生的 course 留空。同用户查验沿 resolveOrigins；未改 047 或 `castItem`。
- 补实际资源链缺口：toolFace 的严格 Item 输出 schema 接入 origin_board_id/title，并同步生成 manifest；原生 get/list/cast DTO 通过严格解析。未扩无需求的查询清单。
- 补板上 Item 摘要卡出生板显示，Inspector 与 summary DTO 沿已有半成品接线；板名为当前读取值，删除后 `Birthplace unavailable`，不改正文。无 origin note 的卡保留双击禁用提示。
- 补 pending 铸卡期间不得再次打开粉笔编辑器，以及编辑草稿期间键盘删除不得绕过按钮禁用；补两条对应竞态回归。
- 修复遗留测试的不支持参数、错误提示断言和历史迁移夹具（057 比较不能提前继承 060 列/kind）；新增迁移保行、真实 HTTP 生命周期和事务回滚测试。

### numstat

以下是对 HEAD 的本单累计产品/测试/manifest 差异，**包含继承半成品，不冒充本轮净新增**。24 个 tracked 文件取 `git diff --numstat`；5 个未跟踪源码按完整新文件行数列出（标 `new`）。合计 **29 文件，+1001/-34**；另有本回执 **+79/-1** 与自动状态索引 `docs/agent-ops/INDEX.md` **+1/-1**，最终本单 **31 文件，+1081/-36**。开工已有的 `.claude/settings.local.json`、audits 与 brainstorm 未跟踪文件未改、未计入。

```text
71   7  client/src/pages/Boards/BoardPage.tsx
14   0  client/src/pages/Boards/Boards.module.css
10   0  client/src/pages/Boards/boardRepository.ts
3    1  client/src/pages/Boards/boardTypes.ts
11   1  client/src/pages/Boards/useBoard.ts
15   0  client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.test.tsx
2    1  client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx
2    0  client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts
18   2  client/src/services/itemSummaryReader.test.ts
9    0  client/src/services/itemSummaryReader.ts
28   0  docs/generated/tool-face-manifest.json
7    0  server/src/__tests__/helpers/v13BoardsFixture.ts
1    1  server/src/__tests__/v13BoardSchema.test.ts
2    2  server/src/__tests__/v13BoardServices.test.ts
9    7  server/src/__tests__/v13ItemFloor.test.ts
3    1  server/src/db/schema.sql
16   0  server/src/routes/boards.ts
33   2  server/src/services/boards.ts
5    2  server/src/services/itemSummaries.ts
22   5  server/src/services/items.ts
2    0  server/src/toolFace/registry.ts
7    1  server/src/validators/boards.ts
9    1  server/src/validators/index.ts
2    0  shared/types/itemSummary.ts
65   0  client/src/pages/Boards/BoardChalk.tsx (new)
352  0  client/src/pages/Boards/BoardPage.chalk.test.tsx (new)
233  0  server/src/__tests__/v13BoardChalk.test.ts (new)
48   0  server/src/db/migrations/060_v13_board_chalk_items.ts (new)
2    0  shared/types/boardSticky.ts (new)
```

### 编译、构建与定向回归

- client/server 各自 `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`：PASS；各自 `npm.cmd run build`：PASS。资源 schema/manifest 补齐后 server typecheck/build 再跑 PASS，manifest 检查 14 public 条目且生产副本已复制。Vite 使用显式空 `COINCIDES_VALIDATION_ENV_DIR`，未读取项目 env 文件。构建现有大 chunk、动态/静态混合 import、递归 schema 警告仍在，均非编译失败。
- client：`node node_modules/vitest/vitest.mjs run src/pages/Boards src/services/itemSummaryReader.test.ts src/pages/Notes/canvasEngine/panels/ContentGroupPanel.test.tsx` → **11 files / 74 tests PASS**；其中 chalk 12 条。
- client 摘要消费者回归：`node node_modules/vitest/vitest.mjs run src/pages/GroupGallery/groupGalleryItemSummary.test.tsx src/pages/GroupGallery/GroupGallery.test.tsx` → **2 files / 21 tests PASS**。合计 client **95 条**。
- server：`node --import tsx --test src/__tests__/v13BoardChalk.test.ts src/__tests__/v13BoardServices.test.ts src/__tests__/v13ItemFloor.test.ts src/__tests__/v13BoardSchema.test.ts` → **14/14 PASS**。
- server：`node --import tsx --test --test-name-pattern='^(13\.3 synthetic HTTP smoke|real route event failures|route wrapper commits synchronous|an event insert failure)' src/__tests__/v13BoardRoutes.test.ts src/__tests__/v13RecordedAction.test.ts` → **4/4 PASS**。
- server：`node --import tsx --test --test-name-pattern='^(Item lifecycle keeps|pool Anchors support|cast fault injection rolls|claimed receipt and Item survive)' src/__tests__/v2Items.test.ts` → **4/4 PASS**。合计 server **22 条**；严格资源 DTO 补齐后 chalk **4/4 再跑 PASS**，不重复计数。前两组仅 `:memory:`；最后一组仅既有 `mkdtemp/coincides-items-*/test.db` 显式临时库并清理，均无应用启动/env loader。未选认证、跨用户或其他安全测试；fault injection 仅业务存储失败的原子性验证。
- 12 项允许的 runtime 子门通过：`check:canvas-runtime-boundary`（159 checks）、`check:group-gallery-shell`（8）、`check:groups-rail-shell`、`check:single-editor-shell`、`check:v2-bn11-legacy-shutdown`、`check:v2-bn11-relation-freshness`、`check:server-shared-runtime-import`（203 产品源文件/0 violations）、`check:source-experience`、`smoke:canvas-engine-model-contract`（60 groups）、`smoke:canvas-engine-performance`（5 scenarios，共 13.11 ms）、`docs:check`、`check:tool-face-parity`（14 public entries；该静态门自身不声明 human reachability 已验）。`git diff --check` PASS。

### 五冒烟逐条

**验证面**：真实 Chrome 新标签页 → 实际 BoardPage / useBoard / repositories → 专用 localhost HTTP → 实际 boards/items routers、validators、services → 全迁移 `:memory:` 库。前端 41739、后端随机端口 53190，均非用户服务端口；固定合成用户，无 token。Inspector 使用真实 ContentGroupPanel 与真实 Item GET，临时 UI 分组不持久化，辅助 anchors/relations 返回空列表，故不声称验证了这些域。辅助夹具位于 `.codex-tmp/s9-browser/`，运行前后 JSON 留于其中；可常驻复跑的功能证据在上述 chalk 前后端测试中。本次主机与浏览器标签收工已关闭。

1. **① PASS — 双击空白写粉笔、重开仍在。** select 下在空白坐标双击，输入 `Chalk survives reopening.`，Enter 保存；重载页面后 GET 重新读取，原位置短注记可见。无 Item 徽章或源名。
2. **② PASS — 可拖/编辑/删除/pin。** 实际拖移后坐标变为 x=950、y=244；双击改为 `Edited chalk becomes an item.` 并点击空白失焦保存。Pin 后再次拖动，前后 DOM geometry 完全相同；Unpin 成功。另起 `Disposable chalk.` 并用 selectionBar 的 Delete chalk 删除，该粉笔消失，保留粉笔仍在。Escape、超限拒绝与失败保稿另由常驻 UI 测试覆盖。
3. **③ PASS — 选中铸卡、原位换卡、GET /items 正确。** 点击 `Cast to item` 后粉笔数归零，同一位置出现 Item。HTTP 比较 x/y/w/h/scale/z_index/pinned 七字段逐项相等（950/244/240/160/1/1/false）；新 Item `408c5aa6-7415-4468-ae87-51478047c95b` 出现在真实 GET `/api/items`，origin_board_id=`44e9e97e-75ed-47e3-be30-c5493c8b217f`，origin_note/course 均 null；双击仍留当前板且有禁用提示。
4. **④ PASS — Inspector/摘要出生板名。** 板上摘要卡可见 `Born on board S9 Chalk birthplace`；进入真实 Item Inspector，编辑正文与出生板名均可见。服务 HTTP 测试另验证重命名板后 get Item/summary DTO 使用新板名，正文不混入出处文本。
5. **⑤ PASS — 删除出生板后 Item 仍在、出处降级、正文无损。** 先通过第二板 picker 挂同一个 Item，再从出生板 More → Delete board → 确认执行单 A 真 DELETE。第二板 Item 保留，摘要改为 `Birthplace unavailable`；重新打开真实 Inspector 也显示该降级文案，正文仍可编辑。HTTP 核对只剩一板、一个相同 ID 的 Item；origin_board_id/title 均 null，`body_json` 与 `current_snapshot` 和删除前逐字段一致。常驻服务测试亦核对全部 Item snapshot 行不变。

### 未做与停线事项

- **整体 `npm run verify:v2-bn8-runtime` 未执行，不能记作全绿。** 根 package.json 明确在该命令尾部串入 `check:changed-file-secrets`，与本单及续工令禁止安全测试/凭据扫描直接冲突；保留原门不删改，只执行上列允许子门。扫描与整门放行留 HQ，未自行豁免或改判。
- 未运行全量 client/server/auth/MCP 安全套件，未运行凭据扫描，未读 `.env`，未外传 key，未触用户库，未触发用户库迁移。未 commit / push / PR / merge，未修改 agent 权限文件、047、`castItem`、annotation 或新增 event verb；未做 Henry 主观体验签收/总部翻牌。
- CodeGraph 已按入口优先尝试，但 CLI 不在 PATH、无 callable MCP；`rg` 亦不可用，改为限定源码路径的 PowerShell 检查。浏览器 CLI 读取 Chrome DevToolsActivePort 被系统权限拒绝，未提权或修改配置，改用已可用 Chrome 扩展通道完成五冒烟。
- 浏览器夹具首轮白屏为临时 `fixture.css` 被 `/fixture` 代理截走返回 404；只改夹具文件名 `smoke.css` 后完成全部实走，未把白屏轮算 PASS。首轮编译/测试失败也已逐项修复并复跑，不掩盖中断半成品未验证的事实。工单翻 done 后 docs:check 检出状态索引过期，已运行 `node scripts/docs-index.mjs`，仅更新本单索引行后复跑通过。
- 无新增需推翻 §零裁定的产品停线发现；唯一未闭合验证门为上述禁止整跑的 runtime 总门。此回执不声称最终放行。
