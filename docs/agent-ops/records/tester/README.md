> **状态 (Status)**: active（2026-11-07 Henry 拍板后生效）
> **层 (Layer)**: 记录 / Role Records（Tester）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 否（目录说明；规矩修改稿过目后改为 active）

# Tester 的记录（records/tester/）

这里放验收角色（Tester）的常设记录。**执行者可能是 Claude 会话，也可能是 Codex 代理。** 下面的写法对两者一样：只靠仓库文件和私有 ops 目录，不靠会话间短讯。

| 文件 | 回答谁的什么问题 | 谁写 | 什么时候写 | 谁读 |
|---|---|---|---|---|
| `STATUS.md` | 接班的 Tester：「我正做到哪？」 | Tester，覆盖写 | 每轮开始和结束、每次下判语之后 | 接班的 Tester、Main_Designer |
| `verdicts.md` | Main_Designer、Henry：「哪单放行了、带什么尾巴、部署后核没核？」 | Tester，行不删，只改状态列 | 每次下判语；每次部署后核对 | Main_Designer（收割和部署前）、Henry |
| `rounds/round-NN/` | Main_Designer：「这一轮整体走下来怎么样？」 | Tester | 不针对某一单的整轮岛上实测（从 round-05 起放这里） | Main_Designer（判级、派单） |
| `METHOD.md`（2026-11-07 首版） | 接班的 Tester、builder：「这类测试怎么做、有哪些坑？」 | Tester，追加加修订，已脱敏 | 踩到新坑时 | 新会话接班时读 |

**不放在这里的东西**

- **针对某一单的复核报告**：放在那一单的审计目录。新单写在 `docs/audits/<日期>-<单号>/tester/review.md`；旧单的报告留在原地（`docs/audits/*-builder/review-tester.md`），由 `verdicts.md` 指过去。
- **私有的东西**：凭据、服务器地址、本机路径、进程号和端口、账号的数据地图、冻结副本的路径，都放在私有 ops 目录里的 Tester 私有状态卡（下文记作 `<ops>/roles/tester-state.md`）。`STATUS.md` 只写一句「见私有卡」。
- **探针和测试工具**：放在私有 ops 目录的 `tester-kit/`；作为证据入仓的，放脱敏副本。
- **第一到第四轮的旧报告**：原地冻结在 `docs/brainstorm/field-tests/round-01..04`，不搬。

**规矩**

- 判语写在报告的**最前面**：放行或阻断、附带的条件、阻断理由。
- 每次状态变化都要指向证据路径（可追溯）。
- 公开仓库：⛔ 凭据、服务器地址、本机路径、邮箱。截图里的邮箱要打码。
- 角色卡：`docs/agent-ops/roles/tester.md`。
