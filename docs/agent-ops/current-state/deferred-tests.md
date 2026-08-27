> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(降档未做测试台账)
> **日期 (Updated)**: 2026-08-24
> **权威 (Authoritative)**: 是(记录义务;补测阶段以本台账为原料整理详细测试工单)

# 未做测试台账(Deferred Tests Ledger)

**这是什么**:2026-08-24 Henry 亲拍施工期测试降档(P0 地基不动 / P1 关口用 / P2 已写保留不再扩 / P3 对抗性安全验证停做挂触发器;字据 `claude-log/2026-08-24.md` #1)。凡按降档**本来要做而没做**的测试,**谁降档谁在此记一行**。流水账,简要即可——Henry 原话:"能够基于这些要测试的内容整理出来另外一个很详细的测试工单",届时**不必全补**,按当时威胁模型取舍。

**触发器(任一发生 → 启动补测工单编制)**:①首次真实部署(数据走出测试期);②第一个 Henry 以外的真人用户;③第一个外部(非本工程编制内)Agent 接入。

## 记录格式

`日期 · 单号/位点 · 没做什么 · 本来会挡什么 · 指针` —— 一行一条,不展开。

## 台账

- 2026-08-23 · b-5-fix R2 · ownership-guard mutation(拆 `user_id` 过滤验测试会红)未由对抗方亲刀(上游过滤器掐断,裁不绕过)· 挡「跨用户守卫测试是装饰品」· TD-20(现有三源证据清单见该条)
- 2026-08-23 · 12.2b 旅程 J4/B3 · source-projection「同一执行体」强鉴别零样本未取证(非降档,环境无投影样本)· 挡「投影类资源被硬删」· journey-sheet §「未取证」段
- 2026-08-24 起 · 常设 · 新写工具不再扩安全输入矩阵(只留最小 ownership 正控一条;后续逐单在此追记具体没写的矩阵)· 挡「新面重蹈 `status[]` 型白名单旁路」· log 08-24 #1
- 2026-08-24 · 12.2c c-1 · 投影入参模糊矩阵(超长 excerpt / 非法 offsets / 畸形 unicode / ranges 数量上限)未写,只测正常路径 + 空 ranges · 挡「投影对畸形 draft 的容错」· 单 `handoffs/2026-08-24-v2bn12-2c1-selection-receipt-projection.md`
- 2026-08-24 · 12.2c c-1-fix · 切片边界模糊矩阵(负/超长 offset · UTF-16 代理对与组合字形切分 · RTL)未写 · 挡「切片对畸形或非 BMP 文本的行为」· ⚠️ **builder 已亲验并申报该风险真实存在**:`slice` 按 UTF-16 code unit 切,offsets 落在 surrogate pair 内部会切裂 emoji/grapheme ⇒ **收据里可能存下孤立代理项**;本档不处理 · 单 `...-2c1-fix-excerpt-slice.md` `## Result` §UTF-16
- 2026-08-24 · 12.2c 常设 · 上一条**会顺流到 c-2**:漂移比对式两侧同法 `slice`,切裂不致误判 `drifted`,但**孤立代理项会进入 JSON 与工具面出参** · 挡「工具面出参含非法 UTF-16 序列」· 补测时与 c-1-fix 那条**并为一题** · ⭐ **补法:在投影边界把 offsets 规整到码点边界(源头修,保两侧比对对称);⛔ 不在出参侧消毒 —— 出参消毒会让收据文本与真相层出现第二种事实**
- 2026-08-26 · 12.2c c-4 · trashed→active 往返、并发改 status、批量 range 混合 active/trashed 组合矩阵未写 · 挡「状态过渡期的解析行为」· 单 `handoffs/2026-08-26-v2bn12-2c4-resolve-status-filter.md`
- 2026-08-26 · dev quick login · token 过期行为、并发多次调用、非 fixture 邮箱的枚举面未写 · 挡「过期 token 后续鉴权退化、并发快捷登录一致性、账号存在性枚举风险」· 单 `handoffs/2026-08-26-v2bn12-dev-quick-login.md`
