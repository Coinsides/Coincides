# materialPreset 服务端补遗回执

> 日期：2026-09-13；角色：Codex builder 的服务端子任务；本回执只覆盖服务端修约。

5 个文件交付，基于本轮改动前保存的原始字节机械计算 **+119 / -37**。逐文件数值与前后 SHA-256 见 [material-server-numstat.json](material-server-numstat.json)，原字节在 `material-baseline-server/server/`。未运行 git。

- `server/src/db/migrations/072_v14_skin_suite_material.ts`：新增可空 `material_preset`，仅允许四个出厂 preset ID；保留 071，已有 071 行升级后为 null，不从颜色猜谱系；重复执行无副作用。
- `server/src/validators/skin.ts`：SkinSelection 接受可选 materialPreset；普通 preset 与 materialPreset 共用四项出厂枚举，suite 身份仅允许出现在 preset。
- `server/src/validators/skinSuites.ts`：创建/完整外观更新接受可选谱系；重命名不接收材质单项修改，tokens/components 整包约束保持。
- `server/src/services/skinSuites.ts`：CRUD 持久化并 hydrate 为 materialPreset；重命名及旧客户端未带字段的更新保留已有谱系；DELETE receipt 携带套装谱系，detach 对全部既有挂点按 `skin.materialPreset ?? suite.materialPreset ?? 'default'` 写快照，完整 tokens/components 与事务回滚纪律保持。
- `server/src/__tests__/v14SkinSuites.test.ts`：9 项覆盖迁移升级、四项枚举、CRUD、所有挂点/垃圾箱/显式谱系/旧套装 detach、人面路由及事务回滚；新增 2 项并扩充原 7 项。

验证：shared 重建后 server `tsc --noEmit --pretty false` exit 0。最终 skin/palette/suite 三个文件 **22 / 22 通过**（其中 suites 9 / 9），日志见 [material-server-tests.log](material-server-tests.log)。服务端现有 suite 引用普查仅命中上述服务/迁移/测试，不存在其他直接 071 夹具需升级。

合成值纪律：受影响 suite 测试邮箱缩为 `suite@test.invalid`；移除既有 64/65 字符名生成，本轮只跑短名有效与空名拒绝，不声称重验长名边界。生产名长上限 64 保持原样。契约 UUID 沿用已有 fixture；其余新增合成值均不超过 20 字符。

服务端子任务未触及安全测试、Agent 面、九 token 词汇、统一取色器、placement、用户库、git、secrets 或权限文件。全量门与真浏览器由主 builder 合并验证。

## 全量补验：隔离环境纠正

主 runner 第一遍服务端非安全全量 56 文件 / 462 项为 446 通过、16 失败。逐条定位后，14 项新增失败来自测试环境：主 runner 将 `TEMP` 与 `COINCIDES_APP_DATA_DIR` 都设在仓库 `.tmp/` 内，而 `server/src/services/providerCredentials.ts:72` 拒绝仓库内的凭证目录。因而 PDF 两项、Embedding 两项、MaterialLibrary 十项在本来要验证的行为前被 `store_unavailable` 截断。此问题与 materialPreset 修约无关，生产实现和测试断言均未修改。

独立补验脚本 `.tmp/floatcard-material-server-supplement.mjs` 改用系统 temp 下本单新建随机目录 `C:\Users\70208\AppData\Local\Temp\coincides-mat-3uXYgn`，继续仅传系统启动环境变量、空 dotenv、短合成 JWT 与本单隔离 DB/资产目录；不读取真实凭证或既有用户目录数据。原主 runner 保持不动。完整允许清单仍为相同 56 文件，三个 HQ 安全文件继续排除，测试没有跳过或削弱。

补验 **462 项 / 460 通过 / 2 失败 / 0 skipped**，耗时 95.581 秒；上述 14 项全绿。仅剩 HQ 补遗允许申报的两处既档环境失败：`v2SourceMineruWiring.test.ts` 的 `python.exe ENOENT`，以及 `v2SourceRegionCells.test.ts` 的 MinerU Python launcher exit 101。机器回执及全部失败原文见 [material-server-supplement.json](material-server-supplement.json)，原日志见 [server-full-allowed](material-logs/coincides-mat-3uXYgn-server-full-allowed.log)。
