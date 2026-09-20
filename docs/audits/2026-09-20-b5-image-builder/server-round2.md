> **状态 (Status)**: active（builder 验证证据，非放行结论）
> **日期**: 2026-09-20
> **范围**: B5 二轮 server metadata 保存与参数校验；全量回归执行收据

# B5 二轮：服务端证据

`NoteBlock.metadata.media.edit_v1` 是唯一新增持久化键。非 null 值为 `{ crop: {x,y,w,h}|null, zoom: number|null, rotation: 0|90|180|270 }`；缺省与 null 均不物化默认编辑，不迁移存量块。crop 使用旋转后包围盒百分比，x/y ≥ 0，w/h > 0，各值 ≤ 100，x+w/y+h ≤ 100（浮点容差 1e-7）；zoom 为 null 或 1..3。显式 crop 是渲染窗口，zoom 为编辑姿态，不重复叠乘；crop=null 时 zoom 指定居中缩放，zoom=null 保持完整图像。

## 变更及边界

- `shared/types/mediaImageEdit.ts:2,12,24`：纯类型、完整参数 predicate；`shared/types/index.ts:11` 仅新增 barrel export。
- `server/src/services/mediaBlocks.ts:8,32`：局部 Zod 校验由既有 `assertMediaBlockAsset` 执行；asset ID 提取仍只读取原资产字段，未改变身份或回收计数口径。
- `server/src/__tests__/v13MediaBlocks.test.ts:98,126,323`：新增两项功能回归、扩充原有 HTTP 往返。测试保存四档旋转、参数边界、原资产行与原 blob 字节不变、无编辑默认物化、null 重置、HTTP PUT 后 GET 重开。
- 未改 schema/migration、`image_object_extensions`、Relation/Agent 写门或注册表、TextFlow schema、坐标契约、package manifest；没有依赖新增，也没有 git 写操作。原有媒体生命周期测试继续原样运行，包含其既有扩展表引用回收场景。
- 服务端只 import 共享类型；运行时局部校验沿用 noteCover 的既有模式，避免引入 shared 源码运行时路径。定向测试对共享 predicate 与服务端 schema 使用同一组功能参数断言。

## 验证

在 `server/` 执行 `node ../scripts/run-server-test-suite.mjs src/__tests__/v13MediaBlocks.test.ts`：**13 tests，13 pass，0 fail，0 skip，0 flaky retries**。最终日志：`.codex-tmp/b5-image/round2-server-media-targeted-final.log`；首次结果同为 13/13，日志 `round2-server-media-targeted.log`。

在 `server/` 执行 `npm.cmd run test:v2`，未排除测试：**exit 1**。初轮报告 **779 tests / 774 pass / 5 fail / 0 skip**。现役 runner 自动重试三个 Node IPC 反序列化文件失败，三者全部恢复：

| 现役文件 | 自动独立重试 |
|---|---|
| `v14AgentVerbTransfer.test.ts` | 50/50 PASS |
| `v2CanvasPersistenceCutover.test.ts` | 49/49 PASS |
| `v2MaterialLibrary.test.ts` | 59/59 PASS |

runner 最终报告 `recovered 3/3; result FAIL`，保留下面两项 Python 环境失败；不能将全量称为通过。原始完整日志：`.codex-tmp/b5-image/round2-server-full.log`（初轮汇总 45179 起；最终状态 58939–58940）。

1. `v2SourceMineruWiring.test.ts:60` 文件顶层直接 `execFileSync('python.exe', ...)`，当前命令环境找不到 Python：`spawnSync python.exe ENOENT`；日志 42996 起。
2. `v2SourceRegionCells.test.ts:196,203` 在测试内部覆盖解释器路径为既有 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`。MinerU 子进程 code 101，无法启动 pyvenv 所指向的 `C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe`；日志 43836 起。

只读调查未找到当前 PATH 中的 python/python3/py；uv 存在。固定 venv 的 `pyvenv.cfg` 确认上述基址；该基址目录及用户 Local Programs 目录访问被拒绝。测试内部硬编码覆盖 `COINCIDES_MINERU_PYTHON`，外部设置该变量不能替换 RegionCells 的固定解释器。没有修改 Python 配置、Source 代码或测试，也没有安装或绕过访问限制。调查记录：`.codex-tmp/b5-image/round2-python-environment.txt`。

本文件只声明服务端定向与全量执行结果；client、UI、验证门组件及最终交接由本单总回执归并。
