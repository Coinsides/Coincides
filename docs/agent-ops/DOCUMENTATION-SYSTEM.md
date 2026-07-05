> **状态 (Status)**: active
> **层 (Layer)**: 宪法 / Constitution
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Coincides 文档体系 (Documentation System)

这份文档定义 Coincides **文档本身**的组织方式、更新规则和双 Agent 协作约定。它是文档的"宪法"。任何人(Henry、Claude、Codex)在新增、修改、引用文档前,都应以本文件为准。

核心理念一句话:**文档按"生命周期 / 变化速度"分层,而不是按主题分。** 不同层有不同的权威性和不同的更新规则。我们是"边研究边开发、摸着石头过河",所以必须让"还在变的思考"和"已经定下的事实"物理隔离,否则旧思考会不断污染新决定。

---

## 一、五层结构 (The Five Layers)

| 层 | 位置 | 变化速度 | 权威? | 更新规则 |
|----|------|---------|------|---------|
| **1. 宪法 Constitution** | `PRODUCT.md`、本文件 | 极慢 | 是 | 原地慎改;改它=改方向 |
| **2. 决策 Decisions** | `docs/agent-ops/decisions/` (ADR) | 只增 | 是 | **永不改写历史决策**;推翻用新 ADR 取代 |
| **3. 现状 Current-State** | `docs/agent-ops/current-state/` | 随实现 | 是 | 反映"此刻真相";版本完成时必须同步 |
| **4. 研究 Research** | `docs/brainstorm/**` | 只增 | **否** | 时间点快照,**永不回头改**;喂给决策层 |
| **5. 规范+历史 Contract + History** | `docs/contracts/**`、`docs/releases/**` | 见下 | 部分 | 契约:稳定后才冻结;历史:只增不改 |

层与层之间的关系:**研究 → 决策 → (实现) → 现状同步**。研究层产出想法;某个想法被选中时,写一条决策(ADR)固化;实现后,现状层更新到最新真相;契约层只在某个支柱**真正稳定**后,从代码反向冻结一次快照。

---

## 二、状态头 (Status Header) —— 强制约定

**每一份"活着的"文档**(宪法 / 决策 / 现状 / live 契约)顶部必须有状态头。历史与研究层的文档不强制补,但新增时建议带上。

格式(直接复制):

```markdown
> **状态 (Status)**: draft | active | frozen | deferred | superseded | archived
> **层 (Layer)**: 宪法 | 决策 | 现状 | 研究 | 契约 | 历史
> **日期 (Updated)**: YYYY-MM-DD
> **权威 (Authoritative)**: 是 | 否
> **取代 (Supersedes)**: <文件/ADR 链接，或 —>
> **被取代 (Superseded by)**: <文件/ADR 链接，或 —>
```

状态值含义(统一枚举,INDEX 脚本以此为准):
- `draft` —— 正在形成,思路还在动,不可作为依据。
- `active` —— 当前权威,可作为依据。
- `frozen` —— 当前稳定但暂不扩写(已定型对象 / 已冻结契约常用)。
- `deferred` —— 方向存在但未到实现时机。
- `superseded` —— 被新文档取代,仅作历史留存,**不可作为依据**(看 `被取代` 链接)。
- `archived` —— 历史 / 研究 / 旧计划封存,非权威。

**规矩:看任何文档,先看状态头。`superseded` / `draft` 的内容不要信。**

---

## 三、决策层 / ADR 规矩

- 每条决策一个文件:`docs/agent-ops/decisions/ADR-XXXX-<短标题>.md`,编号递增、永不复用。
- 结构固定:背景 → 决定 → 后果 → 状态。
- **决策一旦写下,正文永不修改。** 唯一允许改动的是状态头里的 `状态` 和 `被取代` 两个字段。
- 推翻一条旧决策时:写一条**新 ADR**,在新 ADR 头部 `取代` 字段指向旧的;同时把旧 ADR 的 `状态` 改为 `superseded`、`被取代` 指向新的。双向链接,永不删除原文。
- 这样"摸石头"的痕迹被完整保留,但任何人一眼就知道哪条还活着、被谁取代。

---

## 四、目录 / INDEX 规矩

- 决策层、研究层、契约层各有一个 `INDEX.md`,作为该层入口清单。
- **INDEX 只放元信息**(标题、日期、状态、取代链接、一句话摘要),**绝不复制正文**。
- INDEX **由脚本从各文件状态头自动生成**(规格见后续 ADR / 工具任务),不手写。好处:目录永不说谎,且反向强制大家写好状态头。
- 宪法层不需要 INDEX(文件极少);现状层文件少时也不需要。

---

## 五、双 Agent 协作规矩 (Claude + Codex)

1. **单一事实源**:每个事实只有一个权威出处。研究层不许复制现状层的结论。重复 = 必然腐烂。
2. **先看状态头**:`superseded` / `draft` 的不作为依据。
3. **现状层同步进"完成的定义"**:任何 `V2.BN.x` 收尾 checklist 必须包含"同步现状层",否则不算完成。
4. **开工只读三样**:宪法 + 现状层 + 仍 `active` 的 ADR。**不准**拿 `brainstorm/` 旧研究或 `releases/` 旧 plan 当干活依据。
5. **历史就地冻结**:不回头修已完成 plan 的内部引用;搬动"活着的"文档前,先扫描有没有**仍活着的**文档引用它,只更新那几处。

---

## 六、四大支柱(当前产品骨架,供文档定位参考)

文档涉及的功能,按四大支柱定位。支柱有严格依赖顺序,后一个未到位前不动后面的:

1. **TextFlow** —— 内容真相 (content truth)。*当前:核心可用,但 Typography(字体/字号/行距等)未定,尚未冻结。*
2. **ContentGroup** —— 知识结构真相 (knowledge-structure truth)。*当前:核心实体层(ContentGroup / GroupFolder / Member / Petal / Fragment)已稳定到可支撑投影工作(8.7 成果);projection / reuse UI / Source 集成仍 deferred。*
3. **Canvas Engine** —— 空间/布局真相 (spatial/layout truth)。*当前:进行中(自研最小混合引擎,PageFrame 在做)。*
4. **Agent + Graph Database** —— *当前:未开始,前三支柱稳定前不碰。*

> 各支柱的精确实时状态以"现状层" `docs/agent-ops/current-state/` 为准。本表仅供文档定位时快速参考。

---

## 七、维护

本文件属宪法层,变更需 Henry 确认。文档体系的具体演进(新建现状层、自动 INDEX 脚本、契约层标注)通过 ADR 记录。
