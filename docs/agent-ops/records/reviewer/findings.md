> **状态 (Status)**: active
> **层 (Layer)**: 记录 / Role Records（Reviewer 发现台账，行不删）
> **日期 (Updated)**: 2026-11-08

# Reviewer 发现台账

一单一行；Reviewer 写前六列，Main_Designer 填「处置」。

| 日期 | 单 | 对象（包 / 快照哈希） | 确认 | 疑似 | 未找到 | 报告 | 处置（Main_Designer） |
|---|---|---|---|---|---|---|---|
| 2026-11-08 | 编辑器组返修 r2.3（3 改动文件对裁定） | ops `editor-rework-r2.3/src/`，`src.sha256` 文件哈希 `214ea160431c…` | 3（F1 旧记录现场补角色→自动落；F2 同根会话内变体；F3 content-box 诊断不成立） | 3（F4 全局 150ms 过渡使自检读旧矩形；F5 锚在但放不下每拍回单元；F6 每拍扫编辑器） | 余项见报告 | `docs/audits/2026-11-05-a21-builder/reviewer/findings.md` | 11-08:F1/F2 ③ → r2.3b 一行修 + 两测试;F3 → builder 回执更正;F4 → Tester 速验,坐实则 `transition:none` 进 r2.3b;F5/F6 → 边栏单 L-018;附注泄漏 → A-25。订单尾部「Reviewer 首单发现的裁定」 |
| 2026-11-08 | 编辑器组返修 r2.3b（3 改动文件 diff 对 r2.3） | ops `editor-rework-r2.3b/src/`，三文件哈希与 `matrix-9-r2.3b/source-sha256-r23b.txt` 一致 | 2（G2 F2 测试只走重开路、`C:222` 无测试守；G4 新文案「会自己回去」对无角色记录不成立） | 2（G1 焦点在留住框里时落地→框连焦点一起移除、后续键落 body，旧有，候 Tester；G3 `extractUnit` 间隙留住→角色定成无→永不自动落） | 三重点（角色一次定、后台落地三入口一闸、transition 无副作用）余项见报告 | `docs/audits/2026-11-05-a21-builder/reviewer/findings.md`「r2.3b 复核」节 | 11-08:三重点落实、无新丢字,收;G1 → Tester 复现中,红则 r2.3c 一行(守卫放 placeTyped 对 !live 判、含组字回调、跳拍不翻倍);G2 → r2.3c 若开则加留住时定角色的测试,否则 A-25;G3 → ②(永不自动落=留住)记 A-25;G4 → 文案改「可能会自己回去;没回去就复制或 Discard」,随 r2.3c 或边栏单。订单尾部「Reviewer r2.3b 复核的裁定」 |
| 2026-11-08 | 编辑器组返修 r2.3c（3 改动文件 diff 对 r2.3b） | ops `editor-rework-r2.3c/src/`，三文件哈希与 `matrix-10-r2.3c/source-sha256-r23c.txt` 一致 | 2（H1 队列任务抛异常→`landingScheduled` 永真、后台落地全停；H3 G2 守卫无删行对照） | 1（H2 入队到执行间换笔记→`C:482` 对 !live 直接 return、重试链断） | 六重点（三入口进队列且在 effect 外、读→合→apply 无 await、keep 不卡、G1 盖组字、卸载/换笔记不落错笔记、G2 读码可守）余项见报告 | `docs/audits/2026-11-05-a21-builder/reviewer/findings.md`「r2.3c 复核」节 | 11-08:六重点落实、无 ③,收;H1(队列任务同步抛异常致本次挂载后台落地全停,②)→ A-25 加固 try/finally;H2(入队后换笔记重试链断,等整页重载,②,r2.3c 引入的间隙)→ A-25 走 retryTimer;H3(G2 守卫缺「删 C:241 即红」对照)→ 下次动控制器时补。订单尾部「Reviewer r2.3c 复核的裁定」 |
