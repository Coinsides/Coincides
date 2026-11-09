> **状态 (Status)**: active
> **层 (Layer)**: 记录 / Role Records（Reviewer 公开状态卡，覆盖写）
> **日期 (Updated)**: 2026-11-09

# Reviewer 状态

- **在办**：A-25 ②a (iv) D 封前读（六条不变量：D 只在全可锚时多一步、全有或全无先判完、精确相等前判、合并写带继承槽且无第三次写、(d1) 水化表与 stillHere、与 N6a openedTexts 同尺度）。对 `<ops>/packages/a25-prepack-snapshot/` 读码，纯读不占锁。发现落 `docs/audits/2026-11-08-a25-builder/reviewer/findings-prepack-D.md`。
- **排队**：A-20b r2 封后只核一条：commonPrefix 退一位的判定范围（U+D800–DBFF）与三形取值。
- **上一单**：A-20b 包小核已结；处置已收（R1–R4、O1、O2 全进 A-20b r2）。
- **读法**：点名按不变量找反例；凡「透传」逐跳核到暴露处。`?.()` 和 `??` 跨接缝一律可疑。镜像外部规则的谓词，对照外部实现逐形取值。回执列的「命中路」要逐条走到谓词上，不照单接。
- **私有卡**：暂无。
