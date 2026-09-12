> **状态 (Status)**: done（builder 工作树交付；待 HQ 复核放行）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · B3 · Board–Item 身份桥(A+A3+B1+C1)
> **上游**: 深水报告 `docs/agent-ops/analysis/2026-09-09-v13-4-s1-item-depth.md` §一(现物勘察+选项对照);Henry 09-11 专场拍板(13.5 plan「专场裁定收口」§8);⛔回改历史迁移 047

# B3 · 身份桥

## 零 · 裁定原文(约束一切)

1. **A 案**:`boards.item_id` 一对一可空 FK+唯一约束(或等价桥);⛔共主键⛔给普通 POST /items 开指定 ID 通道;
2. **A3**:板名与身份描述**分立**——身份 Item 正文=独立描述(默认由铸造时生成一段中性描述,如「Board: <题名>」仅作初值,此后与板名**零联动**);⛔任何改名同步(漂移地雷:relations freshness 比对正文与判断快照);boards.title 仍是板名唯一权威;
3. **B1**:普通 Item 编辑(updateItem)与退役(retireItem)写门**识别桥即拒**身份 Item(明确错误信息:从板入口操作);仅隐藏 UI 不算;
4. **删板→身份退役**(HQ 随裁):deleteBoard 同事务将身份 Item 置 retired(保历史可查,⛔物理删⛔留活幽灵);⛔反向级联(退役身份不动板——B1 已挡普通退役入口,此路仅系统内部);
5. **C1**:升级迁移逐板原子回填——保留板 ID,身份 Item 新 UUID,事实只取板现有(user/title/project),铸初始 Snapshot;每板一身份唯一约束、可重跑零重复;**回填时点如实记账**(created_at=迁移时刻,⛔伪装历史);
6. **附属三裁**:①身份 Item 的 `origin_board_id`=NULL(⛔自指环;出处走 metadata 注记 board-identity);②身份 Item 可被 item_ref 编入笔记、可被投影上板(含自己的板)——读面是普通公民;③新建板(createBoard)同事务铸身份。

## 一 · 交付面

- 新迁移:boards 增 `item_id`(可空+UNIQUE)引用 items;回填迁移(C1,逐板原子,含快照);schema.sql 同步;
- `services/boards.ts`:createBoard 同事务铸身份;deleteBoard 同事务退役身份;updateBoard 零联动(A3);
- `services/items.ts`:内部受控创建入口(仅供 board 领域调用,⛔路由暴露);updateItem/retireItem 桥守卫(B1);
- DTO/validators/client:board 读面携 identity_item_id;板 Inspector/详情最小呈现(显示身份存在与描述即可,⛔新导航面——消费面归 V14);
- 对象族判据=桥/约束,⛔以 item_type/topic 文字自证身份(报告点名风险)。

## 二 · 禁区

⛔回改迁移 047 或其既有表;⛔共主键;⛔改名同步;⛔物理删身份;⛔关系/CG 的 Item FK 语义变更;⛔板视觉线转语义 Relation;⛔读侧虚拟 Item 充数;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响秒级静态门。

## 三 · 验收

- typecheck+build 两端绿;定向绿+新增:铸造/删板退役/写门拒收/回填(含重跑幂等/每板一身份/时点记账)/唯一约束用例;
- 冒烟(隔离库,⛔真库):①createBoard→身份随行+快照在;②改板名→身份正文零变、既有关系 freshness 零漂移(**阳性对照**:普通 Item 改正文 freshness 照常触发——闸没拔牙);③普通 update/retire 打身份 Item→拒收+可读错误;④deleteBoard→身份 retired、历史可查;⑤存量板回填→逐板一身份、板 ID 未变、重跑零新增;⑥身份 item_ref 编入笔记/投影上板正常;
- 证据落 `docs/audits/2026-09-11-b3-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff、迁移设计(回填账本样例)、写门守卫实现点、freshness 阳性对照证据、测试数字。冲突停线⛔自作主张。

## Result

2026-09-11 · Codex builder · **A + A3 + B1 + C1 工程交付完成，待 HQ 复核放行。** 冒烟实际时刻为 2026-09-12 UTC（Toronto 当地仍为 09-11），账本保留实际 UTC，不回填成板的历史创建时间。

### 交付清单与 diff

- `server/src/db/migrations/065_v13_board_item_identity.ts`：新增可空身份桥、唯一索引、逐板原子回填与初始 Snapshot；`schema.sql` 同步桥列。**047 零修改**，当前 SHA-256 为 `97c34981f80e3b7d982a7e8d51ffa92db26b70c9812bcd25695683198bd541c3`。
- `server/src/services/items.ts`：新增仅 Board 领域调用的 `createBoardIdentityItem`；普通 `updateItem` / `retireItem` 共用实际桥守卫；新 Item 与初始 Snapshot 使用同一个真实铸造时间。
- `server/src/services/boards.ts`：创建时同事务铸身份；删除时同事务退役身份；改名不写 Item；create/get/list/update 的 Board DTO 返回 `identity_item_id` 与 `identity_description`。
- 客户端 `boardTypes.ts`、`BoardPage.tsx`、`Boards.module.css`：既有 More 详情菜单只读展示身份存在与独立描述，标题仍读 `boards.title`，没有新增导航或描述写入口。repository 原样透传 DTO；既有 strict Board / Item validators 不开放 `item_id`、`identity_item_id` 或指定 Item ID 输入，无需放宽。
- 新增 `v13BoardIdentity.test.ts` 10 项及 `test:v13-board-identity` 命令；新增客户端 2 项交互回归。历史测试改用真实 schema 夹具，并精确区分身份 Item 与粉笔铸卡；客户端既有 Board 夹具补显式 nullable 字段。
- 完整产品／测试差异见 [implementation.diff](../../audits/2026-09-11-b3-builder/implementation.diff)，执行命令及数字见 [validation.json](../../audits/2026-09-11-b3-builder/validation.json)。未改 agent 指令、权限配置、关系／CG FK、视觉边语义或历史迁移，未 commit/push/PR/merge。未发现施工冲突；开工既存未跟踪文件保留。

### 迁移设计与回填账本

`boards.item_id TEXT REFERENCES items(id) ON DELETE NO ACTION`，由 `idx_boards_item` 的 UNIQUE 约束保证每身份最多属于一板；NULL 仍合法。禁止物理删活桥所引用的 Item，删板不会反向级联删除 Item。索引只在 065 创建：生产启动先执行 base schema，旧 boards 尚无新列，此时不能先建该索引。定向测试同时验证 fresh/pre-065 收敛与旧库启动顺序。

065 只枚举 `item_id IS NULL` 的板，逐板事务内重读 user/title/project → 新 UUID Item → 初始 Snapshot → 写桥。直接调用迁移时每板独立提交，第二板故障会保留第一板且不留半个身份；正式 migration runner 的外层事务令逐板事务成为 savepoint，并将整次升级一起提交或回滚。重跑跳过已桥接板；回填不改板 ID/title/project/viewport/created_at/updated_at，不复制既有判断历史。迁移冻结初始 TextFlow 与 hash 形状，不调用未来可能变化的服务 writer。

身份 `origin_board_id=NULL`、`origin_note_id=NULL`，板当时的 project（可空）作为 `origin_course_id` 收据；metadata 的 `board_identity` 保存板 ID、初值标题、当时 project、`minted_by` 和真实 `minted_at`。身份判定只查桥，metadata 仅作记账。新建板同形记 `minted_by=create_board`，回填记 `migration_065`。

实跑账本样例（合成旧板；完整两行见 [smoke-results.json](../../audits/2026-09-11-b3-builder/smoke-results.json) 的 `checks.backfill.ledger`）：

```json
{
  "board_id": "legacy-board-a",
  "board_created_at": "2020-02-03T04:05:06.000Z",
  "item_id": "f2e5fa49-72fc-4933-8779-ed25064d7e45",
  "identity_created_at": "2026-09-12T00:23:05.683Z",
  "snapshot_created_at": "2026-09-12T00:23:05.683Z",
  "origin_board_id": null,
  "metadata": {
    "board_identity": {
      "board_id": "legacy-board-a",
      "minted_by": "migration_065",
      "minted_at": "2026-09-12T00:23:05.683Z",
      "title_at_mint": "Historical legacy-board-a",
      "project_id_at_mint": "72000000-0000-4000-8000-000000000001"
    }
  }
}
```

两板回填后为 **2 板 / 2 身份 / 2 Snapshot**，板原字段完整保留，重跑新增 **0**。另有第二板写桥故障注入断言，验证 Item/Snapshot/桥一起回滚及续跑补缺。

### 写门与生命周期实现点

- `createBoardIdentityItem` 必须处于调用方事务内，只接 Board ID 并从真实板取事实，Item UUID 由内部生成；没有路由或指定 Item ID 参数。`createBoard` 建板后调用，内部 savepoint 包住铸身份、Snapshot 与桥。
- `assertOrdinaryItemWrite` 在 `updateItem` / `retireItem` 事务内、任何修改前查询 `boards.item_id`，命中返回 **409**：`This Item is a board identity. Please operate from the board entry.`，附 `details.code=board_identity_requires_board_entry` 与 `board_id`。类型、topic、created_by、metadata 同名的普通 Item 仍可正常编辑／退役。
- `updateBoard` 只写板表；不触碰身份正文、更新时间、快照或 Relation。`deleteBoard` 在原有删除事务内先将身份置 `retired`，保留 Item、Snapshot、Relation、soul 与被引用知识；两处故障注入证明退役失败／后续删板失败均不留半完成状态。
- 身份正常通过生产 `item_ref` 编入服务，并可挂到自己与另一块板。删原板后，其他投影与 item_ref 保留身份引用，读侧诚实呈现 retired；没有重铸、复制正文或反向删板逻辑。

### freshness 阳性对照与冒烟证据

[smoke.mjs](../../audits/2026-09-11-b3-builder/smoke.mjs) 使用两份 `:memory:` 库、真实迁移和生产服务；Board/Item 生命周期经过 localhost 随机端口上的生产 HTTP routers，共 **14 次请求**。Relation 判断／读 freshness 和 item_ref 编入通过同库生产 service 调用，未冒称浏览器旅程或这些操作的 HTTP 测试。

- 新建板：201，身份 ID 与板 ID 不同，Item GET 200，初始 Snapshot 在。
- 改板名：关系 **fresh → fresh**；身份整行与已有 Snapshots 完整相等，描述仍为 `Board: Initial board name`。
- **阳性对照**：同一条关系另一端的普通 Item 经 PUT 改正文，**fresh → to_changed**，`from_changed=false` / `to_changed=true`；判断 Snapshot ID 和旧判断正文保留，当前正文已变。freshness 门没有被关闭或旁路。
- 身份普通 update/retire 均 HTTP **409**，可读错误和原身份不变有实录；删板后身份为 **retired** 且 GET 200，快照／关系历史可查。
- 两板回填、幂等、item_ref 与自己／他板投影均通过。机器证据总计 **7/7 PASS**。

### 验证数字与边界

| 验证 | 结果 | 日志 |
|---|---|---|
| 新 B3 后端定向（含真实 pre-065 启动顺序） | 10/10，0 fail | `identity-tests.log` |
| 旧 Board 9 文件回归 | 41/41，0 fail | `legacy-board-tests.log` |
| Item／Relation 生命周期、freshness、快照回滚受影响回归 | 12/12，0 fail | `item-relation-regression.log` |
| 客户端 Boards + tray 定向 | 22 文件、180/180，0 fail（含 B3 新增 2 项） | `client-tests.log` |
| 隔离库冒烟 | 7/7，14 HTTP 请求 | `smoke-results.json` |
| 两端 typecheck + build | 全部 exit 0 | `server-typecheck.log`、`server-build.log`、`client-build.log` |
| 受影响秒级静态门 | canvas 167/167、Relation freshness、server shared runtime import、tool-face manifest/parity、docs 全绿 | 审计目录对应日志 |
| 最终差异检查 | `git diff --check` exit 0，047 无差异 | `diff-check.log` |

自动化测试合计 **243 项通过**（不重复累加组合重跑）；冒烟 7 项单列。客户端构建保留既有大 chunk 提示，服务端 manifest 生成器保留既有递归 schema 提示，均不影响退出码。按本单「受影响秒级静态门」口径收口，未执行包含安全扫描与全量运行时套件的聚合 `verify:v2-bn8-runtime`，总门与主观验收留 HQ；未做安全类测试或接触真库。CodeGraph 优先尝试后因 CLI 不可用、MCP 未提供，改用限定源码路径检索。
