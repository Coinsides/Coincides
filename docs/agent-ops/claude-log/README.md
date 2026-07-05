> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State（Claude 行动日志）
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 否（过程记录，非单一事实源；权威现状见 `../current-state/`）

# claude-log —— Claude 行动日志（Henry 的监督轨迹）

## 为什么存在

Codex 纯写代码，他的工作有**天然轨迹**：git commit、`docs/releases/**`、diff、review —— Henry 看 changelog 就能监督他。

但 **Claude 的工作（分析、审查、写规格、做决定、文档治理）大多发生在对话和零散文档编辑里，没有天然轨迹，Henry 无法监督。** 本日志补这个缺口：**Claude 每做一段实质工作，在这里留一条，让 Henry 能事后复核 Claude 的判断。**

这是「**审计者也要可被审计**」—— Claude 审 Codex，Henry 审 Claude，靠的就是这份日志。

## 与其它东西的区别

- **≠ changelog / `docs/releases/**`**：那是 Codex / 代码的轨迹。
- **≠ `../current-state/`**：那是「此刻真相」的单一事实源（Codex 的必读接口）。本日志是「Claude 做过什么」的**时间线**，非权威。
- **≠ Claude 的私有 memory**：那个在 Henry 看不到的地方；本日志在 repo 里，专给 Henry 看。

## 格式

一天一个文件：`YYYY-MM-DD.md`，**最新在最上**。每条：

```
## <序号> — <一句话标题>
- **做了什么**：…
- **产出 / 改了什么**：…（文件、决定、handoff）
- **判断点（供 Henry 复核）**：…（我行使了裁量、你可能想复查或否决的点；没有就写「无」）
```

## 规矩

- Claude 每完成一段实质工作后追加一条（此约定也写在根 `CLAUDE.md` §5）。
- 重点是**判断点**：把我自己拿主意的地方主动暴露，供你 spot-check。
- 只增不改（修正错误时注明，不抹掉原记录）。
