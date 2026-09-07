> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.1 单 4=坐标契约侦察,只读;单 3 打印草稿因此挂起)
> **日期 (Date)**: 2026-09-07
> **性质**: 只读侦察单(⛔ 改任何产品代码)

# 13.1 · 单 4 · 坐标契约 K-0 侦察(只读)

## 〇 · 背景

单 3 停线揭示:hydration 把世界坐标盖 `page_frame_local` 章却只换算 x 不换算 y(`placementService.ts:254-267`),与真本地路径(:270-298)共用同一 `coordinate_space/frame_id` 表达,来源不可回溯(复现探针:local y=314→project 1672→hydrate 仍 1672 标 local→再 project 3030)。此缝挡住打印投影,**并威胁 13.2 迁移普查的几何判定与走查 2「格式错乱」悬案**。本单只侦察,修复方案由 HQ 冻结后另单。

## 一 · 五问(文件:行号级证据,⛔ 印象陈述)

1. **坐标读写链全图**:persist(什么坐标形态写入 `canvas_layout`/`canvas_placements`,谁写)→ hydrate(两路径逐行)→ project(:483-484 与 :496-522)→ 消费者(屏显定位/fragments 派生/035 backfill 的 boundary_role 判定/其他)——每处 x/y 各自怎么处理,列表;
2. **存量污染判定**:按数据代际(035 backfill 之前写入/之后写入;canvas 时代/page 时代)推断各代 y 语义;给出**只读判污 SQL 草案**(如:标记 local 的行中 y>所属帧高的分布)——⛔ 实跑用户库(SQL 交 HQ 留扳机日),合成库可实跑取证;
3. **是否累积漂移**:save→load→save 循环中持久化的 y 是否稳定(合成库实证:同一块两轮往返后落库值对比);
4. **两个修复候选的爆炸半径**:A=hydration 契约归一(世界→本地全轴换算;可能含存量数据修正迁移)vs B=保留原始坐标来源字段(新数据流,须覆盖重载与未保存编辑)——各列:要动的文件/函数清单、对屏显现行为的风险面、对 13.2 census 的影响、迁移工程量级;⛔ 替 HQ 选边,只摆证据;
5. **走查 2 关联性**:该缝能否解释"老笔记格式错乱疑代际差异"(停车场 B 区观察项)——给出可判定的机械检验思路。

## 二 · 报告与边界

报告文件 `docs/agent-ops/analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md`(标准状态头,五问分节,末节「修复建议对照表」)。完工本文件末尾 apply_patch 追加 `## Result`(报告路径+五问一行摘要+未做清单)。⛔ 改产品代码(合成探针走内存注入,与单 3 停线取证同法);⛔ 实跑用户库;⛔ commit;⛔ 读 .env;⛔ 打印任何 key。

## Result

2026-09-07 · Codex 侦察员 · 本只读侦察已完成；先完整读本单与单 3 两次停线。报告：[坐标契约 K-0 侦察](../analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md)。按本单要求仅追加回执，原 Status/正文不改；本结果不放行单 3、13.1 或迁移，A/B 裁定留 HQ。

1. **读写链**：已列 persist→两条 hydrate→两类 project→屏显/fragments/打印/归属/碰撞等文件:行号证据；world hydrate 仅减 x 却保 world y 标 local，API 原始来源在客户端 normalize/reconcile 链丢失。
2. **存量判定**：035 原样搬 x/y、漏迁坐标标签并删旧 layout；boundary_role 仅按 surface 填值，不读 y。报告附只读候选分布 SQL；年代/阈值不能唯一判污，真实存量数量未查。
3. **两轮落库**：真实 SQLite `:memory:` + 生产 client repository/server writer/reader，五样本各初写后两轮；普通保存 y=1672→1672→1672，但首轮 x=72→0、world→local；受控每轮再 project 才为1672→3030→4388。另实跑035三例，SQL总分母8、035痕迹3，全部断言通过、exit 0。
4. **A/B影响**：已列具体函数/文件、屏显与未保存编辑/重载风险、13.2 census影响和迁移量级；A需消费端同步，B需来源随draft/history/recovery更新，均不能凭空恢复历史来源；未替HQ选边。
5. **走查2**：原症状是提示与分隔线错位，尚未坐实为坐标病；已给坐标原点、排版覆盖、frame恢复、测高时序及多帧的机械对照方案，维持待证。

验证：探针全部内存注入，无DB文件/应用启动/真实API；从报告内代码块抽取复跑通过，窄块横不相交但world纵轴候选成立的SQL对照通过；72个显式源码引用路径/行号上界检查通过，报告空白/末尾换行检查通过。

未做：产品/常驻测试/配置修改；用户库查询、真实迁移、完整13.2 census、A/B修复、单3续作；typecheck/build、完整 `npm run verify:v2-bn8-runtime`、安全类/马拉松、浏览器打印/PDF或人工验收；依赖安装、`.env`读取、key输出、commit/push/PR/merge。仅新增报告并在本单追加Result，其他开工已有改动未动；探针PASS不替代验证门。
