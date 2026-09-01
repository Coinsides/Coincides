> **状态 (Status)**: done(V12 版本收官对账;push 与收官批显式候 Henry,见 §5)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: fable(清点) / henry(收官批)· **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「V12 收官双件清点令」。⛔ **不是 Henry**(收官批本身候他,§5)。
> **上游**: `plans/v12-closeout-milestones.md`(M1–M5 总图)· 各段收口件(§1 索引)

# V12 版本收官对账:12.9a → 12.10

## 1. 分段对账(收口载体索引,⛔ 只指不重写)

| 段 | 主要交付 | 收口载体(现物) |
|---|---|---|
| **12.9a** 双转写试跑 | MinerU/Docling 四卷产物、识别器 trial-2(qwen-vl 文本/视觉两档) | `analysis/2026-08-28-v12-9a-trial-2-recognizer.md` 等 trial 报告族(无独立段收口件,以报告族+段计划为载体) |
| **12.9b** 带锚碎片流 | imprint 出生证 schema(049)/永不拒收/容器 intake/文档 | b-x 单族(`2026-08-28-v12-9b-*`)+ `plans/v12-9b-segment-plan.md`(无独立段收口件) |
| **12.9c** 转写器接入与普查 | MinerU 接线(051 指纹承重/杀进程树/region 锚)· c-2 两家分歧普查 v3(canonical JSON)· c-4 词典程序表刷新 | `2026-08-29-v12-9c-c1-segment-closeout.md` · `2026-08-31-v12-9c-segment-closeout.md` |
| **12.9d** 检索地基 | 052 向量表(model_id 分区)· 110/110 嵌入 · 最小检索 API+经锚水合 ⇒ **c-3 门开** | `2026-08-31-v12-9d-segment-closeout.md` |
| **c-3**(12.9c 债,12.10 节内清偿) | 识别器转引用者:契约冻结+补遗链 · 三验闸 · 四卷实跑 21/21 过闸 · 点射消费形态申报 | `2026-08-31-v12-9c-c3-citation-mode.md`(三段回执)+ `analysis/2026-08-31-v12-9c-c3-citation-experiment.md` |
| **12.10** 打磨节 | Template Studio 降级切口(K-0+甲乙:−7,100 行码/18 表退役/TD-33 随码销)· i18n 98 处 · 走查 4a | `2026-08-31-v12-10-segment-closeout.md`(同日) |

**立法要目**:本版本期间所立工程法条(通道纪律/第七查/机械锁/判活两义/会过期的真话/补遗链等)**散布于 `docs/agent-ops/claude-log/` 各日与 `handoffs/README.md`,以彼为准,本件不重写**——收口件只对账交付,不复制法典。

## 2. 全版欠账总表(⛔ 收官不清洗,逐条带落点/触发器)

| 欠账 | 状态 | 落点/触发器 |
|---|---|---|
| TD-1 lockfile license 字段 | 未清 | 绑「统一 npm lock 工具链」专项(未立项) |
| TD-30 单元格几何寻址不可达 | 未清·已诚实拆分 | 三条触发器在案(含补丁版独立身份出口) |
| TD-34 两代 source 身份并存 | 未清(收敛债) | 触发器=旧链消费者需要碎片流能力之日 |
| TD-35 jszip 幻影依赖+脚本无门 | 未清 | 落点 b-2b 采购裁定/再碰该脚本 |
| TD-38 xlsx/csv 不产碎片 | 未清·12.9c→12.9d→12.10 三度移交 | 落点=第一个 sheet 锚生产者(表格族专段) |
| TD-40 嵌入无增量路径 | 未清(12.9d 新立;c-3 判不同路) | 触发器=第一次对新入库件发检索并期待命中 |
| deferred-tests 台账 | **20 行**存量(P0–P3 降档记录义务) | 三触发器:首次真实部署/首个外部真人用户/首个外部 Agent 接入 |
| 嵌入模型终选 | 延 V14 | 需真实检索采纳 ≥50 组标注集 |
| 识别器终选 | 工作假设 qwen-vl-max | 与嵌入终选同族,V14 |
| c-2 置信度持久层 | **不开单**(总部 2026-08-31 裁:真信号=per-citation 机械过闸结果已持久于台账,无模型置信值可存) | 触发器=第一个需读历史引用可信度的生产消费者 |
| OD 一号实验 | 已授权待执行,**与收官解耦**(总部裁) | 触发器=Henry 前置就绪(OD 锁版+telemetry.content 关);执行前总部翻牌 |
| 走查残项 #2(格式错乱) | 观察期,游离单不占号 | 观察坐实即修 |
| 走查残项 #3 / #6+10 / #1+8 | 档位差异:走查档列 12.10 暂定,M4 终表未列 | **重排候总部**(如实申报,不自裁) |
| 粒度=page 级地板 | 硬声明三处入档(d-1b/d-2/c-3 报告族) | 粒度升级永远是显式单 |
| 4a 视口居中设计选择 + 体感终验 | 已修候验 | Henry 下次走查(停车场 F 区) |
| 12.10 快照保留期届满处置 | 快照原样保留 | 候 Henry/总部裁(删/续期) |

## 3. 版本尾态基数(收官日实测)

dev 库:`imprint_fragments` **110** · `imprint_fragment_vectors/vec` **110+110**(model `dashscope:text-embedding-v4:1024`)· 迁移头 **053** · Template Studio 18 表 **0** 在 · 运行时模板 4 表在;test 线:server test:v2 **337/337** · client test:unit **291/291**(丁收官口径;丙时点 288,丁 +3);检索/引用两个生产读者共用 `getImprintFragmentsByAnchor`。

## 4. 收官基线(本件当场,全链)

`npm run verify:v2-bn8-runtime` → **exit 0**(链含:test:unit · tool-face registry/manifest/parity 三族 · server-shared-runtime-import · canvas-runtime-boundary · 四 shell 契约闸 · v2-bn11 legacy-shutdown/relation-freshness · canvas model contract smoke · client+server 双 build · canvas performance smoke · docs:check · `git diff --check` · changed-file secrets 扫描)。
另:tsc **0** · test:v2 **337/337** · check:tech-debt-table **0**。

## 5. ⚠️ push 与收官批(显式候 Henry)

- 本版本全部提交在分支 `fable/v2-bn12-exoskeleton` 本地,**⛔ 未 push**(红线);**push 由 Henry 本人执行或明批**;
- V12 收官的**版本级盖章**(含是否铸版/开 V13 闸:M5 写明 M1–M4 全绿即开闸,按 `plans/v13-foundation-rebuild-plan.md` 派工)是 Henry 保留的收官批,本件只交对账,⛔ 不代批;
- 候批期间新工作按总部指令走,收官对账以本件 §1–§4 为准,后续增量另立文件⛔不改写本件。

**V12 可自走件全部收官。对账毕,候 Henry 收官批。**
