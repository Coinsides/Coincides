> **状态 (Status)**: active(13.3 段 plan;开工闸=13.2 已收官 ✅)
> **层 (Layer)**: 计划
> **日期 (Updated)**: 2026-09-08
> **权威 (Authoritative)**: 是(13.3 拆单与验收依据);设计上游=图二(`analysis/2026-09-07-board-data-model-design.md`,板/魂/钢骨相全文)
> **组织**: 两层制;单 builder 姑息模式;codex 交工作树,HQ 验实质代账

# V13.3 · 板 MVP(线索黑板)—— 段 plan

**段使命**:板成为一等实体,**板必有魂**(丙案第一次落地);笔记投影上板、自由摆放连线、双击进纸;两把标尺各回各家的实证。
**段纪律**:单内=typecheck/build+一条冒烟;段收口定向;⛔ 马拉松;⛔ 安全类测试;⛔ 动纸的行为/坐标 v2 语义/执行器;走查③=Henry。

## 单 0 · K-0 侦察(只读)

1. 图二 §一~§四 表设计对现物(迁移编号续位/既有 content_mounts 机制可复用面/PurposeFrame(044)三遗物处置的消费者清单——routes/services/validators/courseLifecyclePolicies 字面量面/client PurposeFrame 消费面);
2. 板 UI 挂点侦察:路由/页面骨架选项、home 与侧栏入口位、双击进纸的跳转缝(openAgentWithContext 同族);
3. 书记官业务面挂点:board/purpose 路由的 recordEvent 中间件包装方案候选(actor 按认证态,channel=路由名——图二 §六"路由中间件将来由中间件填"的兑现点);
4. 报告+拆单建议。

## 单 1 · 数据与服务层(server)

- 迁移(编号 K-0 复核):`boards`(soul_id NOT NULL)/`board_members`(member_kind: note|item|content_group|text_range,几何+pinned)/`board_edges`;**purposes 三遗物处置**(project_id 放宽 NULL/note_id 语义退役/is_note_default 退役——⛔ 删列,新写禁令式);
- routes/services:板 CRUD、开板立魂(新立或挂靠既有魂,created_by 按现物枚举)、成员 mount/unmount、连线;⛔ 目的树(无 parent 字段);
- **书记官业务面首秀**:board_created/mounted/unmounted/purpose_created 经路由层 recordEvent(同事务,actor=认证用户,channel=路由名;⛔ 业务码自报身份);
- 单测:表形状/魂非空约束/成员粒度/事件随动作原子。

## 单 2 · 板 UI MVP(client)

- 板页面+路由;开板流程(轻:一句人话立魂,或挂靠已有魂——排气原则,⛔ 表单仪式);
- 笔记投影上板(缩影卡,真相不搬家)、拖拽摆放/缩放/z 序、连接线、**双击进纸**;
- 板自己的视口(自由缩放——板是无限的,标尺归板;⛔ 触纸的三档);
- 冒烟:一块板摆 ≥3 篇笔记连成线索,重开不丢;板缩放不影响笔记内排版(两把标尺实证,总 plan 既定判据)。

## 单 3 · 收尾件

- 画笔工具基础档(板上自由笔迹,存 board 层⛔ 入纸);
- 板列表入口(库级:home/侧栏);
- **准备区→板 搬迁动作**(图三承诺兑现:迁移暂存的画物/摆阵一键上板);
- 冒烟:各一条。

## 段收口 · 定向核查 + ⭐ 走查③(Henry)

黑板顺不顺手;开板立魂的体感(丙案落地眼验);连线/进纸流畅度。收口后开 13.4 段 plan。

## 工单模板条款(沿用)

先读工单→停线举证不改判→Result(numstat+验证+未做)→⛔ commit(工作树交 HQ)→⛔ 读 .env→⛔ key 出境→⛔ 用户库接触。
