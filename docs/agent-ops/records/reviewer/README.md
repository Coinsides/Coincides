> **状态 (Status)**: active（2026-11-08 Henry 令设 Reviewer 角色）
> **层 (Layer)**: 记录 / Role Records（Reviewer）
> **日期 (Updated)**: 2026-11-08
> **权威 (Authoritative)**: 否（目录说明）

# Reviewer 的记录（records/reviewer/）

复核审查角色（Reviewer）的常设记录。执行者可能是 Claude 会话，也可能是 Codex 代理；写法对两者一样：只靠仓库文件和私有 ops 目录。

| 文件 | 回答谁的什么问题 | 谁写 | 什么时候写 | 谁读 |
|---|---|---|---|---|
| `STATUS.md` | 接班的 Reviewer：「我正核到哪？」 | Reviewer，覆盖写 | 每单开始和结束 | 接班的 Reviewer、Main_Designer |
| `findings.md` | Main_Designer、Henry：「哪单核过、确认几条、处置了没？」 | Reviewer 写行，Main_Designer 填处置列；行不删 | 每交一次发现 | Main_Designer（裁定前）、Henry |

**不放在这里的东西**：针对某一单的逐条发现放那一单的审计目录 `docs/audits/<日期>-<单号>/reviewer/findings.md`；私有的东西（本机路径、副本位置）放 `<ops>/roles/reviewer-state.md`。
