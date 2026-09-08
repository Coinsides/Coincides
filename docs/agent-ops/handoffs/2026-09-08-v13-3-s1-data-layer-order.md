> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.3 单 1=板/魂数据与服务层,server 大单)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(允许多轮内部推进)

# 13.3 · 单 1 · 板/魂数据与服务层(含书记官业务面首秀)

## 〇 · 上游(先读,顺序)

1. 段 plan:`plans/v13-3-board-mvp-plan.md`;
2. 单 0 报告全文(四题+§五拆单建议,本单改动面地图):`analysis/2026-09-08-v13-3-s0-recon.md`;
3. 图二(骨相法源):`analysis/2026-09-07-board-data-model-design.md`。

## 一 · 四项 HQ 冻结裁定(单 0 §5.1 四决定的回答)

**裁定甲(画物承载)**:新建**板自有画物层**(建议表名 `board_visuals`,迁移内定):board-owned,承载①画笔笔迹(新 kind freehand:points/path/style)②将来自准备区搬迁的孤儿画物(shape/image/table/connector 以板自有画物身份重新安家,几何/rotation/扩展数据全量保全;connector 裸点与样式原样保留,⛔ 强转 board_edges)。**board_members 保持纯引用**(图二四 kind,⛔ 扩枚举);本段 UI 只产 `note`/`content_group` 两种成员,`item`/`text_range` 留 CHECK 位、新写 13.4 开闸;rotation 归 visuals,members 无 rotation。

**裁定乙(旧魂承接)**:迁移退役三遗物按"新写禁令式":note_id/is_note_default 列保留,默认魂部分唯一索引 drop,project_id(course_id)语义放宽照图二;**server 旧行为两刀**——GET 读现存⛔ 隐式补建默认魂;PUT/替换名单类端点拒绝(410,错误名 `note_purpose_writer_retired`)。存量 note-default 魂原地保留(active),⛔ 本段迁移或删除;client 旧 Purpose writer UI 出口的摘除列入单 2 首块(本单 Result 申报受影响 client 消费面清单即可)。

**裁定丙(编译缓存)**:13.3 **零编译实现**——purpose_members 停写(新写禁令,表留),名单=三本自动账现算,编译视图候第一个真实消费者(13.4+)。⛔ 新旧双写过渡。

**裁定丁(事件面)**:13.3 入钢仅四 verb——`purpose_created`/`board_created`(挂靠开板也记,objects 含 soul 引用)/`mounted`/`unmounted`;板改名/viewport/几何/连线/笔迹⛔ 入钢(非落定点,单人打磨噪音);**v1 ⛔ 提供删板与改魂 UI**(删板与 purpose_amended 接线候后段,停车场记);无删板即无隐式 unmount 难题。书记官包装按单 0 §3.2 推荐方案逐条执行(认证后绑定通道/同步事务回调/channel=路由模板名/⛔ body 自报/事件失败业务同滚)。

**附**:boards 的 item 族身份=13.4 统一桥接,本段 boards 独立建表⛔ 接 item 表;`soul_id NOT NULL`+一魂至多一板(唯一索引)照图二。

## 二 · 施工范围

1. 迁移(编号开工复核,候选 057;fresh/upgrade 等价义务照 054 先例):`boards`/`board_members`/`board_edges`/`board_visuals` + purposes 三遗物处置;
2. server routes/services:板 CRUD(建/读/改名/viewport;⛔ 删)、开板立魂(新立/挂靠,核魂未占板)、成员 mount/unmount(四粒度 resolver,本段两种可产)、连线 CRUD、visuals CRUD;authMiddleware 同层挂载;
3. 书记官事务包装器+四 verb 接线;
4. purposes service/validator/旧 writer 退役(裁定乙/丙);courseLifecyclePolicies 等字面量登记面照单 0 §一 清单核销;
5. 单测:魂非空/一魂一板/成员粒度 CHECK/410 退役错误/动作与事件原子(含失败同滚)/fresh==upgrade 形状。

## 三 · 验证(段纪律)

server typecheck/build;§二.5 单测;一条冒烟:合成库全链(立魂开板→mount 两种成员→连线→visuals 写→事件四 verb 齐且原子)。

## 四 · 回执与边界

apply_patch 追加 ## Result(numstat+验证+client 受影响消费面清单+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;⛔ 用户库;⛔ client 施工(单 2 财产);不动 3001/5173。现物冲突⇒停线举证。
