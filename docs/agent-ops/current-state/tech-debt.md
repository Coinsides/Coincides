> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(技术债登记)
> **日期 (Updated)**: 2026-08-20
> **权威 (Authoritative)**: 是(债未清则条目不删;清偿须留收据链接)

# 技术债登记

**设立理由(2026-08-20,02.1 二级复盘)**:「已申报」≠「有人会做」。复核体系里被正当申报保留的缺口,若无登记与承接,就是孤儿债。规则:每条债必须有**承接方**(工单/专项/待拍);清偿时写清偿收据并标 `已清`,不删行。

| # | 债 | 来源 | 承接 | 状态 |
|---|---|---|---|---|
| TD-1 | client lockfile 91 个新节点缺可选 `license` 字段(SBOM/license 收据退化;不影响 resolution/integrity/可复现安装) | 工单 02 Review LOW-1,02.1 申报保留 | 绑「统一 npm lock 生成工具链」专项(未立项;立项时一并清) | 未清 |
| TD-2 | `test:unit` 无常驻门触发器(parity/契约护栏没人自动跑) | 02.1 二级复盘漏合取发现 | 工单 03 交付物 D6(RED #1 转绿后接入 verify 链) | 承接中 |
| TD-3 | 5 个 check/smoke 脚本 + `docs:check` 不在任何验证门内(`check:group-gallery-shell` / `check:groups-rail-shell` / `check:single-editor-shell` / `check:source-experience` / `check:v2-bn11-legacy-shutdown` / `docs:check`) | docs-inventory 生成器机器发现(08-20);把 TD-2 的人眼盲区从 1 条扩到 6 条 | 「门接线」工单,03 收口后立(逐脚本裁快慢分层:快→verify 链,慢→并列强制门) | 未清 |
| TD-4 | `__test_probe` 生产 kind 无环境守卫,API 端到端可达 | docs-inventory 生成器机器发现;**已确认刻意**(8.11.1.2 补丁说明:仅用于测试通用派发) | 非缺陷不清;但 **MCP 工具面工单(必修①)必须把 `__` 命名空间 kind 从工具枚举里过滤**——记此处防遗忘 | 设计注记 |
