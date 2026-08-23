> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(技术债登记)
> **日期 (Updated)**: 2026-08-22
> **权威 (Authoritative)**: 是(债未清则条目不删;清偿须留收据链接)

# 技术债登记

**设立理由(2026-08-20,02.1 二级复盘)**:「已申报」≠「有人会做」。复核体系里被正当申报保留的缺口,若无登记与承接,就是孤儿债。规则:每条债必须有**承接方**(工单/专项/待拍);清偿时写清偿收据并标 `已清`,不删行。

| # | 债 | 来源 | 承接 | 状态 |
|---|---|---|---|---|
| TD-1 | client lockfile 91 个新节点缺可选 `license` 字段(SBOM/license 收据退化;不影响 resolution/integrity/可复现安装) | 工单 02 Review LOW-1,02.1 申报保留 | 绑「统一 npm lock 生成工具链」专项(未立项;立项时一并清) | 未清 |
| TD-2 | `test:unit` 无常驻门触发器(parity/契约护栏没人自动跑) | 02.1 二级复盘漏合取发现 | [工单 03 ## Result](../handoffs/2026-08-20-v2bn12-03-lifecycle-and-surface-authority.md#result):已接入 `verify:v2-bn8-runtime` 首段 | 已清 |
| TD-3 | 5 个 check/smoke 脚本 + `docs:check` 不在任何验证门内(`check:group-gallery-shell` / `check:groups-rail-shell` / `check:single-editor-shell` / `check:source-experience` / `check:v2-bn11-legacy-shutdown` / `docs:check`) | docs-inventory 生成器机器发现(08-20);把 TD-2 的人眼盲区从 1 条扩到 6 条 | [工单 05 ## Result](../handoffs/2026-08-20-v2bn12-05-slash-session.md#result):逐项计时均归快项并直接接入 `verify:v2-bn8-runtime`;慢项为 0,不设空门 | 已清 |
| TD-5 | **crossing 覆盖左右对称必备项**:恢复收据正控矩阵补齐 right-crossing 精确行(raw v1/v2,原 `[96,636]` 形)并确立「crossing 测左必测右」为成对规则——二级复盘发现覆盖不对称与 03 主单病因(有右无左)形状同构、方向镜像复发;按对称项补而非补一行 fixture,防换轴重演 | 工单 03.4 复核 LOW-1 + 全链 Review-2 增量 | [工单 05 ## Result](../handoffs/2026-08-20-v2bn12-05-slash-session.md#result):left/right × raw v1/v2 四行正控矩阵,右界保留 `[96,636]` 原形 | 已清 |
| TD-4 | `__test_probe` 生产 kind 无环境守卫,API 端到端可达 | docs-inventory 生成器机器发现;**已确认刻意**(8.11.1.2 补丁说明:仅用于测试通用派发) | 非缺陷不清;但 **MCP 工具面工单(必修①)必须把 `__` 命名空间 kind 从工具枚举里过滤**——记此处防遗忘 | 设计注记 |
| TD-6 | 正文(TextFlow)+annotation 双 PUT 缺少跨资源 durable 耦合,任一失败可半提交(全应用级,非 Slash 专属;客户端围栏不是解) | 工单 05.1 Review HIGH-1 + 修正单 05.2 设计裁决 | V12 必修后另立专项设计单(服务端 operation receipt / 原子端点方向);server revision / `If-Match` 条件写与 durable OCC 一并纳入该专项。05.5 只做客户端诚实 outcome / recovery / reconciliation,不充当 OCC。05.6 不申报同-note 并发再 hydration 的完整 OCC 支持;hydration epoch fence 仅作 `stale_epoch` + recovery receipt 安全网(生产当前无该触发器) | 未清 |
| TD-7 | **过渡桥:存量 canvas-only 笔记初始面选 Canvas**(`useSurfaceModeController` 初始选择按 hydration 结果一次性改选;12.1.2 引入) | 12.1 旅程 J9=0:Page 模式过滤掉全为 `canvas_world`/`crossing` 的块 ⇒ 空态;真因在初始面而非数据 | **退役触发器**:12.4 流面成为所有 Note 默认面 / Page 模式退役时**一并拆除**,不得残留 | 未清(桥) |
| TD-8 | 收据表时间戳写入无共享 helper:`applied_at` ISO 写点 15 处散在 14 个生产文件(`reverted_at` 2 处),约定靠「每列单一格式」维持而非机关保证 | 12.1.2 BLOCKED:裁定措辞「单一 helper」点名了不存在的机关 | 种子=12.2a-2 工具收据新写入路径自带 helper;存量写点随下次触及顺手归入;可选:一条只读 grep 守卫(`datetime('now')` 不得写收据表列)在复核 PASS 后接线 | 未清 |
| TD-9 | 过渡桥(TD-7)的 root 接线契约测试 mock 掉了中间承重点 `useRuntimeSurfaceStateController`(把 leaf `noteId` 改 `undefined` 仍 209/209 绿);payload 断言四个输入来源同值无法辨别来源偷换;`layerProps` 观察通道双 cast 与生产类型脱钩 | 12.1.4 复核 FAIL(方向成立)HIGH-1/MED-1/MED-2;止损线触发停 12.1 线 | 桥与现有护栏保留(X1/X2/X3 已红绿);补法见该单 Review §5(保留真实 wrapper 改 mock leaf 重依赖 / 互异哨兵 / 类型化 phase receipt);**随 TD-7 一并退役**——12.4 Page 退役时桥与此测试同拆,若 12.4 前再碰该 hook 则顺手补 | 未清(随桥) |
| TD-10 | **manifest 生成器的「单一 mapper」是约定而非机关**:`renderManifest` 的默认 initializer 与「全仓只有一份九字段 mapper」两者都未被结构锁住。复核 G3 实测——新增同签名 `copyToolFaceManifest` 并把默认值换成它,专项门 6/6 与生产 `check:tool-face-manifest` **均仍绿** | 12.2a-1b-fix2 复核 LOW-1(PASS 0B/0H/0M/1L,Fable 放行 log 08-22 #9);工单把结构 killer 明列为**可选**,故不阻塞放行 | 若要封:用 AST/源码结构契约**同时**锁默认 initializer 与单 mapper,**不得再用「生产字节自洽」当证明**(那正是 G3 绕过的东西)。承接建议:12.2a-1c 触及该文件时评估顺带;或随 12.2b `tools/list` 落地时统一做结构契约 | 未清 |
| TD-11 | **parity 专项门的嵌套 npm 开销是运营风险(候选)**:`test:tool-face-parity` 内 11 次串行嵌套 npm、每次 60s timeout;复核明写「不能承诺零 infrastructure flake」,拥塞 CI 可能超时。**本机复验稳定**(连跑三次 10/10,5450/5511/5525ms,离散度 1.4%),故接门放行 | 12.2a-1c-fix 复核「接门前置与主链状态」;Fable 记为候选(log 08-22 #11) | **触发条件**:`verify:v2-bn8-runtime` 总时长 > 60s 时再议(当前 42s)。届时可选:把 spawn 测试拆出主链只留 `check:tool-face-parity`、或改用直接 node 调用并显式注入 `npm_execpath` | 候选(未达触发线) |
