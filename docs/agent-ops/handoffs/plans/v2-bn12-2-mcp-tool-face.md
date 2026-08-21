> **状态 (Status)**: active | **层**: Plan(版本计划,operating-workflow §1)| **版本**: V2.BN.12.2「MCP 工具面」| **作者**: Fable | **日期**: 2026-08-21
> **上游**: 设计稿 `analysis/2026-08-21-mcp-tool-face-design.md` v0.4(已拍板)· 宪章 §2/§8/§10 · 两 active 契约 · `operating-workflow.md`
> **调度**: Opus(从本 plan 拆单、启动与监视 codex、按步骤汇总;三情形升级 Fable:设计级 finding / 止损触发 / 步骤收口)

# Plan V2.BN.12.2 — MCP 工具面(末端执行器第一次实体化)

## 0. 目标与 DoD

- **目标**:把应用已有的人类操作以同一道门、同一把钥匙、附守卫与收据暴露成 MCP 工具;先定指代语汇与收据形状,工具清单最后定且可增长。
- **DoD**:①契约门全绿(verify 链含 `check:tool-face-parity`);②首发工具闭环可演示:`ping` + `resolve_selection` + 一读一写(immediate)+ 一条 `propose` + 一条 `confirm`(含不支持时降 propose);③每条 public 工具的 `human_entry` 在旅程分数里实际走过一次(机械门必要条件+旅程充分性);④收据:每次调用落 `operation_batches('mcp')`,`revert_outcome` 可观察;⑤无新状态机、无平行机关(短笺两问过)。
- **触及面申报**:碰 `shared/types`(注册表)、`scripts/`、`server/src`(新 MCP 路由模块+守卫+收据服务+noteBlockLifecycle 一处守卫)、`package.json`;**不碰** client 运行时编辑面、03/05 保护面、schema/migration、v1 线。

## 1. 步骤(每步=一组工单;状态由 Opus 回写)

| 步 | 内容 | 档位 | 工单 | 状态 |
|---|---|---|---|---|
| S1 | 注册表类型+机械门脚本(纯工装) | Spark | 12.2a-1 | ⛔ **FAIL(方向不成立)** 0B/2H/4M/0L —— **已升级 Fable,按 plan §2 不发修正单,等设计裁定**(HIGH-2 schema 权威须 Fable 拍) |
| S2 | 收据轴 `'mcp'/'proposed'` + 消费方不变式守卫 + killer | Spark | 12.2a-2(已写) | ready |
| S3 | MCP transport 骨架 + `ping` + `resolve_selection`(能力协商:无 `input_required` 宣告则 confirm→propose) | 5.6(架构面,**先短笺**) | 12.2a-3(短笺请求已写) | 短笺阶段 —— ⚠️ **被 S1 HIGH-2 阻塞**:reviewer 明言「S3 前先由 Fable 拍定唯一 schema 权威」 |
| S4 | 读面:五真相 `list_*/get_*` 由注册表派生 + 缓存头 | Spark | 待拆 | — |
| S5 | 写面:一条 immediate(内容/知识)+ Relation `propose` + 一条 `confirm`(MRTR 端到端或降级) | 5.6 | 待拆 | — |
| S6 | 候选审阅入口=**独立待处理队列**(Apply/Discard 最小列表+跳到现场;Henry 拍方案 C,页边标记点留 12.4)**与旧 `ProposalList.tsx` 退场同单** | Spark | 待拆 | — |
| S7 | 收口:旅程分数(每 public 工具走 human_entry)、生成工具清单进 `docs/generated/`、契约/current-state 同步、铸版 12.2 | Fable | — | — |

### 1.1 调度决定记录(Opus)

| 决定 | 内容 | 理由 |
|---|---|---|
| **S1 不与 S2 合批复核** | S1 单独送 5.6 复核 | ①**S2 尚未施工**（工单 ready 但无回执），合批＝S1 干等；②两步**基本独立**（S1=注册表类型+门脚本；S2=`operation_batches` 轴+server 守卫），合批既无「先验基座」之利、也无「缺陷复合」之弊，风险上是平手；③**配额有限且规则为见底即停** —— 先把已有回执的一步落袋比攒批安全；④**S1 是 Spark 实测样本，单独复核给出的测量更干净**（合批会混入不同档位的施工产物）。第 ④ 条是决定性理由。 |

> ⚠️ **一处调度侧的可见性缺口（记档）**：`codex` CLI **无非交互配额查询**（`--help` 无 status/usage/limit）。故「见底即停」我**只能靠 exec 失败反向感知，不能主动监控**。若某次 codex 启动报 usage limit，即为停机信号；在此之前我无法预警「快到了」。**Henry/Fable 的 `/status` 是目前唯一的前瞻视角。**

## 2. 规则(施工侧必读)

- Spark 口径:一单一交付物/设计在单里拍死/RED 先行当靶/修正一次一条;**仓库惯例写成显式步骤**(docs:check 过期→先 docs:index+docs:inventory 再全链;双 tsc;回执 UTF-8)。
- 复核:按步骤攒批(S1+S2 可合批复核;S3 单独;S4+S6 合批;S5 单独),增量协议。
- 止损:任一步骤修正链到第 3 轮,Opus 必须二选一落盘(宣布止损+降级预案 / 记录为何继续),升级 Fable。
- 设计级 finding(缺陷住在本轮新造机关/谓词不成立/平行机关)→ 立即升级 Fable,不发下一张修正单。

## 3. 迷你复盘(铸版时填)

- 哪里不顺:
- 哪条债:
- 下版带走:
