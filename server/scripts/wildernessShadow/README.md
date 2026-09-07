> **状态 (Status)**: active
> **层 (Layer)**: 工具用法 / 只读分析
> **日期 (Updated)**: 2026-09-07
> **权威 (Authoritative)**: 否；施工口径以 13.2 单 3 工单为准

# V13.2 单 3 census / shadow-run

纯离线 server 脚本；产品不导入它。上游依次为图三、13.2 plan 修订一、S0 报告 §四、S4 坐标卷宗。`census.sql` 从 S0 完整 SQL 提升，增加 raw placement 身份关联，并将收编阈值改为绑定参数；旧阈值候选明确命名为 `diagnostic_only`。不修改历史报告、迁移或现役行为。

从仓库根运行合成演练（PowerShell 使用 `npm.cmd`）：

```powershell
npm.cmd --prefix server run census:v13-wilderness -- --synthetic --user s0-user --out docs/audits/2026-09-07-v13-2-s3-合成-shadow-run
npm.cmd --prefix server run typecheck:v13-wilderness
npm.cmd --prefix server run test:v13-wilderness
node server/node_modules/typescript/bin/tsc --project server/tsconfig.json --noEmit
npm.cmd --prefix server run build
```

`--out` 是仓根相对路径，必须为 `docs/audits/` 直接子级、不含扩展名的**新**文件基名；输出同名 `.json` 和 `.md`。合成文件名必须含“合成”。已有目标在打开数据源前拒绝，写出使用 `wx` 独占新建；复跑需换新基名，命令示例的日期件已存在时可加 `-rerun-1`。测试中的 CLI 冒烟采用唯一合成基名，回读断言后只删除自己刚生成的两件；交付审计件由独立 CLI 演练留存。终端只打印计数摘要，详细行身份、几何候选和核对单落文件，不包含正文或原始 source/metadata JSON。两文件不保证原子落盘，若第二件写出失败会退出非零，第一件保留供诊断；不得把单件输出当成成功冒烟。

`--synthetic` 只使用本脚本构造的内存 SQLite：空库执行原 035/039 建结构，填入合成行，序列化后重新以 `readonly: true` 打开。读路径再设 `query_only=ON`、检查 statement.readonly，并在单一读事务内生成 census。测试还比较合成库序列化摘要前后相同；没有用户库路径或默认库发现。

未来 HQ/Henry 亲跑时，CLI 支持以 `--db <显式库路径>` 替换 `--synthetic`，仍必须给 `--user` 和 `--out`；连接固定 `readonly: true, fileMustExist: true`，不初始化 schema、不运行 migrations、不读 `.env`。**本施工单从未执行这个用户库入口；真实运行留扳机日。** 没有 `--apply`、迁移、回滚或 events 写口。

判定含义：

- `shadow.rows` 对三表各行给预计去处；块 inside 原地，workspace crossing/outside 托盘，野地画物和 mount 分入对应区。page_frame 为结构行。现有 tray 保留。
- drawing object/mount 按同 note+object 的全部 placement 汇总。混合 surface、无 placement、缺对象或 inactive 均原地保全并 `reviewRequired=true`，核对单明确显示待核数。此列的“原地”表示当前不改写，不表示已经裁决完毕。
- 坐标并列计算 W=(x,y)、L=(x+Ox,y+Oy)、M=(x+Ox,y)。三者有完整证据且全部相交页的 frame/stack/矩形关系一致才 `settled`；不同结果或证据不足都是 `ambiguous`（原因分列），不选来源，不破同分。相同的跨页集合仍原样保留；空页集合表示三者一致无相交。帧结构与 tray 为 `not_applicable`。
- stored boundary 与重算几何独立。即使 inside 被重算为 crossing，也只报告，inside 路由不扩大。`adoptionThreshold` 是可复用纯函数/读取函数的诊断参数，默认 0.5；没有启用收编的开关。
- legacy 维持 S0 的 legacy-only / ambiguous / dual-any / dual-active；不计入三表迁移。S0 的全局无主 note legacy 计数保留并明确标为无法归属 scope，只输出数量。
- 守恒对每 note、每表验证原始分母、原地+收编+托盘总数、完整行身份集合、重复身份和单位对应去处；检查收编必须为 0。空 note 也给三条零数。所有 after 是 **预计 after**，不能称作迁移后实测。

合成谱：沿用 S0 全部样本（46 P / 45 O / 30 M），补零原点一致性三对照、untagged 的 local/mixed/world 三形、宽/高单轴 oversize 和多 placement 全野地 object/mount。总计 **8 notes；58 P / 56 O / 39 M；8 legacy；144 条三解释记录**。含 true-local/mixed/world、次帧、非零 frame.x/frame.y/inset.top、跨 note 同 frame ID、跨页/多 stack 同分、五档 overlap、画物全种、坏/缺/重复/旋转帧、无绑定、零宽/非数值/非有限坐标、inactive、错 note 关联、混合 surface、legacy-only/dual/坏 JSON。035 痕迹为合成标记，未重做非空库迁移或 S4 产品保存往返。

预期：三表 24 条守恒全等；placement 定案 9、歧义 33（24 解释分歧、9 证据不足）、不适用 16；legacy 歧义 5；去处待核 10 行。单测检查具体身份与候选结果，CLI 冒烟检查落盘报告和这些数量。

未触发/未覆盖：CLI 实库路径、真实用户数据、迁移前备份/真实执行/回滚/事件、坐标消费链或 UI/打印、旋转几何求交、大库性能；主观验收仍归 HQ/Henry。本单仅跑工单 §二指定的 server typecheck/build、定向单测和合成冒烟；不宣称通过完整 runtime 门。
