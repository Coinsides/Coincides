> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready
> **单号**: VPS-F10 · A-16 根因单(坐标契约缺行,岛库落 v1)
> **上游**: F9 回执补充节(A-16 非 A-17 下游;显示随陈旧存储 y);Main_Designer 运维取数 2026-11-01:岛库 database_meta **无 coordinate_contract 行**→readCoordinateContract 缺省返回 'v1';两夹具笔记全部块 metadata 的 flow/presentation/coordinate_space/width_mode 均为 null(见 ops 档案 evidence/a16-fixture-export.json)

# VPS-F10 · 坐标契约缺行单

## 一 · 待答与修面

1. **为何全新库没有契约行**:查 initDb/schema/迁移 056 的写入路径——新库理应落 v2(现行契约),缺行=初始化缺口;修 = 新库创建时显式写 coordinate_contract=v2(幂等,⛔动既有行);
2. **v1 缺省的合理性复核**:readCoordinateContract 无行缺省 'v1' 是为老库兼容——保留,但新库不该走到这条缺省;
3. **岛库的升级通路**:现库(fresh 数据、v1 契约)升 v2 需要什么——若 056 的 v1→v2 含坐标变换,给出对岛库的安全执行方案(升级脚本/迁移?)与验收(升级后 A-16 场景显示序=存储序);**⛔你碰岛库**,执行归我运维侧,你给方案与预演证据(本地复制形态库实测);
4. **回归面**:确认 v2 下 A-16 两夹具形状(由 Tester 复测闭环)与 v1 老库行为不破。

## 二 · 测试

新库初始化→契约=v2 断言;v1 库升级预演(本地)→升级后按序渲染断言;阳性对照(新库不写契约→用例红)。

## 三 · 纪律

照抄现役全套;⛔碰岛库与用户库(方案+预演交我);时间盒 1 段。

## 四 · 回执协议

本文件尾部 `## Result`;证据 `docs/audits/2026-11-01-vps-f10-builder/`;完工短讯。
