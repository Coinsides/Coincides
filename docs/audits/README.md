> **状态 (Status)**: active
> **层 (Layer)**: 证据 / Evidence（目录说明）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 否（证据原样保存；结论以订单单卡、判语台账为准）

# docs/audits：builder 与 Tester 的证据

这里原样保存施工和验收的原始输出与报告，**不改写**。结论不在这里，而在订单文件顶部的单卡和 `docs/agent-ops/records/tester/verdicts.md`；这里是它们指向的证据。

## 新单（2026-11-07 起）

```text
docs/audits/<日期>-<单号>/
  builder/            builder 的证据：门禁输出、全量日志、阳性对照、走查记录
    matrix-<n>/       矩阵一代一个目录；单卡「自报数字」只引用其中一代
  tester/             Tester 的证据
    review.md         复核报告，判语写在最前面
    snapshot-hashes.txt  冻结副本里每个文件的 sha256，部署前用它和提交逐个比
    island-postdeploy/   部署后在岛上复走的证据
```

**单号** = 订单文件名去掉日期和 `-order.md`，看板、判语台账、这里都用同一个。

## 旧目录（2026-11-07 之前）原地冻结

旧目录叫 `<日期>-<项>-builder/`，名字里写着 builder，里面却混放着 Tester 的报告。不搬、不改名，由判语台账指过去。分辨办法：

- **Tester 的**：`review-tester.md`、`tester/`、`tester-evidence/`、`tester-f3b/` 这类 `tester*` 子目录、`tester-*` 前缀的文件、`*snapshot-hashes*.txt`、`island-postdeploy/`、`*.rows.jsonl` 探针记录。
- **builder 的**：`gates.txt`、`positive-controls.txt`、`red-files-alone.txt`、`*-full*.txt`、`server-targeted.txt`、`walkthrough.md` / `browser-walkthrough.md`、`matrix*/`、`tools/`、`review-response-plan.md`、`patch-*`。
- **说不清的**（比如 `f3b/`、`f3-gold/`）：看订单尾部是谁的 Result 或裁定提到它。

同一单有好几代 matrix 目录的（比如 a21 的 `matrix/`、`matrix-accept/`、`matrix-final/`），以单卡或 Result 里引用的那一代为准。

## 公开仓库的规矩

- ⛔ 凭据、服务器地址、邮箱（测试用的保留域 `example.*`、`*.test`、`*.invalid` 除外）。本机路径一律写成 `<home>`、`<ops>`。
- 截图里的邮箱要打码。
- 原始日志里难免带上副本所在的本机路径。新写的 `.md` 报告里不许有本机路径；`.txt` / `.log` / `.json` 原始输出只查服务器地址和邮箱。这一条将由门禁 `check-role-records` 检查（订单 `docs/agent-ops/handoffs/2026-11-07-role-records-gates-order.md`）。
