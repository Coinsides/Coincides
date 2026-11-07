> **状态 (Status)**: frozen
> **层 (Layer)**: 研究 / Research（Tester 实测报告旧址，原地冻结）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 否

# field-tests（旧址，已搬家）

**round-01 到 round-04 原地冻结在这里，不改写、不搬动**，已有的引用都继续有效。

从 round-05 起，Tester 的整轮实测报告写在 `docs/agent-ops/records/tester/rounds/round-NN/`。搬家原因：这里是研究层，按文档宪法不算施工依据，可是这些报告一直直接喂给订单，放错了层。

- **针对某一单的复核和部署后复走**：不在这里，也不在 rounds 下面。新单写在 `docs/audits/<日期>-<单号>/tester/`，旧单在 `docs/audits/*-builder/` 里。
- **判语总表**：`docs/agent-ops/records/tester/verdicts.md`。
- 依据：`docs/agent-ops/analysis/2026-11-07-role-records-design.md` 第六节第 4 步（Henry 2026-11-07 拍板）。
