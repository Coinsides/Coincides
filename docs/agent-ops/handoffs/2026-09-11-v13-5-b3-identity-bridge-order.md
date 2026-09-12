> **状态 (Status)**: ready
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
